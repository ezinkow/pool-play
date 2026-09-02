import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import useTeamColors from '../../hooks/useCFBTeamColors';
import PoolGatekeeper from "../../components/PoolGatekeeper";

const CFB_BLUE = "#013369";
const CFB_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function CfbPickemAtsPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({}); // { game_id: { picked_team, is_best_bet } }
    const [poolTitle, setPoolTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("kickoff");

    const token = localStorage.getItem("token");
    const { teamColors, loading: colorsLoading, error: colorsError, refresh: refreshTeamColors } = useTeamColors(token);

    // Fetch pool settings (title) and team colors mapping on mount
    useEffect(() => {
        if (!token) return;

        axios.get("/api/cfb_pickem_ats/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.data && res.data.title) {
                    setPoolTitle(res.data.title);
                }
            })
            .catch(err => console.error("Failed to load pool settings", err));
    }, [token]);

    // Fetch weekly schedule and user picks
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        axios.get("/api/cfb_pickem_ats/games", {
            params: { week: currentWeek },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const fetchedGames = res.data.games || [];
                const existingPicks = res.data.userPicks || {};

                setGames(fetchedGames);
                setPicks(existingPicks);
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

    const totalSelectedCount = Object.values(picks).filter(p => p.picked_team).length;
    const bestBetCount = Object.values(picks).filter(p => p.is_best_bet).length;

    const mustPickGames = games.filter(g => g.must_pick);
    const totalMustPicks = mustPickGames.length;
    const completedMustPicks = mustPickGames.filter(g => picks[g.id]?.picked_team).length;

    const handleTeamPick = (gameId, team, gameDate) => {
        if (gameDate && new Date() >= new Date(gameDate)) {
            toast.error("This game has already started. Pick is locked.");
            return;
        }
        console.log(gameId, team, gameDate)
        setPicks(prev => {
            const currentPickedTeam = prev[gameId]?.picked_team;
            if (currentPickedTeam === team) {
                const copy = { ...prev };
                delete copy[gameId];
                return copy;
            }

            if (!currentPickedTeam && totalSelectedCount >= 15) {
                toast.error("You can only select a maximum of 15 games!");
                return prev;
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

    const sortedGames = [...availableGames].sort((a, b) => {
        if (a.must_pick && !b.must_pick) return -1;
        if (!a.must_pick && b.must_pick) return 1;

        if (sortBy === "kickoff") {
            const dateA = a.game_date ? new Date(a.game_date) : new Date(0);
            const dateB = b.game_date ? new Date(b.game_date) : new Date(0);
            return dateA - dateB;
        } else if (sortBy === "home_team_asc") {
            return (a.home_team_nickname || a.home_team).localeCompare(b.home_team_nickname || b.home_team);
        } else if (sortBy === "home_team_desc") {
            return (b.home_team_nickname || b.home_team).localeCompare(a.home_team_nickname || a.home_team);
        } else if (sortBy === "away_team_asc") {
            return (a.away_team_nickname || a.away_team).localeCompare(b.away_team_nickname || b.away_team);
        } else if (sortBy === "away_team_desc") {
            return (b.away_team_nickname || b.away_team).localeCompare(a.away_team_nickname || a.away_team);
        } else if (sortBy === "fav_desc") {
            const spreadA = Math.abs(a.adjusted_spread !== null && a.adjusted_spread !== undefined ? a.adjusted_spread : (a.spread !== null && a.spread !== undefined ? a.spread : 0));
            const spreadB = Math.abs(b.adjusted_spread !== null && b.adjusted_spread !== undefined ? b.adjusted_spread : (b.spread !== null && b.spread !== undefined ? b.spread : 0));
            return spreadB - spreadA;
        } else if (sortBy === "fav_asc") {
            const spreadA = Math.abs(a.adjusted_spread !== null && a.adjusted_spread !== undefined ? a.adjusted_spread : (a.spread !== null && a.spread !== undefined ? a.spread : 0));
            const spreadB = Math.abs(b.adjusted_spread !== null && b.adjusted_spread !== undefined ? b.adjusted_spread : (b.spread !== null && b.spread !== undefined ? b.spread : 0));
            return spreadA - spreadB;
        }
        return 0;
    });

    const handleSubmitAll = async () => {
        console.log("--- DEBUG: handleSubmitAll started ---");
        console.log("Current Week:", currentWeek);
        console.log("Raw Picks State:", picks);
        console.log("Available Games Count:", availableGames.length);

        if (completedMustPicks !== totalMustPicks) {
            console.log(`Validation failed: Must-picks incomplete (${completedMustPicks}/${totalMustPicks})`);
            toast.error(`You must select all ${totalMustPicks} must-pick games before saving!`);
            return;
        }

        if (bestBetCount > 3) {
            console.log(`Validation failed: Too many best bets (${bestBetCount})`);
            toast.error(`You can select a maximum of 3 Best Bets! (Currently selected: ${bestBetCount})`);
            return;
        }

        if (totalSelectedCount === 15 && bestBetCount < 3) {
            console.log("Validation failed: 15 total picks selected but fewer than 3 best bets.");
            toast.error("You must select 3 Best Bets when submitting 15 total picks.");
            return;
        }

        if (totalSelectedCount < 15 && bestBetCount < 3) {
            console.log("Warning: Fewer than 3 Best Bets selected with < 15 picks.");
            toast("Note: You have fewer than 3 Best Bets selected.", { icon: '⚠️' });
        }

        const activeGameIds = new Set(availableGames.map(g => g.id));
        console.log("Active Game IDs (unlocked):", Array.from(activeGameIds));

        const formattedPicks = Object.keys(picks)
            .filter(gameId => activeGameIds.has(Number(gameId)))
            .map(gameId => ({
                game_id: Number(gameId),
                picked_team: picks[gameId].picked_team,
                is_best_bet: Boolean(picks[gameId].is_best_bet)
            }));

        console.log("Formatted Picks Payload:", formattedPicks);
        console.log("Auth Token present:", !!token);

        try {
            const response = await axios.post("/api/cfb_pickem_ats/picks", {
                week: currentWeek,
                picks: formattedPicks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Save Response Success:", response.data);
            toast.success(`Week ${currentWeek} picks submitted successfully!`);
        } catch (err) {
            console.error("Save Response Error:", err);
            console.error("Error Response Data:", err.response?.data);
            toast.error(err.response?.data?.error || "Failed to submit picks");
        }
    };

    if (authLoading || loading || colorsLoading) return <div style={{ textAlign: "center", padding: 50 }}>Loading matchups...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_pickem_ats" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "12px 8px", paddingBottom: 100, paddingTop: 16 }}>
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
                        <h2 style={{ color: CFB_BLUE, fontSize: "19px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <span>🏈</span> {poolTitle || "CFB PICK 'EM ATS"} <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏈</span>
                        </h2>
                        <p style={{ color: "#666", marginTop: 2, marginBottom: 8, fontSize: "11px", lineHeight: 1.3 }}>
                            Select all {totalMustPicks} must-pick games & up to 15 total games (up to 3 Best Bets ⭐).
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
                            {totalMustPicks > 0 && (
                                <div style={{ background: completedMustPicks === totalMustPicks ? "#ecfdf5" : "#fff7ed", color: completedMustPicks === totalMustPicks ? "#047857" : "#c2410c", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                                    Must-Picks: {completedMustPicks}/{totalMustPicks}
                                </div>
                            )}
                            <div style={{ background: bestBetCount <= 3 ? "#ecfdf5" : "#fef3c2", color: bestBetCount <= 3 ? "#047857" : "#b45309", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                                Best Bets: {bestBetCount}/3
                            </div>
                            <div style={{ background: "#f8fafc", color: "#475569", padding: "4px 8px", borderRadius: 6, fontWeight: 700, fontSize: "11px", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
                                Total: {totalSelectedCount}/15
                            </div>
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
                                backgroundColor: currentWeek === i + 1 ? CFB_BLUE : "white",
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

                {/* Controls Bar: Sort Dropdown & Save Button */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "white",
                    padding: "10px 12px",
                    borderRadius: 10,
                    marginBottom: 14,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    border: "1px solid #e2e8f0",
                    gap: 8
                }}>
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
                            <option value="home_team_asc">Home Team (A-Z)</option>
                            <option value="home_team_desc">Home Team (Z-A)</option>
                            <option value="away_team_asc">Away Team (A-Z)</option>
                            <option value="away_team_desc">Away Team (Z-A)</option>
                            <option value="fav_desc">Favorite Spread (High-Low)</option>
                            <option value="fav_asc">Favorite Spread (Low-High)</option>
                        </select>
                    </div>

                    {sortedGames.length > 0 && (
                        <button
                            onClick={handleSubmitAll}
                            style={{
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 4px rgba(22,163,74,0.3)"
                            }}
                        >
                            Save
                        </button>
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
                        {sortedGames.map((game, index) => {
                            const isLocked = game.game_date && new Date() >= new Date(game.game_date);
                            const userPick = picks[game.id] || {};
                            const isBestBet = userPick.is_best_bet;
                            const isMustPick = game.must_pick;

                            const rawSpread = game.adjusted_spread !== null && game.adjusted_spread !== undefined ? game.adjusted_spread : game.spread;
                            const hasLine = rawSpread !== null && rawSpread !== undefined;
                            const absSpread = hasLine ? (Object.is(Math.abs(rawSpread), -0) ? 0 : Math.abs(rawSpread)) : null;
                            const isAwayFav = hasLine && game.favorite === game.away_team;

                            const awaySpreadStr = hasLine ? (absSpread === 0 ? "0" : (isAwayFav ? `-${absSpread}` : `+${absSpread}`)) : null;
                            const homeSpreadStr = hasLine ? (absSpread === 0 ? "0" : (isAwayFav ? `+${absSpread}` : `-${absSpread}`)) : null;

                            const awayTeamMeta = teamColors[game.away_team] || {};
                            const homeTeamMeta = teamColors[game.home_team] || {};

                            const awayLogo = awayTeamMeta.logo || game.away_logo || null;
                            const homeLogo = homeTeamMeta.logo || game.home_logo || null;

                            const awayColor = awayTeamMeta.primaryColor || game.away_color || "#1e3a8a";
                            const awaySecondary = awayTeamMeta.secondaryColor || game.away_secondary_color || "#cbd5e1";

                            const homeColor = homeTeamMeta.primaryColor || game.home_color || "#1e3a8a";
                            const homeSecondary = homeTeamMeta.secondaryColor || game.home_secondary_color || "#cbd5e1";

                            const favoriteTeam = game.favorite;
                            const favTeamMeta = teamColors[favoriteTeam] || {};
                            const favoriteLogo = favTeamMeta.logo || (favoriteTeam === game.away_team ? awayLogo : (favoriteTeam === game.home_team ? homeLogo : game.favorite_logo)) || null;

                            const isAwayPicked = userPick.picked_team === game.away_team;
                            const isHomePicked = userPick.picked_team === game.home_team;

                            const prevGame = sortedGames[index - 1];
                            const showMustPickHeader = game.must_pick && (!prevGame || !prevGame.must_pick);
                            const showRegularHeader = !game.must_pick && prevGame && prevGame.must_pick;

                            return (
                                <React.Fragment key={game.id}>
                                    {showMustPickHeader && (
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            margin: "10px 0 2px 2px",
                                            fontWeight: 800,
                                            color: "#b45309",
                                            fontSize: "12px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px"
                                        }}>
                                            <span>⭐ Must-Pick Matchups</span>
                                        </div>
                                    )}

                                    {showRegularHeader && (
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            margin: "16px 0 2px 2px",
                                            fontWeight: 800,
                                            color: "#475569",
                                            fontSize: "12px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px"
                                        }}>
                                            <span>Standard Matchups</span>
                                        </div>
                                    )}

                                    {/* Game Card Container */}
                                    <div style={{
                                        background: "#ffffff",
                                        borderRadius: 10,
                                        boxShadow: isBestBet ? "0 4px 12px rgba(200, 157, 60, 0.25)" : "0 2px 5px rgba(0, 0, 0, 0.06)",
                                        border: isBestBet ? `2px solid ${GOLD}` : (isMustPick ? "1px solid #f59e0b" : "1px solid #cbd5e1"),
                                        overflow: "hidden",
                                        padding: "10px 10px"
                                    }}>
                                        {/* Card Header Info */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 4 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
                                                {game.must_pick && (
                                                    <span style={{ fontSize: "9px", backgroundColor: "#fef3c2", color: "#b45309", padding: "1px 4px", borderRadius: 3, fontWeight: 800, flexShrink: 0 }}>
                                                        MUST
                                                    </span>
                                                )}
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
                                                {isLocked && <span style={{ fontSize: "9px", color: CFB_RED, fontWeight: 700 }}>🔒</span>}
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
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                            {/* Away Team Option Box */}
                                            <div
                                                onClick={() => !isLocked && handleTeamPick(game.id, game.away_team, game.game_date)}
                                                style={{
                                                    background: isAwayPicked ? awayColor : `linear-gradient(135deg, ${awayColor}26 0%, ${awaySecondary}26 50%, #f8fafc 100%)`,
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
                                                    transition: "all 0.15s ease",
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
                                                        width: 26,
                                                        height: 26,
                                                        flexShrink: 0
                                                    }}>
                                                        <img src={awayLogo} alt={game.away_team} style={{ width: 18, height: 18, objectFit: "contain", display: "block" }} />
                                                    </div>
                                                )}
                                                <div style={{ fontWeight: isAwayPicked ? 800 : 600, fontSize: "12px", color: isAwayPicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {game.away_team_rank ? <span style={{ color: isAwayPicked ? "#fef08a" : "#b45309", marginRight: 2 }}>({game.away_team_rank})</span> : null}
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
                                                    background: isHomePicked ? homeColor : `linear-gradient(135deg, ${homeColor}26 0%, ${homeSecondary}26 50%, #f8fafc 100%)`,
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
                                                    transition: "all 0.15s ease",
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
                                                        width: 26,
                                                        height: 26,
                                                        flexShrink: 0
                                                    }}>
                                                        <img src={homeLogo} alt={game.home_team} style={{ width: 18, height: 18, objectFit: "contain", display: "block" }} />
                                                    </div>
                                                )}
                                                <div style={{ fontWeight: isHomePicked ? 800 : 600, fontSize: "12px", color: isHomePicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {game.home_team_rank ? <span style={{ color: isHomePicked ? "#fef08a" : "#b45309", marginRight: 2 }}>({game.home_team_rank})</span> : null}
                                                    {game.home_team}
                                                </div>
                                                <div style={{ fontSize: "11px", fontWeight: 700, color: isHomePicked ? "#e2e8f0" : "#475569" }}>
                                                    {hasLine ? homeSpreadStr : "No Line"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {sortedGames.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                        {(completedMustPicks !== totalMustPicks || bestBetCount > 3) && (
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
                                ⚠️ Note: Select all <strong>{totalMustPicks}</strong> must-pick games ({completedMustPicks}/{totalMustPicks}) & max 3 Best Bets.
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