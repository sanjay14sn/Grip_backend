import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../models/transaction.model';

export class CreateTransactionDto {
  @IsMongoId()
  meetingId!: string;

  @IsNumber()
  amount!: number;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CCAvenueResponseDto {
  @IsString()
  order_id!: string;

  @IsString()
  tracking_id!: string;

  @IsString()
  bank_ref_no!: string;

  @IsString()
  order_status!: string;

  @IsString()
  @IsOptional()
  failure_message?: string;

  @IsString()
  payment_mode!: string;

  @IsString()
  @IsOptional()
  card_name?: string;

  @IsString()
  status_code!: string;

  @IsString()
  status_message!: string;

  @IsString()
  currency!: string;

  @IsNumber()
  amount!: number;

  // Required by CCAvenue but not stored in our system
  @IsString()
  billing_name!: string;

  @IsString()
  billing_tel!: string;

  @IsString()
  billing_email!: string;

  // Merchant parameters for tracking
  @IsString()
  merchant_param1!: string; // transactionId

  @IsString()
  merchant_param2!: string; // memberId

  @IsString()
  @IsOptional()
  merchant_param3?: string;

  @IsString()
  @IsOptional()
  merchant_param4?: string;

  @IsString()
  @IsOptional()
  merchant_param5?: string;
}
