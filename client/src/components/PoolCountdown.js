import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const GOLD = "#d4af37";
const GRAY = "#9ca3af";
const DARK_BORDER = "#334155";

// --- 3D Flipping Digit Component ---
function SingleFlipCard({ value, compact = false }) {
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
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const currentToShow = isFlipping ? displayVal : String(value);
    const prevToShow = isFlipping ? prevVal : String(value);

    const unitWidth = compact ? '14px' : '20px';
    const unitHeight = compact ? '22px' : '34px';
    const fontSize = compact ? '11px' : '17px';

    return (
        <div className={`flip-card-unit ${compact ? 'compact' : ''} ${isFlipping ? 'flipping' : ''}`} style={{ width: unitWidth, height: unitHeight, fontSize }}>
            <div className="top-static"><span>{currentToShow}</span></div>
            <div className="bottom-static">
                <span>{prevToShow}</span>
                <div className="bottom-shade"></div>
            </div>
            <div className="flipper">
                <div className="front"><span>{prevToShow}</span></div>
                <div className="back">
                    <span>{currentToShow}</span>
                    <div className="bottom-shade"></div>
                </div>
            </div>
        </div>
    );
}

// --- FORMAT TIME HELPER ---
function formatTime(diff) {
    const msPerSecond = 1000;
    const msPerMinute = msPerSecond * 60;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const msPerYear = msPerDay * 365.25;

    let years = Math.floor(diff / msPerYear);
    let remainingAfterYears = diff % msPerYear;

    if (years < 0) {
        years = 0;
        remainingAfterYears = diff;
    }

    const days = Math.floor(remainingAfterYears / msPerDay);
    const remainingAfterDays = remainingAfterYears % msPerDay;
    const hours = Math.floor(remainingAfterDays / msPerHour);
    const remainingAfterHours = remainingAfterDays % msPerHour;
    const minutes = Math.floor(remainingAfterHours / msPerMinute);
    const remainingAfterMinutes = remainingAfterHours % msPerMinute;
    const seconds = Math.floor(remainingAfterMinutes / msPerSecond);

    return {
        y: String(years),
        d: String(days),
        h: String(hours).padStart(2, "0"),
        m: String(minutes).padStart(2, "0"),
        s: String(seconds).padStart(2, "0"),
    };
}

