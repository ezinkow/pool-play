import React from "react";

export default function SurvivorGroupMatrixTable({
  currentWeek,
  rosterData,
  teamColors,
  user,
  accentColor,
  eliminatedColor
}) {
  return (
    <div style={{
      background: "white",
      borderRadius: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      border: "1px solid #e2e8f0",
      overflowX: "auto"
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr style={{ backgroundColor: accentColor, color: "white" }}>
            <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "14px" }}>Participant</th>
            <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "14px" }}>
              Week {currentWeek} Selection
            </th>
            <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "14px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rosterData.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                No pool entries found.
              </td>
            </tr>
          ) : (
            rosterData.map((row, idx) => {
              const isCurrentUser = Number(row.user_id) === Number(user?.id);
              const weekPick = row.picks?.[currentWeek] || null;
              const pickedTeam = weekPick?.team_name || null;
              const isHidden = pickedTeam === "🔒 Hidden";
              const teamMeta = teamColors[pickedTeam] || {};
              const pickLogo = weekPick?.logo || teamMeta.logo;

              return (
                <tr
                  key={row.user_id || idx}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white")
                  }}
                >
                  <td style={{
                    padding: "12px 16px",
                    fontWeight: isCurrentUser ? 800 : 600,
                    fontSize: "14px",
                    color: "#0f172a"
                  }}>
                    {row.entry_name} {isCurrentUser && "(You)"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    {pickedTeam ? (
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: isHidden ? "#f1f5f9" : (teamMeta.primaryColor || "#f1f5f9"),
                        color: isHidden ? "#64748b" : "#fff",
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: `1px solid ${isHidden ? "#cbd5e1" : (teamMeta.secondaryColor || "#cbd5e1")}`
                      }}>
                        {!isHidden && pickLogo && (
                          <span style={{
                            background: teamMeta.secondaryColor || "rgba(255,255,255,0.2)",
                            borderRadius: 4,
                            padding: "1px 3px",
                            display: "inline-flex",
                            alignItems: "center"
                          }}>
                            <img src={pickLogo} alt={pickedTeam} style={{ width: 18, height: 18, objectFit: "contain" }} />
                          </span>
                        )}
                        <span style={{ fontWeight: 700, fontSize: "13px" }}>{pickedTeam}</span>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>
                        No Pick Made
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: "13px" }}>
                    {row.is_eliminated ? (
                      <span style={{ color: eliminatedColor }}>✕ Eliminated (W{row.eliminated_week})</span>
                    ) : (
                      <span style={{ color: "#16a34a" }}>✓ Alive</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
