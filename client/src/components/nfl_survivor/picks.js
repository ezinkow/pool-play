import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";

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

    const handleMakePick = async (gameId, teamName, isUsed, isLocked, isAlreadyPicked) => {
        if (isLocked || (isUsed && !isAlreadyPicked)) return;
        try {
            const res = await axios.post("/api/nfl_survivor/picks", {
                week: currentWeek,
                game_id: gameId,
                picked_team: teamName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.cleared) {
                toast.success(`Removed pick for Week ${currentWeek}`);
            } else {
                toast.success(`Locked in your pick: ${teamName}!`);
            }
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

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 30 }}>Loading survivor dashboard...</div>;

    const currentWeekPick = userPicks[currentWeek];
    const pickedTeamMeta = teamColors[currentWeekPick] || {};
    const bannerBg = currentWeekPick && pickedTeamMeta.primaryColor && pickedTeamMeta.secondaryColor 
        ? `linear-gradient(135deg, ${pickedTeamMeta.primaryColor}, ${pickedTeamMeta.secondaryColor})` 
        : (currentWeekPick ? (pickedTeamMeta.primaryColor || "#f0fdf4") : "#fffbeb");

    return (
        <PoolGatekeeper user={user} gameKey="nfl_survivor">
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 10px", paddingBottom: 60 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "22px", margin: 0 }}>NFL Survivor: Week {currentWeek}</h2>
                    <p style={{ color: "#666", marginTop: 4, fontSize: "13px" }}>
                        Pick one team straight up. Click your selected team again to de-select.
                    </p>
                </div>

                {/* Restricted Week Selector Bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 4,
                    marginBottom: 14,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 4,
                    width: "100%"
                }}>
                    {[...Array(maxAvailableWeek)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => handleWeekChange(i + 1)}
                            style={{
                                padding: "4px 10px",
                                borderRadius: 4,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === i + 1 ? NFL_BLUE : "white",
                                color: currentWeek === i + 1 ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600,
                                flexShrink: 0,
                                fontSize: "13px"
                            }}
                        >
                            Week {i + 1}
                        </button>
                    ))}
                </div>

                {/* Current Week Pick Banner */}
                <div style={{
                    background: bannerBg,
                    color: currentWeekPick ? "#ffffff" : "#92400e",
                    border: `1px solid ${currentWeekPick ? (pickedTeamMeta.secondaryColor || "#16a34a") : "#fde68a"}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 16,
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                }}>
                    {currentWeekPick ? (
                        <>
                            {pickedTeamMeta.logo && (
                                <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 4, padding: "1px 4px", display: "inline-flex", alignItems: "center" }}>
                                    <img src={pickedTeamMeta.logo} alt={currentWeekPick} style={{ width: 20, height: 20, objectFit: "contain" }} />
                                </span>
                            )}
                            <span>✓ Week {currentWeek} Selection: {currentWeekPick}</span>
                        </>
                    ) : (
                        `⚠️ No selection made for Week ${currentWeek} yet.`
                    )}
                </div>

                {/* Games List (Compact Grid) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {games.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "#666", background: "white", borderRadius: 8, fontSize: "13px" }}>
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
                            const homeSpreadOdds = game.spread_odds ?? -110;
                            const awaySpreadOdds = game.away_spread_odds ?? -110;

                            let awaySpreadStr = "PK";
                            let homeSpreadStr = "PK";

                            if (rawSpread !== null) {
                                const absSpread = Math.abs(rawSpread);
                                const isAwayFav = game.favorite === game.away_team;
                                const hOddsStr = homeSpreadOdds > 0 ? `+${homeSpreadOdds}` : homeSpreadOdds;
                                const aOddsStr = awaySpreadOdds > 0 ? `+${awaySpreadOdds}` : awaySpreadOdds;
                                
                                if (rawSpread === 0) {
                                    awaySpreadStr = `PK (${aOddsStr})`;
                                    homeSpreadStr = `PK (${hOddsStr})`;
                                } else if (isAwayFav) {
                                    awaySpreadStr = `-${absSpread} (${aOddsStr})`;
                                    homeSpreadStr = `+${absSpread} (${hOddsStr})`;
                                } else {
                                    awaySpreadStr = `+${absSpread} (${aOddsStr})`;
                                    homeSpreadStr = `-${absSpread} (${hOddsStr})`;
                                }
                            }

                            const awayPrimary = awayMeta.primaryColor || "#013369";
                            const awaySecondary = awayMeta.secondaryColor || "#475569";
                            const awayBg = isAwayPicked
                                ? `linear-gradient(135deg, ${awayPrimary}, ${awaySecondary})`
                                : (awayUsed ? "#f1f5f9" : `linear-gradient(135deg, ${awayPrimary}10, ${awaySecondary}16)`);

                            const homePrimary = homeMeta.primaryColor || "#013369";
                            const homeSecondary = homeMeta.secondaryColor || "#475569";
                            const homeBg = isHomePicked
                                ? `linear-gradient(135deg, ${homePrimary}, ${homeSecondary})`
                                : (homeUsed ? "#f1f5f9" : `linear-gradient(135deg, ${homePrimary}10, ${homeSecondary}16)`);

                            return (
                                <div key={game.id} style={{
                                    background: "#ffffff",
                                    borderRadius: 8,
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                                    padding: "8px 12px",
                                    border: "1px solid #e2e8f0",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6
                                }}>
                                    {/* Game Header / Date */}
                                    {formattedDate && (
                                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textAlign: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 4 }}>
                                            {formattedDate} {locked && <span style={{ color: NFL_RED, marginLeft: 6 }}>🔒 Locked</span>}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {/* Away Team Tile */}
                                        <div
                                            onClick={() => handleMakePick(game.id, game.away_team, awayUsed, locked, isAwayPicked)}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background: awayBg,
                                                color: isAwayPicked ? "#ffffff" : (awayUsed ? "#94a3b8" : "#0f172a"),
                                                padding: "8px 10px",
                                                borderRadius: 6,
                                                border: `1px solid ${isAwayPicked ? awaySecondary : (awayUsed ? "#cbd5e1" : `${awayPrimary}35`)}`,
                                                cursor: (locked || awayUsed) ? "not-allowed" : "pointer",
                                                opacity: awayUsed ? 0.65 : 1,
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {awayLogo && (
                                                    <span style={{ background: isAwayPicked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", borderRadius: 3, padding: "1px 2px", display: "inline-flex", alignItems: "center" }}>
                                                        <img src={awayLogo} alt={game.away_team} style={{ width: 18, height: 18, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 700, fontSize: "13px", lineHeight: "1.2" }}>{game.away_team}</span>
                                                    <span style={{ fontSize: "10px", opacity: isAwayPicked ? 0.9 : 0.7, fontWeight: 600 }}>{awaySpreadStr}</span>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: "11px", fontWeight: 700, color: isAwayPicked ? "#fff" : "#64748b" }}>
                                                {isAwayPicked ? "✓" : (awayUsed ? "Used" : "Select")}
                                            </span>
                                        </div>

                                        <span style={{ fontWeight: 600, color: "#94a3b8", fontSize: "11px" }}>@</span>

                                        {/* Home Team Tile */}
                                        <div
                                            onClick={() => handleMakePick(game.id, game.home_team, homeUsed, locked, isHomePicked)}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background: homeBg,
                                                color: isHomePicked ? "#ffffff" : (homeUsed ? "#94a3b8" : "#0f172a"),
                                                padding: "8px 10px",
                                                borderRadius: 6,
                                                border: `1px solid ${isHomePicked ? homeSecondary : (homeUsed ? "#cbd5e1" : `${homePrimary}35`)}`,
                                                cursor: (locked || homeUsed) ? "not-allowed" : "pointer",
                                                opacity: homeUsed ? 0.65 : 1,
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {homeLogo && (
                                                    <span style={{ background: isHomePicked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", borderRadius: 3, padding: "1px 2px", display: "inline-flex", alignItems: "center" }}>
                                                        <img src={homeLogo} alt={game.home_team} style={{ width: 18, height: 18, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 700, fontSize: "13px", lineHeight: "1.2" }}>{game.home_team}</span>
                                                    <span style={{ fontSize: "10px", opacity: isHomePicked ? 0.9 : 0.7, fontWeight: 600 }}>{homeSpreadStr}</span>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: "11px", fontWeight: 700, color: isHomePicked ? "#fff" : "#64748b" }}>
                                                {isHomePicked ? "✓" : (homeUsed ? "Used" : "Select")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </PoolGatekeeper>
    );
}