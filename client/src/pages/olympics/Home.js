import React from "react";
import { Link } from "react-router-dom";
import NewsFeed from "../../components/olympics/NewsFeed";
import PoolHomeActions from "../../components/PoolHomeActions";
import PoolEmoji from "../../components/PoolEmoji";
import PoolCreditsSubtitle from "../../components/PoolCreditsSubtitle";

export default function Home() {
  return (
    <>
      <div className="home-hero">
        <div className="hero-content">
          <h1><PoolEmoji gameKey="olympics" /> Fantasy Olympics Salary Cap</h1>
          <PoolCreditsSubtitle gameKey="olympics" />
          <p>
            Draft countries. Rack up the medals.  
            Chase Olympic glory.
          </p>

          <div className="hero-actions">
            <PoolHomeActions gameKey="olympics" />

            <a
              href="https://olympics.com/en/olympic-games"
              target="_blank"
              rel="noreferrer"
              className="secondary-btn"
            >
              Official Olympic Site
            </a>
          </div>
        </div>
      </div>

      <div className="home-section">
        <h2>How It Works</h2>

        <div className="steps">
          <Link to="/olympics/myroster" className="step step-link">
            <span>1: </span>
            Build your roster under the $150 salary cap 🎿
          </Link>

          <Link to="/olympics/scoreboard" className="step step-link">
            <span>2: </span>
            Climb the leaderboard 🏂
          </Link>

          <Link to="/olympics/standings" className="step step-link">
            <span>3: </span>
            Chase Olympic Glory 🥇
          </Link>
        </div>
      </div>
      <NewsFeed/>
    </>
  );
}
