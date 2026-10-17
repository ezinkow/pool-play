import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import useTeamColors from '../../hooks/useNCAATeamColors';
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PickSortSelect from "../../components/picks/PickSortSelect";
import ClearPicksButton from "../../components/picks/ClearPicksButton";
import PoolEmoji from "../../components/PoolEmoji";

const NCAAB_BLUE = "#009CDE";
const NCAAB_DARK_BLUE = "#002855";
const NCAAB_RED = "#D50A0A";
const WHITE = "#FFFFFF";
const GOLD = "#c89d3c";

export default function NcaabPickemAtsPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(null);
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({}); // { game_id: { picked_team, is_best_bet } }
    const [poolTitle, setPoolTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("tipoff");

    // Tab state for filtering games: "ALL", "FRIDAY", "SATURDAY", "SUNDAY"
    const [activeTab, setActiveTab] = useState("ALL");

    const token = localStorage.getItem("token");
    const { teamColors, loading: colorsLoading, error: colorsError, refresh: refreshTeamColors } = useTeamColors(token);

    // Fetch pool settings (title and current/active week) and team colors mapping on mount
    useEffect(() => {
        if (!token) return;

        axios.get("/api/ncaab_pickem_ats/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.data) {
                    if (res.data.title) {
                        setPoolTitle(res.data.title);
                    }
                    if (res.data.current_week) {
                        setCurrentWeek(Number(res.data.current_week));
                    } else {
                        setCurrentWeek(1);
                    }
                } else {
                    setCurrentWeek(1);
                }
            })
            .catch(err => {
                console.error("Failed to load pool settings", err);
                setCurrentWeek(1);
            });
    }, [token]);

    // Fetch weekly schedule and user picks only after currentWeek is initialized
    useEffect(() => {
        if (!user || currentWeek === null) return;
        setLoading(true);
        axios.get("/api/ncaab_pickem_ats/games", {
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

    // Filter games based on the selected day tab using game_date
    const filteredGames = useMemo(() => {
        if (activeTab === "ALL") return games;
        return games.filter(g => {
            if (!g.game_date) return false;
            const d = new Date(g.game_date);
            if (isNaN(d.getTime())) return false;

            // Get weekday in UTC to avoid local timezone shift bugs
            const gameDay = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toUpperCase();
            return gameDay === activeTab;
        });
    }, [games, activeTab]);

    // Check if every game in the week has already started
    const allGamesStarted = games.length > 0 && games.every(game => {
        if (!game.game_date) return false;
        return new Date().getTime() >= new Date(game.game_date).getTime();
    });

    const totalSelectedCount = Object.values(picks).filter(p => p.picked_team).length;
    const bestBetCount = Object.values(picks).filter(p => p.is_best_bet).length;

    const mustPickGames = games.filter(g => g.must_pick);
    const totalMustPicks = mustPickGames.length;
    const completedMustPicks = mustPickGames.filter(g => picks[g.id]?.picked_team).length;

    const handleTeamPick = (gameId, team, gameDate) => {
        if (gameDate && new Date() >= new Date(gameDate)) {
            toast.error("This game has already tipped off. Pick is locked.");
            return;
        }

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
                    ...prev[gameId],
                    picked_team: team,
                    is_best_bet: prev[gameId]?.is_best_bet || false
                }
            };
        });
    };

    const handleBestBetToggle = (gameId, gameDate) => {
        if (gameDate && new Date() >= new Date(gameDate)) {
            toast.error("This game has already tipped off.");
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
            const activeGameIds = new Set(games.map(g => g.id));
            setPicks(prev => {
                const copy = { ...prev };
                Object.keys(copy).forEach(gameId => {
                    const gameObj = games.find(g => Number(g.id) === Number(gameId));
                    const isGameStarted = gameObj && gameObj.game_date && new Date() >= new Date(gameObj.game_date);

                    if (activeGameIds.has(Number(gameId)) && !isGameStarted) {
                        delete copy[gameId];
                    }
                });
                return copy;
            });
            toast.success("Cleared picks for unlocked games");
        }
    };

    const sortedGames = [...filteredGames].sort((a, b) => {
        const now = Date.now();
        const dateA = a.game_date ? new Date(a.game_date).getTime() : 0;
        const dateB = b.game_date ? new Date(b.game_date).getTime() : 0;

        const rawStatusA = (a.status || "").toUpperCase();
        const rawStatusB = (b.status || "").toUpperCase();

        const isLiveA = rawStatusA.includes("HALF") || rawStatusA.includes("PROGRESS") || rawStatusA.includes("LIVE");
        const isLiveB = rawStatusB.includes("HALF") || rawStatusB.includes("PROGRESS") || rawStatusB.includes("LIVE");

        const isStartedA = dateA <= now || isLiveA || rawStatusA.includes("FINAL") || rawStatusA.includes("COMPLETED");
        const isStartedB = dateB <= now || isLiveB || rawStatusB.includes("FINAL") || rawStatusB.includes("COMPLETED");

        if (!isStartedA && isStartedB) return -1;
        if (isStartedA && !isStartedB) return 1;

        if (!isStartedA && !isStartedB) {
            if (a.must_pick && !b.must_pick) return -1;
            if (!a.must_pick && b.must_pick) return 1;
        }

        if (sortBy === "tipoff") {
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
        if (bestBetCount > 3) {
            toast.error(`You can select a maximum of 3 Best Bets! (Currently selected: ${bestBetCount})`);
            return;
        }

        if (totalSelectedCount === 15 && bestBetCount < 3) {
            toast.error("You must select 3 Best Bets when submitting 15 total picks.");
            return;
        }

        if (completedMustPicks < totalMustPicks) {
            toast("Note: Submitting with incomplete must-picks!", { icon: '⚠️' });
        }

        if (totalSelectedCount < 15 && bestBetCount < 3) {
            toast("Note: You have fewer than 3 Best Bets selected!", { icon: '⚠️' });
        }

        if (totalSelectedCount < 15) {
            toast("Note: You have fewer than 15 picks selected!", { icon: '⚠️' });
        }

        const activeGameIds = new Set(games.map(g => String(g.id)));
        const now = new Date();

        const formattedPicks = Object.keys(picks)
            .filter(gameId => {
                if (!activeGameIds.has(String(gameId))) return false;
                const gameObj = games.find(g => String(g.id) === String(gameId));
                if (gameObj && gameObj.game_date && now >= new Date(gameObj.game_date)) {
                    return false;
                }
                return true;
            })
            .map(gameId => ({
                game_id: Number(gameId),
                picked_team: picks[gameId].picked_team,
                is_best_bet: Boolean(picks[gameId].is_best_bet)
            }));

        try {
            await axios.post("/api/ncaab_pickem_ats/picks", {
                week: currentWeek,
                picks: formattedPicks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Week ${currentWeek} picks submitted successfully!`);
            setTimeout(() => { window.location.hash = "#/ncaabpickemats/mypicks"; }, 1500);
        } catch (err) {
            console.error("Save Response Error:", err);
            toast.error(err.response?.data?.error || "Failed to submit picks");
        }
    };

    if (authLoading || loading || colorsLoading || currentWeek === null) return <div style={{ textAlign: "center", padding: 50 }}>Loading matchups...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="ncaab_pickem_ats">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "12px 8px", paddingBottom: 100, paddingTop: 16 }}>
                <Toaster />

                {/* Sticky Header Summary Bar */}
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
                        <h2 style={{ color: NCAAB_BLUE, fontSize: "19px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <PoolEmoji gameKey="ncaab_pickem_ats" /> {poolTitle || "NCAAB PICK 'EM ATS"} <PoolEmoji gameKey="ncaab_pickem_ats" />
                        </h2>
                        <p style={{ color: "#666", marginTop: 2, marginBottom: 8, fontSize: "11px", lineHeight: 1.3 }}>
                            Select up to {totalMustPicks} must-pick weekend games & up to 15 total games (up to 3 Best Bets ⭐).
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
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
                    {[...Array(17)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentWeek(i + 1)}
                            style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === i + 1 ? NCAAB_BLUE : "white",
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

                {/* DAY FILTER TABS */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", overflowX: "auto", paddingBottom: "4px" }}>
                    {["ALL", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => {
                        const isActive = activeTab === day;
                        return (
                            <button
                                key={day}
                                onClick={() => setActiveTab(day)}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    border: isActive ? `2px solid ${NCAAB_BLUE}` : "1px solid #cbd5e1",
                                    background: isActive ? NCAAB_BLUE : WHITE,
                                    color: isActive ? WHITE : "#334155",
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    boxShadow: isActive ? "0 2px 6px rgba(0,156,222,0.2)" : "none",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {day.charAt(0) + day.slice(1).toLowerCase()}
                            </button>
                        );
                    })}
                </div>

                {/* Controls Bar: Sort Dropdown & Clear Button */}
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
                        <PickSortSelect
                            value={sortBy}
                            onChange={setSortBy}
                            label="Sort:"
                            options={[
                                { value: "tipoff", label: "Tip-off Time" },
                                { value: "home_team_asc", label: "Home Team (A-Z)" },
                                { value: "home_team_desc", label: "Home Team (Z-A)" },
                                { value: "away_team_asc", label: "Away Team (A-Z)" },
                                { value: "away_team_desc", label: "Away Team (Z-A)" },
                                { value: "fav_desc", label: "Favorite Spread (High-Low)" },
                                { value: "fav_asc", label: "Favorite Spread (Low-High)" }
                            ]}
                        />
                    </div>

                    <ClearPicksButton onClick={handleClearPicks} visible={sortedGames.length > 0} />
                </div>

                {/* All Games Started Banner Notification */}
                {allGamesStarted && sortedGames.length > 0 && (
                    <div style={{
                        background: "#eff6ff",
                        borderRadius: 10,
                        padding: "16px",
                        textAlign: "center",
                        border: "1px solid #bfdbfe",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                        marginBottom: 14
                    }}>
                        <p style={{ fontSize: "14px", fontWeight: 800, color: "#1e40af", margin: 0 }}>
                            🔒 All Week {currentWeek} games have tipped off or concluded!
                        </p>
                    </div>
                )}

                {/* Games List */}
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
                            No games found for {activeTab.toLowerCase() === "all" ? `Week ${currentWeek}` : activeTab.toLowerCase()}.
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

                            const awayColor = awayTeamMeta.primaryColor || game.away_color || NCAAB_DARK_BLUE;
                            const awaySecondary = awayTeamMeta.secondaryColor || game.away_secondary_color || "#cbd5e1";

                            const homeColor = homeTeamMeta.primaryColor || game.home_color || NCAAB_DARK_BLUE;
                            const homeSecondary = homeTeamMeta.secondaryColor || game.home_secondary_color || "#cbd5e1";

                            const favoriteTeam = game.favorite;
                            const favTeamMeta = teamColors[favoriteTeam] || {};
                            const favoriteLogo = favTeamMeta.logo || (favoriteTeam === game.away_team ? awayLogo : (favoriteTeam === game.home_team ? homeLogo : game.favorite_logo)) || null;

                            const isAwayPicked = userPick.picked_team === game.away_team;
                            const isHomePicked = userPick.picked_team === game.home_team;

                            const hasStarted = isLocked || (game.home_score !== null && game.home_score !== undefined) || (game.away_score !== null && game.away_score !== undefined);
                            const rawStatus = (game.status || "").toUpperCase();
                            const liveStatusText = game.live_status || game.status_detail || (rawStatus.includes("FINAL") || rawStatus.includes("COMPLETED") ? "Final" : (hasStarted ? "In Progress" : ""));
                            const gameDateObj = game.game_date ? new Date(game.game_date) : null;
                            const isValidDate = gameDateObj && !isNaN(gameDateObj.getTime());

                            const displayDateStr = isValidDate
                                ? gameDateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()
                                : "TBD";

                            const gameHeaderLabel = hasStarted ? `${liveStatusText}` : displayDateStr;

                            const prevGame = sortedGames[index - 1];
                            const showMustPickHeader = game.must_pick && (!prevGame || !prevGame.must_pick);
                            const showRegularHeader = !game.must_pick && prevGame && prevGame.must_pick;

                            return (
                                <React.Fragment key={game.id}>
                                    {showMustPickHeader && activeTab === "ALL" && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px 0 2px 2px", fontWeight: 800, color: "#b45309", fontSize: "12px", textTransform: "uppercase" }}>
                                            <span>⭐ Must-Pick Matchups</span>
                                        </div>
                                    )}

                                    {showRegularHeader && activeTab === "ALL" && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "16px 0 2px 2px", fontWeight: 800, color: "#475569", fontSize: "12px", textTransform: "uppercase" }}>
                                            <span>Standard Matchups</span>
                                        </div>
                                    )}

                                    <div className="pick-game-card" style={{
                                        background: "#ffffff",
                                        borderRadius: 10,
                                        boxShadow: isBestBet ? "0 4px 12px rgba(200, 157, 60, 0.25)" : "0 2px 5px rgba(0, 0, 0, 0.06)",
                                        border: isBestBet ? `2px solid ${GOLD}` : (isMustPick ? "1px solid #f59e0b" : "1px solid #cbd5e1"),
                                        overflow: "hidden",
                                        padding: "10px 10px"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 4 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
                                                {game.must_pick && (
                                                    <span style={{ fontSize: "9px", backgroundColor: "#fef3c2", color: "#b45309", padding: "1px 4px", borderRadius: 3, fontWeight: 800, flexShrink: 0 }}>
                                                        MUST
                                                    </span>
                                                )}
                                                <span className={`pick-game-card-date${hasStarted ? " is-live" : ""}`} style={{ fontSize: "10px", color: hasStarted ? NCAAB_RED : "#000000", fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>
                                                    {gameHeaderLabel}
                                                </span>

                                                <span className="pick-game-card-meta" style={{ fontSize: "10px", color: "#000000", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                                                    <span className="pick-game-card-muted" style={{ color: "#64748b" }}>Spread:</span>
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
                                                            <img src={favoriteLogo} alt={favoriteTeam || "Favorite"} style={{ width: 10, height: 10, objectFit: "contain", display: "block" }} />
                                                        </span>
                                                    )}
                                                    <strong>{rawSpread}</strong>
                                                    {game.over_under !== null && game.over_under !== undefined && (
                                                        <span className="pick-game-card-muted" style={{ marginLeft: 6, color: "#475569" }}>
                                                            | O/U: <strong>{game.over_under}</strong>
                                                        </span>
                                                    )}
                                                </span>
                                                {isLocked && <span style={{ fontSize: "9px", color: NCAAB_RED, fontWeight: 700 }}>🔒</span>}
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

                                        {/* Team Selection Box Container */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                            {/* Away Team Option Box */}
                                            <div
                                                className={`pick-team-option${isAwayPicked ? " is-picked" : ""}`}
                                                onClick={() => !isLocked && handleTeamPick(game.id, game.away_team, game.game_date)}
                                                style={{
                                                    backgroundImage: isAwayPicked
                                                        ? `linear-gradient(to right, ${awayColor} 100%, ${awayColor} 100%)`
                                                        : `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 0%, transparent 0%), linear-gradient(135deg, ${awayColor}26 0%, ${awaySecondary}26 50%, var(--pick-option-neutral, #f8fafc) 100%)`,
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
                                                    <span style={{ position: "absolute", top: 4, right: 6, fontSize: "10px", color: "#ffffff", fontWeight: 900 }}>✓</span>
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
                                                <div className="pick-team-name" style={{ fontWeight: isAwayPicked ? 800 : 600, fontSize: "12px", color: isAwayPicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {game.away_team_rank ? <span style={{ color: isAwayPicked ? "#fef08a" : "#b45309", marginRight: 2 }}>({game.away_team_rank})</span> : null}
                                                    {game.away_team}
                                                </div>
                                                <div className="pick-team-line" style={{ fontSize: "11px", fontWeight: 700, color: isAwayPicked ? "#e2e8f0" : "#475569" }}>
                                                    <span>{hasLine ? awaySpreadStr : "No Line"}</span>
                                                </div>
                                            </div>

                                            {/* Home Team Option Box */}
                                            <div
                                                className={`pick-team-option${isHomePicked ? " is-picked" : ""}`}
                                                onClick={() => !isLocked && handleTeamPick(game.id, game.home_team, game.game_date)}
                                                style={{
                                                    backgroundImage: isHomePicked
                                                        ? `linear-gradient(to right, ${homeColor} 100%, ${homeColor} 100%)`
                                                        : `linear-gradient(to right, ${homeColor} 0%, ${homeColor} 0%, transparent 0%), linear-gradient(135deg, ${homeColor}26 0%, ${homeSecondary}26 50%, var(--pick-option-neutral, #f8fafc) 100%)`,
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
                                                    <span style={{ position: "absolute", top: 4, right: 6, fontSize: "10px", color: "#ffffff", fontWeight: 900 }}>✓</span>
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
                                                <div className="pick-team-name" style={{ fontWeight: isHomePicked ? 800 : 600, fontSize: "12px", color: isHomePicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {game.home_team_rank ? <span style={{ color: isHomePicked ? "#fef08a" : "#b45309", marginRight: 2 }}>({game.home_team_rank})</span> : null}
                                                    {game.home_team}
                                                </div>
                                                <div className="pick-team-line" style={{ fontSize: "11px", fontWeight: 700, color: isHomePicked ? "#e2e8f0" : "#475569" }}>
                                                    <span>{hasLine ? homeSpreadStr : "No Line"}</span>
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