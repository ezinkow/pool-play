import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from '../../src/images/logo.jpg'

const BLUE = "#13447a";
const DARK_BLUE = "#030831";
const GOLD = "#c89d3c";
const GRAY = "#9ca3af";
const GREEN = "#0a7a00";

function SingleFlipCard({ value }) {
    const [displayVal, setDisplayVal] = useState(value);
    const [prevVal, setPrevVal] = useState(value);
    const [isFlipping, setIsFlipping] = useState(false);
    const refVal = useRef(value);

    useEffect(() => {
        if (value !== refVal.current) {
            setPrevVal(refVal.current);
            setDisplayVal(value);
            setIsFlipping(true);
            refVal.current = value;

            const timer = setTimeout(() => {
                setIsFlipping(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const currentToShow = isFlipping ? displayVal : value;
    const prevToShow = isFlipping ? prevVal : value;

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

const Countdown = ({ targetDate, label, isDarkMode }) => {
    const [timeLeft, setTimeLeft] = useState({ y: 0, d: "00", h: "00", m: "00", s: "00" });

    useEffect(() => {
        const update = () => {
            const target = new Date(targetDate);
            if (isNaN(target.getTime())) {
                setTimeLeft({ y: 0, d: "00", h: "00", m: "00", s: "00" });
                return;
            }

            const diff = target - new Date();
            if (diff <= 0) {
                setTimeLeft({ y: 0, d: "00", h: "00", m: "00", s: "00" });
            } else {
                const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
                const years = Math.floor(totalDays / 365);
                const days = totalDays % 365;

                setTimeLeft({
                    y: years,
                    d: days.toString(),
                    h: Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0'),
                    m: Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0'),
                    s: Math.floor((diff / 1000) % 60).toString().padStart(2, '0')
                });
            }
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    const renderFlipPair = (valStr, unitLabel) => {
        const digits = valStr.toString().split('');
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                    {digits.map((digit, idx) => (
                        <SingleFlipCard key={idx} value={digit} />
                    ))}
                </div>
                <span style={{ fontSize: "7px", color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{unitLabel}</span>
            </div>
        );
    };

    return (
        <>
            <style>{`
                .flip-card-unit {
                    position: relative; display: flex; flex-direction: column; width: 18px; height: 28px;
                    font-size: 15px; font-weight: 900; color: #01da25; perspective: 300px;
                    font-family: 'Courier New', Courier, monospace; background: #111; border-radius: 3px;
                }
                .flip-card-unit .top-static, .flip-card-unit .bottom-static { position: absolute; left: 0; width: 100%; height: 50%; overflow: hidden; }
                .flip-card-unit .top-static { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 3px 3px 0 0; }
                .flip-card-unit .top-static span { position: absolute; top: 0; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
                .flip-card-unit .bottom-static { bottom: 0; background: #2c2c2c; border-top: 1px solid #111; border-radius: 0 0 3px 3px; }
                .flip-card-unit .bottom-static span { position: absolute; top: -14px; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
                .flip-card-unit .bottom-shade { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%); pointer-events: none; }
                .flip-card-unit .flipper { position: absolute; width: 100%; height: 50%; top: 0; transform-origin: bottom; transform-style: preserve-3d; z-index: 3; }
                .flip-card-unit.flipping .flipper { transition: transform 0.4s ease-in-out; transform: rotateX(-180deg); }
                .flip-card-unit .front, .flip-card-unit .back { position: absolute; left: 0; width: 100%; height: 100%; overflow: hidden; backface-visibility: hidden; }
                .flip-card-unit .front { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 3px 3px 0 0; }
                .flip-card-unit .front span { position: absolute; top: 0; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
                .flip-card-unit .back { bottom: 0; background: #2c2c2c; transform: rotateX(180deg); border-radius: 0 0 3px 3px; }
                .flip-card-unit .back span { position: absolute; top: -14px; left: 0; width: 100%; height: 28px; line-height: 28px; text-align: center; }
            `}</style>
            <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: isDarkMode ? "#0b0f19" : "#1e293b", padding: "4px 6px", borderRadius: "6px", border: `1px solid ${isDarkMode ? "#334155" : GOLD}`, maxWidth: "100%", overflow: "hidden" }}>
                <span style={{ color: GOLD, fontSize: "9px", fontWeight: "800", marginRight: "4px", textTransform: "uppercase" }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap" }}>
                    {timeLeft.y > 0 && (<>{renderFlipPair(timeLeft.y.toString(), "Yrs")}<span style={{ color: "#01da25", fontSize: "10px", fontWeight: "bold" }}>:</span></>)}
                    {renderFlipPair(timeLeft.d, "Days")}<span style={{ color: "#01da25", fontSize: "10px", fontWeight: "bold" }}>:</span>
                    {renderFlipPair(timeLeft.h, "Hrs")}<span style={{ color: "#01da25", fontSize: "10px", fontWeight: "bold" }}>:</span>
                    {renderFlipPair(timeLeft.m, "Min")}<span style={{ color: "#01da25", fontSize: "10px", fontWeight: "bold" }}>:</span>
                    {renderFlipPair(timeLeft.s, "Sec")}
                </div>
            </div>
        </>
    );
};

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
                    cta: (row.is_active === true || row.is_active === 1 || row.is_active === "true") ? "Play Now →" : "Game Ended"
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
                boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(19,68,122,0.06)",
                border: isDarkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                transition: "transform 0.2s ease"
            }}>
                <div onClick={() => setExpandedCards(p => ({ ...p, [card.key]: !p[card.key] }))} style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 26, flexShrink: 0 }}>{card.emoji || "🎮"}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0, flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: card.isActive ? (isDarkMode ? "#f8fafc" : DARK_BLUE) : GRAY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</h3>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                                {group === 'upcoming' && <Countdown label="LOCKS:" targetDate={card.lock_date} isDarkMode={isDarkMode} />}
                                {group === 'live' && (
                                    <span style={{ background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block", animation: "pulse 1.5s infinite" }}></span> Active Now
                                    </span>
                                )}
                                {group === 'inactive' && card.open_date > new Date() && <Countdown label="OPENS:" targetDate={card.open_date} isDarkMode={isDarkMode} />}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        {card.isActive && (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(card.route); }}
                                style={{ background: GREEN, color: "white", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                            >
                                Play →
                            </button>
                        )}
                        <span style={{ color: GRAY, fontSize: "12px", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                    </div>
                </div>

                {/* Expanded Details Panel */}
                <div style={{ maxHeight: isExpanded ? "200px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                    <div style={{ padding: "0 20px 20px 60px", borderTop: isDarkMode ? "1px solid #334155" : "1px solid #f1f5f9" }}>
                        <p style={{ margin: "12px 0 16px", color: isDarkMode ? "#cbd5e1" : "#475569", fontSize: "13px", lineHeight: 1.5 }}>
                            {card.description || "Join this pool to compete with friends, track live standings, and test your predictive skills!"}
                        </p>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                                onClick={() => card.isActive && navigate(card.route)}
                                disabled={!card.isActive}
                                style={{
                                    padding: "8px 18px", cursor: card.isActive ? "pointer" : "not-allowed",
                                    opacity: card.isActive ? 1 : 0.5, background: card.isActive ? GREEN : "#444",
                                    color: "white", border: "none", borderRadius: 6, fontWeight: "bold", fontSize: "12px"
                                }}
                            >
                                {card.cta}
                            </button>
                            <button
                                onClick={() => navigate(`${card.route}/standings`)}
                                style={{ padding: "8px 14px", background: "transparent", color: isDarkMode ? GOLD : BLUE, border: `1px solid ${GOLD}`, borderRadius: 6, fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}
                            >
                                View Standings 🏆
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const bgGradient = isDarkMode
        ? `linear-gradient(135deg, #163999d0 0%, #ffd900b6 50%, #1e3b8abb 100%)`
        : `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`;

    return (
        <div style={{ minHeight: "100vh", background: bgGradient, padding: "20px 16px 80px", transition: "background 0.3s ease", fontFamily: "system-ui, -apple-system, sans-serif" }}>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }
            `}</style>

            {/* Top Hero Header Card Box - Clean & Responsive */}
            <div style={{
                maxWidth: 850,
                margin: "0 auto 20px",
                background: isDarkMode ? "rgba(30, 41, 59, 0.75)" : "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(8px)",
                borderRadius: "16px",
                border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
                padding: "24px 20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
                gap: "14px"
            }}>
                {/* Absolute Top-Right Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: isDarkMode ? "rgba(255,255,255,0.15)" : "#0f172a",
                        color: isDarkMode ? "white" : "#ffffff",
                        border: isDarkMode ? "1px solid rgba(255,255,255,0.3)" : "none",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                    }}
                >
                    {isDarkMode ? "☀️ Light" : "🌙 Dark"}
                </button>

                {/* Absolute Top-Left Live/Open Stats */}
                <div style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    alignItems: "flex-start"
                }}>
                    <span style={{ background: isDarkMode ? "rgba(255,255,255,0.15)" : "#e2e8f0", color: isDarkMode ? "#cbd5e1" : "#475569", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                        🔥 {live.length} Live
                    </span>
                    <span style={{ background: isDarkMode ? "rgba(255,255,255,0.15)" : "#e2e8f0", color: isDarkMode ? "#cbd5e1" : "#475569", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                        ⏰ {upcoming.length} Open
                    </span>
                </div>

                {/* Center Content: Logo, Title & Subtitle */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                    <img src={logo} alt="POOL PLAY" style={{ width: "90px", height: "90px", borderRadius: "50%", border: `3px solid ${GOLD}`, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }} />
                    <div>
                        <h1 style={{ color: isDarkMode ? "white" : DARK_BLUE, margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>🏆 POOL PLAY 🏊</h1>
                        <p style={{ color: isDarkMode ? GOLD : BLUE, margin: "4px 0 0", fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Jump on in, the water's fine!</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ maxWidth: 850, margin: "0 auto" }}>

                {/* Search Bar & Category Filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: 20, alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="🔍 Search pools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "20px",
                            border: `1px solid ${GOLD}`,
                            background: isDarkMode ? "rgba(11, 15, 25, 0.85)" : "#ffffff",
                            color: isDarkMode ? "white" : "#0f172a",
                            fontSize: "13px",
                            outline: "none",
                            width: "200px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                        }}
                    />

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    background: selectedCategory === cat.id ? GOLD : (isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#ffffff"),
                                    color: selectedCategory === cat.id ? DARK_BLUE : (isDarkMode ? "white" : "#1e293b"),
                                    border: selectedCategory === cat.id ? `1px solid ${GOLD}` : "1px solid #cbd5e1",
                                    borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                                    boxShadow: selectedCategory === cat.id ? "0 2px 4px rgba(0,0,0,0.2)" : "none"
                                }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: GRAY, fontSize: "14px" }}>Loading your pools...</div>
                ) : (
                    <>
                        {live.length > 0 && <><h3 style={{ color: isDarkMode ? GOLD : "#1e3a8a", fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔥 Live & In-Play</h3>{live.map(c => renderCard(c, 'live'))}</>}
                        {upcoming.length > 0 && <><h3 style={{ color: isDarkMode ? GOLD : "#1e3a8a", fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>⏰ Open / Accepting Entries</h3>{upcoming.map(c => renderCard(c, 'upcoming'))}</>}
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