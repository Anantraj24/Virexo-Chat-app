import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';
import { generateAccessToken } from '../utils/token.js';

describe('Admin and Moderation API Integration Tests', () => {
  let adminUser, regularUser, suspendedUser, reportedUser;
  let adminToken, regularToken, suspendedToken;
  beforeAll(async () => {
  await setupTestDB();
  await cleanCollections();

    // Create users
    adminUser = await prisma.user.create({ data: {
      username: 'adminuser',
      email: 'admin@example.com',
      passwordHash: 'hashedpassword',
      role: 'admin',
    } });

    regularUser = await prisma.user.create({ data: {
      username: 'regularuser',
      email: 'user@example.com',
      passwordHash: 'hashedpassword',
      role: 'user',
    } });

    suspendedUser = await prisma.user.create({ data: {
      username: 'suspendeduser',
      email: 'suspended@example.com',
      passwordHash: 'hashedpassword',
      role: 'user',
      accountStatus: 'suspended',
    } });

    reportedUser = await prisma.user.create({ data: {
      username: 'reporteduser',
      email: 'reported@example.com',
      passwordHash: 'hashedpassword',
      role: 'user',
    } });

    adminToken = generateAccessToken(adminUser);
    regularToken = generateAccessToken(regularUser);
    suspendedToken = generateAccessToken(suspendedUser);
  });

  afterAll(async () => {
  await teardownTestDB();
});

  describe('Suspended User Restrictions', () => {
    it('should reject API requests from a suspended user', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${suspendedToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Non-Admin Denial', () => {
    it('should deny a regular user from accessing admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${regularToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    });
  });

  describe('Reporting Mechanisms', () => {
    it('should allow a regular user to report another user', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          reportedUserId: reportedUser.id.toString(),
          reason: 'harassment',
          description: 'They are being mean',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.report.reason).toBe('harassment');
    });

    it('should prevent duplicate pending reports from the same user for the same entity', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          reportedUserId: reportedUser.id.toString(),
          reason: 'spam',
          description: 'Spamming now',
        });
      
      expect(res.status).toBe(200); // 200 means idempotent success, returned existing
      expect(res.body.success).toBe(true);
      expect(res.body.data.report.reason).toBe('harassment'); // Still the first one
    });
  });

  describe('Admin Actions', () => {
    let reportId;

    it('should allow an admin to fetch users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(4);
    });

    it('should allow an admin to fetch reports', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.reports).toBeInstanceOf(Array);
      expect(res.body.data.reports.length).toBe(1);
      
      reportId = res.body.data.reports[0].id;
    });

    it('should allow an admin to suspend a user', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${reportedUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ accountStatus: 'suspended' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.user.accountStatus).toBe('suspended');
    });

    it('should not allow an admin to suspend another admin', async () => {
      // Create another admin
      const anotherAdmin = await prisma.user.create({ data: {
        username: 'adminuser2',
        email: 'admin2@example.com',
        passwordHash: 'hashedpassword',
        role: 'admin',
      } });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${anotherAdmin.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ accountStatus: 'suspended' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Cannot suspend another admin.');
    });

    it('should allow an admin to update a report status', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reports/${reportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved', moderatorNotes: 'User suspended' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.report.status).toBe('resolved');
      expect(res.body.data.report.moderatorNotes).toBe('User suspended');
    });

    it('should allow an admin to view audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.logs).toBeInstanceOf(Array);
      // At least 2 logs: suspend user and update report
      expect(res.body.data.logs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
