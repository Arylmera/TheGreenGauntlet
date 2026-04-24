import { EventEmitter } from 'node:events';
import type { LeaderboardPayload } from './aggregate.js';

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
}
