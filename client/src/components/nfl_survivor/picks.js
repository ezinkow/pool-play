import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function NflSurvivorPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [maxAvailableWeek, setMaxAvailableWeek] = useState(1);
    const [games, setGames] = useState([]);
    const [userPicks, setUserPicks] = useState({});
    const [usedTeams, setUsedTeams] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch team colors, logos, and branding
    useEffect(() => {
        if (!token) return;
        axios.get("/api/nfl_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        primaryColor: t.color || t.primary_color || NFL_BLUE,
                        secondaryColor: t.secondary_color || t.alt_color || "#475569",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    const loadSurvivorData = (weekToFetch) => {
        if (!user) return;
        setLoading(true);
        axios.get("/api/nfl_survivor/picks", {
            params: { week: weekToFetch },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const data = res.data || {};
                setGames(data.games || (Array.isArray(data) ? data : []) || []);
                setUserPicks(data.userPicks || {});
                setUsedTeams(data.usedTeams || []);
                
                if (data.currentWeek && data.currentWeek > maxAvailableWeek) {
                    setMaxAvailableWeek(data.currentWeek);
                    setCurrentWeek(data.currentWeek);
                }
            })
            .catch(err => {
                console.error("Failed to load survivor picks", err);
                toast.error("Failed to load pool data");
                setGames([]);
            })
            .finally(() => setLoading(false));
    };

    // Initial load - check active week state from active-states or pool endpoint
    useEffect(() => {
        if (!user) return;
        axios.get("/api/settings/active-states", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const survivorPool = (res.data || []).find(p => p.game_key === "nfl_survivor");
                if (survivorPool && survivorPool.current_week) {
                    const activeWk = parseInt(survivorPool.current_week);
                    setMaxAvailableWeek(activeWk);
                    setCurrentWeek(activeWk);
                    loadSurvivorData(activeWk);
                } else {
                    loadSurvivorData(currentWeek);
                }
            })
            .catch(() => {
                loadSurvivorData(currentWeek);
            });
    }, [user]);

    const handleWeekChange = (targetWeek) => {
        if (targetWeek > maxAvailableWeek) {
            toast.error("You cannot look ahead or make picks for future weeks!");
            return;
        }
        setCurrentWeek(targetWeek);
        loadSurvivorData(targetWeek);
    };

    const handleMakePick = async (gameId, teamName, isUsed, isLocked) => {
        if (isLocked || isUsed) return;
        try {
            await axios.post("/api/nfl_survivor/picks", {
                week: currentWeek,
                game_id: gameId,
                picked_team: teamName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Locked in your pick: ${teamName}!`);
            loadSurvivorData(currentWeek);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save pick");
        }
    };

    const isGameStarted = (gameDate) => {
        if (!gameDate) return false;
        return new Date() >= new Date(gameDate);
    };

    const formatGameDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { 
            weekday: "short", 
            month: "short", 
            day: "numeric", 
            hour: "numeric", 
            minute: "2-digit" 
        });
    };

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading survivor dashboard...</div>;

    const currentWeekPick = userPicks[currentWeek];
    const pickedTeamMeta = teamColors[currentWeekPick] || {};
    const bannerBg = currentWeekPick && pickedTeamMeta.primaryColor && pickedTeamMeta.secondaryColor 
        ? `linear-gradient(135deg, ${pickedTeamMeta.primaryColor}, ${pickedTeamMeta.secondaryColor})` 
        : (currentWeekPick ? (pickedTeamMeta.primaryColor || "#f0fdf4") : "#fffbeb");

    return (
        <PoolGatekeeper user={user} gameKey="nfl_survivor">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0 }}>NFL Survivor: Week {currentWeek}</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        Pick one team to win straight up. You cannot reuse teams throughout the season!
                    </p>
                </div>

                {/* Restricted Week Selector Bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 6,
                    marginBottom: 20,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 6,
                    width: "100%"
                }}>
                    {[...Array(maxAvailableWeek)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => handleWeekChange(i + 1)}
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

                {/* Current Week Pick Dynamic Ombré Banner */}
                <div style={{
                    background: bannerBg,
                    color: currentWeekPick ? "#ffffff" : "#92400e",
                    border: `2px solid ${currentWeekPick ? (pickedTeamMeta.secondaryColor || "#16a34a") : "#fde68a"}`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    marginBottom: 24,
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "15px",
                    boxShadow: currentWeekPick ? `0 4px 16px ${pickedTeamMeta.primaryColor || "#000"}44` : "none",
                    transition: "all 0.4s ease-in-out",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12
                }}>
                    {currentWeekPick ? (
                        <>
                            {pickedTeamMeta.logo && (
                                <span style={{
                                    background: "rgba(255,255,255,0.25)",
                                    borderRadius: 6,
                                    padding: "2px 6px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                }}>
                                    <img src={pickedTeamMeta.logo} alt={currentWeekPick} style={{ width: 26, height: 26, objectFit: "contain" }} />
                                </span>
                            )}
                            <span>✓ Week {currentWeek} Locked Selection: {currentWeekPick}</span>
                        </>
                    ) : (
                        `⚠️ You haven't made a selection for Week ${currentWeek} yet!`
                    )}
                </div>

                {/* Games List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {games.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#666", background: "white", borderRadius: 10 }}>
                            No games found for Week {currentWeek}.
                        </div>
                    ) : (
                        games.map(game => {
                            const awayMeta = teamColors[game.away_team] || {};
                            const homeMeta = teamColors[game.home_team] || {};
                            const awayLogo = game.away_logo || awayMeta.logo;
                            const homeLogo = game.home_logo || homeMeta.logo;

                            const isAwayPicked = currentWeekPick === game.away_team;
                            const isHomePicked = currentWeekPick === game.home_team;

                            const awayUsed = usedTeams.includes(game.away_team) && !isAwayPicked;
                            const homeUsed = usedTeams.includes(game.home_team) && !isHomePicked;

                            const locked = isGameStarted(game.game_date);
                            const formattedDate = formatGameDate(game.game_date);

                            const rawSpread = game.spread !== null && game.spread !== undefined ? game.spread : null;
                            
                            // Independent Home & Away Juice Odds
                            const homeSpreadOdds = game.spread_odds !== null && game.spread_odds !== undefined ? game.spread_odds : -110;
                            const awaySpreadOdds = game.away_spread_odds !== null && game.away_spread_odds !== undefined ? game.away_spread_odds : -110;

                            const homeOddsFormatted = homeSpreadOdds > 0 ? `+${homeSpreadOdds}` : `${homeSpreadOdds}`;
                            const awayOddsFormatted = awaySpreadOdds > 0 ? `+${awaySpreadOdds}` : `${awaySpreadOdds}`;

                            let awaySpreadStr = "Pick'em";
                            let homeSpreadStr = "Pick'em";

                            if (rawSpread !== null) {
                                const absSpread = Math.abs(rawSpread);
                                const isAwayFav = game.favorite === game.away_team;
                                
                                if (rawSpread === 0) {
                                    awaySpreadStr = `PK (${awayOddsFormatted})`;
                                    homeSpreadStr = `PK (${homeOddsFormatted})`;
                                } else if (isAwayFav) {
                                    awaySpreadStr = `-${absSpread} (${awayOddsFormatted})`;
                                    homeSpreadStr = `+${absSpread} (${homeOddsFormatted})`;
                                } else {
                                    awaySpreadStr = `+${absSpread} (${awayOddsFormatted})`;
                                    homeSpreadStr = `-${absSpread} (${homeOddsFormatted})`;
                                }
                            }

                            // Ombré Shading backgrounds
                            const awayPrimary = awayMeta.primaryColor || "#013369";
                            const awaySecondary = awayMeta.secondaryColor || "#475569";
                            const awayBg = isAwayPicked
                                ? `linear-gradient(135deg, ${awayPrimary}, ${awaySecondary})`
                                : (awayUsed ? "#f1f5f9" : `linear-gradient(135deg, ${awayPrimary}12, ${awaySecondary}1A)`);

                            const homePrimary = homeMeta.primaryColor || "#013369";
                            const homeSecondary = homeMeta.secondaryColor || "#475569";
                            const homeBg = isHomePicked
                                ? `linear-gradient(135deg, ${homePrimary}, ${homeSecondary})`
                                : (homeUsed ? "#f1f5f9" : `linear-gradient(135deg, ${homePrimary}12, ${homeSecondary}1A)`);

                            return (
                                <div key={game.id} style={{
                                    background: "#ffffff",
                                    borderRadius: 10,
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                    padding: "14px 16px",
                                    border: "1px solid #e2e8f0",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10
                                }}>
                                    {/* Game Time Header */}
                                    {formattedDate && (
                                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textAlign: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 6 }}>
                                            🗓️ {formattedDate}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                        {/* Away Team Tile (Clickable Button) */}
                                        <div
                                            onClick={() => handleMakePick(game.id, game.away_team, awayUsed, locked)}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background: awayBg,
                                                color: isAwayPicked ? "#ffffff" : (awayUsed ? "#94a3b8" : "#0f172a"),
                                                padding: "12px 16px",
                                                borderRadius: 8,
                                                border: `2px solid ${isAwayPicked ? awaySecondary : (awayUsed ? "#cbd5e1" : `${awayPrimary}40`)}`,
                                                boxShadow: isAwayPicked ? `0 2px 12px ${awayPrimary}55` : "none",
                                                cursor: (locked || awayUsed) ? "not-allowed" : "pointer",
                                                opacity: awayUsed ? 0.7 : 1,
                                                transition: "all 0.2s ease-in-out",
                                                transform: "scale(1)"
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!locked && !awayUsed && !isAwayPicked) {
                                                    e.currentTarget.style.transform = "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow = `0 4px 12px ${awayPrimary}33`;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = isAwayPicked ? `0 2px 12px ${awayPrimary}55` : "none";
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                {awayLogo && (
                                                    <span style={{
                                                        background: isAwayPicked ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)",
                                                        borderRadius: 4,
                                                        padding: "2px 4px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                                                    }}>
                                                        <img src={awayLogo} alt={game.away_team} style={{ width: 26, height: 26, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 700, fontSize: "14px" }}>{game.away_team}</span>
                                                    <span style={{ fontSize: "11px", opacity: isAwayPicked ? 0.9 : 0.75, fontWeight: 600 }}>{awaySpreadStr}</span>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: "12px", padding: "4px 10px", borderRadius: 6, background: isAwayPicked ? awaySecondary : "transparent", color: isAwayPicked ? "#fff" : "#64748b" }}>
                                                {isAwayPicked ? "✓ Picked" : (awayUsed ? "Used Already" : "Select")}
                                            </div>
                                        </div>

                                        <span style={{ fontWeight: 600, color: "#64748b", fontSize: "13px" }}>@</span>

                                        {/* Home Team Tile (Clickable Button) */}
                                        <div
                                            onClick={() => handleMakePick(game.id, game.home_team, homeUsed, locked)}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background: homeBg,
                                                color: isHomePicked ? "#ffffff" : (homeUsed ? "#94a3b8" : "#0f172a"),
                                                padding: "12px 16px",
                                                borderRadius: 8,
                                                border: `2px solid ${isHomePicked ? homeSecondary : (homeUsed ? "#cbd5e1" : `${homePrimary}40`)}`,
                                                boxShadow: isHomePicked ? `0 2px 12px ${homePrimary}55` : "none",
                                                cursor: (locked || homeUsed) ? "not-allowed" : "pointer",
                                                opacity: homeUsed ? 0.7 : 1,
                                                transition: "all 0.2s ease-in-out",
                                                transform: "scale(1)"
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!locked && !homeUsed && !isHomePicked) {
                                                    e.currentTarget.style.transform = "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow = `0 4px 12px ${homePrimary}33`;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = isHomePicked ? `0 2px 12px ${homePrimary}55` : "none";
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                {homeLogo && (
                                                    <span style={{
                                                        background: isHomePicked ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)",
                                                        borderRadius: 4,
                                                        padding: "2px 4px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                                                    }}>
                                                        <img src={homeLogo} alt={game.home_team} style={{ width: 26, height: 26, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 700, fontSize: "14px" }}>{game.home_team}</span>
                                                    <span style={{ fontSize: "11px", opacity: isHomePicked ? 0.9 : 0.75, fontWeight: 600 }}>{homeSpreadStr}</span>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: "12px", padding: "4px 10px", borderRadius: 6, background: isHomePicked ? homeSecondary : "transparent", color: isHomePicked ? "#fff" : "#64748b" }}>
                                                {isHomePicked ? "✓ Picked" : (homeUsed ? "Used Already" : "Select")}
                                            </div>
                                        </div>
                                    </div>

                                    {locked && (
                                        <div style={{ fontSize: "11px", color: NFL_RED, fontWeight: 600, textAlign: "right" }}>
                                            🔒 Game Started / Locked
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </PoolGatekeeper>
    );
}