import React, { useState, useEffect, useCallback } from 'react';
import { getTopPosts, getReels, getCarousels } from '../services/api';
import Spinner from './Spinner';

const TABS = [
  { id: 'top', label: '🏆 Top Posts', fetcher: getTopPosts },
  { id: 'reels', label: '🎬 Reels', fetcher: getReels },
  { id: 'carousels', label: '🎠 Carousels', fetcher: getCarousels },
];

function ScoreBadge({ score }) {
  const cls =
    score >= 40
      ? 'score-high'
      : score >= 20
      ? 'score-medium'
      : 'score-low';
  return (
    <span className={`badge text-xs font-bold ${cls}`}>
      {score}
    </span>
  );
}

function TypeBadge({ isReel, isCarousel }) {
  if (isReel)
    return (
      <span className="badge bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs">
        🎬 Reel
      </span>
    );
  if (isCarousel)
    return (
      <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
        🎠 Carousel
      </span>
    );
  return (
    <span className="badge bg-slate-600/40 text-slate-400 text-xs">📷 Image</span>
  );
}

function PostRow({ post }) {
  const caption = (post.caption || '').slice(0, 100);
  const hasMore = (post.caption || '').length > 100;

  return (
    <tr>
      {/* Creator */}
      <td>
        <a
          href={`https://www.instagram.com/${post.ownerUsername}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 font-medium text-xs transition-colors"
        >
          @{post.ownerUsername}
        </a>
        {post.isMicroCreator && (
          <span className="ml-1 badge bg-amber-500/15 text-amber-400 border border-amber-500/25 text-[10px]">
            micro
          </span>
        )}
      </td>
      {/* Score */}
      <td>
        <ScoreBadge score={post.contentScore} />
      </td>
      {/* Type */}
      <td>
        <TypeBadge isReel={post.isReel} isCarousel={post.isCarousel} />
      </td>
      {/* Caption */}
      <td className="max-w-xs">
        <p className="text-slate-400 text-xs leading-relaxed">
          {caption}
          {hasMore && <span className="text-slate-600">…</span>}
        </p>
      </td>
      {/* Stats */}
      <td>
        <div className="text-xs text-slate-500 space-y-0.5">
          <div>❤️ {(post.likesCount || 0).toLocaleString()}</div>
          <div>💬 {(post.commentsCount || 0).toLocaleString()}</div>
        </div>
      </td>
      {/* Link */}
      <td>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          id={`post-link-${post.shortCode}`}
          className="btn-secondary py-1 px-2.5 text-[11px]"
        >
          View ↗
        </a>
      </td>
    </tr>
  );
}

export default function PostsSection({ refreshKey = 0 }) {
  const [activeTab, setActiveTab] = useState('top');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const fetchPosts = useCallback(async (tab = activeTab, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const tabConfig = TABS.find((t) => t.id === tab);
      const data = await tabConfig.fetcher({ limit: 15, page });
      setPosts(data.data || []);
      setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      setError(err.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPosts(activeTab, 1);
  }, [activeTab, refreshKey]);

  return (
    <div className="card animate-fade-in" id="posts-section">
      <div className="section-header">
        <h2 className="section-title">
          <span>📋</span> Posts
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {pagination.total.toLocaleString()} total
          </span>
          <button
            id="posts-refresh-btn"
            onClick={() => fetchPosts(activeTab, 1)}
            className="btn-secondary py-1.5 text-xs"
            disabled={loading}
          >
            ↻ Refresh
          </button>
          <a
            href="/api/posts/export"
            target="_blank"
            rel="noopener noreferrer"
            id="posts-export-btn"
            className="btn-secondary py-1.5 text-xs"
          >
            📁 Export CSV
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-dark-950 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <Spinner label="Loading posts..." />
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-slate-600 text-xs mt-1">
            Make sure the backend is running and data has been scraped.
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-slate-500 text-sm">No posts found.</p>
          <p className="text-slate-600 text-xs mt-1">
            Trigger a scrape above to populate data.
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Score</th>
                  <th>Type</th>
                  <th>Caption</th>
                  <th>Engagement</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <PostRow key={post._id || post.shortCode} post={post} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchPosts(activeTab, pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="btn-secondary py-1 px-3 text-xs"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => fetchPosts(activeTab, pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || loading}
                  className="btn-secondary py-1 px-3 text-xs"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
