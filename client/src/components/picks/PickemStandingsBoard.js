import React from "react";

const WHITE = "#FFFFFF";
const GOLD = "#c89d3c";

const renderRank = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};

export default function PickemStandingsBoard({
  standings,
  currentUser,
  accentColor,
  lossColor,
  showBestBets = true
}) {
  return (
    <div className="pickem-standings-board" style={{ "--pickem-accent": accentColor }}>
      <style>{`
        .pickem-standings-desktop { display: block; }
        .pickem-standings-mobile { display: none; }
        @media (max-width: 768px) {
          .pickem-standings-desktop { display: none !important; }
          .pickem-standings-mobile { display: block !important; }
        }
      `}</style>

      <div className="pickem-standings-desktop" style={{
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e2e8f0"
      }}>
        <table className="pickem-standings-table" style={{
          width: "100%",
          background: WHITE,
          fontSize: 13,
          borderCollapse: "collapse",
          textAlign: "left"
        }}>
          <thead>
            <tr style={{ background: accentColor, color: WHITE }}>
              <th style={{ ...headerCellStyle, width: 60, textAlign: "center" }}>Rank</th>
              <th style={headerCellStyle}>Entry Name</th>
              <th style={{ ...headerCellStyle, textAlign: "center" }}>Overall Record (W-L)</th>
              {showBestBets && (
                <th style={{ ...headerCellStyle, textAlign: "center" }}>Best Bets (W-L)</th>
              )}
              <th style={{ ...headerCellStyle, textAlign: "center" }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => {
              const isCurrentUser = entry.user_id === currentUser?.id;
              return (
                <tr key={entry.user_id} className={`pickem-standings-row${isCurrentUser ? " pickem-standings-current-user" : ""}`} style={{
                  borderBottom: "1px solid #edf2f7",
                  backgroundColor: isCurrentUser ? "#fffbeb" : "transparent"
                }}>
                  <td className="pickem-standings-rank" style={{
                    ...bodyCellStyle,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: entry.rank <= 3 ? 18 : 14,
                    color: "#475569"
                  }}>
                    {renderRank(entry.rank)}
                  </td>
                  <td className="pickem-standings-entry-name" style={{ ...bodyCellStyle, fontWeight: isCurrentUser ? "bold" : 700, color: "#0f172a" }}>
                    {entry.entry_name}
                    {isCurrentUser && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 11,
                        background: accentColor,
                        color: WHITE,
                        padding: "2px 6px",
                        borderRadius: 4
                      }}>
                        You
                      </span>
                    )}
                  </td>
                  <td className="pickem-standings-record" style={{ ...bodyCellStyle, textAlign: "center", color: "#334155" }}>
                    {entry.wins || 0} - {entry.losses || 0}
                  </td>
                  {showBestBets && (
                    <td className="pickem-standings-record" style={{ ...bodyCellStyle, textAlign: "center", color: "#334155" }}>
                      <span className="pickem-standings-win" style={{ color: "#047857", fontWeight: 700 }}>{entry.best_bet_wins || 0}</span>
                      {" - "}
                      <span className="pickem-standings-loss" style={{ color: lossColor, fontWeight: 700 }}>{entry.best_bet_losses || 0}</span>
                    </td>
                  )}
                  <td className="pickem-standings-points" style={{
                    ...bodyCellStyle,
                    textAlign: "center",
                    fontWeight: 900,
                    color: accentColor,
                    fontSize: 15
                  }}>
                    {entry.total_points || 0} pts
                  </td>
                </tr>
              );
            })}
            {standings.length === 0 && (
              <tr>
                <td colSpan={showBestBets ? 5 : 4} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                  No entries found in the leaderboard yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pickem-standings-mobile">
        {standings.map((entry) => {
          const isCurrentUser = entry.user_id === currentUser?.id;
          return (
            <div key={entry.user_id} className={`pickem-standings-card${isCurrentUser ? " pickem-standings-current-user" : ""}`} style={{
              background: WHITE,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              marginBottom: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              backgroundColor: isCurrentUser ? "#fffbeb" : WHITE
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8
              }}>
                <span className="pickem-standings-mobile-name" style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
                  <span style={{ marginRight: 6 }}>{renderRank(entry.rank)}</span> {entry.entry_name}
                  {isCurrentUser && (
                    <span style={{
                      marginLeft: 6,
                      fontSize: 10,
                      background: accentColor,
                      color: WHITE,
                      padding: "2px 5px",
                      borderRadius: 4
                    }}>
                      You
                    </span>
                  )}
                </span>
                <span className="pickem-standings-points" style={{ fontWeight: 900, color: accentColor, fontSize: 18 }}>
                  {entry.total_points || 0} pts
                </span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #f1f5f9",
                paddingTop: 8,
                fontSize: 12,
                color: "#6b7280"
              }}>
                <div className="pickem-standings-mobile-record">
                  Record: <strong>{entry.wins || 0}-{entry.losses || 0}</strong>
                </div>
                {showBestBets && (
                  <div className="pickem-standings-mobile-record">
                    Best Bets: <span className="pickem-standings-win" style={{ color: "#047857", fontWeight: 700 }}>{entry.best_bet_wins || 0}</span>
                    -<span className="pickem-standings-loss" style={{ color: lossColor, fontWeight: 700 }}>{entry.best_bet_losses || 0}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {standings.length === 0 && (
          <div style={{
            background: WHITE,
            padding: 30,
            textAlign: "center",
            color: "#64748b",
            borderRadius: 10,
            border: "1px solid #e2e8f0"
          }}>
            No entries found in the leaderboard yet.
          </div>
        )}
      </div>
    </div>
  );
}

const headerCellStyle = {
  padding: "14px 16px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: `2px solid ${GOLD}`
};

const bodyCellStyle = {
  padding: "14px 16px",
  fontSize: 14
};
