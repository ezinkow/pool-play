import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import Instructions from "./Instructions";
import NbaGatekeeper from "./NbaGatekeeper";

const GOLD = "#c89d3c";
const NAVY = "#13447a";
const LENGTHS = [4, 5, 6, 7];

const thStyle = { padding: "12px 15px", textAlign: "left", fontSize: 13, fontWeight: 600 };
const tdStyle = { padding: "12px 15px" };
const cardStyle = { background: "white", padding: 16, borderRadius: 10, marginBottom: 12, boxShadow: "0 2px 5px rgba(0,0,0,0.05)" };
const mobileBtnStyle = (active) => ({ flex: 1, padding: 10, borderRadius: 8, border: active ? `2px solid ${NAVY}` : "1px solid #ddd", background: active ? "#eff6ff" : "white", cursor: "pointer" });
const lenBtnStyle = (active) => ({ width: 30, height: 30, borderRadius: 4, background: active ? NAVY : "white", color: active ? "white" : "#333", border: "1px solid #ddd", cursor: "pointer" });

const formatDateTime = (iso) => {
  if (!iso) return "TBD";
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function Picks() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [series, setSeries] = useState([]);
  const [picks, setPicks] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tiebreakerWin, setTiebreakerWin] = useState("");
  const [tiebreakerLoss, setTiebreakerLoss] = useState("");

  useEffect(() => {
    axios.get("/api/nba/series")
      .then(res => setSeries(res.data || []))
      .catch(err => toast.error("Error loading series"));
  }, []);

  useEffect(() => {
    if (authUser && series.length > 0) {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      axios.get("/api/nba/picks", { params: { name: authUser.name }, ...config })
        .then(res => {
          if (res.data && Array.isArray(res.data)) {
            const mappedPicks = res.data.map(p => ({
              series: String(p.series_id),
              pick: p.pick,
              confidence: parseInt(p.confidence) || 0,
              length: parseInt(p.series_length_guess) || 4
            }));
            setPicks(mappedPicks);
          }
          setDataLoaded(true);
        })
        .catch(() => setDataLoaded(true));

      axios.get("/api/nba/tiebreaker", { params: { name: authUser.name }, ...config })
        .then(res => {
          if (res.data) {
            setTiebreakerWin(res.data.win_score || "");
            setTiebreakerLoss(res.data.loss_score || "");
          }
        }).catch(() => { });
    }
  }, [authUser, series]);

  // --- LOGIC HOOKS ---

  // 1. Determine which round is currently accepting picks
  const activeRound = useMemo(() => {
    if (!series.length) return 1;
    const now = new Date();
    const unstarted = series.filter(g => new Date(g.game_date) > now);

    if (unstarted.length > 0) {
      return Math.min(...unstarted.map(g => g.round));
    }
    // Fallback if all rounds currently in DB have started
    return Math.max(...series.map(g => g.round)) + 1;
  }, [series]);

  // 2. Filter games to only show the unstarted games for the active round
  const visibleGames = useMemo(() => {
    if (!series.length) return [];
    const now = new Date();
    return series
      .filter(g => g.round === activeRound && new Date(g.game_date) > now)
      .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
  }, [series, activeRound]);

  // 3. Set the point ceiling (32, 24, 16, 8)
  const roundMax = useMemo(() => {
    const roundMapping = { 1: 32, 2: 24, 3: 16, 4: 8 };
    if (visibleGames.length > 0 && visibleGames[0].round_points_max) {
      return Number(visibleGames[0].round_points_max);
    }
    return roundMapping[activeRound] || 32;
  }, [visibleGames, activeRound]);

  // 4. Calculate points used ONLY for the games visible on the current screen
  const currentPointsUsed = useMemo(() => {
    if (visibleGames.length === 0) return 0;
    const visibleIds = visibleGames.map(vg => String(vg.id));

    return picks
      .filter(p => visibleIds.includes(String(p.series)))
      .reduce((sum, p) => sum + (parseInt(p.confidence) || 0), 0);
  }, [picks, visibleGames]);

  // --- ACTIONS ---

  const updatePickData = (gameId, field, value) => {
    const sId = String(gameId);
    setPicks(prev => {
      const existing = prev.find(p => p.series === sId);
      if (existing) {
        if (field === 'pick' && existing.pick === value) return prev.filter(p => p.series !== sId);
        return prev.map(p => p.series === sId ? { ...p, [field]: value } : p);
      }
      return [...prev, {
        series: sId,
        pick: field === 'pick' ? value : null,
        confidence: field === 'confidence' ? value : 0,
        length: field === 'length' ? value : 4
      }];
    });
  };

  const handleSubmitPicks = async () => {
    if (picks.length === 0) return toast.error("No picks selected");
    if (currentPointsUsed > roundMax) return toast.error(`Over the ${roundMax} point limit!`);

    const token = localStorage.getItem("token");
    try {
      await axios.post("/api/nba/picks/bulk", {
        name: authUser.name,
        picks: picks.map(p => ({
          series_id: p.series,
          pick: p.pick,
          confidence: p.confidence,
          series_length_guess: p.length
        }))
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Picks submitted!");
      setTimeout(() => { window.location.hash = "#/nba/mypicks"; }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save picks");
    }
  };

  if (authLoading) return <div style={{ paddingTop: 100, textAlign: "center" }}>Verifying Session...</div>;
  if (!authUser) return <div style={{ paddingTop: 100, textAlign: "center" }}>Please log in to make picks.</div>;
  if (!dataLoaded && series.length > 0) return <div style={{ paddingTop: 100, textAlign: "center" }}>Loading your saved picks...</div>;

  return (
    <NbaGatekeeper user={authUser}>
      <div style={{ paddingTop: 68, paddingBottom: 80, maxWidth: 1200, margin: "0 auto", paddingLeft: 12, paddingRight: 12 }}>
        <Toaster />
        <Instructions />

        <div style={{ position: "sticky", top: 70, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "#fff", padding: "15px", borderRadius: "10px", border: `2px solid ${GOLD}`, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <div>
            <h4 style={{ margin: 0 }}>
              {authUser.name} - {visibleGames[0]?.round_label || `Round ${activeRound} Selections`}
            </h4>
            <div style={{ fontSize: "14px", marginTop: "4px" }}>
              Points: <span style={{ fontWeight: 700, color: currentPointsUsed > roundMax ? "red" : "#16a34a" }}>{currentPointsUsed}</span> / {roundMax}
            </div>
          </div>
          <button onClick={handleSubmitPicks} style={{ padding: "12px 28px", borderRadius: 8, backgroundColor: "#16a34a", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}>Submit All Picks</button>
        </div>

        {visibleGames.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 12 }}>
            <h5 style={{ color: NAVY }}>No active matchups for selection.</h5>
            <p style={{ color: "#64748b", fontSize: 13 }}>Check back once the next round matchups are set!</p>
          </div>
        ) : (
          <>
            <div className="desktop-only" style={{ background: "white", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: NAVY, color: "white" }}>
                  <tr>
                    <th style={thStyle}>Matchup</th>
                    <th style={thStyle}>Winner</th>
                    <th style={thStyle}>Series Length</th>
                    <th style={thStyle}>Confidence (1-10)</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGames.map(s => {
                    const currentPick = picks.find(p => p.series === String(s.id));
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginBottom: 2 }}>
                            Game 1 tip-off: {formatDateTime(s.game_date)} CT
                          </div>
                          <div style={{ fontWeight: 500 }}>
                            {s.away_seed && <sup style={{ fontSize: 8, color: "#9ca3af", marginRight: 1 }}>{s.away_seed}</sup>}
                            {s.away_team} @ {s.home_team}
                            {s.home_seed && <sup style={{ fontSize: 8, color: "#9ca3af", marginLeft: 1 }}>{s.home_seed}</sup>}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 8 }}>
                            {[s.away_team, s.home_team].map(team => (
                              <button
                                key={team}
                                onClick={() => updatePickData(s.id, 'pick', team)}
                                style={{
                                  padding: "6px 12px", borderRadius: 6, border: currentPick?.pick === team ? `2px solid ${NAVY}` : "1px solid #ddd",
                                  backgroundColor: currentPick?.pick === team ? "#eff6ff" : "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                                }}
                              >
                                <img src={team === s.home_team ? s.home_logo : s.away_logo} width={20} alt="" />
                                <span style={{ fontSize: 12 }}>{team}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {LENGTHS.map(len => (
                              <button
                                key={len}
                                onClick={() => updatePickData(s.id, 'length', len)}
                                style={{
                                  width: 32, height: 32, borderRadius: 6, border: "1px solid #ddd",
                                  backgroundColor: currentPick?.length === len ? NAVY : "white",
                                  color: currentPick?.length === len ? "white" : "#333", cursor: "pointer"
                                }}
                              >
                                {len}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={currentPick?.confidence || ""}
                            onChange={(e) => updatePickData(s.id, 'confidence', parseInt(e.target.value))}
                            style={{ padding: "8px", borderRadius: 6, border: "1px solid #ddd", width: "100%" }}
                          >
                            <option value="" disabled>Pts</option>
                            {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-only">
              {visibleGames.map(s => {
                const currentPick = picks.find(p => p.series === String(s.id));
                return (
                  <div key={s.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>
                        {s.away_team} vs {s.home_team}
                      </div>
                      <div style={{ fontSize: 10, color: "#d97706", fontWeight: 700 }}>
                        {formatDateTime(s.game_date)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <button onClick={() => updatePickData(s.id, 'pick', s.away_team)} style={mobileBtnStyle(currentPick?.pick === s.away_team)}>
                        <img src={s.away_logo} width={24} height={24} alt="" /> {s.away_team}
                      </button>
                      <button onClick={() => updatePickData(s.id, 'pick', s.home_team)} style={mobileBtnStyle(currentPick?.pick === s.home_team)}>
                        <img src={s.home_logo} width={24} height={24} alt="" /> {s.home_team}
                      </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <select value={currentPick?.confidence || ""} onChange={(e) => updatePickData(s.id, 'confidence', parseInt(e.target.value))} style={{ padding: 8, borderRadius: 6 }}>
                        <option value="" disabled>Confidence</option>
                        {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                      </select>
                      <div style={{ display: "flex", gap: 4 }}>
                        {LENGTHS.map(len => (
                          <button key={len} onClick={() => updatePickData(s.id, 'length', len)} style={lenBtnStyle(currentPick?.length === len)}>{len}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <style>{`
          .desktop-only { display: block; }
          .mobile-only { display: none; }
          @media (max-width: 768px) {
            .desktop-only { display: none; }
            .mobile-only { display: block; }
          }
        `}</style>
      </div>
    </NbaGatekeeper>
  );
}