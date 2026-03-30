import type { AuthEventMap, AuthEventType } from './types';

type EventHandler<T> = (payload: T) => void;

/**
 * Type-safe event emitter for auth lifecycle events.
 *
 * @example
 * ```ts
 * const emitter = new AuthEventEmitter();
 * emitter.on('login', ({ user }) => console.log('Logged in:', user.name));
 * emitter.emit('login', { user: { id: '1', name: 'Alice' } });
 * ```
 */
export class AuthEventEmitter {
  private listeners = new Map<AuthEventType, Set<EventHandler<unknown>>>();

  /**
   * Subscribe to an auth event.
   * @returns Unsubscribe function
   */
  on<K extends AuthEventType>(event: K, handler: EventHandler<AuthEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler<unknown>);

    return () => {
      handlers.delete(handler as EventHandler<unknown>);
    };
  }

  /**
   * Subscribe to an auth event once.
   * Handler is automatically removed after first invocation.
   */
  once<K extends AuthEventType>(event: K, handler: EventHandler<AuthEventMap[K]>): () => void {
    const unsubscribe = this.on(event, ((payload: AuthEventMap[K]) => {
      unsubscribe();
      handler(payload);
    }) as EventHandler<AuthEventMap[K]>);
    return unsubscribe;
  }

  /** Emit an auth event to all subscribers */
  emit<K extends AuthEventType>(event: K, payload: AuthEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[swr-login] Error in "${event}" event handler:`, err);
      }
    }
  }

  /** Remove a specific handler or all handlers for an event */
  off<K extends AuthEventType>(event: K, handler?: EventHandler<AuthEventMap[K]>): void {
    if (!handler) {
      this.listeners.delete(event);
      return;
    }
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<unknown>);
    }
  }

  /** Remove all event listeners */
  removeAll(): void {
    this.listeners.clear();
  }
}
