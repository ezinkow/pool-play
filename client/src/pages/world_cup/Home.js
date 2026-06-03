import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay"; // Make sure this is imported

const BLUE = "#002366";
const RED = "#c8102e";
const GOLD = "#c89d3c";

export default function Home() {
  // 1. Hooks must be inside the component body
  const { user, loading: authLoading } = useAuth();
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
  const isPoolStarted = useMemo(() => {
    if (!poolData?.lock_date) return false;
    return new Date() >= new Date(poolData.lock_date);
  }, [poolData]);

  if (authLoading) return null;

  return (
    <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} className='page-content'>
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

          {/* Action Buttons Grid Cluster */}
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: 20 }}>
            <Link to="/worldcup/picks" style={{ textDecoration: 'none' }}>
              <button className="btn-wc-main">⚽ Make Picks</button>
            </Link>
            <Link to="/worldcup/mypicks" style={{ textDecoration: 'none' }}>
              <button className="btn-wc-secondary">📋 My Picks</button>
            </Link>
            <Link to="/worldcup/standings" style={{ textDecoration: 'none' }}>
              <button className="btn-wc-secondary">🏆 Standings</button>
            </Link>
          </div>

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

        {/* Rules card */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginTop: 24,
          marginBottom: 80,
          borderTop: `4px solid ${GOLD}`,
          textAlign: "left",
          maxWidth: "850px",
          margin: "24px auto 80px auto",
          boxSizing: "border-box"
        }}>
          <h3 style={{ color: RED, marginTop: 0, marginBottom: 16, fontSize: "1.2rem" }}>
            📋 World Cup Pool Rules
          </h3>
          <ol style={{ paddingLeft: 20, lineHeight: "1.7", fontSize: "14px" }}>
            <li>Pick match outcomes during the Group Stage: 1 point for a correct win. 2 points for a correct draw.</li>
            <li>When it's time for the Knockout Stage: Fill out a knockout round bracket. Points increase every round (2,3,5,7,10)</li>
            <li>Most points at the end wins.</li>
          </ol>
        </div>
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