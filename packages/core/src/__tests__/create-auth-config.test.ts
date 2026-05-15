import { describe, expect, it } from 'vitest';
import { createAuthConfig } from '../create-auth-config';
import type { AuthHookRegistryProps, Credential, LoginMethod } from '../types';

const mockCredential: Credential = {
  version: '1.0',
  hasAuth: () => false,
  clear: async () => {},
  getAccessToken: () => null,
  subscribe: () => () => {},
};

const mockMethod: LoginMethod = {
  id: 'test/mock',
  meta: { label: 'mock' },
  use: () => ({ state: 'idle', reset: () => {} }),
};

type ConfigInput = Omit<AuthHookRegistryProps, 'children'>;

describe('createAuthConfig (v0.9)', () => {
  it('returns the same config object reference', () => {
    const config: ConfigInput = {
      credential: mockCredential,
      methods: [mockMethod],
    };
    const result = createAuthConfig(config);
    expect(result).toBe(config);
  });

  it('preserves all v0.9 fields', () => {
    const fetchSession = async () => ({ id: '1', name: 'Alice' });
    const onSessionChange = async () => {};

    const config = createAuthConfig<ConfigInput>({
      credential: mockCredential,
      methods: [mockMethod],
      fetchSession,
      onSessionChange,
      security: {
        enableBroadcastSync: true,
        clearOnHidden: false,
        broadcastChannel: 'custom-channel',
      },
    });

    expect(config.credential).toBe(mockCredential);
    expect(config.methods).toEqual([mockMethod]);
    expect(config.fetchSession).toBe(fetchSession);
    expect(config.onSessionChange).toBe(onSessionChange);
    expect(config.security).toEqual({
      enableBroadcastSync: true,
      clearOnHidden: false,
      broadcastChannel: 'custom-channel',
    });
  });

  it('supports minimal config (credential + methods only)', () => {
    const config = createAuthConfig<ConfigInput>({
      credential: mockCredential,
      methods: [],
    });

    expect(config.credential).toBe(mockCredential);
    expect(config.methods).toEqual([]);
    expect(config.fetchSession).toBeUndefined();
    expect(config.onSessionChange).toBeUndefined();
    expect(config.security).toBeUndefined();
  });
});
