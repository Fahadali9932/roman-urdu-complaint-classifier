/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function aiTelemetryBridgePlugin() {
  let activeProcess: any = null;
  return {
    name: 'ai-telemetry-bridge-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/ai/training-telemetry' && req.method === 'GET') {
          const telemetryPath = path.resolve(process.cwd(), 'data/v11/training_telemetry/active_status.json');
          if (fs.existsSync(telemetryPath)) {
            try {
              const raw = fs.readFileSync(telemetryPath, 'utf-8');
              const data = JSON.parse(raw);
              const now = Date.now() / 1000;
              if (data.state === 'LIVE' && (now - (data.updated_at || 0)) > 25.0) {
                data.state = 'STALE';
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return;
            } catch (err) {}
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              state: 'IDLE',
              stage: 'Standby',
              progress_current: 0,
              progress_target: 0,
              percent_complete: 0,
              active_task: 'No active training task',
              elapsed_seconds: 0,
              estimated_remaining_seconds: 0,
              resources: {},
              latest_metrics: {},
              recent_events: [],
            })
          );
          return;
        }

        if (req.url === '/api/ai/training-control' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              if (parsed.action === 'start_diagnostic') {
                if (activeProcess && !activeProcess.killed) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, message: 'Diagnostic process already running.' }));
                  return;
                }
                const scriptPath = path.resolve(process.cwd(), 'tools/ai_factory/slow_diagnostic_telemetry_runner.py');
                activeProcess = spawn('python', [scriptPath], { stdio: 'inherit', detached: false });
                activeProcess.on('exit', () => {
                  activeProcess = null;
                });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Diagnostic simulation started.' }));
                return;
              } else if (parsed.action === 'stop') {
                if (activeProcess) {
                  activeProcess.kill();
                  activeProcess = null;
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Training process halted.' }));
                return;
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    aiTelemetryBridgePlugin(),
  ],
  server: {
    headers: {
      'Permissions-Policy': 'display-capture=(self), geolocation=(self)',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
