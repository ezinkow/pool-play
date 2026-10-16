import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PickemStandingsBoard from "../../components/picks/PickemStandingsBoard";
import rankPickemStandings from "../../utils/rankPickemStandings";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";

export default function NflPickemAtsStandings() {
    const { user: currentUser } = useAuth();
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!currentUser) return;
        const fetchStandings = async () => {
            try {
                const { data } = await axios.get("/api/nfl_pickem_ats/standings", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStandings(data || []);
            } catch (err) {
                console.error("Failed to load pick'em standings", err);
                toast.error("Failed to load leaderboard");
            } finally {
                setLoading(false);
            }
        };
        fetchStandings();
    }, [currentUser, token]);

    const rankedStandings = useMemo(() => rankPickemStandings(standings), [standings]);

    if (loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading leaderboard...</div>;

    return (
        <PoolGatekeeper user={currentUser} gameKey="nfl_pickem_ats" >
            <div style={{ maxWidth: "900px", margin: "0 auto", padding: "8px", paddingBottom: '100px' }}>
                <Toaster />
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontWeight: 900, fontSize: "26px", margin: 0 }}>Pick'em Standings</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        Leaderboard ranked by total points (Best Bets count for 2 points).
                    </p>
                </div>
                <PickemStandingsBoard
                    standings={rankedStandings}
                    currentUser={currentUser}
                    accentColor={NFL_BLUE}
                    lossColor={NFL_RED}
                />
            </div>
        </PoolGatekeeper>
    );
}
