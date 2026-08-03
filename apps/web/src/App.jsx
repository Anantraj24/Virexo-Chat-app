import { useState, useEffect, useCallback } from 'react';
import { APP_NAME, APP_VERSION } from '@virexo/shared';
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Server, Globe, Cpu, Layers } from 'lucide-react';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to Virexo API');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-2xl bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl">
              V
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">{APP_NAME} Platform</h1>
              <p className="text-xs text-zinc-400">Monorepo Foundation • v{APP_VERSION}</p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 rounded-lg border border-zinc-700 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-check</span>
          </button>
        </div>

        {/* Health Status Banner */}
        <div className="mb-6">
          {loading ? (
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-zinc-800/50 border border-zinc-800 text-zinc-400">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
              <span className="text-sm font-medium">Checking API service health...</span>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <div>
                <h2 className="text-sm font-semibold">API Connection Offline</h2>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <div>
                  <h2 className="text-sm font-semibold">All Systems Operational</h2>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    Express API service responding healthy
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                Healthy
              </span>
            </div>
          )}
        </div>

        {/* Monorepo Grid Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Frontend App */}
          <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-medium text-zinc-400">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Frontend Client</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                apps/web
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-200">React 19 + Vite</div>
            <div className="text-xs text-zinc-500 mt-1">Listening on port 5173</div>
          </div>

          {/* Backend API */}
          <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-medium text-zinc-400">
                <Server className="w-4 h-4 text-blue-400" />
                <span>Backend API</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                apps/api
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-200">Express ES Modules</div>
            <div className="text-xs text-zinc-500 mt-1">Listening on port 5000</div>
          </div>

          {/* Shared Package */}
          <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-medium text-zinc-400">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Shared Package</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                packages/shared
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-200">@virexo/shared</div>
            <div className="text-xs text-zinc-500 mt-1">Shared types & constants</div>
          </div>

          {/* System Uptime */}
          <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-medium text-zinc-400">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>API Uptime</span>
              </div>
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="text-sm font-semibold text-zinc-200">
              {healthData?.data?.uptime ? `${Math.round(healthData.data.uptime)}s` : 'N/A'}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Process runtime</div>
          </div>
        </div>

        {/* API Response JSON Box */}
        {healthData && (
          <div className="rounded-xl bg-zinc-950 border border-zinc-800/80 p-4">
            <div className="text-xs font-mono text-zinc-400 mb-2 flex items-center justify-between">
              <span>GET /health Payload</span>
              <span className="text-[10px] text-zinc-500">{healthData.timestamp}</span>
            </div>
            <pre className="text-xs font-mono text-emerald-400/90 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-500">
          Virexo Production Workspaces Monorepo • Powered by React 19 & Express
        </div>
      </main>
    </div>
  );
}
