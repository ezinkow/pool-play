import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import SurvivorPickHistory from "../../components/picks/SurvivorPickHistory";

const NFL_BLUE = "#013369";

export default function NflSurvivorSecondChanceMyPicks() {
    const { user, loading: authLoading } = useAuth();
    const [allPicks, setAllPicks] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) return;
        axios.get("/api/nfl_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(team => {
                    map[team.name] = {
                        primaryColor: team.color || team.primary_color || NFL_BLUE,
                        secondaryColor: team.secondary_color || team.alt_color || "#64748b",
                        logo: team.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const weekRequests = Array.from({ length: 18 }, (_, index) => {
            const week = index + 1;
            return axios.get("/api/nflsurvivor_secondchance/picks", {
                params: { week },
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => ({ week, data: res.data || {} }))
                .catch(error => {
                    console.error(`Failed to load 2nd Chance Survivor history for week ${week}`, error);
                    return null;
                });
        });

        Promise.all(weekRequests)
            .then(results => {
                const history = results.flatMap(item => {
                    if (!item) return [];
                    const { week, data } = item;
                    const pickedTeam = data.userPicks?.[week];
                    if (!pickedTeam) return [];

                    const game = (data.games || []).find(
                        matchup => matchup.away_team === pickedTeam || matchup.home_team === pickedTeam
                    );
                    return [{ week, pickedTeam, game: game || null }];
                });

                setAllPicks(history.sort((a, b) => a.week - b.week));
            })
            .catch(error => {
                console.error("Failed to load user 2nd Chance Survivor picks history", error);
                toast.error("Failed to load pick history");
            })
            .finally(() => setLoading(false));
    }, [user, token]);

    if (authLoading || loading) {
        return <div style={{ textAlign: "center", padding: 50 }}>Loading your 2nd Chance Survivor history...</div>;
    }

    return (
        <PoolGatekeeper user={user} gameKey="nfl_survivor_secondchance">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />
                <header className="survivor-history-header">
                    <h2>My 2nd Chance Survivor Selection History</h2>
                    <p>Your complete season-long 2nd Chance Survivor progression and team choices.</p>
                </header>
                <SurvivorPickHistory
                    picks={allPicks}
                    teamColors={teamColors}
                    emptyMessage="You haven't made any 2nd Chance Survivor picks yet!"
                />
            </div>
        </PoolGatekeeper>
    );
}
