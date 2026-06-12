import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// ✨ Slow flashing green dot for live matches
const PULSE_STYLE = {
  width: "8px", height: "8px", backgroundColor: "#22c55e", borderRadius: "50%",
  display: "inline-block", boxShadow: "0 0 0 rgba(34, 197, 94, 0.4)",
  animation: "pulse 2s infinite"
};

export default function PlayerPicksMatrix() {
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    const fetchAll = () => {
      axios.get("/api/worldcup/matches").then(r => {
        const filtered = r.data
          .filter(g => {
            const s = g.status || "";
            // Updated to include your new half-time/in-game statuses
            return s.includes("FULL_TIME") || s.includes("HALF") || s.includes("PROGRESS");
          })
          .filter(g => parseInt(g.round) === 0)
          .sort((a, b) => new Date(b.game_date) - new Date(a.game_date));
        setGames(filtered);
      });
      axios.get("/api/worldcup/picks/all").then(r => setPicks(r.data));
      axios.get("/api/worldcup/standings").then(r => setStandings(r.data));
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const users = useMemo(() => [...standings].sort((a, b) => b.points - a.points), [standings]);

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

    const isCorrect = pickObj.selection === game.result;

    if (isCorrect) {
      // If it's a correct Draw, use a slightly darker green; otherwise use standard correct green
      const isDraw = pickObj.selection === "Draw";
      return {
        backgroundColor: isDraw ? "#23a3498e" : "#28bd558e",
        transition: "background-color 0.3s ease"
      };
    }

    return { backgroundColor: "#d646464b" };
  };
  const PickLogo = ({ game, pickObj }) => {
    if (!pickObj) return <span style={{ color: "#9ca3af" }}>–</span>;
    if (pickObj.selection === "Draw") return <span style={{ fontSize: 9, fontWeight: 800, color: "#f50b0b" }}>Draw</span>;
    const logo = pickObj.selection === "Home" ? game.home_logo : game.away_logo;
    return <img src={logo} alt="" style={{ height: 20, width: 20, objectFit: "contain" }} />;
  };

  const GameHeader = ({ game }) => {
    const isLive = game.status.includes("HALF") || game.status.includes("PROGRESS");

    return (
      <div style={{ textAlign: "center", width: "100%", padding: "4px 0" }}>
        {/* Restored the flag-based VS view */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <img src={game.away_logo} alt="" height={20} />
          <span style={{ fontSize: 10, color: "#cbd5e1" }}>VS</span>
          <img src={game.home_logo} alt="" height={20} />
        </div>

        {/* Status and Score */}
        <div style={{ fontSize: 10, fontWeight: 700, marginTop: "4px" }}>
          {isLive && <span style={PULSE_STYLE} />}
          <span style={{ color: "white", marginLeft: isLive ? 4 : 0 }}>
            {game.away_score}-{game.home_score}
          </span>
        </div>

        {/* Winner Flag / Draw Indicator */}
        {game.result !== "Pending" && (
          <div style={{ marginTop: 2, height: 20 }}>
            {game.result === "Draw" ? (
              <span style={{ fontSize: 10, fontWeight: 800, color: "#f50b0b", lineHeight: "20px" }}>
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
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 8px 100px 8px" }}>
      <style>{`@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }`}</style>

      <h2 style={{ color: "#13447a", textAlign: "center", fontWeight: 800 }}>⚽ Group Stage Matrix</h2>

      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, background: "white", width: "max-content", minWidth: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, zIndex: 6, backgroundColor: "#13447a", color: "white", padding: "12px", minWidth: 120 }}>PLAYER</th>
              {games.map(g => (
                <th key={g.match_id} style={{ backgroundColor: "#13447a", color: "white", padding: "6px", minWidth: 90 }}>
                  <GameHeader game={g} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                <td style={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: "#f8fafc", padding: "10px", borderBottom: "1px solid #eee", borderRight: "2px solid #c89d3c" }}>
                  <strong style={{ color: "#13447a" }}>{idx + 1}. {user.name}</strong> <span style={{ fontSize: 11, color: "#666" }}>({user.points}pts)</span>
                </td>
                {games.map(game => (
                  <td key={game.match_id} style={{ textAlign: "center", borderBottom: "1px solid #eee", borderRight: "1px solid #f3f4f6", ...getCellStyle(game, pickMap[game.match_id]?.[user.id]) }}>
                    <PickLogo game={game} pickObj={pickMap[game.match_id]?.[user.id]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}