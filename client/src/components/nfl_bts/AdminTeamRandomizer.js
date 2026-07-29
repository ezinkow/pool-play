import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";

export default function AdminTeamRandomizer() {
    const [selectedRoom, setSelectedRoom] = useState(1);
    const [entryCounts, setEntryCounts] = useState({ 1: 0, 2: 0, 3: 0 });
    const [loading, setLoading] = useState(false);
    const [fetchingCount, setFetchingCount] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch entry counts for all rooms to show current capacity
    const fetchEntryCounts = async () => {
        setFetchingCount(true);
        try {
            const counts = {};
            for (let rId of [1, 2, 3]) {
                const res = await axios.get("/api/nfl_bts/matrix", {
                    params: { week: 1, room_id: rId },
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data;
                const rows = Array.isArray(data) ? data : (data.data || data.matrix || []);
                counts[rId] = rows.length;
            }
            setEntryCounts(counts);
        } catch (err) {
            console.error("Failed to fetch room entry counts", err);
        } finally {
            setFetchingCount(false);
        }
    };

    useEffect(() => {
        fetchEntryCounts();
    }, []);

    const handleRandomizeRoom = async () => {
        const count = entryCounts[selectedRoom] || 0;
        if (count === 0) {
            toast.error(`Room ${selectedRoom} has no entries yet.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to randomize team assignments for Room ${selectedRoom} (${count} users)? This will overwrite existing assignments for this room.`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post("/api/nfl_bts/admin/randomize-room-teams", {
                room_id: Number(selectedRoom)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message || `Room ${selectedRoom} randomized successfully!`);
            fetchEntryCounts();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to run team randomizer");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "24px", background: "white", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", margin: "20px auto", maxWidth: "600px", textAlign: "center" }}>
            <h3 style={{ color: NFL_BLUE, marginTop: 0 }}>🎲 Room Team Assignment Randomizer</h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
                Randomly assign NFL teams for an individual room. Automatically avoids duplicate team assignments across rooms for multi-room users.
            </p>

            <div style={{ marginBottom: "16px" }}>
                <label style={{ fontWeight: "bold", color: NFL_BLUE, marginRight: "10px" }}>Select Room:</label>
                <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(Number(e.target.value))}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "600" }}
                >
                    <option value={1}>Room 1 (50 Credit Pool)</option>
                    <option value={2}>Room 2 (100-Credit Pool A)</option>
                    <option value={3}>Room 3 (100-Credit Pool B)</option>
                </select>
            </div>

            {/* Room Participant Counter Display */}
            <div style={{ marginBottom: "24px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                Current Room Capacity:{" "}
                <span style={{ color: entryCounts[selectedRoom] === 32 ? "#16a34a" : NFL_BLUE }}>
                    {fetchingCount ? "Loading..." : `${entryCounts[selectedRoom]} / 32 entries joined`}
                </span>
            </div>

            <button
                onClick={handleRandomizeRoom}
                disabled={loading || fetchingCount || entryCounts[selectedRoom] === 0}
                style={{
                    backgroundColor: NFL_RED,
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: (loading || fetchingCount || entryCounts[selectedRoom] === 0) ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    opacity: (entryCounts[selectedRoom] === 0) ? 0.6 : 1
                }}
            >
                {loading ? "Randomizing Room..." : `Randomize Room ${selectedRoom} Teams (${entryCounts[selectedRoom]} Users)`}
            </button>
        </div>
    );
}