import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function Picks() {
  const { user: user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState([]);
  const [userPicks, setUserPicks] = useState({});
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  // Sorting Control Hook State: 'date' | 'group' | 'home' | 'away'
  const [sortBy, setSortBy] = useState("date");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  /* ---------------- DETECT MOBILE SCREEN VIEWPORTS ---------------- */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user || authLoading || hasFetched.current) return;

    async function fetchMatchData() {
      setLoading(true);
      try {
        const res = await axios.get("/api/worldcup/matches");
        const groupStageMatches = res.data.filter(
          m => m.round_label === "Group Stage" || parseInt(m.round) === 0
        );
        setMatches(groupStageMatches);

        const picksRes = await axios.get(`/api/worldcup/picks?user_id=${user.id}`);
        const existingPicks = picksRes.data.reduce((acc, pick) => {
          acc[pick.match_id] = pick.selection;
          return acc;
        }, {});
        setUserPicks(existingPicks);

        hasFetched.current = true;
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load matches");
      } finally {
        setLoading(false);
      }
    }

    fetchMatchData();
  }, [user, authLoading]);

  const handlePickSelection = (matchId, selection) => {
    setUserPicks((prev) => ({
      ...prev,
      [matchId]: selection,
    }));
  };

  const handleSubmit = async () => {
    const payload = {
      user_id: user.id,
      picks: Object.entries(userPicks).map(([matchId, selection]) => ({
        match_id: matchId,
        selection,
      })),
    };

    try {
      await axios.post("/api/worldcup/picks", payload);
      toast.success("Group stage picks saved!");
    } catch (err) {
      toast.error("Failed to save picks.");
    }
  };

  const formatMatchTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /* ---------------- DYNAMIC SORTING & GROUPING LOGIC ---------------- */
  const arrangedGroups = useMemo(() => {
    const sorted = [...matches];

    if (sortBy === "date") {
      sorted.sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
    } else if (sortBy === "group") {
      sorted.sort((a, b) => {
        const grpA = a.group || "Z";
        const grpB = b.group || "Z";
        if (grpA !== grpB) return grpA.localeCompare(grpB);
        return new Date(a.game_date) - new Date(b.game_date);
      });
    } else if (sortBy === "home") {
      sorted.sort((a, b) => a.home_team.localeCompare(b.home_team));
    } else if (sortBy === "away") {
      sorted.sort((a, b) => a.away_team.localeCompare(b.away_team));
    }

    const groups = {};
    sorted.forEach((match) => {
      let key = "";
      if (sortBy === "date") {
        key = `📅 ${new Date(match.game_date).toLocaleDateString(undefined, {
          weekday: "long", month: "short", day: "numeric"
        })}`;
      } else if (sortBy === "group") {
        key = match.group ? `🏆 Group ${match.group.toUpperCase()}` : "🏆 Group Stage";
      } else {
        key = "🔤 Alphabetical Matchups List";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(match);
    });

    return Object.entries(groups);
  }, [matches, sortBy]);

  if (authLoading) return <div style={{ paddingTop: 100, textAlign: "center" }}>Verifying session…</div>;
  if (!user) return <div style={{ paddingTop: 100, textAlign: "center" }}><h3>Please log in to make picks.</h3></div>;

  return (
    <div  style={{ maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px" }}>
      <Toaster position="top-center" />

      {/* Hero Display Panel */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h2 style={{ color: NAVY, margin: 0, fontWeight: 800 }}>⚽ World Cup Pick'em</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
          Winner = 1pt | Draw = 2pts. Fill your picks for every Group Stage match.
          <br />Matches lock at scheduled kickoff time.
        </p>
      </div>

      {/* Sorting Navigation Toolbar */}
      <div style={{
        display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap",
        backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "8px",
        border: "1px solid #e2e8f0", marginBottom: "28px"
      }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sort Schedule:</span>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "date", label: "🗓️ Date" },
            { id: "group", label: "🏆 Group" },
            { id: "home", label: "🏠 Home Team" },
            { id: "away", label: "✈️ Away Team" }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                borderRadius: "6px", border: "1px solid", cursor: "pointer",
                backgroundColor: sortBy === opt.id ? NAVY : "white",
                color: sortBy === opt.id ? "white" : "#475569",
                borderColor: sortBy === opt.id ? NAVY : "#d1d5db",
                transition: "all 0.1s ease-in-out"
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40 }}>Loading schedule workspace...</p>
      ) : (
        arrangedGroups.map(([groupName, groupMatches]) => (
          <div key={groupName} style={{ marginBottom: "36px" }}>
            <h3 style={{ borderBottom: `2px solid ${GOLD}`, color: NAVY, paddingBottom: "6px", marginBottom: "18px", fontSize: "16px", fontWeight: 700 }}>
              {groupName}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {groupMatches.map((match) => (
                <div key={match.match_id} className="match-card" style={cardStyle}>

                  {/* Top Header Row Inside Cards */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700" }}>
                      {formatMatchTime(match.game_date)}
                    </div>
                    {match.group && (
                      <span style={{ fontSize: "10px", backgroundColor: "#e2e8f0", color: "#334155", padding: "2px 6px", borderRadius: "4px", fontWeight: 800, textTransform: "uppercase" }}>
                        {match.group}
                      </span>
                    )}
                  </div>

                  {/* Main Predictor Action Row */}
                  <div className="match-row" style={matchRowStyle}>
                    {/* Home Team */}
                    <div
                      className="team-container"
                      style={teamContainerStyle(userPicks[match.match_id] === "Home")}
                      onClick={() => handlePickSelection(match.match_id, "Home")}
                    >
                      <img src={match.home_logo} alt="" className="team-logo" style={logoStyle} />
                      <span className="team-name" style={teamNameStyle}>{match.home_team}</span>
                    </div>

                    {/* Draw */}
                    <div
                      className="draw-container"
                      style={drawContainerStyle(userPicks[match.match_id] === "Draw")}
                      onClick={() => handlePickSelection(match.match_id, "Draw")}
                    >
                      <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 700 }}>DRAW</div>
                      <div style={{ fontWeight: '800', fontSize: '13px', marginTop: '2px' }}>2pts</div>
                    </div>

                    {/* Away Team */}
                    <div
                      className="team-container"
                      style={teamContainerStyle(userPicks[match.match_id] === "Away")}
                      onClick={() => handlePickSelection(match.match_id, "Away")}
                    >
                      <img src={match.away_logo} alt="" className="team-logo" style={logoStyle} />
                      <span className="team-name" style={teamNameStyle}>{match.away_team}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* 🛠️ FIXED: Floating Save Anchor Footer uses explicit viewport offset bounds */}
      <div style={{
        marginTop: "40px",
        textAlign: "center",
        position: "sticky",
        bottom: isMobile ? "76px" : "20px", // Pushes button above the 56px navbar + 20px padding buffer
        zIndex: 90 // Float cleanly over the inner layout blocks
      }}>
        <button onClick={handleSubmit} style={submitButtonStyle}>
          💾 Save Picks
        </button>
      </div>

      <style>{`
        @media (max-width: 600px) {
            .match-row {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 6px !important;
            }
            .team-container {
                padding: 10px 4px !important;
                flex: 1 !important;
                min-width: 0 !important;
            }
            .draw-container {
                padding: 8px 10px !important;
                flex: 0 0 auto !important;
                min-width: 58px !important;
            }
            .team-name {
                font-size: 11px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                margin-top: 2px !important;
            }
            .team-logo {
                width: 22px !important;
                height: 22px !important;
                margin-bottom: 2px !important;
            }
        }
      `}</style>
    </div>
  );
}

// ── Shared Design Tokens ──────────────────────────────────────────────────

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "14px 16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  border: "1px solid #eef2f6"
};

const matchRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 80px 1fr",
  gap: "12px",
  alignItems: "stretch",
};

const logoStyle = {
  width: "32px",
  height: "32px",
  objectFit: "contain",
  marginBottom: "4px"
};

const teamContainerStyle = (isSelected) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px",
  borderRadius: "10px",
  border: `2px solid ${isSelected ? "#16a34a" : "#f1f5f9"}`,
  backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.12s ease-in-out",
  flex: 1
});

const drawContainerStyle = (isSelected) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px",
  borderRadius: "10px",
  border: `2px solid ${isSelected ? GOLD : "#f1f5f9"}`,
  backgroundColor: isSelected ? "#fffbeb" : "#f8fafc",
  textAlign: "center",
  cursor: "pointer",
  color: isSelected ? "#b45309" : "#64748b",
  transition: "all 0.12s ease-in-out"
});

const teamNameStyle = {
  fontWeight: "700",
  fontSize: "13px",
  color: NAVY,
  marginTop: "4px"
};

const submitButtonStyle = {
  padding: "14px 50px",
  borderRadius: "50px",
  border: "none",
  color: "white",
  fontWeight: "800",
  backgroundColor: "#16a34a",
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(22, 163, 74, 0.25)",
};