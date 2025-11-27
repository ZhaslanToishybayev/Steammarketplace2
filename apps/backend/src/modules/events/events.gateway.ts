import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { Logger } from '@nestjs/common';

export interface TradeUpdateEvent {
  tradeId: string;
  status: string;
  timestamp: Date;
  data?: any;
}

export interface TradeEventData {
  tradeId: string;
  status: string;
  timestamp: Date;
  offerId?: string;
  reason?: string;
  errorMessage?: string;
  userId?: string;
  metadata?: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/',
  path: process.env.WS_PATH || '/socket.io',
})
@UseGuards(WsJwtAuthGuard)
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor() {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} from ${client.handshake.address}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: User,
  ) {
    // Validate user exists
    if (!user || !user.id) {
      client.emit('error', {
        message: 'Authentication required',
        timestamp: new Date(),
      });
      return;
    }

    const room = `user:${user.id}`;
    client.join(room);
    this.logger.log(`User ${user.id} joined room: ${room}`);

    client.emit('joined_room', {
      room,
      message: `Joined user room for ${user.username}`,
    });
  }

  @SubscribeMessage('join_trade_room')
  handleJoinTradeRoom(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: User,
    @MessageBody() data: { tradeId: string },
  ) {
    // Validate user exists
    if (!user || !user.id) {
      client.emit('error', {
        message: 'Authentication required',
        timestamp: new Date(),
      });
      return;
    }

    const room = `trade:${data.tradeId}`;
    client.join(room);
    this.logger.log(`User ${user.id} joined trade room: ${room}`);

    client.emit('trade_room_joined', {
      tradeId: data.tradeId,
      room,
      message: `Joined trade room for ${data.tradeId}`,
    });
  }

  @SubscribeMessage('leave_trade_room')
  handleLeaveTradeRoom(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: User,
    @MessageBody() data: { tradeId: string },
  ) {
    // Validate user exists
    if (!user || !user.id) {
      client.emit('error', {
        message: 'Authentication required',
        timestamp: new Date(),
      });
      return;
    }

    const room = `trade:${data.tradeId}`;
    client.leave(room);
    this.logger.log(`User ${user.id} left trade room: ${room}`);

    client.emit('trade_room_left', {
      tradeId: data.tradeId,
      room,
      message: `Left trade room for ${data.tradeId}`,
    });
  }

  // Event emission methods for services to call
  emitTradeUpdate(tradeId: string, data: TradeEventData) {
    try {
      const tradeRoom = `trade:${tradeId}`;
      const userRoom = `user:${data.userId || 'unknown'}`;

      // Emit to trade-specific room
      this.server.to(tradeRoom).emit('trade:update', {
        ...data,
        timestamp: new Date(),
      });

      // Emit to user room
      this.server.to(userRoom).emit('trade:update', {
        ...data,
        timestamp: new Date(),
      });

      // Emit to all connected clients (global update)
      this.server.emit('trade:update:global', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted trade:update for trade ${tradeId}: ${data.status}`);
    } catch (error) {
      this.logger.error(`Failed to emit trade update for trade ${tradeId}:`, error);
    }
  }

  emitTradeSent(tradeId: string, data: TradeEventData) {
    try {
      const tradeRoom = `trade:${tradeId}`;
      const userRoom = `user:${data.userId || 'unknown'}`;

      this.server.to(tradeRoom).emit('trade:sent', {
        ...data,
        timestamp: new Date(),
      });

      this.server.to(userRoom).emit('trade:sent', {
        ...data,
        timestamp: new Date(),
      });

      this.server.emit('trade:sent:global', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted trade:sent for trade ${tradeId}`);
    } catch (error) {
      this.logger.error(`Failed to emit trade sent for trade ${tradeId}:`, error);
    }
  }

  emitTradeAccepted(tradeId: string, data: TradeEventData) {
    try {
      const tradeRoom = `trade:${tradeId}`;
      const userRoom = `user:${data.userId || 'unknown'}`;

      this.server.to(tradeRoom).emit('trade:accepted', {
        ...data,
        timestamp: new Date(),
      });

      this.server.to(userRoom).emit('trade:accepted', {
        ...data,
        timestamp: new Date(),
      });

      this.server.emit('trade:accepted:global', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted trade:accepted for trade ${tradeId}`);
    } catch (error) {
      this.logger.error(`Failed to emit trade accepted for trade ${tradeId}:`, error);
    }
  }

  emitTradeCompleted(tradeId: string, data: TradeEventData) {
    try {
      const tradeRoom = `trade:${tradeId}`;
      const userRoom = `user:${data.userId || 'unknown'}`;

      this.server.to(tradeRoom).emit('trade:completed', {
        ...data,
        timestamp: new Date(),
      });

      this.server.to(userRoom).emit('trade:completed', {
        ...data,
        timestamp: new Date(),
      });

      this.server.emit('trade:completed:global', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted trade:completed for trade ${tradeId}`);
    } catch (error) {
      this.logger.error(`Failed to emit trade completed for trade ${tradeId}:`, error);
    }
  }

  emitTradeDeclined(tradeId: string, data: TradeEventData) {
    try {
      const tradeRoom = `trade:${tradeId}`;
      const userRoom = `user:${data.userId || 'unknown'}`;

      this.server.to(tradeRoom).emit('trade:declined', {
        ...data,
        timestamp: new Date(),
      });

      this.server.to(userRoom).emit('trade:declined', {
        ...data,
        timestamp: new Date(),
      });

      this.server.emit('trade:declined:global', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted trade:declined for trade ${tradeId}`);
    } catch (error) {
      this.logger.error(`Failed to emit trade declined for trade ${tradeId}:`, error);
    }
  }

  emitTradeFailed(tradeId: string, data: TradeEventData) {
    try {
      const tradeRoom = `trade:${tradeId}`;
      const userRoom = `user:${data.userId || 'unknown'}`;

      this.server.to(tradeRoom).emit('trade:failed', {
        ...data,
        timestamp: new Date(),
      });

      this.server.to(userRoom).emit('trade:failed', {
        ...data,
        timestamp: new Date(),
      });

      this.server.emit('trade:failed:global', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted trade:failed for trade ${tradeId}`);
    } catch (error) {
      this.logger.error(`Failed to emit trade failed for trade ${tradeId}:`, error);
    }
  }

  emitBalanceUpdate(userId: string, data: any) {
    try {
      const userRoom = `user:${userId}`;

      this.server.to(userRoom).emit('balance:updated', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted balance:updated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to emit balance update for user ${userId}:`, error);
    }
  }

  emitInventoryUpdate(userId: string, data: any) {
    try {
      const userRoom = `user:${userId}`;

      this.server.to(userRoom).emit('inventory:updated', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted inventory:updated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to emit inventory update for user ${userId}:`, error);
    }
  }

  emitNotification(userId: string, data: any) {
    try {
      const userRoom = `user:${userId}`;

      this.server.to(userRoom).emit('notification', {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted notification for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to emit notification for user ${userId}:`, error);
    }
  }

  // Broadcast to all connected clients
  emitGlobalEvent(event: string, data: any) {
    try {
      this.server.emit(event, {
        ...data,
        timestamp: new Date(),
      });

      this.logger.log(`Emitted global event: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to emit global event ${event}:`, error);
    }
  }

  // Utility method to get connected clients count
  getConnectedClients(): number {
    return this.server.engine.clientsCount;
  }
}