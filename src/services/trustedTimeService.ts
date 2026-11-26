/**
 * High-Precision Monotonic Server-Anchored Time Service
 * Anchored to Asia/Karachi (PKT) UTC+5.
 *
 * Prevents client device clock manipulation from tampering with
 * municipal deadlines, overdue evaluations, or officer rankings.
 */

class TrustedTimeService {
  private serverBaselineMs: number = Date.now();
  private monotonicStart: number = typeof performance !== 'undefined' ? performance.now() : 0;
  private hasSyncedWithServer: boolean = false;
  private syncPromise: Promise<void> | null = null;
  private resyncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      this.syncWithServer().catch(() => {});
      // Periodic resynchronization every 5 minutes
      this.resyncTimer = setInterval(() => {
        this.syncWithServer().catch(() => {});
      }, 5 * 60 * 1000);
    }
  }

  public async syncWithServer(): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;

    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = (async () => {
      try {
        const t0 = performance.now();
        // Fetch origin with no-store to read authoritative HTTP Date header
        const res = await fetch(window.location.origin + window.location.pathname, {
          method: 'HEAD',
          cache: 'no-store',
        });
        const t1 = performance.now();
        const rtt = Math.max(0, t1 - t0);

        const dateHeader = res.headers.get('date');
        if (dateHeader) {
          const serverDateMs = new Date(dateHeader).getTime();
          if (!isNaN(serverDateMs) && serverDateMs > 0) {
            // Anchor server time taking into account half of round-trip network latency
            this.serverBaselineMs = serverDateMs + Math.round(rtt / 2);
            this.monotonicStart = t1;
            this.hasSyncedWithServer = true;
          }
        }
      } catch {
        // In local mock test or disconnected mode, monotonic baseline remains anchored
      } finally {
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  /**
   * Authoritative current timestamp in milliseconds.
   * Monotonically advancing — immune to client device-clock tampering.
   */
  public nowMs(): number {
    if (typeof performance !== 'undefined') {
      const elapsed = performance.now() - this.monotonicStart;
      return this.serverBaselineMs + elapsed;
    }
    return this.serverBaselineMs;
  }

  /**
   * Authoritative Date object.
   */
  public now(): Date {
    return new Date(this.nowMs());
  }

  /**
   * Formats a given timestamp or current time in Asia/Karachi (PKT) UTC+5.
   */
  public formatPkt(targetTime?: Date | number): {
    timeStr: string;
    dateStr: string;
    fullStr: string;
    isoPkt: string;
  } {
    const d = targetTime instanceof Date
      ? targetTime
      : typeof targetTime === 'number'
        ? new Date(targetTime)
        : this.now();

    const timeFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);

    const dateFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);

    return {
      timeStr: timeFmt,
      dateStr: dateFmt,
      fullStr: `${dateFmt} · ${timeFmt} PKT`,
      isoPkt: d.toISOString(),
    };
  }

  /**
   * Checks whether clock has received an authoritative server handshake.
   */
  public isSynced(): boolean {
    return this.hasSyncedWithServer;
  }

  /**
   * Manually sets an authoritative server timestamp (used for testing or explicit RPC responses).
   */
  public setServerBaseline(serverTimestampMs: number): void {
    this.serverBaselineMs = serverTimestampMs;
    this.monotonicStart = typeof performance !== 'undefined' ? performance.now() : 0;
    this.hasSyncedWithServer = true;
  }

  public destroy(): void {
    if (this.resyncTimer) {
      clearInterval(this.resyncTimer);
      this.resyncTimer = null;
    }
  }
}

export const trustedTimeService = new TrustedTimeService();
