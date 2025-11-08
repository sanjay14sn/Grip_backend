// authMiddleware.ts
import { ExpressMiddlewareInterface, Middleware, HttpError } from 'routing-controllers';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Middleware to authenticate incoming requests
 */
@Middleware({ type: 'before' })
export class AuthMiddleware implements ExpressMiddlewareInterface {
  /**
   * Use the middleware
   * @param req Express request object
   * @param res Express response object
   * @param next Express next function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authorization header missing or malformed');
    }
    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new HttpError(500, 'JWT_SECRET not set in environment');
      }
      // console.log(token);
      // console.log(secret);
      const payload = jwt.verify(token, secret) as any;
      // console.log(payload);
      // Attach the user payload to request
      (req as any).user = payload;
      next();
    } catch (err: any) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new HttpError(401, 'Token has expired');
      }
      throw new HttpError(401, 'Invalid token');
    }
  }
}
