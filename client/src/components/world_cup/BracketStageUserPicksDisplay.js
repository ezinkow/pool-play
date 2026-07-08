import React, { useEffect, useState } from "react";
import axios from "axios";
import BracketStageRegion from "./BracketStageRegion";
import BracketStage from "./BracketStage";
import useAuth from "../../hooks/useAuth"; // Added useAuth

const GOLD = "#c89d3c";
const WORLDCUPGREEN = "#226750";
const LOCKDOWN_DATE = new Date("2026-06-28T14:00:00-05:00"); // Added Lockdown Constant

function WorldCupGroupBrackets() {
    const { user: currentUser } = useAuth(); // Added user hook
    const [games, setGames] = useState([]);
    const [standings, setStandings] = useState([]);
    const [viewedUser, setViewedUser] = useState("");
    const [userPicks, setUserPicks] = useState({});
    const [loading, setLoading] = useState(true);

    // Lockdown visibility logic
    const isLocked = new Date() < LOCKDOWN_DATE;
    const isMyBracket = String(viewedUser) === String(currentUser?.id);
    const showPicks = isMyBracket || !isLocked;

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

    useEffect(() => {
        if (!viewedUser) {
            setUserPicks({});
            return;
        }
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
        if (!viewedUser || game.round === 1) return game;

        // Hide picks logic
        if (!showPicks) return { ...game, home_team: "🔒", away_team: "🔒", home_logo: null, away_logo: null };

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
        return {
            ...game,
            home_team: home,
            away_team: away,
            home_logo: hl,
            away_logo: al,
            result: game.result,
            home_score: game.home_score,
            away_score: game.away_score,
            status: game.status
        };
    };

    if (loading) return <div style={{ padding: 80, textAlign: "center", color: WORLDCUPGREEN }}>Loading Group Matrix Standings...</div>;

    const champGame = games.find(g => g.round === 5);

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px" }}>
            {/* Header Scoreboard Analytics Row - ORIGINAL CSS */}
            <div style={{ background: "#1e293b", color: "white", padding: "16px 24px", borderRadius: 12, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div>
                        <span style={{ fontSize: 11, textTransform: "uppercase", tracking: "1px", color: "#94a3b8", fontWeight: 700 }}>Pool Viewer Mode</span>
                        <select
                            value={viewedUser}
                            onChange={e => setViewedUser(e.target.value)}
                            style={{ display: "block", marginTop: 4, padding: "8px 16px", borderRadius: 8, fontWeight: 700, backgroundColor: "#0f172a", color: "white", border: "1px solid #334155" }}
                        >
                            <option value="">📊 — Live Official Tournament Bracket —</option>
                            {standings.map((s, idx) => (
                                <option key={idx} value={s.user_id || s.id}>{s.name || s.entry_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* THE HORIZONTAL SCROLL CANVAS - ORIGINAL CSS */}
            <div style={{ width: "100%", overflowX: "auto", paddingBottom: "20px", WebkitOverflowScrolling: "touch" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", width: "max-content", margin: "0 auto", padding: "10px" }}>
                    <BracketStageRegion sideLabel="Left Side Path" games={getSideGames("left")} userPicks={showPicks ? userPicks : {}} readonly={false} flipped={false} getDisplayGame={getDisplayGame} onPick={null} />

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 220, flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: WORLDCUPGREEN, borderBottom: `2px solid ${GOLD}`, paddingBottom: 4, width: "100%", textAlign: "center" }}>🏆 CHAMPIONSHIP</div>
                        {champGame && <BracketStage game={getDisplayGame(champGame)} userPick={showPicks ? userPicks[champGame.match_id] : null} readonly={false} />}
                    </div>

                    <BracketStageRegion sideLabel="Right Side Path" games={getSideGames("right")} userPicks={showPicks ? userPicks : {}} readonly={false} flipped={true} getDisplayGame={getDisplayGame} onPick={null} />
                </div>
            </div>
        </div>
    );
}

export default WorldCupGroupBrackets;