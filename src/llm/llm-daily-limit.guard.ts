import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  InjectThrottlerStorage,
  ThrottlerException,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { Request } from 'express';

const LLM_DAILY_LIMIT = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LlmDailyLimitGuard implements CanActivate {
  constructor(
    @InjectThrottlerStorage() private readonly storage: ThrottlerStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = `llm-daily-${req.user!.userId}`;

    const { isBlocked } = await this.storage.increment(
      key,
      ONE_DAY_MS,
      LLM_DAILY_LIMIT,
      ONE_DAY_MS,
      'llm-daily',
    );

    if (isBlocked) {
      throw new ThrottlerException(
        'Daily AI request limit reached — try again tomorrow.',
      );
    }

    return true;
  }
}
