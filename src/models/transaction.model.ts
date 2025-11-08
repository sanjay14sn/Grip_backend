import { Schema, model, Document, Types } from "mongoose";

export enum TransactionStatus {
    PENDING = "Pending",
    SUCCESS = "Success",
    FAILED = "Failure",
    CANCELLED = "Aborted",
    INVALID = "Invalid",
}

export enum Currency {
    INR = "INR",
    USD = "USD",
    SGD = "SGD",
    GBP = "GBP",
    EUR = "EUR",
}

export enum PaymentMethod {
    CCAVENUE = "ccavenue",
    CASH = "cash",
    BANK_TRANSFER = "bank_transfer",
    CREDIT_CARD = "credit_card",
    EMI = "emi",
    NET_BANKING = "net_banking",
    DEBIT_CARD = "debit_card",
    CASH_CARD = "cash_card",
    WALLET = "wallet",
    IVRS = "ivrs",
    UPI = "upi",
}

export interface ITransaction {
    meetingId: Types.ObjectId;
    memberId: Types.ObjectId;
    amount: number;
    currency: Currency;
    status: TransactionStatus;
    paymentMethod: PaymentMethod;
    transactionId?: string;
    orderId: string;
    trackingId?: string;
    bankRefNo?: string;
    failureMessage?: string;
    paymentMode?: string;
    cardName?: string;
    statusCode?: string;
    statusMessage?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export type TransactionDocument = ITransaction & Document;

const transactionSchema = new Schema<TransactionDocument>(
    {
        meetingId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
        amount: { type: Number, required: true },
        currency: {
            type: String,
            enum: Object.values(Currency),
        },
        status: {
            type: String,
            enum: Object.values(TransactionStatus),
            default: TransactionStatus.PENDING,
        },
        paymentMethod: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: true,
        },
        transactionId: { type: String },
        orderId: { type: String, required: true, unique: true },
        trackingId: { type: String },
        bankRefNo: { type: String },
        failureMessage: { type: String },
        paymentMode: { type: String },
        cardName: { type: String },
        statusCode: { type: String },
        statusMessage: { type: String },
        metadata: { type: Schema.Types.Mixed },
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                ret.id = ret._id;
                delete (ret as any)._id;
                delete (ret as any).__v;
                return ret;
            },
        },
    }
);

export const Transaction = model<TransactionDocument>(
    "Transaction",
    transactionSchema
);
