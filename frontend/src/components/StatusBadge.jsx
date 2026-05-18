import React from 'react';

/**
 * Displays a coloured status indicator dot + label.
 * @param {'ok'|'error'|'warning'|'loading'} status
 */
export default function StatusBadge({ status, label }) {
  const styles = {
    ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    error: 'bg-red-500/20 text-red-400 border-red-500/40',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    loading: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  };

  const dotStyles = {
    ok: 'bg-emerald-400',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    loading: 'bg-blue-400 animate-pulse',
  };

  const s = styles[status] || styles.loading;
  const d = dotStyles[status] || dotStyles.loading;

  return (
    <span className={`badge border ${s} gap-1.5 font-medium`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${d}`} />
      {label || status}
    </span>
  );
}
