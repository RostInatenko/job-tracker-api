import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  Query,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AuthGuard } from '@nestjs/passport';
import { Application } from '@prisma/client';
import type { Request } from 'express';
import { FindApplicationsQueryDto } from './dto/find-applications-query.dto';
import { ApplicationStatsDto } from './dto/application-stats.dto';

@Controller('applications')
@UseGuards(AuthGuard('jwt'))
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async create(
    @Body() dto: CreateApplicationDto,
    @Req() req: Request,
  ): Promise<Application> {
    return this.applicationsService.create(dto, req.user!.userId);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: FindApplicationsQueryDto,
  ): Promise<Application[]> {
    return this.applicationsService.findAll(req.user!.userId, query);
  }

  @Get('stats')
  async stats(@Req() req: Request): Promise<ApplicationStatsDto> {
    return this.applicationsService.getStats(req.user!.userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Application> {
    return this.applicationsService.findOne(id, req.user!.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @Req() req: Request,
  ): Promise<Application> {
    return this.applicationsService.update(id, dto, req.user!.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    return this.applicationsService.remove(id, req.user!.userId);
  }
}
