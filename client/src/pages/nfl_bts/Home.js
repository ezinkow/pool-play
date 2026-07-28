import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import PoolCountdown from "../../components/CountdownDisplay";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const WHITE = "#FFFFFF";

export default function FootballHome() {
  const { user, loading: authLoading } = useAuth();
  const [poolData, setPoolData] = useState(null);

  useEffect(() => {
    axios.get("/api/settings/active-states")
      .then(res => {
        const NflBtsPool = res.data.find(p => p.game_key === "nfl_bts");
        setPoolData(NflBtsPool);
      })
      .catch(err => console.error("Failed to load NFL Beat The Spread pool data", err));
  }, []);

  const isPoolStarted = useMemo(() => {
    if (!poolData?.lock_date) return false;
    return new Date() >= new Date(poolData.lock_date);
  }, [poolData]);

  if (authLoading) return null;

  return (
    <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} className='page-content'>
      <Toaster />

      {poolData && (
        <PoolCountdown
          poolData={poolData}
          mode={isPoolStarted ? "active" : "pre-start"}
        />
      )}

      <div className="container" style={{ textAlign: "center", padding: "20px 16px", boxSizing: "border-box" }}>
        <PoolGatekeeper user={user} isAdmin={user?.is_admin === true} gameKey="nfl_bts">

          {/* Action Buttons Grid Cluster */}
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: 20 }}>
            <Link to="/nflbts/picks" style={{ textDecoration: 'none' }}>
              <button className="btn-fb-secondary">🏈 Make Weekly Picks</button>
            </Link>
            <Link to="/nflbts/grouppicks" style={{ textDecoration: 'none' }}>
              <button className="btn-fb-secondary">📊 Weekly Matrix</button>
            </Link>
            <Link to="/nflbts/standings" style={{ textDecoration: 'none' }}>
              <button className="btn-fb-secondary">🏆 Division Standings</button>
            </Link>
          </div>

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

        {/* Rules Card matching the spreadsheet layout concept */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: "24px 20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          marginTop: 24,
          marginBottom: 80,
          borderTop: `4px solid ${NFL_RED}`,
          textAlign: "left",
          maxWidth: "850px",
          margin: "24px auto 80px auto"
        }}>
          <h3 style={{ color: NFL_BLUE, marginTop: 0, marginBottom: 16, fontSize: "1.2rem", textAlign: 'center' }}>
            📋 Beat The Spread: <br />Assigned Team
          </h3>
          <ol style={{ paddingLeft: 20, lineHeight: "1.7", fontSize: "14px" }}>
            <li><strong>Assigned Team:</strong> You are randomly assigned one NFL team for the entire season once the 32-player room fills up.</li>
            <li><strong>Weekly Commitment:</strong> Every week, you must pick your assigned team's game Against The Spread (ATS) and make an Over/Under guess (used for tiebreakers).</li>
            <li><strong>The Hook Rule:</strong> Whole number spreads are adjusted up or down based on their juice. -110 and lower moves down (ex. -3 to -2.5), while anything above -110 moves up (ex. -3 to -3.5)</li>
            <li><strong>Divisions:</strong> Compete directly within your assigned NFL division based on ATS record (W-L).</li>
            <li><strong>Privacy:</strong> Group picks on the matrix remain hidden until that specific team's game kicks off.</li>
          </ol>
        </div>
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