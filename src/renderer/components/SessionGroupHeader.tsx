import React from 'react';

interface Props {
  label: string;
  count: number;
  collapsed: boolean;
  hasActiveSessions: boolean;
  onToggle: () => void;
}

export const SessionGroupHeader: React.FC<Props> = ({
  label, count, collapsed, hasActiveSessions, onToggle,
}) => (
  <div
    className={`ai-group-header${hasActiveSessions ? ' has-active' : ''}`}
    onClick={onToggle}
    role="button"
    tabIndex={0}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
  >
    <span className="ai-group-chevron">{collapsed ? '▶' : '▼'}</span>
    <span className="ai-group-label">{label}</span>
    <span className="ai-group-count">({count})</span>
  </div>
);
