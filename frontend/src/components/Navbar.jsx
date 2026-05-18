import React from 'react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/60 backdrop-blur-xl bg-dark-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg">
            📊
          </div>
          <div>
            <span className="font-bold text-white text-base">Studybo</span>
            <span className="text-slate-500 text-sm ml-1.5">Intelligence</span>
          </div>
          <span className="hidden sm:inline-flex badge bg-violet-500/15 text-violet-400 border border-violet-500/30 text-xs ml-2">
            Internal Tool
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="hidden sm:inline">📸 Instagram Marketing Intelligence</span>
          <a
            href="http://localhost:3000/health"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary py-1.5 text-xs"
            id="nav-api-docs-link"
          >
            API ↗
          </a>
        </div>
      </div>
    </nav>
  );
}
