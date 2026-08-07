import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const CFB_BLUE = "#013369";
const CFB_RED = "#D50A0A";
const GOLD = "#c89d3c";
const WHITE = "#FFFFFF";

export default function CfbPickemAtsStandings() {
    const { user: currentUser } = useAuth();
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Helper returns medal for top 3 ranks, else returns the rank number
    const renderRank = (rank) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return rank;
    };

    useEffect(() => {
        if (!currentUser) return;
        const fetchStandings = async () => {
            try {
                const { data } = await axios.get("/api/cfb_pickem_ats/standings", {
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

    // Sort by total_points descending, then entry_name alphabetically for ties, and compute tied ranks
    const rankedStandings = useMemo(() => {
        const sorted = [...standings].sort((a, b) => 
            (b.total_points || 0) - (a.total_points || 0) || 
            (a.entry_name || "").localeCompare(b.entry_name || "")
        );

        let currentRank = 1;
        return sorted.map((u, i) => {
            if (i > 0 && u.total_points === sorted[i - 1].total_points) {
                // Keep same rank for tied scores
            } else {
                currentRank = i + 1;
            }
            return { ...u, rank: currentRank };
        });
    }, [standings]);

    if (loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading leaderboard...</div>;

    return (
        <PoolGatekeeper user={currentUser} gameKey="cfb_pickem_ats">
            <div style={{ maxWidth: "900px", margin: "0 auto", padding: "8px", paddingBottom: '100px' }}>
                <Toaster />
                <style>{`
                    .desktop-only { display: block; }
                    .mobile-only { display: none; }
                    @media (max-width: 768px) {
                        .desktop-only { display: none !important; }
                        .mobile-only { display: block !important; }
                    }
                `}</style>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: CFB_BLUE, fontWeight: 900, fontSize: "26px", margin: 0 }}>🏆 Pick'em Standings 🏆</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        Leaderboard ranked by total points (Best Bets count for 2 points).
                    </p>
                </div>

                {/* DESKTOP TABLE */}
                <div className="desktop-only" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    <table style={{ width: "100%", background: WHITE, fontSize: 13, borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: CFB_BLUE, color: WHITE }}>
                                <th style={{ ...thStyle, width: "60px", textAlign: "center" }}>Rank</th>
                                <th style={thStyle}>Entry Name</th>
                                <th style={{ ...thStyle, textAlign: "center" }}>Overall Record (W-L)</th>
                                <th style={{ ...thStyle, textAlign: "center" }}>Best Bets (W-L)</th>
                                <th style={{ ...thStyle, textAlign: "center" }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankedStandings.map((u) => {
                                const isMe = u.user_id === currentUser?.id;
                                return (
                                    <tr key={u.user_id} style={{
                                        borderBottom: "1px solid #edf2f7",
                                        backgroundColor: isMe ? "#fffbeb" : "transparent"
                                    }}>
                                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, fontSize: u.rank <= 3 ? "18px" : "14px", color: "#475569" }}>
                                            {renderRank(u.rank)}
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: isMe ? "bold" : 700, color: "#0f172a" }}>
                                            {u.entry_name}
                                            {isMe && <span style={{ marginLeft: 8, fontSize: "11px", background: CFB_BLUE, color: WHITE, padding: "2px 6px", borderRadius: 4 }}>You</span>}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center", color: "#334155" }}>
                                            {u.wins || 0} - {u.losses || 0}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center", color: "#334155" }}>
                                            <span style={{ color: "#047857", fontWeight: 700 }}>{u.best_bet_wins || 0}</span> - <span style={{ color: CFB_RED, fontWeight: 700 }}>{u.best_bet_losses || 0}</span>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 900, color: CFB_BLUE, fontSize: "15px" }}>
                                            {u.total_points || 0} pts
                                        </td>
                                    </tr>
                                );
                            })}
                            {rankedStandings.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                                        No entries found in the leaderboard yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE CARDS */}
                <div className="mobile-only">
                    {rankedStandings.map((u) => {
                        const isMe = u.user_id === currentUser?.id;
                        return (
                            <div key={u.user_id} style={{
                                background: WHITE,
                                padding: "14px",
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                                marginBottom: "10px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                                backgroundColor: isMe ? "#fffbeb" : WHITE
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <span style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                                        <span style={{ marginRight: 6 }}>{renderRank(u.rank)}</span> {u.entry_name}
                                        {isMe && <span style={{ marginLeft: 6, fontSize: "10px", background: CFB_BLUE, color: WHITE, padding: "2px 5px", borderRadius: 4 }}>You</span>}
                                    </span>
                                    <span style={{ fontWeight: 900, color: CFB_BLUE, fontSize: "18px" }}>{u.total_points || 0} pts</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                                    <div>
                                        Record: <strong style={{ color: "#334155" }}>{u.wins || 0}-{u.losses || 0}</strong>
                                    </div>
                                    <div>
                                        Best Bets: <span style={{ color: "#047857", fontWeight: 700 }}>{u.best_bet_wins || 0}</span>-<span style={{ color: CFB_RED, fontWeight: 700 }}>{u.best_bet_losses || 0}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {rankedStandings.length === 0 && (
                        <div style={{ background: WHITE, padding: "30px", textAlign: "center", color: "#64748b", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                            No entries found in the leaderboard yet.
                        </div>
                    )}
                </div>

            </div>
        </PoolGatekeeper>
    );
}

const thStyle = { padding: "14px 16px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: `2px solid ${GOLD}` };
const tdStyle = { padding: "14px 16px", fontSize: "14px" };