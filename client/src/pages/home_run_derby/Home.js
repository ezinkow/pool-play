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
const GOLD = "#c89d3c";
const WHITE = "#FFFFFF";

export default function HrdHome() {
  const { user, loading: authLoading, token } = useAuth();
  const navigate = useNavigate();
  const poolMetadata = usePoolMetadata("mlb_hrd");
  const [poolData, setPoolData] = useState(null);
  const [userEntry, setUserEntry] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [customEntryName, setCustomEntryName] = useState("");

  const activeToken = token || localStorage.getItem("token");

  const loadData = () => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const hrdPool = (res.data || []).find(p => p.game_key === "home_run_derby");
        setPoolData(hrdPool);
      })
      .catch(err => console.error("Failed to load pool data", err));

    if (activeToken) {
      axios.get("/api/hrd/entry/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => {
          setUserEntry(res.data.entry || null);
          if (res.data.entry?.entry_name) {
            setCustomEntryName(res.data.entry.entry_name);
          }
        })
        .catch(err => {
          console.error("Failed to fetch HRD entry", err);
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
      toast.error("Please log in or create an account to join this pool.");
      navigate("/login");
      return;
    }

    try {
      const entryNameInput = customEntryName.trim() || user?.name;
      const res = await axios.post("/api/hrd/entry/create", {
        entry_name: entryNameInput
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setUserEntry(res.data.entry);
      toast.success("Successfully joined Home Run Derby!");
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

    try {
      await axios.post("/api/hrd/entry/leave", {}, {
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
    <div style={{ className:'page-content', width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative", paddingTop: 68 }} >
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
          poolTitle={poolMetadata?.pool_title || "Home Run Derby Pool"}
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
          joinDescription="Build a team of 12 hitters under a 300 salary cap and track home runs all season long!"
          joinButtonText="Join Home Run Derby Pool"
        />

        {userEntry && (
          <PoolGatekeeper user={user} gameKey="mlb_hrd">
            <PoolHomeActions gameKey="mlb_hrd" />
          </PoolGatekeeper>
        )}

        <PoolRulesCard
          title={poolMetadata?.pool_title || "Home Run Derby"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || GOLD}
        />
      </div>

      <style>{`
        .btn-hrd-secondary {
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
        .btn-hrd-secondary:hover { background-color: ${NAVY}; color: white; }
        
        @media (max-width: 576px) {
            .btn-hrd-secondary {
                width: 100% !important;
                text-align: center;
                padding: 12px 16px !important;
            }
        }
      `}</style>
    </div>
  );
}