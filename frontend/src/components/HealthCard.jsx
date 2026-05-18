import React, { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';
import StatusBadge from './StatusBadge';

export default function HealthCard() {
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState('loading');
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setStatus('loading');
    try {
      const data = await checkHealth();
      setHealth(data);
      setStatus('ok');
    } catch {
      setHealth(null);
      setStatus('error');
    }
    setLastChecked(new Date());
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="card animate-fade-in" id="health-card">
      <div className="section-header">
        <h2 className="section-title">
          <span>🔌</span> Backend Health
        </h2>
        <button
          id="health-refresh-btn"
          onClick={fetchHealth}
          className="btn-secondary py-1.5 text-xs"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            status === 'ok'
              ? 'bg-emerald-500/15'
              : status === 'error'
              ? 'bg-red-500/15'
              : 'bg-blue-500/15'
          }`}
        >
          {status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge
              status={status}
              label={
                status === 'ok' ? 'Online' : status === 'error' ? 'Offline' : 'Checking...'
              }
            />
          </div>

          {health ? (
            <div className="space-y-1 text-sm">
              <p className="text-slate-300 font-medium">{health.service}</p>
              <p className="text-slate-500 text-xs">
                Environment:{' '}
                <span className="text-slate-400">{health.environment}</span>
              </p>
              <p className="text-slate-500 text-xs">
                Version: <span className="text-slate-400">{health.version}</span>
              </p>
            </div>
          ) : (
            <p className="text-red-400 text-sm mt-1">
              Cannot reach backend. Make sure the server is running on port 3000.
            </p>
          )}

          {lastChecked && (
            <p className="text-slate-600 text-xs mt-2">
              Checked at: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
