import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../event-bus';
import type { AuthEvent } from '../types';

describe('EventBus', () => {
  it('dispatches to subscribers of matching kind', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    bus.subscribe('login', fn);
    bus.publish({ kind: 'login', methodId: 'x/y' });
    expect(fn).toHaveBeenCalledOnce();
    const event = fn.mock.calls[0][0] as AuthEvent;
    expect(event.kind).toBe('login');
    expect(event.methodId).toBe('x/y');
    expect(typeof event.timestamp).toBe('number');
  });

  it('supports kind array subscription', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    bus.subscribe(['login', 'logout'], fn);
    bus.publish({ kind: 'login' });
    bus.publish({ kind: 'logout' });
    bus.publish({ kind: 'session_lost' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('subscribe(undefined) receives every event', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    bus.subscribe(undefined, fn);
    bus.publish({ kind: 'login' });
    bus.publish({ kind: 'session_lost' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe removes the listener', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    const off = bus.subscribe('login', fn);
    off();
    bus.publish({ kind: 'login' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('preserves explicit timestamp', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    bus.subscribe('login', fn);
    bus.publish({ kind: 'login', timestamp: 12345 });
    expect((fn.mock.calls[0][0] as AuthEvent).timestamp).toBe(12345);
  });

  it('one handler error does not prevent others', () => {
    const bus = new EventBus();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fn1 = vi.fn(() => {
      throw new Error('boom');
    });
    const fn2 = vi.fn();
    bus.subscribe('login', fn1);
    bus.subscribe('login', fn2);
    bus.publish({ kind: 'login' });
    expect(fn2).toHaveBeenCalledOnce();
    errSpy.mockRestore();
  });

  it('handler subscribing during publish does not receive the in-flight event', () => {
    const bus = new EventBus();
    const fn2 = vi.fn();
    bus.subscribe('login', () => {
      bus.subscribe('login', fn2);
    });
    bus.publish({ kind: 'login' });
    expect(fn2).not.toHaveBeenCalled();
    bus.publish({ kind: 'login' });
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('clear removes all subscribers', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    bus.subscribe('login', fn);
    bus.clear();
    bus.publish({ kind: 'login' });
    expect(fn).not.toHaveBeenCalled();
  });
});
