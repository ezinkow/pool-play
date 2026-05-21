import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const GOLD = "#c89d3c";
const BLUE = "#13447a";
const DARK = "#030831";
const LOCK_TIME = new Date("2026-03-19T16:10:00Z");
const CHAMP_TIPOFF = new Date("2026-04-07T02:20:00Z");

const ROUND_LABELS = {
    1: "1st Round", 2: "2nd Round", 3: "Sweet 16",
    4: "Elite 8", 5: "Final Four", 6: "Championship"
};

const REGION_ORDER = ["East", "South", "Midwest", "West", "Final Four"];

function formatET(iso) {
    if (!iso) return "TBD";
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "numeric", day: "numeric",
        hour: "numeric", minute: "2-digit",
    });
}

function resolveTeamMeta(teamName, games) {
    for (const g of games) {
        if (g.home_team === teamName) return { seed: g.home_seed, logo: g.home_logo };
        if (g.away_team === teamName) return { seed: g.away_seed, logo: g.away_logo };
    }
    return {};
}

function resolveTeams(game, games, picks) {
    if (game.round === 1) {
        return {
            home: { name: game.home_team, seed: game.home_seed, logo: game.home_logo },
            away: { name: game.away_team, seed: game.away_seed, logo: game.away_logo },
        };
    }
    const homeReal = game.home_team && game.home_team !== "TBD";
    const awayReal = game.away_team && game.away_team !== "TBD";
    if (homeReal && awayReal) {
        return {
            home: { name: game.home_team, seed: game.home_seed, logo: game.home_logo },
            away: { name: game.away_team, seed: game.away_seed, logo: game.away_logo },
        };
    }
    const feeders = getFeeders(game, games);
    const resolveSlot = (feeder, existing, existingSeed, existingLogo) => {
        if (existing && existing !== "TBD") return { name: existing, seed: existingSeed, logo: existingLogo };
        if (!feeder) return { name: "TBD", seed: null, logo: null };
        const picked = picks[feeder.id];
        if (!picked) return { name: "TBD", seed: null, logo: null };
        const meta = resolveTeamMeta(picked, games);
        return { name: picked, seed: meta.seed ?? null, logo: meta.logo ?? null };
    };
    return {
        home: resolveSlot(feeders.home, game.home_team, game.home_seed, game.home_logo),
        away: resolveSlot(feeders.away, game.away_team, game.away_seed, game.away_logo),
    };
}

function getFeeders(game, games) {
    if (!game.bracket_slot) return { home: null, away: null };
    const slot1 = (game.bracket_slot - 1) * 2 + 1;
    const slot2 = (game.bracket_slot - 1) * 2 + 2;
    const prevRound = game.round - 1;
    if (game.round === 5) {
        const regionPair = game.bracket_slot === 1 ? ["East", "South"] : ["West", "Midwest"];
        const e8s = games.filter(g => g.round === 4 && regionPair.includes(g.region));
        return {
            home: e8s.find(g => g.region === regionPair[0]) ?? null,
            away: e8s.find(g => g.region === regionPair[1]) ?? null,
        };
    }
    if (game.round === 6) {
        const ff = games.filter(g => g.round === 5);
        return {
            home: ff.find(g => g.bracket_slot === 1) ?? null,
            away: ff.find(g => g.bracket_slot === 2) ?? null,
        };
    }
    const regionGames = games.filter(g => g.region === game.region && g.round === prevRound);
    return {
        home: regionGames.find(g => g.bracket_slot === slot1) ?? null,
        away: regionGames.find(g => g.bracket_slot === slot2) ?? null,
    };
}

function clearDownstream(picksMap, removedTeam, fromRound, games) {
    for (const g of games) {
        if (picksMap[g.id] === removedTeam && g.round > fromRound) {
            const old = picksMap[g.id];
            delete picksMap[g.id];
            if (old) clearDownstream(picksMap, old, g.round, games);
        }
    }
}

