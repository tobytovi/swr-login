/**
 * @swr-login/core - Cross-tab broadcast sync (v0.9).
 *
 * Echoes `AuthEvent`s across tabs via BroadcastChannel (or localStorage
 * fallback). Each tab tags messages with its own tabId to suppress echo.
 *
 * Channel name is configurable via `SecurityConfig.broadcastChannel`.
 */

import type { AuthEvent } from './types';
import { generateTabId, safeJsonParse } from './utils';

const DEFAULT_CHANNEL_NAME = 'swr-login';
const LS_KEY_PREFIX = '__swr_login_broadcast__';

interface Envelope {
  tabId: string;
  event: AuthEvent;
}

export type BroadcastListener = (event: AuthEvent) => void;

export class BroadcastSync {
  private readonly channelName: string;
  private readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<BroadcastListener>();
  private storageHandler: ((event: StorageEvent) => void) | null = null;
  private useFallback: boolean;
  private lsKey: string;

  constructor(channelName: string = DEFAULT_CHANNEL_NAME) {
    this.channelName = channelName;
    this.tabId = generateTabId();
    this.useFallback = typeof BroadcastChannel === 'undefined';
    this.lsKey = `${LS_KEY_PREFIX}${channelName}`;
    this.init();
  }

  private init(): void {
    if (!this.useFallback) {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (e: MessageEvent) => {
        const env = e.data as Envelope;
        if (!env || env.tabId === this.tabId) return;
        this.notify(env.event);
      };
    } else if (typeof window !== 'undefined') {
      this.storageHandler = (e: StorageEvent) => {
        if (e.key !== this.lsKey || !e.newValue) return;
        const env = safeJsonParse<Envelope>(e.newValue);
        if (env && env.tabId !== this.tabId) {
          this.notify(env.event);
        }
      };
      window.addEventListener('storage', this.storageHandler);
    }
  }

  private notify(event: AuthEvent): void {
    for (const fn of Array.from(this.listeners)) {
      try {
        fn(event);
      } catch (err) {
        console.error('[swr-login] error in broadcast listener:', err);
      }
    }
  }

  /** Publish an event to all other tabs. Self-tab is skipped automatically. */
  send(event: AuthEvent): void {
    const envelope: Envelope = { tabId: this.tabId, event };
    if (this.channel) {
      this.channel.postMessage(envelope);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.lsKey, JSON.stringify(envelope));
      localStorage.removeItem(this.lsKey);
    }
  }

  /** Subscribe; returns unsubscribe. */
  subscribe(listener: BroadcastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    this.listeners.clear();
  }
}
