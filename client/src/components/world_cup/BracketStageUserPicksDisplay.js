import React, { useEffect, useState } from "react";
import axios from "axios";
import BracketStageRegion from "./BracketStageRegion";
import BracketStage from "./BracketStage";

const GOLD = "#c89d3c";
const WORLDCUPGREEN = "#226750";

function WorldCupGroupBrackets() {
    const [games, setGames] = useState([]);
    const [standings, setStandings] = useState([]);
    const [viewedUser, setViewedUser] = useState(""); // Empty string defaults to "Live Results"
    const [userPicks, setUserPicks] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Left Bracket");

    useEffect(() => {
        Promise.all([
            axios.get("/api/worldcup/matches"),
            axios.get("/api/worldcup/standings")
        ]).then(([gamesRes, standingsRes]) => {
            const knockouts = gamesRes.data.filter(m => parseInt(m.round) > 0);
            setGames(knockouts);
            setStandings(standingsRes.data || []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    // Fetch selections when changing the profile viewer dropdown menu
    useEffect(() => {
        if (!viewedUser) {
            setUserPicks({}); // Clear picks to show actual live results
            return;
        }

        // Fetch picks targeting user_id or handle lookup by name
        axios.get("/api/worldcup/picks", { params: { user_id: viewedUser } })
            .then(res => {
                const map = {};
                for (const p of res.data) {
                    const idKey = p.match_id || p.game_id;
                    if (idKey) map[idKey] = p.selection || p.pick;
                }
                setUserPicks(map);
            });
    }, [viewedUser]);

    // Track chosen points metadata card info
    const currentProfileStats = standings.find(s => String(s.user_id) === String(viewedUser));

    const getSideGames = (side) => {
        return games.filter(g => {
            if (g.round >= 5) return false;
            const totalGamesInRound = 32 / Math.pow(2, g.round);
            return side === "left" ? g.bracket_slot <= (totalGamesInRound / 2) : g.bracket_slot > (totalGamesInRound / 2);
        });
    };

    const getFeederGame = (game, side) => {
        if (parseInt(game.round) === 1) return null;
        if (game.round === 5 || game.round === 6) {
            const semis = games.filter(g => g.round === 4);
            return semis.find(g => g.bracket_slot === (side === "home" ? 1 : 2)) || null;
        }
        const prevRound = game.round - 1;
        const slot1 = (game.bracket_slot - 1) * 2 + 1;
        const slot2 = (game.bracket_slot - 1) * 2 + 2;
        const feeders = games.filter(g => g.round === prevRound && (g.bracket_slot === slot1 || g.bracket_slot === slot2));
        return feeders[side === "home" ? 0 : 1] || null;
    };

    const getDisplayGame = (game) => {
        // If viewing live results, do not calculate predictions layers
        if (!viewedUser || game.round === 1) return game;

        let { home_team: home, away_team: away, home_logo: hl, away_logo: al } = game;

        const resolveTeam = (feeder, target) => {
            if (!feeder || !target) return {};
            if (feeder.home_team === target) return { logo: feeder.home_logo };
            if (feeder.away_team === target) return { logo: feeder.away_logo };
            return resolveTeam(getFeederGame(feeder, "home"), target).logo
                ? resolveTeam(getFeederGame(feeder, "home"), target)
                : resolveTeam(getFeederGame(feeder, "away"), target);
        };

        if (!home || home === "TBD") {
            const f = getFeederGame(game, "home");
            if (f && userPicks[f.match_id]) {
                home = userPicks[f.match_id];
                hl = resolveTeam(f, home).logo || null;
            }
        }
        if (!away || away === "TBD") {
            const f = getFeederGame(game, "away");
            if (f && userPicks[f.match_id]) {
                away = userPicks[f.match_id];
                al = resolveTeam(f, away).logo || null;
            }
        }
        return { ...game, home_team: home, away_team: away, home_logo: hl, away_logo: al };
    };

    if (loading) return <div style={{ padding: 80, textAlign: "center", color: WORLDCUPGREEN }}>Loading Group Matrix Standings...</div>;

    const champGame = games.find(g => g.round === 5);
    const thirdGame = games.find(g => g.round === 6);

    return (
        <div style={{ paddingTop: 20, paddingBottom: 100, backgroundColor: "#f8fafc" }}>
            {/* Header Scoreboard Analytics Row */}
            <div style={{ background: "#1e293b", color: "white", padding: "16px 24px", borderRadius: 12, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div>
                        <span style={{ fontSize: 11, textTransform: "uppercase", tracking: "1px", color: "#94a3b8", fontWeight: 700 }}>Pool Viewer Mode</span>
                        <select
                            value={viewedUser}
                            onChange={e => setViewedUser(e.target.value)}
                            style={{ display: "block", marginTop: 4, padding: "8px 16px", borderRadius: 8, fontWeight: 700, backgroundColor: "#0f172a", color: "white", border: "1px solid #334155" }}
                        >
                            <option value="">📊 — Live Official Tournament Bracket —</option>

                            {/* FIX: Use fallback indexing to guarantee unique key identifiers */}
                            {standings.map((s, idx) => {
                                const uniqueKey = s.user_id || s.id || `user-row-${idx}`;
                                return (
                                    <option key={uniqueKey} value={s.user_id || s.id || ""}>
                                        {s.name || s.entry_name || `User Profile ${idx + 1}`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* DYNAMIC POINTS SCOREBOARD SHEET HEADERS */}
                    {viewedUser && currentProfileStats && (
                        <div style={{ display: "flex", gap: 12, borderLeft: "2px solid #334155", paddingLeft: 16, marginTop: 14 }}>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>GROUP STAGE PTS</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>{currentProfileStats.group_points || 0}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>BRACKET STAGE PTS</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "#38bdf8" }}>{currentProfileStats.bracket_points || 0}</div>
                            </div>
                            <div style={{ textAlign: "center", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 10px", borderRadius: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>TOTAL POOL POINTS</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "#4ade80" }}>{currentProfileStats.total_points || (parseInt(currentProfileStats.group_points || 0) + parseInt(currentProfileStats.bracket_points || 0))}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Canvas Display */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", width: 1650, margin: "0 auto" }}>
                <BracketStageRegion sideLabel="Left Side Path" games={getSideGames("left")} userPicks={userPicks} readonly={true} flipped={false} getDisplayGame={getDisplayGame} onPick={null} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 220, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: WORLDCUPGREEN, borderBottom: `2px solid ${GOLD}`, paddingBottom: 4, width: "100%", textAlign: "center" }}>🏆 CHAMPIONSHIP</div>
                    {champGame && <BracketStage game={getDisplayGame(champGame)} userPick={userPicks[champGame.match_id]} readonly={true} />}
                    {champGame && userPicks[champGame.match_id] && userPicks[champGame.match_id] !== "TBD" && (
                        <div style={{
                            marginTop: 16,
                            width: "100%",
                            textAlign: "center",
                            padding: "16px 12px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                            border: `2px solid ${GOLD}`,
                            boxShadow: `0 10px 25px rgba(200, 157, 60, 0.25)`,
                            animation: "fadeIn 0.4s ease-out"
                        }}>
                            <div style={{ fontSize: "10px", fontWeight: 800, color: GOLD, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
                                👑 PREDICTED CHAMPION
                            </div>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                {(() => {
                                    const finalGameData = getDisplayGame(champGame);
                                    const champLogo = userPicks[champGame.match_id] === finalGameData.home_team ? finalGameData.home_logo : finalGameData.away_logo;
                                    return champLogo && <img src={champLogo} alt="" style={{ height: 22, width: 32, objectFit: "contain", borderRadius: 2 }} />;
                                })()}

                                <span style={{ fontSize: "20px", fontWeight: 900, color: "white", letterSpacing: "-0.5px" }}>
                                    {userPicks[champGame.match_id]}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <BracketStageRegion sideLabel="Right Side Path" games={getSideGames("right")} userPicks={userPicks} readonly={true} flipped={true} getDisplayGame={getDisplayGame} onPick={null} />
            </div>
        </div>
    );
}

export default WorldCupGroupBrackets;