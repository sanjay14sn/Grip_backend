import { ExpressMiddlewareInterface, Middleware } from 'routing-controllers';
import { Request, Response, NextFunction } from 'express';
import { RequestLog } from '../models/RequestLog';

@Middleware({ type: 'before' })
export class RequestLoggingMiddleware implements ExpressMiddlewareInterface {
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime();
    const { ip, method, originalUrl, headers, baseUrl } = req;
    const userAgent = headers['user-agent'] || 'unknown';

    // Capture response body
    let responseBody: any;
    const originalSend = res.send.bind(res);
    res.send = (body: any): Response => {
      responseBody = body;
      return originalSend(body);
    };

    res.on('finish', async () => {
      const [sec, nano] = process.hrtime(startTime);
      const responseTime = sec * 1e3 + nano / 1e6; // ms
      const statusCode = res.statusCode;
      const moduleName = baseUrl || '';
      const userId = (req as any).user?.id || (req as any).user?._id;
      try {
        await RequestLog.create({
          timestamp: new Date(),
          ipAddress: ip,
          userAgent: userAgent,
          method,
          url: originalUrl,
          moduleName,
          userId,
          statusCode,
          responseTime,
          Response: responseBody
        });
      } catch (err) {
        console.error('Failed to save request log:', err);
      }
    });
    next();
  }
}
