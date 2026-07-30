import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { agents } from '@/data';
import type { Agent, ToolKind } from '@/data';

const Q_KEY = 'q';
const MODEL_KEY = 'model';
const CAP_KEY = 'cap';
const EDIT_KEY = 'edit';

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export interface AgentFiltersState {
  query: string;
  models: string[];
  capabilities: ToolKind[];
  canEditFiles: boolean | null;
}

export interface UseAgentFiltersResult {
  state: AgentFiltersState;
  results: Agent[];
  totalCount: number;
  resultCount: number;
  availableModels: string[];
  availableCapabilities: ToolKind[];
  setQuery: (q: string) => void;
  toggleModel: (model: string) => void;
  toggleCapability: (cap: ToolKind) => void;
  setCanEditFiles: (value: boolean | null) => void;
  clearAll: () => void;
}

/**
 * Search + filter over the agent directory with filter state mirrored into
 * the URL query string, so a filtered view is linkable and back/forward
 * navigates through filter changes. Works identically whether `agents` has
 * 8 entries or 50 — nothing here assumes the fixed 8-agent order.
 */
export function useAgentFilters(): UseAgentFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const state: AgentFiltersState = useMemo(() => {
    const editParam = searchParams.get(EDIT_KEY);
    return {
      query: searchParams.get(Q_KEY) ?? '',
      models: parseList(searchParams.get(MODEL_KEY)),
      capabilities: parseList(searchParams.get(CAP_KEY)) as ToolKind[],
      canEditFiles: editParam === 'true' ? true : editParam === 'false' ? false : null,
    };
  }, [searchParams]);

  const availableModels = useMemo(
    () => Array.from(new Set(agents.map((a) => a.model))).sort(),
    [],
  );
  const availableCapabilities = useMemo(
    () => Array.from(new Set(agents.flatMap((a) => a.capabilities))).sort() as ToolKind[],
    [],
  );

  const results = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    return agents.filter((agent) => {
      if (q) {
        const haystack =
          `${agent.name} ${agent.title} ${agent.description} ${agent.summary}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (state.models.length > 0 && !state.models.includes(agent.model)) return false;
      if (
        state.capabilities.length > 0 &&
        !state.capabilities.every((cap) => agent.capabilities.includes(cap))
      ) {
        return false;
      }
      if (state.canEditFiles !== null && agent.canEditFiles !== state.canEditFiles) return false;
      return true;
    });
  }, [state]);

  const update = useCallback(
    (patch: Partial<Record<string, string | null>>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            // `== null` catches undefined too: Partial<Record<…>> makes every
            // value optional, so a key present with an undefined value must
            // clear the param rather than be written as the string "undefined".
            if (value == null || value === '') {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setQuery = useCallback((q: string) => update({ [Q_KEY]: q || null }), [update]);

  const toggleModel = useCallback(
    (model: string) => {
      const next = state.models.includes(model)
        ? state.models.filter((m) => m !== model)
        : [...state.models, model];
      update({ [MODEL_KEY]: next.length > 0 ? next.join(',') : null });
    },
    [state.models, update],
  );

  const toggleCapability = useCallback(
    (cap: ToolKind) => {
      const next = state.capabilities.includes(cap)
        ? state.capabilities.filter((c) => c !== cap)
        : [...state.capabilities, cap];
      update({ [CAP_KEY]: next.length > 0 ? next.join(',') : null });
    },
    [state.capabilities, update],
  );

  const setCanEditFiles = useCallback(
    (value: boolean | null) => update({ [EDIT_KEY]: value === null ? null : String(value) }),
    [update],
  );

  const clearAll = useCallback(
    () => update({ [Q_KEY]: null, [MODEL_KEY]: null, [CAP_KEY]: null, [EDIT_KEY]: null }),
    [update],
  );

  return {
    state,
    results,
    totalCount: agents.length,
    resultCount: results.length,
    availableModels,
    availableCapabilities,
    setQuery,
    toggleModel,
    toggleCapability,
    setCanEditFiles,
    clearAll,
  };
}
