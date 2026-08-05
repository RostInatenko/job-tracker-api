import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { FindApplicationsQueryDto } from './dto/find-applications-query.dto';
import {
  ApplicationStatsDto,
  RejectionBreakdownEntry,
  RejectionCategory,
  TechStackFrequency,
} from './dto/application-stats.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Application, ApplicationStatus, Prisma } from '@prisma/client';

interface StoredInterviewStage {
  stage: string;
  date: string;
  time?: string;
}

const STALE_APPLIED_DAYS = 30;
const TOP_TECH_STACK_LIMIT = 10;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function average(values: number[]): number | null {
  if (!values.length) {
    return null;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

function rankTechStackFrequency(
  techStackLists: string[][],
  limit: number,
): TechStackFrequency[] {
  const variantsByKey = new Map<string, Map<string, number>>();

  for (const techStack of techStackLists) {
    for (const rawTech of techStack) {
      const tech = rawTech.trim();
      if (!tech) {
        continue;
      }
      const key = tech.toLowerCase();
      const variants = variantsByKey.get(key) ?? new Map<string, number>();
      variants.set(tech, (variants.get(tech) ?? 0) + 1);
      variantsByKey.set(key, variants);
    }
  }

  return [...variantsByKey.values()]
    .map((variants) => {
      const count = [...variants.values()].reduce((sum, value) => sum + value, 0);
      const [displayTech] = [...variants.entries()].sort((a, b) => b[1] - a[1])[0];
      return { tech: displayTech, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function categorizeRejection(hadInterview: boolean, heardBack: boolean | null): RejectionCategory {
  if (heardBack === null) {
    return 'unknown';
  }
  if (hadInterview) {
    return heardBack ? 'rejectedAfterInterview' : 'ghostedAfterInterview';
  }
  return heardBack ? 'rejectedBeforeInterview' : 'ghostedBeforeInterview';
}

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
        techStack: dto.techStack ?? [],
        salary: dto.salary ?? null,
        interviewStages: (dto.interviewStages ?? []) as unknown as Prisma.InputJsonValue,
        workMode: dto.workMode ?? null,
        archived: dto.archived ?? false,
        heardBack: dto.heardBack ?? null,
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
      archived = false,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    return this.prismaService.application.findMany({
      where: {
        userId,
        archived,
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
    return this.prismaService.application.update({
      where: { id },
      data: {
        ...dto,
        interviewStages: dto.interviewStages as unknown as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  }

  async remove(id: string, userId: number): Promise<void> {
    await this.findOne(id, userId);
    await this.prismaService.application.delete({ where: { id } });
  }

  async getStats(userId: number): Promise<ApplicationStatsDto> {
    const applications = await this.prismaService.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const totalApplications = applications.length;
    const respondedCount = applications.filter(
      (application) => application.status !== 'APPLIED',
    ).length;
    const responseRate =
      totalApplications > 0 ? Math.round((respondedCount / totalApplications) * 100) : 0;

    const daysToFirstInterview: number[] = [];
    const interviewStageCounts: number[] = [];
    const techStackLists: string[][] = [];
    const statusCounts = new Map<ApplicationStatus, number>();
    const rejectionCounts = new Map<RejectionCategory, number>();
    let staleApplicationsCount = 0;
    const now = Date.now();

    for (const application of applications) {
      statusCounts.set(application.status, (statusCounts.get(application.status) ?? 0) + 1);
      techStackLists.push(application.techStack);

      const stages = (application.interviewStages ?? []) as unknown as StoredInterviewStage[];
      if (stages.length > 0) {
        interviewStageCounts.push(stages.length);
        const earliestStageDate = [...stages].map((stage) => stage.date).sort()[0];
        const days = Math.round(
          (new Date(earliestStageDate).getTime() - application.dateApplied.getTime()) /
            MS_PER_DAY,
        );
        if (days >= 0) {
          daysToFirstInterview.push(days);
        }
      }

      if (application.status === 'APPLIED') {
        const daysSinceApplied = Math.floor(
          (now - application.dateApplied.getTime()) / MS_PER_DAY,
        );
        if (daysSinceApplied >= STALE_APPLIED_DAYS) {
          staleApplicationsCount++;
        }
      }

      if (application.status === 'REJECTED') {
        const category = categorizeRejection(stages.length > 0, application.heardBack);
        rejectionCounts.set(category, (rejectionCounts.get(category) ?? 0) + 1);
      }
    }

    const topTechStack = rankTechStackFrequency(techStackLists, TOP_TECH_STACK_LIMIT);

    const statusBreakdown = (
      ['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'] as ApplicationStatus[]
    ).map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    }));

    const rejectionBreakdown: RejectionBreakdownEntry[] = (
      [
        'ghostedBeforeInterview',
        'rejectedBeforeInterview',
        'ghostedAfterInterview',
        'rejectedAfterInterview',
        'unknown',
      ] as RejectionCategory[]
    ).map((category) => ({
      category,
      count: rejectionCounts.get(category) ?? 0,
    }));

    return {
      totalApplications,
      responseRate,
      avgDaysToFirstInterview: average(daysToFirstInterview),
      avgInterviewStageCount: average(interviewStageCounts),
      topTechStack,
      statusBreakdown,
      staleApplicationsCount,
      rejectionBreakdown,
    };
  }
}
