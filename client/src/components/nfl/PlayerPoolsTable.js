import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PlayerPoolsTable() {
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        axios.get("/api/playerpools").then((res) => {
            console.log("API response:", res.data);
            setPlayers(res.data);
        });
    }, []);

    return (
        <div style={{ padding: "16px" }}>
            <h2 style={{ marginBottom: "16px" }}>Player Pools Overview</h2>

            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "1000px",
                    }}
                >
                    <thead>
                        <tr style={{ background: "#2563eb", color: "#fff" }}>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>Team</th>
                            <th style={thStyle}>Position</th>
                            <th style={thStyle}>Tier</th>
                            <th style={thStyle}>Times Selected</th>
                            <th style={thStyle}>Wild Card</th>
                            <th style={thStyle}>Divisional</th>
                            <th style={thStyle}>Conf. Champ</th>
                            <th style={thStyle}>Super Bowl</th>
                            <th style={thStyle}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((p, idx) => (
                            <tr
                                key={p.id || idx}
                                style={{
                                    background: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                                }}
                            >
                                <td style={tdStyle}>{p.player_name}</td>
                                <td style={tdStyle}>{p.team}</td>
                                <td style={tdStyle}>{p.position}</td>
                                <td style={tdStyle}>{p.tier}</td>
                                <td style={tdStyle}>{p.times_selected}</td>
                                <td style={tdStyle}>{p.wild_card_score.toFixed(2)}</td>
                                <td style={tdStyle}>{p.divisional_score.toFixed(2)}</td>
                                <td style={tdStyle}>{p.conf_championship_score.toFixed(2)}</td>
                                <td style={tdStyle}>{p.super_bowl_score.toFixed(2)}</td>
                                <td style={{ ...tdStyle, fontWeight: "600" }}>
                                    {(Number(p.total_points) || 0).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const thStyle = {
    padding: "8px",
    textAlign: "left",
    borderBottom: "2px solid #e5e7eb",
};

const tdStyle = {
    padding: "8px",
    borderBottom: "1px solid #e5e7eb",
};
