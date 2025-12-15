import { useState, useCallback, useEffect } from 'react';

export interface PlexServer {
  name: string;
  address: string;
  port: number;
  local: boolean;
  relay: boolean;
  uri: string;
}

export interface AppConfig {
  plexToken: string | null;
  plexServerUri: string | null;
  plexServerName: string | null;
  anthropicApiKey: string | null;
}

const STORAGE_KEY = 'movie-night-config';

const defaultConfig: AppConfig = {
  plexToken: null,
  plexServerUri: null,
  plexServerName: null,
  anthropicApiKey: null,
};

function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('[useConfig] Loading config, stored:', stored);
    if (stored) {
      const parsed = { ...defaultConfig, ...JSON.parse(stored) };
      console.log('[useConfig] Parsed config:', parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  console.log('[useConfig] Using default config');
  return defaultConfig;
}

function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

export function useConfig() {
  const [config, setConfigState] = useState<AppConfig>(loadConfig);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(Boolean(config.plexToken && config.plexServerUri));
  }, [config]);

  const setConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfigState(prev => {
      const newConfig = { ...prev, ...updates };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  const clearConfig = useCallback(() => {
    setConfigState(defaultConfig);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (config.plexToken) {
      headers['X-Plex-Token'] = config.plexToken;
    }
    if (config.plexServerUri) {
      headers['X-Plex-Url'] = config.plexServerUri;
    }
    if (config.anthropicApiKey) {
      headers['X-Anthropic-Key'] = config.anthropicApiKey;
    }
    return headers;
  }, [config]);

  return {
    config,
    setConfig,
    clearConfig,
    isConfigured,
    getHeaders,
  };
}
