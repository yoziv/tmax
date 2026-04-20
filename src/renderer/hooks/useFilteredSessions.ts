import { useMemo } from 'react';
import type { CopilotSessionSummary, SessionLifecycle } from '../../shared/copilot-types';

// ── Types ────────────────────────────────────────────────────────────

export type GroupByOption = 'none' | 'repository';

export interface SessionGroup {
  key: string;
  label: string;
  sessions: CopilotSessionSummary[];
  hasActiveSessions: boolean;
}

export interface GroupedResult {
  kind: 'grouped';
  groups: SessionGroup[];
  totalCount: number;
}

export interface FlatResult {
  kind: 'flat';
  sessions: CopilotSessionSummary[];
}

export type FilteredSessionsResult = GroupedResult | FlatResult;

// ── Helpers ──────────────────────────────────────────────────────────

function sortSessions(
  sessions: CopilotSessionSummary[],
  openSessionIds: Set<string>,
): CopilotSessionSummary[] {
  return [...sessions].sort((a, b) => {
    const aOpen = openSessionIds.has(a.id) ? 1 : 0;
    const bOpen = openSessionIds.has(b.id) ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    return (b.lastActivityTime || 0) - (a.lastActivityTime || 0);
  });
}

function getGroupKey(session: CopilotSessionSummary, groupBy: GroupByOption): string {
  if (groupBy === 'repository') return session.repository || '';
  return '';
}

function getGroupLabel(key: string, _groupBy: GroupByOption): string {
  if (!key) return 'Ungrouped';
  // "InbarR/tmax" → "tmax", "msazure/One/Sec4AI" → "Sec4AI"
  const parts = key.split('/');
  return parts[parts.length - 1] || key;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useFilteredSessions(
  copilotSessions: CopilotSessionSummary[],
  claudeCodeSessions: CopilotSessionSummary[],
  options: {
    filterTab: 'all' | 'copilot' | 'claude-code';
    lifecycleTab: 'active' | 'completed' | 'old';
    showRunningOnly: boolean;
    groupBy: GroupByOption;
    summaryOverrides: Record<string, string>;
    getSessionLifecycle: (s: CopilotSessionSummary) => SessionLifecycle;
    openSessionIds: Set<string>;
  },
): FilteredSessionsResult {
  const {
    filterTab, lifecycleTab, showRunningOnly, groupBy,
    summaryOverrides, getSessionLifecycle, openSessionIds,
  } = options;

  return useMemo(() => {
    // 1. Merge and apply name overrides
    let all = [
      ...copilotSessions.filter(s => s.messageCount > 0)
        .map(s => ({ ...s, provider: s.provider || 'copilot' as const })),
      ...claudeCodeSessions.filter(s => s.messageCount > 0)
        .map(s => ({ ...s, provider: s.provider || 'claude-code' as const })),
    ].map(s => summaryOverrides[s.id] ? { ...s, summary: summaryOverrides[s.id] } : s);

    // 2. Filter by provider
    if (filterTab !== 'all') {
      all = all.filter(s => s.provider === filterTab);
    }

    // 3. Filter by running only
    if (showRunningOnly) {
      all = all.filter(s => s.status !== 'idle');
    }

    // 4. Deduplicate by session ID
    const byId = new Map<string, CopilotSessionSummary>();
    for (const s of all) {
      const existing = byId.get(s.id);
      if (!existing || (s.lastActivityTime || 0) > (existing.lastActivityTime || 0)) {
        byId.set(s.id, s);
      }
    }

    // 5. Filter by lifecycle
    const deduped = Array.from(byId.values())
      .filter(s => getSessionLifecycle(s) === lifecycleTab);

    // 6. Flat list if no grouping
    if (groupBy === 'none') {
      return {
        kind: 'flat' as const,
        sessions: sortSessions(deduped, openSessionIds),
      };
    }

    // 7. Build groups
    const groupMap = new Map<string, CopilotSessionSummary[]>();
    for (const s of deduped) {
      const key = getGroupKey(s, groupBy);
      const arr = groupMap.get(key);
      if (arr) arr.push(s);
      else groupMap.set(key, [s]);
    }

    const groups: SessionGroup[] = Array.from(groupMap.entries()).map(
      ([key, sessions]) => ({
        key,
        label: getGroupLabel(key, groupBy),
        sessions: sortSessions(sessions, openSessionIds),
        hasActiveSessions: sessions.some(s => s.status !== 'idle'),
      }),
    );

    // Sort groups: active first, then alphabetically, "Ungrouped" last
    groups.sort((a, b) => {
      if (!a.key && b.key) return 1;
      if (a.key && !b.key) return -1;
      if (a.hasActiveSessions !== b.hasActiveSessions) {
        return a.hasActiveSessions ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });

    return {
      kind: 'grouped' as const,
      groups,
      totalCount: deduped.length,
    };
  }, [
    copilotSessions, claudeCodeSessions, filterTab, lifecycleTab,
    showRunningOnly, groupBy, summaryOverrides, getSessionLifecycle,
    openSessionIds,
  ]);
}
