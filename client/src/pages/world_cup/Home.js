import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay"; // Make sure this is imported
import PoolRulesCard from "../../components/PoolRulesCard";
import usePoolMetadata from "../../hooks/usePoolMetadata";
import PoolHomeActions from "../../components/PoolHomeActions";
import { isPoolStarted as getIsPoolStarted } from "../../utils/poolStatus";

const BLUE = "#002366";
const GOLD = "#c89d3c";

export default function Home() {
  // 1. Hooks must be inside the component body
  const { user, loading: authLoading } = useAuth();
  const poolMetadata = usePoolMetadata("world_cup");
  const [poolData, setPoolData] = useState(null);

  useEffect(() => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const wcPool = res.data.find(p => p.game_key === "worldcup");
        setPoolData(wcPool);
      })
      .catch(err => console.error("Failed to load pool data", err));
  }, []);

  // 2. Calculate inside the component body
  const isPoolStarted = getIsPoolStarted(poolData, { requireActive: false });

  if (authLoading) return null;

  return (
    <div style={{ className:'page-content', width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
      <Toaster />

      {/* 3. Only render when poolData is available */}
      {poolData && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}

      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>
        <PoolGatekeeper user={user} isAdmin={user?.is_admin === true} gameKey="worldcup">

          <PoolHomeActions gameKey="world_cup" />

          <a href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"
            target="_blank"
            rel="noreferrer"
            className="btn-wc-live"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: BLUE,
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              textDecoration: "none",
              maxWidth: "100%",
              boxSizing: "border-box"
            }}>
            Live World Cup Scores ↗
          </a>
        </PoolGatekeeper>

        <PoolRulesCard
          gameKey="worldcup"
          title={poolMetadata?.pool_title || "World Cup Pool"}
          rulesHtml={poolMetadata?.rules_html}
          accentColor={poolMetadata?.accent_color || GOLD}
          subtitle="Rules"
        />
      </div>

      <style>{`
        .btn-wc-main {
            padding: 14px 28px;
            background-color: ${BLUE};
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: opacity 0.2s;
        }
        .btn-wc-secondary {
            padding: 14px 28px;
            background-color: transparent;
            color: ${BLUE};
            border: 2px solid ${BLUE};
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: background-color 0.2s, color 0.2s;
        }
        .btn-wc-secondary:hover { background-color: ${BLUE}; color: white; }
        
        @media (max-width: 576px) {
            .btn-wc-main, .btn-wc-secondary, .btn-wc-live {
                width: 100% !important;
                text-align: center;
                padding: 12px 16px !important;
            }
        }
      `}</style>
    </div>
  );
}