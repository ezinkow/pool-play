import React from 'react'

export default function instructions() {

    const BLUE = "#0369a1";
    const NAVY = "#0a1628";

    return (
        <div style={{
            background: "white", borderRadius: 16, padding: "24px 28px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 24,
            borderTop: `4px solid ${NAVY}`,
        }}>
            <h3 style={{ color: BLUE, marginTop: 0, marginBottom: 16 }}>📋 Instructions</h3>
            <ul>
                <li>For each round of the NBA playoffs, select who will win each series, how many games they will win it in and select how confident you are in that team winning by assigning confidence points.</li>
                <li>You can assign the same number of confidence points multiple times.</li>
                <li>The only rule with confidence points is the max number of total points per round (Rd 1: 32 pts, Rd 2: 24 pts, Rd 3: 16 pts, Finals: 8 pts).</li>
                <li>Missed series picks will default to the lower seed winning in 4 games with the average number of points (ie. A Round 2 missed series would give you the lower seed in 4 games for 6 points).</li>
                <li>Series lock at the scheduled tip-off time of the first game.</li>
                <li>Series in the next round will be selectable once both teams are decided.</li>
            </ul>
        </div >

    )
}