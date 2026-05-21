import React, { useEffect, useState } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import NbaGatekeeper from "../../components/nba/NbaGatekeeper";

const Standings = () => {
    const { user, loading: authLoading } = useAuth();
    const [standings, setStandings] = useState([]);

    useEffect(() => {
        axios.get("/api/nba/standings").then(res => setStandings(res.data));
    }, []);

    if (authLoading) return null;

    return (
        <NbaGatekeeper user={user}>
            <div style={{ paddingTop: 68, paddingBottom: 80, paddingLeft: 12, paddingRight: 12 }} className="standings-table">
                <h2 style={{ color: "#0a1628", paddingBottom: 6, fontSize: 24, fontWeight: 800 }}>Standings</h2>

                <table style={{ borderCollapse: "collapse", background: "white", width: "100%", fontSize: 14 }} className="standings-table">
                    <thead>
                        <tr>
                            {[
                                { full: "Rank", short: "Rank" },
                                { full: "Name", short: "Name" },
                                { full: "Points", short: "Pts" },
                                { full: "Max Possible", short: "Max" },
                                { full: "Correct Series", short: "✅" },
                                { full: "Perfect Length", short: "🎯" },
                            ].map(({ full, short }) => (
                                <th key={full} style={{
                                    position: "sticky",
                                    top: 65,
                                    zIndex: 4,
                                    backgroundColor: "#13447a",
                                    color: "white",
                                    borderBottom: "2px solid #c89d3c",
                                    padding: "12px 8px",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    textTransform: "uppercase",
                                    fontSize: 11,
                                    letterSpacing: "0.5px",
                                }}>
                                    <span className="hide-mobile">{full}</span>
                                    <span className="show-mobile">{short}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((s, idx) => (
                            <tr key={s.user_id} style={{
                                backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                                textAlign: "center"
                            }}>
                                <td style={{ padding: "12px 8px", borderBottom: "1px solid #e5e7eb", fontWeight: 700 }}>
                                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                                </td>
                                <td style={{
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e5e7eb",
                                    fontWeight: 700,
                                    color: "#0a1628",
                                    textAlign: "left",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}>
                                    {s.entry_name}
                                </td>
                                <td style={{ padding: "12px 8px", borderBottom: "1px solid #e5e7eb", fontWeight: 800, color: "#13447a", fontSize: 15 }}>
                                    {s.points}
                                </td>
                                <td style={{
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e5e7eb",
                                    fontWeight: 600,
                                    color: "#64748b",
                                    backgroundColor: "rgba(200, 157, 60, 0.05)"
                                }}>
                                    {s.max_possible}
                                </td>
                                <td style={{ padding: "12px 8px", borderBottom: "1px solid #e5e7eb" }}>
                                    {s.correct_series}
                                </td>
                                <td style={{ padding: "12px 8px", borderBottom: "1px solid #e5e7eb" }}>
                                    {s.correct_lengths}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: 24, padding: 12, backgroundColor: "#f8fafc", borderRadius: 8, borderLeft: "4px solid #c89d3c" }}>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                        <strong>How Scoring Works:</strong><br />
                        • Points = Your confidence value.<br />
                        • Perfect Length bonus = 2x your confidence.<br />
                        • <strong>Max Possible</strong> is your current points + the best you can do on remaining series.
                    </div>
                </div>
            </div>
        </NbaGatekeeper>
    );
};

export default Standings;