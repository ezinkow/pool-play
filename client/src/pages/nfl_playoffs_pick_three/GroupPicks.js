import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolEmoji from "../../components/PoolEmoji";

const NFL_BLUE = "#013369";
const GOLD = "#c89d3c";

export default function NflPlayoffsPickThreeGroupPicks() {
  const { user, loading: authLoading } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [standings, setStandings] = useState([]);
  const [groupPicks, setGroupPicks] = useState([]);
  const [teamColors, setTeamColors] = useState({});
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // Fetch team colors for logos and styling
  useEffect(() => {
    if (!token) return;
    axios.get("/api/nfl_teams", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const map = {};
        (res.data || []).forEach(t => {
          map[t.name] = {
            color: t.color || t.primary_color || "#0f172a",
            secondaryColor: t.secondaryColor || t.bg_color || t.alt_color || "#cbd5e1",
            logo: t.logo
          };
          // Map abbreviation keys too if present
          if (t.abbreviation) {
            map[t.abbreviation] = map[t.name];
          }
        });
        setTeamColors(map);
      })
      .catch(err => console.error("Failed to load NFL team colors", err));
  }, [token]);

  // Fetch settings, group matrix picks, and standings using proper playoffs endpoints
  useEffect(() => {
    if (!token) return;

    setLoading(true);
    Promise.all([
      axios.get("/api/nfl_playoffs/settings", { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { current_week: 1 } })),
      axios.get(`/api/nfl_playoffs_pickthree/matrix?week=${currentWeek}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get("/api/nfl_playoffs_pickthree/standings", { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(([settingsRes, matrixRes, standingsRes]) => {
        if (settingsRes.data && settingsRes.data.current_week && currentWeek === 1) {
          setCurrentWeek(Number(settingsRes.data.current_week));
        }
        setGroupPicks(matrixRes.data.picks || []);
        setStandings(standingsRes.data.standings || []);
      })
      .catch(err => {
        console.error("Failed to load group picks data", err);
        toast.error("Failed to load group picks matrix.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, currentWeek]);

  // Map picks by user_id
  const pickMap = useMemo(() => {
    const map = {};
    groupPicks.forEach(p => {
      if (!map[p.user_id]) map[p.user_id] = {};
      map[p.user_id][p.position] = p; // QB, RB, WR
    });
    return map;
  }, [groupPicks]);

  // Sort standings by total points descending, then round points, then entry name
  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      const totalA = Number(a.total_points) || 0;
      const totalB = Number(b.total_points) || 0;
      if (totalB !== totalA) return totalB - totalA;

      const roundA = Number(a.round_points) || 0;
      const roundB = Number(b.round_points) || 0;
      if (roundB !== roundA) return roundB - roundA;

      return (a.entry_name || "").localeCompare(b.entry_name || "");
    });
  }, [standings]);

  if (authLoading) {
    return <div style={{ textAlign: "center", padding: 50, color: "var(--text-primary)" }}>Loading Group Picks Matrix...</div>;
  }

  const roundsConfig = [
    { round: 1, label: "Wild Card" },
    { round: 2, label: "Divisional" },
    { round: 3, label: "Conf Champ" },
    { round: 4, label: "Super Bowl" }
  ];

  const renderPlayerCell = (playerPick) => {
    if (!playerPick || !playerPick.player_name) {
      return <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Hidden / Unpicked</span>;
    }

    const teamMeta = teamColors[playerPick.team] || {};
    const primaryColor = teamMeta.color || "#013369";
    const secondaryColor = teamMeta.secondaryColor || "#cbd5e1";
    const logoUrl = teamMeta.logo;

    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{
          background: secondaryColor,
          borderRadius: 4,
          padding: "2px 6px",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          border: `1.5px solid ${primaryColor}`,
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt={playerPick.team} style={{ width: 16, height: 16, objectFit: "contain", display: "block" }} />
          ) : (
            <span style={{ fontSize: 10, fontWeight: 800, color: primaryColor }}>{playerPick.team}</span>
          )}
        </span>
        <span style={{ fontWeight: 600 }}>{playerPick.player_name}</span>
        {playerPick.points !== undefined && playerPick.points !== null && (
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginLeft: 2 }}>
            ({playerPick.points} pts)
          </span>
        )}
      </div>
    );
  };

  return (
    <PoolGatekeeper user={user} gameKey="nfl_playoffs_pick_three">
      <div className="nfl-pick-three-group-page" style={{ width: "100%", maxWidth: 1050, margin: "0 auto", padding: "16px 8px 80px 8px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <Toaster />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2 style={{ color: NFL_BLUE, fontSize: "24px", margin: 0, fontWeight: 800 }}>
            <PoolEmoji gameKey="nfl_playoffs_pick_three" /> Group Picks Matrix <PoolEmoji gameKey="nfl_playoffs_pick_three" />
          </h2>
          <p style={{ color: "var(--text-secondary, #64748b)", marginTop: 4, fontSize: "13px" }}>
            View all participant rosters and selections for the selected playoff round, sorted by overall standings.
          </p>
        </div>

        {/* Round Selector Bar */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 20, background: "var(--bg-secondary, white)", padding: "14px", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid var(--border-color, #e2e8f0)" }}>
          <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Playoff Round:</label>
          <div style={{ display: "flex", gap: 4 }}>
            {roundsConfig.map(({ round, label }) => (
              <button
                key={round}
                onClick={() => setCurrentWeek(round)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: `1px solid ${currentWeek === round ? NFL_BLUE : "var(--border-color, #cbd5e1)"}`,
                  backgroundColor: currentWeek === round ? NFL_BLUE : "var(--bg-primary, white)",
                  color: currentWeek === round ? "white" : "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "12px"
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading group matrix...</div>
        ) : (
          <div style={{ background: "var(--bg-secondary, white)", borderRadius: 12, overflowX: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid var(--border-color, #e2e8f0)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: NFL_BLUE, color: "white", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800 }}>Participant Entry</th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800 }}>QB Selection</th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800 }}>RB Selection</th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800 }}>WR/TE Selection</th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, textAlign: "right" }}>Round Pts</th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, textAlign: "right" }}>Total Pts</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>No entries found in this pool.</td>
                  </tr>
                ) : (
                  sortedStandings.map((st, idx) => {
                    const entryPicks = pickMap[st.user_id] || {};
                    const isCurrentUser = Number(st.user_id) === Number(user?.id);

                    return (
                      <tr key={st.user_id || st.entry_id} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)", backgroundColor: isCurrentUser ? "var(--bg-active, #eff6ff)" : idx % 2 === 0 ? "var(--bg-primary, white)" : "var(--bg-alt, #f8fafc)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
                          {idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : `${idx + 1}. `}
                          {st.entry_name} {isCurrentUser && <span style={{ color: GOLD, fontSize: "11px" }}>(You)</span>}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-primary)" }}>
                          {renderPlayerCell(entryPicks.QB)}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-primary)" }}>
                          {renderPlayerCell(entryPicks.RB)}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-primary)" }}>
                          {renderPlayerCell(entryPicks.WR || entryPicks.TE)}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 700, textAlign: "right", color: "var(--text-primary)" }}>
                          {st.round_points ?? 0}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, textAlign: "right", color: NFL_BLUE }}>
                          {st.total_points ?? 0} pts
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PoolGatekeeper>
  );
}