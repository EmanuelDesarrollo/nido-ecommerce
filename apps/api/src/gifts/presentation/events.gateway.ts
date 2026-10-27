import { Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { SocketEvent, SocketEventPayloads, userRoom } from '@nido/shared';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../../users/users.service';

/** Each socket authenticates with auth.userId and joins the room user:{id}. */
@WebSocketGateway()
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly users: UsersService) {}

  async handleConnection(client: Socket): Promise<void> {
    const auth: Record<string, unknown> = client.handshake.auth;
    const userId = auth.userId;
    const user = typeof userId === 'string' ? await this.users.findById(userId) : null;
    if (!user) {
      client.disconnect(true);
      return;
    }
    await client.join(userRoom(user.id));
    this.logger.debug(`Socket ${client.id} joined ${userRoom(user.id)}`);
  }

  emitToUser<E extends SocketEvent>(userId: string, event: E, payload: SocketEventPayloads[E]): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }
}
