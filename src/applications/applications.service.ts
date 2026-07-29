import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { FindApplicationsQueryDto } from './dto/find-applications-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Application } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prismaService: PrismaService) {}
  create(dto: CreateApplicationDto, userId: number): Promise<Application> {
    return this.prismaService.application.create({
      data: {
        ...(dto.id ? { id: dto.id } : {}),
        company: dto.company,
        role: dto.role,
        status: dto.status,
        dateApplied: dto.dateApplied,
        notes: dto.notes ?? null,
        link: dto.link ?? null,
        userId,
      },
    });
  }

  findAll(
    userId: number,
    query: FindApplicationsQueryDto,
  ): Promise<Application[]> {
    const {
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    return this.prismaService.application.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string, userId: number): Promise<Application> {
    const application = await this.prismaService.application.findUnique({
      where: { id },
    });
    if (!application || application.userId !== userId) {
      throw new NotFoundException('Not Found');
    }
    return application;
  }

  async update(
    id: string,
    dto: UpdateApplicationDto,
    userId: number,
  ): Promise<Application> {
    await this.findOne(id, userId);
    return this.prismaService.application.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: number): Promise<void> {
    await this.findOne(id, userId);
    await this.prismaService.application.delete({ where: { id } });
  }
}
