import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { ServerToClientEvents, ClientToServerEvents } from '@gaon-auto/types';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isConnected = false;
  private reconnectListeners: (() => void)[] = [];

  connect(accessToken: string) {
    if (this.socket && this.isConnected) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(API_BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('[Socket] Connected to realtime server. ID:', this.socket?.id);
      // Trigger reconciliation listeners on connect/reconnect
      this.reconnectListeners.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error('[Socket] Reconnect listener error:', err);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[Socket] Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  onReconnect(callback: () => void): () => void {
    this.reconnectListeners.push(callback);
    return () => {
      this.reconnectListeners = this.reconnectListeners.filter((cb) => cb !== callback);
    };
  }

  joinRide(rideId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve(false);
        return;
      }
      this.socket.emit('join:ride', { rideId }, (res) => {
        resolve(res.success);
      });
    });
  }

  leaveRide(rideId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave:ride', { rideId });
    }
  }

  sendChatMessage(rideId: string, text: string, quickReplyCode?: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve(false);
        return;
      }
      this.socket.emit('chat:send', { rideId, text, quickReplyCode }, (res) => {
        resolve(res.success);
      });
    });
  }

  updateDriverLocation(coords: { latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('driver:update_location', coords);
    }
  }
}

export const socketService = new SocketService();
