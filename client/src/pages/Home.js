import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from '../../src/images/logo.jpg'

const BLUE = "#13447a";
const DARK_BLUE = "#030831";
const GOLD = "#c89d3c";
const GRAY = "#9ca3af";
const GREEN = "#0a7a00"

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
                <span style={{ fontSize: "8px", color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{unitLabel}</span>
            </div>
        );
    };

    return (
        <>
            <style>{`
                .flip-card-unit {
                    position: relative; display: flex; flex-direction: column; width: 22px; height: 32px;
                    font-size: 19px; font-weight: 900; color: #01da25; perspective: 300px;
                    font-family: 'Courier New', Courier, monospace; background: #111; border-radius: 3px;
                }
                .flip-card-unit .top-static, .flip-card-unit .bottom-static { position: absolute; left: 0; width: 100%; height: 50%; overflow: hidden; }
                .flip-card-unit .top-static { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 3px 3px 0 0; }
                .flip-card-unit .top-static span { position: absolute; top: 0; left: 0; width: 100%; height: 32px; line-height: 32px; text-align: center; }
                .flip-card-unit .bottom-static { bottom: 0; background: #2c2c2c; border-top: 1px solid #111; border-radius: 0 0 3px 3px; }
                .flip-card-unit .bottom-static span { position: absolute; top: -16px; left: 0; width: 100%; height: 32px; line-height: 32px; text-align: center; }
                .flip-card-unit .bottom-shade { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%); pointer-events: none; }
                .flip-card-unit .flipper { position: absolute; width: 100%; height: 50%; top: 0; transform-origin: bottom; transform-style: preserve-3d; z-index: 3; }
                .flip-card-unit.flipping .flipper { transition: transform 0.4s ease-in-out; transform: rotateX(-180deg); }
                .flip-card-unit .front, .flip-card-unit .back { position: absolute; left: 0; width: 100%; height: 100%; overflow: hidden; backface-visibility: hidden; }
                .flip-card-unit .front { top: 0; background: #181818; border-bottom: 1px solid #000; border-radius: 3px 3px 0 0; }
                .flip-card-unit .front span { position: absolute; top: 0; left: 0; width: 100%; height: 32px; line-height: 32px; text-align: center; }
                .flip-card-unit .back { bottom: 0; background: #2c2c2c; transform: rotateX(180deg); border-radius: 0 0 3px 3px; }
                .flip-card-unit .back span { position: absolute; top: -16px; left: 0; width: 100%; height: 32px; line-height: 32px; text-align: center; }
            `}</style>
            <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: isDarkMode ? "#0b0f19" : "#1e293b", padding: "4px 8px", borderRadius: "6px", border: `1px solid ${isDarkMode ? "#334155" : GOLD}` }}>
                <span style={{ color: GOLD, fontSize: "10px", fontWeight: "800", marginRight: "6px", textTransform: "uppercase" }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {timeLeft.y > 0 && (<>{renderFlipPair(timeLeft.y.toString(), "Years")}<span style={{ color: "#01da25", fontSize: "12px", fontWeight: "bold", marginTop: "-10px" }}>:</span></>)}
                    {renderFlipPair(timeLeft.d, "Days")}<span style={{ color: "#01da25", fontSize: "12px", fontWeight: "bold", marginTop: "-10px" }}>:</span>
                    {renderFlipPair(timeLeft.h, "Hours")}<span style={{ color: "#01da25", fontSize: "12px", fontWeight: "bold", marginTop: "-10px" }}>:</span>
                    {renderFlipPair(timeLeft.m, "Min")}<span style={{ color: "#01da25", fontSize: "12px", fontWeight: "bold", marginTop: "-10px" }}>:</span>
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
                    cta: (row.is_active === true || row.is_active === 1 || row.is_active === "true") ? "Play →" : "Game ended, come back next year"
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
                background: isDarkMode ? (card.isActive ? "white" : "rgba(255, 255, 255, 0.15)") : (card.isActive ? "#ffffff" : "#f1f5f9"),
                borderRadius: 12,
                borderLeft: `6px solid ${card.isActive ? (card.accent || GOLD) : GRAY}`,
                marginBottom: 16,
                overflow: "hidden",
                boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.15)" : "0 4px 12px rgba(19,68,122,0.08)",
                border: isDarkMode ? "none" : "1px solid #e2e8f0"
            }}>
                <div onClick={() => setExpandedCards(p => ({ ...p, [card.key]: !p[card.key] }))} style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                        <span style={{ fontSize: 28 }}>{card.emoji}</span>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "15px" }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: card.isActive ? DARK_BLUE : (isDarkMode ? "white" : "#334155") }}>{card.title}</h2>
                            {group === 'upcoming' && <Countdown label="LOCKS:" targetDate={card.lock_date} isDarkMode={isDarkMode} />}
                            {group === 'live' && <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 700 }}>● Active Now</span>}
                            {group === 'inactive' && card.open_date > new Date() && <Countdown label="OPENS:" targetDate={card.open_date} isDarkMode={isDarkMode} />}
                        </div>
                    </div>
                    <span style={{ color: card.isActive ? "#64748b" : (isDarkMode ? "white" : "#64748b") }}>▼</span>
                </div>
                <div style={{ maxHeight: isExpanded ? "250px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                    <div style={{ padding: "0 24px 24px 68px" }}>
                        <p style={{ marginBottom: 20, color: card.isActive ? "#475569" : (isDarkMode ? "white" : "#475569") }}>{card.description}</p>
                        <button
                            onClick={() => card.isActive && navigate(card.route)}
                            disabled={!card.isActive}
                            style={{
                                padding: "10px 24px", cursor: card.isActive ? "pointer" : "not-allowed",
                                opacity: card.isActive ? 1 : 0.5, background: card.isActive ? GREEN : "#444",
                                color: "white", border: "none", borderRadius: 6, fontWeight: "bold"
                            }}
                        >
                            {card.cta}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Rich, professional light mode gradient vs deep dark navy gradient
    const bgGradient = isDarkMode 
        ? `linear-gradient(135deg, ${DARK_BLUE} 25%, ${GOLD} 50%, ${BLUE} 75%)`
        : `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`;

    return (
        <div style={{ minHeight: "100vh", background: bgGradient, padding: "20px 16px", transition: "background 0.3s ease" }}>
            {/* Theme Toggle Button Top Right */}
            <div style={{ display: "flex", justifyContent: "flex-end", maxWidth: 850, margin: "0 auto 10px" }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        background: isDarkMode ? "rgba(255,255,255,0.15)" : "#0f172a",
                        color: isDarkMode ? "white" : "#ffffff",
                        border: isDarkMode ? "1px solid rgba(255,255,255,0.3)" : "none",
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                    }}
                >
                    {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                </button>
            </div>

            <div style={{ textAlign: "center", color: isDarkMode ? "white" : "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <img src={logo} alt="POOL PLAY" style={{ width: "220px", height: "220px", borderRadius: "50%", border: `4px solid ${GOLD}`, boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} />
                <div style={{ textAlign: "center", marginBottom: 10 }}><h1 style={{ color: isDarkMode ? "white" : "#0f172a" }}>🏆 POOL PLAY 🏊</h1></div>
            </div>
            <div style={{ textAlign: "center", color: isDarkMode ? GOLD : "#1e3a8a", marginBottom: 15, textShadow: isDarkMode ? '2px 2px #13447a' : 'none' }}><h2>JUMP ON IN, THE WATER'S FINE!</h2></div>

            <div style={{ maxWidth: 850, margin: "0 auto" }}>
                {/* Search Bar & Category Filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginBottom: 24, alignItems: "center" }}>
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
                            width: "220px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                        }}
                    />

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    background: selectedCategory === cat.id ? GOLD : (isDarkMode ? "rgba(255, 255, 255, 0.15)" : "#ffffff"),
                                    color: selectedCategory === cat.id ? DARK_BLUE : (isDarkMode ? "white" : "#1e293b"),
                                    border: selectedCategory === cat.id ? `1px solid ${GOLD}` : "1px solid #cbd5e1",
                                    borderRadius: "20px", padding: "6px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer",
                                    boxShadow: selectedCategory === cat.id ? "0 2px 4px rgba(0,0,0,0.2)" : "none"
                                }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {live.length > 0 && <><h3 style={{ color: isDarkMode ? GOLD : "#1e3a8a", marginBottom: 10 }}>Live</h3>{live.map(c => renderCard(c, 'live'))}</>}
                {upcoming.length > 0 && <><h3 style={{ color: isDarkMode ? GOLD : "#1e3a8a", marginBottom: 10 }}>Open / Accepting Entries</h3>{upcoming.map(c => renderCard(c, 'upcoming'))}</>}
                {inactive.length > 0 && <><h3 style={{ color: isDarkMode ? "rgba(255,255,255,0.4)" : "#64748b", marginBottom: 10 }}>Inactive</h3>{inactive.map(c => renderCard(c, 'inactive'))}</>}
            </div>
        </div>
    );
}