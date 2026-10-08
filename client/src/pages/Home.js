import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from '../../src/images/logo.jpg';

const DEEP_NAVY = "#061a33";
const AQUA_BLUE = "#0ea5e9";
const GOLD = "#d4af37";
const GRAY = "#9ca3af";
const GREEN = "#10b981";
const DARK_BORDER = "#334155";

// --- 3D Flipping Digit Component (Exact Admin Hub Style) ---
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
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const currentToShow = isFlipping ? displayVal : String(value);
    const prevToShow = isFlipping ? prevVal : String(value);

    return (
        <div className={`flip-card-unit ${isFlipping ? 'flipping' : ''}`}>
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

// --- POOL COUNTDOWN COMPONENT ---
function PoolCountdown({ poolData, mode, isDarkMode }) {
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

    if (!timeLeft) return <span style={{ fontSize: "12px", color: GRAY, fontStyle: "italic" }}>⚡ Check Status</span>;

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
                <div style={{ display: "flex", gap: "2px" }}>
                    {digitsArr.map((d, i) => (
                        <SingleFlipCard key={`${subLabel}-${i}`} value={d} />
                    ))}
                </div>
                <span style={{ fontSize: "8px", color: GOLD, fontWeight: "800", marginTop: "3px", textTransform: "uppercase" }}>{subLabel}</span>
            </div>
        );
    };

    const containerBg = isDarkMode ? "#0b0f19" : "#1e293b";
    const containerBorder = isDarkMode ? DARK_BORDER : GOLD;

    return (
        <>
            <style>{`
                .flip-card-unit {
                    position: relative; display: flex; flex-direction: column; width: ${showYears ? '17px' : '20px'}; height: 34px;
                    font-size: 17px; font-weight: 900; color: #ffffff; perspective: 300px;
                    font-family: 'Courier New', Courier, monospace; background: #111; border-radius: 4px;
                }
                .flip-card-unit .top-static, .flip-card-unit .bottom-static { position: absolute; left: 0; width: 100%; height: 50%; overflow: hidden; }
                .flip-card-unit .top-static { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 4px 4px 0 0; }
                .flip-card-unit .top-static span { position: absolute; top: 0; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
                .flip-card-unit .bottom-static { bottom: 0; background: #2c2c2c; border-top: 1px solid #111; border-radius: 0 0 4px 4px; }
                .flip-card-unit .bottom-static span { position: absolute; top: -17px; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
                .flip-card-unit .bottom-shade { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%); pointer-events: none; }
                .flip-card-unit .flipper { position: absolute; width: 100%; height: 50%; top: 0; transform-origin: bottom; transform-style: preserve-3d; z-index: 3; }
                .flip-card-unit.flipping .flipper { transition: transform 0.4s ease-in-out; transform: rotateX(-180deg); }
                .flip-card-unit .front, .flip-card-unit .back { position: absolute; left: 0; width: 100%; height: 100%; overflow: hidden; backface-visibility: hidden; }
                .flip-card-unit .front { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 4px 4px 0 0; }
                .flip-card-unit .front span { position: absolute; top: 0; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
                .flip-card-unit .back { bottom: 0; background: #2c2c2c; transform: rotateX(180deg); border-radius: 0 0 4px 4px; }
                .flip-card-unit .back span { position: absolute; top: -17px; left: 0; width: 100%; height: 34px; line-height: 34px; text-align: center; }
            `}</style>
            <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: containerBg, padding: "5px 8px", borderRadius: "8px", border: `1px solid ${containerBorder}`, maxWidth: "100%", overflow: "hidden" }}>
                <span style={{ color: "#ffffff", fontSize: "9px", fontWeight: "800", marginRight: "6px", textTransform: "uppercase" }}>{labelText}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "nowrap" }}>
                    {showYears && (
                        <>
                            {renderFlipPair(timeLeft.y, "Yrs", 2)}
                            <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>:</span>
                        </>
                    )}
                    {renderFlipPair(timeLeft.d, "Days", timeLeft.d.length >= 3 ? 3 : timeLeft.d.length)}
                    <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>:</span>
                    {renderFlipPair(timeLeft.h, "Hrs", 2)}
                    <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>:</span>
                    {renderFlipPair(timeLeft.m, "Min", 2)}
                    <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", paddingBottom: "10px" }}>:</span>
                    {renderFlipPair(timeLeft.s, "Sec", 2)}
                </div>
            </div>
        </>
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


