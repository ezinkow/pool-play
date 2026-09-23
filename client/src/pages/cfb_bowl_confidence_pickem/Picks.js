import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import useTeamColors from '../../hooks/useCFBTeamColors';
import PoolGatekeeper from "../../components/PoolGatekeeper";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CFB_BLUE = "#013369";
const GOLD = "#c89d3c";
const BOWL_RED = "#D50A0A";

// Sortable Single Row Component
function SortableGameRow({ game, userPick, teamColors, handleTeamPick, handleQuickShift }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: game.id, disabled: game.isLocked });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        alignItems: "center",
        height: "46px",
        boxSizing: "border-box",
        background: game.isLocked ? "#f8fafc" : (isDragging ? "#e0f2fe" : "#ffffff"),
        border: isDragging ? `2px dashed ${CFB_BLUE}` : "1px solid #cbd5e1",
        borderRadius: 6,
        padding: "0 6px",
        gap: 6,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        cursor: game.isLocked ? "default" : "grab",
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : 1,
        overflow: "hidden",
        touchAction: "none"
    };

    const awayMeta = teamColors[game.away_team] || {};
    const homeMeta = teamColors[game.home_team] || {};
    const awayLogo = awayMeta.logo || game.away_logo;
    const homeLogo = homeMeta.logo || game.home_logo;

    const awayColor = awayMeta.primaryColor || game.away_color || "#1e3a8a";
    const awaySecondary = awayMeta.secondaryColor || game.away_secondary_color || "#cbd5e1";
    const homeColor = homeMeta.primaryColor || game.home_color || "#1e3a8a";
    const homeSecondary = homeMeta.secondaryColor || game.home_secondary_color || "#cbd5e1";

    const isAwayPicked = userPick.picked_team === game.away_team;
    const isHomePicked = userPick.picked_team === game.home_team;
    const displayDate = game.game_date ? new Date(game.game_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD";
    const confidencePts = userPick.confidence_points || "";

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {/* Confidence Badge & Arrow Buttons */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f1f5f9", borderRadius: 4, border: "1px solid #cbd5e1", width: "45px", height: "34px", padding: "0 3px", flexShrink: 0, boxSizing: "border-box" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: CFB_BLUE, width: "18px", textAlign: "center" }}>{confidencePts || "-"}</span>
                {!game.isLocked && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, justifyContent: "center" }}>
                        <div onPointerDown={(e) => e.stopPropagation()} onClick={() => handleQuickShift(game.id, "up")} style={{ fontSize: "9px", fontWeight: 900, cursor: "pointer", color: "#334155", lineHeight: 1 }}>▲</div>
                        <div onPointerDown={(e) => e.stopPropagation()} onClick={() => handleQuickShift(game.id, "down")} style={{ fontSize: "9px", fontWeight: 900, cursor: "pointer", color: "#334155", lineHeight: 1 }}>▼</div>
                    </div>
                )}
            </div>

            {/* Bowl Logo, Name & Date */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "165px", flexShrink: 0 }}>
                {game.bowl_logo && (
                    <img src={game.bowl_logo} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", lineHeight: 1.1, overflow: "hidden" }}>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {game.bowl_game || "Bowl Game"}
                    </div>
                    <div style={{ fontSize: "9px", color: game.isLocked ? BOWL_RED : "#64748b" }}>
                        {displayDate} {game.isLocked && "🔒"}
                    </div>
                </div>
            </div>

            {/* Away Team Box */}
            <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => !game.isLocked && handleTeamPick(game.id, game.away_team, game.game_date)}
                style={{
                    flex: 1,
                    backgroundImage: isAwayPicked
                        ? `linear-gradient(to right, ${awayColor} 100%, ${awayColor} 100%)`
                        : `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 0%, transparent 0%), linear-gradient(135deg, ${awayColor}26 0%, ${awaySecondary}26 50%, #f8fafc 100%)`,
                    backgroundColor: isAwayPicked ? awayColor : "transparent",
                    borderRadius: 6,
                    border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayColor}55`,
                    height: "34px",
                    cursor: game.isLocked ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    padding: "0 6px",
                    position: "relative",
                    boxShadow: isAwayPicked ? `0 0 8px rgba(2, 132, 199, 0.3), inset 0 0 6px ${awayColor}` : "none",
                    transition: "background-size 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s ease",
                    backgroundSize: isAwayPicked ? "100% 100%" : "0% 100%, 100% 100%",
                    backgroundRepeat: "no-repeat"
                }}
            >
                {awayLogo && (
                    <div style={{
                        background: awaySecondary,
                        borderRadius: 4,
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${awayColor}`,
                        width: 20,
                        height: 20,
                        flexShrink: 0
                    }}>
                        <img src={awayLogo} alt="" style={{ width: 14, height: 14, objectFit: "contain", display: "block" }} />
                    </div>
                )}
                <span style={{ fontSize: "11px", fontWeight: isAwayPicked ? 800 : 600, color: isAwayPicked ? "#ffffff" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {game.away_team}
                </span>
            </div>

            {/* Home Team Box */}
            <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => !game.isLocked && handleTeamPick(game.id, game.home_team, game.game_date)}
                style={{
                    flex: 1,
                    backgroundImage: isHomePicked
                        ? `linear-gradient(to right, ${homeColor} 100%, ${homeColor} 100%)`
                        : `linear-gradient(to right, ${homeColor} 0%, ${homeColor} 0%, transparent 0%), linear-gradient(135deg, ${homeColor}26 0%, ${homeSecondary}26 50%, #f8fafc 100%)`,
                    backgroundColor: isHomePicked ? homeColor : "transparent",
                    borderRadius: 6,
                    border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homeColor}55`,
                    height: "34px",
                    cursor: game.isLocked ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    padding: "0 6px",
                    position: "relative",
                    boxShadow: isHomePicked ? `0 0 8px rgba(2, 132, 199, 0.3), inset 0 0 6px ${homeColor}` : "none",
                    transition: "background-size 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s ease",
                    backgroundSize: isHomePicked ? "100% 100%" : "0% 100%, 100% 100%",
                    backgroundRepeat: "no-repeat"
                }}
            >
                {homeLogo && (
                    <div style={{
                        background: homeSecondary,
                        borderRadius: 4,
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${homeColor}`,
                        width: 20,
                        height: 20,
                        flexShrink: 0
                    }}>
                        <img src={homeLogo} alt="" style={{ width: 14, height: 14, objectFit: "contain", display: "block" }} />
                    </div>
                )}
                <span style={{ fontSize: "11px", fontWeight: isHomePicked ? 800 : 600, color: isHomePicked ? "#ffffff" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {game.home_team}
                </span>
            </div>
        </div>
    );
}

