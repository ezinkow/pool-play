import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function TiebreakerCard() {
    const [totalPoints, setTotalPoints] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const token = localStorage.getItem("token");

    useEffect(() => {
        async function fetchTiebreaker() {
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const res = await axios.get("/api/mlb/tiebreaker", config);
                if (res.data && res.data.total_points !== null) {
                    setTotalPoints(res.data.total_points);
                }
            } catch (err) {
                console.error("Failed to load tiebreaker", err);
            } finally {
                setLoading(false);
            }
        }
        fetchTiebreaker();
    }, [token]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!totalPoints || isNaN(parseInt(totalPoints))) {
            toast.error("Please enter a valid total points prediction.");
            return;
        }

        setSaving(true);
        try {
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.post("/api/mlb/tiebreaker", { total_points: parseInt(totalPoints) }, config);
            toast.success("Championship tiebreaker saved!");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save tiebreaker.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div style={{
            background: "white",
            borderRadius: 12,
            padding: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0",
            marginBottom: 24,
            fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h3 style={{ color: NAVY, margin: 0, fontSize: "16px", fontWeight: 800 }}>
                        🏆 Championship Tiebreaker
                    </h3>
                    <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "12px" }}>
                        Guess the total combined runs/score for the final World Series game to break ties.
                    </p>
                </div>
                <form onSubmit={handleSave} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                        type="number"
                        placeholder="Total Score"
                        value={totalPoints}
                        onChange={(e) => setTotalPoints(e.target.value)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            width: "120px",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: NAVY,
                            outline: "none"
                        }}
                    />
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: NAVY,
                            color: "white",
                            border: `1px solid ${GOLD}`,
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "opacity 0.2s"
                        }}
                    >
                        {saving ? "Saving..." : "Save Tiebreaker"}
                    </button>
                </form>
            </div>
        </div>
    );
}