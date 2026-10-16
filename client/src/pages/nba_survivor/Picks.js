import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import SurvivorWeekSelector from "../../components/picks/SurvivorWeekSelector";
import SurvivorSelectionBanner from "../../components/picks/SurvivorSelectionBanner";
import NbaSurvivorScheduleTable from "../../components/picks/NbaSurvivorScheduleTable";
import PoolEmoji from "../../components/PoolEmoji";

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

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading survivor dashboard...</div>;

    const currentWeekPick = userPicks[currentWeek];
    const pickedTeamMeta = teamColors[currentWeekPick] || {};

    return (
        <PoolGatekeeper user={user} gameKey="nba_survivor" >
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "12px 10px", paddingBottom: 80 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 12, padding: "0 8px" }}>
                    <h2 style={{ color: NBA_BLUE, fontSize: "22px", margin: 0 }}><PoolEmoji gameKey="nba_survivor" /> NBA Survivor: Week {currentWeek} <PoolEmoji gameKey="nba_survivor" /></h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "13px" }}>
                        Select a team for week {currentWeek}.<br/>
                        Your team must win ONCE in any of their Friday, Saturday, or Sunday games for you to advance!<br/>
                        You cannot pick a team twice!
                    </p>
                </div>

                {/* Week Selector Bar */}
                <SurvivorWeekSelector
                    currentWeek={currentWeek}
                    maxAvailableWeek={maxAvailableWeek}
                    onWeekChange={handleWeekChange}
                    accentColor={NBA_BLUE}
                />
                <SurvivorSelectionBanner
                    week={currentWeek}
                    team={currentWeekPick}
                    teamMeta={pickedTeamMeta}
                    emptyMessage={`No team selected for Week ${currentWeek} yet.`}
                    accentColor={NBA_BLUE}
                    compact
                />
                <NbaSurvivorScheduleTable
                    games={games}
                    teamColors={teamColors}
                    currentWeekPick={currentWeekPick}
                    usedTeams={usedTeams}
                    onSelectTeam={handleTeamSelect}
                />
            </div>
        </PoolGatekeeper>
    );
}