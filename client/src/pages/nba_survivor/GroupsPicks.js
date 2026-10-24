import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import SurvivorWeekSelector from "../../components/picks/SurvivorWeekSelector";
import SurvivorGroupMatrixTable from "../../components/picks/SurvivorGroupMatrixTable";

const BLUE = "#013369";
const RED = "#D50A0A";

export default function NbaSurvivorGroupPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(null);
    const [maxAvailableWeek, setMaxAvailableWeek] = useState(1);
    const [rosterData, setRosterData] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch team branding mapping
    useEffect(() => {
        if (!token) return;
        axios.get("/api/nba_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        primaryColor: t.color || t.primary_color || BLUE,
                        secondaryColor: t.secondary_color || t.alt_color || "#64748b",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NBA team colors", err));
    }, [token]);

    // Fetch dynamic current active week from survivor settings, then fetch roster data
    useEffect(() => {
        if (!user || !token) return;
        setLoading(true);

        axios.get("/api/nba_survivor/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const activeWk = res.data?.current_week;
                if (activeWk) {
                    const weekNum = Number(activeWk);
                    setCurrentWeek(weekNum);
                    setMaxAvailableWeek(weekNum); // 👈 Restricts buttons up to current week only
                } else {
                    setCurrentWeek(2);
                    setMaxAvailableWeek(2);
                }
            })
            .catch(err => {
                console.error("Failed to load survivor settings, defaulting to week 2", err);
                setCurrentWeek(2);
                setMaxAvailableWeek(2);
            })
            .finally(() => {
                axios.get("/api/nba_survivor/roster", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                    .then(res => {
                        setRosterData(res.data || []);
                    })
                    .catch(err => {
                        console.error("Failed to load survivor roster", err);
                        toast.error("Failed to load group matrix");
                    })
                    .finally(() => setLoading(false));
            });
    }, [user, token]);
    console.log(rosterData)
    const handleWeekChange = (targetWeek) => {
        if (targetWeek > maxAvailableWeek) {
            toast.error("You cannot view future weeks matrix!");
            return;
        }
        setCurrentWeek(targetWeek);
    };

    if (authLoading || loading || currentWeek === null) return <div style={{ textAlign: "center", padding: 50 }}>Loading group matrix...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nba_survivor" >
            <div style={{ maxWidth: 950, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: BLUE, fontSize: "26px", margin: 0 }}>Survivor Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        See what team every participant selected for Week {currentWeek}.
                    </p>
                </div>

                <SurvivorWeekSelector
                    currentWeek={currentWeek}
                    maxAvailableWeek={maxAvailableWeek}
                    onWeekChange={handleWeekChange}
                    accentColor={BLUE}
                />
                <SurvivorGroupMatrixTable
                    currentWeek={currentWeek}
                    rosterData={rosterData}
                    teamColors={teamColors}
                    user={user}
                    accentColor={BLUE}
                    eliminatedColor={RED}
                    showWeekendRecord={true}
                />

            </div>
        </PoolGatekeeper>
    );
}