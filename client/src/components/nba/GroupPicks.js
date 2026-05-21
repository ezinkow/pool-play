import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import NbaGatekeeper from "../../components/nba/NbaGatekeeper";

const NAVY = "#0a1628";
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
          axios.get("/api/nba/series"),
          axios.get("/api/nba/picks/all"),
          axios.get("/api/nba/standings"),
          axios.get("/api/nba/tiebreaker/all"),
        ]);

        // FIX: Ensure we sort by Round and then Date to keep the grid logical
        const sortedSeries = seriesRes.data
          .filter(s => s.home_team && s.away_team)
          .sort((b, a) => a.round - b.round || new Date(a.game_date) - new Date(b.game_date));

        setSeries(sortedSeries);
        setPicks(picksRes.data);
        setStandings(standingsRes.data.sort((a, b) => b.points - a.points));
        setTiebreakers(tbRes.data);
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

  const getCellStyle = (s, pick) => {
    if (!pick || s.status !== "STATUS_FINAL") return {};
    const correctWinner = pick.pick === s.winner;
    if (correctWinner) {
      return pick.series_length_guess === s.series_length
        ? { backgroundColor: "#71ff7d" }
        : { backgroundColor: "#dcfce7" };
    }
    return { backgroundColor: "#fa7c7c" };
  };

  if (authLoading) return null;

  const PLAYER_COL_W = 140;
  const SERIES_COL_W = 90;

  return (
    <NbaGatekeeper user={user}>
      <div className="page-content" style={{ paddingBottom: 80 }}>
        <style>{`
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
          .live-dot { animation: pulse 1.5s infinite; color: #ef4444; }
        `}</style>

        <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "10px 16px", background: "#f8f9fa", borderBottom: `2px solid ${GOLD}` }}>
          <h4 style={{ margin: 0, fontSize: 15, color: NAVY }}>Group Picks</h4>
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", backgroundColor: "white", tableLayout: "fixed", width: PLAYER_COL_W + (series.length * SERIES_COL_W) }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, top: 0, zIndex: 10, backgroundColor: "#f1f5f9", color: "white", padding: "10px", width: PLAYER_COL_W, borderBottom: `2px solid ${GOLD}`, textAlign: "left", fontSize: 12 }}>
                  Player
                </th>
                {series.map(s => {
                  const isFinal = s.status === "STATUS_FINAL";
                  const homeIsWinner = isFinal && s.winner === s.home_team;
                  const awayIsWinner = isFinal && s.winner === s.away_team;

                  return (
                    <th key={s.id} style={{
                      backgroundColor: "#1a1d23", // Deep charcoal, better than blue for contrast
                      color: "white",
                      padding: "8px 4px",
                      width: SERIES_COL_W,
                      textAlign: "center",
                      borderBottom: `2px solid ${GOLD}`,
                      borderLeft: "1px solid rgba(255,255,255,0.05)",
                      fontSize: 10
                    }}>
                      <div style={{ color: "#94a3b8", fontSize: 9, marginBottom: 4, fontWeight: 800 }}>
                        {s.round_label?.split(' ')[0]}
                      </div>

                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        {/* Away Team */}
                        <div style={{ position: "relative", height: 18 }}>
                          <img
                            src={s.away_logo}
                            height={18}
                            alt=""
                            style={{
                              filter: isFinal && !awayIsWinner
                                ? "grayscale(100%) opacity(0.2)"
                                : "drop-shadow(0 0 2px rgba(255,255,255,0.5))", // THE HALO: Makes logos pop on dark
                              outline: awayIsWinner ? `1.5px solid ${GOLD}` : "none",
                              outlineOffset: "1px",
                              borderRadius: "2px"
                            }}
                          />
                          {isFinal && !awayIsWinner && (
                            <span style={{
                              position: "absolute", top: -4, left: 1,
                              color: "#ff4444", fontSize: 18, fontWeight: 900,
                              textShadow: "0px 0px 3px black",
                              pointerEvents: "none"
                            }}>×</span>
                          )}
                        </div>

                        {/* Home Team */}
                        <div style={{ position: "relative", height: 18 }}>
                          <img
                            src={s.home_logo}
                            height={18}
                            alt=""
                            style={{
                              filter: isFinal && !homeIsWinner
                                ? "grayscale(100%) opacity(0.2)"
                                : "drop-shadow(0 0 2px rgba(255,255,255,0.5))", // THE HALO
                              outline: homeIsWinner ? `1.5px solid ${GOLD}` : "none",
                              outlineOffset: "1px",
                              borderRadius: "2px"
                            }}
                          />
                          {isFinal && !homeIsWinner && (
                            <span style={{
                              position: "absolute", top: -4, left: 1,
                              color: "#ff4444", fontSize: 18, fontWeight: 900,
                              textShadow: "0px 0px 3px black",
                              pointerEvents: "none"
                            }}>×</span>
                          )}
                        </div>
                      </div>

                      <div style={{
                        fontSize: 10,
                        color: s.status === "STATUS_IN_PROGRESS" ? "#4ade80" : GOLD,
                        marginTop: 5,
                        fontWeight: 800
                      }}>
                        {s.away_wins}-{s.home_wins}
                        {s.status === "STATUS_IN_PROGRESS" && (
                          <span className="live-dot" style={{ marginLeft: 3, color: "#ff4444" }}>●</span>
                        )}
                      </div>

                      {isFinal && (
                        <div style={{ fontSize: 7, color: "#4ade80", fontWeight: 900, marginTop: 1 }}>
                          FINAL IN {s.series_length}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, idx) => (
                <tr key={standing.entry_name} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ position: "sticky", left: 0, zIndex: 5, backgroundColor: "white", padding: "10px", borderRight: `2px solid ${GOLD}`, width: PLAYER_COL_W }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: NAVY }}>{idx + 1}. {standing.entry_name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{standing.points} pts</div>
                  </td>
                  {series.map(s => {
                    const p = pickMap[s.id]?.[standing.entry_name];
                    const cellBg = getCellStyle(s, p);
                    return (
                      <td key={s.id} style={{ textAlign: "center", padding: "8px 4px", ...cellBg, borderLeft: "1px solid #f1f5f9" }}>
                        {p ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <img src={p.pick === s.home_team ? s.home_logo : s.away_logo} height={24} alt="" />
                            <div style={{ fontSize: 11, fontWeight: 900, color: NAVY }}>{p.confidence}</div>
                            <div style={{ fontSize: 9, color: "#64748b" }}>in {p.series_length_guess}</div>
                          </div>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>{s.locked ? "NP" : "—"}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </NbaGatekeeper>
  );
}