export default function PoolCountdown({ poolData, mode, isDarkMode, compact = false, daysAndHoursOnly = false }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [isSeries, setIsSeries] = useState(false);
    const token = localStorage.getItem("token");

    const gameKey = poolData?.game_key;
    const lockDate = poolData?.lock_date;
    const openDate = poolData?.open_date;
    const endDate = poolData?.end_date;
    const isActive = poolData?.is_active === true || poolData?.is_active === 1 || poolData?.is_active === "true";

    useEffect(() => {
        if (poolData?.games_model_name && poolData.games_model_name.toLowerCase().includes('series')) {
            setIsSeries(true);
        } else if (poolData?.sport && poolData.sport.toLowerCase().includes('baseball')) {
            setIsSeries(true);
        }
    }, [poolData]);

    useEffect(() => {
        let timer;
        let isMounted = true;

        const now = new Date();
        const openTime = openDate ? new Date(openDate) : null;
        const lockTime = lockDate ? new Date(lockDate) : null;
        const endTime = endDate ? new Date(endDate) : null;

        const isBeforeOpen = !isActive || (openTime && now < openTime);
        const isPreStart = isActive && lockTime && now >= (openTime || 0) && now < lockTime;
        const isLiveMode = mode === 'live';

        if (isLiveMode && endTime) {
            timer = setInterval(() => {
                const diff = endTime - new Date();
                if (diff <= 0) {
                    if (isMounted) setTimeLeft(null);
                    clearInterval(timer);
                } else if (isMounted) setTimeLeft(formatTime(diff));
            }, 1000);
        } else if (isBeforeOpen && openTime) {
            timer = setInterval(() => {
                const diff = openTime - new Date();
                if (diff <= 0) {
                    if (isMounted) setTimeLeft(null);
                    clearInterval(timer);
                } else if (isMounted) setTimeLeft(formatTime(diff));
            }, 1000);
        } else if (isPreStart && lockTime) {
            timer = setInterval(() => {
                const diff = lockTime - new Date();
                if (diff <= 0) {
                    if (isMounted) setTimeLeft(null);
                    clearInterval(timer);
                } else if (isMounted) setTimeLeft(formatTime(diff));
            }, 1000);
        } else if (isActive && gameKey && !isLiveMode) {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const fetchNextGame = async () => {
                try {
                    const res = await axios.get(`/api/pools/next-game?game_key=${gameKey}`, { headers });
                    const nextGame = res.data;

                    if (nextGame && isMounted) {
                        if (nextGame.games_model_name && nextGame.games_model_name.toLowerCase().includes('series')) {
                            setIsSeries(true);
                        }
                        const gameTime = new Date(nextGame.game_date || nextGame.date);
                        if (timer) clearInterval(timer);
                        timer = setInterval(() => {
                            const diff = gameTime - new Date();
                            if (diff <= 0) {
                                clearInterval(timer);
                                fetchNextGame();
                            } else if (isMounted) setTimeLeft(formatTime(diff));
                        }, 1000);
                    } else if (isMounted) setTimeLeft(null);
                } catch (err) { console.error("Error fetching countdown:", err); }
            };
            fetchNextGame();
        } else if (isMounted) setTimeLeft(null);

        return () => {
            isMounted = false;
            if (timer) clearInterval(timer);
        };
    }, [gameKey, lockDate, openDate, endDate, isActive, mode, token]);

    if (!timeLeft) return <span style={{ fontSize: compact ? "10px" : "12px", color: GRAY, fontStyle: "italic" }}>⚡ Check Status</span>;

    const now = new Date();
    const openTime = openDate ? new Date(openDate) : null;
    const lockTime = lockDate ? new Date(lockDate) : null;
    const isBeforeOpen = !isActive || (openTime && now < openTime);
    const isPreStart = isActive && lockTime && now >= (openTime || 0) && now < lockTime;

    let labelText = isSeries ? "NEXT SERIES:" : "NEXT GAME:";
    if (mode === 'live') labelText = "ENDS:";
    else if (isBeforeOpen) labelText = "OPENS:";
    else if (isPreStart) labelText = "LOCKS:";

    const showYears = parseInt(timeLeft.y, 10) > 0;

    const renderFlipPair = (valStr, subLabel, digits = 2) => {
        const padded = String(valStr).padStart(digits, "0");
        const digitsArr = padded.split("");
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", gap: compact ? "1px" : "2px" }}>
                    {digitsArr.map((d, i) => (
                        <SingleFlipCard key={`${subLabel}-${i}`} value={d} compact={compact} />
                    ))}
                </div>
                <span style={{ fontSize: compact ? "5px" : "8px", color: GOLD, fontWeight: "800", marginTop: "2px", textTransform: "uppercase" }}>{subLabel}</span>
            </div>
        );
    };

    const containerBg = isDarkMode ? "#0b0f19" : "#1e293b";
    const containerBorder = isDarkMode ? DARK_BORDER : GOLD;

    return (
        <>
            <style>{`
                .flip-card-unit {
                    position: relative; display: flex; flex-direction: column; 
                    font-weight: 900; color: #ffffff; perspective: 300px;
                    font-family: 'Courier New', Courier, monospace; background: #111; border-radius: 4px;
                }
                .flip-card-unit .top-static, .flip-card-unit .bottom-static { position: absolute; left: 0; width: 100%; height: 50%; overflow: hidden; }
                
                .flip-card-unit .top-static { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 4px 4px 0 0; }
                .flip-card-unit .top-static span { position: absolute; top: 0; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
                .flip-card-unit.compact .top-static span { height: 22px; line-height: 22px; }

                .flip-card-unit .bottom-static { bottom: 0; background: #2c2c2c; border-top: 1px solid #111; border-radius: 0 0 4px 4px; }
                .flip-card-unit .bottom-static span { position: absolute; top: -17px; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
                .flip-card-unit.compact .bottom-static span { top: -11px; height: 22px; line-height: 22px; }

                .flip-card-unit .bottom-shade { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%); pointer-events: none; }
                .flip-card-unit .flipper { position: absolute; width: 100%; height: 50%; top: 0; transform-origin: bottom; transform-style: preserve-3d; z-index: 3; }
                .flip-card-unit.flipping .flipper { transition: transform 0.4s ease-in-out; transform: rotateX(-180deg); }
                .flip-card-unit .front, .flip-card-unit .back { position: absolute; left: 0; width: 100%; height: 100%; overflow: hidden; backface-visibility: hidden; }
                
                .flip-card-unit .front { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 4px 4px 0 0; }
                .flip-card-unit .front span { position: absolute; top: 0; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
                .flip-card-unit.compact .front span { height: 22px; line-height: 22px; }

                .flip-card-unit .back { bottom: 0; background: #2c2c2c; transform: rotateX(180deg); border-radius: 0 0 4px 4px; }
                .flip-card-unit .back span { position: absolute; top: -17px; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
                .flip-card-unit.compact .back span { top: -11px; height: 22px; line-height: 22px; }
            `}</style>
            <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: containerBg, padding: compact ? "2px 6px" : "5px 8px", borderRadius: "6px", border: `1px solid ${containerBorder}`, maxWidth: "100%", overflow: "hidden" }}>
                <span style={{ color: "#ffffff", fontSize: compact ? "7px" : "9px", fontWeight: "800", marginRight: "6px", textTransform: "uppercase" }}>{labelText}</span>
                <div style={{ display: "flex", alignItems: "center", gap: compact ? "2px" : "3px", flexWrap: "nowrap" }}>
                    {showYears && (
                        <>
                            {renderFlipPair(timeLeft.y, "Yrs", 2)}
                            <span style={{ color: "#ffffff", fontSize: compact ? "10px" : "14px", fontWeight: "bold", paddingBottom: compact ? "6px" : "10px" }}>:</span>
                        </>
                    )}
                    {renderFlipPair(timeLeft.d, "Days", timeLeft.d.length >= 3 ? 3 : timeLeft.d.length)}
                    <span style={{ color: "#ffffff", fontSize: compact ? "10px" : "14px", fontWeight: "bold", paddingBottom: compact ? "6px" : "10px" }}>:</span>
                    {renderFlipPair(timeLeft.h, "Hrs", 2)}
                    
                    {!daysAndHoursOnly && (
                        <>
                            <span style={{ color: "#ffffff", fontSize: compact ? "10px" : "14px", fontWeight: "bold", paddingBottom: compact ? "6px" : "10px" }}>:</span>
                            {renderFlipPair(timeLeft.m, "Min", 2)}
                            <span style={{ color: "#ffffff", fontSize: compact ? "10px" : "14px", fontWeight: "bold", paddingBottom: compact ? "6px" : "10px" }}>:</span>
                            {renderFlipPair(timeLeft.s, "Sec", 2)}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}