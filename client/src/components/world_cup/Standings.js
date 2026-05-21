import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const NAVY = "#13447a";
const GOLD = "#c89d3c";
const WORLDCUPGREEN = "#226750";
const BRACKET_LOCKED = Date.now() >= new Date("2026-06-28T15:00:00Z").getTime();

export default function Standings() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const { data } = await axios.get("/api/worldcup/standings");
        setStandings(data);
      } catch (err) {
        console.error("❌ Standings Page Load Error:", err);
        toast.error("Failed to load current leaderboard standings.");
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
    const interval = setInterval(fetchStandings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "85px 16px 80px" }}>
      <Toaster />

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ color: NAVY, margin: 0, fontWeight: 900, display: "flex", alignItems: "center", gap: "10px" }}>
          🏆 World Cup Standings
        </h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Live pool rankings. Knockout bracket selections reveal automatically once tournament lock completes.
        </p>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#6b7280" }}>Calculating pool scores...</p>
      ) : standings.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic" }}>
          No entries found. Create an entry profile to see stats!
        </p>
      ) : (
        <div style={{
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #e5e7eb"
        }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "white", fontSize: 13 }}>
            <thead>
              <tr style={{ background: NAVY, color: "white" }}>
                <th style={{ ...thStyle, width: "60px", textAlign: "center" }}>Rank</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Manager</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Group Pts</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Bracket Pts</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Total Pts</th>
                <th style={{ ...thStyle, textAlign: "center", minWidth: "130px" }}>Predicted Champ</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((user, index) => {
                return (
                  <tr key={user.user_id || index} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: index === 0 ? "#fdfbf7" : "white" }}>
                    {/* Rank Index Column */}
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: index === 0 ? GOLD : "#475569" }}>
                      {index + 1}
                    </td>

                    {/* Username Column */}
                    <td style={{ ...tdStyle, textAlign: "left", fontWeight: 600, color: "#1e293b" }}>
                      {user.name}
                    </td>

                    {/* Group Stages Points */}
                    <td style={{ ...tdStyle, textAlign: "center", color: "#475569" }}>
                      {user.group_points || 0}
                    </td>

                    {/* Knockout Bracket Tree Points */}
                    <td style={{ ...tdStyle, textAlign: "center", color: "#475569" }}>
                      {user.bracket_points || 0}
                    </td>

                    {/* Grand Cumulative Total Points */}
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 900, color: WORLDCUPGREEN, fontSize: "15px" }}>
                      {user.total_points || 0}
                    </td>

                    {/* Champion Selection Slot */}
                    <td style={{ ...tdStyle, fontWeight: 700, color: GOLD, textAlign: "center" }}>
                      {BRACKET_LOCKED ? (
                        <span style={{ backgroundColor: "#fef3c7", padding: "4px 10px", borderRadius: "12px", border: "1px solid #fde68a" }}>
                          🏅 {user.champion_pick || "TBD"}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 11, fontStyle: "italic", fontWeight: 400 }}>
                          🔒 Hidden Until Lock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "16px", fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
        * Points are calculated dynamically: 1pt for correct match predictions, 2pts for precise Group Stage Draw outcomes.
      </div>
    </div>
  );
}

/** ---------------- ADJUSTED STYLES ---------------- */
const thStyle = {
  padding: "14px 12px",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.75px",
  borderBottom: `2px solid ${GOLD}`,
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "12px 12px",
  fontSize: "14px",
  verticalAlign: "middle",
  borderBottom: "1px solid #edf2f7"
};