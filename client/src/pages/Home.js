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

    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(res => {
                // Map straight over database attributes on response return
                const dynamicCards = (res.data || []).map(row => ({
                    key: row.game_key,
                    emoji: row.emoji,
                    title: row.title,
                    description: row.description,
                    route: row.route,
                    accent: row.accent,
                    ctaBg: row.cta_bg,       // maps underscore column to camelCase property safely
                    titleColor: row.title_color,
                    isActive: row.is_active,
                    cta: row.is_active ? "Play →" : "Game ended, come back next year"
                }));
                setCards(dynamicCards);
                setLoading(false);
            })
            .catch(err => {
                console.error("❌ Home dynamic cards loading failure:", err);
                setLoading(false);
            });
    }, []);

    return (
        <div style={{
            minHeight: "100vh",
            background: `linear-gradient(135deg, ${DARK_BLUE} 25%, ${GOLD} 50%, ${BLUE} 75%)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "60px 16px 40px 16px",
        }}>
            <h1 style={{
                color: GOLD,
                fontSize: "clamp(22px, 5vw, 46px)",
                fontWeight: 900,
                textAlign: "center",
                marginBottom: 8,
                marginTop: 20,
                letterSpacing: "2px",
                textTransform: "uppercase",
                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}>
                🏆 POOL PLAY 🏊
            </h1>
            <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 48, fontSize: 16, textAlign: "center" }}>
                <strong>Come on in, the water's warm!</strong>
            </p>

            {loading ? (
                <div style={{ color: "white", fontWeight: 700, padding: 40 }}>Loading active tournament dashboards...</div>
            ) : (
                <div style={{
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    width: "100%",
                    maxWidth: 1200,
                }}>
                    {cards.map((card) => {
                        const { emoji, title, description, cta, route, accent, ctaBg, titleColor, isActive } = card;

                        return (
                            <div
                                key={route}
                                onClick={() => isActive && navigate(route)}
                                style={{
                                    flex: "1 1 260px", minWidth: 260, maxWidth: 360,
                                    background: isActive ? "white" : "#e5e7eb",
                                    borderRadius: 16,
                                    padding: 32,
                                    cursor: isActive ? "pointer" : "default",
                                    borderTop: `6px solid ${isActive ? accent : GRAY}`,
                                    boxShadow: isActive ? "0 8px 32px rgba(0,0,0,0.3)" : "none",
                                    transition: "all 0.15s",
                                    filter: isActive ? "none" : "grayscale(100%) opacity(0.65)",
                                    position: "relative"
                                }}
                                onMouseEnter={e => {
                                    if (isActive) e.currentTarget.style.transform = "translateY(-4px)";
                                }}
                                onMouseLeave={e => {
                                    if (isActive) e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                {!isActive && (
                                    <div style={{
                                        position: "absolute", top: 12, right: 12,
                                        fontSize: 10, fontWeight: 800, color: "#64748b",
                                        textTransform: "uppercase", backgroundColor: "#cbd5e1",
                                        padding: "2px 6px", borderRadius: 4
                                    }}>
                                        Inactive
                                    </div>
                                )}

                                <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
                                <h2 style={{ color: isActive ? titleColor : "#64748b", marginBottom: 8, fontSize: 22, fontWeight: 800 }}>
                                    {title}
                                </h2>
                                <p style={{ color: isActive ? "#6b7280" : "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                                    {description}
                                </p>
                                <div style={{
                                    display: "inline-block", padding: "10px 20px",
                                    backgroundColor: isActive ? ctaBg : "#94a3b8",
                                    color: isActive ? "white" : "#cbd5e1",
                                    borderRadius: 8, fontWeight: 700, fontSize: 14,
                                    width: "100%", textAlign: "center", boxSizing: "border-box"
                                }}>
                                    {cta}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}