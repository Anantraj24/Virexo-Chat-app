import { verifyAccessToken } from '../utils/token.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import prisma from '../config/prisma.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is missing', 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw new UnauthorizedError('Access token is invalid or expired', 'TOKEN_EXPIRED');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      throw new UnauthorizedError('User session no longer exists', 'USER_NOT_FOUND');
    }

    if (user.accountStatus === 'suspended') {
      throw new ForbiddenError('Your account has been suspended', 'ACCOUNT_SUSPENDED');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorizeAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(new ForbiddenError('Access denied: Admin privileges required', 'ADMIN_REQUIRED'));
  }
}
