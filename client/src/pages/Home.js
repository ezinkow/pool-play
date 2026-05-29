import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BLUE = "#13447a";
const DARK_BLUE = "#030831";
const GOLD = "#c89d3c";
const GRAY = "#9ca3af";

const CountdownDisplay = ({ open_date }) => {
    const [time, setTime] = useState({ d: "00", h: "00", m: "00" });

    useEffect(() => {
        const interval = setInterval(() => {
            const diff = new Date(open_date) - new Date();
            if (diff <= 0) {
                setTime({ d: "00", h: "00", m: "00" });
                clearInterval(interval);
            } else {
                setTime({
                    d: Math.floor(diff / (1000 * 60 * 60 * 24)).toString().padStart(2, '0'),
                    h: Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0'),
                    m: Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0')
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [open_date]);

    const data = [
        { val: time.d, lbl: "DAYS" },
        { val: time.h, lbl: "HRS" },
        { val: time.m, lbl: "MINS" }
    ];

    return (
        <div style={{
            display: "inline-flex", alignItems: "center", backgroundColor: "#111",
            padding: "6px 12px", borderRadius: "4px", border: "1px solid #333",
            fontFamily: "'Courier New', Courier, monospace"
        }}>
            <span style={{ color: "#ffffff", fontSize: "10px", fontWeight: "bold", marginRight: "5px", textTransform: "uppercase" }}>OPENS:</span>
            <div style={{ display: "flex", alignItems: "center" }}>
                {data.map((item, i) => (
                    <React.Fragment key={item.lbl}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ color: "#00ff00", fontSize: "20px", fontWeight: "bold", lineHeight: 1 }}>{item.val}</div>
                            <div style={{ color: "#ffffff", fontSize: "12px", textTransform: "uppercase", fontWeight: 700, marginTop: "2px" }}>{item.lbl}</div>
                        </div>
                        {/* Add colon only between items, not after the last one */}
                        {i < data.length - 1 && (
                            <div style={{ color: "#00ff00", fontSize: "18px", fontWeight: "bold", padding: "0 6px", marginTop: "-17px" }}>:</div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default function Home() {
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCards, setExpandedCards] = useState({});

    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(res => {
                const rawData = res.data || [];
                const sortedData = [...rawData].sort((a, b) => (a.game_label || "").localeCompare(b.game_label || ""));

                const initialExpansionState = {};
                const dynamicCards = sortedData.map(row => {
                    const cardKey = row.game_key || row.route;
                    initialExpansionState[cardKey] = !!row.is_active;

                    return {
                        key: cardKey,
                        emoji: row.emoji,
                        title: row.title,
                        description: row.description,
                        route: row.route,
                        accent: row.accent,
                        ctaBg: row.cta_bg,
                        open_date: row.open_date,
                        isActive: row.is_active,
                        cta: row.is_active ? "Play →" : "Game ended, come back next year"
                    };
                });

                setExpandedCards(initialExpansionState);
                setCards(dynamicCards);
                setLoading(false);
            })
            .catch(err => {
                console.error("❌ Home dynamic cards loading failure:", err);
                setLoading(false);
            });
    }, []);

    const toggleExpand = (cardKey, e) => {
        e.stopPropagation();
        setExpandedCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
    };

    const { activeCards, inactiveCards } = useMemo(() => {
        // 1. Separate cards
        const active = cards.filter(c => c.isActive);

        // 2. Separate and sort inactive cards by open_date ascending
        const inactive = cards
            .filter(c => !c.isActive)
            .sort((a, b) => {
                const dateA = a.open_date ? new Date(a.open_date) : new Date(8640000000000000); // Push nulls to end
                const dateB = b.open_date ? new Date(b.open_date) : new Date(8640000000000000);
                return dateA - dateB;
            });

        return { activeCards: active, inactiveCards: inactive };
    }, [cards]);

    const renderCard = (card) => {
        const { key, emoji, title, description, cta, route, accent, ctaBg, isActive, open_date } = card;
        const isExpanded = !!expandedCards[key];

        return (
            <div key={key} onClick={() => isActive && isExpanded && navigate(route)} style={{
                background: isActive ? "white" : "rgba(255, 255, 255, 0.15)",
                backdropFilter: isActive ? "none" : "blur(8px)", borderRadius: 12,
                borderLeft: `6px solid ${isActive ? accent : GRAY}`,
                boxShadow: isActive ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.2s ease-in-out", cursor: isActive && isExpanded ? "pointer" : "default",
                overflow: "hidden", color: isActive ? "#1e293b" : "rgba(255,255,255,0.6)",
            }}>
                <div
                    onClick={(e) => toggleExpand(key, e)}
                    style={{
                        padding: "18px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        userSelect: "none"
                    }}
                >
                    {/* Left Side: Emoji + Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                        <span style={{ fontSize: 28, filter: isActive ? "none" : "grayscale(50%)" }}>{emoji}</span>

                        {/* WRAPPER FOR MOBILE STACKING */}
                        <div style={{ display: "flex", flexDirection: window.innerWidth < 600 ? "column" : "row", alignItems: window.innerWidth < 600 ? "flex-start" : "center", gap: "15px", flex: 1 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: isActive ? DARK_BLUE : "rgba(255, 255, 255, 0.9)" }}>
                                {title}
                            </h2>

                            {/* SCOREBOARD / STATUS */}
                            {!isActive && open_date && <CountdownDisplay open_date={open_date} />}
                            {isActive && !isExpanded && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 12, fontWeight: 600, color: "#16a34a" }}>
                                    <span>●</span> <span>Active Now</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Chevron */}
                    <span style={{ fontSize: 12, transition: "transform 0.2s ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", color: isActive ? "#64748b" : "rgba(255,255,255,0.4)", marginLeft: "10px" }}>▼</span>
                </div>

                <div style={{ maxHeight: isExpanded ? "250px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", visibility: isExpanded ? "visible" : "hidden" }}>
                    <div style={{ padding: "0 24px 24px 68px", borderTop: isActive ? "1px solid #f1f5f9" : "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
                        <p style={{ margin: "0 0 20px 0", fontSize: 14, lineHeight: 1.6, color: isActive ? "#475569" : "rgba(255,255,255,0.7)" }}>{description}</p>
                        <div style={{ display: "inline-block", padding: "10px 24px", backgroundColor: isActive ? ctaBg : "rgba(255,255,255,0.1)", color: isActive ? "white" : "rgba(255,255,255,0.3)", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: isActive ? "pointer" : "not-allowed", border: isActive ? "none" : "1px solid rgba(255,255,255,0.15)" }}>{cta}</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${DARK_BLUE} 25%, ${GOLD} 50%, ${BLUE} 75%)`, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 16px 80px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
                <h1 style={{ color: GOLD, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, margin: "0 0 12px 0", letterSpacing: "3px", textTransform: "uppercase", textShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>🏆 POOL PLAY 🏊</h1>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: 0, fontWeight: 500 }}>Come on in, the water's warm!</p>
            </div>

            {loading ? <div style={{ color: "white", fontWeight: 700, padding: 40, fontSize: 16 }}>Loading tournament dashboards...</div> : (
                <div style={{ width: "100%", maxWidth: 850, display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <h3 style={{ color: GOLD, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 0 }}>Active Pools</h3>
                        {activeCards.map(renderCard)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <h3 style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 0 }}>Inactive Pools</h3>
                        {inactiveCards.map(renderCard)}
                    </div>
                </div>
            )}
        </div>
    );
}