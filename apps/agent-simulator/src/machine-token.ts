export type AccessTokenProvider = () => Promise<string>;

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export class ClientCredentialsTokenProvider {
  private cached: { token: string; refreshAt: number } | null = null;

  constructor(
    private readonly tokenUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly request: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async getToken(): Promise<string> {
    if (this.cached && this.cached.refreshAt > this.now()) return this.cached.token;
    const body = new URLSearchParams({
      grant_type: 'client_credentials', client_id: this.clientId, client_secret: this.clientSecret,
    });
    const response = await this.request(this.tokenUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (!response.ok) throw new Error(`Machine token request failed with status ${String(response.status)}`);
    const value: unknown = await response.json();
    const token = record(value) ? value['access_token'] : null;
    const expiresIn = record(value) ? value['expires_in'] : null;
    if (typeof token !== 'string' || !token.trim() || typeof expiresIn !== 'number'
      || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new Error('Machine token response is invalid');
    }
    const refreshInSeconds = Math.max(1, expiresIn - 30);
    this.cached = { token: token.trim(), refreshAt: this.now() + refreshInSeconds * 1000 };
    return this.cached.token;
  }
}
