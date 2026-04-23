import { EventEmitter } from 'node:events';

export class LeaderboardEvents {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Allow many concurrent SSE clients without warning.
    this.emitter.setMaxListeners(1000);
  }

  onUpdate(listener: (payload: { updatedAt: string }) => void): () => void {
    this.emitter.on('update', listener);
    return () => this.emitter.off('update', listener);
  }

  emitUpdate(): void {
    this.emitter.emit('update', { updatedAt: new Date().toISOString() });
  }
}
