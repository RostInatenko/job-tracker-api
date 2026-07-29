import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApplicationStatus } from '@prisma/client';

function normalizeToIsoDateTime(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toISOString();
}

export class CreateApplicationDto {
  @IsOptional()
  @IsUUID()
  id?: string;
  @IsNotEmpty()
  @IsString()
  company: string;
  @IsNotEmpty()
  @IsString()
  role: string;
  @IsNotEmpty()
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
  @IsNotEmpty()
  @Transform(({ value }) => normalizeToIsoDateTime(value))
  @IsDateString()
  dateApplied: string;
  @IsOptional()
  @IsString()
  notes?: string;
  @IsOptional()
  @IsString()
  link?: string;
}
