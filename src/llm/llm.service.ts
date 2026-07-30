import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';

export interface JobPostingExtraction {
  company: string;
  role: string;
  techStack: string[];
  salary: string | null;
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
      contents: `Extract structured fields from this job posting:\n\n${jobPosting}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING },
            role: { type: Type.STRING },
            techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
            salary: { type: Type.STRING, nullable: true },
          },
          required: ['company', 'role', 'techStack'],
        },
      },
    });

    return JSON.parse(response.text ?? '{}') as JobPostingExtraction;
  }
}
