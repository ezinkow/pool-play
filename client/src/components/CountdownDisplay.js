import React, { useEffect, useState } from "react";

export default function PoolCountdown() {
  // 👉 Set pool start time (Central Time)
  const poolStart = new Date("2026-04-19T16:15:00Z");

  const getTimeLeft = () => {
    const diff = poolStart - new Date();

    if (diff <= 0) return null;

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    return (
      <div className="countdown-card">
        🏀 The pool has started!
      </div>
    );
  }

  return (
    <div className="countdown-card">
      <div className="countdown-title">
        ⏳ Pool Starts In
      </div>

      <div className="countdown-grid">
        <TimeBox label="Days" value={timeLeft.days} />
        <TimeBox label="Hours" value={timeLeft.hours} />
        <TimeBox label="Minutes" value={timeLeft.minutes} />
        <TimeBox label="Seconds" value={timeLeft.seconds} />
      </div>

      <div className="countdown-sub">
        Round 1 Tip-off
      </div>
    </div>
  );
}

function TimeBox({ label, value }) {
  return (
    <div className="countdown-box">
      <div className="countdown-number">{value}</div>
      <div className="countdown-label">{label}</div>
    </div>
  );
}