/**
 * AWAAZ-E-AWAM (آوازِ عوام) — AI Training Telemetry Service
 *
 * Implements Phase 6 Durable Training Telemetry & Live Status Stream:
 * - 5-second polling interval with visibility state awareness.
 * - Stale detection (> 25s without heartbeat).
 * - Start / Stop training simulation control triggers.
 * - Real-time state listeners for UI updates without page refreshes.
 */

export interface TelemetryResources {
  [drive: string]: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
  };
}

export interface TelemetryMetrics {
  exact_accuracy: number;
  macro_f1: number;
  false_extra_rate: number;
  missed_rate: number;
}

export interface TelemetryEvent {
  timestamp: string;
  level: string;
  message: string;
}

export interface TelemetryPayload {
  source?: 'connected' | 'unavailable';
  state: 'LIVE' | 'IDLE' | 'STALE' | 'COMPLETED' | 'FAILED';
  stage: string;
  progress_current: number;
  progress_target: number;
  percent_complete: number;
  current_cycle?: number;
  total_cycles?: number;
  active_task: string;
  elapsed_seconds: number;
  estimated_remaining_seconds: number;
  resources: TelemetryResources;
  latest_metrics: TelemetryMetrics;
  recent_events: TelemetryEvent[];
  active_model?: {
    version: string;
    sha256: string;
    status: string;
  };
  updated_at?: number;
  updated_iso?: string;
  notes?: string[];
}

export const DEFAULT_IDLE: TelemetryPayload = {
  source: 'unavailable',
  state: 'IDLE',
  stage: 'Telemetry unavailable',
  progress_current: 0,
  progress_target: 0,
  percent_complete: 0.0,
  current_cycle: 0,
  total_cycles: 0,
  active_task: 'No active training operation running',
  elapsed_seconds: 0.0,
  estimated_remaining_seconds: 0.0,
  resources: {},
  latest_metrics: {
    exact_accuracy: 0,
    macro_f1: 0,
    false_extra_rate: 0,
    missed_rate: 0,
  },
  recent_events: [],
};

class AiTelemetryService {
  private lastKnownPayload: TelemetryPayload = DEFAULT_IDLE;

  public async fetchTelemetry(): Promise<TelemetryPayload> {
    try {
      const res = await fetch('/api/ai/training-telemetry', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json() as TelemetryPayload;
        if (!data || !['LIVE','IDLE','STALE','COMPLETED','FAILED'].includes(data.state) ||
          !data.resources || !data.latest_metrics || !Array.isArray(data.recent_events)) {
          return { ...DEFAULT_IDLE };
        }
        data.source = 'connected';
        // Check client-side staleness if timestamp is older than 25 seconds
        if (data.state === 'LIVE' && data.updated_at) {
          const ageSecs = Date.now() / 1000 - data.updated_at;
          if (ageSecs > 25.0) {
            data.state = 'STALE';
          }
        }
        this.lastKnownPayload = data;
        return data;
      }
    } catch {
      // In tests or offline environments where mock fetch isn't wired, return last known
    }
    return { ...this.lastKnownPayload, source: 'unavailable', state: 'STALE' };
  }

  public subscribe(
    callback: (data: TelemetryPayload) => void,
    intervalMs = 5000
  ): () => void {
    let timerId: any = null;
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Pause polling when tab is inactive to save battery/cycles
      }
      const data = await this.fetchTelemetry();
      callback(data);
    };

    // Initial immediate fetch
    poll();

    timerId = setInterval(poll, intervalMs);

    // Visibility change listener: resume immediately on tab focus
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        poll();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      isActive = false;
      if (timerId) clearInterval(timerId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }

  public async startDiagnosticTraining(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/ai/training-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_diagnostic' }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to trigger training' };
    }
    return { success: false, message: 'Server returned error' };
  }

  public async stopTraining(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/ai/training-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to stop training' };
    }
    return { success: false, message: 'Server returned error' };
  }
}

export const aiTelemetryService = new AiTelemetryService();
