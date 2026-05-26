import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const SCOREBOARD_UNLOCK = new Date("2026-02-07T09:00:00Z"); // 3:00 AM CT

export default function Scoreboard() {
  const [users, setUsers] = useState([]);
  const scrollRef = useRef(null);
  const topScrollRef = useRef(null);

  const now = new Date();
  const locked = now < SCOREBOARD_UNLOCK;

  /* -------------------- DATA -------------------- */
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get("/api/olympics/scoreboard");
        setUsers(res.data || []);
      } catch (err) {
        console.error("Failed to load scoreboard:", err);
      }
    }
    load();
  }, []);

  /* -------------------- SCROLL SYNC (DESKTOP) -------------------- */
  useEffect(() => {
    if (!scrollRef.current || !topScrollRef.current) return;

    const main = scrollRef.current;
    const top = topScrollRef.current;

    const syncFromMain = () => (top.scrollLeft = main.scrollLeft);
    const syncFromTop = () => (main.scrollLeft = top.scrollLeft);

    main.addEventListener("scroll", syncFromMain);
    top.addEventListener("scroll", syncFromTop);

    return () => {
      main.removeEventListener("scroll", syncFromMain);
      top.removeEventListener("scroll", syncFromTop);
    };
  }, []);

  /* -------------------- RENDER HELPERS -------------------- */
  const renderCountries = (countries = []) => {
    const mid = Math.ceil(countries.length / 2);
    const col1 = countries.slice(0, mid);
    const col2 = countries.slice(mid);

    const renderCol = (col) =>
      col.map((c, i) => (
        <div key={i} className="country-row">
          <span>{c.country_name}</span>
          <strong>{c.points}</strong>
        </div>
      ));

    return (
      <div className="countries-grid">
        <div>{renderCol(col1)}</div>
        <div>{renderCol(col2)}</div>
      </div>
    );
  };

  /* -------------------- LOCKED STATE -------------------- */
  if (locked) {
    return (
      <div className="scoreboard-locked">
        <h2>🏅 Scoreboard Locked</h2>
        <p>
          The Olympic Pool scoreboard goes live at
          <br />
          <strong>3:00 AM CT · Saturday, February 7</strong>
        </p>
      </div>
    );
  }

  /* -------------------- RENDER -------------------- */
  return (
    <div className="scoreboard">
      <h2 className="scoreboard-title">🏆Scoreboard🥇</h2>

      {/* Sticky top scrollbar (desktop only) */}
      <div ref={topScrollRef} className="scoreboard-top-scroll">
        <div style={{ width: `${users.length * 276}px`, height: "1px" }} />
      </div>

      {/* Main scroll container */}
      <div ref={scrollRef} className="scoreboard-scroll">
        <div className="scoreboard-cards">
          {users.length === 0 && <div>No entries yet.</div>}

          {users.map((user, idx) => (
            <div key={user.id} className="scoreboard-card">
              <div className="scoreboard-card-header">
                {idx === 0 && "🥇 "}
                {idx === 1 && "🥈 "}
                {idx === 2 && "🥉 "}
                {user.name}
                <div className="scoreboard-total">
                  Total: {user.total} pts
                </div>
              </div>

              <div className="scoreboard-countries">
                {renderCountries(user.countries)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}