function PickCard({ game, games, picks, onPick, isLocked }) {
    const { home, away } = resolveTeams(game, games, picks);
    const userPick = picks[game.id];
    const hasPick = !!userPick;
    const isInProgress = game.status === "STATUS_IN_PROGRESS" || game.status === "STATUS_HALFTIME";
    const isFinal = game.status === "STATUS_FINAL";
    const showScore = isInProgress || isFinal;

    const pointsEarned = (() => {
        if (!isFinal || !game.winner || userPick !== game.winner) return null;
        const roundPts = game.round_points || game.round || 1;
        const winningSeed = game.winner === game.home_team ? game.home_seed : game.away_seed;
        return roundPts + (winningSeed || 0);
    })();

    const roundPts = game.round_points || game.round || 1;

    // Border color: green if correct, red if wrong and final, navy if pick pending, gray if no pick
    const borderColor = (() => {
        if (pointsEarned !== null) return "#16a34a";
        if (isFinal && userPick && userPick !== game.winner) return "#dc2626";
        if (hasPick) return BLUE;
        return "#e5e7eb";
    })();

    const TeamButton = ({ team, side }) => {
        const isTBD = !team.name || team.name === "TBD";
        const selected = userPick === team.name;
        const isWinner = isFinal && game.winner === team.name;
        const isLoser = isFinal && game.winner && game.winner !== team.name;
        const disabled = isLocked || isTBD;
        const userPickedThis = selected;
        const userPickedWrong = userPickedThis && isLoser;
        const userPickedRight = userPickedThis && isWinner;

        return (
            <button
                onClick={() => !disabled && onPick && onPick(game.id, team.name, game.round)}
                style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 10px", borderRadius: 7, flex: 1,
                    border: selected
                        ? `2px solid ${userPickedRight ? "#16a34a" : userPickedWrong ? "#dc2626" : BLUE}`
                        : "1px solid #e5e7eb",
                    backgroundColor: userPickedRight ? "#f0fdf4" : userPickedWrong ? "#fef2f2" : selected ? "#eff6ff" : "white",
                    cursor: disabled ? "default" : "pointer",
                    fontWeight: selected ? 700 : 400,
                    color: isTBD ? "#9ca3af" : userPickedRight ? "#16a34a" : userPickedWrong ? "#dc2626" : selected ? BLUE : "#374151",
                    opacity: (!selected && isLoser) ? 0.35 : 1,
                    minWidth: 0, overflow: "hidden",
                    transition: "all 0.15s",
                }}
            >
                {team.logo
                    ? <img src={team.logo} width={20} height={20} alt="" style={{ objectFit: "contain", flexShrink: 0 }} />
                    : <span style={{ width: 20, height: 20, flexShrink: 0 }} />
                }
                <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                    {team.seed && <sup style={{ fontSize: 8, color: "#9ca3af", marginRight: 2 }}>{team.seed}</sup>}
                    {isTBD ? "TBD" : team.name}
                </span>
                {showScore && (
                    <span style={{
                        marginLeft: "auto", fontSize: 12, fontWeight: 700,
                        color: isWinner ? "#16a34a" : "#6b7280", flexShrink: 0,
                    }}>
                        {side === "home" ? game.home_score : game.away_score}
                    </span>
                )}
                {isWinner && (
                    <span style={{ fontSize: 11, color: "#16a34a", flexShrink: 0, marginLeft: showScore ? 4 : "auto" }}>✓</span>
                )}
            </button>
        );
    };

    return (
        <div style={{
            background: "white", borderRadius: 10, padding: "10px 12px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 8,
            borderLeft: `4px solid ${borderColor}`,
        }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7, flexWrap: "wrap" }}>
                <span style={{
                    fontSize: 10, fontWeight: 700, color: "white", backgroundColor: BLUE,
                    borderRadius: 4, padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.4px",
                }}>
                    {ROUND_LABELS[game.round]}
                </span>
                {game.region !== "Final Four" && (
                    <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{game.region}</span>
                )}

                {/* Points display */}
                {pointsEarned !== null ? (
                    <span style={{
                        fontSize: 11, fontWeight: 800, color: "#16a34a",
                        backgroundColor: "#f0fdf4", borderRadius: 5,
                        padding: "2px 7px", border: "1px solid #bbf7d0",
                    }}>
                        +{pointsEarned} pts ✓
                    </span>
                ) : isFinal && userPick && userPick !== game.winner ? (
                    <span style={{
                        fontSize: 11, fontWeight: 700, color: "#dc2626",
                        backgroundColor: "#fef2f2", borderRadius: 5,
                        padding: "2px 7px", border: "1px solid #fecaca",
                    }}>
                        0 pts ✗
                    </span>
                ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>
                        {roundPts} pt{roundPts !== 1 ? "s" : ""}
                    </span>
                )}

                {/* Status */}
                {isInProgress && (
                    <span style={{ fontSize: 10, color: "#f97316", fontWeight: 700, marginLeft: "auto" }}>
                        🔴 LIVE — {game.game_clock}
                    </span>
                )}
                {game.status === "STATUS_HALFTIME" && (
                    <span style={{ fontSize: 10, color: "#f97316", fontWeight: 700, marginLeft: "auto" }}>
                        🔴 Halftime
                    </span>
                )}
                {isFinal && (
                    <span style={{ fontSize: 10, color: "#6b7280", marginLeft: "auto" }}>Final</span>
                )}
                {!showScore && game.game_date && (
                    <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto" }}>{formatET(game.game_date)}</span>
                )}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
                <TeamButton team={away} side="away" />
                <TeamButton team={home} side="home" />
            </div>
        </div>
    );
}

