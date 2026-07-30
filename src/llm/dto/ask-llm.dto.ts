import { IsString, IsNotEmpty } from 'class-validator';

export class AskLlmDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
