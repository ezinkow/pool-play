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

const NCAA_BLUE = "#009CDE";
const NCAA_DARK_BLUE = "#002855";
const WHITE = "#FFFFFF";

export default function NcaabPickemAtsHome() {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const poolMetadata = usePoolMetadata("ncaab_pickem_ats");
  const [poolData, setPoolData] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const activeToken = token || localStorage.getItem("token");

  const [dataLoaded, setDataLoaded] = useState(false);

  const loadData = () => {
    // 1. Fetch active pool states and game settings
    axios.get("/api/settings/active-states")
      .then(res => {
        const pickemPool = res.data.find(p => p.game_key === "ncaab_pickem_ats");
        if (pickemPool) {
          axios.get("/api/ncaab_pickem_ats/settings", {
            headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
          }).then(settingsRes => {
            setPoolData({
              ...pickemPool,
              current_week: settingsRes.data.current_week || 1,
              games_api_path: pickemPool.games_api_path || "/api/ncaab_regular_season_games"
            });
            setDataLoaded(true);
          }).catch(() => {
            setPoolData({
              ...pickemPool,
              current_week: 1,
              games_api_path: pickemPool.games_api_path || "/api/ncaab_regular_season_games"
            });
            setDataLoaded(true);
          });
        }
      })
      .catch(err => {
        console.error("Failed to load pool data", err);
        setDataLoaded(true);
      });

    if (activeToken) {
      axios.get("/api/ncaab_pickem_ats/entries/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          setUserEntry(res.data.entry || null);
          if (res.data.entry?.entry_name) {
            setCustomEntryName(res.data.entry.entry_name);
          }
        })
        .catch(err => {
          console.error("Failed to fetch pick'em entry", err);
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
      toast.error("Registration is closed. The pool has already started or locked.");
      return;
    }

    try {
      const entryNameInput = customEntryName.trim() || user?.name;
      const res = await axios.post("/api/ncaab_pickem_ats/entries/create", {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntry(res.data.entry);
      toast.success("Successfully joined NCAAB ATS Pick'em!");
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
      await axios.post("/api/ncaab_pickem_ats/entries/leave", {}, {
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
    <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
      <Toaster />

      {dataLoaded && poolData && poolData.game_key && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}
      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>

        {!activeToken && <PoolLoginPrompt accentColor={NCAA_BLUE} />}

        <PoolJoinCard
          gameKey="ncaab_pickem_ats"
          poolTitle={poolMetadata?.pool_title || "NCAAB ATS Pick'em Pool"}
          userEntry={userEntry}
          isPoolStarted={isPoolStarted}
          confirmLeave={confirmLeave}
          setConfirmLeave={setConfirmLeave}
          handleJoinPool={handleJoinPool}
          handleLeavePool={handleLeavePool}
          customEntryName={customEntryName}
          setCustomEntryName={setCustomEntryName}
          user={user}
          accentColor={poolMetadata?.accent_color || NCAA_BLUE}
          poolEmoji={poolMetadata?.emoji}
          joinDescription="Pick 15 weekend games (Friday–Sunday) against the spread from Power 4 conferences each week, including your 3 Best Bets and up to 3 must-picks."
          joinButtonText="Join NCAAB ATS Pick'em Pool"
        />

        {userEntry && (
          <PoolGatekeeper user={user} gameKey="ncaab_pickem_ats">
            <PoolHomeActions gameKey="ncaab_pickem_ats" />
          </PoolGatekeeper>
        )}

        <PoolRulesCard
          title={poolMetadata?.pool_title || "NCAAB ATS Pick'em"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || NCAA_DARK_BLUE}
        />
      </div>

      <style>{`
        .btn-fb-secondary {
            padding: 14px 28px;
            background-color: transparent;
            color: ${NCAA_BLUE};
            border: 2px solid ${NCAA_BLUE};
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: background-color 0.2s, color 0.2s;
        }
        .btn-fb-secondary:hover { background-color: ${NCAA_BLUE}; color: white; }
        
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