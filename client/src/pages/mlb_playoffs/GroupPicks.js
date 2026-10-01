import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NAVY = "#13447a";
const GOLD = "#c89d3c";
const LIVE_RED = "#D50A0A";

const PULSE_STYLE = {
  width: "6px",
  height: "6px",
  backgroundColor: "#22c55e",
  borderRadius: "50%",
  display: "inline-block",
  boxShadow: "0 0 0 rgba(34, 197, 94, 0.4)",
  animation: "pulse 2s infinite"
};

export default function GroupPicks() {
  const [series, setSeries] = useState([]);
  const [picks, setPicks] = useState([]);
  const [standings, setStandings] = useState([]);
  const [tiebreakers, setTiebreakers] = useState([]);
  const [sortBy, setSortBy] = useState("overall"); // "overall" or "round"
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [seriesRes, picksRes, standingsRes, tbRes] = await Promise.all([
          axios.get("/api/mlb/series"),
          axios.get("/api/mlb/picks/all"),
          axios.get("/api/mlb/standings"),
          axios.get("/api/mlb/tiebreaker/all"),
        ]);

        const now = new Date();

        const sortedSeries = (seriesRes.data || [])
          .filter(s => s.home_team && s.away_team)
          .filter(s => {
            const isLocked = s.locked;
            const status = (s.status || "").toUpperCase();
            const isStartedOrFinished = status === "STATUS_IN_PROGRESS" || status === "IN_PROGRESS" || status === "STATUS_FINAL" || status === "FINAL";
            const hasDatePassed = s.game_date && new Date(s.game_date) <= now;
            
            // Only include series where Game 1 has started/locked/progressed/finished
            return isLocked || isStartedOrFinished || hasDatePassed;
          })
          .sort((b, a) => a.round - b.round || new Date(a.game_date) - new Date(b.game_date));

        setSeries(sortedSeries);
        setPicks(picksRes.data);
        setStandings(standingsRes.data || []);
        setTiebreakers(tbRes.data || []);
      } catch (err) {
        console.error("Group picks load failed", err);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const pickMap = useMemo(() => {
    const map = {};
    picks.forEach(p => {
      if (!map[p.series_id]) map[p.series_id] = {};
      map[p.series_id][p.entry_name] = p;
    });
    return map;
  }, [picks]);

  // Calculate round-specific points per player if sorting by round
  const sortedStandings = useMemo(() => {
    const standingsList = standings.map(st => {
      let roundPoints = 0;
      // Calculate points earned from currently visible/finalized series in the matrix
      series.forEach(s => {
        const p = pickMap[s.id]?.[st.entry_name];
        if (p && s.status === "STATUS_FINAL" && p.pick === s.winner) {
          const base = parseInt(p.confidence) || 0;
          const bonus = (p.series_length_guess === s.series_length) ? base : 0;
          roundPoints += (base + bonus);
        }
      });
      return {
        ...st,
        totalPoints: Number(st.points) || 0,
        roundPoints
      };
    });

    standingsList.sort((a, b) => {
      if (sortBy === "round") {
        return b.roundPoints - a.roundPoints || b.totalPoints - a.totalPoints || a.entry_name.localeCompare(b.entry_name);
      } else {
        return b.totalPoints - a.totalPoints || b.roundPoints - a.roundPoints || a.entry_name.localeCompare(b.entry_name);
      }
    });

    return standingsList;
  }, [standings, series, pickMap, sortBy]);

  const getCellStyle = (s, pick) => {
    if (!pick || s.status !== "STATUS_FINAL") return { backgroundColor: "transparent" };
    const correctWinner = pick.pick === s.winner;
    if (correctWinner) {
      return pick.series_length_guess === s.series_length
        ? { backgroundColor: "#93ffb3", color: "#854d0e" } // Perfect match highlight
        : { backgroundColor: "#f0fdf4", color: "#166534" }; // Correct winner highlight
    }
    return { backgroundColor: "#fef2f2", color: "#991b1b" }; // Incorrect pick highlight
  };

  if (authLoading) return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Verifying session...</div>;

  const PLAYER_COL_W = 175;
  const SERIES_COL_W = 120;

  return (
    <PoolGatekeeper user={user} gameKey="mlb" className='page-content'>
      <div style={{ width: "100%", margin: "0 auto", padding: "12px 4px", paddingBottom: 80, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <style>{`
          @keyframes pulse { 
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
            70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
          }
          .matrix-container::-webkit-scrollbar { height: 6px; }
          .matrix-container::-webkit-scrollbar-track { background: #f1f5f9; }
          .matrix-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        `}</style>

        <div style={{ textAlign: "center", marginBottom: 12, padding: "0 8px" }}>
          <h2 style={{ color: NAVY, fontSize: "20px", margin: 0, fontWeight: 800 }}>
            <span>⚾</span> Group Picks Matrix <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>⚾</span>
          </h2>
          <p style={{ color: "#64748b", marginTop: 4, fontSize: "12px" }}>Track participant selections, confidence points, and series length outcomes for active/started series.</p>
        </div>

        <div className="matrix-container" style={{
          background: "white",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0",
          maxWidth: "100%",
          overflowX: "auto",
          position: "relative"
        }}>
          {series.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
              No series have started yet. Picks will appear here once Game 1 of a series gets underway!
            </div>
          ) : (
            <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0, whiteSpace: "nowrap", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ backgroundColor: NAVY, color: "white" }}>
                  <th style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 10,
                    backgroundColor: NAVY,
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: 12,
                    width: PLAYER_COL_W,
                    minWidth: PLAYER_COL_W,
                    boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
                    verticalAlign: "middle",
                    borderBottom: `2px solid ${GOLD}`
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span>Player (Rnd / Ovr)</span>
                      <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                        <button
                          onClick={() => setSortBy("overall")}
                          style={{
                            width: "52px",
                            padding: "1px 2px",
                            borderRadius: 3,
                            border: `1px solid ${GOLD}`,
                            backgroundColor: sortBy === "overall" ? NAVY : "white",
                            color: sortBy === "overall" ? GOLD : NAVY,
                            cursor: "pointer",
                            fontWeight: 800,
                            fontSize: "10px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            transition: "all 0.2s",
                            textAlign: "center"
                          }}
                        >
                          Ovr
                        </button>
                        <button
                          onClick={() => setSortBy("round")}
                          style={{
                            width: "52px",
                            padding: "1px 2px",
                            borderRadius: 3,
                            border: `1px solid ${GOLD}`,
                            backgroundColor: sortBy === "round" ? NAVY : "white",
                            color: sortBy === "round" ? GOLD : NAVY,
                            cursor: "pointer",
                            fontWeight: 800,
                            fontSize: "10px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            transition: "all 0.2s",
                            textAlign: "center"
                          }}
                        >
                          Rnd
                        </button>
                      </div>
                    </div>
                  </th>

                  {series.map(s => {
                    const isFinal = s.status === "STATUS_FINAL";
                    const isLive = s.status === "STATUS_IN_PROGRESS";
                    const homeIsWinner = isFinal && s.winner === s.home_team;
                    const awayIsWinner = isFinal && s.winner === s.away_team;

                    const awaySecondary = s.away_secondary_color || "#cbd5e1";
                    const homeSecondary = s.home_secondary_color || "#cbd5e1";
                    const awayPrimary = s.away_color || NAVY;
                    const homePrimary = s.home_color || NAVY;

                    const getBadgeStyle = (primaryColor, secondaryColor) => ({
                      background: secondaryColor,
                      borderRadius: 4,
                      padding: "2px 4px",
                      display: "inline-flex",
                      alignItems: "center",
                      boxShadow: `0 0 4px 1px ${primaryColor}, 0 1px 2px rgba(0,0,0,0.2)`,
                      border: `2px solid ${primaryColor}`,
                      margin: "2px"
                    });

                    return (
                      <th key={s.id} style={{
                        backgroundColor: "#1a1d23",
                        color: "white",
                        padding: "8px 6px",
                        width: SERIES_COL_W,
                        minWidth: SERIES_COL_W,
                        textAlign: "center",
                        borderBottom: `2px solid ${GOLD}`,
                        borderLeft: "1px solid rgba(255,255,255,0.15)",
                        verticalAlign: "middle"
                      }}>
                        <div style={{ color: "#94a3b8", fontSize: 9, marginBottom: 4, fontWeight: 800, textTransform: "uppercase" }}>
                          {s.round_label}
                        </div>

                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "3px 2px" }}>
                          {/* Away Team */}
                          <div style={{ display: "flex", alignItems: "center", gap: 3, position: "relative" }}>
                            <span style={getBadgeStyle(awayPrimary, awaySecondary)}>
                              {s.away_logo && <img src={s.away_logo} alt="" height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
                            </span>
                            {isFinal && !awayIsWinner && (
                              <span style={{ position: "absolute", top: -4, left: 2, color: "#ef4444", fontSize: 16, fontWeight: 900, textShadow: "0px 0px 3px black", pointerEvents: "none" }}>×</span>
                            )}
                          </div>

                          <span style={{ fontSize: 10, color: "#cbd5e1" }}>@</span>

                          {/* Home Team */}
                          <div style={{ display: "flex", alignItems: "center", gap: 3, position: "relative" }}>
                            <span style={getBadgeStyle(homePrimary, homeSecondary)}>
                              {s.home_logo && <img src={s.home_logo} alt="" height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
                            </span>
                            {isFinal && !homeIsWinner && (
                              <span style={{ position: "absolute", top: -4, left: 2, color: "#ef4444", fontSize: 16, fontWeight: 900, textShadow: "0px 0px 3px black", pointerEvents: "none" }}>×</span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: 9, fontWeight: 700, margin: "3px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                          {isFinal ? (
                            <span style={{ backgroundColor: "#16a34a", color: "white", padding: "1px 6px", borderRadius: 3 }}>FINAL</span>
                          ) : isLive ? (
                            <>
                              <span style={PULSE_STYLE} />
                              <span style={{ backgroundColor: LIVE_RED, color: "white", padding: "1px 6px", borderRadius: 3 }}>LIVE</span>
                            </>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>
                              {s.game_date ? new Date(s.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "TBD"}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 10, color: isLive ? "#4ade80" : GOLD, fontWeight: 800 }}>
                          Series: {s.away_wins}-{s.home_wins}
                        </div>

                        {isFinal && (
                          <div style={{ fontSize: 8, color: "#4ade80", fontWeight: 900, marginTop: 1 }}>
                            WON IN {s.series_length}G
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((player, idx) => {
                  const rank = sortedStandings.filter(p => p.totalPoints > player.totalPoints).length + 1;
                  const isCurrentUser = Number(player.user_id) === Number(user?.id) || player.entry_name === user?.name;

                  return (
                    <tr key={player.entry_name || player.user_id} style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white")
                    }}>
                      <td style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 5,
                        backgroundColor: isCurrentUser ? "#dbeafe" : (idx % 2 === 0 ? "#fafafa" : "white"),
                        padding: "8px 12px",
                        width: PLAYER_COL_W,
                        minWidth: PLAYER_COL_W,
                        maxWidth: PLAYER_COL_W,
                        boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                        verticalAlign: "middle"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                          <div style={{
                            fontWeight: isCurrentUser ? 800 : 700,
                            fontSize: 12,
                            color: "#0f172a",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`} {player.entry_name} {isCurrentUser && "(You)"}
                          </div>
                          <div style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: NAVY,
                            letterSpacing: "-0.2px"
                          }}>
                            Rnd: {player.roundPoints} | Ovr: {player.totalPoints}
                          </div>
                        </div>
                      </td>

                      {series.map(s => {
                        const p = pickMap[s.id]?.[player.entry_name];
                        const cellStyle = getCellStyle(s, p);
                        const pickLogo = p ? (p.pick === s.home_team ? s.home_logo : s.away_logo) : null;
                        const pickTeamMeta = p ? (p.pick === s.home_team ? {
                          primary: s.home_color || NAVY,
                          secondary: s.home_secondary_color || "#cbd5e1"
                        } : {
                          primary: s.away_color || NAVY,
                          secondary: s.away_secondary_color || "#cbd5e1"
                        }) : {};

                        return (
                          <td key={s.id} style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            borderLeft: "1px solid #e2e8f0",
                            borderBottom: "1px solid #f3f4f6",
                            width: SERIES_COL_W,
                            minWidth: SERIES_COL_W,
                            ...cellStyle
                          }}>
                            {p ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <span style={{
                                  background: pickTeamMeta.secondary,
                                  borderRadius: 4,
                                  padding: "2px 4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  boxShadow: `0 0 4px 1px ${pickTeamMeta.primary}, 0 1px 2px rgba(0,0,0,0.15)`,
                                  border: `2px solid ${pickTeamMeta.primary}`
                                }}>
                                  {pickLogo ? (
                                    <img src={pickLogo} alt={p.pick} style={{ width: 20, height: 20, objectFit: "contain", display: "block" }} />
                                  ) : (
                                    <span style={{ fontSize: 10 }}>{p.pick}</span>
                                  )}
                                </span>
                                <div style={{ fontSize: 11, fontWeight: 900, color: NAVY, marginTop: 2 }}>{p.confidence} pts</div>
                                <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>in {p.series_length_guess}g</div>
                              </div>
                            ) : (
                              <span style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 600 }}>{s.locked ? "NP" : "—"}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PoolGatekeeper>
  );
}