export default function MyBracket() {
    const [games, setGames] = useState([]);
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState("SELECT YOUR NAME");
    const [password, setPassword] = useState("");
    const [authenticated, setAuthenticated] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [picks, setPicks] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [collapsedRounds, setCollapsedRounds] = useState(new Set());
    const [tiebreakerWin, setTiebreakerWin] = useState("");
    const [tiebreakerLoss, setTiebreakerLoss] = useState("");
    const [tiebreakerSaved, setTiebreakerSaved] = useState(false);

    const isLocked = new Date() >= LOCK_TIME;
    const isTiebreakerLocked = new Date() >= CHAMP_TIPOFF;
    const showTiebreaker = isLocked && !isTiebreakerLocked;

    const loadTiebreaker = async (name) => {
        try {
            const res = await axios.get("/api/bracket/tiebreaker", { params: { name } });
            if (res.data) {
                setTiebreakerWin(res.data.win_score ?? "");
                setTiebreakerLoss(res.data.loss_score ?? "");
            }
        } catch { }
    };

    useEffect(() => {
        axios.get("/api/bracket/games").then(res => setGames(res.data));
        axios.get("/api/bracket/users").then(res =>
            setUsers(res.data.sort((a, b) => a.name.localeCompare(b.name)))
        );
        const saved = localStorage.getItem("rememberedUserBracket");
        if (saved) {
            const { name, token } = JSON.parse(saved);
            axios.post("/api/bracket/users/verify-token", { name, token })
                .then(res => {
                    if (res.data.success) {
                        setUser(name);
                        setAuthenticated(true);
                        loadTiebreaker(name);
                    } else localStorage.removeItem("rememberedUserBracket");
                })
                .catch(() => localStorage.removeItem("rememberedUserBracket"));
        }
    }, []);

    useEffect(() => {
        if (!authenticated || user === "SELECT YOUR NAME" || games.length === 0) return;
        setLoading(true);
        axios.get("/api/bracket/picks", { params: { name: user } })
            .then(res => {
                const map = {};
                for (const p of res.data) map[p.game_id] = p.pick;
                setPicks(map);
            })
            .finally(() => setLoading(false));
    }, [authenticated, user, games]);

    const verify = async () => {
        try {
            const res = await axios.post("/api/bracket/users/verify", { name: user, password });
            if (!res.data.success) return toast.error("Wrong password");
            setAuthenticated(true);
            toast.success("Identity verified!");
            if (rememberMe) {
                localStorage.setItem("rememberedUserBracket", JSON.stringify({ name: user, token: res.data.token }));
            }
            loadTiebreaker(user);
        } catch { toast.error("Verify failed"); }
    };

    const logout = async () => {
        const saved = localStorage.getItem("rememberedUserBracket");
        if (saved) {
            const { token } = JSON.parse(saved);
            await axios.post("/api/bracket/users/logout", { token });
            localStorage.removeItem("rememberedUserBracket");
        }
        setAuthenticated(false);
        setUser("SELECT YOUR NAME");
        setPicks({});
        setTiebreakerWin("");
        setTiebreakerLoss("");
    };

    const handlePick = (gameId, teamName, fromRound) => {
        if (isLocked || !authenticated) return;
        setPicks(prev => {
            const next = { ...prev };
            const oldPick = prev[gameId];
            if (oldPick && oldPick !== teamName) clearDownstream(next, oldPick, fromRound, games);
            next[gameId] = teamName;
            return next;
        });
    };

    const handleSave = async () => {
        if (isLocked) return toast.error("Bracket is locked");
        setSaving(true);
        try {
            await axios.post("/api/bracket/picks/bulk", {
                name: user,
                picks: Object.entries(picks).map(([game_id, pick]) => ({ game_id, pick }))
            });
            toast.success("Bracket saved!");
        } catch { toast.error("Save failed"); }
        finally { setSaving(false); }
    };

    const handleSaveTiebreaker = async () => {
        if (!tiebreakerWin || !tiebreakerLoss) return toast.error("Enter both scores");
        try {
            await axios.post("/api/bracket/tiebreaker", {
                name: user,
                win_score: parseInt(tiebreakerWin),
                loss_score: parseInt(tiebreakerLoss),
            });
            setTiebreakerSaved(true);
            toast.success("Tiebreaker saved!");
            setTimeout(() => setTiebreakerSaved(false), 3000);
        } catch { toast.error("Save failed"); }
    };

    const groupedGames = React.useMemo(() => {
        const groups = {};
        for (const region of REGION_ORDER) groups[region] = {};
        for (const g of games) {
            const region = g.round >= 5 ? "Final Four" : g.region;
            if (!groups[region]) groups[region] = {};
            if (!groups[region][g.round]) groups[region][g.round] = [];
            groups[region][g.round].push(g);
        }
        for (const region of Object.keys(groups)) {
            for (const round of Object.keys(groups[region])) {
                groups[region][round].sort((a, b) => (a.bracket_slot ?? 0) - (b.bracket_slot ?? 0));
            }
        }
        return groups;
    }, [games]);

    const totalGames = games.length;
    const pickedCount = Object.keys(picks).length;
    const champion = (() => {
        const cg = games.find(g => g.round === 6);
        return cg ? picks[cg.id] : null;
    })();

    // Total points earned so far (mirrors standings route logic)
    const totalPoints = React.useMemo(() => {
        let pts = 0;
        for (const g of games) {
            if (g.status !== "STATUS_FINAL" || !g.winner) continue;
            const pick = picks[g.id];
            if (pick !== g.winner) continue;
            const roundPts = g.round_points || g.round || 1;
            const winningSeed = g.winner === g.home_team ? g.home_seed : g.away_seed;
            pts += roundPts + (winningSeed || 0);
        }
        return pts;
    }, [games, picks]);

    const toggleRound = (key) => {
        setCollapsedRounds(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    return (
        <div style={{ paddingTop: 68, paddingBottom: 80, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            <Toaster />

            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${DARK} 100%)`, color: "white", padding: "20px 24px", marginBottom: 20 }}>
                <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h2 style={{ margin: 0, color: GOLD, fontWeight: 900 }}>📝 My Bracket</h2>
                        {isLocked
                            ? <div style={{ marginTop: 6, fontSize: 13, color: "#fca5a5" }}>🔒 Bracket locked — tournament has started</div>
                            : <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Locks March 19 at 11:10 AM CT</div>
                        }
                    </div>
                    {!authenticated ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <select value={user} onChange={e => setUser(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13 }}>
                                <option value="SELECT YOUR NAME" disabled>SELECT YOUR NAME</option>
                                {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                            </select>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Password" onKeyDown={e => e.key === "Enter" && verify()}
                                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, minWidth: 120 }} />
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "white", cursor: "pointer" }}>
                                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                                Remember me
                            </label>
                            <button onClick={verify}
                                style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: GOLD, color: BLUE, border: "none", fontWeight: 700, cursor: "pointer" }}>
                                Verify
                            </button>
                            <button onClick={() => { window.location.hash = "#/bracket/change-password"; }}
                                style={{ padding: "6px 10px", borderRadius: 6, backgroundColor: "white", color: "#6b7280", border: "1px solid #d1d5db", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                                Forgot Password?
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, color: GOLD }}>{user}</span>
                            {champion && <span style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>🏆 {champion}</span>}
                            {authenticated && games.some(g => g.status === "STATUS_FINAL") && (
                                <span style={{
                                    fontSize: 13, fontWeight: 800, color: GOLD,
                                    backgroundColor: "rgba(200,157,60,0.15)",
                                    borderRadius: 6, padding: "3px 10px",
                                    border: "1px solid rgba(200,157,60,0.4)",
                                }}>
                                    {totalPoints} pts
                                </span>
                            )}
                            {!isLocked && (
                                <button onClick={handleSave} disabled={saving}
                                    style={{ padding: "6px 16px", borderRadius: 6, backgroundColor: "#16a34a", color: "white", border: "none", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                                    {saving ? "Saving..." : "💾 Save"}
                                </button>
                            )}
                            <button onClick={logout}
                                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", color: "white", backgroundColor: "transparent" }}>
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 12px" }}>
                {!authenticated ? (
                    <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>Verify your identity above to make or view picks.</div>
                ) : loading ? (
                    <div style={{ textAlign: "center", padding: 60, color: BLUE }}>Loading your bracket...</div>
                ) : (
                    <>
                        {REGION_ORDER.map(region => {
                            const rounds = groupedGames[region];
                            if (!rounds || Object.keys(rounds).length === 0) return null;
                            return (
                                <div key={region} style={{ marginBottom: 28 }}>
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                                        borderBottom: `2px solid ${GOLD}`, paddingBottom: 6,
                                    }}>
                                        <h3 style={{ margin: 0, color: BLUE, fontWeight: 900, fontSize: 16 }}>{region}</h3>
                                    </div>
                                    {Object.keys(rounds).sort((a, b) => a - b).map(round => {
                                        const key = `${region}-${round}`;
                                        const isCollapsed = collapsedRounds.has(key);
                                        const roundGames = rounds[round];
                                        const roundPicked = roundGames.filter(g => picks[g.id]).length;
                                        const roundCorrect = roundGames.filter(g =>
                                            g.status === "STATUS_FINAL" && picks[g.id] === g.winner
                                        ).length;
                                        const roundFinished = roundGames.filter(g => g.status === "STATUS_FINAL").length;
                                        return (
                                            <div key={key} style={{ marginBottom: 12 }}>
                                                <div
                                                    onClick={() => toggleRound(key)}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: 8,
                                                        cursor: "pointer", marginBottom: isCollapsed ? 0 : 8,
                                                        userSelect: "none",
                                                    }}
                                                >
                                                    <span style={{ fontSize: 10, color: isCollapsed ? BLUE : "#9ca3af" }}>
                                                        {isCollapsed ? "▶" : "▼"}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 700, color: "#6b7280",
                                                        textTransform: "uppercase", letterSpacing: "0.5px",
                                                    }}>
                                                        {ROUND_LABELS[round]}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                                                        {roundFinished > 0 && `(${roundCorrect}/${roundFinished} correct)`}
                                                    </span>
                                                </div>
                                                {!isCollapsed && roundGames.map(game => (
                                                    <PickCard
                                                        key={game.id}
                                                        game={game}
                                                        games={games}
                                                        picks={picks}
                                                        onPick={handlePick}
                                                        isLocked={isLocked}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {/* Tiebreaker */}
                        {showTiebreaker && (
                            <div style={{
                                background: "white", borderRadius: 10, padding: "14px 16px",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                                border: `1px solid ${GOLD}`, marginTop: 8, marginBottom: 24,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: BLUE, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                                    🏆 Championship Score Tiebreaker
                                    {isTiebreakerLocked && <span style={{ color: "#dc2626", marginLeft: 6 }}>— Locked</span>}
                                </div>
                                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px 0" }}>
                                    Predict the final score of the Championship game. Used to break ties in standings.
                                </p>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                    <input type="number" value={tiebreakerWin} onChange={e => setTiebreakerWin(e.target.value)}
                                        disabled={isTiebreakerLocked} placeholder="Win"
                                        style={{ width: 70, padding: "6px 4px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontWeight: 700, textAlign: "center" }} />
                                    <span style={{ color: "#9ca3af" }}>—</span>
                                    <input type="number" value={tiebreakerLoss} onChange={e => setTiebreakerLoss(e.target.value)}
                                        disabled={isTiebreakerLocked} placeholder="Loss"
                                        style={{ width: 70, padding: "6px 4px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontWeight: 700, textAlign: "center" }} />
                                    {!isTiebreakerLocked && (
                                        <button onClick={handleSaveTiebreaker}
                                            style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: BLUE, color: "white", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                                            Save
                                        </button>
                                    )}
                                    {tiebreakerSaved && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ Saved</span>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}