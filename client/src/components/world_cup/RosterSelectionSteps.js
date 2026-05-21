
import React from 'react'

export default function Rules() {


    return (
        <div
            style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
                marginBottom: "20px",
            }}
        >
            <h3 style={{ fontWeight: 800, marginBottom: "12px" }}>
                📝 How to Build Your Roster
            </h3>

            <ol style={{ paddingLeft: "18px", marginBottom: "20px" }}>
                <li>Select your name from the dropdown</li>
                <li>
                    Build your roster by selecting the correct number of players per tier
                </li>
                <li>
                    <strong>Total roster size:</strong>{" "}
                    <span style={{ color: "#2563eb" }}>14 players</span>
                </li>
                <li>
                    <strong style={{ color: "#dc2626" }}>
                        Pick EXACTLY 2 Quarterbacks
                    </strong>
                </li>
                <li>
                    Quarterbacks represent the <strong>team QB</strong>. If the starter is
                    injured mid-game, you only receive the points scored before the injury.
                    The backup may be used in future games.
                </li>
                <li>Review your roster below before submitting</li>
                <li>Click <strong>Submit</strong></li>
                <li>
                    Head to <strong>My Roster</strong> to set your Wild Card starting lineup
                </li>
            </ol>

            <div style={{ display: "flex", gap: "32px", marginTop: "16px", alignItems: "flex-start" }}>
                {/* Scoring Rules */}
                <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: "8px" }}>
                        📊 Scoring Rules
                    </h4>

                    <ul style={{ paddingLeft: "18px" }}>
                        <li>
                            <strong>Passing:</strong> 1 yard = 0.04 pts · TD = 4 pts · Interception thrown = -1 pt
                        </li>
                        <li>
                            <strong>Rushing / Receiving:</strong> 1 yard = 0.1 pts · TD = 6 pts · Reception = 1 pt
                        </li>
                        <li>
                            <strong>Miscellaneous:</strong> Fumble lost = -2 pts · 2-point conversion = 2 pts
                        </li>
                        <li><strong>Superflex</strong> = QB/WR/RB/TE</li>
                        <li><strong>TE</strong> = WR</li>
                    </ul>
                </div>

                {/* Round-by-Round Starting Rosters */}
                <div style={{ flex: 1, borderTop: "1px dashed #e5e7eb", paddingTop: "16px" }}>
                    <h4 style={{ fontWeight: 700, marginBottom: "8px" }}>
                        📋 Round-by-Round Starting Rosters
                    </h4>

                    <ul style={{ paddingLeft: "18px" }}>
                        <li>
                            <strong>Wild-Card:</strong> 1 QB, 2 RB, 3 WR, 2 SUPERFLEX
                        </li>
                        <li>
                            <strong>Divisional Round:</strong> 1 QB, 1 RB, 2 WR, 2 SUPERFLEX
                        </li>
                        <li>
                            <strong>Conference Championship:</strong> 1 RB, 1 WR, 3 SUPERFLEX
                        </li>
                        <li><strong>Super Bowl:</strong> 4 SUPERFLEX</li>
                    </ul>
                </div>
            </div>

        </div>
    )
}