import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

// 3D Flipping Digit Component for smooth mechanical downward animation
function SingleFlipCard({ value }) {
    const [displayVal, setDisplayVal] = useState(String(value));
    const [prevVal, setPrevVal] = useState(String(value));
    const [isFlipping, setIsFlipping] = useState(false);
    const refVal = useRef(value);

    useEffect(() => {
        const strVal = String(value);
        if (strVal !== refVal.current) {
            setPrevVal(refVal.current);
            setDisplayVal(strVal);
            setIsFlipping(true);
            refVal.current = strVal;

            const timer = setTimeout(() => {
                setIsFlipping(false);
            }, 400); // Matches CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [value]);

    const currentToShow = isFlipping ? displayVal : String(value);
    const prevToShow = isFlipping ? prevVal : String(value);

    return (
        <div className={`flip-card-unit ${isFlipping ? 'flipping' : ''}`}>
            <div className="top-static"><span>{currentToShow}</span></div>
            <div className="bottom-static"><span>{prevToShow}</span></div>

            <div className="flipper">
                <div className="front"><span>{prevToShow}</span></div>
                <div className="back"><span>{currentToShow}</span></div>
            </div>
        </div>
    );
}

export default function PoolCountdown({ poolData, mode }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [subText, setSubText] = useState("");

    const token = localStorage.getItem("token");

    useEffect(() => {
        let timer;
        let isMounted = true;

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

            // Helper function to fetch and find the absolute next game across multiple weeks if needed
            const fetchNextGame = async () => {
                try {
                    let basePath = poolData.games_api_path;
                    let baseWeek = poolData.current_week || 1;

                    // If path has a week query param, strip it so we can search sequentially
                    if (basePath.includes("week=")) {
                        basePath = basePath.split("?")[0];
                    }

                    let foundGame = null;

                    // Scan up to 3 consecutive weeks ahead to find the absolute next upcoming game
                    for (let w = Number(baseWeek); w <= Number(baseWeek) + 3; w++) {
                        const separator = basePath.includes("?") ? "&" : "?";
                        const queryUrl = `${basePath}${separator}week=${w}`;

                        const res = await axios.get(queryUrl, { headers });
                        const games = res.data.games || res.data || [];

                        const now = new Date();
                        const upcoming = games
                            .filter(g => new Date(g.game_date || g.date) > now)
                            .sort((a, b) => new Date(a.game_date || a.date) - new Date(b.game_date || b.date));

                        if (upcoming.length > 0) {
                            foundGame = upcoming[0];
                            break;
                        }
                    }

                    if (foundGame && isMounted) {
                        const gameTime = new Date(foundGame.game_date || foundGame.date);
                        timer = setInterval(() => {
                            const diff = gameTime - new Date();
                            if (diff <= 0) {
                                clearInterval(timer);
                                // Re-run to fetch subsequent game when this one passes
                                fetchNextGame();
                            } else {
                                setTimeLeft(formatTime(diff));
                                setSubText(`Next Game: ${foundGame.away_team} @ ${foundGame.home_team}`);
                            }
                        }, 1000);
                    }
                } catch (err) {
                    console.error("Error fetching games for countdown:", err);
                }
            };

            fetchNextGame();
        }

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [mode, poolData, token]);

    if (!timeLeft) return <div className="countdown-card" style={{ whiteSpace: "nowrap" }}>🏀 Pool is active—games are currently underway! 🏈</div>;

    return (
        <>
            <style>{`
                .flip-card-unit {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    width: 26px;
                    height: 36px;
                    font-size: 22px;
                    font-weight: 900;
                    color: #01da25;
                    perspective: 300px;
                    font-family: 'Courier New', Courier, monospace;
                    background: #111;
                    border-radius: 4px;
                    -webkit-font-smoothing: antialiased;
                }
                .flip-card-unit .top-static, .flip-card-unit .bottom-static {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 50%;
                    overflow: hidden;
                }
                .flip-card-unit .top-static {
                    top: 0;
                    background: #181818; /* Dark Black Top */
                    border-bottom: 1px solid #000;
                    border-radius: 4px 4px 0 0;
                }
                .flip-card-unit .top-static span {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 36px;
                    line-height: 36px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                }
                .flip-card-unit .bottom-static {
                    bottom: 0;
                    background: #2c2c2c; /* Lighter Gray Bottom */
                    border-top: 1px solid #111;
                    border-radius: 0 0 4px 4px;
                }
                .flip-card-unit .bottom-static span {
                    position: absolute;
                    top: -18px;
                    left: 0;
                    width: 100%;
                    height: 36px;
                    line-height: 36px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                }
                .flip-card-unit .bottom-shade {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%);
                    pointer-events: none;
                }
                .flip-card-unit .flipper {
                    position: absolute;
                    width: 100%;
                    height: 50%;
                    top: 0;
                    transform-origin: bottom;
                    transform-style: preserve-3d;
                    z-index: 3;
                    transition: none;
                }
                .flip-card-unit.flipping .flipper {
                    transition: transform 0.4s ease-in-out;
                    transform: rotateX(-180deg);
                }
                .flip-card-unit .front, .flip-card-unit .back {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    backface-visibility: hidden;
                }
                .flip-card-unit .front {
                    top: 0;
                    background: #181818; /* Front of flipper matches dark black top */
                    border-bottom: 1px solid #000;
                    border-radius: 4px 4px 0 0;
                }
                .flip-card-unit .front span {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 36px;
                    line-height: 36px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                }
                .flip-card-unit .back {
                    bottom: 0;
                    background: #2c2c2c; /* Back of flipper matches lighter gray bottom */
                    transform: rotateX(180deg);
                    border-radius: 0 0 4px 4px;
                }
                .flip-card-unit .back span {
                    position: absolute;
                    top: -18px;
                    left: 0;
                    width: 100%;
                    height: 36px;
                    line-height: 36px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                }
            `}</style>
            <div className="countdown-card">
                <div className="countdown-title">⏳ {mode === "pre-start" ? "Pool Entry Closes In" : "Next Game Starts In"}</div>
                <div className="countdown-grid" style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center" }}>
                    <TimeBox label="Days" value={timeLeft.d} />
                    <span style={{ color: "#01da25", fontSize: "16px", fontWeight: "bold" }}>:</span>
                    <TimeBox label="Hours" value={timeLeft.h} />
                    <span style={{ color: "#01da25", fontSize: "16px", fontWeight: "bold" }}>:</span>
                    <TimeBox label="Minutes" value={timeLeft.m} />
                    <span style={{ color: "#01da25", fontSize: "16px", fontWeight: "bold" }}>:</span>
                    <TimeBox label="Seconds" value={timeLeft.s} />
                </div>
                <div className="countdown-sub">{subText}</div>
            </div>
        </>
    );
}

function formatTime(diff) {
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return {
        d: String(d).padStart(2, "0"),
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
    };
}

function TimeBox({ label, value }) {
    const strVal = String(value).padStart(2, "0");
    const tens = strVal[0] || '0';
    const ones = strVal[1] || '0';

    return (
        <div className="countdown-box" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "3px" }}>
                <SingleFlipCard value={tens} />
                <SingleFlipCard value={ones} />
            </div>
            <div className="countdown-label" style={{ fontSize: "9px", color: "#c89d3c", fontWeight: 700, textTransform: "uppercase", marginTop: "4px" }}>{label}</div>
        </div>
    );
}