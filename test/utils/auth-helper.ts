import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

interface Credentials {
  email: string;
  password: string;
}

interface AuthResult {
  accessToken: string;
  cookies: string[];
}

export async function registerAndLogin(
  app: INestApplication<App>,
  credentials: Credentials,
): Promise<AuthResult> {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send(credentials)
    .expect(201);

  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send(credentials)
    .expect(201);

  return {
    accessToken: (res.body as { accessToken: string }).accessToken,
    cookies: res.headers['set-cookie'] as unknown as string[],
  };
}
