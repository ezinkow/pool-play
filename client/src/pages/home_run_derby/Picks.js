import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NAVY = "#0a1628";
const GOLD = "#c89d3c";
const MAX_CAP = 300;
const MAX_ROSTER_SIZE = 12;

export default function HrdDraft() {
    const { user, loading: authLoading } = useAuth();
    const [players, setPlayers] = useState([]);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [saving, setSaving] = useState(false);

    const token = localStorage.getItem("token");

    // Fetch available eligible players and user's current roster
    useEffect(() => {
        if (!user || !token) return;
        setLoading(true);

        Promise.all([
            axios.get("/api/hrd/players", { headers: { Authorization: `Bearer ${token}` } }),
            axios.get("/api/hrd/roster/me", { headers: { Authorization: `Bearer ${token}` } })
        ])
            .then(([playersRes, rosterRes]) => {
                setPlayers(playersRes.data || []);
                const currentIds = (rosterRes.data || []).map(r => r.player_id);
                setSelectedPlayerIds(currentIds);
            })
            .catch(err => {
                console.error("Failed to load HRD data", err);
                toast.error("Failed to load Home Run Derby data");
            })
            .finally(() => setLoading(false));
    }, [user, token]);

    // Calculate current stats for selected players
    const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));
    const totalSalary = selectedPlayers.reduce((sum, p) => sum + p.salary, 0);
    const remainingBudget = MAX_CAP - totalSalary;

    const handleTogglePlayer = (player) => {
        if (selectedPlayerIds.includes(player.id)) {
            // Remove player
            setSelectedPlayerIds(prev => prev.filter(id => id !== player.id));
        } else {
            // Add player checks
            if (selectedPlayerIds.length >= MAX_ROSTER_SIZE) {
                toast.error(`You can only select a maximum of ${MAX_ROSTER_SIZE} players.`);
                return;
            }
            if (totalSalary + player.salary > MAX_CAP) {
                toast.error(`Adding ${player.name} exceeds your 300 salary cap!`);
                return;
            }
            setSelectedPlayerIds(prev => [...prev, player.id]);
        }
    };

    const handleSaveRoster = async () => {
        if (selectedPlayerIds.length !== MAX_ROSTER_SIZE) {
            toast.error(`Your roster must have exactly ${MAX_ROSTER_SIZE} players. (Currently: ${selectedPlayerIds.length})`);
            return;
        }

        if (totalSalary > MAX_CAP) {
            toast.error("Salary cap exceeded!");
            return;
        }

        setSaving(true);
        try {
            await axios.post("/api/hrd/roster/save", {
                playerIds: selectedPlayerIds
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Home Run Derby roster saved successfully! ⚾");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save roster");
        } finally {
            setSaving(false);
        }
    };

    // Filter available players
    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.team.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading Derby draft pool...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="home_run_derby" className='page-content'>
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px", paddingBottom: 90, paddingTop: 90 }}>
                <Toaster />

                {/* Header Summary Bar */}
                <div style={{
                    position: "sticky", top: "56px", zIndex: 99, background: "#ffffff",
                    padding: "16px 20px", borderRadius: 12, border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", marginBottom: 24,
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16
                }}>
                    <div>
                        <h2 style={{ color: NAVY, fontSize: "22px", margin: 0 }}>⚾ Home Run Derby Draft</h2>
                        <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "13px" }}>
                            Pick 12 hitters under the 300 salary cap (Salary = 2025 Home Runs).
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ background: selectedPlayerIds.length === 12 ? "#ecfdf5" : "#fff7ed", color: selectedPlayerIds.length === 12 ? "#047857" : "#c2410c", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                            Roster: {selectedPlayerIds.length} / {MAX_ROSTER_SIZE}
                        </div>
                        <div style={{ background: remainingBudget >= 0 ? "#f8fafc" : "#fef2f2", color: remainingBudget >= 0 ? "#0f172a" : "#dc2626", border: "1px solid #cbd5e1", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: "13px" }}>
                            Budget Left: {remainingBudget} / {MAX_CAP}
                        </div>
                        <button
                            onClick={handleSaveRoster}
                            disabled={saving}
                            style={{
                                background: "#16a34a", color: "white", border: "none", padding: "9px 20px",
                                borderRadius: 8, fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                                boxShadow: "0 2px 6px rgba(22,163,74,0.3)"
                            }}
                        >
                            {saving ? "Saving..." : "Save Roster"}
                        </button>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

                    {/* Left Column: Available Player Pool */}
                    <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: "16px", color: NAVY }}>Available Hitters (Eligible 12+ HR, 350+ AB)</h3>
                            <input
                                type="text"
                                placeholder="Search player or team..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", width: 200 }}
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "650px", overflowY: "auto", paddingRight: 4 }}>
                            {filteredPlayers.map(player => {
                                const isSelected = selectedPlayerIds.includes(player.id);
                                return (
                                    <div key={player.id} style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "10px 14px", borderRadius: 8, border: isSelected ? `2px solid ${GOLD}` : "1px solid #e2e8f0",
                                        background: isSelected ? "#fffbeb" : "#f8fafc", transition: "all 0.15s ease"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            {player.headshot && (
                                                <img src={player.headshot} alt={player.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", background: "#cbd5e1" }} />
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: "14px", color: NAVY }}>{player.name} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>({player.team} - {player.position})</span></div>
                                                <div style={{ fontSize: "12px", color: "#64748b" }}>2025 Stats: <strong>{player.salary} HR</strong> | {player.at_bats_2025} AB | 2026 Live HR: <span style={{ color: "#047857", fontWeight: 700 }}>{player.hr_2026}</span></div>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <span style={{ fontSize: "13px", fontWeight: 700, background: "#e2e8f0", padding: "4px 8px", borderRadius: 4, color: "#334155" }}>
                                                ${player.salary}
                                            </span>
                                            <button
                                                onClick={() => handleTogglePlayer(player)}
                                                style={{
                                                    background: isSelected ? "#dc2626" : NAVY, color: "white", border: "none",
                                                    padding: "6px 12px", borderRadius: 6, fontWeight: 700, fontSize: "12px", cursor: "pointer"
                                                }}
                                            >
                                                {isSelected ? "Remove" : "Draft"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column: Current Roster Summary */}
                    <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "sticky", top: "130px" }}>
                        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", color: NAVY }}>Your Roster ({selectedPlayers.length}/12)</h3>

                        {selectedPlayers.length === 0 ? (
                            <p style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                                No players drafted yet. Click "Draft" on the left to build your team!
                            </p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "500px", overflowY: "auto" }}>
                                {selectedPlayers.map(p => (
                                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f1f5f9", borderRadius: 6, fontSize: "13px" }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: NAVY }}>{p.short_name || p.name}</div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>{p.team} • Salary: ${p.salary}</div>
                                        </div>
                                        <button
                                            onClick={() => handleTogglePlayer(p)}
                                            style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: "13px", color: "#475569" }}>
                            <div style={{ display: "flex", justifyContent: "between", marginBottom: 4 }}>
                                <span>Total Salary Used:</span>
                                <strong>{totalSalary} / {MAX_CAP}</strong>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </PoolGatekeeper>
    );
}