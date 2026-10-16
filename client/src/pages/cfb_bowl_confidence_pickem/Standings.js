import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PickemStandingsBoard from "../../components/picks/PickemStandingsBoard";
import rankPickemStandings from "../../utils/rankPickemStandings";

const CFB_BLUE = "#013369";
const CFB_RED = "#D50A0A";

export default function CfbPickemAtsStandings() {
    const { user: currentUser } = useAuth();
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!currentUser) return;
        const fetchStandings = async () => {
            try {
                const { data } = await axios.get("/api/cfb_bowl_pickem/standings", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStandings(data || []);
            } catch (err) {
                console.error("Failed to load bowl confidence standings", err);
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
        <PoolGatekeeper user={currentUser} gameKey="cfb_bowl_pickem" >
            <div style={{ maxWidth: "900px", margin: "0 auto", padding: "8px", paddingBottom: '100px' }}>
                <Toaster />
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: CFB_BLUE, fontWeight: 900, fontSize: "26px", margin: 0 }}>Bowl Confidence Standings</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        Leaderboard ranked by confidence points, with the number of correct and incorrect picks.
                    </p>
                </div>
                <PickemStandingsBoard
                    standings={rankedStandings}
                    currentUser={currentUser}
                    accentColor={CFB_BLUE}
                    lossColor={CFB_RED}
                    showBestBets={false}
                />
            </div>
        </PoolGatekeeper>
    );
}
