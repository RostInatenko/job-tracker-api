import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class InterviewStageDto {
  @IsNotEmpty()
  @IsString()
  stage: string;
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
