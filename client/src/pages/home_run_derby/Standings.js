import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NAVY = "#0a1628";
const GOLD = "#c89d3c";

export default function HrdStandings() {
    const { user, loading: authLoading } = useAuth();
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("season"); // 'season' or 'monthly'
    const [month, setMonth] = useState("4"); // Default April (4)
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!user || !token) return;
        setLoading(true);

        const endpoint = tab === "season" ? "/api/hrd/standings" : `/api/hrd/standings/monthly?month=${month}`;

        axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setStandings(res.data || []))
            .catch(err => {
                console.error("Failed to load standings", err);
                toast.error("Failed to load standings");
            })
            .finally(() => setLoading(false));
    }, [user, token, tab, month]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading standings...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="hrd">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 16px", paddingBottom: 90, paddingTop: 90 }}>
                <Toaster />
                <h2 style={{ color: NAVY, fontSize: "24px", marginBottom: 4 }}>🏆 Home Run Derby Standings</h2>
                <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: 20 }}>
                    Track live race results across the full season and monthly payouts.
                </p>

                {/* Tab Switcher */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <button
                        onClick={() => setTab("season")}
                        style={{
                            padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", cursor: "pointer",
                            background: tab === "season" ? NAVY : "#e2e8f0", color: tab === "season" ? "white" : "#475569", border: "none"
                        }}
                    >
                        Full Season (With Bench)
                    </button>
                    <button
                        onClick={() => setTab("monthly")}
                        style={{
                            padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", cursor: "pointer",
                            background: tab === "monthly" ? NAVY : "#e2e8f0", color: tab === "monthly" ? "white" : "#475569", border: "none"
                        }}
                    >
                        Monthly Standings
                    </button>
                </div>

                {tab === "monthly" && (
                    <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>Select Month:</span>
                        <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                            <option value="4">April (includes March)</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September (includes October)</option>
                        </select>
                    </div>
                )}

                <div style={{ background: "white", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                                <th style={{ padding: "12px 16px" }}>Rank</th>
                                <th style={{ padding: "12px 16px" }}>Manager</th>
                                {tab === "season" && <th style={{ padding: "12px 16px" }}>Bench Dropped Player</th>}
                                <th style={{ padding: "12px 16px", textAlign: "right" }}>Total HRs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standings.map((row, idx) => (
                                <tr key={row.user_id} style={{ borderBottom: "1px solid #f1f5f9", background: idx === 0 ? "#fffbeb" : "transparent" }}>
                                    <td style={{ padding: "12px 16px", fontWeight: 700, color: idx === 0 ? GOLD : NAVY }}>
                                        {idx + 1} {idx === 0 && "👑"}
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ fontWeight: 700, color: NAVY }}>{row.real_name}</div>
                                        <div style={{ fontSize: "12px", color: "#64748b" }}>@{row.username}</div>
                                    </td>
                                    {tab === "season" && (
                                        <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "13px" }}>
                                            {row.lowest_player_name || "N/A"} ({row.lowest_hr_count} HR)
                                        </td>
                                    )}
                                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, fontSize: "16px", color: NAVY }}>
                                        {tab === "season" ? row.adjusted_total : row.total_hrs}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PoolGatekeeper>
    );
}