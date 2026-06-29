import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";

const NAVY = "#13447a";
const GOLD = "#c89d3c";
const WORLDCUPGREEN = "#226750";
const BRACKET_LOCKED = Date.now() >= new Date("2026-06-28T15:00:00Z").getTime();

export default function Standings() {
  const { user: currentUser } = useAuth();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper returns only medal if rank 1-3, else returns the rank number
  const renderRank = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const header = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
        const { data } = await axios.get("/api/worldcup/standings", header);
        setStandings([...data].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)));
      } catch (err) {
        if (err.response?.status === 403) {
          window.location.href = "/access-denied";
        } else {
          toast.error("Failed to load leaderboard.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, []);

  const rankedStandings = useMemo(() => {
    let currentRank = 1;
    return standings.map((u, i) => {
      if (i > 0 && u.points === standings[i - 1].points) {
        // Keep same rank for tied scores
      } else {
        currentRank = i + 1;
      }
      return { ...u, rank: currentRank };
    });
  }, [standings]);

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

      {loading ? <p>Calculating rankings...</p> : (
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
                {rankedStandings.map((u) => {
                  const isMe = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} style={{
                      borderBottom: "1px solid #edf2f7",
                      backgroundColor: isMe ? "#fffbeb" : "transparent"
                    }}>
                      <td style={{ ...tdStyle, fontWeight: 800, fontSize: u.rank <= 3 ? "16px" : "14px" }}>
                        {renderRank(u.rank)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: isMe ? "bold" : "normal" }}>
                        {u.name}
                      </td>
                      <td style={tdStyle}>{u.group_points || 0}</td>
                      <td style={tdStyle}>{u.bracket_points || 0}</td>
                      <td style={{ ...tdStyle, fontWeight: 900, color: WORLDCUPGREEN }}>{u.points || 0}</td>
                      <td style={tdStyle}>
                        {BRACKET_LOCKED ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {u.champion_logo && (
                              <img
                                src={u.champion_logo}
                                alt={u.champion_pick}
                                style={{ width: "20px", height: "14px", objectFit: "contain", borderRadius: "2px" }}
                              />
                            )}
                            <span style={{ color: GOLD, fontWeight: 700 }}>{u.champion_pick || "TBD"}</span>
                          </div>
                        ) : "🔒"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="mobile-only">
            {rankedStandings.map((u) => (
              <div key={u.id} style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 800 }}>{renderRank(u.rank)} {u.name}</span>
                  <span style={{ fontWeight: 900, color: WORLDCUPGREEN, fontSize: "18px" }}>{u.points || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>
                    Group: {u.group_points || 0} | Bracket: {u.bracket_points || 0}
                  </div>
                  <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px" }}>
                    {BRACKET_LOCKED ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {u.champion_logo && (
                          <img
                            src={u.champion_logo}
                            alt={u.champion_pick}
                            style={{ width: "20px", height: "14px", objectFit: "contain", borderRadius: "2px" }}
                          />
                        )}
                        <span style={{ color: GOLD, fontWeight: 700 }}>{u.champion_pick || "TBD"}</span>
                      </div>
                    ) : "🔒"}
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