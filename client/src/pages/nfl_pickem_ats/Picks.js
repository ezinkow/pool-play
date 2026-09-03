import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function NflPickemAtsPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({}); // { game_id: { picked_team, is_best_bet, over_under_pick } }
    const [teamColors, setTeamColors] = useState({}); // { teamName: { color, secondaryColor, logo } }
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("kickoff"); // "kickoff", "team_asc", "team_desc", "fav_desc", "fav_asc"

    const token = localStorage.getItem("token");

    // Fetch team primary/secondary colors and branding mapping
    useEffect(() => {
        if (!token) return;
        axios.get("/api/nfl_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        color: t.color || t.primary_color || NFL_BLUE,
                        secondaryColor: t.secondary_color || t.alt_color || "#cbd5e1",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    // Fetch weekly schedule and user picks from database
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        axios.get("/api/nfl_pickem_ats/games", {
            params: { week: currentWeek },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setGames(res.data.games || []);
                setPicks(res.data.userPicks || {}); // Populates both picked_team & over_under_pick from DB
            })
            .catch(err => {
                console.error("Failed to load pickem games", err);
                toast.error("Failed to load matchups");
            })
            .finally(() => setLoading(false));
    }, [user, currentWeek, token]);

    // Filter out any games that have already kicked off (only show future games)
    const availableGames = games.filter(game => {
        if (!game.game_date) return true;
        const kickoffTime = new Date(game.game_date).getTime();
        const now = Date.now();
        return kickoffTime > now;
    });

    const bestBetCount = Object.values(picks).filter(p => p.is_best_bet).length;
    const selectedPicksCount = Object.values(picks).filter(p => p.picked_team).length;
    const selectedOuCount = Object.values(picks).filter(p => p.over_under_pick).length;
    const totalGamesCount = games.length;

    const handleTeamPick = (gameId, team, gameDate) => {
        if (gameDate && new Date() >= new Date(gameDate)) {
            toast.error("This game has already started. Pick is locked.");
            return;
        }

        setPicks(prev => {
            const currentPickedTeam = prev[gameId]?.picked_team;
            if (currentPickedTeam === team) {
                const copy = { ...prev };
                delete copy[gameId];
                return copy;
            }

            return {
                ...prev,
                [gameId]: {
                    ...prev[gameId],
                    picked_team: team,
                    is_best_bet: prev[gameId]?.is_best_bet || false
                }
            };
        });
    };

    const handleOverUnderPick = (gameId, ouChoice, gameDate) => {
        if (gameDate && new Date() >= new Date(gameDate)) {
            toast.error("This game has already started. Pick is locked.");
            return;
        }

        setPicks(prev => {
            const currentOu = prev[gameId]?.over_under_pick;
            const newOu = currentOu === ouChoice ? null : ouChoice;

            return {
                ...prev,
                [gameId]: {
                    ...prev[gameId],
                    over_under_pick: newOu
                }
            };
        });
    };

    const handleBestBetToggle = (gameId, gameDate) => {
        if (gameDate && new Date() >= new Date(gameDate)) {
            toast.error("This game has already started.");
            return;
        }

        const currentFlag = picks[gameId]?.is_best_bet || false;
        if (!currentFlag && bestBetCount >= 3) {
            toast.error("You can only select up to 3 Best Bets per week!");
            return;
        }

        if (!picks[gameId]?.picked_team) {
            toast.error("Select a team ATS before designating it as a Best Bet.");
            return;
        }

        setPicks(prev => ({
            ...prev,
            [gameId]: {
                ...prev[gameId],
                is_best_bet: !currentFlag
            }
        }));
    };

    const handleClearPicks = () => {
        if (window.confirm("Are you sure you want to clear all unstarted picks for this week?")) {
            const activeGameIds = new Set(availableGames.map(g => g.id));
            setPicks(prev => {
                const copy = { ...prev };
                Object.keys(copy).forEach(gameId => {
                    if (activeGameIds.has(Number(gameId))) {
                        delete copy[gameId];
                    }
                });
                return copy;
            });
            toast.success("Cleared picks for unlocked games");
        }
    };

    // Bulk Select Helpers (only applies to unlocked games)
    const handleSelectAll = (type) => {
        const updatedPicks = { ...picks };
        const now = new Date();

        availableGames.forEach(game => {
            const isLocked = game.game_date && now >= new Date(game.game_date);
            if (isLocked) return;

            if (type === "none") {
                if (updatedPicks[game.id]) {
                    delete updatedPicks[game.id].picked_team;
                    delete updatedPicks[game.id].over_under_pick;
                    if (!updatedPicks[game.id].is_best_bet && !updatedPicks[game.id].picked_team && !updatedPicks[game.id].over_under_pick) {
                        delete updatedPicks[game.id];
                    }
                }
                return;
            }

            if (type === "over" || type === "under") {
                updatedPicks[game.id] = {
                    ...updatedPicks[game.id],
                    over_under_pick: type === "over" ? "over" : "under"
                };
                return;
            }

            let targetTeam = null;
            const isAwayFav = game.favorite === game.away_team;
            const favoriteTeam = isAwayFav ? game.away_team : game.home_team;
            const underdogTeam = isAwayFav ? game.home_team : game.away_team;

            if (type === "favorites") {
                targetTeam = favoriteTeam;
            } else if (type === "underdogs") {
                targetTeam = underdogTeam;
            } else if (type === "home") {
                targetTeam = game.home_team;
            } else if (type === "away") {
                targetTeam = game.away_team;
            }

            if (targetTeam) {
                updatedPicks[game.id] = {
                    ...updatedPicks[game.id],
                    picked_team: targetTeam,
                    is_best_bet: updatedPicks[game.id]?.is_best_bet || false
                };
            }
        });

        setPicks(updatedPicks);
        toast.success(type === "none" ? "Cleared all unlocked picks!" : `Applied bulk selection for all unlocked games!`);
    };

    const isCriteriaActive = (type) => {
        if (availableGames.length === 0) return false;

        if (type === "none") {
            return availableGames.every(game => !picks[game.id]?.picked_team && !picks[game.id]?.over_under_pick);
        }

        if (type === "over" || type === "under") {
            const targetVal = type === "over" ? "over" : "under";
            return availableGames.every(game => picks[game.id]?.over_under_pick === targetVal);
        }

        return availableGames.every(game => {
            const userPick = picks[game.id]?.picked_team;
            if (!userPick) return false;

            const isAwayFav = game.favorite === game.away_team;
            const favoriteTeam = isAwayFav ? game.away_team : game.home_team;
            const underdogTeam = isAwayFav ? game.home_team : game.away_team;

            if (type === "favorites") return userPick === favoriteTeam;
            if (type === "underdogs") return userPick === underdogTeam;
            if (type === "home") return userPick === game.home_team;
            if (type === "away") return userPick === game.away_team;
            return false;
        });
    };

    // Sorting Logic
    const sortedGames = [...availableGames].sort((a, b) => {
        if (sortBy === "kickoff") {
            const dateA = a.game_date ? new Date(a.game_date) : new Date(0);
            const dateB = b.game_date ? new Date(b.game_date) : new Date(0);
            return dateA - dateB;
        } else if (sortBy === "team_asc") {
            return a.away_team.localeCompare(b.away_team);
        } else if (sortBy === "team_desc") {
            return b.away_team.localeCompare(a.away_team);
        } else if (sortBy === "fav_desc") {
            const spreadA = Math.abs(a.adjusted_spread !== null ? a.adjusted_spread : (a.spread || 0));
            const spreadB = Math.abs(b.adjusted_spread !== null ? b.adjusted_spread : (b.spread || 0));
            return spreadB - spreadA;
        } else if (sortBy === "fav_asc") {
            const spreadA = Math.abs(a.adjusted_spread !== null ? a.adjusted_spread : (a.spread || 0));
            const spreadB = Math.abs(b.adjusted_spread !== null ? b.adjusted_spread : (b.spread || 0));
            return spreadA - spreadB;
        }
        return 0;
    });

    const handleSubmitAll = async () => {
        if (bestBetCount !== 3) {
            toast.error(`You must select exactly 3 Best Bets before saving! (Currently selected: ${bestBetCount})`);
            return;
        }

        const activeGameIds = new Set(availableGames.map(g => String(g.id)));

        const formattedPicks = Object.keys(picks)
            .filter(gameId => activeGameIds.has(String(gameId)))
            .map(gameId => ({
                game_id: gameId,
                picked_team: picks[gameId].picked_team,
                is_best_bet: Boolean(picks[gameId].is_best_bet),
                ou_pick: picks[gameId].over_under_pick || null
            }));

        try {
            await axios.post("/api/nfl_pickem_ats/picks", {
                week: currentWeek,
                picks: formattedPicks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Week ${currentWeek} picks submitted successfully!`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to submit picks");
        }
    };

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, -apple-system, sans-serif" }}>Loading matchups...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_pickem_ats" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "12px 8px", paddingBottom: 100, paddingTop: 16, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <Toaster />

                {/* Sticky Header Summary Bar optimized for mobile */}
                <div style={{
                    position: "sticky",
                    top: "48px",
                    zIndex: 99,
                    background: "#ffffff",
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                    marginBottom: 12,
                    marginLeft: "-8px",
                    marginRight: "-8px",
                    paddingLeft: "8px",
                    paddingRight: "8px"
                }}>
                    <div style={{ textAlign: "center" }}>
                        <h2 style={{ color: NFL_BLUE, fontSize: "19px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 800 }}>
                            <span>🏈</span> NFL Pick'em ATS <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏈</span>
                        </h2>
                        <p style={{ color: "#666", marginTop: 2, marginBottom: 8, fontSize: "11px", lineHeight: 1.3 }}>
                            Make your ATS/O-U picks & assign exactly 3 Best Bets ⭐ (worth 2 points).
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
                            <div style={{ background: bestBetCount === 3 ? "#ecfdf5" : "#fef3c2", color: bestBetCount === 3 ? "#047857" : "#b45309", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                                Best Bets: {bestBetCount}/3
                            </div>
                            <div style={{ background: "#f8fafc", color: "#475569", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: "11px", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
                                Selected: {selectedPicksCount}/{totalGamesCount}
                            </div>
                            <div style={{ background: "#f8fafc", color: "#475569", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: "11px", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
                                O/U Selected: {selectedOuCount}/{totalGamesCount}
                            </div>
                            {sortedGames.length > 0 && (
                                <button
                                    onClick={handleSubmitAll}
                                    style={{
                                        background: "#16a34a",
                                        color: "white",
                                        border: "1px solid #15803d",
                                        padding: "4px 10px",
                                        borderRadius: 6,
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        boxShadow: "0 2px 4px rgba(22,163,74,0.25)"
                                    }}
                                >
                                    Save
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Week Selector Bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 6,
                    marginBottom: 12,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 4,
                    width: "100%"
                }}>
                    {[...Array(18)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentWeek(i + 1)}
                            style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === i + 1 ? NFL_BLUE : "white",
                                color: currentWeek === i + 1 ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600,
                                flexShrink: 0,
                                fontSize: "13px"
                            }}
                        >
                            W{i + 1}
                        </button>
                    ))}
                </div>

                {/* Controls Bar */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "white",
                    padding: "10px 12px",
                    borderRadius: 10,
                    marginBottom: 14,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    border: "1px solid #e2e8f0",
                    gap: 8
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>Sort:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{
                                    padding: "5px 8px",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    background: "#f8fafc",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    width: "100%",
                                    textOverflow: "ellipsis"
                                }}
                            >
                                <option value="kickoff">Kickoff Time</option>
                                <option value="team_asc">Away Team (A-Z)</option>
                                <option value="team_desc">Away Team (Z-A)</option>
                                <option value="fav_desc">Favorite Spread (High-Low)</option>
                                <option value="fav_asc">Favorite Spread (Low-High)</option>
                            </select>
                        </div>

                        {sortedGames.length > 0 && (
                            <button
                                onClick={handleClearPicks}
                                style={{
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                Clear Picks
                            </button>
                        )}
                    </div>

                    {/* Bulk Select Action Buttons Row - Fully wrapped layout for clean mobile fit */}
                    {sortedGames.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", paddingTop: 2 }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Select:</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, width: "100%" }}>
                                {[
                                    { key: "favorites", label: "Faves" },
                                    { key: "underdogs", label: "Dogs" },
                                    { key: "home", label: "Home" },
                                    { key: "away", label: "Away" },
                                    { key: "over", label: "All Over" },
                                    { key: "under", label: "All Under" },
                                    { key: "none", label: "None" }
                                ].map(action => {
                                    const active = isCriteriaActive(action.key);
                                    return (
                                        <button
                                            key={action.key}
                                            onClick={() => handleSelectAll(action.key)}
                                            style={{
                                                background: active ? NFL_BLUE : "#f1f5f9",
                                                color: active ? "white" : "#334155",
                                                border: active ? `1px solid ${NFL_BLUE}` : "1px solid #cbd5e1",
                                                padding: "6px 4px",
                                                borderRadius: 6,
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                textAlign: "center",
                                                whiteSpace: "nowrap",
                                                width: "100%"
                                            }}
                                        >
                                            {action.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Compact Games List or Notice */}
                {sortedGames.length === 0 ? (
                    <div style={{
                        background: "white",
                        borderRadius: 10,
                        padding: "30px 16px",
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                    }}>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                            Matchups for Week {currentWeek} are not yet available.
                        </p>
                        <p style={{ fontSize: "13px", color: "#64748b", marginTop: 6, marginBottom: 0 }}>
                            Schedules and odds typically appear two weeks out.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {sortedGames.map(game => {
                            const isLocked = game.game_date && new Date() >= new Date(game.game_date);
                            const userPick = picks[game.id] || {};
                            const isBestBet = userPick.is_best_bet;

                            const rawSpread = game.adjusted_spread !== null && game.adjusted_spread !== undefined ? game.adjusted_spread : game.spread;
                            const hasLine = rawSpread !== null && rawSpread !== undefined;
                            const absSpread = hasLine ? (Object.is(Math.abs(rawSpread), -0) ? 0 : Math.abs(rawSpread)) : null;
                            const isAwayFav = hasLine && game.favorite === game.away_team;

                            const awaySpreadStr = hasLine ? (absSpread === 0 ? "0" : (isAwayFav ? `-${absSpread}` : `+${absSpread}`)) : null;
                            const homeSpreadStr = hasLine ? (absSpread === 0 ? "0" : (isAwayFav ? `+${absSpread}` : `-${absSpread}`)) : null;

                            const awayTeamMeta = teamColors[game.away_team] || {};
                            const homeTeamMeta = teamColors[game.home_team] || {};

                            const awayLogo = game.away_logo || awayTeamMeta.logo || null;
                            const homeLogo = game.home_logo || homeTeamMeta.logo || null;

                            const awayColor = game.away_color || awayTeamMeta.color || "#1e3a8a";
                            const awaySecondary = game.away_secondary_color || awayTeamMeta.secondaryColor || "#cbd5e1";

                            const homeColor = game.home_color || homeTeamMeta.color || "#1e3a8a";
                            const homeSecondary = game.home_secondary_color || homeTeamMeta.secondaryColor || "#cbd5e1";

                            const favoriteTeam = game.favorite;
                            const favTeamMeta = teamColors[favoriteTeam] || {};
                            const favoriteLogo = favTeamMeta.logo || (favoriteTeam === game.away_team ? awayLogo : (favoriteTeam === game.home_team ? homeLogo : game.favorite_logo)) || null;

                            const isAwayPicked = userPick.picked_team === game.away_team;
                            const isHomePicked = userPick.picked_team === game.home_team;
                            const ouPick = userPick.over_under_pick;

                            return (
                                <div key={game.id} style={{
                                    background: "#ffffff",
                                    borderRadius: 10,
                                    boxShadow: isBestBet ? "0 4px 12px rgba(200, 157, 60, 0.25)" : "0 2px 5px rgba(0, 0, 0, 0.06)",
                                    border: isBestBet ? `2px solid ${GOLD}` : "1px solid #cbd5e1",
                                    overflow: "hidden",
                                    padding: "10px 10px"
                                }}>
                                    {/* Card Header Info */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 4 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: "10px", color: "#000000", fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>
                                                {game.game_date ? new Date(game.game_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase() : "TBD"}
                                            </span>

                                            <span style={{ fontSize: "10px", color: "#000000", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                                                <span style={{ color: "#64748b" }}>Spread:</span>
                                                {favoriteLogo && (
                                                    <span style={{
                                                        background: favTeamMeta.secondaryColor || homeSecondary,
                                                        borderRadius: 3,
                                                        padding: "1px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        border: `1px solid ${favTeamMeta.primaryColor || homeColor}`,
                                                        width: 15,
                                                        height: 15,
                                                        flexShrink: 0
                                                    }}>
                                                        <img
                                                            src={favoriteLogo}
                                                            alt={favoriteTeam || "Favorite"}
                                                            style={{ width: 10, height: 10, objectFit: "contain", display: "block" }}
                                                        />
                                                    </span>
                                                )}
                                                <strong>{rawSpread}</strong> | O/U: <strong>{game.over_under}</strong>
                                            </span>
                                            {isLocked && <span style={{ fontSize: "9px", color: NFL_RED, fontWeight: 700 }}>🔒</span>}
                                        </div>

                                        <div style={{ flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleBestBetToggle(game.id, game.game_date)}
                                                disabled={isLocked || !userPick.picked_team}
                                                style={{
                                                    background: userPick.is_best_bet ? GOLD : "#334155",
                                                    color: userPick.is_best_bet ? "white" : "#cbd5e1",
                                                    border: userPick.is_best_bet ? `1px solid ${GOLD}` : "1px solid #475569",
                                                    padding: "3px 8px",
                                                    borderRadius: 5,
                                                    fontWeight: 700,
                                                    fontSize: "10px",
                                                    cursor: (isLocked || !userPick.picked_team) ? "not-allowed" : "pointer",
                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                {userPick.is_best_bet ? "★ Best" : "☆ Best"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Side-by-Side Team Selection Box Container */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                                        {/* Away Team Option Box */}
                                        <div
                                            onClick={() => !isLocked && handleTeamPick(game.id, game.away_team, game.game_date)}
                                            style={{
                                                backgroundImage: isAwayPicked
                                                    ? `linear-gradient(to right, ${awayColor} 100%, ${awayColor} 100%)`
                                                    : `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 0%, transparent 0%), linear-gradient(135deg, ${awayColor}26 0%, ${awaySecondary}26 50%, #f8fafc 100%)`,
                                                backgroundColor: isAwayPicked ? awayColor : "transparent",
                                                borderRadius: 6,
                                                border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayColor}55`,
                                                padding: "8px 6px",
                                                cursor: isLocked ? "not-allowed" : "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                position: "relative",
                                                boxShadow: isAwayPicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${awayColor}` : "none",
                                                transition: "background-size 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s ease",
                                                backgroundSize: isAwayPicked ? "100% 100%" : "0% 100%, 100% 100%",
                                                backgroundRepeat: "no-repeat",
                                                minWidth: 0
                                            }}
                                        >
                                            {isAwayPicked && (
                                                <span style={{
                                                    position: "absolute",
                                                    top: 4,
                                                    right: 6,
                                                    fontSize: "10px",
                                                    color: "#ffffff",
                                                    fontWeight: 900
                                                }}>
                                                    ✓
                                                </span>
                                            )}
                                            {awayLogo && (
                                                <div style={{
                                                    background: awaySecondary,
                                                    borderRadius: 6,
                                                    padding: "3px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    boxShadow: `0 0 4px 1px ${awayColor}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                    border: `1.5px solid ${awayColor}`,
                                                    marginBottom: 4,
                                                    width: 35,
                                                    height: 35,
                                                    flexShrink: 0
                                                }}>
                                                    <img src={awayLogo} alt={game.away_team} style={{ width: 25, height: 25, objectFit: "contain", display: "block" }} />
                                                </div>
                                            )}
                                            <div style={{ fontWeight: isAwayPicked ? 800 : 600, fontSize: "12px", color: isAwayPicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {game.away_team}
                                            </div>
                                            <div style={{ fontSize: "11px", fontWeight: 700, color: isAwayPicked ? "#e2e8f0" : "#475569" }}>
                                                {hasLine ? awaySpreadStr : "No Line"}
                                            </div>
                                        </div>

                                        {/* Home Team Option Box */}
                                        <div
                                            onClick={() => !isLocked && handleTeamPick(game.id, game.home_team, game.game_date)}
                                            style={{
                                                backgroundImage: isHomePicked
                                                    ? `linear-gradient(to right, ${homeColor} 100%, ${homeColor} 100%)`
                                                    : `linear-gradient(to right, ${homeColor} 0%, ${homeColor} 0%, transparent 0%), linear-gradient(135deg, ${homeColor}26 0%, ${homeSecondary}26 50%, #f8fafc 100%)`,
                                                backgroundColor: isHomePicked ? homeColor : "transparent",
                                                borderRadius: 6,
                                                border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homeColor}55`,
                                                padding: "8px 6px",
                                                cursor: isLocked ? "not-allowed" : "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                position: "relative",
                                                boxShadow: isHomePicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${homeColor}` : "none",
                                                transition: "background-size 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s ease",
                                                backgroundSize: isHomePicked ? "100% 100%" : "0% 100%, 100% 100%",
                                                backgroundRepeat: "no-repeat",
                                                minWidth: 0
                                            }}
                                        >
                                            {isHomePicked && (
                                                <span style={{
                                                    position: "absolute",
                                                    top: 4,
                                                    right: 6,
                                                    fontSize: "10px",
                                                    color: "#ffffff",
                                                    fontWeight: 900
                                                }}>
                                                    ✓
                                                </span>
                                            )}
                                            {homeLogo && (
                                                <div style={{
                                                    background: homeSecondary,
                                                    borderRadius: 6,
                                                    padding: "3px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    boxShadow: `0 0 4px 1px ${homeColor}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                    border: `1.5px solid ${homeColor}`,
                                                    marginBottom: 4,
                                                    width: 35,
                                                    height: 35,
                                                    flexShrink: 0
                                                }}>
                                                    <img src={homeLogo} alt={game.home_team} style={{ width: 25, height: 25, objectFit: "contain", display: "block" }} />
                                                </div>
                                            )}
                                            <div style={{ fontWeight: isHomePicked ? 800 : 600, fontSize: "12px", color: isHomePicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {game.home_team}
                                            </div>
                                            <div style={{ fontSize: "11px", fontWeight: 700, color: isHomePicked ? "#e2e8f0" : "#475569" }}>
                                                {hasLine ? homeSpreadStr : "No Line"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Over / Under Selection Row */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                                            O/U: <strong>{game.over_under}</strong>
                                        </span>
                                        <div style={{ display: "flex", gap: 4 }}>
                                            <button
                                                onClick={() => !isLocked && handleOverUnderPick(game.id, "over", game.game_date)}
                                                disabled={isLocked}
                                                style={{
                                                    background: ouPick === "over" ? "#0284c7" : "#ffffff",
                                                    color: ouPick === "over" ? "#ffffff" : "#334155",
                                                    border: ouPick === "over" ? "1px solid #0284c7" : "1px solid #cbd5e1",
                                                    padding: "3px 10px",
                                                    borderRadius: 4,
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    cursor: isLocked ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                Over
                                            </button>
                                            <button
                                                onClick={() => !isLocked && handleOverUnderPick(game.id, "under", game.game_date)}
                                                disabled={isLocked}
                                                style={{
                                                    background: ouPick === "under" ? "#0284c7" : "#ffffff",
                                                    color: ouPick === "under" ? "#ffffff" : "#334155",
                                                    border: ouPick === "under" ? "1px solid #0284c7" : "1px solid #cbd5e1",
                                                    padding: "3px 10px",
                                                    borderRadius: 4,
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    cursor: isLocked ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                Under
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {sortedGames.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                        {bestBetCount !== 3 && (
                            <div style={{
                                backgroundColor: "#fff7ed",
                                border: "1px solid #fdba74",
                                color: "#c2410c",
                                padding: "8px 10px",
                                borderRadius: 8,
                                fontSize: "12px",
                                fontWeight: 600,
                                textAlign: "center",
                                marginBottom: 10
                            }}>
                                ⚠️ Note: Select exactly <strong>3 Best Bets</strong> (Currently selected: {bestBetCount}/3).
                            </div>
                        )}
                        <button
                            onClick={handleSubmitAll}
                            style={{
                                width: "100%", padding: 12, backgroundColor: "#16a34a", color: "white",
                                borderRadius: 8, border: "none", fontWeight: 800, fontSize: "14px", cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(22,163,74,0.35)", textTransform: "uppercase", letterSpacing: "0.5px"
                            }}
                        >
                            Save Week {currentWeek} Picks
                        </button>
                    </div>
                )}

            </div>
        </PoolGatekeeper>
    );
}