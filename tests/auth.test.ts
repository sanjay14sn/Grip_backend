import request from 'supertest';
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { createExpressServer } from 'routing-controllers';
import { loadControllers, loadMiddlewares } from '../src/utils/loaders';
import User from '../src/models/User';
import UserAccessToken from '../src/models/UserAcesstoken';
import jwt from 'jsonwebtoken';
jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }));

// Mock DB and migrations
jest.mock('../src/utils/db', () => ({ connectDB: async () => {} }));
jest.mock('../scripts/applymigration', () => async () => {});
// Mock User model to return no user
jest.mock('../src/models/User', () => ({ findOne: jest.fn().mockResolvedValue(null) }));
// Mock UserAccessToken constructor and save
jest.mock('../src/models/UserAcesstoken', () => {
  return jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) }));
});

let app: express.Express;
beforeAll(async () => {
  const controllers = await loadControllers();
  const middlewares = await loadMiddlewares();
  app = createExpressServer({
    controllers,
    middlewares,
    defaultErrorHandler: false
  });
  app.use(cors());
  app.use(express.json());
});

describe('Auth API', () => {
  it('POST /auth/login returns 400 when user not found', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'foo@example.com', password: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 0, message: 'user not found' });
  });

  it('POST /auth/login returns 200 when user found', async () => {
    const mockUser = { _id: 'abc', email: 'foo@bar.com' };
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    // @ts-ignore cast to jest.Mock to mock return value
    (jwt.sign as jest.Mock).mockReturnValue('token123');
    // Perform request
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'foo@example.com', password: 'bar' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 1, message: 'login successful', data: 'token123' });
  });

  it('POST /auth/login returns 500 when User.findOne throws', async () => {
    (User.findOne as jest.Mock).mockRejectedValue(new Error('DB failure'));
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'foo', password: 'bar' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('status', 0);
    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  it('POST /auth/login returns 500 when saving token returns false', async () => {
    const mockUser = { _id: 'u1', email: 'e@d.com' };
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue('tok');
    // Override UserAccessToken to return save=false
    (UserAccessToken as unknown as jest.Mock).mockImplementationOnce(() => ({ save: jest.fn().mockResolvedValue(false) }));
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'foo', password: 'bar' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Ha Ocurrido un error');
  });

  it('POST /auth/login returns 500 when save throws error', async () => {
    const mockUser = { _id: 'u2', email: 'x@y.com' };
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue('tok2');
    (UserAccessToken as unknown as jest.Mock).mockImplementationOnce(() => ({ save: jest.fn().mockRejectedValue(new Error('save fail')) }));
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'foo', password: 'bar' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('status', 0);
    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /auth returns 400 when user not found', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/auth');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 0, message: 'user not found' });
  });

  it('GET /auth returns 200 when user found', async () => {
    const mockUser = { _id: 'xyz', email: 'a@b.com' };
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue('tokX');
    const res = await request(app).get('/auth');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 1, message: 'login successful', data: 'tokX' });
  });
});
