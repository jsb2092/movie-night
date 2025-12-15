import { useState, useCallback, useEffect, useRef } from 'react';

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

// Server API helpers
async function fetchConfigFromServer(): Promise<AppConfig> {
  try {
    const response = await fetch('/api/data/config');
    if (response.ok) {
      const data = await response.json();
      return {
        plexToken: data.plexToken || null,
        plexServerUri: data.plexServerUri || null,
        plexServerName: data.plexServerName || null,
        anthropicApiKey: data.anthropicApiKey || null,
      };
    }
  } catch (error) {
    console.error('[useConfig] Failed to fetch config from server:', error);
  }
  return defaultConfig;
}

async function saveConfigToServer(config: Partial<AppConfig>): Promise<void> {
  try {
    await fetch('/api/data/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  } catch (error) {
    console.error('[useConfig] Failed to save config to server:', error);
  }
}

async function clearConfigOnServer(): Promise<void> {
  try {
    await fetch('/api/data/config', { method: 'DELETE' });
  } catch (error) {
    console.error('[useConfig] Failed to clear config on server:', error);
  }
}

// Check for localStorage config to migrate
function getLocalStorageConfig(): AppConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return null;
}

function clearLocalStorageConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function useConfig() {
  const [config, setConfigState] = useState<AppConfig>(defaultConfig);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasMigratedRef = useRef(false);

  // Load config from server on mount, migrate from localStorage if needed
  useEffect(() => {
    async function loadConfig() {
      // First, fetch from server
      let serverConfig = await fetchConfigFromServer();

      // Check if we need to migrate from localStorage
      const localConfig = getLocalStorageConfig();
      if (localConfig && !hasMigratedRef.current) {
        hasMigratedRef.current = true;

        // Merge: prefer server values, but fill in from localStorage if missing
        const mergedConfig: AppConfig = {
          plexToken: serverConfig.plexToken || localConfig.plexToken || null,
          plexServerUri: serverConfig.plexServerUri || localConfig.plexServerUri || null,
          plexServerName: serverConfig.plexServerName || localConfig.plexServerName || null,
          anthropicApiKey: serverConfig.anthropicApiKey || localConfig.anthropicApiKey || null,
        };

        // If localStorage had values not in server, save to server
        const hasNewValues =
          (localConfig.plexToken && !serverConfig.plexToken) ||
          (localConfig.plexServerUri && !serverConfig.plexServerUri) ||
          (localConfig.plexServerName && !serverConfig.plexServerName) ||
          (localConfig.anthropicApiKey && !serverConfig.anthropicApiKey);

        if (hasNewValues) {
          console.log('[useConfig] Migrating config from localStorage to server');
          await saveConfigToServer(mergedConfig);
        }

        // Clear localStorage after migration
        clearLocalStorageConfig();
        serverConfig = mergedConfig;
      }

      setConfigState(serverConfig);
      setIsLoading(false);
    }

    loadConfig();
  }, []);

  useEffect(() => {
    setIsConfigured(Boolean(config.plexToken && config.plexServerUri));
  }, [config]);

  const setConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfigState(prev => {
      const newConfig = { ...prev, ...updates };
      // Save to server (async, fire and forget)
      saveConfigToServer(updates);
      return newConfig;
    });
  }, []);

  const clearConfig = useCallback(() => {
    setConfigState(defaultConfig);
    clearConfigOnServer();
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
    isLoading,
    getHeaders,
  };
}
