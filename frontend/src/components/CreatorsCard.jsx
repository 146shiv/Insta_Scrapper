import React, { useState, useEffect } from 'react';
import { getTopCreators } from '../services/api';
import Spinner from './Spinner';

function PriorityBadge({ priority }) {
  const styles = {
    high: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    low: 'bg-slate-600/30 text-slate-500 border border-slate-600/40',
  };
  return (
    <span className={`badge text-xs ${styles[priority] || styles.low}`}>
      {priority}
    </span>
  );
}

function CreatorTypeBadge({ type }) {
  const styles = {
    student: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    educational: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    micro_influencer: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
    general: 'bg-slate-600/30 text-slate-500 border border-slate-600/40',
    unknown: 'bg-slate-700/30 text-slate-600 border border-slate-700/40',
  };
  const labels = {
    student: '🎓 Student',
    educational: '📚 Educational',
    micro_influencer: '⚡ Micro',
    general: '👤 General',
    unknown: '❓ Unknown',
  };
  return (
    <span className={`badge text-xs ${styles[type] || styles.unknown}`}>
      {labels[type] || type}
    </span>
  );
}

export default function CreatorsCard({ refreshKey = 0 }) {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchCreators = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTopCreators({ limit: 20 });
      setCreators(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, [refreshKey]);

  return (
    <div className="card animate-fade-in" id="creators-card">
      <div className="section-header">
        <h2 className="section-title">
          <span>👤</span> Top Creators
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{total} total</span>
          <button
            id="creators-refresh-btn"
            onClick={fetchCreators}
            className="btn-secondary py-1.5 text-xs"
            disabled={loading}
          >
            ↻ Refresh
          </button>
          <a
            href="/api/creators/export"
            target="_blank"
            rel="noopener noreferrer"
            id="creators-export-btn"
            className="btn-secondary py-1.5 text-xs"
          >
            📁 Export CSV
          </a>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading creators..." />
      ) : error ? (
        <p className="text-red-400 text-sm py-4 text-center">{error}</p>
      ) : creators.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-slate-500 text-sm">No creators found yet.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Creator</th>
                <th>Type</th>
                <th>Followers</th>
                <th>Avg Score</th>
                <th>Posts</th>
                <th>Priority</th>
                <th>Profile</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c._id || c.ownerUsername}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {(c.ownerUsername || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">@{c.ownerUsername}</p>
                        {c.fullName && (
                          <p className="text-slate-600 text-[10px]">{c.fullName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <CreatorTypeBadge type={c.creatorType} />
                  </td>
                  <td className="text-xs text-slate-400">
                    {(c.followersCount || 0).toLocaleString()}
                    {c.isMicroCreator && (
                      <span className="ml-1 text-amber-500">★</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`text-sm font-bold ${
                        c.averageContentScore >= 40
                          ? 'text-emerald-400'
                          : c.averageContentScore >= 20
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {(c.averageContentScore || 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400">
                    {c.totalPostsFound || 0}
                  </td>
                  <td>
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td>
                    <a
                      href={c.profileUrl || `https://www.instagram.com/${c.ownerUsername}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`creator-link-${c.ownerUsername}`}
                      className="btn-secondary py-1 px-2.5 text-[11px]"
                    >
                      IG ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
