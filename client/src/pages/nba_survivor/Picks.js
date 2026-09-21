import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NBA_BLUE = "#013369";

export default function NbaSurvivorPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [maxAvailableWeek, setMaxAvailableWeek] = useState(1);
    const [games, setGames] = useState([]);
    const [userPicks, setUserPicks] = useState({});
    const [usedTeams, setUsedTeams] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) return;
        axios.get("/api/nba_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    const nameKey = t.name || t.team_name || t.full_name;
                    if (nameKey) {
                        map[nameKey] = {
                            primaryColor: t.primary_color || t.color || t.primary || NBA_BLUE,
                            secondaryColor: t.secondary_color || t.secondaryColor || t.alt_color || "#cbd5e1",
                            logo: t.logo || t.team_logo || t.logo_url,
                            record: t.record || ""
                        };
                    }
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NBA team colors", err));
    }, [token]);

    const loadSurvivorData = (weekToFetch) => {
        if (!user) return;
        setLoading(true);
        axios.get("/api/nba_survivor/picks", {
            params: { week: weekToFetch },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const data = res.data || {};
                setGames(data.games || []);
                setUserPicks(data.userPicks || {});
                setUsedTeams(data.usedTeams || []);

                const activeWk = data.currentWeek || weekToFetch;
                if (activeWk >= maxAvailableWeek) {
                    setMaxAvailableWeek(activeWk);
                    setCurrentWeek(activeWk);
                }
            })
            .catch(err => {
                console.error("Failed to load survivor picks", err);
                toast.error("Failed to load pool data");
                setGames([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!user) return;
        loadSurvivorData(currentWeek);
    }, [user]);

    const handleWeekChange = (targetWeek) => {
        if (targetWeek > maxAvailableWeek) {
            toast.error("You cannot look ahead or make picks for future weeks!");
            return;
        }
        setCurrentWeek(targetWeek);
        loadSurvivorData(targetWeek);
    };

    const handleTeamSelect = async (teamName, teamDays, isUsed, isAlreadyPicked) => {
        const hasLockedGame = Object.values(teamDays).some(d => d && d.locked);
        if (hasLockedGame || (isUsed && !isAlreadyPicked)) return;

        const firstGame = Object.values(teamDays).find(d => d !== null);
        if (!firstGame) return;

        try {
            const res = await axios.post("/api/nba_survivor/picks", {
                week: currentWeek,
                game_id: firstGame.gameId,
                picked_team: teamName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.cleared) {
                toast.error(`Removed pick for Week ${currentWeek}`);
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

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading survivor dashboard...</div>;

    const currentWeekPick = userPicks[currentWeek];
    const pickedTeamMeta = teamColors[currentWeekPick] || {};
    const pickedPrimary = pickedTeamMeta.primaryColor || NBA_BLUE;
    const pickedSecondary = pickedTeamMeta.secondaryColor || "#cbd5e1";

    const bannerBg = currentWeekPick
        ? `linear-gradient(135deg, ${pickedPrimary}, ${pickedSecondary})`
        : "#fffbeb";

    const activeTeamsSet = new Set(Object.keys(teamColors));
    games.forEach(g => {
        if (g.home_team) activeTeamsSet.add(g.home_team);
        if (g.away_team) activeTeamsSet.add(g.away_team);
    });
    const allTeamNames = Array.from(activeTeamsSet).sort();

    const teamMap = {};
    allTeamNames.forEach(team => {
        teamMap[team] = { Fri: null, Sat: null, Sun: null };
    });

    games.forEach(game => {
        if (!game.game_date) return;
        const d = new Date(game.game_date);
        const dayOfWeek = d.getDay();

        let dayKey = null;
        if (dayOfWeek === 5) dayKey = "Fri";
        else if (dayOfWeek === 6) dayKey = "Sat";
        else if (dayOfWeek === 0) dayKey = "Sun";

        if (!dayKey) return;

        const formatOpponentInfo = (myTeam, oppTeam, gameObj) => {
            const oppMeta = teamColors[oppTeam] || {};
            const rawSpread = gameObj.spread;
            const isHome = gameObj.home_team === myTeam;
            const isFav = gameObj.favorite === myTeam;
            let spreadStr = "no line yet";

            if (rawSpread !== null && rawSpread !== undefined && rawSpread !== 0) {
                const absVal = Math.abs(rawSpread);
                spreadStr = isFav ? `-${absVal}` : `+${absVal}`;
            }

            return {
                gameId: gameObj.id,
                opponent: oppTeam,
                oppRecord: oppMeta.record || "", // 👈 Opponent record extracted
                isHome,
                oppLogo: gameObj.away_team === oppTeam ? (gameObj.away_logo || oppMeta.logo) : (gameObj.home_logo || oppMeta.logo),
                spreadStr,
                gameDate: gameObj.game_date,
                locked: isGameStarted(gameObj.game_date)
            };
        };

        if (teamMap[game.home_team]) {
            teamMap[game.home_team][dayKey] = formatOpponentInfo(game.home_team, game.away_team, game);
        }
        if (teamMap[game.away_team]) {
            teamMap[game.away_team][dayKey] = formatOpponentInfo(game.away_team, game.home_team, game);
        }
    });

    return (
        <PoolGatekeeper user={user} gameKey="nba_survivor" className='page-content'>
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "12px 10px", paddingBottom: 80 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 12, padding: "0 8px" }}>
                    <h2 style={{ color: NBA_BLUE, fontSize: "22px", margin: 0 }}>🏀 NBA Survivor: Week {currentWeek} <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏀</span></h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "13px" }}>
                        Select a team for week {currentWeek}.<br/>
                        Your team must win ONCE in any of their Friday, Saturday, or Sunday games for you to advance!<br/>
                        You cannot pick a team twice!
                    </p>
                </div>

                {/* Week Selector Bar */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
                        {[...Array(maxAvailableWeek)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => handleWeekChange(i + 1)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: currentWeek === i + 1 ? NBA_BLUE : "white",
                                    color: currentWeek === i + 1 ? "white" : "#0f172a",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: "13px"
                                }}
                            >
                                Week {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selection Banner */}
                <div style={{
                    background: bannerBg,
                    color: currentWeekPick ? "#ffffff" : "#b45309",
                    border: `1px solid ${currentWeekPick ? pickedSecondary : "#fde68a"}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 20,
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
                            {pickedTeamMeta.logo && <img src={pickedTeamMeta.logo} alt={currentWeekPick} style={{ width: 20, height: 20, objectFit: "contain" }} />}
                            <span>✓ Week {currentWeek} Selection: {currentWeekPick}</span>
                        </>
                    ) : (
                        `⚠️ No team selected for Week ${currentWeek} yet.`
                    )}
                </div>

                {/* 4-Column Grid Table View */}
                <div style={{ overflowX: "auto", background: "white", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                                <th style={{ padding: "10px 12px", width: "28%" }}>Team</th>
                                <th style={{ padding: "10px 12px", width: "24%" }}>Friday</th>
                                <th style={{ padding: "10px 12px", width: "24%" }}>Saturday</th>
                                <th style={{ padding: "10px 12px", width: "24%" }}>Sunday</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allTeamNames.map(teamName => {
                                const tMeta = teamColors[teamName] || {};
                                const isPicked = currentWeekPick === teamName;
                                const isUsed = usedTeams.includes(teamName) && !isPicked;
                                const days = teamMap[teamName] || {};

                                const hasGames = days.Fri || days.Sat || days.Sun;
                                if (!hasGames) return null;

                                const tPrimary = tMeta.primaryColor || NBA_BLUE;
                                const tSecondary = tMeta.secondaryColor || "#cbd5e1";
                                const teamLogo = tMeta.logo;
                                const teamRecord = tMeta.record;

                                const hasLockedGame = Object.values(days).some(d => d && d.locked);

                                const rowStyle = {
                                    borderBottom: "1px solid #f1f5f9",
                                    cursor: (hasLockedGame || isUsed) ? "not-allowed" : "pointer",
                                    background: isPicked
                                        ? `linear-gradient(135deg, ${tPrimary}22, ${tSecondary}44)`
                                        : "transparent",
                                    transition: "background 0.2s"
                                };

                                const badgeStyle = {
                                    background: tSecondary,
                                    borderRadius: 6,
                                    padding: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: `0 0 6px 1px ${tPrimary}, 0 2px 4px rgba(0,0,0,0.3)`,
                                    border: `1.5px solid ${tPrimary}`,
                                    width: 36,
                                    height: 36,
                                    flexShrink: 0
                                };

                                return (
                                    <tr 
                                        key={teamName} 
                                        style={rowStyle}
                                        onClick={() => {
                                            if (!hasLockedGame && (!isUsed || isPicked)) {
                                                handleTeamSelect(teamName, days, isUsed, isPicked);
                                            }
                                        }}
                                    >
                                        {/* Column 1: Team Card */}
                                        <td style={{ padding: "8px 12px" }}>
                                            <div
                                                style={{
                                                    backgroundImage: isPicked ? `linear-gradient(135deg, ${tPrimary}, ${tSecondary})` : `linear-gradient(135deg, ${tPrimary}0D 0%, ${tSecondary}1A 100%)`,
                                                    backgroundColor: isPicked ? tPrimary : "transparent",
                                                    color: isPicked ? "#ffffff" : "#0f172a",
                                                    border: isPicked ? `2px solid ${tPrimary}` : `1.5px solid ${tPrimary}40`,
                                                    borderRadius: 6,
                                                    padding: "8px 12px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    opacity: isUsed ? 0.6 : 1,
                                                    boxShadow: isPicked ? `0 0 10px rgba(0,0,0,0.35), inset 0 0 8px ${tPrimary}` : "0 1px 2px rgba(0,0,0,0.02)"
                                                }}
                                            >
                                                {teamLogo && (
                                                    <div style={badgeStyle}>
                                                        <img src={teamLogo} alt={teamName} style={{ width: 26, height: 26, objectFit: "contain", display: "block", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.4))" }} />
                                                    </div>
                                                )}

                                                <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
                                                    <span style={{ fontWeight: isPicked ? 800 : 700, fontSize: "13px", textShadow: isPicked ? "0 1px 2px rgba(0,0,0,0.3)" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {teamName}
                                                    </span>
                                                    {teamRecord && (
                                                        <span style={{ fontSize: "10px", fontWeight: 600, opacity: 0.85 }}>
                                                            ({teamRecord})
                                                        </span>
                                                    )}
                                                    {isUsed && <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 700 }}>USED</span>}
                                                </div>

                                                {isPicked && <span style={{ fontWeight: 900, color: "#fef08a", fontSize: "16px", marginLeft: "auto" }}>✓</span>}
                                            </div>
                                        </td>

                                        {/* Columns 2-4: Friday, Saturday, Sunday Game Chips */}
                                        {["Fri", "Sat", "Sun"].map(dayKey => {
                                            const matchup = days[dayKey];
                                            if (!matchup) {
                                                return <td key={dayKey} style={{ padding: "10px 12px", color: "#cbd5e1", fontSize: "12px" }}>—</td>;
                                            }

                                            const prefix = matchup.isHome ? "vs" : "at";

                                            return (
                                                <td key={dayKey} style={{ padding: "8px 12px" }}>
                                                    <div style={{
                                                        width: "100%",
                                                        padding: "8px 10px",
                                                        borderRadius: 6,
                                                        border: isPicked ? `1.5px solid ${tPrimary}` : "1px solid #e2e8f0",
                                                        background: isPicked ? `linear-gradient(135deg, ${tPrimary}15, ${tSecondary}25)` : "#f8fafc",
                                                        color: "#0f172a",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        fontSize: "11px",
                                                        boxShadow: isPicked ? `0 0 6px ${tPrimary}40` : "none"
                                                    }}>
                                                        {matchup.oppLogo && (
                                                            <div style={{
                                                                background: teamColors[matchup.opponent]?.secondaryColor || "#cbd5e1",
                                                                borderRadius: 6,
                                                                padding: "3px",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                boxShadow: `0 0 4px 1px ${teamColors[matchup.opponent]?.primaryColor || tPrimary}, 0 1px 3px rgba(0,0,0,0.3)`,
                                                                border: `1.5px solid ${teamColors[matchup.opponent]?.primaryColor || tPrimary}`,
                                                                width: 28,
                                                                height: 28,
                                                                flexShrink: 0
                                                            }}>
                                                                <img src={matchup.oppLogo} alt={matchup.opponent} style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
                                                            </div>
                                                        )}
                                                        <div style={{ overflow: "hidden", lineHeight: 1.2, flexGrow: 1 }}>
                                                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                                                {prefix} {matchup.opponent} {matchup.oppRecord && <span style={{ opacity: 0.75, fontWeight: 500 }}>({matchup.oppRecord})</span>}
                                                            </div>
                                                            <div style={{ fontSize: "10px", opacity: 0.75, fontWeight: 700 }}>
                                                                {matchup.spreadStr} {matchup.locked && "🔒"}
                                                            </div>
                                                        </div>
                                                        {isPicked && <span style={{ color: tPrimary, fontWeight: 900, fontSize: "12px" }}>✓</span>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </PoolGatekeeper>
    );
}