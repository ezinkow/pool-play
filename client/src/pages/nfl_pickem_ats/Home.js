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

export default function NflPickemAtsHome() {
  const { user, loading: authLoading, token } = useAuth();
  const [poolData, setPoolData] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const loadData = () => {
    // If you have a settings/active-states route or countdown endpoint
    axios.get("/api/settings/active-states")
      .then(res => {
        const pickemPool = res.data.find(p => p.game_key === "nfl_pickem_ats");
        setPoolData(pickemPool);
      })
      .catch(err => console.error("Failed to load pool data", err));

    if (token || localStorage.getItem("token")) {
      axios.get("/api/nfl_pickem_ats/entries/me", {
        headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` }
      })
        .then(res => {
          setUserEntry(res.data.entry || null);
          if (res.data.entry?.entry_name) {
            setCustomEntryName(res.data.entry.entry_name);
          }
        })
        .catch(err => console.error("Failed to fetch pick'em entry", err));
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const isPoolStarted = useMemo(() => {
    if (!poolData?.lock_date) return false;
    return new Date() >= new Date(poolData.lock_date);
  }, [poolData]);

  const handleJoinPool = async () => {
    try {
      const entryNameInput = customEntryName.trim() || user?.name;
      const res = await axios.post("/api/nfl_pickem_ats/entries/create", {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` }
      });
      setUserEntry(res.data.entry);
      toast.success("Successfully joined Standard ATS Pick'em!");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to join pool");
    }
  };

  const handleLeavePool = async () => {
    try {
      await axios.post("/api/nfl_pickem_ats/entries/leave", {}, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` }
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
        
        {/* Join & Leave Pool Section */}
        <div style={{
          background: WHITE,
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginBottom: 24,
          borderTop: `4px solid ${NFL_BLUE}`,
          maxWidth: "650px",
          margin: "0 auto 24px auto",
          textAlign: "left"
        }}>
          <h3 style={{ color: NFL_BLUE, marginTop: 0, marginBottom: 16, fontSize: "1.2rem", textAlign: "center" }}>
            🏈 Standard ATS Pick'em Pool
          </h3>

          {userEntry ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "15px", color: "#16a34a", fontWeight: "bold" }}>✓ You are officially registered!</p>
              <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 16px 0" }}>Display Name: <strong>{userEntry.entry_name}</strong></p>
              
              {!isPoolStarted && (
                <div>
                  {confirmLeave ? (
                    <div style={{ marginTop: 12, background: "#fee2e2", padding: 10, borderRadius: 8, textAlign: "center" }}>
                      <p style={{ fontSize: "13px", margin: "0 0 8px 0", color: "#b91c1c", fontWeight: "bold" }}>Are you sure you want to leave?</p>
                      <button onClick={handleLeavePool} style={{ background: NFL_RED, color: WHITE, border: "none", padding: "6px 12px", borderRadius: 6, marginRight: 8, cursor: "pointer", fontWeight: "bold" }}>Yes, Leave</button>
                      <button onClick={() => setConfirmLeave(false)} style={{ background: "#cbd5e1", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmLeave(true)} style={{ background: "transparent", color: NFL_RED, border: `1px solid ${NFL_RED}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "block", margin: "0 auto" }}>
                      Leave Pool
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center", marginBottom: 16 }}>Pick every game against the spread each week and select your 3 Best Bets.</p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold", color: NFL_BLUE }}>Entry / Display Name:</label>
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
              <button onClick={handleJoinPool} className="btn-fb-secondary" style={{ width: "100%", padding: "12px 20px", fontSize: "14px" }}>
                Join ATS Pick'em Pool
              </button>
            </div>
          )}
        </div>

        {userEntry && (
          <PoolGatekeeper user={user} gameKey="nfl_pickem_ats">
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: 20 }}>
              <Link to="/nflpickemats/picks" style={{ textDecoration: 'none' }}>
                <button className="btn-fb-secondary">🏈 Make Weekly Picks</button>
              </Link>
              <Link to="/nflpickemats/mypicks" style={{ textDecoration: 'none' }}>
                <button className="btn-fb-secondary">📋 My Picks</button>
              </Link>
              <Link to="/nflpickemats/grouppicks" style={{ textDecoration: 'none' }}>
                <button className="btn-fb-secondary">📊 Weekly Matrix</button>
              </Link>
              <Link to="/nflpickemats/standings" style={{ textDecoration: 'none' }}>
                <button className="btn-fb-secondary">🏆 Leaderboard</button>
              </Link>
            </div>
          </PoolGatekeeper>
        )}

        {/* Rules Card */}
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
            📋 Standard ATS Pick'em: <br />Rules & Overview
          </h3>
          <ol style={{ paddingLeft: 20, lineHeight: "1.7", fontSize: "14px" }}>
            <li><strong>Full Slate Picks:</strong> Select a side Against The Spread (ATS) for every matchup available each week.</li>
            <li><strong>Best Bets:</strong> Designate exactly 3 games each week as your <strong>Best Bets ⭐</strong> for extra weight/points.</li>
            <li><strong>Kickoff Locks:</strong> Individual game picks lock automatically the moment each game kicks off.</li>
            <li><strong>Privacy:</strong> Group picks on the weekly matrix remain hidden until that specific game gets underway.</li>
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
            .btn-fb-secondary {
                width: 100% !important;
                text-align: center;
                padding: 12px 16px !important;
            }
        }
      `}</style>
    </div>
  );
}