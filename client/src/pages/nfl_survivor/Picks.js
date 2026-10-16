import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import SurvivorWeekSelector from "../../components/picks/SurvivorWeekSelector";
import SurvivorSelectionBanner from "../../components/picks/SurvivorSelectionBanner";
import PoolEmoji from "../../components/PoolEmoji";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";
const TOTAL_NFL_WEEKS = 18; // Standard regular season limit

export default function NflSurvivorPicks() {
    const { user, loading: authLoading } = useAuth();
    // Use a ref or handle initial loading state to avoid fetching week 1 first. 
    // You can also default to null or your current season week if known, 
    // or let the settings call handle it before loading data.
    const [currentWeek, setCurrentWeek] = useState(null);
    const [maxAvailableWeek, setMaxAvailableWeek] = useState(1);
    const [games, setGames] = useState([]);
    const [userPicks, setUserPicks] = useState({});
    const [usedTeams, setUsedTeams] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [isEliminated, setIsEliminated] = useState(false);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch pool settings & active current week on mount
    useEffect(() => {
        if (!token) return;
        axios.get("/api/nfl_regular_season/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const activeWk = res.data.current_week || 1;
                setCurrentWeek(activeWk);
                setMaxAvailableWeek(activeWk);
            })
            .catch(err => {
                console.error("Failed to load survivor settings", err);
                setCurrentWeek(1); // fallback
            });
    }, [token]);

    // Check user's entry status to see if they are eliminated
    useEffect(() => {
        if (!token) return;
        axios.get("/api/nfl_survivor/entries/me", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const entry = res.data.entry;
                if (entry && (entry.is_eliminated === true || entry.is_eliminated === 1)) {
                    setIsEliminated(true);
                }
            })
            .catch(err => console.error("Failed to load user entry status", err));
    }, [token]);

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
                        secondaryColor: t.secondaryColor || t.secondary_color || t.alt_color || "#cbd5e1",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    const loadSurvivorData = (weekToFetch) => {
        if (!user || !weekToFetch) return; // Don't fetch if week isn't set yet
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

                const backendMaxWk = data.maxAvailableWeek || data.currentWeek;
                if (backendMaxWk && backendMaxWk > maxAvailableWeek) {
                    setMaxAvailableWeek(backendMaxWk);
                }
            })
            .catch(err => {
                console.error("Failed to load survivor picks", err);
                toast.error("Failed to load pool data");
                setGames([]);
            })
            .finally(() => setLoading(false));
    };

    // Load data when currentWeek changes
    useEffect(() => {
        if (!user || currentWeek === null) return;
        loadSurvivorData(currentWeek);
    }, [user, currentWeek]);

    const handleWeekChange = (targetWeek) => {
        if (targetWeek > Math.max(maxAvailableWeek, TOTAL_NFL_WEEKS)) {
            toast.error("You cannot look ahead or make picks for future weeks!");
            return;
        }
        setCurrentWeek(targetWeek);
    };

    const handleMakePick = async (gameId, teamName, isUsed, isLocked, isAlreadyPicked) => {
        if (isEliminated) {
            toast.error("You have been eliminated from the survivor pool.");
            return;
        }
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

    if (authLoading || (loading && games.length === 0)) return <div style={{ textAlign: "center", padding: 50 }}>Loading survivor dashboard...</div>;

    const currentWeekPick = userPicks[currentWeek];
    const pickedTeamMeta = teamColors[currentWeekPick] || {};

    return (
        <PoolGatekeeper user={user} gameKey="nfl_survivor" >
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 10px", paddingBottom: 80 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 12, padding: "0 8px" }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "20px", margin: 0 }}><PoolEmoji gameKey="nfl_survivor" /> NFL Survivor: Week {currentWeek}</h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "12px" }}>
                        Pick one team straight up. Click your selected team again to de-select.
                    </p>
                    <p style={{ color: "#666", marginTop: 2, marginBottom: 8, fontSize: "11px", lineHeight: 1.3 }}>
                        Picks/games are locked at kickoff.
                    </p>
                </div>

                {/* ELIMINATION BANNER & CONTENT HIDING */}
                {isEliminated ? (
                    <div style={{
                        background: "#fee2e2",
                        border: "2px solid #ef4444",
                        borderRadius: 12,
                        padding: "30px 20px",
                        textAlign: "center",
                        marginTop: 20,
                        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)"
                    }}>
                        <span style={{ fontSize: "40px" }}>❌</span>
                        <h3 style={{ color: "#991b1b", fontSize: "18px", margin: "10px 0 6px 0" }}>
                            You Have Been Eliminated
                        </h3>
                        <p style={{ color: "#7f1d1d", fontSize: "13px", maxWidth: "450px", margin: "0 auto", lineHeight: 1.5 }}>
                            Your survivor run has come to an end. You can no longer make or modify weekly picks, but you can still view the standings and roster history.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: "center", marginBottom: 2 }}>
                            <h3 style={{ color: "#0f172a", fontSize: "13px", margin: 0 }}>Select Week:</h3>
                        </div>

                        <SurvivorWeekSelector
                            currentWeek={currentWeek}
                            maxAvailableWeek={maxAvailableWeek}
                            totalWeeks={TOTAL_NFL_WEEKS}
                            onWeekChange={handleWeekChange}
                            accentColor={NFL_BLUE}
                        />
                        <SurvivorSelectionBanner
                            week={currentWeek}
                            team={currentWeekPick}
                            teamMeta={pickedTeamMeta}
                            accentColor={NFL_BLUE}
                        />

                        {/* Games List Container */}
                        <div style={{
                            background: "white",
                            borderRadius: 8,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                            border: "1px solid #e2e8f0",
                            padding: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8
                        }}>
                            {games.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "30px", color: "#666", fontSize: "13px" }}>
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

                                    const awayPrimary = awayMeta.primaryColor || NFL_BLUE;
                                    const awaySecondary = awayMeta.secondaryColor || "#cbd5e1";
                                    const homePrimary = homeMeta.primaryColor || NFL_BLUE;
                                    const homeSecondary = homeMeta.secondaryColor || "#cbd5e1";

                                    const getBadgeStyle = (primaryColor, secondaryColor, isPicked, isUsedState) => ({
                                        background: isPicked ? secondaryColor : (isUsedState ? "#f1f5f9" : secondaryColor),
                                        borderRadius: 6,
                                        padding: "3px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: `0 0 4px 1px ${primaryColor}, 0 1px 3px rgba(0,0,0,0.3)`,
                                        border: `1.5px solid ${primaryColor}`,
                                        width: 35,
                                        height: 35,
                                        flexShrink: 0
                                    });

                                    const awayBadgeStyle = getBadgeStyle(awayPrimary, awaySecondary, isAwayPicked, awayUsed);
                                    const homeBadgeStyle = getBadgeStyle(homePrimary, homeSecondary, isHomePicked, homeUsed);

                                    const awayTileBg = isAwayPicked
                                        ? `linear-gradient(to right, ${awayPrimary} 100%, ${awayPrimary} 100%)`
                                        : `linear-gradient(to right, ${awayPrimary} 0%, ${awayPrimary} 0%, transparent 0%), linear-gradient(135deg, ${awayPrimary}12 0%, ${awaySecondary}22 100%)`;

                                    const homeTileBg = isHomePicked
                                        ? `linear-gradient(to right, ${homePrimary} 100%, ${homePrimary} 100%)`
                                        : `linear-gradient(to right, ${homePrimary} 0%, ${homePrimary} 0%, transparent 0%), linear-gradient(135deg, ${homePrimary}12 0%, ${homeSecondary}22 100%)`;

                                    return (
                                        <div key={game.id} style={{
                                            background: "#ffffff",
                                            borderRadius: 10,
                                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.06)",
                                            padding: "8px 10px",
                                            border: "1px solid #cbd5e1",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6
                                        }}>
                                            {formattedDate && (
                                                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textAlign: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 4, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                                                    <span>{formattedDate}</span>
                                                    {locked && <span style={{ backgroundColor: NFL_RED, color: "white", padding: "1px 6px", borderRadius: 3, fontSize: "9px" }}>LOCKED</span>}
                                                </div>
                                            )}

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                                {/* Away Team Option Box */}
                                                <div
                                                    onClick={() => handleMakePick(game.id, game.away_team, awayUsed, locked, isAwayPicked)}
                                                    style={{
                                                        backgroundImage: awayTileBg,
                                                        backgroundColor: isAwayPicked ? awayPrimary : "transparent",
                                                        borderRadius: 6,
                                                        border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayPrimary}40`,
                                                        padding: "6px 6px",
                                                        cursor: (locked || awayUsed) ? "not-allowed" : "pointer",
                                                        opacity: awayUsed ? 0.65 : 1,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        textAlign: "center",
                                                        position: "relative",
                                                        boxShadow: isAwayPicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${awayPrimary}` : "0 1px 2px rgba(0,0,0,0.02)",
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
                                                        <div style={{ ...awayBadgeStyle, marginBottom: 2 }}>
                                                            <img src={awayLogo} alt={game.away_team} style={{ width: 25, height: 25, objectFit: "contain", display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
                                                        </div>
                                                    )}
                                                    <div style={{ fontWeight: isAwayPicked ? 800 : 600, fontSize: "12px", color: isAwayPicked ? "#ffffff" : "#0f172a", marginBottom: 1, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {game.away_team}
                                                    </div>
                                                    <div style={{ fontSize: "10px", fontWeight: 700, color: isAwayPicked ? "#fef08a" : "#475569" }}>
                                                        {awaySpreadStr}
                                                    </div>
                                                </div>

                                                {/* Home Team Option Box */}
                                                <div
                                                    onClick={() => handleMakePick(game.id, game.home_team, homeUsed, locked, isHomePicked)}
                                                    style={{
                                                        backgroundImage: homeTileBg,
                                                        backgroundColor: isHomePicked ? homePrimary : "transparent",
                                                        borderRadius: 6,
                                                        border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homePrimary}40`,
                                                        padding: "6px 6px",
                                                        cursor: (locked || homeUsed) ? "not-allowed" : "pointer",
                                                        opacity: homeUsed ? 0.65 : 1,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        textAlign: "center",
                                                        position: "relative",
                                                        boxShadow: isHomePicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${homePrimary}` : "0 1px 2px rgba(0,0,0,0.02)",
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
                                                        <div style={{ ...homeBadgeStyle, marginBottom: 2 }}>
                                                            <img src={homeLogo} alt={game.home_team} style={{ width: 25, height: 25, objectFit: "contain", display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
                                                        </div>
                                                    )}
                                                    <div style={{ fontWeight: isHomePicked ? 800 : 600, fontSize: "12px", color: isHomePicked ? "#ffffff" : "#0f172a", marginBottom: 1, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {game.home_team}
                                                    </div>
                                                    <div style={{ fontSize: "10px", fontWeight: 700, color: isHomePicked ? "#fef08a" : "#475569" }}>
                                                        {homeSpreadStr}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>
        </PoolGatekeeper>
    );
}