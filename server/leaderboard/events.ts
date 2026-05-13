import { EventEmitter } from 'node:events';
import type { LeaderboardPayload } from './types.js';

export type AnnouncementEventPayload = {
  message: string | null;
  messageId: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export class LeaderboardEvents {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Allow many concurrent SSE clients without warning.
    this.emitter.setMaxListeners(1000);
  }

  onUpdate(listener: (payload: LeaderboardPayload) => void): () => void {
    this.emitter.on('update', listener);
    return () => this.emitter.off('update', listener);
  }

  emitUpdate(payload: LeaderboardPayload): void {
    this.emitter.emit('update', payload);
  }

  onAnnouncement(listener: (payload: AnnouncementEventPayload) => void): () => void {
    this.emitter.on('announcement', listener);
    return () => this.emitter.off('announcement', listener);
  }

  emitAnnouncement(payload: AnnouncementEventPayload): void {
    this.emitter.emit('announcement', payload);
  }
}
