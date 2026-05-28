import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuth from "../hooks/useAuth";
import ChangePassword from '../components/ChangePassword'

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function MyAccount() {
    const navigate = useNavigate();
    const { user: user, loading: authLoading } = useAuth();
    const [myPools, setMyPools] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user?.id) {
            setLoading(false);
            return;
        }

        axios.get("/api/users/my-pools", { params: { user_id: user.id } })
            .then(res => {
                setMyPools(res.data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("❌ Failed gathering user entry sheets maps:", err);
                setLoading(false);
            });
    }, [user, authLoading]);

    if (authLoading || loading) {
        return <div style={{ padding: 100, textAlign: "center", color: NAVY, fontWeight: 700 }}>Scanning active entry sheets profiles...</div>;
    }

    if (!user?.id) {
        return (
            <div style={{ maxWidth: 500, margin: "100px auto", padding: 32, background: "white", borderRadius: 12, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <h3>🔒 Account Dashboard Pinned</h3>
                <p style={{ color: "#64748b", fontSize: 14 }}>Please utilize the login module in the header bar to review your ongoing tournament brackets profiles.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "85px 16px 80px" }}>
            {/* Profiler Identification Header Grid Banner Section */}
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 20, marginBottom: 24 }}>
                <h2 style={{ color: NAVY, margin: 0, fontWeight: 900 }}>👤 Account Manager</h2>
                <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                    Signed in as: <strong style={{ color: GOLD }}>{user.name}</strong>
                </p>
            </div>

            <h3 style={{ color: "#1e293b", fontWeight: 800, fontSize: "18px", marginBottom: 16 }}>🏃 My Live Active Entries</h3>

            {myPools.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                    <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>You haven't initialized an entry sheet across this season's ongoing tournaments yet.</p>
                    <button onClick={() => navigate("/")} style={{ marginTop: 12, padding: "8px 16px", backgroundColor: NAVY, color: "white", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
                        Browse Live Tournaments →
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {myPools.map((pool) => (
                        <div
                            key={pool.key}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                backgroundColor: "white", padding: "16px 20px", borderRadius: 12,
                                border: "1px solid #e2e8f0", borderLeft: `6px solid ${pool.accent || GOLD}`,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <span style={{ fontSize: 32 }}>{pool.emoji}</span>
                                <div>
                                    <h4 style={{ margin: 0, color: "#1e293b", fontWeight: 800 }}>{pool.label}</h4>
                                    <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 12 }}>{pool.title}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(pool.route)}
                                style={{
                                    padding: "8px 16px", backgroundColor: pool.accent || NAVY, color: "white",
                                    border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13
                                }}
                            >
                                Open Dashboard
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <ChangePassword />
        </div>
    );
}