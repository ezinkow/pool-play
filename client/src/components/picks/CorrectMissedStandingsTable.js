import React from "react";

export default function CorrectMissedStandingsTable({ standings }) {
  return (
    <div style={{
      paddingTop: 68,
      paddingBottom: 80,
      paddingLeft: 12,
      paddingRight: 12
    }} className="standings-table">
      <h2 style={{ color: "var(--primary-navy)", paddingBottom: 6 }}>Standings</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{
          borderCollapse: "collapse",
          background: "white",
          width: "100%",
          fontSize: 14
        }} className="standings-table">
          <thead>
            <tr>
              {[
                { full: "Rank", short: "Rank" },
                { full: "Name", short: "Name" },
                { full: "Points", short: "Pts" },
                { full: "Correct", short: "✅" },
                { full: "Correct Missed", short: "🟡" }
              ].map(({ full, short }) => (
                <th key={full} style={{
                  position: "sticky",
                  top: 65,
                  zIndex: 4,
                  backgroundColor: "#13447a",
                  color: "white",
                  borderBottom: "2px solid #c89d3c",
                  padding: "10px 14px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                  fontSize: 12,
                  letterSpacing: "0.5px"
                }}>
                  <span className="hide-mobile">{full}</span>
                  <span className="show-mobile">{short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...cellStyle, textAlign: "center" }}>No standings available yet.</td>
              </tr>
            ) : standings.map((entry, index) => (
              <tr key={entry.user_id || entry.name || index} style={{
                backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                textAlign: "center"
              }}>
                <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                </td>
                <td style={{
                  ...cellStyle,
                  fontWeight: 600,
                  color: "var(--primary-navy)",
                  textAlign: "left"
                }}>
                  {entry.name}
                </td>
                <td style={{ ...cellStyle, fontWeight: 700 }}>{entry.points}</td>
                <td style={cellStyle}>{entry.correct}</td>
                <td style={cellStyle}>{entry.missed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid #e5e7eb"
};
