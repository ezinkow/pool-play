import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

export default function Home() {
  const { user: user, loading: authLoading } = useAuth();

  if (authLoading) return null;

  return (
    <div style={{ paddingLeft: 0, paddingRight: 0 }}>
      <div className="home-hero page-content" style={{ padding: "40px 16px" }}>
        <div className="hero-content">
          <h1>⚽ World Cup Pick 'em</h1>
          <p>
            Pick every game during pool play then fill out a knockout round bracket.
            <br />Most points wins.
          </p>

          <div className="hero-actions">
            <PoolGatekeeper user={user} gameKey="worldcup">
              <div className="cta-button-grid">
                {/* PRIMARY BLUE BUTTONS */}
                <Link to="/worldcup/picks" className="cta-button" style={{ backgroundColor: "#002366", color: "white" }}>
                  Make Picks
                </Link>
                <Link to="/worldcup/mypicks" className="cta-button" style={{ backgroundColor: "#002366", color: "white" }}>
                  View Picks
                </Link>
                <Link to="/worldcup/standings" className="cta-button" style={{ backgroundColor: "#002366", color: "white" }}>
                  View Leaderboard
                </Link>
              </div>
            </PoolGatekeeper>

            {/* SECONDARY RED OUTLINE BUTTON */}
            <a
              href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"
              target="_blank"
              rel="noreferrer"
              className="cta-button"
              style={{
                backgroundColor: "transparent",
                border: "2px solid #c8102e",
                color: "#c8102e",
                marginTop: "10px",
                fontWeight: "700"
              }}
            >
              Live World Cup Scores
            </a>
          </div>
        </div>
      </div>

      <div className="home-section">
        <h2>How It Works</h2>
        <div className="steps">
          <Link to="/worldcup/picks" className="step step-link">
            <span>1) </span>
            Pick match outcomes across the complete group stage schedule 🌎
          </Link>
          <Link to="/worldcup/grouppicks" className="step step-link">
            <span>2) </span>
            Pick correctly and earn points 🥅
          </Link>
          <Link to="/worldcup/standings" className="step step-link">
            <span>3) </span>
            Climb the leaderboard 🏆
          </Link>
        </div>
      </div>
    </div>
  );
}