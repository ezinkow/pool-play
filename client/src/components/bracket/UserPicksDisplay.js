import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

export default function PlayerPicksMatrix() {
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    axios.get("/api/bracket/games/finishedAndInProgress").then(r =>
      setGames(r.data.sort((a, b) => a.round - b.round || a.bracket_slot - b.bracket_slot))
    );
    axios.get("/api/bracket/picks/all").then(r => setPicks(r.data));
    axios.get("/api/bracket/standings").then(r => setStandings(r.data));
  }, []);

  useEffect(() => {
    document.body.classList.add("force-mobile");
    return () => document.body.classList.remove("force-mobile");
  }, []);

  const users = useMemo(() =>
    [...standings].sort((a, b) => b.points - a.points),
    [standings]);

  const pickMap = useMemo(() => {
    const map = {};
    for (const p of picks) {
      if (!map[p.game_id]) map[p.game_id] = {};
      map[p.game_id][p.name] = p;
    }
    return map;
  }, [picks]);

  const getCellStyle = (game, pickObj) => {
    if (!pickObj) return {};
    if (!game.winner) return {};
    return pickObj.pick === game.winner
      ? { backgroundColor: "#41ac618e" }
      : { backgroundColor: "#d646464b" };
  };

  const PickLogo = ({ game, pickObj }) => {
    if (!pickObj) return <span style={{ color: "#9ca3af" }}>–</span>;

    const logo = pickObj.pick === game.favorite ? game.fav_logo
      : pickObj.pick === game.underdog ? game.dog_logo
        : pickObj.pick === game.home_team ? game.home_logo
          : pickObj.pick === game.away_team ? game.away_logo
            : null;

    if (!logo) return <span style={{ fontSize: 11 }}>{pickObj.pick}</span>;
    return (
      <img
        src={logo}
        alt={pickObj.pick}
        title={pickObj.pick}
        style={{ height: 22, width: 22, objectFit: "contain", display: "block", margin: "auto" }}
      />
    );
  };

  const ROUND_LABELS = {
    1: "R1", 2: "R2", 3: "S16", 4: "E8", 5: "FF", 6: "NCG"
  };

  const GameHeader = ({ game }) => {
    const winnerLogo = game.winner === game.home_team ? game.home_logo
      : game.winner === game.away_team ? game.away_logo
        : null;

    return (
      <div style={{ textAlign: "center", width: "100%", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.15)" }}>
        {/* Row 1: round label */}
        <div style={{ fontSize: 8, color: "#cbd5e1", padding: "1px 0", fontWeight: 700 }}>
          {ROUND_LABELS[game.round]} · {game.region}
        </div>
        {/* Row 2: away logo @ home logo */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, padding: "1px 2px" }}>
          <img src={game.away_logo} alt="" height={18} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: "#cbd5e1" }}>@</span>
          <img src={game.home_logo} alt="" height={18} style={{ flexShrink: 0 }} />
        </div>
        {/* Row 3: score */}
        <div style={{ fontSize: 10, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap" }}>
          {game.away_score != null ? `${game.away_score}-${game.home_score}` : ""}
        </div>
        {/* Row 4: winner logo */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, minHeight: 16 }}>
          {winnerLogo
            ? <img src={winnerLogo} alt="" height={13} style={{ flexShrink: 0 }} />
            : game.status === "STATUS_IN_PROGRESS" || game.status === "STATUS_HALFTIME"
              ? <span style={{ fontSize: 8, color: "#fca5a5", fontWeight: 700 }}>LIVE</span>
              : null
          }
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingTop: 97, paddingBottom: 80 }}>
      <div style={{
        position: "fixed", top: 65, left: 0, right: 0, zIndex: 3,
        backgroundColor: "#f8f7f4", padding: "4px 12px 6px",
        borderBottom: "1px solid #e5e7eb",
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ color: "var(--primary-navy)", fontSize: 14, fontWeight: 700, margin: 0 }}>Group Picks</h3>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#41ac618e", display: "inline-block" }} />Correct
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#d646464b", display: "inline-block" }} />Wrong
          </span>
        </div>
      </div>

      <table style={{ borderCollapse: "collapse", background: "white", width: "100%", fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{
              position: "sticky", top: 95, left: 0, zIndex: 5,
              backgroundColor: "#13447a", color: "white",
              borderBottom: "2px solid #c89d3c", borderRight: "2px solid #c89d3c",
              whiteSpace: "nowrap", textTransform: "uppercase",
              fontSize: 12, letterSpacing: "0.5px",
              padding: "8px 12px", minWidth: 90, textAlign: "center",
            }}>Player</th>
            {games.map(g => (
              <th key={g.id} style={{
                position: "sticky", top: 95, zIndex: 4,
                backgroundColor: "#13447a", color: "white",
                borderBottom: "2px solid #c89d3c",
                padding: "4px 2px", textAlign: "left",
                whiteSpace: "nowrap", textTransform: "uppercase",
                fontSize: 12, letterSpacing: "0.5px", overflow: "hidden"
              }}>
                <GameHeader game={g} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr key={user.name}>
              <td style={{
                position: "sticky", left: 0, zIndex: 2,
                backgroundColor: "white",
                borderRight: "2px solid var(--accent-gold)",
                borderBottom: "1px solid #f3f4f6",
                padding: "6px 8px", minWidth: 110, maxWidth: 110, width: 110,
                whiteSpace: "nowrap",
              }}>
                <span style={{ fontSize: 13 }}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                </span>
                {" "}
                <span style={{
                  fontWeight: 700, fontSize: 12, color: "var(--primary-navy)",
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", maxWidth: 55,
                  display: "inline-block", verticalAlign: "middle",
                }}>
                  {user.name}
                </span>
                {" "}
                <span style={{ fontSize: 11, color: "#6b7280" }}>({user.points})</span>
              </td>
              {games.map(game => {
                const pickObj = pickMap?.[game.id]?.[user.name];
                return (
                  <td key={user.name + game.id} style={{
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
  );
}