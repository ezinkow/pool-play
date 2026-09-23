import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay";

const CFB_BLUE = "#013369";
const GOLD = "#c89d3c";
const BROWN = "#92400e";
const WHITE = "#FFFFFF";

export default function CfbBowlConfidenceHome() {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const [poolData, setPoolData] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const activeToken = token || localStorage.getItem("token");

  const loadData = () => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const bowlPool = res.data.find(p => p.game_key === "cfb_bowl_pickem");
        if (bowlPool) {
          setPoolData({
            ...bowlPool,
            games_api_path: bowlPool.games_api_path || "/api/cfb_bowl_pickem/games"
          });
        }
      })
      .catch(err => console.error("Failed to load pool data", err));

    if (activeToken) {
      axios.get("/api/cfb_bowl_pickem/entries/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          setUserEntry(res.data.entry || null);
          if (res.data.entry?.entry_name) {
            setCustomEntryName(res.data.entry.entry_name);
          }
        })
        .catch(err => {
          console.error("Failed to fetch bowl entry", err);
          if (err.response?.status === 401) {
            toast.error("Session expired. Please log in again.");
          }
        });
    }
  };

  useEffect(() => {
    loadData();
  }, [activeToken]);

  const isPoolStarted = useMemo(() => {
    if (!poolData) return false;
    const dbActive = !!poolData.is_active;
    let isPastLockTime = false;
    if (poolData.lock_date) {
      let lockDateStr = poolData.lock_date;
      if (typeof lockDateStr === 'string' && !lockDateStr.endsWith('Z') && !lockDateStr.includes('+')) {
        lockDateStr = lockDateStr.replace(' ', 'T') + 'Z';
      }
      isPastLockTime = new Date() >= new Date(lockDateStr);
    }
    return !dbActive || isPastLockTime;
  }, [poolData]);

  const handleJoinPool = async () => {
    if (!activeToken) {
      toast.error("Please log in or create an account to join a pool.");
      navigate("/login");
      return;
    }

    if (isPoolStarted) {
      toast.error("Registration is closed. The bowl season has already started or locked.");
      return;
    }

    try {
      const entryNameInput = customEntryName.trim() || user?.name;
      const res = await axios.post("/api/cfb_bowl_pickem/entries/create", {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntry(res.data.entry);
      toast.success("Successfully joined College Bowl Confidence Pick'em!");
      loadData();
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(err.response?.data?.error || "Failed to join pool");
      }
    }
  };

  const handleLeavePool = async () => {
    if (!activeToken) {
      toast.error("Please log in first.");
      navigate("/login");
      return;
    }

    if (isPoolStarted) {
      toast.error("Cannot leave pool after registration has closed or games have started.");
      return;
    }

    try {
      await axios.post("/api/cfb_bowl_pickem/entries/leave", {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntry(null);
      setConfirmLeave(false);
      toast.success("Successfully left the pool.");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to leave pool");
    }
  };

  if (authLoading) return null;

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

        {!activeToken && (
          <div style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 16,
            padding: "20px 24px",
            marginBottom: 24,
            maxWidth: "650px",
            margin: "0 auto 24px auto",
            textAlign: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)"
          }}>
            <h4 style={{ color: BROWN, margin: "0 0 8px 0", fontSize: "1.1rem" }}>
              🔒 Account Required to Join Pool
            </h4>
            <p style={{ margin: "0 0 16px 0", color: "#78350f", fontSize: "14px", lineHeight: "1.5" }}>
              You must be logged in or create an account before you can select a display name and join this bowl confidence pool.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <button style={{ backgroundColor: CFB_BLUE, color: WHITE, border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
                  Log In
                </button>
              </Link>
              <Link to="/signup" style={{ textDecoration: "none" }}>
                <button style={{ backgroundColor: WHITE, color: CFB_BLUE, border: `2px solid ${CFB_BLUE}`, padding: "10px 20px", borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
                  Create Account
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Join & Leave Pool Section */}
        <div style={{
          background: WHITE,
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginBottom: 24,
          borderTop: `4px solid ${GOLD}`,
          maxWidth: "650px",
          margin: "0 auto 24px auto",
          textAlign: "left"
        }}>
          <h3 style={{ color: BROWN, marginTop: 0, marginBottom: 16, fontSize: "1.2rem", textAlign: "center" }}>
            🏆 College Bowl Confidence Pick'em
          </h3>

          {userEntry ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "15px", color: "#16a34a", fontWeight: "bold" }}>✓ You are officially registered for the Bowls!</p>
              <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 16px 0" }}>Display Name: <strong>{userEntry?.entry_name}</strong></p>

              {!isPoolStarted && (
                <div>
                  {confirmLeave ? (
                    <div style={{ marginTop: 12, background: "#fee2e2", padding: 10, borderRadius: 8, textAlign: "center" }}>
                      <p style={{ fontSize: "13px", margin: "0 0 8px 0", color: "#b91c1c", fontWeight: "bold" }}>Are you sure you want to leave?</p>
                      <button onClick={handleLeavePool} style={{ background: "#dc2626", color: WHITE, border: "none", padding: "6px 12px", borderRadius: 6, marginRight: 8, cursor: "pointer", fontWeight: "bold" }}>Yes, Leave</button>
                      <button onClick={() => setConfirmLeave(false)} style={{ background: "#cbd5e1", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmLeave(true)} style={{ background: "transparent", color: "#dc2626", border: "1px solid #dc2626", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "block", margin: "0 auto" }}>
                      Leave Pool
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : isPoolStarted ? (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <span style={{ fontSize: 32 }}>🔒</span>
              <p style={{ fontSize: "15px", color: "#b91c1c", fontWeight: "bold", marginTop: 8 }}>Registration is Closed</p>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>The bowl season has already started or locked. New entries are no longer accepted.</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center", marginBottom: 16 }}>Pick every college bowl game winner and rank them by confidence from highest points to lowest.</p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold", color: BROWN }}>Entry / Display Name:</label>
                  {user?.name && (
                    <button
                      type="button"
                      onClick={() => setCustomEntryName(user.name)}
                      style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", padding: 0, fontWeight: 600 }}
                    >
                      Use Username ({user.name})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={customEntryName}
                  onChange={(e) => setCustomEntryName(e.target.value)}
                  placeholder={user?.name || "Enter display name"}
                  style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                />
              </div>
              <button onClick={handleJoinPool} className="btn-bowl-secondary" style={{ width: "100%", padding: "12px 20px", fontSize: "14px" }}>
                Join Bowl Confidence Pool
              </button>
            </div>
          )}
        </div>

        {userEntry && (
          <PoolGatekeeper user={user} gameKey="cfb_bowl_pickem">
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: 20 }}>
              <Link to="/bowlpickem/picks" style={{ textDecoration: 'none' }}>
                <button className="btn-bowl-secondary">🏆 Rank Bowl Games</button>
              </Link>
              <Link to="/bowlpickem/mypicks" style={{ textDecoration: 'none' }}>
                <button className="btn-bowl-secondary">📋 My Rankings</button>
              </Link>
              <Link to="/bowlpickem/grouppicks" style={{ textDecoration: 'none' }}>
                <button className="btn-bowl-secondary">📊 Group Matrix</button>
              </Link>
              <Link to="/bowlpickem/standings" style={{ textDecoration: 'none' }}>
                <button className="btn-bowl-secondary">🏅 Leaderboard</button>
              </Link>
            </div>
          </PoolGatekeeper>
        )}

        {/* Rules Card */}
        <div style={{
          background: WHITE,
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginTop: 24,
          marginBottom: 80,
          borderTop: `4px solid ${BROWN}`,
          textAlign: "left",
          maxWidth: "850px",
          margin: "24px auto 80px auto"
        }}>
          <h3 style={{ color: BROWN, marginTop: 0, marginBottom: 16, fontSize: "1.2rem", textAlign: 'center' }}>
            📋 Bowl Confidence Pool: <br />Rules & Overview
          </h3>
          <ol style={{ paddingLeft: 20, lineHeight: "1.7", fontSize: "14px" }}>
            <li><strong>Winner & Confidence Ranking:</strong> Select the outright winner for every college bowl game matchup.</li>
            <li><strong>Confidence Points:</strong> Assign a unique point value to each game corresponding to your confidence level (e.g., max points for your absolute lock down to 1 point for the toss-up games).</li>
            <li><strong>Scoring:</strong> If your picked team wins, you earn the confidence points assigned to that game. If they lose, you score zero points for that matchup.</li>
            <li><strong>Lock Times:</strong> Individual bowl games lock automatically right at their scheduled kickoff time.</li>
            <li><strong>Privacy:</strong> Opponents' picks and rankings remain hidden on the matrix until each individual game kicks off.</li>
          </ol>
        </div>
      </div>

      <style>{`
        .btn-bowl-secondary {
            padding: 14px 28px;
            background-color: transparent;
            color: ${BROWN};
            border: 2px solid ${GOLD};
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: background-color 0.2s, color 0.2s;
        }
        .btn-bowl-secondary:hover { background-color: ${GOLD}; color: white; }
        
        @media (max-width: 576px) {
            .btn-bowl-secondary {
                width: 100% !important;
                text-align: center;
                padding: 12px 16px !important;
            }
        }
      `}</style>
    </div>
  );
}