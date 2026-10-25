import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolEmoji from "../../components/PoolEmoji";

const NFL_BLUE = "#013369";
const GOLD = "#c89d3c";

export default function NflPlayoffsPickThreeStandings() {
  const { user, loading: authLoading } = useAuth();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    axios.get("/api/nfl_playoffs_pickthree/standings", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setStandings(res.data.standings || []);
      })
      .catch(err => {
        console.error("Failed to load standings", err);
        toast.error("Failed to load pool standings.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (authLoading) {
    return <div style={{ textAlign: "center", padding: 50, color: "var(--text-primary)" }}>Loading Standings...</div>;
  }

  const roundsConfig = [
    { key: "round_1_points", label: "Wild Card" },
    { key: "round_2_points", label: "Divisional" },
    { key: "round_3_points", label: "Conf Champ" },
    { key: "round_4_points", label: "Super Bowl" }
  ];

  return (
    <PoolGatekeeper user={user} gameKey="nfl_playoffs_pick_three">
      <div className="nfl-pick-three-standings-page" style={{ width: "100%", maxWidth: 1000, margin: "0 auto", padding: "16px 8px 80px 8px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <Toaster />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2 style={{ color: NFL_BLUE, fontSize: "24px", margin: 0, fontWeight: 800 }}>
            <PoolEmoji gameKey="nfl_playoffs_pick_three" /> NFL Playoffs Pick 3 Standings <PoolEmoji gameKey="nfl_playoffs_pick_three" />
          </h2>
          <p style={{ color: "var(--text-secondary, #64748b)", marginTop: 4, fontSize: "13px" }}>
            Cumulative fantasy DFS points leaderboards across all playoff rounds.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading standings leaderboard...</div>
        ) : (
          <div style={{ background: "var(--bg-secondary, white)", borderRadius: 12, overflowX: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid var(--border-color, #e2e8f0)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: NFL_BLUE, color: "white", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, width: "60px" }}>Rank</th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800 }}>Participant Entry</th>
                  {roundsConfig.map(r => (
                    <th key={r.key} style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, textAlign: "right" }}>{r.label}</th>
                  ))}
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, textAlign: "right" }}>Total Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>No standings records found.</td>
                  </tr>
                ) : (
                  standings.map((st, idx) => {
                    const isCurrentUser = Number(st.user_id) === Number(user?.id);

                    return (
                      <tr key={st.entry_id} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)", backgroundColor: isCurrentUser ? "var(--bg-active, #eff6ff)" : idx % 2 === 0 ? "var(--bg-primary, white)" : "var(--bg-alt, #f8fafc)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 800, fontSize: "13px", color: "var(--text-primary)" }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
                          {st.entry_name} {isCurrentUser && <span style={{ color: GOLD, fontSize: "11px" }}>(You)</span>}
                        </td>
                        {roundsConfig.map(r => (
                          <td key={r.key} style={{ padding: "12px 16px", fontSize: "13px", textAlign: "right", color: "var(--text-primary)" }}>
                            {st[r.key] ?? 0}
                          </td>
                        ))}
                        <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 900, textAlign: "right", color: NFL_BLUE }}>
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