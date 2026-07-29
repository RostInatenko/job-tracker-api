import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';
import { cleanDatabase } from './utils/clean-db';
import { registerAndLogin } from './utils/auth-helper';

interface ApplicationResponse {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: string;
}

describe('Applications (e2e)', () => {
  let app: INestApplication<App>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const a = await registerAndLogin(app, {
      email: 'apps-a@test.com',
      password: 'password123',
    });
    const b = await registerAndLogin(app, {
      email: 'apps-b@test.com',
      password: 'password123',
    });
    tokenA = a.accessToken;
    tokenB = b.accessToken;
  });

  function authHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  const baseApplication = {
    company: 'Acme',
    role: 'Backend Dev',
    status: 'APPLIED',
    dateApplied: '2026-07-01T00:00:00.000Z',
  };

  describe('POST /applications', () => {
    it('creates an application scoped to the requesting user', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set(authHeader(tokenA))
        .send(baseApplication)
        .expect(201);

      const body = res.body as ApplicationResponse;
      expect(body.company).toBe('Acme');
      expect(body.id).toBeDefined();
    });

    it('accepts a client-supplied id and uses it as the real primary key', async () => {
      const clientId = '11111111-1111-4111-8111-111111111111';

      const res = await request(app.getHttpServer())
        .post('/applications')
        .set(authHeader(tokenA))
        .send({ ...baseApplication, id: clientId })
        .expect(201);

      const body = res.body as ApplicationResponse;
      expect(body.id).toBe(clientId);
    });

    it('normalizes a bare date instead of crashing', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set(authHeader(tokenA))
        .send({ ...baseApplication, dateApplied: '2026-07-01' })
        .expect(201);

      const body = res.body as ApplicationResponse;
      expect(body.dateApplied).toBe('2026-07-01T00:00:00.000Z');
    });

    it('rejects a genuinely unparseable date with a clean 400', async () => {
      await request(app.getHttpServer())
        .post('/applications')
        .set(authHeader(tokenA))
        .send({ ...baseApplication, dateApplied: 'not-a-date' })
        .expect(400);
    });

    it('rejects an extraneous field like userId (whitelist enforcement)', async () => {
      await request(app.getHttpServer())
        .post('/applications')
        .set(authHeader(tokenA))
        .send({ ...baseApplication, userId: 999 })
        .expect(400);
    });

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/applications')
        .send(baseApplication)
        .expect(401);
    });
  });

  describe('GET /applications', () => {
    beforeEach(async () => {
      const apps = [
        {
          ...baseApplication,
          company: 'Acme',
          status: 'APPLIED',
          dateApplied: '2026-07-01T00:00:00.000Z',
        },
        {
          ...baseApplication,
          company: 'Beta',
          status: 'INTERVIEW',
          dateApplied: '2026-07-10T00:00:00.000Z',
        },
        {
          ...baseApplication,
          company: 'Gamma',
          status: 'APPLIED',
          dateApplied: '2026-07-15T00:00:00.000Z',
        },
      ];
      for (const application of apps) {
        await request(app.getHttpServer())
          .post('/applications')
          .set(authHeader(tokenA))
          .send(application);
      }
      await request(app.getHttpServer())
        .post('/applications')
        .set(authHeader(tokenB))
        .send({ ...baseApplication, company: "UserB's Company" });
    });

    it("only returns the requesting user's applications", async () => {
      const res = await request(app.getHttpServer())
        .get('/applications')
        .set(authHeader(tokenA))
        .expect(200);

      const body = res.body as ApplicationResponse[];
      expect(body).toHaveLength(3);
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications?status=APPLIED')
        .set(authHeader(tokenA))
        .expect(200);

      const body = res.body as ApplicationResponse[];
      expect(body).toHaveLength(2);
      expect(
        body.every((application) => application.status === 'APPLIED'),
      ).toBe(true);
    });

    it('sorts by company ascending', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications?sortBy=company&sortOrder=asc')
        .set(authHeader(tokenA))
        .expect(200);

      const body = res.body as ApplicationResponse[];
      expect(body.map((application) => application.company)).toEqual([
        'Acme',
        'Beta',
        'Gamma',
      ]);
    });

    it('paginates with page and limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications?page=1&limit=2&sortBy=company&sortOrder=asc')
        .set(authHeader(tokenA))
        .expect(200);

      const body = res.body as ApplicationResponse[];
      expect(body.map((application) => application.company)).toEqual([
        'Acme',
        'Beta',
      ]);
    });
  });

  describe('ownership isolation on GET/PATCH/DELETE by id', () => {
    let applicationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set(authHeader(tokenA))
        .send(baseApplication);
      applicationId = (res.body as ApplicationResponse).id;
    });

    it('owner can GET their own application', async () => {
      await request(app.getHttpServer())
        .get(`/applications/${applicationId}`)
        .set(authHeader(tokenA))
        .expect(200);
    });

    it('a different user gets 404, not the data', async () => {
      await request(app.getHttpServer())
        .get(`/applications/${applicationId}`)
        .set(authHeader(tokenB))
        .expect(404);
    });

    it('a different user cannot PATCH it', async () => {
      await request(app.getHttpServer())
        .patch(`/applications/${applicationId}`)
        .set(authHeader(tokenB))
        .send({ company: 'Hacked' })
        .expect(404);
    });

    it('a different user cannot DELETE it, and it still exists after', async () => {
      await request(app.getHttpServer())
        .delete(`/applications/${applicationId}`)
        .set(authHeader(tokenB))
        .expect(404);

      await request(app.getHttpServer())
        .get(`/applications/${applicationId}`)
        .set(authHeader(tokenA))
        .expect(200);
    });

    it('owner can update their own application', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${applicationId}`)
        .set(authHeader(tokenA))
        .send({ status: 'OFFER' })
        .expect(200);

      const body = res.body as ApplicationResponse;
      expect(body.status).toBe('OFFER');
    });

    it('owner can delete their own application', async () => {
      await request(app.getHttpServer())
        .delete(`/applications/${applicationId}`)
        .set(authHeader(tokenA))
        .expect(204);

      await request(app.getHttpServer())
        .get(`/applications/${applicationId}`)
        .set(authHeader(tokenA))
        .expect(404);
    });
  });
});
