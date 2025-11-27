
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { processReferral } from './referral';

describe('Referral API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.post('/api/referral/process', async (req, res) => {
      try {
        const { newUserId, referralCode } = req.body || {};
        
        if (!newUserId || !referralCode) {
          return res.status(400).json({ 
            error: 'Missing required parameters',
            received: { newUserId: !!newUserId, referralCode: !!referralCode }
          });
        }
        
        const result = await processReferral(newUserId, referralCode);
        
        res.setHeader('Content-Type', 'application/json');
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  it('should return 400 when missing parameters', async () => {
    const response = await request(app)
      .post('/api/referral/process')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required parameters');
  });

  it('should return 400 when missing newUserId', async () => {
    const response = await request(app)
      .post('/api/referral/process')
      .send({ referralCode: 'test-code' });

    expect(response.status).toBe(400);
  });

  it('should return 400 when missing referralCode', async () => {
    const response = await request(app)
      .post('/api/referral/process')
      .send({ newUserId: 'test-user' });

    expect(response.status).toBe(400);
  });

  it('should return JSON content-type', async () => {
    const response = await request(app)
      .post('/api/referral/process')
      .send({ 
        newUserId: 'new-user-123',
        referralCode: 'referrer-456'
      });

    expect(response.headers['content-type']).toContain('application/json');
  });
});
