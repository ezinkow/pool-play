import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";

// ✨ Condensation-optimized pulsing live indicator
const PULSE_STYLE = {
  width: "6px",
  height: "6px",
  backgroundColor: "#22c55e",
  borderRadius: "50%",
  display: "inline-block",
  boxShadow: "0 0 0 rgba(34, 197, 94, 0.4)",
  animation: "pulse 2s infinite"
};

export default function PlayerPicksMatrix() {
  const { user: currentUser } = useAuth();
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [standings, setStandings] = useState([]);

  const renderRank = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  useEffect(() => {
    const fetchAll = () => {
      axios.get("/api/worldcup/matches").then(r => {
        // ✨ UPDATED: Removed round === 0 filter to show ALL matches
        const filtered = r.data
          .filter(g => {
            const s = g.status || "";
            return s.includes("FINAL") || s.includes("HALF") || s.includes("PROGRESS") || s.includes("FULL_TIME");
          })
          // Sort by round, then by date so it flows logically
          .sort((b, a) => parseInt(a.round) - parseInt(b.round) || new Date(a.game_date) - new Date(b.game_date));
        setGames(filtered);
      });
      axios.get("/api/worldcup/picks/all").then(r => setPicks(r.data));
      axios.get("/api/worldcup/standings").then(r => setStandings(r.data));
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const rankedUsers = useMemo(() => {
    const sorted = [...standings].sort((a, b) => b.points - a.points);
    let currentRank = 1;
    return sorted.map((u, i) => {
      if (i > 0 && u.points === sorted[i - 1].points) {
        // Tie handling
      } else {
        currentRank = i + 1;
      }
      return { ...u, rank: currentRank };
    });
  }, [standings]);

  const pickMap = useMemo(() => {
    const map = {};
    for (const p of picks) {
      if (!map[p.match_id]) map[p.match_id] = {};
      map[p.match_id][p.user_id] = p;
    }
    return map;
  }, [picks]);

  const getCellStyle = (game, pickObj) => {
    if (!pickObj || game.result === "Pending") return {};
    let isCorrect = false;
    if (parseInt(game.round) === 0) {
      isCorrect = pickObj.selection === game.result;
    } else {
      const winner = game.result === "Home" ? game.home_team : game.away_team;
      isCorrect = pickObj.selection === winner;
    }

    if (isCorrect) {
      return { backgroundColor: "#28bd5566" }; // Consistent green for correct
    }
    return { backgroundColor: "#d646462b" }; // Red for incorrect
  };

  const PickLogo = ({ game, pickObj }) => {
    if (!pickObj?.selection) return <span style={{ color: "#9ca3af", fontSize: 11 }}>–</span>;

    // 1. Handle Group Stage (Position-based)
    if (parseInt(game.round) === 0) {
      if (pickObj.selection === "Draw") return <span style={{ fontSize: 9, fontWeight: 800, color: "#dc2626" }}>DRAW</span>;
      const logo = pickObj.selection === "Home" ? game.home_logo : game.away_logo;
      return logo ? <img src={logo} alt="" style={logoStyle} /> : <span style={{ fontSize: 9, fontWeight: 700 }}>{pickObj.selection}</span>;
    }

    // 2. Handle Knockout Stage (Team Name-based)
    if (pickObj.selection === "Draw") return <span style={{ fontSize: 9, fontWeight: 800, color: "#dc2626" }}>DRAW</span>;

    const logo = pickObj.selection === game.home_team ? game.home_logo
      : pickObj.selection === game.away_team ? game.away_logo
        : null;

    return logo ? <img src={logo} alt="" style={logoStyle} /> : <span style={{ fontSize: 9, fontWeight: 700 }}>{pickObj.selection.substring(0, 3)}</span>;
  };
  const logoStyle = { height: 16, width: 16, objectFit: "contain", verticalAlign: "middle" };

  const GameHeader = ({ game }) => {
    const isLive = game.status.includes("HALF") || game.status.includes("PROGRESS");
    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        {/* Condensed Flags */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, marginBottom: 2 }}>
          <img src={game.away_logo} alt="" height={14} width={14} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: 8, color: "#94a3b8" }}>v</span>
          <img src={game.home_logo} alt="" height={14} width={14} style={{ objectFit: "contain" }} />
        </div>

        {/* Live Indicator & Score */}
        <div style={{ fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>
          {isLive && <span style={PULSE_STYLE} />}
          <span style={{ color: "white", marginLeft: isLive ? 3 : 0 }}>
            {game.away_score}-{game.home_score}
          </span>
        </div>

        {/* Winner Flag / Draw Indicator */}
        {game.result !== "Pending" && (
          <div style={{ marginTop: 2, height: 20 }}>
            {game.result === "Draw" ? (
              <span style={{
                fontSize: 9,
                fontWeight: 800,
                color: "#f50b0b",
                lineHeight: "20px"
              }}>
                DRAW
              </span>
            ) : (
              <img
                src={game.result === "Home" ? game.home_logo : game.away_logo}
                alt="Winner"
                style={{ height: 20, width: 20, objectFit: "contain" }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: "100%", padding: "4px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes pulse { 
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
          70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
        }
        .matrix-container::-webkit-scrollbar { height: 5px; }
        .matrix-container::-webkit-scrollbar-track { background: #f1f5f9; }
        .matrix-container::-webkit-scrollbar-thumb { background: #cbd5e1; borderRadius: 4px; }
      `}</style>

      {/* ✨ UPDATED TITLE */}
      <h2 style={{ color: "#13447a", textAlign: "center", fontWeight: 800, fontSize: "1.2rem", margin: "8px 0" }}>
        ⚽ Tournament Prediction Matrix
      </h2>

      <div style={{ paddingBottom: "100px" }}>
        <div className="matrix-container" style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, zIndex: 6, backgroundColor: "#13447a", color: "white", padding: "6px 8px", minWidth: "100px", textAlign: "left" }}>
                  PLAYER
                </th>
                {games.map(g => (
                  <th key={g.match_id} style={{ backgroundColor: "#13447a", color: "white", padding: "4px", width: "65px", minWidth: "65px", borderLeft: "1px solid #1e293b" }}>
                    <GameHeader game={g} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankedUsers.map((user) => {
                const isMe = currentUser?.id === user.id;
                return (
                  <tr key={user.id} style={{ backgroundColor: isMe ? "#fffbeb" : "transparent" }}>
                    <td style={{
                      position: "sticky", left: 0, zIndex: 2, backgroundColor: isMe ? "#fef3c7" : "#f8fafc",
                      padding: "6px 8px", borderBottom: "1px solid #edf2f7", borderRight: "2px solid #c89d3c",
                      width: "100px"
                    }}>
                      <span style={{ fontWeight: 800, color: "#13447a" }}>{renderRank(user.rank)} {user.name}</span>
                      <span style={{ fontSize: 9, color: "#64748b", display: "block" }}>{user.points} pts</span>
                    </td>
                    {games.map(game => (
                      <td key={game.match_id} style={{ textAlign: "center", padding: "4px 0", borderBottom: "1px solid #edf2f7", ...getCellStyle(game, pickMap[game.match_id]?.[user.id]) }}>
                        <PickLogo game={game} pickObj={pickMap[game.match_id]?.[user.id]} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}