import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <div className="home-hero">
        <div className="hero-content">
          <h1>🏈 NFL Playoff Pool</h1>
          <p>
            Build your roster. Start your guys.
            Most points wins.
          </p>

          <div className="hero-actions">
            <Link to="/nfl/standings" className="primary-btn">
              View Leaderboard
            </Link>

            <a
              href="https://www.nfl.com/scores"
              target="_blank"
              rel="noreferrer"
              className="secondary-btn"
            >
              Live NFL Scores
            </a>
          </div>
        </div>
      </div>

      <div className="home-section">
        <h2>How It Works</h2>

        <div className="steps">
          <Link to="/nfl/rosterpicks" className="step step-link">
            <span>1</span>
            Create your playoff roster
          </Link>

          <Link to="/nfl/myroster" className="step step-link">
            <span>2</span>
            Set your weekly lineup
          </Link>

          <Link to="/nfl/scoreboard" className="step step-link">
            <span>3</span>
            Climb the leaderboard 🏆
          </Link>
        </div>
      </div>
    </>
  );
}
