import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function NflPickemAtsPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({}); // { game_id: { picked_team, is_best_bet } }
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

    // Fetch weekly schedule and user picks
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        axios.get("/api/nfl_pickem_ats/games", {
            params: { week: currentWeek },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setGames(res.data.games || []);
                setPicks(res.data.userPicks || {});
            })
            .catch(err => {
                console.error("Failed to load pickem games", err);
                toast.error("Failed to load matchups");
            })
            .finally(() => setLoading(false));
    }, [user, currentWeek, token]);

    const bestBetCount = Object.values(picks).filter(p => p.is_best_bet).length;
    const selectedPicksCount = Object.values(picks).filter(p => p.picked_team).length;
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
                    picked_team: team,
                    is_best_bet: prev[gameId]?.is_best_bet || false
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

    // Bulk Select / Clear Helpers (only applies to unlocked games)
    const handleSelectAll = (type) => {
        const updatedPicks = { ...picks };
        const now = new Date();

        games.forEach(game => {
            const isLocked = game.game_date && now >= new Date(game.game_date);
            if (isLocked) return;

            if (type === "none") {
                delete updatedPicks[game.id];
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
                    picked_team: targetTeam,
                    is_best_bet: updatedPicks[game.id]?.is_best_bet || false
                };
            }
        });

        setPicks(updatedPicks);
        toast.success(type === "none" ? "Cleared all unlocked picks!" : `Applied bulk selection for all unlocked games!`);
    };

    // Check if all unlocked games currently match a given quick-select criterion
    const isCriteriaActive = (type) => {
        const unlockedGames = games.filter(game => !(game.game_date && new Date() >= new Date(game.game_date)));
        if (unlockedGames.length === 0) return false;

        if (type === "none") {
            return unlockedGames.every(game => !picks[game.id]?.picked_team);
        }

        return unlockedGames.every(game => {
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
    const sortedGames = [...games].sort((a, b) => {
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

        const formattedPicks = Object.keys(picks).map(gameId => ({
            game_id: Number(gameId),
            picked_team: picks[gameId].picked_team,
            is_best_bet: picks[gameId].is_best_bet
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
        <PoolGatekeeper user={user} gameKey="nfl_pickem_ats">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0, fontWeight: 800, letterSpacing: "-0.025em" }}>🏈 Pick'em Against the Spread <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏈</span></h2>
                    <p style={{ color: "#64748b", marginTop: 6, fontSize: "14px", fontWeight: 500 }}>
                        Make your ATS picks for every game and assign exactly <strong>3 Best Bets ⭐</strong>.<br />
                        Best bets are worth 2 points.
                    </p>
                    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                        <div style={{ background: bestBetCount === 3 ? "#ecfdf5" : "#fef3c2", color: bestBetCount === 3 ? "#047857" : "#b45309", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                            Best Bets: {bestBetCount} / 3
                        </div>
                        {totalGamesCount > 0 && (
                            <div style={{ background: selectedPicksCount === totalGamesCount ? "#ecfdf5" : "#fef2f2", color: selectedPicksCount === totalGamesCount ? "#047857" : "#b91c1c", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                                Selected: {selectedPicksCount} / {totalGamesCount}
                            </div>
                        )}
                    </div>
                </div>

                {/* Week Selector Bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 6,
                    marginBottom: 16,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 6,
                    width: "100%"
                }}>
                    {[...Array(18)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentWeek(i + 1)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === i + 1 ? NFL_BLUE : "white",
                                color: currentWeek === i + 1 ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600,
                                flexShrink: 0,
                                fontSize: "14px"
                            }}
                        >
                            Week {i + 1}
                        </button>
                    ))}
                </div>

                {/* Controls Bar: Sort Dropdown & Refined Mobile-Friendly Quick Select Actions */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "white",
                    padding: "14px 16px",
                    borderRadius: 12,
                    marginBottom: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    border: "1px solid #e2e8f0",
                    gap: 12
                }}>
                    {/* Sort Dropdown Row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", flexShrink: 0 }}>Sort By:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                fontSize: "13px",
                                fontWeight: 600,
                                background: "#f8fafc",
                                cursor: "pointer",
                                color: "#0f172a"
                            }}
                        >
                            <option value="kickoff">Kickoff Time (Default)</option>
                            <option value="team_asc">Away Team (A-Z)</option>
                            <option value="team_desc">Away Team (Z-A)</option>
                            <option value="fav_desc">Favorite Spread (Biggest to Least)</option>
                            <option value="fav_asc">Favorite Spread (Least to Biggest)</option>
                        </select>
                    </div>

                    {/* Bulk Select Action Buttons Row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, width: "100%" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569", marginRight: 2, flexShrink: 0 }}>Select:</span>
                        {[
                            { key: "favorites", label: "Faves" },
                            { key: "underdogs", label: "Dogs" },
                            { key: "home", label: "Home" },
                            { key: "away", label: "Away" },
                            { key: "none", label: "None" }
                        ].map(action => {
                            const active = isCriteriaActive(action.key);
                            return (
                                <button
                                    key={action.key}
                                    onClick={() => handleSelectAll(action.key)}
                                    style={{
                                        flex: 1,
                                        background: active ? NFL_BLUE : "#f1f5f9",
                                        color: active ? "white" : "#334155",
                                        border: active ? `1px solid ${NFL_BLUE}` : "1px solid #cbd5e1",
                                        padding: "6px 4px",
                                        borderRadius: 6,
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        textAlign: "center",
                                        boxShadow: active ? "0 2px 6px rgba(1,51,105,0.3)" : "none"
                                    }}
                                >
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Full Width Save Picks Button */}
                    {sortedGames.length > 0 && (
                        <button
                            onClick={handleSubmitAll}
                            style={{
                                width: "100%",
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                padding: "10px 14px",
                                borderRadius: 8,
                                fontSize: "13px",
                                fontWeight: 800,
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                boxShadow: "0 2px 6px rgba(22,163,74,0.3)"
                            }}
                        >
                            Save Picks
                        </button>
                    )}
                </div>

                {/* Compact Games List or Notice */}
                {sortedGames.length === 0 ? (
                    <div style={{
                        background: "white",
                        borderRadius: 12,
                        padding: "40px 20px",
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                            Matchups for Week {currentWeek} are not yet available.
                        </p>
                        <p style={{ fontSize: "14px", color: "#64748b", marginTop: 8, marginBottom: 0 }}>
                            Schedules and odds typically appear two weeks out.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {sortedGames.map(game => {
                            const isLocked = game.game_date && new Date() >= new Date(game.game_date);
                            const userPick = picks[game.id] || {};
                            const absSpread = Math.abs(game.adjusted_spread || game.spread);
                            const isAwayFav = game.favorite === game.away_team;

                            const awaySpreadStr = isAwayFav ? `-${absSpread}` : `+${absSpread}`;
                            const homeSpreadStr = isAwayFav ? `+${absSpread}` : `-${absSpread}`;

                            const awayTeamMeta = teamColors[game.away_team] || {};
                            const homeTeamMeta = teamColors[game.home_team] || {};

                            const awayColor = game.away_color || awayTeamMeta.color || "#1e3a8a";
                            const awaySecondary = game.away_secondary_color || awayTeamMeta.secondaryColor || "#cbd5e1";

                            const homeColor = game.home_color || homeTeamMeta.color || "#1e3a8a";
                            const homeSecondary = game.home_secondary_color || homeTeamMeta.secondaryColor || "#cbd5e1";

                            const isAwayPicked = userPick.picked_team === game.away_team;
                            const isHomePicked = userPick.picked_team === game.home_team;

                            const awayLogo = game.away_logo || awayTeamMeta.logo;
                            const homeLogo = game.home_logo || homeTeamMeta.logo;

                            return (
                                <div key={game.id} style={{
                                    background: "#f8fafc",
                                    borderRadius: 10,
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                                    overflow: "hidden",
                                    border: userPick.is_best_bet ? `2px solid ${GOLD}` : "1px solid #cbd5e1",
                                    padding: "10px 14px"
                                }}>
                                    {/* Top row: Date/Time, O/U, and Best Bet button */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                                                {game.game_date ? new Date(game.game_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD"}
                                            </span>
                                            <span style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>
                                                O/U: <strong>{game.over_under}</strong>
                                            </span>
                                            {isLocked && <span style={{ fontSize: "10px", color: NFL_RED, fontWeight: 700 }}>🔒 Locked</span>}
                                        </div>

                                        <div>
                                            <button
                                                onClick={() => handleBestBetToggle(game.id, game.game_date)}
                                                disabled={isLocked || !userPick.picked_team}
                                                style={{
                                                    background: userPick.is_best_bet ? GOLD : "#f1f5f9",
                                                    color: userPick.is_best_bet ? "white" : "#64748b",
                                                    border: userPick.is_best_bet ? `1px solid ${GOLD}` : "1px solid #cbd5e1",
                                                    padding: "4px 8px",
                                                    borderRadius: 6,
                                                    fontWeight: 700,
                                                    fontSize: "11px",
                                                    cursor: (isLocked || !userPick.picked_team) ? "not-allowed" : "pointer",
                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                {userPick.is_best_bet ? "★ Best Bet" : "☆ Best Bet"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bottom row: Stacked Away / Home Team Selection Buttons for Mobile */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        {/* Away Team */}
                                        <button
                                            onClick={() => handleTeamPick(game.id, game.away_team, game.game_date)}
                                            disabled={isLocked}
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                border: isAwayPicked ? `2px solid ${awayColor}` : `1px solid ${awayColor}66`,
                                                background: isAwayPicked 
                                                    ? awayColor 
                                                    : `linear-gradient(135deg, ${awaySecondary}33 0%, ${awayColor}1A 100%)`,
                                                color: isAwayPicked ? "white" : "#0f172a",
                                                cursor: isLocked ? "not-allowed" : "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                boxShadow: isAwayPicked ? `0 2px 8px ${awayColor}66` : "none",
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                                                {awayLogo && (
                                                    <span style={{
                                                        background: awaySecondary,
                                                        borderRadius: 4,
                                                        padding: "2px 4px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                        border: "1px solid rgba(0,0,0,0.08)",
                                                        flexShrink: 0
                                                    }}>
                                                        <img 
                                                            src={awayLogo} 
                                                            alt={game.away_team} 
                                                            style={{ 
                                                                width: 18, 
                                                                height: 18, 
                                                                objectFit: "contain", 
                                                                filter: isAwayPicked ? "drop-shadow(0 1px 4px rgba(255, 255, 255, 0.8))" : "none"
                                                            }} 
                                                        />
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: 700, fontSize: "13px", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.away_team}</span>
                                            </div>
                                            <span style={{ 
                                                fontSize: "12px", 
                                                fontWeight: 700, 
                                                flexShrink: 0,
                                                padding: "2px 6px",
                                                borderRadius: 4,
                                                background: isAwayPicked ? "rgba(255,255,255,0.2)" : "transparent",
                                                color: isAwayPicked ? "white" : "#475569"
                                            }}>
                                                {awaySpreadStr}
                                            </span>
                                        </button>

                                        {/* Home Team */}
                                        <button
                                            onClick={() => handleTeamPick(game.id, game.home_team, game.game_date)}
                                            disabled={isLocked}
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                border: isHomePicked ? `2px solid ${homeColor}` : `1px solid ${homeColor}66`,
                                                background: isHomePicked 
                                                    ? homeColor 
                                                    : `linear-gradient(135deg, ${homeSecondary}33 0%, ${homeColor}1A 100%)`,
                                                color: isHomePicked ? "white" : "#0f172a",
                                                cursor: isLocked ? "not-allowed" : "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                boxShadow: isHomePicked ? `0 2px 8px ${homeColor}66` : "none",
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                                                {homeLogo && (
                                                    <span style={{
                                                        background: homeSecondary,
                                                        borderRadius: 4,
                                                        padding: "2px 4px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                        border: "1px solid rgba(0,0,0,0.08)",
                                                        flexShrink: 0
                                                    }}>
                                                        <img 
                                                            src={homeLogo} 
                                                            alt={game.home_team} 
                                                            style={{ 
                                                                width: 18, 
                                                                height: 18, 
                                                                objectFit: "contain", 
                                                                filter: isHomePicked ? "drop-shadow(0 1px 4px rgba(255, 255, 255, 0.8))" : "none"
                                                            }} 
                                                        />
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: 700, fontSize: "13px", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.home_team}</span>
                                            </div>
                                            <span style={{ 
                                                fontSize: "12px", 
                                                fontWeight: 700, 
                                                flexShrink: 0,
                                                padding: "2px 6px",
                                                borderRadius: 4,
                                                background: isHomePicked ? "rgba(255,255,255,0.2)" : "transparent",
                                                color: isHomePicked ? "white" : "#475569"
                                            }}>
                                                {homeSpreadStr}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {sortedGames.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                        {selectedPicksCount < totalGamesCount && (
                            <div style={{
                                backgroundColor: "#fff7ed",
                                border: "1px solid #fdba74",
                                color: "#c2410c",
                                padding: "8px 12px",
                                borderRadius: 8,
                                fontSize: "13px",
                                fontWeight: 600,
                                textAlign: "center",
                                marginBottom: 12
                            }}>
                                ⚠️ Note: You have selected <strong>{selectedPicksCount}</strong> out of <strong>{totalGamesCount}</strong> games for Week {currentWeek}.
                            </div>
                        )}
                        <button
                            onClick={handleSubmitAll}
                            style={{
                                width: "100%", padding: 14, backgroundColor: "#16a34a", color: "white",
                                borderRadius: 10, border: "none", fontWeight: 800, fontSize: 15, cursor: "pointer",
                                boxShadow: "0 4px 14px rgba(22,163,74,0.4)", textTransform: "uppercase", letterSpacing: "0.5px"
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