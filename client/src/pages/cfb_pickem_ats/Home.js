import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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

const BLUE = "#013369";
const RED = "#D50A0A";

export default function CfbPickemAtsHome() {
  const { user, loading: authLoading, token } = useAuth();
  const { isDarkMode } = useOutletContext();
  const navigate = useNavigate();

  const [poolData, setPoolData] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  const activeToken = token || localStorage.getItem("token");
  const gameKey = "cfb_pickem_ats";
  const poolMetadata = usePoolMetadata(gameKey);

  const loadData = () => {
    // Fetch active pool states and game settings.
    axios.get("/api/settings/active-states")
      .then(res => {
        const pickemPool = res.data.find(p => p.game_key === gameKey);
        if (pickemPool) {
          axios.get(`/api/${gameKey}/settings`, {
            headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
          }).then(settingsRes => {
            setPoolData({
              ...pickemPool,
              current_week: settingsRes.data.current_week || 1,
              games_api_path: pickemPool.games_api_path || "/api/cfb_regular_season_games"
            });
            setDataLoaded(true);
          }).catch(() => {
            setPoolData({
              ...pickemPool,
              current_week: 1,
              games_api_path: pickemPool.games_api_path || "/api/cfb_regular_season_games"
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
      axios.get(`/api/${gameKey}/entries/me`, {
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
      const res = await axios.post(`/api/${gameKey}/entries/create`, {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntry(res.data.entry);
      toast.success("Successfully joined pool!");
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

  const accentColor = poolMetadata?.accent_color || BLUE;
  const poolTitle = poolMetadata?.pool_title || "CFB ATS Pick'em Pool";
  const rulesHtml = poolMetadata?.rules_html || "";

  return (
    <div className="cfb-pickem-ats-home" style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
      <Toaster />

      {dataLoaded && poolData && poolData.game_key && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
          isDarkMode={isDarkMode}
        />
      )}
      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>

        {!activeToken && <PoolLoginPrompt accentColor={accentColor} />}

        {/* Reusable Join Card Component */}
        <PoolJoinCard
          poolTitle={poolTitle}
          poolEmoji={poolMetadata?.emoji}
          userEntry={userEntry}
          isPoolStarted={isPoolStarted}
          confirmLeave={confirmLeave}
          setConfirmLeave={setConfirmLeave}
          handleJoinPool={handleJoinPool}
          handleLeavePool={handleLeavePool}
          customEntryName={customEntryName}
          setCustomEntryName={setCustomEntryName}
          user={user}
          accentColor={accentColor}
        />

        {userEntry && (
          <PoolGatekeeper user={user} gameKey={gameKey}>
            <PoolHomeActions gameKey={gameKey} />
          </PoolGatekeeper>
        )}

        {/* Reusable Rules Card Component */}
        <PoolRulesCard
          title={poolTitle}
          rulesHtml={rulesHtml}
          accentColor={RED}
        />
      </div>

    </div>
  );
}