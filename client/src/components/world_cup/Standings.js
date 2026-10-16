import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

function renderRank(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function WorldCupStandings() {
  const { user, loading: authLoading } = useAuth();
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/worldcup/standings")
      .then((res) => setStandings(res.data || []))
      .catch((err) => {
        console.error("Failed to load World Cup standings", err);
        toast.error("Failed to load standings");
      })
      .finally(() => setLoading(false));
  }, []);

  const rankedStandings = useMemo(() => {
    const sorted = [...standings].sort((a, b) =>
      (Number(b.points) || 0) - (Number(a.points) || 0)
      || (a.name || "").localeCompare(b.name || "")
    );

    let currentRank = 1;
    let previousPoints;
    return sorted.map((entry, index) => {
      const points = Number(entry.points) || 0;
      if (index === 0 || points !== previousPoints) {
        currentRank = index + 1;
      }
      previousPoints = points;
      return { ...entry, rank: currentRank };
    });
  }, [standings]);

  if (authLoading || loading) {
    return <div style={{ textAlign: "center", padding: 50 }}>Loading World Cup standings...</div>;
  }

  return (
    <PoolGatekeeper user={user} gameKey="worldcup">
      <div className="standings-table" style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "20px 12px",
        paddingBottom: 90
      }}>
        <Toaster />
        <style>{`
          .worldcup-standings-desktop { display: block; }
          .worldcup-standings-mobile { display: none; }
          @media (max-width: 700px) {
            .worldcup-standings-desktop { display: none !important; }
            .worldcup-standings-mobile { display: block !important; }
          }
        `}</style>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2 style={{ color: NAVY, margin: 0, fontWeight: 900 }}>World Cup Standings</h2>
          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 14 }}>
            Group stage and knockout points, plus each participant&apos;s champion pick.
          </p>
        </div>

        <div className="worldcup-standings-desktop" style={{
          overflowX: "auto",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)"
        }}>
          <table className="standings-table" style={{
            minWidth: 650,
            background: "white",
            borderCollapse: "collapse",
            width: "100%"
          }}>
            <thead>
              <tr style={{ background: NAVY, color: "white" }}>
                <th style={headerStyle}>Rank</th>
                <th style={{ ...headerStyle, textAlign: "left" }}>Participant</th>
                <th style={headerStyle}>Group Pts</th>
                <th style={headerStyle}>Knockout Pts</th>
                <th style={{ ...headerStyle, textAlign: "left" }}>Champion Pick</th>
                <th style={{ ...headerStyle, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rankedStandings.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ ...cellStyle, textAlign: "center" }}>No standings available yet.</td>
                </tr>
              ) : rankedStandings.map((entry, index) => {
                const isCurrentUser = Number(entry.id) === Number(user?.id);
                return (
                  <tr key={entry.id || entry.name || index} style={{
                    backgroundColor: isCurrentUser ? "#fffbeb" : (index % 2 === 0 ? "white" : "#f8fafc")
                  }}>
                    <td style={{ ...cellStyle, textAlign: "center", fontWeight: 800 }}>{renderRank(entry.rank)}</td>
                    <td style={{ ...cellStyle, fontWeight: isCurrentUser ? 800 : 600, textAlign: "left" }}>
                      {entry.name} {isCurrentUser && <strong style={{ color: NAVY }}>(You)</strong>}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{entry.group_points || 0}</td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{entry.bracket_points || 0}</td>
                    <td style={{ ...cellStyle, textAlign: "left" }}>
                      {entry.champion_logo && (
                        <img
                          src={entry.champion_logo}
                          alt=""
                          style={{ width: 22, height: 16, objectFit: "contain", marginRight: 6, verticalAlign: "middle" }}
                        />
                      )}
                      {entry.champion_pick || "TBD"}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "right", fontWeight: 900, color: NAVY }}>
                      {entry.points || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="worldcup-standings-mobile">
          {rankedStandings.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center", color: "#64748b" }}>No standings available yet.</div>
          ) : rankedStandings.map((entry) => {
            const isCurrentUser = Number(entry.id) === Number(user?.id);
            return (
              <article key={entry.id || entry.name} style={{
                ...cardStyle,
                backgroundColor: isCurrentUser ? "#fffbeb" : "white"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ color: NAVY }}>
                    {renderRank(entry.rank)} {entry.name} {isCurrentUser && "(You)"}
                  </strong>
                  <strong style={{ color: NAVY, whiteSpace: "nowrap" }}>{entry.points || 0} pts</strong>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
                  Group: {entry.group_points || 0} pts <span aria-hidden="true">·</span> Knockout: {entry.bracket_points || 0} pts
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
                  Champion pick: {entry.champion_logo && (
                    <img
                      src={entry.champion_logo}
                      alt=""
                      style={{ width: 22, height: 16, objectFit: "contain", margin: "0 4px", verticalAlign: "middle" }}
                    />
                  )}
                  {entry.champion_pick || "TBD"}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </PoolGatekeeper>
  );
}

const headerStyle = {
  padding: "12px 10px",
  textAlign: "center",
  whiteSpace: "nowrap",
  borderBottom: `2px solid ${GOLD}`,
  fontSize: 12
};

const cellStyle = {
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0"
};

const cardStyle = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  padding: 14,
  marginBottom: 10
};
