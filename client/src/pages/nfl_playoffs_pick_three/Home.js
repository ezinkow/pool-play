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

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";

export default function NflPlayoffsPickThreeHome() {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const poolMetadata = usePoolMetadata("nfl_playoffs_pick_three");
  const [poolData, setPoolData] = useState(null);
  const [userEntries, setUserEntries] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const activeToken = token || localStorage.getItem("token");

  const loadData = () => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const pickPool = res.data.find(p => p.game_key === "nfl_playoffs_pick_three");
        if (pickPool) {
          axios.get("/api/nfl_playoffs_pickthree/settings", {
            headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
          }).then(settingsRes => {
            setPoolData({
              ...pickPool,
              current_week: settingsRes.data.current_week || 1,
              games_api_path: pickPool.games_api_path || "/api/nfl_playoffs_pickthree/games"
            });
          }).catch(() => {
            setPoolData({
              ...pickPool,
              current_week: 1,
              games_api_path: pickPool.games_api_path || "/api/nfl_playoffs_pickthree/games"
            });
          });
        }
      })
      .catch(err => console.error("Failed to load pool data", err));

    if (activeToken) {
      axios.get("/api/nfl_playoffs_pickthree/entries/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          const entriesList = res.data.entries || (res.data.entry ? [res.data.entry] : []);
          setUserEntries(entriesList);
          if (!customEntryName) {
            setCustomEntryName(`${user?.name || 'Player'} Entry ${entriesList.length + 1}`);
          }
        })
        .catch(err => {
          console.error("Failed to fetch playoffs pick three entries", err);
          if (err.response?.status === 401) {
            toast.error("Session expired. Please log in again.");
          }
        });
    }
  };

  useEffect(() => {
    loadData();
  }, [activeToken, user]);

  const isPoolStarted = getIsPoolStarted(poolData);
  const hasJoined = userEntries.length > 0;

  const handleJoinPool = async () => {
    if (!activeToken) {
      toast.error("Please log in or create an account to join a pool.");
      navigate("/login");
      return;
    }

    try {
      const entryNameInput = customEntryName.trim() || `${user?.name || 'Player'} Entry ${userEntries.length + 1}`;
      const res = await axios.post("/api/nfl_playoffs_pickthree/entries/create", {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      const updatedEntries = [...userEntries, res.data.entry];
      setUserEntries(updatedEntries);
      setCustomEntryName(`${user?.name || 'Player'} Entry ${updatedEntries.length + 1}`);
      toast.success(userEntries.length === 0 ? "Successfully joined pool!" : "Successfully created additional entry!");
      loadData();
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(err.response?.data?.error || "Failed to create entry");
      }
    }
  };

  const handleLeavePool = async (arg) => {
    if (!activeToken) {
      toast.error("Please log in first.");
      navigate("/login");
      return;
    }

    // If arg is a React SyntheticEvent, ignore it and grab the first entry ID or leave blank
    const entryId = (arg && typeof arg === "object" && arg.nativeEvent)
      ? (userEntries[0]?.id || null)
      : (typeof arg === "object" ? arg?.id : (arg || userEntries[0]?.id));

    try {
      await axios.post("/api/nfl_playoffs_pickthree/entries/leave", { id: entryId }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntries(prev => prev.filter(e => e.id !== entryId));
      setConfirmLeave(false);
      toast.success("Successfully removed entry.");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove entry");
    }
  };

  if (authLoading) return null;

  return (
    <div className='page-content' style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
      <Toaster />

      {poolData && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}

      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>

        {!activeToken && <PoolLoginPrompt accentColor={NFL_BLUE} />}
        
        <PoolJoinCard
          gameKey="nfl_playoffs_pick_three"
          poolTitle={poolMetadata?.pool_title || "NFL Playoffs Pick Three"}
          poolEmoji={poolMetadata?.emoji}
          userEntries={userEntries}
          isMultiEntry={true}
          isPoolStarted={isPoolStarted}
          confirmLeave={confirmLeave}
          setConfirmLeave={setConfirmLeave}
          handleJoinPool={handleJoinPool}
          handleLeavePool={handleLeavePool}
          customEntryName={customEntryName}
          setCustomEntryName={setCustomEntryName}
          user={user}
          accentColor={poolMetadata?.accent_color || NFL_BLUE}
          joinDescription="Pick one QB, one RB, and one WR each playoff week. Each player can only be selected once all postseason! Multiple entries allowed."
          joinButtonText="Join Playoffs Pick Three"
        />

        {hasJoined && (
          <PoolGatekeeper user={user} gameKey="nfl_playoffs_pick_three">
            <PoolHomeActions gameKey="nfl_playoffs_pick_three" />
          </PoolGatekeeper>
        )}

        <PoolRulesCard
          title={poolMetadata?.pool_title || "NFL Playoffs Pick Three"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || NFL_RED}
        />
      </div>

      <style>{`
        button, .btn, [role="button"] {
            cursor: pointer !important;
        }
        .btn-fb-secondary {
            padding: 14px 28px;
            background-color: transparent;
            color: ${NFL_BLUE};
            border: 2px solid ${NFL_BLUE};
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer !important;
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