import type { BroadcastMessage, BroadcastMessageType } from './types';
import { generateTabId, safeJsonParse } from './utils';

const CHANNEL_NAME = 'swr-login-sync';
const LS_KEY = '__swr_login_broadcast__';

type MessageHandler = (message: BroadcastMessage) => void;

/**
 * Cross-tab synchronization via BroadcastChannel API.
 * Falls back to localStorage storage events when BroadcastChannel is unavailable.
 *
 * Used to sync login/logout/token-refresh events across browser tabs.
 */
export class BroadcastSync {
  private tabId: string;
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<MessageHandler>();
  private storageHandler: ((event: StorageEvent) => void) | null = null;
  private useFallback: boolean;

  constructor() {
    this.tabId = generateTabId();
    this.useFallback = typeof BroadcastChannel === 'undefined';
    this._init();
  }

  private _init(): void {
    if (!this.useFallback) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent) => {
        const message = event.data as BroadcastMessage;
        // Ignore messages from this tab
        if (message.tabId === this.tabId) return;
        this._notify(message);
      };
    } else if (typeof window !== 'undefined') {
      // Fallback: localStorage storage event
      this.storageHandler = (event: StorageEvent) => {
        if (event.key !== LS_KEY || !event.newValue) return;
        const message = safeJsonParse<BroadcastMessage>(event.newValue);
        if (message && message.tabId !== this.tabId) {
          this._notify(message);
        }
      };
      window.addEventListener('storage', this.storageHandler);
    }
  }

  private _notify(message: BroadcastMessage): void {
    for (const handler of this.handlers) {
      try {
        handler(message);
      } catch (err) {
        console.error('[swr-login] Error in broadcast handler:', err);
      }
    }
  }

  /**
   * Send a broadcast message to all other tabs.
   */
  send(type: BroadcastMessageType, payload?: unknown): void {
    const message: BroadcastMessage = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    if (this.channel) {
      this.channel.postMessage(message);
    } else if (typeof localStorage !== 'undefined') {
      // Fallback: write to localStorage to trigger storage event in other tabs
      localStorage.setItem(LS_KEY, JSON.stringify(message));
      // Clean up immediately (we only need the event trigger)
      localStorage.removeItem(LS_KEY);
    }
  }

  /**
   * Subscribe to broadcast messages from other tabs.
   * @returns Unsubscribe function
   */
  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /** Destroy the broadcast channel and clean up listeners */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    this.handlers.clear();
  }
}
