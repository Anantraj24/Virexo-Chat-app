import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketClientManager {
  constructor() {
    this.socket = null;
  }

  connect() {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketClientManager = new SocketClientManager();
