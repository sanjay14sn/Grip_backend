import {
    JsonController,
    Post,
    Get,
    Param,
    Body,
    Res,
    Req,
    UseBefore,
    QueryParams,
    BadRequestError,
    InternalServerError,
} from 'routing-controllers';
import { Response } from 'express';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';
import { Transaction, TransactionStatus } from '../../models/transaction.model';
import { CreateTransactionDto, CCAvenueResponseDto } from '../../dto/create-transaction.dto';
import crypto from 'crypto';
import { Member } from '../../models/member.model';
import Payment from '../../models/payment.model';

@JsonController('/api/mobile/transactions')
export default class TransactionController {
    private generateOrderId(prefix: string = 'GRIP'): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `${prefix}_${timestamp}_${random}`;
    }

    private encrypt(plainText: string, workingKey: string): string {
        var m = crypto.createHash('md5');
        m.update(workingKey);
        var key = m.digest();
        var iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
        var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        var encoded = cipher.update(plainText, 'utf8', 'hex');
        encoded += cipher.final('hex');
        return encoded;
    };

    private decrypt(encText: string, workingKey: string) {
        var m = crypto.createHash('md5');
        m.update(workingKey)
        var key = m.digest();
        var iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
        var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        var decoded = decipher.update(encText, 'hex', 'utf8');
        decoded += decipher.final('utf8');
        return decoded;
    };

    private async getMemberDetails(memberId: string) {
        const member = await Member.findById(memberId)
            .select('personalDetails.firstName personalDetails.lastName contactDetails.email contactDetails.mobileNumber')
            .lean();

        if (!member) {
            throw new BadRequestError('Member not found');
        }

        return {
            name: `${member.personalDetails?.firstName || ''} ${member.personalDetails?.lastName || ''}`.trim(),
            email: member.contactDetails?.email || '',
            phone: member.contactDetails?.mobileNumber || ''
        };
    }

    @Post('/initiate')
    @UseBefore(AuthMiddleware)
    async initiatePayment(
        @Body() createTransactionDto: CreateTransactionDto,
        @Req() req: any,
        @Res() res: Response
    ) {
        try {
            // 1. Validate payment
            const payment = await Payment.findOne({
                _id: createTransactionDto.meetingId,
                isDelete: 0,
                isActive: 1,
            });

            if (!payment) {
                throw new BadRequestError('Payment not found or inactive');
            }

            // 2. Get member details for billing
            const member = await this.getMemberDetails(req.user.id);

            // 3. Generate a single orderId
            const orderId = this.generateOrderId();

            // 4. Create and save the transaction
            const transaction = new Transaction({
                orderId,
                meetingId: createTransactionDto.meetingId,
                memberId: req.user.id,
                amount: createTransactionDto.amount,
                currency: createTransactionDto.currency || 'INR',
                paymentMethod: createTransactionDto.paymentMethod,
                status: TransactionStatus.PENDING,
                metadata: createTransactionDto.metadata,
            });

            await transaction.save();

            // 5. Prepare merchant config and redirect URLs
            const workingKey = process.env.CCAVENUE_WORKING_KEY || '';
            const merchantId = process.env.CCAVENUE_MERCHANT_ID || '';
            const accessCode = process.env.CCAVENUE_ACCESS_CODE || '';
            const redirectUrl = `${process.env.CCAVENUE_WEBSITE_URL}/api/transactions/callback`;
            const cancelUrl = `${process.env.CCAVENUE_WEBSITE_URL}/payment/cancel`;

            // 6. Build merchantData string with consistent orderId
            const merchantData = {
                merchant_id: merchantId,
                order_id: orderId,
                currency: transaction.currency,
                amount: transaction.amount.toFixed(2).toString(),
                redirect_url: redirectUrl,
                cancel_url: cancelUrl,
                language: 'EN',
                billing_name: member.name,
                billing_tel: member.phone,
                billing_email: member.email,
                merchant_param1: orderId,
                merchant_param2: req.user.id,
                merchant_param3: createTransactionDto.meetingId,
            };

            const merchantDataStr = Object.entries(merchantData)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');
            // console.log("Merchant Data:", merchantDataStr);
            // 7. Encrypt using hashed 32-byte key
            const encryptedData = this.encrypt(merchantDataStr, workingKey);
            // console.log("Working Key:", workingKey);
            // console.log("Plain Merchant Data:", merchantDataStr);
            // console.log("Encrypted Data Length:", encryptedData.length);
            // 8. Respond with payment redirect form data
            return res.status(200).json({
                success: true,
                data: {
                    merchantId,
                    accessCode,
                    encryptedData,
                    orderId: transaction._id,
                    redirectUrl,
                    cancelUrl,
                },
            });
        } catch (error: unknown) {
            console.error('Payment initiation error:', error);
            throw new InternalServerError(error instanceof Error ? error.message : 'Failed to initiate payment');
        }
    }


    @Post('/callback')
    async paymentCallback(
        @Body() ccAvenueResponse: CCAvenueResponseDto,
        @Res() res: Response
    ) {
        try {
            // Find the transaction using merchant_param1 (transactionId)
            const transaction = await Transaction.findById(ccAvenueResponse.merchant_param1);

            if (!transaction) {
                console.error('Transaction not found for ID:', ccAvenueResponse.merchant_param1);
                return res.redirect(`${process.env.CCAVENUE_WEBSITE_URL}/payment/error?reason=transaction_not_found`);
            }

            // Update transaction status based on CCAvenue response
            const isSuccess = ccAvenueResponse.order_status === 'Success';
            transaction.status = isSuccess ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;
            transaction.transactionId = ccAvenueResponse.tracking_id;
            transaction.bankRefNo = ccAvenueResponse.bank_ref_no;
            transaction.failureMessage = ccAvenueResponse.failure_message;
            transaction.paymentMode = ccAvenueResponse.payment_mode;
            transaction.cardName = ccAvenueResponse.card_name;
            transaction.statusCode = ccAvenueResponse.status_code;
            transaction.statusMessage = ccAvenueResponse.status_message;

            await transaction.save();

            // Redirect to success/failure page
            const redirectUrl = isSuccess
                ? `${process.env.CCAVENUE_WEBSITE_URL}/payment/success?transactionId=${transaction._id}`
                : `${process.env.CCAVENUE_WEBSITE_URL}/payment/failed?transactionId=${transaction._id}`;

            return res.redirect(redirectUrl);
        } catch (error) {
            console.error('Payment callback error:', error);
            return res.redirect(`${process.env.CCAVENUE_WEBSITE_URL}/payment/error?reason=server_error`);
        }
    }

    @Get('/:id')
    @UseBefore(AuthMiddleware)
    async getTransaction(
        @Param('id') transactionId: string,
        @Req() req: any,
        @Res() res: Response
    ) {
        try {
            const transaction = await Transaction.findOne({
                _id: transactionId,
                memberId: req.user.id,
            })
                .populate('paymentId', 'topic amount purpose date')
                .lean();

            if (!transaction) {
                throw new BadRequestError('Transaction not found');
            }

            return {
                success: true,
                data: transaction,
            };
        } catch (error) {
            console.error('Get transaction error:', error);
            throw new InternalServerError('Failed to get transaction details');
        }
    }

    @Get('/')
    @UseBefore(AuthMiddleware)
    async getTransactionHistory(
        @Req() req: any,
        @QueryParams() query: {
            page?: number;
            limit?: number;
            status?: TransactionStatus;
            paymentId?: string;
        },
        @Res() res: Response
    ) {
        try {
            const page = query.page || 1;
            const limit = query.limit || 100;
            const skip = (page - 1) * limit;

            const filter: any = { memberId: req.user.id };

            if (query.status) {
                filter.status = query.status;
            }

            if (query.paymentId) {
                filter.paymentId = query.paymentId;
            }

            const [transactions, total] = await Promise.all([
                Transaction.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('paymentId', 'topic amount purpose date')
                    .lean(),
                Transaction.countDocuments(filter),
            ]);

            return {
                success: true,
                data: transactions,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            console.error('Get transaction history error:', error);
            throw new InternalServerError('Failed to get transaction history');
        }
    }
}
