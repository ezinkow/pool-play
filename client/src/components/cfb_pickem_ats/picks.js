import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const CFB_BLUE = "#013369";
const CFB_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function CfbPickemAtsPicks() {
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
        axios.get("/api/cfb_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        color: t.color || t.primary_color || CFB_BLUE,
                        secondaryColor: t.secondary_color || t.alt_color || "#64748b",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load CFB team colors", err));
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

            // Enforce max 15 selections limit when adding a new pick
            if (!currentPickedTeam && selectedPicksCount >= 15) {
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

    // Sorting Logic: Always prioritize must_pick games to the very top, then apply secondary sort
    const sortedGames = [...games].sort((a, b) => {
        // 1. Must-pick games always float to top
        if (a.must_pick && !b.must_pick) return -1;
        if (!a.must_pick && b.must_pick) return 1;

        // 2. Secondary user-selected sort
        if (sortBy === "kickoff") {
            const dateA = a.game_date ? new Date(a.game_date) : new Date(0);
            const dateB = b.game_date ? new Date(b.game_date) : new Date(0);
            return dateA - dateB;
        } else if (sortBy === "away_team_asc") {
            return a.away_team_nickname.localeCompare(b.away_team_nickname);
        } else if (sortBy === "away_team_desc") {
            return b.away_team_nickname.localeCompare(a.away_team_nickname);
        } else if (sortBy === "home_team_asc") {
            return a.home_team_nickname.localeCompare(b.home_team_nickname);
        } else if (sortBy === "home_team_desc") {
            return b.home_team_nickname.localeCompare(a.home_team_nickname);
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
        if (selectedPicksCount !== 15) {
            toast.error(`You must select exactly 15 games before saving! (Currently selected: ${selectedPicksCount})`);
            return;
        }

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

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading matchups...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_pickem_ats">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90, paddingTop: 90 }}>
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
                        <h2 style={{ color: CFB_BLUE, fontSize: "24px", margin: 0 }}>🏈 Pick'em Against the Spread <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏈</span></h2>
                        <p style={{ color: "#666", marginTop: 4, fontSize: "13px" }}>
                            Select exactly <strong>15 games</strong> ATS and designate exactly <strong>3 Best Bets ⭐</strong>.<br />
                            Best bets are worth 2 points.
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                            {totalMustPicks > 0 && (
                                <div style={{ background: completedMustPicks === totalMustPicks ? "#ecfdf5" : "#fff7ed", color: completedMustPicks === totalMustPicks ? "#047857" : "#c2410c", padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                                    Must-Picks: {completedMustPicks} / {totalMustPicks}
                                </div>
                            )}
                            <div style={{ background: bestBetCount === 3 ? "#ecfdf5" : "#fef3c2", color: bestBetCount === 3 ? "#047857" : "#b45309", padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                                Best Bets: {bestBetCount} / 3
                            </div>
                            <div style={{ background: selectedPicksCount === 15 ? "#ecfdf5" : "#fef2f2", color: selectedPicksCount === 15 ? "#047857" : "#b91c1c", padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                                Selected: {selectedPicksCount} / 15
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
                            <option value="team_desc">Away Team (Z-A)</option>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {sortedGames.map((game, index) => {
                            const isLocked = game.game_date && new Date() >= new Date(game.game_date);
                            const userPick = picks[game.id] || {};
                            const absSpread = Math.abs(game.adjusted_spread || game.spread || 3.0);
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

                                    <div style={{
                                        background: game.must_pick ? "#fffbeb" : "#f8fafc",
                                        borderRadius: 10,
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                                        overflow: "hidden",
                                        border: game.must_pick ? "2px solid #f59e0b" : (userPick.is_best_bet ? `2px solid ${GOLD}` : "1px solid #cbd5e1"),
                                        padding: "10px 14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 10
                                    }}>
                                        {/* Left: Matchup & Kickoff info */}
                                        <div style={{ display: "flex", flexDirection: "column", minWidth: "110px" }}>
                                            {game.must_pick && (
                                                <span style={{ fontSize: "10px", backgroundColor: "#fef3c2", color: "#b45309", padding: "1px 6px", borderRadius: 4, fontWeight: 800, width: "fit-content", marginBottom: 2 }}>
                                                    MUST-PICK
                                                </span>
                                            )}
                                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                                                {game.game_date ? new Date(game.game_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD"}
                                            </span>
                                            <span style={{ fontSize: "11px", color: "#475569", fontWeight: 600, marginTop: 2 }}>
                                                O/U: <strong>{game.over_under}</strong>
                                            </span>
                                            {isLocked && <span style={{ fontSize: "10px", color: CFB_RED, fontWeight: 700 }}>🔒 Locked</span>}
                                        </div>

                                        {/* Center: Compact Team Selection Buttons */}
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: "260px", maxWidth: "450px" }}>
                                            {/* Away Team */}
                                            <button
                                                onClick={() => handleTeamPick(game.id, game.away_team, game.game_date)}
                                                disabled={isLocked}
                                                style={{
                                                    flex: 1,
                                                    padding: "8px 10px",
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
                                                    gap: 6,
                                                    boxShadow: isAwayPicked ? `0 2px 8px ${awayColor}66` : "none",
                                                    transition: "all 0.15s ease"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                                                    {(game.away_logo || awayTeamMeta.logo) && (
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
                                                                src={game.away_logo || awayTeamMeta.logo} 
                                                                alt={game.away_team} 
                                                                style={{ 
                                                                    width: 20, 
                                                                    height: 20, 
                                                                    objectFit: "contain"
                                                                }} 
                                                            />
                                                        </span>
                                                    )}
                                                    <span style={{ fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {game.away_team_rank ? <span style={{ color: isAwayPicked ? "#fef08a" : "#b45309", marginRight: 4 }}>({game.away_team_rank})</span> : null}
                                                        {game.away_team_nickname}
                                                    </span>
                                                </div>
                                                <span style={{ 
                                                    fontSize: "11px", 
                                                    fontWeight: 700, 
                                                    flexShrink: 0,
                                                    padding: "1px 5px",
                                                    borderRadius: 4,
                                                    background: isAwayPicked ? "rgba(255,255,255,0.2)" : "transparent",
                                                    color: isAwayPicked ? "white" : "#475569"
                                                }}>
                                                    {awaySpreadStr}
                                                </span>
                                            </button>

                                            <span style={{ fontWeight: 800, color: "#94a3b8", fontSize: "12px" }}>@</span>

                                            {/* Home Team */}
                                            <button
                                                onClick={() => handleTeamPick(game.id, game.home_team, game.game_date)}
                                                disabled={isLocked}
                                                style={{
                                                    flex: 1,
                                                    padding: "8px 10px",
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
                                                    gap: 6,
                                                    boxShadow: isHomePicked ? `0 2px 8px ${homeColor}66` : "none",
                                                    transition: "all 0.15s ease"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                                                    {(game.home_logo || homeTeamMeta.logo) && (
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
                                                                src={game.home_logo || homeTeamMeta.logo} 
                                                                alt={game.home_team} 
                                                                style={{ 
                                                                    width: 20, 
                                                                    height: 20, 
                                                                    objectFit: "contain"
                                                                }} 
                                                            />
                                                        </span>
                                                    )}
                                                    <span style={{ fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {game.home_team_rank ? <span style={{ color: isHomePicked ? "#fef08a" : "#b45309", marginRight: 4 }}>({game.home_team_rank})</span> : null}
                                                        {game.home_team_nickname}
                                                    </span>
                                                </div>
                                                <span style={{ 
                                                    fontSize: "11px", 
                                                    fontWeight: 700, 
                                                    flexShrink: 0,
                                                    padding: "1px 5px",
                                                    borderRadius: 4,
                                                    background: isHomePicked ? "rgba(255,255,255,0.2)" : "transparent",
                                                    color: isHomePicked ? "white" : "#475569"
                                                }}>
                                                    {homeSpreadStr}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Right: Best Bet Action */}
                                        <div>
                                            <button
                                                onClick={() => handleBestBetToggle(game.id, game.game_date)}
                                                disabled={isLocked || !userPick.picked_team}
                                                style={{
                                                    background: userPick.is_best_bet ? GOLD : "#f1f5f9",
                                                    color: userPick.is_best_bet ? "white" : "#64748b",
                                                    border: userPick.is_best_bet ? `1px solid ${GOLD}` : "1px solid #cbd5e1",
                                                    padding: "6px 10px",
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
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {sortedGames.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                        {selectedPicksCount !== 15 && (
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
                                ⚠️ Note: You have selected <strong>{selectedPicksCount}</strong> out of <strong>15</strong> required games for Week {currentWeek}.
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