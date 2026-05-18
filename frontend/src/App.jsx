import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HealthCard from './components/HealthCard';
import ScrapeCard from './components/ScrapeCard';
import PostsSection from './components/PostsSection';
import CreatorsCard from './components/CreatorsCard';
import HashtagsCard from './components/HashtagsCard';

export default function App() {
  /**
   * refreshKey increments every time a scrape completes.
   * All data cards watch this as a useEffect dependency
   * and automatically re-fetch their data.
   */
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScrapeComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text mb-1">
            Instagram Intelligence Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            Discover trending student content, analyze creators, and plan outreach — all in one place.
          </p>
        </div>

        {/* ── Row 1: Health + Scrape ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <HealthCard />
          </div>
          <div className="lg:col-span-3">
            {/* onScrapeComplete triggers a refresh of all data cards */}
            <ScrapeCard onScrapeComplete={handleScrapeComplete} />
          </div>
        </div>

        {/* ── Row 2: Posts (full width) ──────────────────────────── */}
        <PostsSection refreshKey={refreshKey} />

        {/* ── Row 3: Creators + Hashtags ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CreatorsCard refreshKey={refreshKey} />
          </div>
          <div className="lg:col-span-1">
            <HashtagsCard refreshKey={refreshKey} />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-700 text-xs py-4 border-t border-slate-800/50">
          <p>
            Studybo Intelligence v1.0 · Internal Tool Only · Built for manual marketing research
          </p>
          <p className="mt-0.5">
            ⚠️ This system does not automate any Instagram engagement. Always comply with Instagram ToS.
          </p>
        </footer>
      </main>
    </div>
  );
}
