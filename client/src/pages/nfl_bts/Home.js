import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const WHITE = "#FFFFFF";

export default function FootballHome() {
  const { user, loading: authLoading, token } = useAuth();
  const [poolData, setPoolData] = useState(null);
  const [userEntries, setUserEntries] = useState([]);
  const [confirmLeaveRoom, setConfirmLeaveRoom] = useState(null);
  const [customEntryNames, setCustomEntryNames] = useState({ 1: "", 2: "", 3: "" });

  const loadData = () => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const NflBtsPool = res.data.find(p => p.game_key === "nfl_bts");
        setPoolData(NflBtsPool);
      })
      .catch(err => console.error("Failed to load NFL Beat The Spread pool data", err));

    if (token || localStorage.getItem("token")) {
      axios.get("/api/nfl_bts/entries/me", {
        headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` }
      })
        .then(res => {
          setUserEntries(res.data.entries || []);
        })
        .catch(err => console.error("Failed to fetch user entries", err));
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const isPoolStarted = useMemo(() => {
    if (!poolData?.lock_date) return false;
    return new Date() >= new Date(poolData.lock_date);
  }, [poolData]);

  const handleJoinPool = async (roomId, creditAmount) => {
    try {
      const entryNameInput = customEntryNames[roomId]?.trim() || user?.name;
      await axios.post("/api/nfl_bts/entries/create", {
        room_id: roomId,
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` }
      });
      toast.success(`Successfully joined Room ${roomId} (${creditAmount}-credit pool)!`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to join pool");
    }
  };

  const handleLeavePool = async (roomId) => {
    try {
      await axios.post("/api/nfl_bts/entries/leave", { room_id: roomId }, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` }
      });
      toast.success(`Successfully left Room ${roomId}.`);
      setConfirmLeaveRoom(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to leave pool");
    }
  };

  if (authLoading) return null;

  const entryRoom1 = userEntries.find(e => Number(e.room_id) === 1);
  const entryRoom2 = userEntries.find(e => Number(e.room_id) === 2);
  const entryRoom3 = userEntries.find(e => Number(e.room_id) === 3);
  const hasAnyEntry = userEntries.length > 0;

  return (
    <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} className='page-content'>
      <Toaster />

      {poolData && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}

      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>
        
        {/* Split Rooms / Join & Leave Pool Options Section */}
        <div style={{
          background: WHITE,
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginBottom: 24,
          borderTop: `4px solid ${NFL_BLUE}`,
          maxWidth: "950px",
          margin: "0 auto 24px auto"
        }}>
          <h3 style={{ color: NFL_BLUE, marginTop: 0, marginBottom: 16, fontSize: "1.2rem" }}>
            🏟️ Pool Rooms Selection
          </h3>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
            
            {/* Room 1 (50 Credits) */}
            <div style={{ flex: "1 1 260px", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px", background: "#f8fafc", textAlign: "left" }}>
              <h4 style={{ margin: "0 0 8px 0", color: NFL_BLUE, textAlign: "center" }}>Room 1: 50 Credit Pool</h4>
              {entryRoom1 ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: "#16a34a", fontWeight: "bold" }}>✓ You are in Room 1</p>
                  <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 12px 0" }}>Display Name: <strong>{entryRoom1.entry_name}</strong></p>
                  {!isPoolStarted && (
                    <div>
                      {confirmLeaveRoom === 1 ? (
                        <div style={{ marginTop: 12, background: "#fee2e2", padding: 10, borderRadius: 8, textAlign: "center" }}>
                          <p style={{ fontSize: "13px", margin: "0 0 8px 0", color: "#b91c1c", fontWeight: "bold" }}>Are you sure you want to leave?</p>
                          <button onClick={() => handleLeavePool(1)} style={{ background: NFL_RED, color: WHITE, border: "none", padding: "6px 12px", borderRadius: 6, marginRight: 8, cursor: "pointer", fontWeight: "bold" }}>Yes, Leave</button>
                          <button onClick={() => setConfirmLeaveRoom(null)} style={{ background: "#cbd5e1", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmLeaveRoom(1)} style={{ background: "transparent", color: NFL_RED, border: `1px solid ${NFL_RED}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "block", margin: "0 auto" }}>
                          Leave Pool
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center", marginBottom: 12 }}>Standard entry level competition.</p>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: NFL_BLUE }}>Entry / Display Name:</label>
                      {user?.name && (
                        <button
                          type="button"
                          onClick={() => setCustomEntryNames({ ...customEntryNames, 1: user.name })}
                          style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", padding: 0, fontWeight: 600 }}
                        >
                          Use Username ({user.name})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customEntryNames[1] !== undefined ? customEntryNames[1] : ""}
                      onChange={(e) => setCustomEntryNames({ ...customEntryNames, 1: e.target.value })}
                      placeholder={user?.name || "Enter display name"}
                      style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                  </div>
                  <button onClick={() => handleJoinPool(1, 50)} className="btn-fb-secondary" style={{ width: "100%", padding: "10px 20px", fontSize: "14px" }}>
                    Join 50 Credit Pool
                  </button>
                </div>
              )}
            </div>

            {/* Room 2 (100 Credits A) */}
            <div style={{ flex: "1 1 260px", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px", background: "#f8fafc", textAlign: "left" }}>
              <h4 style={{ margin: "0 0 8px 0", color: NFL_BLUE, textAlign: "center" }}>Room 2: 100 Credit Pool A</h4>
              {entryRoom2 ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: "#16a34a", fontWeight: "bold" }}>✓ You are in Room 2</p>
                  <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 12px 0" }}>Display Name: <strong>{entryRoom2.entry_name}</strong></p>
                  {!isPoolStarted && (
                    <div>
                      {confirmLeaveRoom === 2 ? (
                        <div style={{ marginTop: 12, background: "#fee2e2", padding: 10, borderRadius: 8, textAlign: "center" }}>
                          <p style={{ fontSize: "13px", margin: "0 0 8px 0", color: "#b91c1c", fontWeight: "bold" }}>Are you sure you want to leave?</p>
                          <button onClick={() => handleLeavePool(2)} style={{ background: NFL_RED, color: WHITE, border: "none", padding: "6px 12px", borderRadius: 6, marginRight: 8, cursor: "pointer", fontWeight: "bold" }}>Yes, Leave</button>
                          <button onClick={() => setConfirmLeaveRoom(null)} style={{ background: "#cbd5e1", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmLeaveRoom(2)} style={{ background: "transparent", color: NFL_RED, border: `1px solid ${NFL_RED}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "block", margin: "0 auto" }}>
                          Leave Pool
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center", marginBottom: 12 }}>High roller stake competition.</p>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: NFL_BLUE }}>Entry / Display Name:</label>
                      {user?.name && (
                        <button
                          type="button"
                          onClick={() => setCustomEntryNames({ ...customEntryNames, 2: user.name })}
                          style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", padding: 0, fontWeight: 600 }}
                        >
                          Use Username ({user.name})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customEntryNames[2] !== undefined ? customEntryNames[2] : ""}
                      onChange={(e) => setCustomEntryNames({ ...customEntryNames, 2: e.target.value })}
                      placeholder={user?.name || "Enter display name"}
                      style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                  </div>
                  <button onClick={() => handleJoinPool(2, 100)} className="btn-fb-secondary" style={{ width: "100%", padding: "10px 20px", fontSize: "14px" }}>
                    Join 100-Credit Pool A
                  </button>
                </div>
              )}
            </div>

            {/* Room 3 (100 Credits B) */}
            <div style={{ flex: "1 1 260px", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px", background: "#f8fafc", textAlign: "left" }}>
              <h4 style={{ margin: "0 0 8px 0", color: NFL_BLUE, textAlign: "center" }}>Room 3: 100 Credit Pool B</h4>
              {entryRoom3 ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: "#16a34a", fontWeight: "bold" }}>✓ You are in Room 3</p>
                  <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 12px 0" }}>Display Name: <strong>{entryRoom3.entry_name}</strong></p>
                  {!isPoolStarted && (
                    <div>
                      {confirmLeaveRoom === 3 ? (
                        <div style={{ marginTop: 12, background: "#fee2e2", padding: 10, borderRadius: 8, textAlign: "center" }}>
                          <p style={{ fontSize: "13px", margin: "0 0 8px 0", color: "#b91c1c", fontWeight: "bold" }}>Are you sure you want to leave?</p>
                          <button onClick={() => handleLeavePool(3)} style={{ background: NFL_RED, color: WHITE, border: "none", padding: "6px 12px", borderRadius: 6, marginRight: 8, cursor: "pointer", fontWeight: "bold" }}>Yes, Leave</button>
                          <button onClick={() => setConfirmLeaveRoom(null)} style={{ background: "#cbd5e1", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmLeaveRoom(3)} style={{ background: "transparent", color: NFL_RED, border: `1px solid ${NFL_RED}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "block", margin: "0 auto" }}>
                          Leave Pool
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center", marginBottom: 12 }}>Second high roller stake room.</p>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: NFL_BLUE }}>Entry / Display Name:</label>
                      {user?.name && (
                        <button
                          type="button"
                          onClick={() => setCustomEntryNames({ ...customEntryNames, 3: user.name })}
                          style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", padding: 0, fontWeight: 600 }}
                        >
                          Use Username ({user.name})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customEntryNames[3] !== undefined ? customEntryNames[3] : ""}
                      onChange={(e) => setCustomEntryNames({ ...customEntryNames, 3: e.target.value })}
                      placeholder={user?.name || "Enter display name"}
                      style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                  </div>
                  <button onClick={() => handleJoinPool(3, 100)} className="btn-fb-secondary" style={{ width: "100%", padding: "10px 20px", fontSize: "14px" }}>
                    Join 100-Credit Pool B
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {hasAnyEntry && (
          <PoolGatekeeper user={user} isAdmin={user?.is_admin === true} gameKey="nfl_bts">
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: 20 }}>
              <Link to="/nflbts/picks" style={{ textDecoration: 'none' }}>
                <button className="btn-fb-secondary">🏈 Make Weekly Picks</button>
              </Link>
              <Link to="/nflbts/grouppicks" style={{ textDecoration: 'none' }}>
                <button className="btn-fb-secondary">📊 Weekly Matrix</button>
              </Link>
              <Link to="/nflbts/standings" style={{ textDecoration: 'none' }}>
                <button className="btn-fb-secondary">🏆 Division Standings</button>
              </Link>
            </div>

            <a href="https://www.nfl.com/scores"
              target="_blank"
              rel="noreferrer"
              className="btn-fb-live"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: NFL_BLUE,
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                textDecoration: "none"
              }}>
              Live NFL Scores ↗
            </a>
          </PoolGatekeeper>
        )}

        <div style={{
          background: "white",
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginTop: 24,
          marginBottom: 80,
          borderTop: `4px solid ${NFL_RED}`,
          textAlign: "left",
          maxWidth: "850px",
          margin: "24px auto 80px auto"
        }}>
          <h3 style={{ color: NFL_BLUE, marginTop: 0, marginBottom: 16, fontSize: "1.2rem", textAlign: 'center' }}>
            📋 Beat The Spread: <br />Assigned Team
          </h3>
          <ol style={{ paddingLeft: 20, lineHeight: "1.7", fontSize: "14px" }}>
            <li><strong>Assigned Team:</strong> You are randomly assigned one NFL team for the entire season once the 32-player room fills up.</li>
            <li><strong>Weekly Commitment:</strong> Every week, you must pick your assigned team's game Against The Spread (ATS) and make an Over/Under guess (used for tiebreakers).</li>
            <li><strong>The Hook Rule:</strong> Whole number spreads are adjusted up or down based on their juice. -110 and lower moves down (ex. -3 to -2.5), while anything above -110 moves up (ex. -3 to -3.5)</li>
            <li><strong>Divisions:</strong> Compete directly within your assigned NFL division based on ATS record (W-L).</li>
            <li><strong>Privacy:</strong> Group picks on the matrix remain hidden until that specific team's game kicks off.</li>
          </ol>
        </div>
      </div>

      <style>{`
        .btn-fb-secondary {
            padding: 14px 28px;
            background-color: transparent;
            color: ${NFL_BLUE};
            border: 2px solid ${NFL_BLUE};
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: background-color 0.2s, color 0.2s;
        }
        .btn-fb-secondary:hover { background-color: ${NFL_BLUE}; color: white; }
        
        @media (max-width: 576px) {
            .btn-fb-secondary, .btn-fb-live {
                width: 100% !important;
                text-align: center;
                padding: 12px 16px !important;
            }
        }
      `}</style>
    </div>
  );
}