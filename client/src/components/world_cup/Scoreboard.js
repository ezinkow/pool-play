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
  const [activeSection, setActiveSection] = useState("group"); // Toggle between 'group' and 'bracket'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  /* ---------------- DETECT MOBILE SCREEN VIEWPORTS ---------------- */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------------- FETCH ALL LIVE MATCH NODES ---------------- */
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

  /* ---------------- SPLIT MATCHES BY TOURNAMENT FORMAT ---------------- */
  const groupMatches = useMemo(() => {
    const filtered = matches.filter(m => parseInt(m.round) === 0);
    return [...filtered].sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  }, [matches]);

  const bracketMatches = useMemo(() => {
    const filtered = matches.filter(m => parseInt(m.round) > 0 && parseInt(m.round) <= 5);
    return [...filtered].sort((a, b) => a.round - b.round || a.bracket_slot - b.bracket_slot);
  }, [matches]);

  const currentDisplayMatches = activeSection === "group" ? groupMatches : bracketMatches;

  return (
    <div  style={{ maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px" }}>
      <Toaster />

      {/* Header Profile Dashboard */}
      <div style={{ marginBottom: 20, paddingLeft: 8 }}>
        <h2 style={{ color: NAVY, margin: 0, fontWeight: 900, fontSize: "24px" }}>🏆 World Cup Scoreboard</h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Live match statuses, scores, and official results synced across tournament stages.
        </p>
      </div>

      {/* Section View Switcher Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "0 4px" }}>
        <button
          onClick={() => setActiveSection("group")}
          style={{
            flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, border: "none", cursor: "pointer",
            backgroundColor: activeSection === "group" ? NAVY : "#e2e8f0",
            color: activeSection === "group" ? "white" : "#475569"
          }}
        >
          📊 Group Stage Results ({groupMatches.filter(m => m.status?.includes("FINAL")).length}/72)
        </button>
        <button
          onClick={() => setActiveSection("bracket")}
          style={{
            flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, border: "none", cursor: "pointer",
            backgroundColor: activeSection === "bracket" ? GOLD : "#e2e8f0",
            color: activeSection === "bracket" ? "white" : "#475569"
          }}
        >
          🏆 Knockout Bracket Results ({bracketMatches.filter(m => m.status?.includes("FINAL")).length}/31)
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Fetching official matches data window...</div>
      ) : currentDisplayMatches.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#f9fafb", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
          <p style={{ color: "#6b7280", fontWeight: 600 }}>No match records found for this tournament phase yet.</p>
        </div>
      ) : (
        /* STICKY TRACKING OVERFLOW WRAPPER */
        <div style={{
          overflow: "auto",
          maxHeight: "calc(100vh - 240px)",
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          WebkitOverflowScrolling: "touch",
          background: "white"
        }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                {/* STICKY LEFT CORNER HEADER PIN */}
                <th style={{
                  position: "sticky", top: 0, left: 0, zIndex: 10,
                  backgroundColor: NAVY, color: "white",
                  borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}`,
                  whiteSpace: "nowrap", textTransform: "uppercase",
                  fontSize: 11, letterSpacing: "0.5px", padding: "12px 10px",
                  minWidth: isMobile ? "80px" : "160px", textAlign: "left"
                }}>
                  {activeSection === "group" ? "Matchup Node" : "Tournament Phase"}
                </th>
                <th style={thStyle}>Official Status</th>
                <th style={thStyle}>Score Summary</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Points Val</th>
              </tr>
            </thead>
            <tbody>
              {currentDisplayMatches.map((m, i) => {
                const isFinal = m.status?.includes("FINAL");
                const isLive = m.status?.includes("PROGRESS") || m.status?.includes("HALF");
                const statusBadgeBg = isFinal ? "#166534" : isLive ? "#1e40af" : "#475569";

                return (
                  <tr key={m.match_id || i} style={{ backgroundColor: isFinal ? "#f9fafb" : "white" }}>

                    {/* STICKY LEFT COLUMN CELL */}
                    <td style={{
                      position: "sticky", left: 0, zIndex: 2,
                      backgroundColor: isFinal ? "#f1f5f9" : "#f8fafc",
                      borderRight: `2px solid ${GOLD}`, borderBottom: "1px solid #e5e7eb",
                      padding: "12px 10px", whiteSpace: "nowrap"
                    }}>
                      {activeSection === "group" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "11px" }}>
                          <img src={m.away_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                          {!isMobile && <span>{m.away_team}</span>}
                          <span style={{ color: "#9ca3af", fontWeight: 400 }}>@</span>
                          <img src={m.home_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                          {!isMobile && <span>{m.home_team}</span>}
                          {m.group && (
                            <span style={{ fontSize: 10, color: "#475569", backgroundColor: "#e2e8f0", padding: "1px 5px", borderRadius: 4, marginLeft: 4 }}>
                              {m.group}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontWeight: 700, color: WORLDCUPGREEN, fontSize: "11px" }}>
                          {ROUND_LABELS[m.round]} <span style={{ color: "#64748b", fontWeight: 500 }}>(Slot {m.bracket_slot})</span>
                        </div>
                      )}
                    </td>

                    {/* Live Match State Badge */}
                    <td style={tdStyle}>
                      <span style={{
                        padding: "3px 8px", borderRadius: "10px", color: "white",
                        fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                        backgroundColor: statusBadgeBg, display: "inline-block"
                      }}>
                        {isFinal ? "Final" : isLive ? "Live" : "Scheduled"}
                      </span>
                    </td>

                    {/* Official Game Score Core Row */}
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 800, fontSize: "14px", color: "#1e293b" }}>
                      {m.status === "STATUS_SCHEDULED" ? (
                        <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400, fontFamily: "sans-serif" }}>
                          {new Date(m.match_date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : activeSection === "bracket" && (!m.home_team || !m.away_team) ? (
                        <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 400, fontFamily: "sans-serif" }}>TBD Roadmap</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <span style={{ opacity: m.result === "Away" ? 1 : 0.6 }}>{m.away_score}</span>
                          <span style={{ color: "#cbd5e1", fontWeight: 400 }}>-</span>
                          <span style={{ opacity: m.result === "Home" ? 1 : 0.6 }}>{m.home_score}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: activeSection === "group" ? NAVY : GOLD }}>
                      {parseInt(m.round) === 0 ? (
                        <span>
                          {m.points_value} / {m.draw_points_value || 2} <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280" }}>pts</span>
                        </span>
                      ) : (
                        // ✨ FIXED: Wrote plain inline text spans to keep HTML tag nesting valid
                        <span>
                          {m.points_value} <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>pts</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )
      }
    </div >
  );
}

/* ---------------- UPGRADED THEME STYLES ---------------- */
const thStyle = {
  position: "sticky", top: 0, zIndex: 8,
  backgroundColor: NAVY, color: "white",
  borderBottom: `2px solid ${GOLD}`, padding: "12px 10px",
  whiteSpace: "nowrap", fontSize: 11,
  textTransform: "uppercase", letterSpacing: "0.5px",
  textAlign: "center"
};

const tdStyle = {
  padding: "12px 10px",
  verticalAlign: "middle",
  textAlign: "center",
  borderBottom: "1px solid #f3f4f6",
  borderRight: "1px solid #f3f4f6",
  whiteSpace: "nowrap"
};