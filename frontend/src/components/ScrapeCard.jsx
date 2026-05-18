import React, { useState } from 'react';
import { triggerScrape } from '../services/api';
import StatusBadge from './StatusBadge';

const DEFAULT_HASHTAGS = [
  'studygram', 'studywithme', 'neetprep', 'jee2026',
  'upsc', 'productivity', 'deepwork', 'notetaking',
];

export default function ScrapeCard({ onScrapeComplete }) {
  const [hashtagInput, setHashtagInput] = useState(DEFAULT_HASHTAGS.join(', '));
  const [resultsType, setResultsType] = useState('posts');
  const [resultsLimit, setResultsLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    const hashtags = hashtagInput
      .split(',')
      .map((h) => h.trim().replace(/^#/, '').toLowerCase())
      .filter(Boolean);

    if (hashtags.length === 0) {
      setError('Please enter at least one hashtag');
      setLoading(false);
      return;
    }

    try {
      const data = await triggerScrape(hashtags, { resultsType, resultsLimit });
      setResult(data);
      // Notify App.jsx to refresh all data cards
      if (onScrapeComplete) onScrapeComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in" id="scrape-card">
      <div className="section-header">
        <h2 className="section-title">
          <span>🔍</span> Trigger Scrape
        </h2>
        {loading && <StatusBadge status="loading" label="Scraping..." />}
        {result && !loading && <StatusBadge status="ok" label="Complete" />}
        {error && !loading && <StatusBadge status="error" label="Failed" />}
      </div>

      <div className="space-y-4">
        {/* Hashtag input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="hashtag-input">
            Hashtags <span className="text-slate-600">(comma-separated)</span>
          </label>
          <textarea
            id="hashtag-input"
            className="input-field h-20 resize-none font-mono text-xs"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            placeholder="studygram, studywithme, neetprep..."
            disabled={loading}
          />
        </div>

        {/* Options row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="results-type">
              Content Type
            </label>
            <select
              id="results-type"
              className="input-field"
              value={resultsType}
              onChange={(e) => setResultsType(e.target.value)}
              disabled={loading}
            >
              <option value="posts">Posts</option>
              <option value="reels">Reels</option>
              <option value="stories">Stories</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="results-limit">
              Results per Hashtag
            </label>
            <input
              id="results-limit"
              type="number"
              className="input-field"
              value={resultsLimit}
              onChange={(e) => setResultsLimit(Number(e.target.value))}
              min={10}
              max={200}
              disabled={loading}
            />
          </div>
        </div>

        {/* Trigger button */}
        <button
          id="scrape-trigger-btn"
          onClick={handleScrape}
          disabled={loading}
          className="btn-primary w-full justify-center"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running Pipeline... (this may take a few minutes)
            </>
          ) : (
            '🚀 Run Scraping Pipeline'
          )}
        </button>

        {/* Loading notice */}
        {loading && (
          <p className="text-xs text-slate-500 text-center">
            ⏳ Scraping takes 2–5 minutes. The page will update when complete.
          </p>
        )}

        {/* Result summary */}
        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 animate-slide-up">
            <p className="text-emerald-400 font-semibold text-sm mb-3">✅ Pipeline Complete</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Raw Fetched', value: result.data?.rawFetched ?? '-' },
                { label: 'New Saved', value: result.data?.newRawSaved ?? '-' },
                { label: 'Duplicates Skipped', value: result.data?.duplicatesSkipped ?? '-' },
                { label: 'Posts Filtered', value: result.data?.filtered ?? '-' },
                { label: 'Posts Ranked', value: result.data?.ranked ?? '-' },
                { label: 'Posts Saved', value: result.data?.saved ?? '-' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-dark-900 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-slide-up">
            <p className="text-red-400 font-semibold text-sm mb-1">❌ Scrape Failed</p>
            <p className="text-red-300/70 text-xs font-mono">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
