import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

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
            return s.includes("FINAL") || s.includes("PROGRESS") || s.includes("HALF");
          })
          .filter(g => parseInt(g.round) === 0)
          // SORT: Newest first, left-to-right
          .sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

        setGames(filtered);
      });

      axios.get("/api/worldcup/picks/all").then(r => setPicks(r.data));
      axios.get("/api/worldcup/standings").then(r => setStandings(r.data));
    };

    fetchAll();
    const interval = setInterval(fetchAll, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const users = useMemo(() =>
    [...standings].sort((a, b) => b.points - a.points),
    [standings]);

  const pickMap = useMemo(() => {
    const map = {};
    for (const p of picks) {
      const mId = String(p.match_id);
      const uId = String(p.user_id);

      if (!map[mId]) map[mId] = {};
      map[mId][uId] = p;
    }
    return map;
  }, [picks]);

  const getCellStyle = (game, pickObj) => {
    if (!pickObj || game.result === "Pending") return {};
    const correct = pickObj.selection === game.result;
    if (correct) return { backgroundColor: "#41ac618e" };
    return { backgroundColor: "#d646464b" };
  };

  const PickLogo = ({ game, pickObj }) => {
    if (!pickObj) return <span style={{ color: "#9ca3af" }}>–</span>;
    if (pickObj.selection === "Draw") {
      return <span style={{ fontSize: 10, fontWeight: 800, color: "#b45309" }}>DRAW</span>;
    }
    const logo = pickObj.selection === "Home" ? game.home_logo : game.away_logo;
    const displayName = pickObj.selection === "Home" ? game.home_team : game.away_team;

    if (!logo) return <span style={{ fontSize: 11 }}>{displayName}</span>;
    return (
      <img
        src={logo}
        alt={displayName}
        title={displayName}
        style={{ height: 22, width: 22, objectFit: "contain", display: "block", margin: "auto" }}
      />
    );
  };

  const GameHeader = ({ game }) => {
    return (
      <div style={{ textAlign: "center", width: "100%", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "4px", padding: "4px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, padding: "1px 2px" }}>
          <img src={game.away_logo} alt="" height={18} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: "#cbd5e1" }}>@</span>
          <img src={game.home_logo} alt="" height={18} style={{ flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", marginTop: "2px" }}>
          {game.status === "STATUS_FINAL" || game.status === "STATUS_IN_PROGRESS"
            ? `${game.away_score}-${game.home_score}` : "VS"}
        </div>
        <div style={{ fontSize: 8, fontWeight: 600, color: "#93c5fd", marginTop: "1px" }}>
          {game.status === "STATUS_IN_PROGRESS" ? "LIVE" : game.result === "Draw" ? "DRAW" : game.result !== "Pending" ? `${game.result} Win` : "PRE"}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "10px 12px 80px" }}>
      {/* Legend Block */}
      <div style={{
        backgroundColor: "#f8f7f4", padding: "12px",
        border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "16px"
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <h3 style={{ color: "#13447a", fontSize: 14, fontWeight: 700, margin: 0 }}>⚽ Group Stage Matrix</h3>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#41ac618e", display: "inline-block" }} />Correct
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#d646464b", display: "inline-block" }} />Incorrect
          </span>
        </div>
      </div>

      {/* The Wrapper Box that handles scrolling bounds safely */}
      <div style={{ overflow: "auto", maxHeight: "calc(100vh - 180px)", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, background: "white", width: "100%", fontSize: 14 }}>
          <thead>
            <tr>
              {/* Sticky Top-Left Player Header corner pin */}
              <th style={{
                position: "sticky", top: 0, left: 0, zIndex: 6,
                backgroundColor: "#13447a", color: "white",
                borderBottom: "2px solid #c89d3c", borderRight: "2px solid #c89d3c",
                whiteSpace: "nowrap", textTransform: "uppercase",
                fontSize: 12, letterSpacing: "0.5px", padding: "12px 16px",
                minWidth: 120, textAlign: "center",
              }}>Player</th>

              {/* Sticky Row-Header Match Elements */}
              {games.map(g => (
                <th key={g.match_id} style={{
                  position: "sticky", top: 0, zIndex: 4,
                  backgroundColor: "#13447a", color: "white",
                  borderBottom: "2px solid #c89d3c",
                  padding: "6px 8px", minWidth: "85px",
                  whiteSpace: "nowrap",
                }}>
                  <GameHeader game={g} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                {/* Sticky Column Player Label Cell */}
                <td style={{
                  position: "sticky", left: 0, zIndex: 2,
                  backgroundColor: "#f8fafc",
                  borderRight: "2px solid #c89d3c",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "10px 12px",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 13 }}>
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                  </span>
                  {" "}
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#13447a" }}>
                    {user.name}
                  </span>
                  {" "}
                  <span style={{ fontSize: 11, color: "#6b7280", fontWeight: "600" }}>({user.points}pts)</span>
                </td>

                {/* Matrix Selection Boxes */}
                {games.map(game => {
                  const pickObj = pickMap?.[String(game.match_id)]?.[String(user.id)];
                  return (
                    <td key={user.id + game.match_id} style={{
                      padding: "6px 4px", textAlign: "center", verticalAlign: "middle",
                      borderBottom: "1px solid #f3f4f6", borderRight: "1px solid #f3f4f6",
                      ...getCellStyle(game, pickObj),
                    }}>
                      <PickLogo game={game} pickObj={pickObj} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}