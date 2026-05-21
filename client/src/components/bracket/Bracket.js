import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import BracketRegion from "../../components/bracket/BracketRegion";
import BracketGame from "../../components/bracket/BracketGame";

const GOLD = "#c89d3c";
const BLUE = "#13447a";
const LOCK_TIME = new Date("2026-03-19T11:10:00-05:00");
const ROUND_LABELS = {
    1: "1st Round", 2: "2nd Round", 3: "Sweet 16",
    4: "Elite 8", 5: "Final Four", 6: "Championship"
};
const TABS = ["South", "East", "Midwest", "West", "Final Four"];

export default function Bracket() {
    const [games, setGames] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPicks, setUserPicks] = useState({});
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    const isLocked = new Date() >= LOCK_TIME;
    const displayPicks = isLocked ? userPicks : {};

    useEffect(() => {
        Promise.all([
            axios.get("/api/bracket/games"),
            axios.get("/api/bracket/users"),
            axios.get("/api/bracket/standings"),
        ]).then(([gamesRes, usersRes, standingsRes]) => {
            setGames(gamesRes.data);
            setUsers(usersRes.data);
            setStandings(standingsRes.data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!selectedUser) { setUserPicks({}); return; }
        axios.get("/api/bracket/picks", { params: { name: selectedUser } })
            .then(res => {
                const map = {};
                for (const p of res.data) map[p.game_id] = p.pick;
                setUserPicks(map);
            });
    }, [selectedUser]);

    const gamesByRegion = (region) => games.filter(g => g.region === region);
    const finalFourGames = games.filter(g => g.round === 5);
    const championshipGame = games.find(g => g.round === 6);
    const getFeederGame = (game, side) => {
        const prevRound = game.round - 1;
        if (prevRound < 1) return null;
        if (!game.bracket_slot) return null;
        const slot1 = (game.bracket_slot - 1) * 2 + 1;
        const slot2 = (game.bracket_slot - 1) * 2 + 2;

        if (game.round === 5) {
            const regionPair = game.bracket_slot === 1 ? ["South", "East"] : ["Midwest", "West"];
            const feeders = games.filter(g => g.round === 4 && regionPair.includes(g.region))
                .sort((a, b) => {
                    const order = { South: 1, Midwest: 1, East: 0, West: 0 };
                    return order[a.region] - order[b.region];
                });
            return feeders[side === "home" ? 0 : 1] || null;
        }

        if (game.round === 6) {
            const feeders = games.filter(g => g.round === 5 && (g.bracket_slot === slot1 || g.bracket_slot === slot2));
            return feeders[side === "home" ? 1 : 0] || null;
        }

        let region = game.region;
        if (!region) {
            const candidates = games.filter(g => g.round === prevRound && (g.bracket_slot === slot1 || g.bracket_slot === slot2));
            const withPick = candidates.find(g => displayPicks[g.id]);
            region = withPick ? withPick.region : candidates[0]?.region;
        }
        if (!region) return null;

        const feeders = games.filter(g => g.region === region && g.round === prevRound && (g.bracket_slot === slot1 || g.bracket_slot === slot2));
        return feeders[side === "home" ? 1 : 0] || null;
    };

    const getDisplayGame = (game) => {
        if (!selectedUser) return game;
        if (game.round === 1) return game;

        let homeTeam = game.home_team;
        let awayTeam = game.away_team;
        let homeSeed = game.home_seed;
        let awaySeed = game.away_seed;
        let homeLogo = game.home_logo;
        let awayLogo = game.away_logo;

        const resolveTeam = (feederGame, pickedTeam) => {
            if (!feederGame || !pickedTeam) return {};
            if (feederGame.home_team === pickedTeam) return { seed: feederGame.home_seed, logo: feederGame.home_logo };
            if (feederGame.away_team === pickedTeam) return { seed: feederGame.away_seed, logo: feederGame.away_logo };
            const fromHome = resolveTeam(getFeederGame(feederGame, "home"), pickedTeam);
            if (fromHome.logo) return fromHome;
            return resolveTeam(getFeederGame(feederGame, "away"), pickedTeam);
        };

        if (homeTeam === "TBD" || !homeTeam) {
            const feeder = getFeederGame(game, "home");
            if (feeder) {
                const picked = displayPicks[feeder.id];
                if (picked) {
                    homeTeam = picked;
                    const { seed, logo } = resolveTeam(feeder, picked);
                    homeSeed = seed || null;
                    homeLogo = logo || null;
                }
            }
        }
        if (awayTeam === "TBD" || !awayTeam) {
            const feeder = getFeederGame(game, "away");
            if (feeder) {
                const picked = displayPicks[feeder.id];
                if (picked) {
                    awayTeam = picked;
                    const { seed, logo } = resolveTeam(feeder, picked);
                    awaySeed = seed || null;
                    awayLogo = logo || null;
                }
            }
        }
        return { ...game, home_team: homeTeam, away_team: awayTeam, home_seed: homeSeed, away_seed: awaySeed, home_logo: homeLogo, away_logo: awayLogo };
    };

    if (loading) return <div style={{ padding: 80, textAlign: "center", color: BLUE }}>Loading bracket...</div>;

    return (
        <div style={{ paddingTop: 68, paddingBottom: 40, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            {/* Header */}
            <div style={{
                background: `linear-gradient(135deg, ${BLUE} 0%, #1e5fa8 100%)`,
                color: "white", padding: "20px 24px", marginBottom: 24,
            }}>
                <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <h2 style={{ margin: 0, color: GOLD, fontWeight: 900, fontSize: "clamp(18px, 3vw, 28px)" }}>
                        🗂️ 2026 NCAA Bracket
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>View bracket:</span>
                            <select
                                value={selectedUser || ""}
                                onChange={e => setSelectedUser(e.target.value || null)}
                                disabled={!isLocked}
                                style={{
                                    padding: "6px 12px", borderRadius: 6,
                                    border: `2px solid ${GOLD}`, backgroundColor: "white",
                                    fontSize: 13, fontWeight: 600, color: BLUE, cursor: isLocked ? "pointer" : "not-allowed",
                                    opacity: isLocked ? 1 : 0.5,
                                }}
                            >
                                <option value="">— Actual Results —</option>
                                {standings.map(s => (
                                    <option key={s.name} value={s.name}>{s.name} ({s.points} pts)</option>
                                ))}
                            </select>
                        </div>
                        {!isLocked && (
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
                                Brackets visible after lock — Mar 19 at 11:10 AM CT
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* DESKTOP BRACKET */}
            <div className="bracket-desktop" style={{ overflowX: "hidden", padding: "0 8px" }}>
                <BracketScaler>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", width: 1600 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 40, flex: 1 }}>
                            <BracketRegion region="East" games={gamesByRegion("East")} userPicks={displayPicks} onPick={null} readonly={true} getDisplayGame={getDisplayGame} />
                            <BracketRegion region="South" games={gamesByRegion("South")} userPicks={displayPicks} onPick={null} readonly={true} getDisplayGame={getDisplayGame} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: 200, flexShrink: 0, paddingTop: 40 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: BLUE, textTransform: "uppercase", letterSpacing: "1px", borderBottom: `2px solid ${GOLD}`, paddingBottom: 4, width: "100%", textAlign: "center", marginBottom: 8 }}>
                                Final Four
                            </div>
                            {finalFourGames.map(g => (
                                <BracketGame key={g.id} game={getDisplayGame(g)} userPick={displayPicks?.[g.id]} onPick={null} readonly={true} />
                            ))}
                            <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", borderBottom: `2px solid ${GOLD}`, paddingBottom: 4, width: "100%", textAlign: "center", marginTop: 8 }}>
                                🏆 Championship
                            </div>
                            {championshipGame && (
                                <BracketGame game={getDisplayGame(championshipGame)} userPick={displayPicks?.[championshipGame.id]} onPick={null} readonly={true} />
                            )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 40, flex: 1 }}>
                            <BracketRegion region="West" games={gamesByRegion("West")} userPicks={displayPicks} onPick={null} readonly={true} flipped={true} getDisplayGame={getDisplayGame} />
                            <BracketRegion region="Midwest" games={gamesByRegion("Midwest")} userPicks={displayPicks} onPick={null} readonly={true} flipped={true} getDisplayGame={getDisplayGame} />
                        </div>
                    </div>
                </BracketScaler>
            </div>

            {/* MOBILE */}
            <div className="bracket-mobile" style={{ padding: "0 12px" }}>
                <MobileBracket games={games} userPicks={displayPicks} readonly={true} getDisplayGame={getDisplayGame} />
            </div>
        </div>
    );
}

function MobileBracket({ games, userPicks, readonly, getDisplayGame }) {
    const [activeTab, setActiveTab] = useState("South");
    const [collapsedRounds, setCollapsedRounds] = useState(new Set());

    const tabGames = activeTab === "Final Four"
        ? games.filter(g => g.round >= 5)
        : games.filter(g => g.region === activeTab);

    const byRound = {};
    for (const g of tabGames) {
        if (!byRound[g.round]) byRound[g.round] = [];
        byRound[g.round].push(g);
    }

    const toggleCollapse = (roundIdx) => {
        setCollapsedRounds(prev => {
            const next = new Set(prev);
            if (next.has(roundIdx)) next.delete(roundIdx);
            else next.add(roundIdx);
            return next;
        });
    };

    return (
        <div>
            {/* Tab bar */}
            <div style={{ display: "flex", overflowX: "auto", gap: 4, marginBottom: 16, paddingBottom: 4 }}>
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setCollapsedRounds(new Set()); }}
                        style={{
                            padding: "6px 12px", borderRadius: 20, border: "none",
                            fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer",
                            backgroundColor: activeTab === tab ? BLUE : "#e5e7eb",
                            color: activeTab === tab ? "white" : "#374151",
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Horizontal collapsing bracket */}
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingBottom: 16 }}>
                    {Object.keys(byRound).sort((a, b) => a - b).map((round, roundIdx) => {
                        const isCollapsed = collapsedRounds.has(roundIdx);
                        return (
                            <div key={round} style={{ flexShrink: 0 }}>
                                <div
                                    onClick={() => toggleCollapse(roundIdx)}
                                    style={{
                                        fontSize: 10, fontWeight: 700,
                                        color: isCollapsed ? BLUE : "#9ca3af",
                                        textAlign: "center", marginBottom: 6,
                                        textTransform: "uppercase", letterSpacing: "0.5px",
                                        whiteSpace: "nowrap", cursor: "pointer",
                                        padding: "2px 4px", borderRadius: 4,
                                        backgroundColor: isCollapsed ? "#eff6ff" : "transparent",
                                        userSelect: "none",
                                    }}>
                                    {isCollapsed ? "▶" : "▼"} {ROUND_LABELS[round].split(" ")[0]}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {byRound[round]
                                        .sort((a, b) => a.bracket_slot - b.bracket_slot)
                                        .map(game => {
                                            const displayGame = getDisplayGame ? getDisplayGame(game) : game;
                                            const pick = userPicks?.[game.id];
                                            if (isCollapsed) {
                                                const logo = pick === displayGame.home_team ? displayGame.home_logo
                                                    : pick === displayGame.away_team ? displayGame.away_logo
                                                        : null;
                                                return (
                                                    <div key={game.id}
                                                        onClick={() => toggleCollapse(roundIdx)}
                                                        style={{
                                                            width: 36, height: 48, borderRadius: 6,
                                                            border: `1px solid ${pick ? BLUE : "#e5e7eb"}`,
                                                            backgroundColor: pick ? "#eff6ff" : "#f9fafb",
                                                            display: "flex", alignItems: "center",
                                                            justifyContent: "center", cursor: "pointer",
                                                        }}>
                                                        {pick
                                                            ? logo
                                                                ? <img src={logo} width={20} height={20} alt="" style={{ objectFit: "contain" }} />
                                                                : <span style={{ fontSize: 8, fontWeight: 700, color: BLUE, textAlign: "center", padding: "0 2px", lineHeight: 1.2 }}>
                                                                    {pick.substring(0, 4)}
                                                                </span>
                                                            : <span style={{ fontSize: 10, color: "#d1d5db" }}>·</span>
                                                        }
                                                    </div>
                                                );
                                            }
                                            return (
                                                <BracketGame
                                                    key={game.id}
                                                    game={displayGame}
                                                    userPick={pick}
                                                    onPick={null}
                                                    readonly={readonly}
                                                />
                                            );
                                        })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function BracketScaler({ children }) {
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const update = () => {
            const available = window.innerWidth - 32;
            setScale(Math.min(1, available / 1600));
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);
    return (
        <div style={{ width: "100%", overflow: "hidden" }}>
            <div style={{
                width: 1600, transformOrigin: "top left",
                transform: `scale(${scale})`, paddingBottom: 40,
            }}>
                {children}
            </div>
        </div>
    );
}