import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export default function useCFBTeamColors() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/cfb_teams', { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`);
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchTeams]);

  const teamColors = useMemo(() => {
    const map = {};
    for (const t of teams) {
      const key = t.team || t.team_name || t.name || t.abbr || t.key;
      if (!key) continue;
      map[key] = {
        logo: t.logo || t.team_logo || t.home_logo || null,
        primaryColor: t.primary_color || t.primaryColor || null,
        secondaryColor: t.secondary_color || t.secondaryColor || null,
      };
    }
    return map;
  }, [teams]);

  const refresh = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    return fetchTeams();
  }, [fetchTeams]);

  return { teamColors, loading, error, refresh };
}