// --- MAIN HOMEPAGE COMPONENT ---
export default function Home() {
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCards, setExpandedCards] = useState({});
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("poolplay_theme") !== "light");

    useEffect(() => {
        axios.get("/api/settings/active-states").then(res => {
            const dynamicCards = (res.data || []).map(row => {
                const key = row.game_key || row.route;
                return {
                    ...row,
                    key,
                    category: (row.sport || "other").toLowerCase().trim(),
                    open_date: new Date(row.open_date),
                    lock_date: new Date(row.lock_date),
                    end_date: row.end_date ? new Date(row.end_date) : new Date("2100-01-01"),
                    isActive: row.is_active === true || row.is_active === 1 || row.is_active === "true",
                };
            });
            setCards(dynamicCards);
            setLoading(false);
        }).catch(err => { console.error(err); setLoading(false); });
    }, []);

    const toggleTheme = () => {
        const nextMode = !isDarkMode;
        setIsDarkMode(nextMode);
        localStorage.setItem("poolplay_theme", nextMode ? "dark" : "light");
    };

    const categories = [
        { id: "all", label: "All Pools" },
        { id: "football", label: "🏈 Football" },
        { id: "basketball", label: "🏀 Basketball" },
        { id: "baseball", label: "⚾ Baseball" },
        { id: "tournaments", label: "🏆 Tournaments" },
    ];

    const filteredCards = useMemo(() => {
        return cards.filter(c => {
            const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
            const matchesSearch = searchQuery.trim() === "" ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [cards, selectedCategory, searchQuery]);

    const { live, upcoming, inactive } = useMemo(() => {
        const now = new Date();
        const buckets = { live: [], upcoming: [], inactive: [] };
        filteredCards.forEach(c => {
            if (!c.isActive) buckets.inactive.push(c);
            else if (now >= c.lock_date && now <= c.end_date) buckets.live.push(c);
            else if (now >= c.open_date && now < c.lock_date) buckets.upcoming.push(c);
            else buckets.inactive.push(c);
        });

        buckets.live.sort((a, b) => a.lock_date - b.lock_date);
        buckets.upcoming.sort((a, b) => a.lock_date - b.lock_date);
        buckets.inactive.sort((a, b) => a.open_date - b.open_date);
        return buckets;
    }, [filteredCards]);

    const renderCard = (card, group) => {
        const isExpanded = !!expandedCards[card.key];
        return (
            <div key={card.key} style={{
                background: isDarkMode ? (card.isActive ? "#1e293b" : "rgba(255, 255, 255, 0.08)") : (card.isActive ? "#ffffff" : "#f8fafc"),
                borderRadius: 12,
                borderLeft: `6px solid ${card.isActive ? (card.accent || GOLD) : GRAY}`,
                marginBottom: 14,
                overflow: "hidden",
                boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(212,175,55,0.06)",
                border: isDarkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                transition: "transform 0.2s ease"
            }}>
                <style>{`
                .pool-card-content-${card.key} {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                }
                .pool-card-titles-${card.key} {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 14px;
                    flex: 1;
                    min-width: 0;
                }
                .pool-card-text-group-${card.key} {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex: 1;
                    min-width: 0;
                }
                @media (max-width: 768px) {
                    .pool-card-content-${card.key} {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .pool-card-text-group-${card.key} {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                    }
                    .pool-card-right-${card.key} {
                        width: 100% !important;
                        justify-content: space-between !important;
                        margin-top: 10px !important;
                        padding-top: 10px !important;
                        border-top: ${isDarkMode ? "1px solid #334155" : "1px solid #e2e8f0"};
                    }
                }
            `}</style>

                <div onClick={() => setExpandedCards(p => ({ ...p, [card.key]: !p[card.key] }))} style={{ padding: "16px 20px", cursor: "pointer" }}>
                    <div className={`pool-card-content-${card.key}`}>

                        {/* Left & Middle: Emoji, Title, and Timer */}
                        <div className={`pool-card-titles-${card.key}`}>
                            <span style={{ fontSize: 28, flexShrink: 0 }}>{card.emoji || "🎮"}</span>
                            <div className={`pool-card-text-group-${card.key}`}>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: card.isActive ? (isDarkMode ? "#f8fafc" : DEEP_NAVY) : GRAY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</h3>
                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                                    {group === 'upcoming' && <PoolCountdown poolData={card} mode="upcoming" isDarkMode={isDarkMode} />}
                                    {group === 'live' && <PoolCountdown poolData={card} mode="active" isDarkMode={isDarkMode} />}
                                    {group === 'inactive' && card.open_date > new Date() && <PoolCountdown poolData={card} mode="inactive" isDarkMode={isDarkMode} />}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Play Button & Dropdown Arrow */}
                        <div className={`pool-card-right-${card.key}`} style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                            {card.isActive && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(card.route); }}
                                    style={{ background: GREEN, color: "white", border: "none", borderRadius: "6px", padding: "8px 18px", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                                >
                                    Play →
                                </button>
                            )}
                            <span style={{ color: GRAY, fontSize: "12px", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", padding: "4px" }}>▼</span>
                        </div>

                    </div>
                </div>

                <div style={{ maxHeight: isExpanded ? "200px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                    <div style={{ padding: "0 20px 20px 62px", borderTop: isDarkMode ? "1px solid #334155" : "1px solid #f1f5f9" }}>
                        <p style={{ margin: "12px 0 0", color: isDarkMode ? "#cbd5e1" : "#475569", fontSize: "13px", lineHeight: 1.5 }}>
                            {card.description || "Join this pool to compete with friends, track live standings, and test your predictive skills!"}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const bgGradient = isDarkMode
        ? `radial-gradient(circle at 70% 20%, rgba(212, 175, 55, 0.18) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.2) 0%, transparent 50%), linear-gradient(135deg, #061a33 0%, #0b192c 50%, #020617 100%)`
        : `radial-gradient(circle at 75% 15%, rgba(212, 175, 55, 0.25) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(14, 165, 233, 0.15) 0%, transparent 50%), linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)`;

    return (
        <div style={{ minHeight: "100vh", background: bgGradient, backgroundAttachment: "fixed", padding: "16px 12px 80px", transition: "background 0.3s ease", fontFamily: "system-ui, -apple-system, sans-serif", scrollBehavior: "smooth" }}>
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }
            `}</style>

            <div style={{ maxWidth: 850, margin: "0 auto 16px", background: isDarkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(8px)", borderRadius: "14px", border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`, padding: "20px 16px", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", gap: "12px" }}>
                <button onClick={toggleTheme} style={{ position: "absolute", top: "12px", right: "12px", background: isDarkMode ? "rgba(255,255,255,0.15)" : "#0f172a", color: isDarkMode ? "white" : "#ffffff", border: isDarkMode ? "1px solid rgba(255,255,255,0.3)" : "none", borderRadius: "16px", padding: "5px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                    {isDarkMode ? "☀️ Light" : "🌙 Dark"}
                </button>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                    <img src={logo} alt="POOL PLAY" style={{ width: "90px", height: "90px", borderRadius: "50%", border: `3px solid ${GOLD}`, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }} />
                    <div>
                        <h1 style={{ color: isDarkMode ? "white" : DEEP_NAVY, margin: 0, fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>🏆 POOL PLAY 🏊</h1>
                        <p style={{ color: isDarkMode ? GOLD : AQUA_BLUE, margin: "4px 0 0", fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Jump on in, the water's fine!</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", width: "100%", borderTop: isDarkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0", paddingTop: "12px" }}>
                    <a href="#pools-section" onClick={(e) => { e.preventDefault(); document.getElementById('pools-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ textDecoration: "none" }}>
                        <span style={{ background: isDarkMode ? "rgba(255,255,255,0.1)" : "#f1f5f9", color: isDarkMode ? "#cbd5e1" : "#475569", padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, display: "inline-block", cursor: "pointer", border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0" }}>
                            🔥 {live.length} {live.length === 1 ? "Game Live" : "Games Live"}
                        </span>
                    </a>
                    <a href="#open-entries-section" onClick={(e) => { e.preventDefault(); document.getElementById('open-entries-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ textDecoration: "none" }}>
                        <span style={{ background: isDarkMode ? "rgba(255,255,255,0.1)" : "#f1f5f9", color: isDarkMode ? "#cbd5e1" : "#475569", padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, display: "inline-block", cursor: "pointer", border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0" }}>
                            ⏰ {upcoming.length} {upcoming.length === 1 ? "Open Entry" : "Open Entries"}
                        </span>
                    </a>
                </div>
            </div>

            <div id="pools-section" style={{ maxWidth: 850, margin: "0 auto", scrollMarginTop: "20px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: 20, alignItems: "center" }}>
                    <input type="text" placeholder="🔍 Search pools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "8px 16px", borderRadius: "20px", border: `1px solid ${GOLD}`, background: isDarkMode ? "rgba(11, 15, 25, 0.85)" : "#ffffff", color: isDarkMode ? "white" : "#0f172a", fontSize: "13px", outline: "none", width: "200px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ background: selectedCategory === cat.id ? GOLD : (isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#ffffff"), color: selectedCategory === cat.id ? DEEP_NAVY : (isDarkMode ? "white" : "#1e293b"), border: selectedCategory === cat.id ? `1px solid ${GOLD}` : "1px solid #cbd5e1", borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", boxShadow: selectedCategory === cat.id ? "0 2px 4px rgba(0,0,0,0.2)" : "none" }}>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: GRAY, fontSize: "14px" }}>Loading your pools...</div>
                ) : (
                    <>
                        {live.length > 0 && <><h3 style={{ color: isDarkMode ? GOLD : "#0369a1", fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔥 Live & In-Play</h3>{live.map(c => renderCard(c, 'live'))}</>}
                        {upcoming.length > 0 && <><h3 id="open-entries-section" style={{ color: isDarkMode ? GOLD : "#0369a1", fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px", scrollMarginTop: "20px" }}>⏰ Open / Accepting Entries</h3>{upcoming.map(c => renderCard(c, 'upcoming'))}</>}
                        {inactive.length > 0 && <><h3 style={{ color: isDarkMode ? "rgba(255,255,255,0.4)" : "#64748b", fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>💤 Inactive / Upcoming Season</h3>{inactive.map(c => renderCard(c, 'inactive'))}</>}

                        {filteredCards.length === 0 && (
                            <div style={{ textAlign: "center", padding: "40px", color: GRAY, background: isDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                No pools match your search criteria.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}