import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay";
import PoolRulesCard from "../../components/PoolRulesCard";
import PoolLoginPrompt from "../../components/PoolLoginPrompt";
import usePoolMetadata from "../../hooks/usePoolMetadata";
import PoolHomeActions from "../../components/PoolHomeActions";
import { isPoolStarted as getIsPoolStarted } from "../../utils/poolStatus";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const WHITE = "#FFFFFF";

export default function NflBtsHome() {
  const { user, loading: authLoading, token } = useAuth();
  const poolMetadata = usePoolMetadata("nfl_bts");
  const navigate = useNavigate();
  const [poolData, setPoolData] = useState(null);
  const [userEntries, setUserEntries] = useState([]);
  const [roomAssignment, setRoomAssignment] = useState(null);
  const [roomCount, setRoomCount] = useState(0);
  const [confirmLeaveRoom, setConfirmLeaveRoom] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const activeToken = token || localStorage.getItem("token");

  const loadData = () => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const btsPool = res.data.find(p => p.game_key === "nfl_bts");
        if (btsPool) {
          // Fetch settings endpoint for nfl_bts to get current_week and configuration
          axios.get("/api/nfl_regular_season/settings", {
            headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
          }).then(settingsRes => {
            setPoolData({
              ...btsPool,
              current_week: settingsRes.data.current_week || 1,
              games_api_path: btsPool.games_api_path || "/api/nfl_regular_season_games"
            });
          }).catch(() => {
            setPoolData({
              ...btsPool,
              current_week: 1,
              games_api_path: btsPool.games_api_path || "/api/nfl_regular_season_games"
            });
          });
        }
      })
      .catch(err => console.error("Failed to load pool data", err));

    axios.get("/api/nfl_bts/entries")
      .then(res => {
        const allEntries = res.data || [];
        setRoomCount(allEntries.length);
      })
      .catch(err => console.error("Failed to fetch entry counts", err));

    if (activeToken) {
      axios.get("/api/nfl_bts/entries/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          setUserEntries(res.data.entries || []);
        })
        .catch(err => {
          console.error("Failed to fetch user entries", err);
          if (err.response?.status === 401) {
            toast.error("Session expired. Please log in again.");
          }
        });

      axios.get("/api/nfl_bts/assignment", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          if (res.data && res.data.team_name_1) {
            setRoomAssignment(res.data);
          }
        })
        .catch(err => console.error("Failed to fetch team assignment", err));
    }
  };

  useEffect(() => {
    loadData();
  }, [activeToken]);

  const isPoolStarted = getIsPoolStarted(poolData);

  const handleJoinPool = async (creditAmount) => {
    if (isPoolStarted) {
      toast.error("Registration is closed because the pool has locked or started.");
      return;
    }

    if (!activeToken) {
      toast.error("Please log in or create an account to join the pool.");
      navigate("/login");
      return;
    }

    try {
      const entryNameInput = customEntryName?.trim() || user?.name;
      await axios.post("/api/nfl_bts/entries/create", {
        room_id: 1,
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      toast.success(`Successfully joined the ${creditAmount}-credit pool!`);
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
    if (roomAssignment && roomAssignment.team_name_1) {
      toast.error("You cannot leave anymore because teams have already been randomized/assigned!");
      return;
    }

    if (!activeToken) {
      toast.error("Please log in first.");
      navigate("/login");
      return;
    }

    try {
      await axios.post("/api/nfl_bts/entries/leave", { room_id: 1 }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      toast.success("Successfully left the pool.");
      setConfirmLeaveRoom(false);
      setRoomAssignment(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to leave pool");
    }
  };

  if (authLoading) return null;

  const currentEntry = userEntries[0];
  const hasAnyEntry = userEntries.length > 0;
  const hasTeamsAssigned = roomAssignment && (roomAssignment.team_name_1 || roomAssignment.team_name_2);

  return (
    <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
      <Toaster />

      {poolData && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}

      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>

        {!activeToken && !isPoolStarted && (
          <PoolLoginPrompt accentColor={NFL_BLUE} maxWidth={950} />
        )}

        {/* Pool Join & Leave Section */}
        <div style={{
          background: WHITE,
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginBottom: 24,
          borderTop: `4px solid ${NFL_BLUE}`,
          maxWidth: "600px",
          margin: "0 auto 24px auto"
        }}>
          <h3 style={{ color: NFL_BLUE, marginTop: 0, marginBottom: 8, fontSize: "1.2rem" }}>
            🏟️ Pool Registration
          </h3>
          <p style={{ margin: "0 0 4px 0" }}>Secure your spot in the pool!</p>
          <p style={{ margin: "0 0 16px 0" }}>Everyone gets <strong>2 assigned teams</strong>, 1 per conference (16 spots available)!</p>

          {isPoolStarted && (
            <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", fontWeight: "bold", marginBottom: "16px" }}>
              🔒 Registration is closed for this pool because it has started or locked.
            </div>
          )}

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px", background: "#f8fafc", textAlign: "left" }}>
            <h4 style={{ margin: "0 0 4px 0", color: NFL_BLUE, textAlign: "center" }}>100-Credit Beat The Spread Pool</h4>
            <p style={{ textAlign: "center", fontSize: "12px", color: "#64748b", margin: "0 0 12px 0" }}>
              Current Count: <strong style={{ color: NFL_BLUE }}>{roomCount} / 16</strong>
            </p>

            {currentEntry ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: "#16a34a", fontWeight: "bold" }}>✓ You are registered</p>
                <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 12px 0" }}>Display Name: <strong>{currentEntry.entry_name}</strong></p>
                <div>
                  {confirmLeaveRoom ? (
                    <div style={{ marginTop: 12, background: "#fee2e2", padding: 10, borderRadius: 8, textAlign: "center" }}>
                      <p style={{ fontSize: "13px", margin: "0 0 8px 0", color: "#b91c1c", fontWeight: "bold" }}>Are you sure you want to leave?</p>
                      <button onClick={handleLeavePool} style={{ background: NFL_RED, color: WHITE, border: "none", padding: "6px 12px", borderRadius: 6, marginRight: 8, cursor: "pointer", fontWeight: "bold" }}>Yes, Leave</button>
                      <button onClick={() => setConfirmLeaveRoom(false)} style={{ background: "#cbd5e1", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    !hasTeamsAssigned ? (
                      <button onClick={() => setConfirmLeaveRoom(true)} style={{ background: "transparent", color: NFL_RED, border: `1px solid ${NFL_RED}`, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "block", margin: "0 auto" }}>
                        Leave Pool
                      </button>
                    ) : (
                      <p style={{ fontSize: "12px", color: "#b91c1c", fontStyle: "italic" }}>🔒 Locked (Teams assigned)</p>
                    )
                  )}
                </div>
              </div>
            ) : (
              !isPoolStarted && (
                <div>
                  <div style={{ marginBottom: 12 }}>
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
                      style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                  </div>
                  <button onClick={() => handleJoinPool(100)} className="btn-fb-secondary" style={{ width: "100%", padding: "10px 20px", fontSize: "14px" }}>
                    Join 100-Credit Pool
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {hasAnyEntry && (
          <PoolGatekeeper user={user} isAdmin={user?.is_admin === true} gameKey="nfl_bts">
            <PoolHomeActions gameKey="nfl_bts" />

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

        <PoolRulesCard
          title={poolMetadata?.pool_title || "Beat The Spread: Assigned Teams"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || NFL_RED}
        />
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