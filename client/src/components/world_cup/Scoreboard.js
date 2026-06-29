import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const NAVY = "#13447a";
const GOLD = "#c89d3c";
const WORLDCUPGREEN = "#226750";

const ROUND_LABELS = {
  0: "Group Stage",
  1: "Round of 32",
  2: "Round of 16",
  3: "Quarterfinals",
  4: "Semifinals",
  5: "Championship"
};

export default function Scoreboard() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("group");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await axios.get("/api/worldcup/matches");
        setMatches(res.data || []);
      } catch (err) {
        console.error("❌ Scoreboard Load Error:", err);
        toast.error("Failed to load match scoreboard records");
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const groupMatches = useMemo(() => {
    return matches.filter(m => parseInt(m.round) === 0).sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
  }, [matches]);

  const bracketMatches = useMemo(() => {
    return matches.filter(m => parseInt(m.round) > 0 && parseInt(m.round) <= 5).sort((a, b) => a.round - b.round || a.bracket_slot - b.bracket_slot);
  }, [matches]);

  const currentDisplayMatches = activeSection === "group" ? groupMatches : bracketMatches;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px" }}>
      <Toaster />
      <div style={{ marginBottom: 20, paddingLeft: 8 }}>
        <h2 style={{ color: NAVY, margin: 0, fontWeight: 900, fontSize: "24px" }}>🏆 World Cup Scoreboard</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "0 4px" }}>
        <button onClick={() => setActiveSection("group")} style={tabStyle(activeSection === "group", NAVY)}>
          📊 Group Stage Results ({groupMatches.filter(m => (m.status || "").toUpperCase().includes("FINAL")).length}/72)
        </button>
        <button onClick={() => setActiveSection("bracket")} style={tabStyle(activeSection === "bracket", GOLD)}>
          🏆 Knockout Results ({bracketMatches.filter(m => (m.status || "").toUpperCase().includes("FINAL")).length}/31)
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Fetching official matches...</div>
      ) : (
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 240px)", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={headerStyle}>Matchup</th>
                <th style={headerStyle}>Status</th>
                <th style={headerStyle}>Score</th>
                <th style={headerStyle}>Points</th>
              </tr>
            </thead>
            <tbody>
              {currentDisplayMatches.map((m, i) => {
                // Status logic defined inside the map scope for proper referencing
                const s = (m.status || "").toUpperCase();
                const isFinal = s.includes("FINAL") || s.includes("FULL_TIME");
                const isLive = s.includes("PROGRESS") || s.includes("LIVE") || s.includes("HALF");
                const isScheduled = !isFinal && !isLive;
                const badgeBg = isFinal ? "#166534" : isLive ? "#1e40af" : "#475569";

                return (
                  <tr key={m.match_id || i} style={{ backgroundColor: isFinal ? "#f9fafb" : "white" }}>
                    <td style={{ ...tdStyle, position: "sticky", left: 0, zIndex: 2, background: isFinal ? "#f1f5f9" : "#f8fafc", borderRight: `2px solid ${GOLD}`, textAlign: "left" }}>
                      {activeSection === "group" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "11px" }}>
                          <img src={m.away_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                          {!isMobile && <span>{m.away_team}</span>}
                          <span style={{ color: "#9ca3af", fontWeight: 400 }}>@</span>
                          <img src={m.home_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                          {!isMobile && <span>{m.home_team}</span>}
                        </div>
                      ) : (
                        <div style={{ fontWeight: 700, fontSize: "11px" }}>
                          {m.home_team !== "TBD" && m.away_team !== "TBD" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {/* Away Flag */}
                              <img src={m.away_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                              {m.away_team}
                              <span style={{ color: "#9ca3af", margin: "0 4px" }}>v</span>
                              {/* Home Flag */}
                              <img src={m.home_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                              {m.home_team}
                            </div>
                          ) : (
                            <div>
                              {ROUND_LABELS[m.round]} <span style={{ color: "#64748b" }}>(Slot {m.bracket_slot})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: "3px 8px", borderRadius: "10px", color: "white", fontSize: "10px", fontWeight: 700, backgroundColor: badgeBg }}>
                        {isFinal ? "Final" : isLive ? "Live" : "Scheduled"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 800 }}>
                      {isScheduled ? (
                        <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400, fontFamily: "sans-serif" }}>
                          {new Date(m.game_date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <span style={{ opacity: m.result === "Away" ? 1 : 0.6 }}>{m.away_score}</span>
                          -
                          <span style={{ opacity: m.result === "Home" ? 1 : 0.6 }}>{m.home_score}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {m.points_value || 0} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const tabStyle = (isActive, color) => ({
  flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, border: "none", cursor: "pointer",
  backgroundColor: isActive ? color : "#e2e8f0", color: isActive ? "white" : "#475569"
});

const headerStyle = {
  position: "sticky", top: 0, zIndex: 8, backgroundColor: NAVY, color: "white", padding: "12px 10px",
  whiteSpace: "nowrap", fontSize: 11, textTransform: "uppercase", textAlign: "center", borderBottom: `2px solid ${GOLD}`
};

const tdStyle = {
  padding: "12px 10px", verticalAlign: "middle", textAlign: "center", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap"
};