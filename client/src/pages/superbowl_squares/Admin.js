import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const GOLD = "#c89d3c";
const BLUE = "#0369a1";

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function SquaresAdmin() {
    const [preview1, setPreview1] = useState(null);
    const [preview2, setPreview2] = useState(null);
    const [saving, setSaving] = useState(null);
    const [done1, setDone1] = useState(false);
    const [done2, setDone2] = useState(false);

    const generatePreview = (gridId) => {
        const cols = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const rows = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        if (gridId === 1) setPreview1({ cols, rows });
        else setPreview2({ cols, rows });
    };

    const assignNumbers = async (gridId) => {
        const preview = gridId === 1 ? preview1 : preview2;
        if (!preview) return;
        setSaving(gridId);
        try {
            await axios.post("/api/tourneysquares/admin/assign-numbers", {
                grid_id: gridId,
                col_numbers: preview.cols,
                row_numbers: preview.rows,
            });
            toast.success(`Grid ${gridId} numbers assigned!`);
            if (gridId === 1) setDone1(true);
            else setDone2(true);
        } catch {
            toast.error("Failed to assign numbers");
        } finally {
            setSaving(null);
        }
    };

    const GridPanel = ({ gridId }) => {
        const preview = gridId === 1 ? preview1 : preview2;
        const done = gridId === 1 ? done1 : done2;

        return (
            <div style={{
                background: "white", borderRadius: 16, padding: "24px 28px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                borderTop: `4px solid ${done ? "#16a34a" : GOLD}`,
                marginBottom: 24,
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <h3 style={{ margin: 0, color: BLUE, fontWeight: 800 }}>
                        Grid {gridId} {done && <span style={{ color: "#16a34a", fontSize: 14 }}>✅ Assigned</span>}
                    </h3>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            onClick={() => generatePreview(gridId)}
                            style={{
                                padding: "8px 18px", borderRadius: 8,
                                backgroundColor: BLUE, color: "white",
                                border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13,
                            }}
                        >
                            🎲 Generate Numbers
                        </button>
                        {preview && !done && (
                            <button
                                onClick={() => assignNumbers(gridId)}
                                disabled={saving === gridId}
                                style={{
                                    padding: "8px 18px", borderRadius: 8,
                                    backgroundColor: "#16a34a", color: "white",
                                    border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13,
                                    opacity: saving === gridId ? 0.7 : 1,
                                }}
                            >
                                {saving === gridId ? "Saving..." : "✅ Confirm & Save"}
                            </button>
                        )}
                        {preview && !done && (
                            <button
                                onClick={() => generatePreview(gridId)}
                                style={{
                                    padding: "8px 18px", borderRadius: 8,
                                    backgroundColor: "#f3f4f6", color: "#374151",
                                    border: "1px solid #d1d5db", fontWeight: 600, cursor: "pointer", fontSize: 13,
                                }}
                            >
                                🔄 Regenerate
                            </button>
                        )}
                    </div>
                </div>

                {!preview && (
                    <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
                        Click "Generate Numbers" to randomly assign col and row numbers for Grid {gridId}.
                    </p>
                )}

                {preview && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Col numbers preview */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                                Winner's Last Digit (Columns — left to right)
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                                {preview.cols.map((n, i) => (
                                    <div key={i} style={{
                                        width: 40, height: 40, borderRadius: 8,
                                        backgroundColor: BLUE, color: "white",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontWeight: 800, fontSize: 16,
                                    }}>
                                        {n}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Row numbers preview */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                                Loser's Last Digit (Rows — top to bottom)
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                                {preview.rows.map((n, i) => (
                                    <div key={i} style={{
                                        width: 40, height: 40, borderRadius: 8,
                                        backgroundColor: GOLD, color: BLUE,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontWeight: 800, fontSize: 16,
                                    }}>
                                        {n}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mini grid preview */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                                Preview
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 32, height: 28, backgroundColor: "#f8fafc" }} />
                                            {preview.cols.map((n, i) => (
                                                <th key={i} style={{
                                                    width: 32, height: 28, textAlign: "center",
                                                    backgroundColor: BLUE, color: "white", fontWeight: 800,
                                                    border: "1px solid #e5e7eb",
                                                }}>{n}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.map((rowN, rowIdx) => (
                                            <tr key={rowIdx}>
                                                <td style={{
                                                    width: 32, height: 28, textAlign: "center",
                                                    backgroundColor: GOLD, color: BLUE, fontWeight: 800,
                                                    border: "1px solid #e5e7eb",
                                                }}>{rowN}</td>
                                                {preview.cols.map((colN, colIdx) => (
                                                    <td key={colIdx} style={{
                                                        width: 32, height: 28, textAlign: "center",
                                                        backgroundColor: rowIdx % 2 === 0 ? "white" : "#f9fafb",
                                                        border: "1px solid #e5e7eb",
                                                        fontSize: 9, color: "#9ca3af",
                                                    }}>
                                                        {colN}-{rowN}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ paddingTop: 68, paddingBottom: 80, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            <Toaster />

            <div style={{
                background: `linear-gradient(135deg, ${BLUE} 0%, #0284c7 100%)`,
                color: "white", padding: "20px 24px", marginBottom: 24,
            }}>
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                    <h2 style={{ margin: 0, color: GOLD, fontWeight: 900 }}>⚙️ Squares Admin</h2>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                        Randomly assign numbers to each grid after all squares are claimed
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>
                <div style={{ marginBottom: 16, padding: "10px 16px", backgroundColor: "#fef9c3", borderRadius: 8, color: "#92400e", fontWeight: 600, fontSize: 13 }}>
                    ⚠️ Once confirmed, numbers cannot be changed. Generate and preview before confirming.
                </div>

                <GridPanel gridId={1} />
                <GridPanel gridId={2} />
            </div>
        </div>
    );
}