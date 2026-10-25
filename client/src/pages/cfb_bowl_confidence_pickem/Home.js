import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay";
import PoolJoinCard from "../../components/PoolJoinCard";
import PoolRulesCard from "../../components/PoolRulesCard";
import PoolLoginPrompt from "../../components/PoolLoginPrompt";
import PoolHomeActions from "../../components/PoolHomeActions";
import usePoolMetadata from "../../hooks/usePoolMetadata";
import { isPoolStarted as getIsPoolStarted } from "../../utils/poolStatus";

const CFB_BLUE = "#013369";
const GOLD = "#c89d3c";
const BROWN = "#92400e";
const WHITE = "#FFFFFF";

export default function CfbBowlConfidenceHome() {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const poolMetadata = usePoolMetadata("cfb_bowl_pickem");
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
            games_api_path: bowlPool.games_api_path || "/api/cfb_bowl_games"
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

  const isPoolStarted = getIsPoolStarted(poolData);

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
    <div style={{ className:'page-content', width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
      <Toaster />

      {poolData && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}

      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>

        {!activeToken && (
          <PoolLoginPrompt
            accentColor={CFB_BLUE}
            message="You must be logged in or create an account before you can select a display name and join this bowl confidence pool."
          />
        )}

        <PoolJoinCard
          gameKey="cfb_bowl_pickem"
          poolTitle={poolMetadata?.pool_title || "College Bowl Confidence Pick'em"}
          userEntry={userEntry}
          isPoolStarted={isPoolStarted}
          confirmLeave={confirmLeave}
          setConfirmLeave={setConfirmLeave}
          handleJoinPool={handleJoinPool}
          handleLeavePool={handleLeavePool}
          customEntryName={customEntryName}
          setCustomEntryName={setCustomEntryName}
          user={user}
          accentColor={poolMetadata?.accent_color || BROWN}
          poolEmoji={poolMetadata?.emoji}
          joinDescription="Pick every college bowl game winner and rank them by confidence from highest points to lowest."
          joinButtonText="Join Bowl Confidence Pool"
          registeredMessage="✓ You are officially registered for the Bowls!"
          closedMessage="The bowl season has already started or locked. New entries are no longer accepted."
        />

        {userEntry && (
          <PoolGatekeeper user={user} gameKey="cfb_bowl_pickem">
            <PoolHomeActions gameKey="cfb_bowl_pickem" />
          </PoolGatekeeper>
        )}

        <PoolRulesCard
          title={poolMetadata?.pool_title || "Bowl Confidence Pool"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || BROWN}
        />
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