import { ApplicationStatus } from '@prisma/client';

export interface TechStackFrequency {
  tech: string;
  count: number;
}

export interface StatusBreakdownEntry {
  status: ApplicationStatus;
  count: number;
}

export type RejectionCategory =
  | 'ghostedBeforeInterview'
  | 'rejectedBeforeInterview'
  | 'ghostedAfterInterview'
  | 'rejectedAfterInterview'
  | 'unknown';

export interface RejectionBreakdownEntry {
  category: RejectionCategory;
  count: number;
}

export interface ApplicationStatsDto {
  totalApplications: number;
  responseRate: number;
  avgDaysToFirstInterview: number | null;
  avgInterviewStageCount: number | null;
  topTechStack: TechStackFrequency[];
  statusBreakdown: StatusBreakdownEntry[];
  staleApplicationsCount: number;
  rejectionBreakdown: RejectionBreakdownEntry[];
}
