import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import LivePulseIndicator from "../../components/picks/LivePulseIndicator";
import PoolEmoji from "../../components/PoolEmoji";

const NAVY = "#1c61ac";
const GOLD = "#c89d3c";

export default function GroupPicks() {
  const [series, setSeries] = useState([]);
  const [picks, setPicks] = useState([]);
  const [standings, setStandings] = useState([]);
  const [tiebreakers, setTiebreakers] = useState([]);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [seriesRes, picksRes, standingsRes, tbRes] = await Promise.all([
          axios.get("/api/mlb_playoffs_series"),
          axios.get("/api/mlb_playoffs/picks/all"),
          axios.get("/api/mlb_playoffs/standings"),
          axios.get("/api/mlb_playoffs/tiebreaker/all"),
        ]);

        const now = new Date();

        const sortedSeries = (seriesRes.data || [])
          .filter(s => s.home_team && s.away_team)
          .filter(s => {
            const isLocked = s.locked;
            const status = (s.status || "").toUpperCase();
            const isStartedOrFinished = status === "STATUS_IN_PROGRESS" || status === "IN_PROGRESS" || status === "STATUS_FINAL" || status === "FINAL";
            const hasDatePassed = s.game_date && new Date(s.game_date) <= now;

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

  const sortedStandings = useMemo(() => {
    const standingsList = standings.map(st => ({
      ...st,
      totalPoints: Number(st.points) || 0
    }));

    standingsList.sort((a, b) => {
      return b.totalPoints - a.totalPoints || a.entry_name.localeCompare(b.entry_name);
    });

    return standingsList;
  }, [standings]);

  const getCellStyle = (s, pick) => {
    if (!pick || s.status !== "STATUS_FINAL") return { backgroundColor: "transparent" };
    const correctWinner = pick.pick === s.winner;
    if (correctWinner) {
      return pick.series_length_guess === s.series_length
        ? { backgroundColor: "var(--pick-perfect-bg)", color: "var(--pick-perfect-text)" }
        : { backgroundColor: "var(--pick-correct-bg)", color: "var(--pick-correct-text)" };
    }
    return { backgroundColor: "var(--pick-incorrect-bg)", color: "var(--pick-incorrect-text)" };
  };

  if (authLoading) return <div style={{ textAlign: "center", padding: 50, color: "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>Verifying session...</div>;

  const PLAYER_COL_W = 180;
  const SERIES_COL_W = 135;

  const GameHeader = ({ s }) => {
    const isFinal = s.status === "STATUS_FINAL";
    const isLive = s.status === "STATUS_IN_PROGRESS";
    const homeIsWinner = isFinal && s.winner === s.home_team;
    const awayIsWinner = isFinal && s.winner === s.away_team;

    const awaySecondary = s.away_secondary_color || "#cbd5e1";
    const homeSecondary = s.home_secondary_color || "#cbd5e1";
    const awayPrimary = s.away_color || NAVY;
    const homePrimary = s.home_color || NAVY;

    const getWinnerBadgeStyle = (primaryColor, secondaryColor, isWinner) => ({
      background: secondaryColor,
      borderRadius: 4,
      padding: "1px 3px",
      display: "inline-flex",
      alignItems: "center",
      boxShadow: isWinner 
        ? `0 0 6px 2px ${GOLD}, 0 1px 2px rgba(0,0,0,0.3)` 
        : `0 0 4px 1px ${primaryColor}, 0 1px 2px rgba(0,0,0,0.2)`,
      border: `2px solid ${isWinner ? GOLD : primaryColor}`,
      margin: "2px"
    });

    const awayBadgeStyle = getWinnerBadgeStyle(awayPrimary, awaySecondary, awayIsWinner);
    const homeBadgeStyle = getWinnerBadgeStyle(homePrimary, homeSecondary, homeIsWinner);

    return (
      <div style={{ textAlign: "center", width: "100%", overflow: "visible", padding: "2px 0" }}>
        {/* Round Badge */}
        <div style={{ fontSize: 9, marginBottom: 4, fontWeight: 800, textTransform: "uppercase", backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 3, padding: "1px 5px", display: "inline-block", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
          {s.round_label}
        </div>

        {/* Matchup Teams Row */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "1px 0" }}>
          {/* Away Team */}
          <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <span style={{ ...awayBadgeStyle, opacity: isFinal && !awayIsWinner ? 0.4 : 1 }}>
              {s.away_logo && <img src={s.away_logo} alt={s.away_team} height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
            </span>
            {isFinal && !awayIsWinner && (
              <span style={{ position: "absolute", top: -3, left: 2, color: "#ef4444", fontSize: 14, fontWeight: 900, textShadow: "0px 0px 3px black", pointerEvents: "none" }}>×</span>
            )}
          </div>

          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>@</span>

          {/* Home Team */}
          <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
            <span style={{ ...homeBadgeStyle, opacity: isFinal && !homeIsWinner ? 0.4 : 1 }}>
              {s.home_logo && <img src={s.home_logo} alt={s.home_team} height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
            </span>
            {isFinal && !homeIsWinner && (
              <span style={{ position: "absolute", top: -3, left: 2, color: "#ef4444", fontSize: 14, fontWeight: 900, textShadow: "0px 0px 3px black", pointerEvents: "none" }}>×</span>
            )}
          </div>
        </div>

        {/* Compact Live Status / Score / Time Row */}
        <div style={{ fontSize: 9, fontWeight: 700, margin: "3px 0 2px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {isFinal ? (
            <span style={{ backgroundColor: "#16a34a", color: "white", padding: "1px 6px", borderRadius: 3, fontSize: "8px", letterSpacing: "0.5px" }}>FINAL</span>
          ) : isLive ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.25)", padding: "1px 5px", borderRadius: 3 }}>
              <LivePulseIndicator />
              <span style={{ color: "#fca5a5", fontWeight: 800 }}>{s.live_summary || "LIVE"}</span>
              {s.away_live_score !== null && s.home_live_score !== null && (
                <span style={{ color: "#ffffff", fontWeight: 900, marginLeft: 2 }}>
                  ({s.away_live_score}-{s.home_live_score})
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "9px" }}>
              {s.game_date ? new Date(s.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "TBD"}
            </span>
          )}
        </div>

        {/* Series Score / Winner Callout */}
        {isFinal ? (
          <div style={{ display: "inline-block", backgroundColor: "rgba(15,23,42,0.95)", border: `1px solid ${GOLD}`, borderRadius: 3, padding: "1px 6px", marginTop: 3 }}>
            <div style={{ fontSize: 8, color: "#4ade80", fontWeight: 800 }}>
              🏆 Winner: <strong>{s.winner}</strong> ({s.series_length}G)
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 9, color: isLive ? "#4ade80" : GOLD, fontWeight: 800, marginTop: 1 }}>
            Series: {s.away_wins}-{s.home_wins}
          </div>
        )}
      </div>
    );
  };

  return (
    <PoolGatekeeper user={user} gameKey="mlb_playoffs">
      <div className="pickem-matrix-page mlb-playoffs-standings-page" style={{ width: "100%", margin: "0 auto", padding: "12px 4px", paddingBottom: 80, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <style>{`
          @keyframes pulse { 
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
            70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
          }
          .matrix-container::-webkit-scrollbar { height: 12px; }
          .matrix-container::-webkit-scrollbar-track { background: var(--bg-tertiary, #f1f5f9); }
          .matrix-container::-webkit-scrollbar-thumb { background: var(--border-color, #cbd5e1); border-radius: 4px; }
        `}</style>

        <div style={{ textAlign: "center", marginBottom: 12, padding: "0 8px" }}>
          <h2 className="pickem-matrix-title" style={{ color: NAVY, fontSize: "20px", margin: 0, fontWeight: 800 }}>
            <PoolEmoji gameKey="mlb_playoffs" /> Group Picks Matrix <PoolEmoji gameKey="mlb_playoffs" />
          </h2>
          <p className="text-subtitle" style={{ color: "#64748b", marginTop: 4, fontSize: "12px" }}>Track participant selections, confidence points, and series length outcomes for active/started series.</p>
        </div>

        <div className="pickem-matrix-container" style={{
          maxWidth: "100%",
          overflowX: "auto",
          position: "relative"
        }}>
          {series.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
              No series have started yet. Picks will appear here once Game 1 of a series gets underway!
            </div>
          ) : (
            <table className="ats-group-picks-matrix-table" style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0, whiteSpace: "nowrap", tableLayout: "fixed" }}>
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
                    <span>Participant</span>
                  </th>

                  {series.map(s => (
                    <th key={s.id} style={{
                      backgroundColor: NAVY,
                      color: "white",
                      padding: "8px 6px",
                      width: SERIES_COL_W,
                      minWidth: SERIES_COL_W,
                      textAlign: "center",
                      borderBottom: `2px solid ${GOLD}`,
                      borderLeft: "1px solid rgba(255,255,255,0.15)",
                      verticalAlign: "middle",
                      overflow: "visible"
                    }}>
                      <GameHeader s={s} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((player, idx) => {
                  const rank = sortedStandings.filter(p => p.totalPoints > player.totalPoints).length + 1;
                  const isCurrentUser = Number(player.user_id) === Number(user?.id) || player.entry_name === user?.name;

                  return (
                    <tr key={player.entry_name || player.user_id} className={`pickem-matrix-row${isCurrentUser ? " is-current-user" : ""}`}>
                      <td
                        className="pickem-matrix-player-cell"
                        style={{
                          width: PLAYER_COL_W,
                          minWidth: PLAYER_COL_W,
                          maxWidth: PLAYER_COL_W,
                          padding: "8px 12px"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                          <div className="pickem-matrix-player-name" style={{
                            fontWeight: isCurrentUser ? 800 : 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`} {player.entry_name} {isCurrentUser && "(You)"}
                          </div>
                          <div className="pickem-matrix-player-points">
                            Points: {player.totalPoints}
                          </div>
                        </div>
                      </td>

                      {series.map(s => {
                        const p = pickMap[s.id]?.[player.entry_name];
                        const cellStyle = getCellStyle(s, p);
                        const pickLogo = p ? (p.pick === s.home_team ? s.home_logo : s.away_logo) : null;

                        const pickTeamMeta = p ? (p.pick === s.home_team ? {
                          primary: s.home_color || NAVY,
                          secondary: s.home_secondary_color || "#0f478b"
                        } : {
                          primary: s.away_color || NAVY,
                          secondary: s.away_secondary_color || "#003779"
                        }) : {};

                        return (
                          <td key={s.id} style={{
                            padding: "8px 6px",
                            textAlign: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            borderLeft: "1px solid var(--border-color, #e2e8f0)",
                            borderBottom: "1px solid var(--border-color, #f3f4f6)",
                            width: SERIES_COL_W,
                            minWidth: SERIES_COL_W,
                            verticalAlign: "middle",
                            overflow: "visible",
                            ...cellStyle
                          }}>
                            {p ? (
                              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", position: "relative", minHeight: "24px" }}>
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
                                    <span style={{ fontSize: 10, color: "#fff" }}>{p.pick}</span>
                                  )}
                                </span>
                                <div style={{ marginLeft: 6, textAlign: "left" }}>
                                  <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.1 }}>{p.confidence} pts</div>
                                  <div style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 600 }}>in {p.series_length_guess}g</div>
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}>{s.locked ? "-" : "—"}</span>
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