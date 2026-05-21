import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PoolCountdown() {
    const [nextLockTime, setNextLockTime] = useState(null);
    const [nextLockGames, setNextLockGames] = useState([]);
    const [nextTipTime, setNextTipTime] = useState(null);
    const [nextTipGames, setNextTipGames] = useState([]);
    const [lockTimeLeft, setLockTimeLeft] = useState(null);
    const [tipTimeLeft, setTipTimeLeft] = useState(null);

    useEffect(() => {
        axios.get("/api/bracket/games").then(res => {
            const now = new Date();

            // Next line lock
            const upcomingLocks = res.data
                .filter(g => new Date(g.line_locked_time) > now)
                .sort((a, b) => new Date(a.line_locked_time) - new Date(b.line_locked_time));

            if (upcomingLocks.length > 0) {
                const nextLock = new Date(upcomingLocks[0].line_locked_time);
                const lockWindow = upcomingLocks.filter(
                    g => Math.abs(new Date(g.line_locked_time) - nextLock) < 5 * 60 * 1000
                );
                setNextLockTime(nextLock);
                setNextLockGames(lockWindow);
            }

            // Next tip off
            const upcomingTips = res.data
                .filter(g => new Date(g.game_date) > now)
                .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

            if (upcomingTips.length > 0) {
                const nextTip = new Date(upcomingTips[0].game_date);
                const tipWindow = upcomingTips.filter(
                    g => Math.abs(new Date(g.game_date) - nextTip) < 5 * 60 * 1000
                );
                setNextTipTime(nextTip);
                setNextTipGames(tipWindow);
            }
        });
    }, []);

    useEffect(() => {
        if (!nextLockTime) return;
        const tick = () => {
            const diff = nextLockTime - new Date();
            if (diff <= 0) { setLockTimeLeft(null); return; }
            setLockTimeLeft({
                hours: Math.floor(diff / (1000 * 60 * 60)),
                minutes: Math.floor((diff / (1000 * 60)) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            });
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
            setTipTimeLeft({
                hours: Math.floor(diff / (1000 * 60 * 60)),
                minutes: Math.floor((diff / (1000 * 60)) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            });
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [nextTipTime]);

    if (!nextLockTime && !nextTipTime) return null;

    return (
        <div style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
            padding: "0 12px"  // mobile-friendly, matches rest of app
        }}>
            {/* LINE LOCK COUNTDOWN */}
            {nextLockTime && (
                <div className="countdown-card" style={{ flex: 1, minWidth: 140, maxWidth: "none", padding: "14px 12px" }}>
                    <div className="countdown-title" style={{ fontSize: "0.95rem" }}>
                        🔒 Next Lines Lock
                    </div>
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
                        {nextLockGames.map(g => (
                            <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4, fontSize: "0.75rem" }}>
                                <img src={g.away_logo} width={14} alt="" />
                                <span>{g.away_team}</span>
                                <span style={{ color: "#9ca3af" }}>@</span>
                                <img src={g.home_logo} width={14} alt="" />
                                <span>{g.home_team}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TIP OFF COUNTDOWN */}
            {nextTipTime && (
                <div className="countdown-card" style={{ flex: 1, minWidth: 140, maxWidth: "none", padding: "14px 12px" }}>
                    <div className="countdown-title" style={{ fontSize: "0.95rem" }}>
                        🏀 Next Tip Off
                    </div>
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
                        {nextTipGames.map(g => (
                            <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4, fontSize: "0.75rem" }}>
                                <img src={g.away_logo} width={14} alt="" />
                                <span>{g.away_team}</span>
                                <span style={{ color: "#9ca3af" }}>@</span>
                                <img src={g.home_logo} width={14} alt="" />
                                <span>{g.home_team}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TimeBox({ label, value }) {
    return (
        <div className="countdown-box">
            <div className="countdown-number">{String(value).padStart(2, "0")}</div>
            <div className="countdown-label">{label}</div>
        </div>
    );
}