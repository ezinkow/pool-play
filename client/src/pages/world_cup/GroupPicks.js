import React, { useState } from 'react';
// Use clean, explicit token identifiers for the imported module functions
import GroupPicksGroupStage from '../../components/world_cup/UserPicksDisplay';
import GroupPicksBracketStage from '../../components/world_cup/BracketStageUserPicksDisplay';

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function PicksDisplay() {
    // ── STATE NAVIGATION SWITCHER ──────────────────────────────────────────
    // Tracks which phase tab is currently active ('group' or 'knockout')
    const [activeTab, setActiveTab] = useState("group");

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", paddingLeft: "16px", paddingRight: "16px" }} className='page-content'>

            {/* Header Identity Display Panel */}
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <h2 style={{ color: NAVY, margin: 0, fontWeight: 900 }}>🔍 User Picks Display</h2>
                <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                    See what predictions the rest of the pool participants picked for each match.
                </p>
            </div>

            {/* Navigation Tabs Bar */}
            <div style={{
                display: "flex",
                gap: "8px",
                backgroundColor: "#f1f5f9",
                padding: "6px",
                borderRadius: "10px",
                marginBottom: "24px"
            }}>
                <button
                    onClick={() => setActiveTab("group")}
                    style={{
                        flex: 1,
                        padding: "12px 16px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        backgroundColor: activeTab === "group" ? NAVY : "transparent",
                        color: activeTab === "group" ? "white" : "#475569",
                        boxShadow: activeTab === "group" ? "0 4px 12px rgba(19, 68, 122, 0.15)" : "none",
                        transition: "all 0.15s ease"
                    }}
                >
                    📊 All Matches
                </button>
                <button
                    onClick={() => setActiveTab("knockout")}
                    style={{
                        flex: 1,
                        padding: "12px 16px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        backgroundColor: activeTab === "knockout" ? GOLD : "transparent",
                        color: activeTab === "knockout" ? "white" : "#475569",
                        boxShadow: activeTab === "knockout" ? "0 4px 12px rgba(200, 157, 60, 0.2)" : "none",
                        transition: "all 0.15s ease"
                    }}
                >
                    🏆 Bracket
                </button>
            </div>

            {/* ── CONDITIONAL VIEWPORT RENDER NODES ───────────────────────────────── */}
            <div
                className="tab-view-content"
                style={{
                    width: "100%",
                    textAlign: "left",       // 🧠 RESETS inner grids from inheriting center alignment shifts
                    display: "block",
                    marginTop: "20px"
                }}
            >
                {activeTab === "group" ? (
                    <GroupPicksGroupStage />
                ) : (
                    /* Explicitly wrapping the bracket to handle standard dimensions over overflow elements */
                    <div style={{ width: "100%", overflowX: "auto" }}>
                        <GroupPicksBracketStage />
                    </div>
                )}
            </div>
        </div>
    );
}