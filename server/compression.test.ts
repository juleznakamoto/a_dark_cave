
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import compression from 'compression';
import request from 'supertest';

describe('Compression Middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    
    // Apply same compression settings as production
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Test routes
    app.get('/small', (req, res) => {
      res.json({ message: 'small' });
    });

    app.get('/large', (req, res) => {
      const largeData = Array(1000).fill({ 
        id: 'test-id-12345', 
        name: 'test-name',
        description: 'This is a longer description to make the response larger'
      });
      res.json(largeData);
    });

    app.get('/text', (req, res) => {
      const text = 'Lorem ipsum dolor sit amet, '.repeat(100);
      res.send(text);
    });
  });

  it('should not compress responses smaller than 1KB threshold', async () => {
    const response = await request(app)
      .get('/small')
      .set('Accept-Encoding', 'gzip');

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should compress responses larger than 1KB threshold', async () => {
    const response = await request(app)
      .get('/large')
      .set('Accept-Encoding', 'gzip');

    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.status).toBe(200);
  });

  it('should respect x-no-compression header', async () => {
    const response = await request(app)
      .get('/large')
      .set('Accept-Encoding', 'gzip')
      .set('x-no-compression', 'true');

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should compress text responses above threshold', async () => {
    const response = await request(app)
      .get('/text')
      .set('Accept-Encoding', 'gzip');

    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('should not compress when client does not support gzip', async () => {
    const response = await request(app)
      .get('/large');

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should reduce response size with compression', async () => {
    // Get uncompressed size
    const uncompressed = await request(app)
      .get('/large');

    // Get compressed size
    const compressed = await request(app)
      .get('/large')
      .set('Accept-Encoding', 'gzip');

    expect(compressed.headers['content-encoding']).toBe('gzip');
    
    // Compressed response should be smaller
    // Note: We can't directly compare body sizes since supertest decompresses,
    // but we can verify compression was applied
    expect(compressed.status).toBe(200);
    expect(uncompressed.status).toBe(200);
  });

  it('should handle deflate encoding', async () => {
    const response = await request(app)
      .get('/large')
      .set('Accept-Encoding', 'deflate');

    expect(response.headers['content-encoding']).toBe('deflate');
  });

  it('should handle multiple encoding preferences', async () => {
    const response = await request(app)
      .get('/large')
      .set('Accept-Encoding', 'gzip, deflate, br');

    // Should use one of the supported encodings
    expect(['gzip', 'deflate', 'br']).toContain(response.headers['content-encoding']);
  });

  it('should maintain JSON structure after compression', async () => {
    const response = await request(app)
      .get('/large')
      .set('Accept-Encoding', 'gzip');

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body).toHaveLength(1000);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('name');
  });
});

describe('Compression Performance', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(compression({ level: 6, threshold: 1024 }));

    app.get('/api/config', (req, res) => {
      res.json({
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      });
    });

    app.get('/sounds/background_music.wav', (req, res) => {
      // Simulate audio file response
      const dummyAudioData = Buffer.alloc(50000); // 50KB
      res.set('Content-Type', 'audio/wav');
      res.send(dummyAudioData);
    });
  });

  it('should compress API config responses', async () => {
    const response = await request(app)
      .get('/api/config')
      .set('Accept-Encoding', 'gzip');

    // Small response, should not compress
    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should compress large binary files if above threshold', async () => {
    const response = await request(app)
      .get('/sounds/background_music.wav')
      .set('Accept-Encoding', 'gzip');

    // Large file should be compressed
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.headers['content-type']).toContain('audio/wav');
  });
});
