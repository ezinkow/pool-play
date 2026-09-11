import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from '../../src/images/logo.jpg'

const BLUE = "#13447a";
const DARK_BLUE = "#030831";
const GOLD = "#c89d3c";
const GRAY = "#9ca3af";
const GREEN = "#0a7a00"

// 3D Flipping Digit Component with enhanced font weight and clarity for readability
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
            }, 400); // Matches CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [value]);

    const currentToShow = isFlipping ? displayVal : value;
    const prevToShow = isFlipping ? prevVal : value;

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

// Reusable 3D Flipping Countdown component synced correctly with backend target dates
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

    const renderFlipPair = (valStr, unitLabel) => {
        const tens = valStr[0] || '0';
        const ones = valStr[1] || '0';
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                    <SingleFlipCard value={tens} />
                    <SingleFlipCard value={ones} />
                </div>
                <span style={{ fontSize: "8px", color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{unitLabel}</span>
            </div>
        );
    };

    return (
        <>
            <style>{`
                .flip-card-unit {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    width: 22px;
                    height: 32px;
                    font-size: 19px;
                    font-weight: 900;
                    color: #01da25;
                    perspective: 300px;
                    font-family: 'Courier New', Courier, monospace;
                    background: #111;
                    border-radius: 3px;
                    -webkit-font-smoothing: antialiased;
                }
                .flip-card-unit .top-static, .flip-card-unit .bottom-static {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 50%;
                    overflow: hidden;
                    background: #1f1f1f;
                }
                .flip-card-unit .top-static {
                    top: 0;
                    border-bottom: 1px solid #000;
                    border-radius: 3px 3px 0 0;
                }
                .flip-card-unit .top-static span {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 32px;
                    line-height: 32px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                }
                .flip-card-unit .bottom-static {
                    bottom: 0;
                    border-top: 1px solid #333;
                    border-radius: 0 0 3px 3px;
                }
                .flip-card-unit .bottom-static span {
                    position: absolute;
                    top: -16px;
                    left: 0;
                    width: 100%;
                    height: 32px;
                    line-height: 32px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
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
                    background: #2c2c2c;
                }
                .flip-card-unit .front {
                    top: 0;
                    border-bottom: 1px solid #000;
                    border-radius: 3px 3px 0 0;
                }
                .flip-card-unit .front span {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 32px;
                    line-height: 32px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                }
                .flip-card-unit .back {
                    bottom: 0;
                    transform: rotateX(180deg);
                    border-radius: 0 0 3px 3px;
                    background: #2c2c2c;
                }
                .flip-card-unit .back span {
                    position: absolute;
                    top: -16px;
                    left: 0;
                    width: 100%;
                    height: 32px;
                    line-height: 32px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                }
            `}</style>
            <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: "#0b0f19", padding: "4px 8px", borderRadius: "6px", border: "1px solid #334155", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
                <span style={{ color: GOLD, fontSize: "10px", fontWeight: "800", marginRight: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {renderFlipPair(timeLeft.d, "Days")}
                    <span style={{ color: "#01da25", fontSize: "12px", fontWeight: "bold", marginTop: "-10px" }}>:</span>
                    {renderFlipPair(timeLeft.h, "Hours")}
                    <span style={{ color: "#01da25", fontSize: "12px", fontWeight: "bold", marginTop: "-10px" }}>:</span>
                    {renderFlipPair(timeLeft.m, "Min")}
                    <span style={{ color: "#01da25", fontSize: "12px", fontWeight: "bold", marginTop: "-10px" }}>:</span>
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

        buckets.live.sort((a, b) => a.lock_date - b.lock_date);
        buckets.upcoming.sort((a, b) => a.lock_date - b.lock_date);
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

                            {group === 'upcoming' && <Countdown label="LOCKS:" targetDate={card.lock_date} />}
                            {group === 'live' && <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 700 }}>● Active Now</span>}
                            {group === 'inactive' && card.open_date > new Date() && <Countdown label="OPENS:" targetDate={card.open_date} />}
                        </div>
                    </div>
                    <span style={{ color: card.isActive ? "#64748b" : "white", transition: "transform 0.2s" }}>▼</span>
                </div>

                <div style={{ maxHeight: isExpanded ? "250px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                    <div style={{ padding: "0 24px 24px 68px" }}>
                        <p style={{ marginBottom: 20, color: card.isActive ? "#694747" : "white" }}>{card.description}</p>
                        <button
                            onClick={() => card.isActive && navigate(card.route)}
                            disabled={!card.isActive}
                            style={{
                                padding: "10px 24px",
                                cursor: card.isActive ? "pointer" : "not-allowed",
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
            <div style={{ textAlign: "center", color: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
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