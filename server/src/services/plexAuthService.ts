const PLEX_TV_URL = 'https://plex.tv';
const CLIENT_ID = 'movie-night-app';
const PRODUCT_NAME = 'Movie Night';

interface PlexPin {
  id: number;
  code: string;
  authToken: string | null;
}

interface PlexResource {
  name: string;
  provides: string;
  connections: Array<{
    uri: string;
    local: boolean;
    relay: boolean;
    address: string;
    port: number;
    protocol: string;
  }>;
}

export class PlexAuthService {
  private getHeaders() {
    return {
      Accept: 'application/json',
      'X-Plex-Client-Identifier': CLIENT_ID,
      'X-Plex-Product': PRODUCT_NAME,
      'X-Plex-Version': '1.0.0',
      'X-Plex-Platform': 'Web',
      'X-Plex-Platform-Version': '1.0',
      'X-Plex-Device': 'Browser',
      'X-Plex-Device-Name': 'Movie Night App',
    };
  }

  async createPin(): Promise<{ pinId: number; code: string; authUrl: string }> {
    const response = await fetch(`${PLEX_TV_URL}/api/v2/pins?strong=true`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create PIN: ${response.status}`);
    }

    const data = await response.json();
    const pinId = data.id;
    const code = data.code;

    // Build the auth URL
    const authUrl = `https://app.plex.tv/auth#?clientID=${CLIENT_ID}&code=${code}&context%5Bdevice%5D%5Bproduct%5D=${encodeURIComponent(PRODUCT_NAME)}`;

    return { pinId, code, authUrl };
  }

  async checkPin(pinId: number): Promise<{ complete: boolean; authToken: string | null }> {
    const response = await fetch(`${PLEX_TV_URL}/api/v2/pins/${pinId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to check PIN: ${response.status}`);
    }

    const data = await response.json();
    const authToken = data.authToken;

    return {
      complete: Boolean(authToken),
      authToken: authToken || null,
    };
  }

  async getServers(authToken: string): Promise<Array<{
    name: string;
    uri: string;
    local: boolean;
    relay: boolean;
    address: string;
    port: number;
    allConnections: Array<{ uri: string; local: boolean; relay: boolean; address: string; port: number }>;
  }>> {
    const response = await fetch(`${PLEX_TV_URL}/api/v2/resources?includeHttps=1&includeRelay=1`, {
      headers: {
        ...this.getHeaders(),
        'X-Plex-Token': authToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get servers: ${response.status}`);
    }

    const data: PlexResource[] = await response.json();

    // Filter to only Plex Media Servers and group by server
    console.log('[plexAuth] Raw resources from Plex:', JSON.stringify(data.filter(r => r.provides.includes('server')), null, 2));

    const servers = data
      .filter(r => r.provides.includes('server'))
      .map(server => {
        // Expand connections to include direct IP versions of plex.direct URLs
        const expandedConnections: typeof server.connections = [];
        for (const conn of server.connections) {
          expandedConnections.push(conn);
          // If this is a plex.direct URL, extract the IP and add a direct HTTP connection
          const plexDirectMatch = conn.uri.match(/https?:\/\/(\d+)-(\d+)-(\d+)-(\d+)\.[a-f0-9]+\.plex\.direct:(\d+)/);
          if (plexDirectMatch) {
            const directIp = `${plexDirectMatch[1]}.${plexDirectMatch[2]}.${plexDirectMatch[3]}.${plexDirectMatch[4]}`;
            const port = plexDirectMatch[5];
            // Add direct HTTP connection if not already present
            const directUri = `http://${directIp}:${port}`;
            if (!expandedConnections.some(c => c.uri === directUri)) {
              expandedConnections.push({
                uri: directUri,
                local: conn.local,
                relay: false,
                address: directIp,
                port: parseInt(port, 10),
                protocol: 'http',
              });
              console.log(`[plexAuth] Added direct IP connection: ${directUri}`);
            }
          }
        }

        // Sort connections: prefer local non-relay, then local, then non-relay, then relay
        const sortedConnections = [...expandedConnections].sort((a, b) => {
          // Prefer local non-relay
          if (a.local && !a.relay && (!b.local || b.relay)) return -1;
          if (b.local && !b.relay && (!a.local || a.relay)) return 1;
          // Then prefer local (even if relay)
          if (a.local && !b.local) return -1;
          if (b.local && !a.local) return 1;
          // Then prefer non-relay
          if (!a.relay && b.relay) return -1;
          if (a.relay && !b.relay) return 1;
          return 0;
        });

        // Pick the best connection (first after sorting)
        const best = sortedConnections[0];

        return {
          name: server.name,
          uri: best.uri,
          local: best.local,
          relay: best.relay,
          address: best.address,
          port: best.port,
          allConnections: sortedConnections.map(c => ({
            uri: c.uri,
            local: c.local,
            relay: c.relay,
            address: c.address,
            port: c.port,
          })),
        };
      });

    return servers;
  }

  async testConnection(serverUri: string, authToken: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      const response = await fetch(`${serverUri}/identity`, {
        headers: {
          'X-Plex-Token': authToken,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const plexAuthService = new PlexAuthService();
