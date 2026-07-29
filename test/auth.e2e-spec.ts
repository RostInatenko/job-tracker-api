import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import { cleanDatabase } from './utils/clean-db';

interface UserResponse {
  id: number;
  email: string;
  password?: string;
}

interface LoginResponse {
  accessToken: string;
}

interface ErrorResponse {
  message: string;
}

interface MeResponse {
  userId: number;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const credentials = { email: 'e2e-auth@test.com', password: 'password123' };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /auth/register', () => {
    it('registers a new user and never returns the password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      const body = res.body as UserResponse;
      expect(body.email).toBe(credentials.email);
      expect(body.password).toBeUndefined();
    });

    it('rejects a duplicate email with a clean 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(409);
    });

    it('rejects a password under 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@test.com', password: 'short' })
        .expect(400);
    });

    it('rejects an invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials);
    });

    it('logs in with correct credentials and sets an httpOnly refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(201);

      const body = res.body as LoginResponse;
      expect(body.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((cookie) =>
        cookie.startsWith('refreshToken='),
      );
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('rejects a wrong password with a generic message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...credentials, password: 'wrongpassword' })
        .expect(401);

      const body = res.body as ErrorResponse;
      expect(body.message).toBe('Invalid credentials');
    });

    it('rejects a nonexistent email with the SAME generic message (anti-enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
        .expect(401);

      const body = res.body as ErrorResponse;
      expect(body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues a new access token given a valid refresh cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials);
      const cookies = loginRes.headers['set-cookie'] as unknown as string[];

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(201);

      const body = res.body as LoginResponse;
      expect(body.accessToken).toBeDefined();
    });

    it('rejects a missing refresh cookie', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('rejects a tampered refresh cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=not-a-real-token'])
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the userId for a valid access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials);
      const { accessToken } = loginRes.body as LoginResponse;

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as MeResponse;
      expect(body.userId).toBeDefined();
    });

    it('rejects a missing token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('rejects an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });
});
