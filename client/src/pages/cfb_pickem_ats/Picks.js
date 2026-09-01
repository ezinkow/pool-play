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
    const [sortBy, setSortBy] = useState("kickoff"); // "kickoff", "home_team_asc", "home_team_desc", "away_team_asc", "away_team_desc", "fav_desc", "fav_asc"
    
    const token = localStorage.getItem("token");
    const { teamColors, loading: colorsLoading, error: colorsError, refresh: refreshTeamColors } = useTeamColors(token);

    // Fetch pool settings (title) and team colors mapping on mount
    useEffect(() => {
        if (!token) return;

        // Fetch game settings for title
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

    // Calculate total picks across all games including locked/past games already saved in backend plus current front-end state
    const totalSelectedCount = Object.values(picks).filter(p => p.picked_team).length;
    const bestBetCount = Object.values(picks).filter(p => p.is_best_bet).length;

    // Calculate total must-pick count and how many have been picked by the user
    const mustPickGames = games.filter(g => g.must_pick);
    const totalMustPicks = mustPickGames.length;
    const completedMustPicks = mustPickGames.filter(g => picks[g.id]?.picked_team).length;

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

            // Enforce absolute max 15 selections limit as a safety check
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

    // Sorting Logic: Update to sort availableGames instead of raw games
    const sortedGames = [...availableGames].sort((a, b) => {
        // 1. Must-pick games always float to top
        if (a.must_pick && !b.must_pick) return -1;
        if (!a.must_pick && b.must_pick) return 1;

        // 2. Secondary user-selected sort
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
        if (completedMustPicks !== totalMustPicks) {
            toast.error(`You must select all ${totalMustPicks} must-pick games before saving!`);
            return;
        }

        if (bestBetCount > 3) {
            toast.error(`You can select a maximum of 3 Best Bets! (Currently selected: ${bestBetCount})`);
            return;
        }

        // If user is submitting 15 total picks (including past locked games), they MUST have exactly 3 Best Bets
        if (totalSelectedCount === 15 && bestBetCount < 3) {
            toast.error("You must select 3 Best Bets when submitting 15 total picks.");
            return;
        }

        // If user has less than 15 total picks, show a warning toast that they don't have 3 best bets yet, but allow submission
        if (totalSelectedCount < 15 && bestBetCount < 3) {
            toast("Note: You have fewer than 3 Best Bets selected.", { icon: '⚠️' });
        }

        // Only include picks for games that are NOT locked (i.e. present in availableGames)
        const activeGameIds = new Set(availableGames.map(g => g.id));

        const formattedPicks = Object.keys(picks)
            .filter(gameId => activeGameIds.has(Number(gameId)))
            .map(gameId => ({
                game_id: Number(gameId),
                picked_team: picks[gameId].picked_team,
                is_best_bet: picks[gameId].is_best_bet
            }));

        try {
            await axios.post("/api/cfb_pickem_ats/picks", {
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

    if (authLoading || loading || colorsLoading) return <div style={{ textAlign: "center", padding: 50 }}>Loading matchups...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_pickem_ats" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90, paddingTop: 30 }}>
                <Toaster />

                {/* Sticky Header Summary Bar */}
                <div style={{
                    position: "sticky",
                    top: "56px",
                    zIndex: 99,
                    background: "#ffffff",
                    paddingTop: 14,
                    paddingBottom: 14,
                    borderBottom: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                    marginBottom: 16,
                    marginLeft: "-12px",
                    marginRight: "-12px",
                    paddingLeft: "12px",
                    paddingRight: "12px"
                }}>
                    <div style={{ textAlign: "center" }}>
                        <h2 style={{ color: CFB_BLUE, fontSize: "24px", margin: 0 }}>🏈 {poolTitle} <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏈</span></h2>
                        <p style={{ color: "#666", marginTop: 4, fontSize: "13px" }}>
                            Select all {totalMustPicks} must-pick games and up to 15 total games, designating up to <strong>3 Best Bets ⭐</strong>.<br />
                            Best bets are worth 2 points.
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                            {totalMustPicks > 0 && (
                                <div style={{ background: completedMustPicks === totalMustPicks ? "#ecfdf5" : "#fff7ed", color: completedMustPicks === totalMustPicks ? "#047857" : "#c2410c", padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                                    Must-Picks: {completedMustPicks} / {totalMustPicks}
                                </div>
                            )}
                            <div style={{ background: bestBetCount <= 3 ? "#ecfdf5" : "#fef3c2", color: bestBetCount <= 3 ? "#047857" : "#b45309", padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                                Best Bets: {bestBetCount} / 3
                            </div>
                            <div style={{ background: "#f8fafc", color: "#475569", padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px", border: "1px solid #cbd5e1" }}>
                                Total Selected: {totalSelectedCount} / 15
                            </div>
                        </div>
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
                                backgroundColor: currentWeek === i + 1 ? CFB_BLUE : "white",
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

                {/* Controls Bar: Sort Dropdown & Save Button */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "white",
                    padding: "12px 16px",
                    borderRadius: 12,
                    marginBottom: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    border: "1px solid #e2e8f0",
                    flexWrap: "wrap",
                    gap: 12
                }}>
                    {/* Sort Dropdown */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>Sort By:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                padding: "6px 12px",
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
                            <option value="home_team_asc">Home Team (A-Z)</option>
                            <option value="home_team_desc">Home Team (Z-A)</option>
                            <option value="away_team_asc">Away Team (A-Z)</option>
                            <option value="away_team_desc">Away Team (Z-A)</option>
                            <option value="fav_desc">Favorite Spread (Biggest to Least)</option>
                            <option value="fav_asc">Favorite Spread (Least to Biggest)</option>
                        </select>
                    </div>

                    {/* Top Save Button */}
                    {sortedGames.length > 0 && (
                        <button
                            onClick={handleSubmitAll}
                            style={{
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                padding: "6px 16px",
                                borderRadius: 6,
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: "pointer",
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

                            // Team metadata lookup (falling back to game object properties if not found in cfb_teams hook)
                            const awayTeamMeta = teamColors[game.away_team] || {};
                            const homeTeamMeta = teamColors[game.home_team] || {};

                            const awayLogo = awayTeamMeta.logo || game.away_logo || null;
                            const homeLogo = homeTeamMeta.logo || game.home_logo || null;

                            const awayColor = awayTeamMeta.primaryColor || game.away_color || "#1e3a8a";
                            const awaySecondary = awayTeamMeta.secondaryColor || game.away_secondary_color || "#cbd5e1";

                            const homeColor = homeTeamMeta.primaryColor || game.home_color || "#1e3a8a";
                            const homeSecondary = homeTeamMeta.secondaryColor || game.home_secondary_color || "#cbd5e1";

                            // Determine favorite team logo for the header display
                            const favoriteTeam = game.favorite;
                            const favTeamMeta = teamColors[favoriteTeam] || {};
                            const favoriteLogo = favTeamMeta.logo || (favoriteTeam === game.away_team ? awayLogo : (favoriteTeam === game.home_team ? homeLogo : game.favorite_logo)) || null;

                            const isAwayPicked = userPick.picked_team === game.away_team;
                            const isHomePicked = userPick.picked_team === game.home_team;

                            // Check if we need to render a section header for Must-Pick games vs Regular games
                            const prevGame = sortedGames[index - 1];
                            const showMustPickHeader = game.must_pick && (!prevGame || !prevGame.must_pick);
                            const showRegularHeader = !game.must_pick && prevGame && prevGame.must_pick;

                            return (
                                <React.Fragment key={game.id}>
                                    {showMustPickHeader && (
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            margin: "12px 0 4px 4px",
                                            fontWeight: 800,
                                            color: "#b45309",
                                            fontSize: "13px",
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
                                            gap: 8,
                                            margin: "20px 0 4px 4px",
                                            fontWeight: 800,
                                            color: "#475569",
                                            fontSize: "13px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px"
                                        }}>
                                            <span>Standard Matchups</span>
                                        </div>
                                    )}

                                    {/* Game Card Container with White Background */}
                                    <div style={{
                                        background: "#ffffff",
                                        borderRadius: 12,
                                        boxShadow: isBestBet ? "0 4px 14px rgba(200, 157, 60, 0.25)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                                        border: isBestBet ? `2px solid ${GOLD}` : (isMustPick ? "1px solid #f59e0b" : "1px solid #cbd5e1"),
                                        overflow: "hidden",
                                        padding: "12px 14px"
                                    }}>
                                        {/* Card Header Info with Favorite Logo placed cleanly after Spread */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", whiteSpace: "nowrap", overflowX: "auto" }}>
                                                {game.must_pick && (
                                                    <span style={{ fontSize: "10px", backgroundColor: "#fef3c2", color: "#b45309", padding: "1px 6px", borderRadius: 4, fontWeight: 800, flexShrink: 0 }}>
                                                        MUST-PICK
                                                    </span>
                                                )}
                                                <span style={{ fontSize: "11px", color: "#000000", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>
                                                    {game.game_date ? new Date(game.game_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase() : "TBD"}
                                                </span>
                                                
                                                <span style={{ fontSize: "11px", color: "#000000", fontWeight: 600, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                    Spread: 
                                                    {favoriteLogo && (
                                                        <span style={{
                                                            background: favTeamMeta.secondaryColor || homeSecondary,
                                                            borderRadius: 4,
                                                            padding: "1px",
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            border: `1px solid ${favTeamMeta.primaryColor || homeColor}`,
                                                            width: 18,
                                                            height: 18,
                                                            flexShrink: 0,
                                                            verticalAlign: "middle"
                                                        }}>
                                                            <img 
                                                                src={favoriteLogo} 
                                                                alt={favoriteTeam || "Favorite"} 
                                                                title={favoriteTeam ? `Favorite: ${favoriteTeam}` : "Favorite"}
                                                                style={{ width: 12, height: 12, objectFit: "contain", display: "block" }} 
                                                            />
                                                        </span>
                                                    )}
                                                    <strong>{rawSpread}</strong> | O/U: <strong>{game.over_under}</strong>
                                                </span>
                                                {isLocked && <span style={{ fontSize: "10px", color: CFB_RED, fontWeight: 700, flexShrink: 0 }}>🔒 Locked</span>}
                                            </div>

                                            <div>
                                                <button
                                                    onClick={() => handleBestBetToggle(game.id, game.game_date)}
                                                    disabled={isLocked || !userPick.picked_team}
                                                    style={{
                                                        background: userPick.is_best_bet ? GOLD : "#334155",
                                                        color: userPick.is_best_bet ? "white" : "#cbd5e1",
                                                        border: userPick.is_best_bet ? `1px solid ${GOLD}` : "1px solid #475569",
                                                        padding: "4px 10px",
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

                                        {/* Side-by-Side Team Selection Box Container */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            {/* Away Team Option Box */}
                                            <div
                                                onClick={() => !isLocked && handleTeamPick(game.id, game.away_team, game.game_date)}
                                                style={{
                                                    background: isAwayPicked ? awayColor : `linear-gradient(135deg, ${awayColor}33 0%, ${awaySecondary}33 50%, #f8fafc 100%)`,
                                                    borderRadius: 8,
                                                    border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayColor}66`,
                                                    padding: "10px 12px",
                                                    cursor: isLocked ? "not-allowed" : "pointer",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    textAlign: "center",
                                                    position: "relative",
                                                    boxShadow: isAwayPicked ? `0 0 14px rgba(2, 132, 199, 0.4), inset 0 0 10px ${awayColor}` : "none",
                                                    transition: "all 0.15s ease"
                                                }}
                                            >
                                                {isAwayPicked && (
                                                    <span style={{
                                                        position: "absolute",
                                                        top: 6,
                                                        right: 8,
                                                        fontSize: "11px",
                                                        color: "#ffffff",
                                                        fontWeight: 900
                                                    }}>
                                                        ✓
                                                    </span>
                                                )}
                                                {awayLogo && (
                                                    <div style={{
                                                        background: awaySecondary,
                                                        borderRadius: 8,
                                                        padding: "4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        boxShadow: `0 0 6px 1px ${awayColor}, 0 2px 4px rgba(0,0,0,0.15)`,
                                                        border: `1.5px solid ${awayColor}`,
                                                        marginBottom: 6,
                                                        width: 32,
                                                        height: 32
                                                    }}>
                                                        <img src={awayLogo} alt={game.away_team} style={{ width: 22, height: 22, objectFit: "contain", display: "block" }} />
                                                    </div>
                                                )}
                                                <div style={{ fontWeight: isAwayPicked ? 800 : 600, fontSize: "13px", color: isAwayPicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.2 }}>
                                                    {game.away_team_rank ? <span style={{ color: isAwayPicked ? "#fef08a" : "#b45309", marginRight: 3 }}>({game.away_team_rank})</span> : null}
                                                    {game.away_team}
                                                </div>
                                                <div style={{ fontSize: "12px", fontWeight: 700, color: isAwayPicked ? "#e2e8f0" : "#475569" }}>
                                                    {hasLine ? awaySpreadStr : "No Line"}
                                                </div>
                                            </div>

                                            {/* Home Team Option Box */}
                                            <div
                                                onClick={() => !isLocked && handleTeamPick(game.id, game.home_team, game.game_date)}
                                                style={{
                                                    background: isHomePicked ? homeColor : `linear-gradient(135deg, ${homeColor}33 0%, ${homeSecondary}33 50%, #f8fafc 100%)`,
                                                    borderRadius: 8,
                                                    border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homeColor}66`,
                                                    padding: "10px 12px",
                                                    cursor: isLocked ? "not-allowed" : "pointer",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    textAlign: "center",
                                                    position: "relative",
                                                    boxShadow: isHomePicked ? `0 0 14px rgba(2, 132, 199, 0.4), inset 0 0 10px ${homeColor}` : "none",
                                                    transition: "all 0.15s ease"
                                                }}
                                            >
                                                {isHomePicked && (
                                                    <span style={{
                                                        position: "absolute",
                                                        top: 6,
                                                        right: 8,
                                                        fontSize: "11px",
                                                        color: "#ffffff",
                                                        fontWeight: 900
                                                    }}>
                                                        ✓
                                                    </span>
                                                )}
                                                {homeLogo && (
                                                    <div style={{
                                                        background: homeSecondary,
                                                        borderRadius: 8,
                                                        padding: "4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        boxShadow: `0 0 6px 1px ${homeColor}, 0 2px 4px rgba(0,0,0,0.15)`,
                                                        border: `1.5px solid ${homeColor}`,
                                                        marginBottom: 6,
                                                        width: 32,
                                                        height: 32
                                                    }}>
                                                        <img src={homeLogo} alt={game.home_team} style={{ width: 22, height: 22, objectFit: "contain", display: "block" }} />
                                                    </div>
                                                )}
                                                <div style={{ fontWeight: isHomePicked ? 800 : 600, fontSize: "13px", color: isHomePicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.2 }}>
                                                    {game.home_team_rank ? <span style={{ color: isHomePicked ? "#fef08a" : "#b45309", marginRight: 3 }}>({game.home_team_rank})</span> : null}
                                                    {game.home_team}
                                                </div>
                                                <div style={{ fontSize: "12px", fontWeight: 700, color: isHomePicked ? "#e2e8f0" : "#475569" }}>
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
                    <div style={{ marginTop: 24 }}>
                        {(completedMustPicks !== totalMustPicks || bestBetCount > 3) && (
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
                                ⚠️ Note: You must select all <strong>{totalMustPicks}</strong> must-pick games (Currently selected: <strong>{completedMustPicks}/{totalMustPicks}</strong>) and at most 3 Best Bets.
                            </div>
                        )}
                        <button
                            onClick={handleSubmitAll}
                            style={{
                                width: "100%", padding: 14, backgroundColor: "#16a34a", color: "white",
                                borderRadius: 10, border: "none", fontWeight: 800, fontSize: "15px", cursor: "pointer",
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