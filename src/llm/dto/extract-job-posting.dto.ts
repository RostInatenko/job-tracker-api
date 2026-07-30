import { IsNotEmpty, IsString } from 'class-validator';

export class ExtractJobPostingDto {
  @IsString()
  @IsNotEmpty()
  jobPosting: string;
}