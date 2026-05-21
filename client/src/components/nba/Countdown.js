import React, { useEffect, useState } from "react";
import axios from "axios";

// First tip-off: Saturday April 18 at noon Central (UTC-5 in April)
const FIRST_TIP = new Date("2026-04-18T17:00:00Z");
const LOCK_BUFFER_MS = 0; // locks at tip-off

function msToHMS(ms) {
    return {
        hours:   Math.floor(ms / (1000 * 60 * 60)),
        minutes: Math.floor((ms / (1000 * 60)) % 60),
        seconds: Math.floor((ms / 1000) % 60),
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

function SeriesLine({ game }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 4, marginTop: 4, fontSize: "0.75rem",
        }}>
            {game.away_logo && <img src={game.away_logo} width={14} alt="" />}
            <span>{game.away_team}</span>
            <span style={{ color: "#9ca3af" }}>vs</span>
            {game.home_logo && <img src={game.home_logo} width={14} alt="" />}
            <span>{game.home_team}</span>
        </div>
    );
}

// ── Pre-pool: static countdown to first tip-off ───────────────────────────────

function PrePoolCountdown() {
    const getTimeLeft = () => {
        const diff = FIRST_TIP - new Date();
        if (diff <= 0) return null;
        return {
            days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((diff / (1000 * 60)) % 60),
            seconds: Math.floor((diff / 1000) % 60),
        };
    };

    const [timeLeft, setTimeLeft] = useState(getTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!timeLeft) return null;

    return (
        <div className="countdown-card">
            <div className="countdown-title">⏳ GAME STARTS IN:</div>
            <div className="countdown-grid">
                <TimeBox label="Days"    value={timeLeft.days} />
                <TimeBox label="Hours"   value={timeLeft.hours} />
                <TimeBox label="Minutes" value={timeLeft.minutes} />
                <TimeBox label="Seconds" value={timeLeft.seconds} />
            </div>
            <div className="countdown-sub">Round 1 · Sat Apr 18 · Noon CT</div>
        </div>
    );
}

// ── Live: next lock and next tip-off from DB ──────────────────────────────────

function LiveCountdown() {
    const [nextLockTime,  setNextLockTime]  = useState(null);
    const [nextLockGames, setNextLockGames] = useState([]);
    const [nextTipTime,   setNextTipTime]   = useState(null);
    const [nextTipGames,  setNextTipGames]  = useState([]);
    const [lockTimeLeft,  setLockTimeLeft]  = useState(null);
    const [tipTimeLeft,   setTipTimeLeft]   = useState(null);

    useEffect(() => {
        axios.get("/api/nba/series").then(res => {
            const now = new Date();
            const unlocked = res.data.filter(g => !g.locked && g.game_date);

            // Lock time = game_date - 1 hour
            const upcomingLocks = unlocked
                .map(g => ({ ...g, lock_time: new Date(new Date(g.game_date) - LOCK_BUFFER_MS) }))
                .filter(g => g.lock_time > now)
                .sort((a, b) => a.lock_time - b.lock_time);

            if (upcomingLocks.length > 0) {
                const nextLock = upcomingLocks[0].lock_time;
                setNextLockTime(nextLock);
                setNextLockGames(
                    upcomingLocks.filter(g => Math.abs(g.lock_time - nextLock) < 5 * 60 * 1000)
                );
            }

            // Tip-off = game_date
            const upcomingTips = unlocked
                .map(g => ({ ...g, tip_time: new Date(g.game_date) }))
                .filter(g => g.tip_time > now)
                .sort((a, b) => a.tip_time - b.tip_time);

            if (upcomingTips.length > 0) {
                const nextTip = upcomingTips[0].tip_time;
                setNextTipTime(nextTip);
                setNextTipGames(
                    upcomingTips.filter(g => Math.abs(g.tip_time - nextTip) < 5 * 60 * 1000)
                );
            }
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!nextLockTime) return;
        const tick = () => {
            const diff = nextLockTime - new Date();
            if (diff <= 0) { setLockTimeLeft(null); return; }
            setLockTimeLeft(msToHMS(diff));
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [nextLockTime]);

    useEffect(() => {
        if (!nextTipTime) return;
        const tick = () => {
            const diff = nextTipTime - new Date();
            if (diff <= 0) { setTipTimeLeft(null); return; }
            setTipTimeLeft(msToHMS(diff));
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [nextTipTime]);

    if (!nextLockTime && !nextTipTime) return null;

    return (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", padding: "0 12px" }}>
            {nextLockTime && (
                <div className="countdown-card" style={{ flex: 1, minWidth: 140, maxWidth: "none", padding: "14px 12px" }}>
                    <div className="countdown-title" style={{ fontSize: "0.95rem" }}>🔒 Picks Lock In</div>
                    {lockTimeLeft ? (
                        <div className="countdown-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                            <TimeBox label="Hrs" value={lockTimeLeft.hours} />
                            <TimeBox label="Min" value={lockTimeLeft.minutes} />
                            <TimeBox label="Sec" value={lockTimeLeft.seconds} />
                        </div>
                    ) : (
                        <div style={{ color: "#facc15", fontWeight: 700, fontSize: "0.9rem", margin: "8px 0" }}>
                            Locking now!
                        </div>
                    )}
                    <div className="countdown-sub">
                        {nextLockGames.map(g => <SeriesLine key={g.id} game={g} />)}
                    </div>
                </div>
            )}

            {nextTipTime && (
                <div className="countdown-card" style={{ flex: 1, minWidth: 140, maxWidth: "none", padding: "14px 12px" }}>
                    <div className="countdown-title" style={{ fontSize: "0.95rem" }}>🏀 Next Tip Off</div>
                    {tipTimeLeft ? (
                        <div className="countdown-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                            <TimeBox label="Hrs" value={tipTimeLeft.hours} />
                            <TimeBox label="Min" value={tipTimeLeft.minutes} />
                            <TimeBox label="Sec" value={tipTimeLeft.seconds} />
                        </div>
                    ) : (
                        <div style={{ color: "#facc15", fontWeight: 700, fontSize: "0.9rem", margin: "8px 0" }}>
                            Tipping off now!
                        </div>
                    )}
                    <div className="countdown-sub">
                        {nextTipGames.map(g => <SeriesLine key={g.id} game={g} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main export — switches at first tip-off ───────────────────────────────────

export default function NbaCountdown() {
    const [poolStarted, setPoolStarted] = useState(new Date() >= FIRST_TIP);

    useEffect(() => {
        if (poolStarted) return;
        const diff = FIRST_TIP - new Date();
        const timer = setTimeout(() => setPoolStarted(true), diff);
        return () => clearTimeout(timer);
    }, [poolStarted]);

    return poolStarted ? <LiveCountdown /> : <PrePoolCountdown />;
}