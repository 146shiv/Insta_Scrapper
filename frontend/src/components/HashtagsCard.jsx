import React, { useState, useEffect } from 'react';
import { getTrendingHashtags } from '../services/api';
import Spinner from './Spinner';

export default function HashtagsCard({ refreshKey = 0 }) {
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHashtags = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrendingHashtags({ limit: 15 });
      setHashtags(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHashtags();
  }, [refreshKey]);

  // Get the max trend score for relative bar width
  const maxScore = hashtags.length > 0 ? Math.max(...hashtags.map((h) => h.trendScore || 0), 1) : 1;

  return (
    <div className="card animate-fade-in" id="hashtags-card">
      <div className="section-header">
        <h2 className="section-title">
          <span>#</span> Trending Hashtags
        </h2>
        <button
          id="hashtags-refresh-btn"
          onClick={fetchHashtags}
          className="btn-secondary py-1.5 text-xs"
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <Spinner label="Loading hashtags..." />
      ) : error ? (
        <p className="text-red-400 text-sm py-4 text-center">{error}</p>
      ) : hashtags.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🏷️</p>
          <p className="text-slate-500 text-sm">No hashtag data yet.</p>
          <p className="text-slate-600 text-xs mt-1">Run a scrape to populate trend data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hashtags.map((h, i) => {
            const barWidth = maxScore > 0 ? Math.round((h.trendScore / maxScore) * 100) : 0;
            const isGrowing = h.engagementGrowth > 0;

            return (
              <div
                key={h.hashtag}
                id={`hashtag-row-${h.hashtag}`}
                className="group relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                    <a
                      href={`https://www.instagram.com/explore/tags/${h.hashtag}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 font-semibold text-sm transition-colors"
                    >
                      #{h.hashtag}
                    </a>
                    {isGrowing && (
                      <span className="text-emerald-400 text-xs">▲ {h.engagementGrowth?.toFixed(1)}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span title="Trend Score" className="font-bold text-slate-300">
                      {h.trendScore || 0}
                    </span>
                    <span title="Total posts scraped">
                      📸 {(h.totalPostsScraped || 0).toLocaleString()}
                    </span>
                    <span title="Avg content score">
                      ⭐ {(h.avgContentScore || 0).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Trend bar */}
                <div className="h-1 bg-dark-950 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${barWidth}%`,
                      background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                    }}
                  />
                </div>

                {/* Trending hooks */}
                {h.trendingHooks && h.trendingHooks.length > 0 && (
                  <div className="mt-1 hidden group-hover:flex flex-wrap gap-1">
                    {h.trendingHooks.slice(0, 2).map((hook, j) => (
                      <span
                        key={j}
                        className="text-[10px] text-slate-600 bg-slate-800/60 rounded px-1.5 py-0.5 truncate max-w-xs"
                      >
                        "{hook}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
