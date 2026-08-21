import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NAVY = "#0a1628";

export default function HrdAllTeams() {
    const { user, loading: authLoading } = useAuth();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!user || !token) return;
        axios.get("/api/hrd/all-teams", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setTeams(res.data || []))
            .catch(err => {
                console.error("Failed to load all teams", err);
                toast.error("Failed to load pool rosters");
            })
            .finally(() => setLoading(false));
    }, [user, token]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading pool rosters...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="hrd">
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px", paddingBottom: 90, paddingTop: 90 }}>
                <Toaster />
                <h2 style={{ color: NAVY, fontSize: "24px", marginBottom: 8 }}>📋 All Pool Rosters</h2>
                <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: 24 }}>
                    Check out who everyone drafted for the 2026 Home Run Derby season.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                    {teams.map(team => (
                        <div key={team.user_id} style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 12 }}>
                                <h3 style={{ margin: 0, color: NAVY, fontSize: "17px" }}>{team.real_name}</h3>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>@{team.username}</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                                {team.players.map(p => (
                                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", padding: "4px 0" }}>
                                        <span style={{ fontWeight: 600, color: "#334155" }}>{p.name} <span style={{ color: "#94a3b8", fontSize: "11px" }}>(${p.salary})</span></span>
                                        <span style={{ fontWeight: 700, color: "#16a34a" }}>{p.hr_2026} HR</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PoolGatekeeper>
    );
}