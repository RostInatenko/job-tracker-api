import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApplicationStatus, WorkMode } from '@prisma/client';
import { InterviewStageDto } from './interview-stage.dto';

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
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];
  @IsOptional()
  @IsString()
  salary?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewStageDto)
  interviewStages?: InterviewStageDto[];
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
  @IsOptional()
  @IsBoolean()
  heardBack?: boolean;
}
