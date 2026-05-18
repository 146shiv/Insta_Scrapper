import React from 'react';

export default function Spinner({ size = 'md', label = 'Loading...' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div
        className={`${sizes[size]} rounded-full border-slate-700 border-t-violet-500 animate-spin`}
      />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
