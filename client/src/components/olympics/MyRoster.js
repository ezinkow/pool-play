import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function MyRoster() {
    const { user: authUser, loading: authLoading } = useAuth();
    const [roster, setRoster] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authUser) return;

        const fetchRoster = async () => {
            setLoading(true);
            try {
                // Querying the olympic roster endpoint using the global auth name
                const res = await axios.get("/api/olympicteams/getmyroster", {
                    params: { name: authUser.name },
                });
                setRoster(res.data || []);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load your Olympic roster");
            } finally {
                setLoading(false);
            }
        };

        fetchRoster();
    }, [authUser]);

    if (authLoading) return <div style={{ paddingTop: 100, textAlign: "center" }}>Verifying session…</div>;
    if (!authUser) return <div style={{ paddingTop: 100, textAlign: "center" }}><h3>Please log in to view your roster.</h3></div>;

    const totalValue = roster.reduce((sum, c) => sum + (Number(c.price) || 0), 0);

    return (
        <div style={{ padding: "68px 16px 80px", maxWidth: "800px", margin: "0 auto" }}>
            <Toaster />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, color: NAVY }}>🏅 My Olympic Roster</h2>
                    <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>
                        User: <strong>{authUser.name}</strong>
                    </p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>${totalValue}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Total Value</div>
                </div>
            </div>

            {loading ? (
                <p style={{ color: "#9ca3af" }}>Loading your roster data…</p>
            ) : roster.length === 0 ? (
                <div style={{
                    padding: 40, textAlign: "center",
                    background: "#f9fafb", borderRadius: 12,
                    border: "2px dashed #d1d5db"
                }}>
                    <p style={{ color: "#6b7280", fontWeight: 600 }}>No countries in your roster yet.</p>
                    <button
                        onClick={() => { window.location.hash = "#/olympics/draft"; }}
                        style={{
                            marginTop: 12, padding: "8px 16px", background: NAVY,
                            color: "white", border: "none", borderRadius: 6, cursor: "pointer"
                        }}
                    >
                        Go to Draft →
                    </button>
                </div>
            ) : (
                <div style={{ background: "white", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ backgroundColor: NAVY, color: "white" }}>
                            <tr>
                                <th style={thStyle}>Country</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roster.map((c, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={tdStyle}>{c.country_name}</td>
                                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>${c.price}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const thStyle = { padding: "12px 15px", textAlign: "left", fontSize: 12, fontWeight: 600, borderBottom: `2px solid ${GOLD}`, textTransform: "uppercase" };
const tdStyle = { padding: "12px 15px", fontSize: 14 };