const request = require('supertest');
const { app, server } = require('../src/index');

// Mock PG Client
jest.mock('pg', () => {
    const mClient = {
        connect: jest.fn().mockResolvedValue(),
        query: jest.fn().mockResolvedValue({ rows: [] }),
        end: jest.fn().mockResolvedValue(),
    };
    return { Client: jest.fn(() => mClient) };
});

describe('App Endpoints', () => {
    afterAll(async () => {
        server.close();
    });

    it('GET /healthz should return 200', async () => {
        const res = await request(app).get('/healthz');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe('ok');
    });

    it('GET /metrics should return metrics', async () => {
        const res = await request(app).get('/metrics');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('http_requests_total');
    });
});
