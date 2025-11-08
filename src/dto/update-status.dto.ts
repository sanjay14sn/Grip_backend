import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'active', 'decline'])
  declare status: 'pending' | 'active' | 'decline';
}
export class UpdateStatusDto2 {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'approve', 'reject'])
  declare status: 'pending' | 'approve' | 'reject';
}