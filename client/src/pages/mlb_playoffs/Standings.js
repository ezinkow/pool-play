import React, { useEffect, useState } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function Standings() {
    const [standings, setStandings] = useState([]);
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();

    const token = localStorage.getItem("token");

    useEffect(() => {
        async function fetchData() {
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const [standingsRes, seriesRes] = await Promise.all([
                    axios.get("/api/mlb/standings", config),
                    axios.get("/api/mlb/series", config)
                ]);

                const data = standingsRes.data || [];
                const sortedList = data.sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
                setStandings(sortedList);
                setSeries(seriesRes.data || []);
            } catch (e) {
                console.error("Failed to load standings data", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [token]);

    const finalsRound = series.filter(s => Number(s.round) === 4);
    const isFinalsStartedOrLocked = finalsRound.length > 0 && finalsRound.some(s => s.locked || s.status !== "STATUS_SCHEDULED");

    // Count how many series have officially completed so far
    const completedSeriesCount = series.filter(s => s.status === "STATUS_FINAL").length;

    if (authLoading || loading) {
        return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, sans-serif" }}>Loading Standings...</div>;
    }

    return (
        <PoolGatekeeper user={user} gameKey="mlb" className='page-content'>
            <div style={{ maxWidth: 950, margin: "0 auto", padding: "16px 8px", paddingBottom: 100, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                
                {/* Header Banner */}
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <h2 style={{ color: NAVY, fontSize: "20px", margin: 0, fontWeight: 800 }}>
                        <span>🏆</span> MLB Postseason Standings <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🏆</span>
                    </h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "12px" }}>
                        Leaderboard tracking series winners, exact length bonuses, and point totals.
                    </p>
                </div>

                {/* Standings Table Container */}
                <div style={{
                    background: "white",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden"
                }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ backgroundColor: NAVY, color: "white", borderBottom: `2px solid ${GOLD}` }}>
                                <th style={{ padding: "12px 16px", fontSize: "12px", width: "70px", textAlign: "center" }}>Rank</th>
                                <th style={{ padding: "12px 16px", fontSize: "12px" }}>Participant</th>
                                <th style={{ padding: "12px 16px", fontSize: "12px", textAlign: "center", width: "110px" }}>Series Record</th>
                                <th style={{ padding: "12px 16px", fontSize: "12px", textAlign: "center", width: "100px" }}>Bonus (⭐)</th>
                                {isFinalsStartedOrLocked && (
                                    <th style={{ padding: "12px 16px", fontSize: "12px", textAlign: "center", width: "110px" }}>Tiebreaker</th>
                                )}
                                <th style={{ padding: "12px 16px", fontSize: "12px", textAlign: "right", width: "100px" }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standings.length === 0 ? (
                                <tr>
                                    <td colSpan={isFinalsStartedOrLocked ? 6 : 5} style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                        No standings data available yet.
                                    </td>
                                </tr>
                            ) : (
                                standings.map((standing, idx) => {
                                    const entryName = standing.name || standing.entry_name;
                                    const isCurrentUser = user && (entryName === user.name || Number(standing.user_id) === Number(user.id));

                                    // Calculate shared competition ranking (Standard 1, 2, 2, 4 layout)
                                    let rank = idx + 1;
                                    if (idx > 0) {
                                        const prevStanding = standings[idx - 1];
                                        const prevPoints = Number(prevStanding.points) || 0;
                                        const currentPoints = Number(standing.points) || 0;
                                        if (currentPoints === prevPoints) {
                                            // If points match the previous row, look up the rank of the first person with these points
                                            const firstMatchingIdx = standings.findIndex(s => (Number(s.points) || 0) === currentPoints);
                                            rank = firstMatchingIdx + 1;
                                        }
                                    }

                                    const correctSeries = standing.correct_series ?? 0;
                                    const incorrectSeries = Math.max(0, completedSeriesCount - correctSeries);

                                    return (
                                        <tr
                                            key={standing.id || entryName || idx}
                                            style={{
                                                borderBottom: "1px solid #f1f5f9",
                                                backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white"),
                                                transition: "background-color 0.15s ease"
                                            }}
                                        >
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 800, fontSize: "13px", color: "#0f172a" }}>
                                                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                                            </td>
                                            <td style={{ padding: "12px 16px", fontWeight: isCurrentUser ? 800 : 600, fontSize: "13px", color: "#0f172a" }}>
                                                {entryName} {isCurrentUser && <span style={{ color: NAVY, fontWeight: 700, fontSize: "11px", marginLeft: 4 }}>(You)</span>}
                                            </td>
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#334155", fontWeight: 600 }}>
                                                {correctSeries}–{incorrectSeries}
                                            </td>
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#d97706", fontWeight: 700 }}>
                                                {standing.correct_lengths ?? 0}
                                            </td>
                                            {isFinalsStartedOrLocked && (
                                                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
                                                    {standing.tiebreaker !== null && standing.tiebreaker !== undefined ? `${standing.tiebreaker} pts` : "—"}
                                                </td>
                                            )}
                                            <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 900, fontSize: "14px", color: NAVY }}>
                                                {standing.points ?? 0} <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>pts</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </PoolGatekeeper>
    );
}