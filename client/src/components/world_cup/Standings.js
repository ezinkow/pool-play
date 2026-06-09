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
        toast.error("Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, []);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "8px", paddingBottom: '100px' }}>
      <Toaster />
      <style>{`
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        @media (max-width: 600px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
        }
      `}</style>

      <h2 style={{ color: NAVY, fontWeight: 900 }}>🏆 World Cup Standings</h2>

      {loading ? <p>Calculating...</p> : (
        <>
          {/* DESKTOP TABLE */}
          <div className="desktop-only" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <table style={{ width: "100%", background: "white", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: NAVY, color: "white" }}>
                  <th style={thStyle}>Rank</th>
                  <th style={thStyle}>Manager</th>
                  <th style={thStyle}>Group</th>
                  <th style={thStyle}>Bracket</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Champion</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((u, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #edf2f7" }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={tdStyle}>{u.group_points || 0}</td>
                    <td style={tdStyle}>{u.bracket_points || 0}</td>
                    <td style={{ ...tdStyle, fontWeight: 900, color: WORLDCUPGREEN }}>{u.total_points || 0}</td>
                    <td style={tdStyle}>{BRACKET_LOCKED ? (u.champion_pick || "TBD") : "🔒"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="mobile-only">
            {standings.map((u, i) => (
              <div key={i} style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 800 }}>#{i + 1} {u.name}</span>
                  <span style={{ fontWeight: 900, color: WORLDCUPGREEN, fontSize: "18px" }}>{u.total_points || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>
                    Group: {u.group_points || 0} | Bracket: {u.bracket_points || 0}
                  </div>
                  <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px" }}>
                    {BRACKET_LOCKED ? (u.champion_pick || "TBD") : "🔒"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = { padding: "12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", borderBottom: `2px solid ${GOLD}` };
const tdStyle = { padding: "12px", fontSize: "14px" };