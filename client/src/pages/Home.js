import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BLUE = "#13447a";
const DARK_BLUE = "#030831";
const GOLD = "#c89d3c";
const GRAY = "#9ca3af";

export default function Home() {
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCards, setExpandedCards] = useState({});

    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(res => {
                const rawData = res.data || [];
                const sortedData = [...rawData].sort((a, b) => {
                    const labelA = a.game_label || "";
                    const labelB = b.game_label || "";
                    return labelA.localeCompare(labelB);
                });

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
                        titleColor: row.title_color,
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

    return (
        <div style={{
            minHeight: "100vh",
            background: `linear-gradient(135deg, ${DARK_BLUE} 25%, ${GOLD} 50%, ${BLUE} 75%)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 16px 80px 16px",
            fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
            {/* Header Section */}
            <div style={{ textAlign: "center", marginBottom: 40 }}>
                <h1 style={{
                    color: GOLD,
                    fontSize: "clamp(28px, 5vw, 48px)",
                    fontWeight: 900,
                    margin: "0 0 12px 0",
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    textShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}>
                    🏆 POOL PLAY 🏊
                </h1>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, margin: 0, fontWeight: 500 }}>
                    Come on in, the water's warm!
                </p>
            </div>

            {loading ? (
                <div style={{ color: "white", fontWeight: 700, padding: 40, fontSize: 16 }}>
                    Loading tournament dashboards...
                </div>
            ) : (
                /* Main Unified List Container */
                <div style={{
                    width: "100%",
                    maxWidth: 850,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                }}>
                    {cards.map((card) => {
                        const { key, emoji, title, description, cta, route, accent, ctaBg, titleColor, isActive } = card;
                        const isExpanded = !!expandedCards[key];

                        return (
                            <div
                                key={key}
                                onClick={() => isActive && isExpanded && navigate(route)}
                                style={{
                                    background: isActive ? "white" : "rgba(255, 255, 255, 0.15)",
                                    backdropFilter: isActive ? "none" : "blur(8px)",
                                    borderRadius: 12,
                                    borderLeft: `6px solid ${isActive ? accent : GRAY}`,
                                    boxShadow: isActive ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
                                    transition: "all 0.2s ease-in-out",
                                    cursor: isActive && isExpanded ? "pointer" : "default",
                                    overflow: "hidden",
                                    color: isActive ? "#1e293b" : "rgba(255,255,255,0.6)",
                                }}
                            >
                                {/* Row Header (Always Visible) */}
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
                                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                        <span style={{ fontSize: 28, filter: isActive ? "none" : "grayscale(50%)" }}>{emoji}</span>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <h2 style={{
                                                margin: 0,
                                                fontSize: 18,
                                                fontWeight: 700,
                                                color: isActive ? DARK_BLUE : "rgba(255, 255, 255, 0.9)" // ✨ Bumed text color up for pro contrast
                                            }}>
                                                {title}
                                            </h2>
                                            {/* Micro status badge row context */}
                                            {!isExpanded && (
                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    lineHeight: 1,
                                                    color: isActive ? "#16a34a" : "rgba(255,255,255,0.45)"
                                                }}>
                                                    <span>{isActive ? "●" : "✕"}</span>
                                                    <span style={{ paddingTop: "1px" }}>{isActive ? "Active Now" : "Inactive"}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side Interaction Actions */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 16 }} onClick={(e) => e.stopPropagation()}>
                                        {isActive && !isExpanded && (
                                            <span className="hide-mobile" style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                Manage Picks →
                                            </span>
                                        )}
                                        <span style={{
                                            fontSize: 12,
                                            transition: "transform 0.2s ease",
                                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                            color: isActive ? "#64748b" : "rgba(255,255,255,0.4)"
                                        }}>
                                            ▼
                                        </span>
                                    </div>
                                </div>

                                {/* Collapsible Body Section (Slide Down Info) */}
                                <div style={{
                                    maxHeight: isExpanded ? "250px" : "0px",
                                    opacity: isExpanded ? 1 : 0,
                                    transition: "all 0.25s ease-in-out",
                                    visibility: isExpanded ? "visible" : "hidden",
                                }}>
                                    <div style={{
                                        padding: "0 24px 24px 68px",
                                        borderTop: isActive ? "1px solid #f1f5f9" : "1px solid rgba(255,255,255,0.1)",
                                        paddingTop: 16
                                    }}>
                                        <p style={{
                                            margin: "0 0 20px 0",
                                            fontSize: 14,
                                            lineHeight: 1.6,
                                            color: isActive ? "#475569" : "rgba(255,255,255,0.7)"
                                        }}>
                                            {description}
                                        </p>

                                        {/* Action CTA Button */}
                                        <div style={{
                                            display: "inline-block",
                                            padding: "10px 24px",
                                            backgroundColor: isActive ? ctaBg : "rgba(255,255,255,0.1)",
                                            color: isActive ? "white" : "rgba(255,255,255,0.3)",
                                            borderRadius: 6,
                                            fontWeight: 700,
                                            fontSize: 14,
                                            textAlign: "center",
                                            cursor: isActive ? "pointer" : "not-allowed",
                                            transition: "background-color 0.15s",
                                            border: isActive ? "none" : "1px solid rgba(255,255,255,0.15)"
                                        }}>
                                            {cta}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}