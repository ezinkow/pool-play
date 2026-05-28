import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import BracketStageRegion from "./BracketStageRegion";
import BracketStage from "./BracketStage";

const GOLD = "#c89d3c";
const WORLDCUPGREEN = "#226750";

const ROUND_LABELS = {
    1: "Round of 32",
    2: "Round of 16",
    3: "Quarterfinals",
    4: "Semifinals",
    5: "Championship"
};
const TABS = ["Left Bracket", "Right Bracket", "Finals View"];

export default function WorldCupBracket() {
    const { user: user } = useAuth();
    const [games, setGames] = useState([]);
    const [standings, setStandings] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(""); // 👈 STAGE 1: Shift to tracking User IDs instead of names
    const [userPicks, setUserPicks] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("Left Bracket");

    useEffect(() => {
        Promise.all([
            axios.get("/api/worldcup/matches"),
            axios.get("/api/worldcup/standings")
        ]).then(([gamesRes, standingsRes]) => {
            const knockoutMatches = gamesRes.data.filter(m => parseInt(m.round) > 0 && parseInt(m.round) <= 5);
            setGames(knockoutMatches);
            setStandings(standingsRes.data || []);
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching tournament data:", err);
            setLoading(false);
        });
    }, []);

    // Sync selected user state to the logged-in user profile ID on original mount
    useEffect(() => {
        if (user?.id && !selectedUserId) {
            setSelectedUserId(user.id);
        }
    }, [user, selectedUserId]);

    // ⚡ STAGE 2: Lookup parameters now match your exact database index keys
    useEffect(() => {
        const targetUserId = selectedUserId || user?.id;
        if (!targetUserId) return;

        axios.get("/api/worldcup/picks", {
            params: {
                user_id: targetUserId
            }
        })
            .then(res => {
                const map = {};
                for (const p of res.data) {
                    const idKey = p.match_id || p.game_id;
                    if (idKey) {
                        map[idKey] = p.pick || p.selection;
                    }
                }
                setUserPicks(map);
            }).catch(err => console.error("Error loading user selections:", err));
    }, [selectedUserId, user]);

    const clearDownstreamPicks = (currentPicks, removedTeam, fromRound) => {
        for (const g of games) {
            if (currentPicks[g.match_id] === removedTeam && g.round > fromRound) {
                delete currentPicks[g.match_id];
                clearDownstreamPicks(currentPicks, removedTeam, g.round);
            }
        }
    };

    const handlePickSelection = (gameId, teamName) => {
        if (!teamName || teamName === "TBD" || teamName.includes("Winner") || teamName.includes("Place")) return;

        const targetGame = games.find(g => String(g.match_id) === String(gameId));
        if (!targetGame) return;

        setUserPicks(prev => {
            const next = { ...prev };
            const oldPick = prev[gameId];

            if (oldPick && oldPick !== teamName) {
                clearDownstreamPicks(next, oldPick, targetGame.round);
            }

            next[gameId] = teamName;
            return next;
        });
    };

    const handleSaveBracket = async () => {
        if (!user?.id) {
            return toast.error("You must be logged in to save your bracket.");
        }

        setSaving(true);
        try {
            await axios.post("/api/worldcup/picks/bracket", {
                user_id: user.id,
                picks: Object.entries(userPicks).map(([game_id, pick]) => ({ game_id, pick }))
            });
            toast.success("Knockout bracket choices saved successfully!");
        } catch (err) {
            console.error("Submission layout error:", err.response?.data || err.message);
            toast.error("Failed to save bracket selections.");
        } finally {
            setSaving(false);
        }
    };

    const getSideGames = (side) => {
        return games.filter(g => {
            if (g.round >= 5) return false;
            const totalGamesInRound = 32 / Math.pow(2, g.round);
            const midPoint = totalGamesInRound / 2;
            return side === "left" ? g.bracket_slot <= midPoint : g.bracket_slot > midPoint;
        });
    };

    const getFeederGame = (game, side) => {
        if (parseInt(game.round) === 1) return null;

        if (game.round === 5) {
            const semis = games.filter(g => g.round === 4);
            return semis.find(g => g.bracket_slot === (side === "home" ? 1 : 2)) || null;
        }

        const prevRound = game.round - 1;
        const slot1 = (game.bracket_slot - 1) * 2 + 1;
        const slot2 = (game.bracket_slot - 1) * 2 + 2;

        const feeders = games.filter(g => g.round === prevRound && (g.bracket_slot === slot1 || g.bracket_slot === slot2));
        return feeders[side === "home" ? 0 : 1] || null;
    };

    const getDisplayGame = (game) => {
        let displayGame = { ...game };

        if (parseInt(game.round) === 1) return displayGame;

        const fHome = getFeederGame(game, "home");
        const fAway = getFeederGame(game, "away");

        if (fHome) {
            const evaluatedHomeFeeder = getDisplayGame(fHome);
            const savedUserChoice = userPicks[fHome.match_id];

            if (savedUserChoice && savedUserChoice !== "TBD" && !savedUserChoice.includes("Winner") && !savedUserChoice.includes("Place")) {
                displayGame.home_team = savedUserChoice;
                displayGame.home_logo = (displayGame.home_team === evaluatedHomeFeeder.home_team) ? evaluatedHomeFeeder.home_logo
                    : (displayGame.home_team === evaluatedHomeFeeder.away_team) ? evaluatedHomeFeeder.away_logo
                        : null;
            } else {
                displayGame.home_team = "TBD";
                displayGame.home_logo = null;
            }
        }

        if (fAway) {
            const evaluatedAwayFeeder = getDisplayGame(fAway);
            const savedUserChoice = userPicks[fAway.match_id];

            if (savedUserChoice && savedUserChoice !== "TBD" && !savedUserChoice.includes("Winner") && !savedUserChoice.includes("Place")) {
                displayGame.away_team = savedUserChoice;
                displayGame.away_logo = (displayGame.away_team === evaluatedAwayFeeder.home_team) ? evaluatedAwayFeeder.home_logo
                    : (displayGame.away_team === evaluatedAwayFeeder.away_team) ? evaluatedAwayFeeder.away_logo
                        : null;
            } else {
                displayGame.away_team = "TBD";
                displayGame.away_logo = null;
            }
        }

        return displayGame;
    };

    if (loading) return <div style={{ padding: 80, textAlign: "center", color: WORLDCUPGREEN }}>Loading World Cup Bracket Matrix...</div>;

    const champGame = games.find(g => g.round === 5);
    const mobileFilteredGames = activeTab === "Left Bracket" ? getSideGames("left") : activeTab === "Right Bracket" ? getSideGames("right") : games.filter(g => g.round === 5);

    return (
        <div  style={{ maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px" }}>
            <Toaster position="top-center" />

            <div style={{ background: `linear-gradient(135deg, ${WORLDCUPGREEN} 0%, #1e5fa8 100%)`, color: "white", padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h2 style={{ margin: 0, color: GOLD, fontWeight: 900 }}>🏆 My World Cup Bracket Selections</h2>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>📝 Lock in your knockout roadmap below. Don't forget to save!</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* 🛠️ Dropdown user filter selection box if you ever decide to display pool sheets by user ID rows */}
                        {/* <span style={{ fontWeight: 700, fontSize: 14, backgroundColor: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: 6 }}>
                            👤 Entry ID Context: {user?.id}
                        </span> */}

                        <button onClick={handleSaveBracket} disabled={saving} style={{ padding: "8px 20px", borderRadius: "6px", backgroundColor: "#16a34a", color: "white", border: "none", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.2)" }}>
                            {saving ? "Saving Selection..." : "💾 Save My Bracket"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bracket-desktop-row" style={{ overflowX: "auto", padding: "0 16px" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", width: 1650, margin: "0 auto" }}>
                    <BracketStageRegion sideLabel="Left Bracket Tree" games={getSideGames("left")} userPicks={userPicks} readonly={false} flipped={false} getDisplayGame={getDisplayGame} onPick={handlePickSelection} />

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 220, flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: WORLDCUPGREEN, borderBottom: `2px solid ${GOLD}`, paddingBottom: 4, width: "100%", textAlign: "center" }}>🏆 CHAMPIONSHIP MATCH</div>
                        {champGame && <BracketStage game={getDisplayGame(champGame)} userPick={userPicks[champGame.match_id]} readonly={false} onPick={handlePickSelection} />}

                        {champGame && userPicks[champGame.match_id] && userPicks[champGame.match_id] !== "TBD" && (
                            <div style={{
                                marginTop: 16,
                                width: "100%",
                                textAlign: "center",
                                padding: "16px 12px",
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                                border: `2px solid ${GOLD}`,
                                boxShadow: `0 10px 25px rgba(200, 157, 60, 0.25)`,
                                animation: "fadeIn 0.4s ease-out"
                            }}>
                                <div style={{ fontSize: "10px", fontWeight: 800, color: GOLD, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
                                    👑 PREDICTED CHAMPION
                                </div>

                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                    {(() => {
                                        const finalGameData = getDisplayGame(champGame);
                                        const champLogo = userPicks[champGame.match_id] === finalGameData.home_team ? finalGameData.home_logo : finalGameData.away_logo;
                                        return champLogo && <img src={champLogo} alt="" style={{ height: 22, width: 32, objectFit: "contain", borderRadius: 2 }} />;
                                    })()}

                                    <span style={{ fontSize: "20px", fontWeight: 900, color: "white", letterSpacing: "-0.5px" }}>
                                        {userPicks[champGame.match_id]}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <BracketStageRegion sideLabel="Right Bracket Tree" games={getSideGames("right")} userPicks={userPicks} readonly={false} flipped={true} getDisplayGame={getDisplayGame} onPick={handlePickSelection} />
                </div>
            </div>

            <div className="bracket-mobile-column" style={{ padding: "0 12px" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "8px 16px", borderRadius: 20, border: "none", fontWeight: 700, backgroundColor: activeTab === t ? WORLDCUPGREEN : "#e5e7eb", color: activeTab === t ? "white" : "#475569" }}>{t}</button>
                    ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {mobileFilteredGames.map(game => (
                        <div key={game.match_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{ROUND_LABELS[game.round]}</span>
                            <BracketStage game={getDisplayGame(game)} userPick={userPicks[game.match_id]} readonly={false} onPick={handlePickSelection} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}