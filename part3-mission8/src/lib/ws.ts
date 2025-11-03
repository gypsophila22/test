import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { parseUserIdFromToken } from './wsAuth.js';

type UserSocketMap = Map<number, string>;
// userId -> socket.id (1:1 가정. 여러 기기면 Map<number, Set<string>>로)

const userSockets: UserSocketMap = new Map();
let io: Server;

export interface NotificationPayload {
  type: 'contract-linked' | 'chat' | 'system';
  message: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

export function setupWebSocket(server: HTTPServer) {
  io = new Server(server, {
    path: '/ws', // 원하는 엔드포인트
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    // 1) JWT로 유저 인증시키고 userId 알아내야 함
    //    클라이언트가 connection할 때 query.token 으로 보내게 할 수 있음
    const userId = parseUserIdFromToken(socket.handshake.auth?.token);
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // 2) 매핑 저장
    userSockets.set(userId, socket.id);

    // 3) 끊기면 정리
    socket.on('disconnect', () => {
      userSockets.delete(userId);
    });
  });
}

// notificationService에서 호출할 함수
export const wsGateway = {
  notifyUser(userId: number, notif: NotificationPayload) {
    const socketId = userSockets.get(userId);
    if (!socketId || !io) return;
    io.to(socketId).emit('notification', notif);
  },
};
