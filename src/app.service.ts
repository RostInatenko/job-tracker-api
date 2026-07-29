import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<{ status: string }> {
    await this.prismaService.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
