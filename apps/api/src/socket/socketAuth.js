import { verifyAccessToken } from '../utils/token.js';
import { User } from '../models/User.js';

export async function socketAuthMiddleware(socket, next) {
  try {
    // Extract token from handshake auth or headers
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return next(new Error('Authentication required: Token missing'));
    }

    // Verify access JWT
    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return next(new Error('Authentication failed: Invalid access token'));
    }

    // Fetch user profile
    const user = await User.findById(payload.userId);
    if (!user) {
      return next(new Error('Authentication failed: User no longer exists'));
    }

    // Attach user session to socket
    socket.userId = payload.userId;
    socket.user = user;

    next();
  } catch (err) {
    next(new Error(`Authentication failed: ${err.message}`));
  }
}
