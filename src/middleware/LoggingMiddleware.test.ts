import { RequestLoggingMiddleware } from './LoggingMiddleware';
import { RequestLog } from '../models/RequestLog';
import { EventEmitter } from 'events';

jest.mock('../models/RequestLog');

describe('RequestLoggingMiddleware', () => {
  let middleware: RequestLoggingMiddleware;

  beforeEach(() => {
    (RequestLog.create as jest.Mock).mockClear();
    middleware = new RequestLoggingMiddleware();
  });

  it('calls next and logs request without errors', async () => {
    // Mock request
    const req: any = {
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/test',
      headers: { 'user-agent': 'jest-test' },
      baseUrl: '/module',
      user: { id: '123' }
    };
    // Mock response
    const res: any = new EventEmitter();
    res.statusCode = 200;
    res.on = res.addListener.bind(res);
    res.send = jest.fn((body) => { res.body = body; return res; });

    const next = jest.fn();

    // Execute middleware
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();

    // Simulate finish event
    res.emit('finish');
    // Wait for async logging
    await new Promise((r) => setImmediate(r));

    expect(RequestLog.create).toHaveBeenCalledWith(expect.objectContaining({
      ipAddress: '127.0.0.1',
      userAgent: 'jest-test',
      method: 'GET',
      url: '/test',
      moduleName: '/module',
      userId: '123',
      statusCode: 200,
      responseTime: expect.any(Number),
      Response: undefined
    }));
  });
});
