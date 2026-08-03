export const APP_NAME = 'Virexo';
export const APP_VERSION = '1.0.0';

export const API_ROUTES = {
  HEALTH: '/health',
  AUTH: '/api/v1/auth',
  USERS: '/api/v1/users',
  CONVERSATIONS: '/api/v1/conversations',
  MESSAGES: '/api/v1/messages',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const SOCKET_EVENTS = {
  CONNECT: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  JOIN_CONVERSATION: 'conversation:join',
  LEAVE_CONVERSATION: 'conversation:leave',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_INDICATOR: 'typing:indicator',
  USER_PRESENCE: 'presence:status',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELETED: 'message:deleted',
};

export const createApiResponse = (success, data = null, error = null) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
});
