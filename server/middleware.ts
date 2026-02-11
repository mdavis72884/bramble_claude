import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from './auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export function requireTenantAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role === 'BRAMBLE_OPERATOR') {
    return next();
  }

  const tenantId = req.params.tenantId || req.body.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  if (req.user.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Access denied to this tenant' });
  }

  next();
}

export function auditLogger(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json.bind(res);
    
    res.json = function (body: any) {
      if (res.statusCode < 400 && req.user) {
        prisma.auditLog.create({
          data: {
            tenantId: req.user.tenantId,
            userId: req.user.userId,
            action,
            details: `${req.method} ${req.path}`,
            metadata: {
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              body: req.body,
            },
          },
        }).catch(err => console.error('Audit log error:', err));
      }
      
      return originalSend(body);
    };
    
    next();
  };
}
