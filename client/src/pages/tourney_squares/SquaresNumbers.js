import React, { useEffect, useState } from "react";
import axios from "axios";

const GOLD = "#c89d3c";
const BLUE = "#0369a1";

export default function SquaresNumbers() {
    const [data1, setData1] = useState({});
    const [data2, setData2] = useState({});
    const [activeGrid, setActiveGrid] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get("/api/tourneysquares/my-numbers?grid_id=1"),
            axios.get("/api/tourneysquares/my-numbers?grid_id=2"),
        ]).then(([res1, res2]) => {
            setData1(res1.data);
            setData2(res2.data);
            setLoading(false);
        });
    }, []);

    const data = activeGrid === 1 ? data1 : data2;
    const sorted = Object.entries(data).sort((a, b) => b[1].length - a[1].length);

    if (loading) return <div style={{ padding: 80, textAlign: "center", color: BLUE }}>Loading...</div>;

    return (
        <div style={{ paddingTop: 68, paddingBottom: 80, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            <div style={{
                background: `linear-gradient(135deg, ${BLUE} 0%, #0284c7 100%)`,
                color: "white", padding: "20px 24px", marginBottom: 24,
            }}>
                <div style={{ maxWidth: 700, margin: "0 auto" }}>
                    <h2 style={{ margin: 0, color: GOLD, fontWeight: 900 }}>🔢 My Square Numbers</h2>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                        Numbers assigned after all squares are claimed
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px" }}>

                {/* Grid tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {[1, 2].map(g => (
                        <button key={g} onClick={() => setActiveGrid(g)} style={{
                            padding: "8px 24px", borderRadius: 20, border: "none",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                            backgroundColor: activeGrid === g ? BLUE : "#e5e7eb",
                            color: activeGrid === g ? "white" : "#374151",
                        }}>
                            Grid {g}
                        </button>
                    ))}
                </div>

                {sorted.length === 0 && (
                    <p style={{ color: "#6b7280" }}>No squares claimed on Grid {activeGrid} yet.</p>
                )}

                <table style={{ borderCollapse: "collapse", width: "100%", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", fontSize: 14 }}>
                    <thead>
                        <tr>
                            {["Name", "Numbers", "Count"].map(h => (
                                <th key={h} style={{
                                    padding: "10px 16px", backgroundColor: BLUE, color: "white",
                                    borderBottom: `2px solid ${GOLD}`, textAlign: "left",
                                    fontWeight: 600, fontSize: 13,
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(([name, squares], i) => (
                            <tr key={name} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                <td style={{ padding: "10px 16px", fontWeight: 700, color: BLUE, whiteSpace: "nowrap" }}>
                                    {name}
                                </td>
                                <td style={{ padding: "10px 16px", color: "#374151", fontFamily: "monospace", fontSize: 13 }}>
                                    {squares[0]?.startsWith("#")
                                        ? <span style={{ color: "#9ca3af", fontStyle: "italic" }}>TBD</span>
                                        : squares.join(", ")
                                    }
                                </td>
                                <td style={{ padding: "10px 16px", fontWeight: 700, color: GOLD, whiteSpace: "nowrap" }}>
                                    {squares.length} · {squares.length * 25} cr
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}