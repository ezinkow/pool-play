import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuth from "../hooks/useAuth";
import ChangePassword from '../components/ChangePassword'

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function MyAccount() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
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

    // Split pools into two lists for cleaner UI
    const { active, inactive } = useMemo(() => {
        return {
            active: myPools.filter(p => p.is_active === true),
            inactive: myPools.filter(p => p.is_active !== true)
        };
    }, [myPools]);

    if (authLoading || loading) {
        return <div style={{ padding: 100, textAlign: "center", color: NAVY, fontWeight: 700 }}>Scanning active entry sheets profiles...</div>;
    }

    const renderPoolCard = (pool, isActive) => (
        <div
            key={pool.key}
            style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                backgroundColor: isActive ? "white" : "#f1f5f9",
                padding: "16px 20px", borderRadius: 12,
                border: "1px solid #e2e8f0",
                borderLeft: `6px solid ${isActive ? (pool.accent || GOLD) : "#9ca3af"}`,
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                opacity: isActive ? 1 : 0.7
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 32 }}>{pool.emoji}</span>
                <div>
                    <h4 style={{ margin: 0, color: "#1e293b", fontWeight: 800 }}>
                        {pool.label} {!isActive && <span style={{ fontSize: 10, color: "#64748b" }}>(Ended)</span>}
                    </h4>
                    <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 12 }}>{pool.title}</p>
                </div>
            </div>

            <button
                onClick={() => isActive ? navigate(pool.route) : navigate(`${pool.route}/standings`)}
                style={{
                    padding: "8px 16px",
                    backgroundColor: isActive ? (pool.accent || NAVY) : "#64748b",
                    color: "white",
                    border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13
                }}
            >
                {isActive ? "Open Dashboard" : "View Results"}
            </button>
        </div>
    );

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "85px 16px 80px" }}>
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 20, marginBottom: 24 }}>
                <h2 style={{ color: NAVY, margin: 0, fontWeight: 900 }}>👤 Account Manager</h2>
                <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                    Signed in as: <strong style={{ color: GOLD }}>{user?.name}</strong>
                </p>
            </div>

            {/* Active Pools Section */}
            <h3 style={{ color: "#1e293b", fontWeight: 800, fontSize: "18px", marginBottom: 16 }}>🏃 Live Active Entries</h3>
            {active.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1", marginBottom: 30 }}>
                    <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>No active pools at this time.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
                    {active.map(p => renderPoolCard(p, true))}
                </div>
            )}

            {/* Inactive Pools Section */}
            {inactive.length > 0 && (
                <>
                    <h3 style={{ color: "#64748b", fontWeight: 800, fontSize: "18px", marginBottom: 16 }}>📜 Archived Pools</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {inactive.map(p => renderPoolCard(p, false))}
                    </div>
                </>
            )}

            <div style={{ marginTop: 40 }}>
                <ChangePassword />
            </div>
        </div>
    );
}