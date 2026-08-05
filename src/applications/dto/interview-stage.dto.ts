import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class InterviewStageDto {
  @IsNotEmpty()
  @IsString()
  stage: string;
  @IsNotEmpty()
  @IsDateString()
  date: string;
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be in HH:mm format' })
  time?: string;
}
