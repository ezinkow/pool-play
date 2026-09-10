import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PoolCountdown({ poolData, mode }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [subText, setSubText] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    let timer;

    if (mode === "pre-start" && poolData?.lock_date) {
      const target = new Date(poolData.lock_date);
      timer = setInterval(() => {
        const diff = target - new Date();
        if (diff <= 0) {
          setTimeLeft(null);
          clearInterval(timer);
        } else {
          setTimeLeft(formatTime(diff));
          setSubText(`Until ${poolData.game_label || "Pool"} Entries Close`);
        }
      }, 1000);

    } else if (mode === "active" && poolData?.games_api_path) {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      axios.get(poolData.games_api_path, { headers }).then(res => {
        const now = new Date();
        const games = res.data.games || res.data || [];
        const upcoming = games
          .filter(g => new Date(g.game_date || g.date) > now)
          .sort((a, b) => new Date(a.game_date || a.date) - new Date(b.game_date || b.date));

        if (upcoming.length > 0) {
          const nextGame = upcoming[0];
          timer = setInterval(() => {
            const diff = new Date(nextGame.game_date || nextGame.date) - new Date();
            if (diff <= 0) {
              clearInterval(timer);
            } else {
              setTimeLeft(formatTime(diff));
              setSubText(`Next Game: ${nextGame.away_team} @ ${nextGame.home_team}`);
            }
          }, 1000);
        }
      }).catch(err => console.error("Error fetching games for countdown:", err));
    }

    return () => clearInterval(timer);
  }, [mode, poolData, token]);

  if (!timeLeft) return <div className="countdown-card">🏀 Pool is active—games are currently underway!</div>;

  return (
    <div className="countdown-card">
      <div className="countdown-title">⏳ {mode === "pre-start" ? "Pool Entry Closes In" : "Next Game Starts In"}</div>
      <div className="countdown-grid">
        <TimeBox label="Days" value={timeLeft.d} />
        <TimeBox label="Hours" value={timeLeft.h} />
        <TimeBox label="Minutes" value={timeLeft.m} />
        <TimeBox label="Seconds" value={timeLeft.s} />
      </div>
      <div className="countdown-sub">{subText}</div>
    </div>
  );
}

function formatTime(diff) {
  return {
    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
    h: Math.floor((diff / (1000 * 60 * 60)) % 24),
    m: Math.floor((diff / (1000 * 60)) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

function TimeBox({ label, value }) {
  return (
    <div className="countdown-box">
      <div className="countdown-number">{String(value).padStart(2, "0")}</div>
      <div className="countdown-label">{label}</div>
    </div>
  );
}