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

const NBA_BLUE = "#013369";
const NBA_RED = "#D50A0A";
const WHITE = "#FFFFFF";

export default function NbaSurvivorHome() {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const poolMetadata = usePoolMetadata("nba_survivor");
  const [poolData, setPoolData] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const activeToken = token || localStorage.getItem("token");

  const loadData = () => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const survivorPool = res.data.find(p => p.game_key === "nba_survivor");
        setPoolData(survivorPool);
      })
      .catch(err => console.error("Failed to load pool data", err));

    if (activeToken) {
      axios.get("/api/nba_survivor/entries/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          setUserEntry(res.data.entry || null);
          if (res.data.entry?.entry_name) {
            setCustomEntryName(res.data.entry.entry_name);
          }
        })
        .catch(err => {
          console.error("Failed to fetch survivor entry", err);
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
      toast.error("Please log in or create an account to join the pool.");
      navigate("/login");
      return;
    }

    try {
      const entryNameInput = customEntryName.trim() || user?.name;
      const res = await axios.post("/api/nba_survivor/entries/create", {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntry(res.data.entry);
      toast.success("Successfully joined NBA Survivor Pool!");
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
        
        {!activeToken && <PoolLoginPrompt accentColor={NBA_BLUE} />}

        <PoolJoinCard
          gameKey="nba_survivor"
          poolTitle={poolMetadata?.pool_title || "NBA Survivor Pool"}
          userEntry={userEntry}
          isPoolStarted={isPoolStarted}
          confirmLeave={confirmLeave}
          setConfirmLeave={setConfirmLeave}
          handleJoinPool={handleJoinPool}
          handleLeavePool={handleLeavePool}
          customEntryName={customEntryName}
          setCustomEntryName={setCustomEntryName}
          user={user}
          accentColor={poolMetadata?.accent_color || NBA_BLUE}
          poolEmoji={poolMetadata?.emoji}
          joinDescription="Pick one team to win straight up each week. Survive and advance!"
          joinButtonText="Join Survivor Pool"
          registeredMessage={userEntry?.is_eliminated ? `❌ Eliminated in Week ${userEntry.eliminated_week}` : undefined}
        />

        {userEntry && (
          <PoolGatekeeper user={user} gameKey="nba_survivor">
            <PoolHomeActions gameKey="nba_survivor" />
          </PoolGatekeeper>
        )}

        <PoolRulesCard
          title={poolMetadata?.pool_title || "NBA Survivor"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || NBA_RED}
        />
      </div>

      <style>{`
        .btn-survivor-secondary {
            padding: 14px 28px;
            background-color: transparent;
            color: ${NBA_BLUE};
            border: 2px solid ${NBA_BLUE};
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: background-color 0.2s, color 0.2s;
        }
        .btn-survivor-secondary:hover { background-color: ${NBA_BLUE}; color: white; }
        
        @media (max-width: 576px) {
            .btn-survivor-secondary {
                width: 100% !important;
                text-align: center;
                padding: 12px 16px !important;
            }
        }
      `}</style>
    </div>
  );
}