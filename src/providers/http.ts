// Safe outbound HTTP helpers.
//
// - All outbound requests use timeouts and a descriptive User-Agent.
// - Endpoints are validated against configured hosts to prevent SSRF-style
//   abuse of the (environment-controlled) provider base URLs.
// - A small retry/fallback mechanism keeps one dead mirror from failing a
//   research domain.

export class FetchError extends Error {
  readonly kind: 'timeout' | 'http' | 'network' | 'invalid-json' | 'invalid-url';
  readonly status?: number;

  constructor(kind: FetchError['kind'], message: string, status?: number) {
    super(message);
    this.name = 'FetchError';
    this.kind = kind;
    this.status = status;
  }
}

export interface HttpOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Extra query parameters to merge onto the URL. */
  query?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const UA = `RuralNet/0.1 (+https://github.com/ruralnet/ruralnet; research tool)`;

function assertUrl(url: string, allowedHosts?: string[]): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FetchError('invalid-url', `Malformed URL rejected: ${url.slice(0, 80)}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new FetchError('invalid-url', `Unsupported protocol in URL: ${parsed.protocol}`);
  }
  if (allowedHosts && allowedHosts.length > 0) {
    const host = parsed.hostname.toLowerCase();
    const ok = allowedHosts.some((h) => host === h || host.endsWith(`.${h}`));
    if (!ok) {
      throw new FetchError('invalid-url', `Host not allowed: ${host}`);
    }
  }
  return parsed;
}

export function withQueryParams(url: string, params: Record<string, string>): string {
  const parsed = new URL(url);
  for (const [k, v] of Object.entries(params)) parsed.searchParams.set(k, v);
  return parsed.toString();
}

export async function fetchJson<T>(
  url: string,
  opts: HttpOptions = {},
  allowedHosts?: string[],
): Promise<T> {
  const parsed = assertUrl(url, allowedHosts);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  for (const [k, v] of Object.entries(opts.query ?? {})) parsed.searchParams.set(k, v);

  const controller = new AbortController(timeoutMs);
  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json', ...opts.headers },
      signal: controller.signal,
      redirect: 'error', // never follow redirects off the intended provider
    });
    if (!res.ok) {
      throw new FetchError('http', `HTTP ${res.status} from ${parsed.host}`, res.status);
    }
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (controller.timedOut) throw new FetchError('timeout', `Request timed out after ${timeoutMs} ms`);
    throw new FetchError('network', `Network error: ${(err as Error).message}`);
  } finally {
    controller.cancel();
  }
}

class AbortController {
  readonly signal: AbortSignal;
  private _timedOut = false;

  constructor(timeoutMs: number) {
    // Node 18+/browsers support AbortSignal.timeout; Node 20 (the minimum for
    // this project) always does.
    this.signal = AbortSignal.timeout(timeoutMs);
    this.signal.addEventListener('abort', () => {
      // Our only abort source is the timeout, so any abort means it fired.
      this._timedOut = true;
    });
  }

  get timedOut(): boolean {
    return this._timedOut;
  }

  cancel(): void {
    // AbortSignal.timeout self-aborts after the timeout; nothing to cancel.
  }
}

/** Try a list of URLs in order, returning the first successful JSON parse. */
export async function fetchJsonWithFallback<T>(
  urls: string[],
  opts: HttpOptions,
  allowedHosts: string[],
): Promise<T> {
  let lastError: FetchError | null = null;
  for (const url of urls) {
    try {
      return await fetchJson<T>(url, opts, allowedHosts);
    } catch (err) {
      lastError = err instanceof FetchError ? err : new FetchError('network', String(err));
    }
  }
  throw lastError ?? new FetchError('network', 'All endpoints failed');
}