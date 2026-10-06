import { Injectable, type MessageEvent } from '@nestjs/common';
import { Observable, type Subscriber } from 'rxjs';

export type RealtimePayload = {
  resource: 'announcements' | 'attendance' | 'messages' | 'notifications' | 'presence' | 'profile' | 'tasks' | 'leaves' | 'approvals' | 'team' | 'employees';
  title?: string;
  body?: string;
};

@Injectable()
export class RealtimeService {
  private readonly clients = new Map<string, Set<Subscriber<MessageEvent>>>();

  events(userId: string) {
    return new Observable<MessageEvent>(subscriber => {
      const users = this.clients.get(userId) ?? new Set<Subscriber<MessageEvent>>();
      users.add(subscriber);
      this.clients.set(userId, users);
      subscriber.next({ type: 'connected', data: { connected: true } });
      const heartbeat = setInterval(() => subscriber.next({ type: 'heartbeat', data: { at: Date.now() } }), 25_000);
      return () => {
        clearInterval(heartbeat);
        users.delete(subscriber);
        if (!users.size) this.clients.delete(userId);
      };
    });
  }

  emit(userIds: string[], payload: RealtimePayload) {
    for (const userId of new Set(userIds)) {
      for (const subscriber of this.clients.get(userId) ?? []) subscriber.next({ type: 'update', data: payload });
    }
  }
}
