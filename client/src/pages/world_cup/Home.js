import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import useAuth from "../../hooks/useAuth";

export default function Home() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [alreadyIn, setAlreadyIn] = useState(false);
  const [checkingPool, setCheckingPool] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setCheckingPool(false);
      return;
    }
    if (hasChecked.current) return;

    async function checkEntryStatus() {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get("/api/worldcup/entries/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data && data.entry) {
          setAlreadyIn(true);
        }
      } catch (err) {
        console.error("Error validating entry routing structure:", err);
      } finally {
        setCheckingPool(false);
        hasChecked.current = true;
      }
    }

    checkEntryStatus();
  }, [authUser, authLoading]);

  return (
    <>
      <div className="home-hero">
        <div className="hero-content">
          <h1>⚽ World Cup Pick 'em</h1>
          <p>
            Pick every game during pool play then fill out a knockout round bracket.
            <br />Most points wins.
          </p>

          <div className="hero-actions">
            {authLoading || checkingPool ? (
              <span style={{ color: "white", fontSize: "14px", fontWeight: "600" }}>Verifying registration status...</span>
            ) : !authUser ? (
              // State A: Not logged in at all
              <Link to="/login" className="primary-btn">
                Log In to Play
              </Link>
            ) : !alreadyIn ? (
              // State B: Logged in, but hasn't created a World Cup Entry profile yet
              <Link to="/worldcup/signup" className="primary-btn" style={{ backgroundColor: "#c89d3c", borderColor: "#c89d3c" }}>
                🚀 Create Entry to Join
              </Link>
            ) : (
              // State C: Fully registered pool participant - show everything!
              <>
                <Link to="/worldcup/picks" className="primary-btn">
                  Make Picks
                </Link>

                <Link to="/worldcup/mypicks" className="primary-btn">
                  View Picks
                </Link>

                <Link to="/worldcup/standings" className="primary-btn">
                  View Leaderboard
                </Link>
              </>
            )}

            <a
              href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"
              target="_blank"
              rel="noreferrer"
              className="secondary-btn"
            >
              Live World Cup Scores
            </a>
          </div>
        </div>
      </div>

      <div className="home-section">
        <h2>How It Works</h2>

        <div className="steps">
          <Link to={alreadyIn ? "/worldcup/picks" : "/worldcup/signup"} className="step step-link">
            <span>1) </span>
            Pick match outcomes across the complete group stage schedule 🌎
          </Link>

          <Link to={alreadyIn ? "/worldcup/picks" : "/worldcup/signup"} className="step step-link">
            <span>2) </span>
            Earn points (1 for win selections, 2 for drawing selections) 🥅
          </Link>

          <Link to={alreadyIn ? "/worldcup/scoreboard" : "/worldcup/signup"} className="step step-link">
            <span>3) </span>
            Climb the live matrix leaderboards 🏆
          </Link>
        </div>
      </div>
    </>
  );
}