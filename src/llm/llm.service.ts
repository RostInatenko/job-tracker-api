import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';

export interface JobPostingExtraction {
  company: string;
  role: string;
  techStack: string[];
  salary: string | null;
  link: string | null;
  workMode: 'OFFICE' | 'HYBRID' | 'REMOTE' | null;
}

@Injectable()
export class LlmService {
  private readonly client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  async ask(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    return response.text ?? '';
  }

  async extractJobPosting(jobPosting: string): Promise<JobPostingExtraction> {
    const response = await this.client.models.generateContent({
      model: 'gemini-flash-latest',
      contents:
        'Extract structured fields from this job posting. ' +
        'For workMode, infer OFFICE, HYBRID, or REMOTE from wording like "on-site", "hybrid", "remote", or "work from home"; use null if it is not mentioned. ' +
        `For link, use the original job posting URL if one appears in the text, otherwise null.\n\n${jobPosting}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING },
            role: { type: Type.STRING },
            techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
            salary: { type: Type.STRING, nullable: true },
            link: { type: Type.STRING, nullable: true },
            workMode: {
              type: Type.STRING,
              enum: ['OFFICE', 'HYBRID', 'REMOTE'],
              nullable: true,
            },
          },
          required: ['company', 'role', 'techStack'],
        },
      },
    });

    return JSON.parse(response.text ?? '{}') as JobPostingExtraction;
  }
}
