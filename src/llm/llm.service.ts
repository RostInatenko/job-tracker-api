import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

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
}