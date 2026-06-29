import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from '../../src/images/logo.jpg'

const BLUE = "#13447a";
const DARK_BLUE = "#030831";
const GOLD = "#c89d3c";
const GRAY = "#9ca3af";
const GREEN = "#0a7a00"

// Reuseable Countdown component with added seconds
const Countdown = ({ targetDate, label }) => {
    const [timeLeft, setTimeLeft] = useState({ d: "00", h: "00", m: "00", s: "00" });

    useEffect(() => {
        const update = () => {
            const diff = new Date(targetDate) - new Date();
            if (diff <= 0) {
                setTimeLeft({ d: "00", h: "00", m: "00", s: "00" });
            } else {
                setTimeLeft({
                    d: Math.floor(diff / (1000 * 60 * 60 * 24)).toString().padStart(2, '0'),
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

    return (
        <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: "#111", padding: "6px 10px", borderRadius: "4px", border: "1px solid #333", fontFamily: "'Courier New', monospace" }}>
            <span style={{ color: "#ffffff", fontSize: "15px", fontWeight: "bold", marginRight: "8px", textTransform: "uppercase" }}>{label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {[{ val: timeLeft.d, lbl: "Days" }, { val: timeLeft.h, lbl: "Hours" }, { val: timeLeft.m, lbl: "Min" }, { val: timeLeft.s, lbl: "Sec" }].map((item, i) => (
                    <React.Fragment key={item.lbl}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ color: "#00ff00", fontSize: "18px", fontWeight: "bold", lineHeight: 1 }}>{item.val}</div>
                            <div style={{ color: "#ffffff", fontSize: "12px", fontWeight: 700 }}>{item.lbl}</div>
                        </div>
                        {i < 3 && <div style={{ color: "#00ff00", fontSize: "16px", fontWeight: "bold", marginTop: "-15px" }}>:</div>}
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
        axios.get("/api/settings/active-states").then(res => {
            const dynamicCards = (res.data || []).map(row => ({
                key: row.game_key || row.route,
                ...row,
                open_date: new Date(row.open_date),
                lock_date: new Date(row.lock_date),
                end_date: row.end_date ? new Date(row.end_date) : new Date("2100-01-01"),
                isActive: row.is_active,
                cta: row.is_active ? "Play →" : "Game ended, come back next year"
            }));
            setCards(dynamicCards);
            setLoading(false);
        }).catch(err => { console.error(err); setLoading(false); });
    }, []);

    const { live, upcoming, inactive } = useMemo(() => {
        const now = new Date();
        const buckets = { live: [], upcoming: [], inactive: [] };
        cards.forEach(c => {
            if (!c.isActive) buckets.inactive.push(c);
            else if (now >= c.lock_date && now <= c.end_date) buckets.live.push(c);
            else if (now >= c.open_date && now < c.lock_date) buckets.upcoming.push(c);
            else buckets.inactive.push(c);
        });
        buckets.inactive.sort((a, b) => a.open_date - b.open_date);
        return buckets;
    }, [cards]);

    const renderCard = (card, group) => {
        const isExpanded = !!expandedCards[card.key];

        return (
            <div key={card.key} style={{
                background: card.isActive ? "white" : "rgba(255, 255, 255, 0.15)",
                borderRadius: 12,
                borderLeft: `6px solid ${card.isActive ? card.accent : GRAY}`,
                marginBottom: 16,
                overflow: "hidden"
            }}>
                <div onClick={() => setExpandedCards(p => ({ ...p, [card.key]: !p[card.key] }))} style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                        <span style={{ fontSize: 28 }}>{card.emoji}</span>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "15px" }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: card.isActive ? DARK_BLUE : "white" }}>{card.title}</h2>

                            {/* ONLY Upcoming pools get the countdown to lock_date */}
                            {group === 'upcoming' && <Countdown label="LOCKS:" targetDate={card.lock_date} />}

                            {/* Only Live pools get the active badge */}
                            {group === 'live' && <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 700 }}>● Active Now</span>}

                            {/* Only Inactive pools get the countdown to open_date */}
                            {group === 'inactive' && card.open_date > new Date() && <Countdown label="OPENS:" targetDate={card.open_date} />}
                        </div>
                    </div>
                    <span style={{
                        color: card.isActive ? "#64748b" : "white",
                        transition: "transform 0.2s"
                    }}>▼</span>
                </div>

                {/* Drawer Content */}
                <div style={{ maxHeight: isExpanded ? "250px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                    <div style={{ padding: "0 24px 24px 68px" }}>
                        <p style={{ marginBottom: 20, color: card.isActive ? "#694747" : "white" }}>{card.description}</p>
                        <button
                            onClick={() => card.isActive && navigate(card.route)}
                            disabled={!card.isActive} // 👈 Disables the button visually and functionally
                            style={{
                                padding: "10px 24px",
                                // Disable cursor if not active
                                cursor: card.isActive ? "pointer" : "not-allowed",
                                // Dim the button if not active
                                opacity: card.isActive ? 1 : 0.5,
                                background: card.isActive ? GREEN : "#444",
                                color: "white",
                                border: "none",
                                borderRadius: 6,
                                fontWeight: "bold"
                            }}
                        >
                            {card.cta}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${DARK_BLUE} 25%, ${GOLD} 50%, ${BLUE} 75%)`, padding: "20px 16px" }}>
            <div style={{
                textAlign: "center",
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px"
            }}>
                <img
                    src={logo}
                    alt="POOL PLAY"
                    style={{
                        width: "220px",
                        height: "220px",
                        borderRadius: "50%",
                        border: `4px solid ${GOLD}`,
                        boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
                    }}
                />
                <div style={{ textAlign: "center", color: "white", marginBottom: 10 }}><h1>🏆 POOL PLAY 🏊</h1></div>
            </div>
            <div style={{ textAlign: "center", color: GOLD, marginBottom: 10, textShadow: '2px 2px BLUE' }}><h2>JUMP ON IN, THE WATER'S FINE!</h2></div>
            <div style={{ maxWidth: 850, margin: "0 auto" }}>
                {live.length > 0 && <><h3 style={{ color: GOLD, marginBottom: 10 }}>Live</h3>{live.map(c => renderCard(c, 'live'))}</>}
                {upcoming.length > 0 && <><h3 style={{ color: GOLD, marginBottom: 10 }}>Open / Accepting Entries</h3>{upcoming.map(c => renderCard(c, 'upcoming'))}</>}
                {inactive.length > 0 && <><h3 style={{ color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Inactive</h3>{inactive.map(c => renderCard(c, 'inactive'))}</>}
            </div>
        </div>
    );
}