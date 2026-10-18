import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import SurvivorWeekSelector from "../../components/picks/SurvivorWeekSelector";
import SurvivorGroupMatrixTable from "../../components/picks/SurvivorGroupMatrixTable";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
//2026 start week for 2nd chance survivor is week 6, so we do not need to view weeks prior to week 6
const START_WEEK = 6;

export default function NflSurvivorGroupPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(START_WEEK);
    const [maxAvailableWeek, setMaxAvailableWeek] = useState(START_WEEK);
    const [rosterData, setRosterData] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch team branding mapping
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
                        secondaryColor: t.secondary_color || t.alt_color || "#64748b",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    // Fetch dynamic current active week from 2nd chance survivor settings, then fetch roster data
    useEffect(() => {
        if (!user || !token) return;
        setLoading(true);

        axios.get("/api/nfl_regular_season/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const activeWk = res.data?.current_week;
                if (activeWk) {
                    const weekNum = Number(activeWk);
                    // Ensure currentWeek doesn't fall below Week 6
                    const effectiveWeek = Math.max(weekNum, START_WEEK);
                    setCurrentWeek(effectiveWeek);
                    setMaxAvailableWeek(effectiveWeek); 
                } else {
                    setCurrentWeek(START_WEEK);
                    setMaxAvailableWeek(START_WEEK);
                }
            })
            .catch(err => {
                console.error("Failed to load 2nd Chance Survivor settings, defaulting to week 6", err);
                setCurrentWeek(START_WEEK);
                setMaxAvailableWeek(START_WEEK);
            })
            .finally(() => {
                // Fetch roster data from your existing route
                axios.get("/api/nfl_survivor_secondchance/roster", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                    .then(res => {
                        setRosterData(res.data || []);
                    })
                    .catch(err => {
                        console.error("Failed to load 2nd Chance Survivor roster", err);
                        toast.error("Failed to load group matrix");
                    })
                    .finally(() => setLoading(false));
            });
    }, [user, token]);

    const handleWeekChange = (targetWeek) => {
        if (targetWeek < START_WEEK) {
            toast.error("Weeks prior to Week 6 are not part of 2nd Chance Survivor!");
            return;
        }
        if (targetWeek > maxAvailableWeek) {
            toast.error("You cannot view future weeks matrix!");
            return;
        }
        setCurrentWeek(targetWeek);
    };

    if (authLoading || loading || currentWeek === null) return <div style={{ textAlign: "center", padding: 50 }}>Loading group matrix...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_survivor_secondchance" >
            <div style={{ maxWidth: 950, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0 }}>2nd Chance Survivor Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        See what team every participant selected for Week {currentWeek}.
                    </p>
                </div>

                <SurvivorWeekSelector
                    currentWeek={currentWeek}
                    maxAvailableWeek={maxAvailableWeek}
                    onWeekChange={handleWeekChange}
                    firstWeek={START_WEEK}
                    accentColor={NFL_BLUE}
                />
                <SurvivorGroupMatrixTable
                    currentWeek={currentWeek}
                    rosterData={rosterData}
                    teamColors={teamColors}
                    user={user}
                    accentColor={NFL_BLUE}
                    eliminatedColor={NFL_RED}
                />

            </div>
        </PoolGatekeeper>
    );
}