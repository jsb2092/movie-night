import { useState, useEffect } from 'react';
import {
  X,
  Server,
  Key,
  Check,
  Loader2,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import type { AppConfig } from '../hooks/useConfig';

interface SettingsProps {
  config: AppConfig;
  setConfig: (updates: Partial<AppConfig>) => void;
  clearConfig: () => void;
  onClose: () => void;
}

interface PlexConnection {
  uri: string;
  local: boolean;
  relay: boolean;
  address: string;
  port: number;
  reachable?: boolean;
}

interface PlexServerOption {
  name: string;
  uri: string;
  local: boolean;
  relay: boolean;
  address: string;
  port: number;
  reachable?: boolean;
  allConnections?: PlexConnection[];
}

export function Settings({ config, setConfig, clearConfig, onClose }: SettingsProps) {
  const [step, setStep] = useState<'main' | 'plex-login' | 'server-select'>('main');
  const [pinId, setPinId] = useState<number | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [servers, setServers] = useState<PlexServerOption[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anthropicKey, setAnthropicKey] = useState(config.anthropicApiKey || '');
  const [manualMode, setManualMode] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualToken, setManualToken] = useState('');

  // Start Plex OAuth flow
  const startPlexLogin = async () => {
    try {
      setError(null);
      const response = await fetch('/api/auth/plex/pin', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start login');

      const data = await response.json();
      setPinId(data.pinId);
      setAuthUrl(data.authUrl);
      setStep('plex-login');

      // Open Plex auth in new window
      window.open(data.authUrl, '_blank', 'width=800,height=600');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start login');
    }
  };

  // Poll for PIN completion
  useEffect(() => {
    if (!pinId || step !== 'plex-login') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/plex/pin/${pinId}`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.complete && data.authToken) {
          clearInterval(interval);
          setConfig({ plexToken: data.authToken });
          loadServers(data.authToken);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pinId, step, setConfig]);

  // Load servers after getting token
  const loadServers = async (token: string) => {
    setLoadingServers(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/plex/servers', {
        headers: { 'X-Plex-Token': token },
      });
      if (!response.ok) throw new Error('Failed to load servers');

      const data = await response.json();
      setServers(data);
      setStep('server-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoadingServers(false);
    }
  };

  // Select a server
  const selectServer = async (server: PlexServerOption) => {
    setConfig({
      plexServerUri: server.uri,
      plexServerName: server.name,
    });
    setStep('main');
  };

  // Save manual config
  const saveManualConfig = () => {
    if (!manualUrl || !manualToken) return;
    setConfig({
      plexToken: manualToken,
      plexServerUri: manualUrl,
      plexServerName: 'Manual Server',
    });
    setManualMode(false);
    setManualUrl('');
    setManualToken('');
  };

  // Save Anthropic key
  const saveAnthropicKey = () => {
    setConfig({ anthropicApiKey: anthropicKey || null });
  };

  const isPlexConfigured = Boolean(config.plexToken && config.plexServerUri);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg glass-dark rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 text-red-300 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Main Settings View */}
          {step === 'main' && (
            <>
              {/* Plex Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Server size={16} />
                  Plex Connection
                </h3>

                {isPlexConfigured ? (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={18} className="text-green-400" />
                        <div>
                          <p className="font-medium text-green-300">Connected</p>
                          <p className="text-sm text-gray-400">{config.plexServerName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          clearConfig();
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                        title="Disconnect"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={startPlexLogin}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E5A00D] hover:bg-[#d4940c] text-black font-medium rounded-xl transition-colors"
                    >
                      <Server size={18} />
                      Sign in with Plex
                    </button>

                    <button
                      onClick={() => setManualMode(!manualMode)}
                      className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {manualMode ? 'Hide manual setup' : 'Or enter details manually'}
                    </button>

                    {manualMode && (
                      <div className="space-y-3 p-4 rounded-xl bg-white/5">
                        <input
                          type="text"
                          placeholder="Server URL (e.g., http://192.168.1.100:32400)"
                          value={manualUrl}
                          onChange={(e) => setManualUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                        />
                        <input
                          type="password"
                          placeholder="X-Plex-Token"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                        />
                        <button
                          onClick={saveManualConfig}
                          disabled={!manualUrl || !manualToken}
                          className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Anthropic Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Key size={16} />
                  Claude API (Optional)
                </h3>
                <p className="text-xs text-gray-500">
                  Add your API key to enable AI-generated drink and food pairings
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-ant-api03-..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                  />
                  <button
                    onClick={saveAnthropicKey}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
                {config.anthropicApiKey && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <Check size={12} /> API key saved
                  </p>
                )}
              </div>
            </>
          )}

          {/* Plex Login Step */}
          {step === 'plex-login' && (
            <div className="text-center py-8">
              {loadingServers ? (
                <>
                  <Loader2 size={48} className="mx-auto mb-4 animate-spin text-primary-400" />
                  <p className="text-lg font-medium">Loading your servers...</p>
                </>
              ) : (
                <>
                  <Loader2 size={48} className="mx-auto mb-4 animate-spin text-[#E5A00D]" />
                  <p className="text-lg font-medium mb-2">Waiting for Plex authorization...</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Complete sign-in in the popup window
                  </p>
                  {authUrl && (
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                    >
                      Open Plex login <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => setStep('main')}
                    className="block mx-auto mt-4 text-sm text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Server Selection Step */}
          {step === 'server-select' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Your Server</h3>
              <p className="text-sm text-gray-400">
                Choose a connection or enter a custom URL
              </p>

              {/* Custom URL option */}
              <div className="p-3 rounded-lg bg-white/5 border border-primary-500/30">
                <p className="text-sm font-medium text-primary-400 mb-2">Custom URL</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="http://192.168.87.2:32400 or https://plex.jetcom.org:65087"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                  />
                  <button
                    onClick={() => {
                      if (manualUrl) {
                        setConfig({
                          plexServerUri: manualUrl,
                          plexServerName: 'Custom Server',
                        });
                        setManualUrl('');
                        setStep('main');
                      }
                    }}
                    disabled={!manualUrl}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">— or select from detected connections —</p>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {servers.map((server, idx) => (
                  <div
                    key={`${server.name}-${idx}`}
                    className="p-3 rounded-lg bg-white/5"
                  >
                    <p className="font-medium mb-2">{server.name}</p>
                    <div className="space-y-1">
                      {(server.allConnections || [server]).map((conn, connIdx) => {
                        const isReachable = conn.reachable !== false;
                        return (
                          <button
                            key={`${conn.uri}-${connIdx}`}
                            onClick={() => isReachable && selectServer({ ...server, uri: conn.uri, address: conn.address, port: conn.port, local: conn.local, relay: conn.relay })}
                            disabled={!isReachable}
                            className={`w-full flex items-center justify-between p-2 rounded transition-colors text-left text-sm ${
                              isReachable
                                ? 'bg-white/5 hover:bg-white/10'
                                : 'bg-white/5 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div>
                              <span className={isReachable ? 'text-gray-300' : 'text-gray-500 line-through'}>{conn.address}:{conn.port}</span>
                              <span className="ml-2 text-xs">
                                {!isReachable && (
                                  <span className="text-red-400">(Unreachable) </span>
                                )}
                                {conn.local && !conn.relay && (
                                  <span className={isReachable ? 'text-green-400' : 'text-gray-500'}>(Local{isReachable && ' - Recommended'})</span>
                                )}
                                {conn.local && conn.relay && (
                                  <span className={isReachable ? 'text-yellow-400' : 'text-gray-500'}>(Local Relay)</span>
                                )}
                                {!conn.local && conn.relay && (
                                  <span className={isReachable ? 'text-orange-400' : 'text-gray-500'}>(Remote Relay)</span>
                                )}
                                {!conn.local && !conn.relay && (
                                  <span className={isReachable ? 'text-blue-400' : 'text-gray-500'}>(Remote)</span>
                                )}
                              </span>
                            </div>
                            {isReachable && <ChevronDown size={14} className="rotate-[-90deg] text-gray-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {servers.length === 0 && (
                <p className="text-center text-gray-400 py-4">
                  No servers found. Make sure your Plex server is online.
                </p>
              )}

              <button
                onClick={() => setStep('main')}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
