import React from "react";
import { Link } from "react-router-dom";
import PoolHomeActions from "../../components/PoolHomeActions";
import PoolEmoji from "../../components/PoolEmoji";
import PoolCreditsSubtitle from "../../components/PoolCreditsSubtitle";

export default function Home() {
  return (
    <>
      <div className="home-hero">
        <div className="hero-content">
          <h1><PoolEmoji gameKey="nfl_playoffs" /> NFL Playoff Pool</h1>
          <PoolCreditsSubtitle gameKey="nfl_playoffs" />
          <p>
            Build your roster. Start your guys.
            Most points wins.
          </p>

          <div className="hero-actions">
            <PoolHomeActions gameKey="nfl_playoffs" />

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
