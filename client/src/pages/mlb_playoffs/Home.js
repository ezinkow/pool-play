import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay";
import PoolJoinCard from "../../components/PoolJoinCard";
import PoolRulesCard from "../../components/PoolRulesCard";
import usePoolMetadata from "../../hooks/usePoolMetadata";
import PoolLoginPrompt from "../../components/PoolLoginPrompt";
import PoolHomeActions from "../../components/PoolHomeActions";
import { isPoolStarted as getIsPoolStarted } from "../../utils/poolStatus";

const NAVY = "#0a1628";
const WHITE = "#FFFFFF";
const GOLD = "#c89d3c";

export default function MlbHome() {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const poolMetadata = usePoolMetadata("mlb_playoffs");
  const [poolData, setPoolData] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const activeToken = token || localStorage.getItem("token");

  const loadData = () => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const mlbPool = res.data.find(p => p.game_key === "mlb_playoffs");
        if (mlbPool) {
          setPoolData({
            ...mlbPool,
            games_api_path: mlbPool.games_api_path || "/api/mlb_playoffs_series" // Adjust to your actual MLB games route if different
          });
        }
      })
      .catch(err => console.error("Failed to load pool data", err));

    if (activeToken) {
      axios.get("/api/mlb_playoffs/entries/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          const entryData = res.data.entry || (Array.isArray(res.data.entries) ? res.data.entries[0] : null);
          setUserEntry(entryData || null);
          if (entryData?.entry_name) {
            setCustomEntryName(entryData.entry_name);
          }
        })
        .catch(err => {
          console.error("Failed to fetch MLB entry", err);
          if (err.response?.status === 401) {
            toast.error("Session expired. Please log in again.");
          }
        });
    }
  };

  useEffect(() => {
    loadData();
  }, [activeToken]);

  const isPoolStarted = getIsPoolStarted(poolData, { requireActive: false });

  const handleJoinPool = async () => {
    if (!activeToken) {
      toast.error("Please log in or create an account to join a pool.");
      navigate("/login");
      return;
    }

    try {
      const entryNameInput = customEntryName.trim() || user?.name || "My Entry";
      const res = await axios.post("/api/mlb_playoffs/entries", {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntry(res.data.entry || res.data);
      toast.success("Successfully joined MLB Playoff Pool!");
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
      await axios.post(`/api/${gameKey}/entries/leave`, {}, {
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
    <div style={{ className: 'page-content', width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
      <Toaster />

      {poolData && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}

      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>

        {!activeToken && <PoolLoginPrompt accentColor={NAVY} />}

        <PoolJoinCard
          gameKey="mlb_playoffs"
          poolTitle={poolMetadata?.pool_title || "MLB Playoff Pool Entry"}
          userEntry={userEntry}
          isPoolStarted={isPoolStarted}
          confirmLeave={confirmLeave}
          setConfirmLeave={setConfirmLeave}
          handleJoinPool={handleJoinPool}
          handleLeavePool={handleLeavePool}
          customEntryName={customEntryName}
          setCustomEntryName={setCustomEntryName}
          user={user}
          accentColor={poolMetadata?.accent_color || NAVY}
          poolEmoji={poolMetadata?.emoji}
          joinDescription="Pick the winner of every postseason series, assign confidence points, and guess series lengths."
          joinButtonText="Join MLB Playoff Pool"
        />

        {userEntry && (
          <PoolGatekeeper user={user} gameKey="mlb_playoffs">
            <PoolHomeActions gameKey="mlb_playoffs" />
          </PoolGatekeeper>
        )}

        <div style={{ marginBottom: 20 }}>
          <a href="https://www.mlb.com/playoffs/2026"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: NAVY,
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              textDecoration: "none",
            }}>
            🏟️ Playoff Bracket ↗
          </a>
        </div>

        <PoolRulesCard
          title={poolMetadata?.pool_title || "MLB Playoff Pool"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || GOLD}
          subtitle="Rules"
        />
      </div>

      <style>{`
        .btn-mlb-secondary {
            padding: 14px 28px;
            background-color: transparent;
            color: ${NAVY};
            border: 2px solid ${NAVY};
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: background-color 0.2s, color 0.2s;
        }
        .btn-mlb-secondary:hover { background-color: ${NAVY}; color: white; }
        
        @media (max-width: 576px) {
            .btn-mlb-secondary {
                width: 100% !important;
                text-align: center;
                padding: 12px 16px !important;
            }
        }
      `}</style>
    </div>
  );
}