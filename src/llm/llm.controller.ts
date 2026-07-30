import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LlmService } from './llm.service';
import { AskLlmDto } from './dto/ask-llm.dto';
import { LlmDailyLimitGuard } from './llm-daily-limit.guard';

@Controller('llm')
@UseGuards(AuthGuard('jwt'), LlmDailyLimitGuard)
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('ask')
  async ask(@Body() dto: AskLlmDto): Promise<{ answer: string }> {
    const answer = await this.llmService.ask(dto.prompt);
    return { answer };
  }
}