export default function CfbBowlConfidencePicks() {
    const { user, loading: authLoading } = useAuth();
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({});
    const [poolTitle, setPoolTitle] = useState("Bowl Confidence Pick'em");
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("confidence_desc");
    const [autoStrategy, setAutoStrategy] = useState("kickoff_desc");

    const token = localStorage.getItem("token");
    const { teamColors, loading: colorsLoading } = useTeamColors(token);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (!token) return;

        axios.get("/api/settings/active-states", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const pool = res.data.find(p => p.game_key === "cfb_bowl_pickem");
                if (pool && pool.title) setPoolTitle(pool.title);
            })
            .catch(err => console.error("Failed to load pool settings", err));

        setLoading(true);
        axios.get("/api/cfb_bowl_pickem", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const fetchedGames = res.data.games || res.data || [];
                const existingPicks = res.data.userPicks || {};

                const initializedPicks = { ...existingPicks };
                let nextPt = fetchedGames.length;
                fetchedGames.forEach(g => {
                    if (!initializedPicks[g.id]) initializedPicks[g.id] = {};
                    if (!initializedPicks[g.id].confidence_points) {
                        while (Object.values(initializedPicks).some(p => p.confidence_points === nextPt) && nextPt > 0) {
                            nextPt--;
                        }
                        if (nextPt > 0) {
                            initializedPicks[g.id].confidence_points = nextPt;
                            nextPt--;
                        }
                    }
                });

                setGames(fetchedGames);
                setPicks(initializedPicks);
            })
            .catch(err => {
                console.error("Failed to load bowl games", err);
                toast.error("Failed to load bowl games");
            })
            .finally(() => setLoading(false));
    }, [token]);

    const totalGames = games.length;
    const totalSelectedCount = Object.values(picks).filter(p => p.picked_team).length;
    const remainingPicksCount = totalGames - totalSelectedCount;

    const handleTeamPick = (gameId, team, gameDate) => {
        if (gameDate && new Date() >= new Date(gameDate)) {
            toast.error("This bowl game has already started. Pick is locked.");
            return;
        }

        setPicks(prev => {
            const currentPicked = prev[gameId]?.picked_team;
            const newPickedTeam = currentPicked === team ? null : team;

            return {
                ...prev,
                [gameId]: {
                    ...prev[gameId],
                    picked_team: newPickedTeam,
                    confidence_points: prev[gameId]?.confidence_points || ""
                }
            };
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = sortedGames.findIndex(g => g.id === active.id);
        const newIndex = sortedGames.findIndex(g => g.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const newSortedGames = arrayMove(sortedGames, oldIndex, newIndex);

        setPicks(prev => {
            const copy = { ...prev };
            let pts = newSortedGames.length;
            newSortedGames.forEach(game => {
                const isLocked = game.game_date && new Date() >= new Date(game.game_date);
                if (!isLocked) {
                    if (!copy[game.id]) copy[game.id] = {};
                    copy[game.id].confidence_points = pts;
                }
                pts--;
            });
            return copy;
        });

        toast.success("Rankings updated! Don't forget to save.");
    };

    const handleQuickShift = (gameId, direction) => {
        const currentGame = games.find(g => g.id === gameId);
        if (currentGame?.game_date && new Date() >= new Date(currentGame.game_date)) {
            toast.error("Game is locked.");
            return;
        }

        const currentPts = Number(picks[gameId]?.confidence_points);
        if (!currentPts) return;

        const targetPts = direction === "up" ? currentPts + 1 : currentPts - 1;
        if (targetPts < 1 || targetPts > totalGames) return;

        const targetGameId = Object.keys(picks).find(
            gId => Number(picks[gId]?.confidence_points) === targetPts
        );

        if (targetGameId) {
            setPicks(prev => ({
                ...prev,
                [gameId]: { ...prev[gameId], confidence_points: targetPts },
                [targetGameId]: { ...prev[targetGameId], confidence_points: currentPts }
            }));
        }
    };

    const handleAutoAssign = () => {
        if (games.length === 0) return;

        const confirmed = window.confirm(
            "⚠️ Warning: Auto-assigning will completely overwrite your current confidence point rankings. Are you sure you want to proceed?"
        );
        if (!confirmed) return;

        let sortedList = [...games];

        if (autoStrategy === "kickoff_desc") {
            sortedList.sort((a, b) => new Date(b.game_date || 0) - new Date(a.game_date || 0));
        } else if (autoStrategy === "kickoff_asc") {
            sortedList.sort((a, b) => new Date(a.game_date || 0) - new Date(b.game_date || 0));
        } else if (autoStrategy === "spread_desc") {
            sortedList.sort((a, b) => (Number(b.spread) || 0) - (Number(a.spread) || 0));
        } else if (autoStrategy === "bowl_asc") {
            sortedList.sort((a, b) => (a.bowl_game || "").localeCompare(b.bowl_game || ""));
        } else if (autoStrategy === "random") {
            sortedList.sort(() => Math.random() - 0.5);
        }

        const updatedPicks = { ...picks };
        let pts = sortedList.length;

        sortedList.forEach(game => {
            const isLocked = game.game_date && new Date() >= new Date(game.game_date);
            if (!isLocked) {
                if (!updatedPicks[game.id]) updatedPicks[game.id] = {};
                updatedPicks[game.id].confidence_points = pts--;
            }
        });

        setPicks(updatedPicks);
        toast.success("Confidence points auto-assigned successfully!");
    };

    const sortedGames = [...games].map(g => ({
        ...g,
        isLocked: g.game_date && new Date() >= new Date(g.game_date)
    })).sort((a, b) => {
        const dateA = a.game_date ? new Date(a.game_date).getTime() : 0;
        const dateB = b.game_date ? new Date(b.game_date).getTime() : 0;

        if (sortBy === "confidence_desc") {
            const ptsA = Number(picks[a.id]?.confidence_points) || 0;
            const ptsB = Number(picks[b.id]?.confidence_points) || 0;
            return ptsB - ptsA;
        } else if (sortBy === "confidence_asc") {
            const ptsA = Number(picks[a.id]?.confidence_points) || 0;
            const ptsB = Number(picks[b.id]?.confidence_points) || 0;
            return ptsA - ptsB;
        } else if (sortBy === "kickoff") {
            return dateA - dateB;
        } else if (sortBy === "bowl_asc") {
            return (a.bowl_game || "").localeCompare(b.bowl_game || "");
        }
        return 0;
    });

    const handleSubmit = async () => {
        if (remainingPicksCount > 0) {
            const proceed = window.confirm(`⚠️ You still have ${remainingPicksCount} unpicked game(s). Do you want to submit your current picks anyway?`);
            if (!proceed) return;
        }

        const formattedPicks = Object.keys(picks)
            .filter(gameId => picks[gameId]?.picked_team)
            .map(gameId => ({
                game_id: Number(gameId),
                picked_team: picks[gameId].picked_team,
                confidence_points: Number(picks[gameId].confidence_points)
            }));

        try {
            await axios.post("/api/cfb_bowl_pickem/picks", {
                picks: formattedPicks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Bowl confidence rankings saved successfully!");
        } catch (err) {
            console.error("Save Bowl Picks Error:", err);
            toast.error(err.response?.data?.error || "Failed to submit bowl picks");
        }
    };

    if (authLoading || loading || colorsLoading) return <div style={{ textAlign: "center", padding: 50 }}>Loading compact matchups...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_bowl_pickem" className='page-content'>
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
                        <h2 style={{ color: CFB_BLUE, fontSize: "19px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <span>🏈</span> {poolTitle || "Bowl Confidence Pick'em"} <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏈</span>
                        </h2>
                        <p style={{ color: "#666", marginTop: 2, marginBottom: 8, fontSize: "11px", lineHeight: 1.3 }}>
                            Drag rows or use ▲▼ to rank confidence points. Click teams to select. Partial saves are allowed!<br />
                            <strong>Note: Changes do not save automatically when moving items, you must click Save Rankings to submit.</strong>
                        </p>

                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
                            <div style={{ background: remainingPicksCount > 0 ? "#fef3c2" : "#f8fafc", color: remainingPicksCount > 0 ? "#b45309" : "#475569", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: "11px", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
                                Picked: {totalSelectedCount}/{totalGames} {remainingPicksCount > 0 ? `(${remainingPicksCount} left)` : "✓ Complete"}
                            </div>
                            <button
                                onClick={handleSubmit}
                                style={{
                                    background: "#16a34a",
                                    color: "white",
                                    border: "1px solid #15803d",
                                    padding: "4px 12px",
                                    borderRadius: 6,
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 2px 4px rgba(22,163,74,0.25)"
                                }}
                            >
                                Save Rankings
                            </button>
                        </div>
                    </div>
                </div>

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
                    gap: 8,
                    flexWrap: "wrap"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>View Order:</span>
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
                                width: "100%"
                            }}
                        >
                            <option value="confidence_desc">Highest Confidence First</option>
                            <option value="confidence_asc">Lowest Confidence First</option>
                            <option value="kickoff">Kickoff Time</option>
                            <option value="bowl_asc">Bowl Name (A-Z)</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>Auto-Rank Picks:</span>
                        <select
                            value={autoStrategy}
                            onChange={(e) => setAutoStrategy(e.target.value)}
                            style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 600, background: "#f8fafc", cursor: "pointer" }}
                        >
                            <option value="kickoff_desc">Kickoff: Latest First</option>
                            <option value="kickoff_asc">Kickoff: Earliest First</option>
                            <option value="spread_desc">Spread: Highest First</option>
                            <option value="bowl_asc">Bowl Name (A-Z)</option>
                            <option value="random">Random Shuffle</option>
                        </select>
                        <button
                            onClick={handleAutoAssign}
                            style={{ background: "#f1f5f9", color: CFB_BLUE, border: "1px solid #cbd5e1", padding: "5px 10px", borderRadius: 6, fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                            Apply Auto-Rank
                        </button>
                    </div>
                </div>

                {/* Single Vertical List DndContext */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sortedGames.map(g => g.id)} strategy={verticalListSortingStrategy}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {sortedGames.map(game => (
                                <SortableGameRow
                                    key={game.id}
                                    game={game}
                                    userPick={picks[game.id] || {}}
                                    teamColors={teamColors}
                                    handleTeamPick={handleTeamPick}
                                    handleQuickShift={handleQuickShift}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* Bottom Save Action */}
                <div style={{ marginTop: 20 }}>
                    <button
                        onClick={handleSubmit}
                        style={{
                            width: "100%", padding: 12, backgroundColor: "#16a34a", color: "white",
                            borderRadius: 8, border: "none", fontWeight: 800, fontSize: "14px", cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(22,163,74,0.35)", textTransform: "uppercase", letterSpacing: "0.5px"
                        }}
                    >
                        Save Bowl Confidence Rankings
                    </button>
                </div>
            </div>
        </PoolGatekeeper>
    );
}