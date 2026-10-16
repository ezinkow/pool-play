import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import logo from '../../src/images/logo.jpg';
import PoolCountdown from "../components/PoolCountdown";

const GOLD = "#c89d3c";
const GRAY = "#9ca3af";

// --- MAIN HOMEPAGE COMPONENT ---
export default function Home() {
    const navigate = useNavigate();
    const { isDarkMode } = useOutletContext();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCards, setExpandedCards] = useState({});
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        let isCurrent = true;

        const loadPools = async () => {
            try {
                const response = await axios.get("/api/settings/active-states");
                const dynamicCards = await Promise.all((response.data || []).map(async row => {
                    const key = row.game_key || row.route;
                    let metadata = null;

                    if (row.game_key) {
                        try {
                            const metadataResponse = await axios.get(`/api/pools/metadata/${encodeURIComponent(row.game_key)}`);
                            metadata = metadataResponse.data;
                        } catch (error) {
                            if (error.response?.status !== 404) {
                                console.error(`Failed to load ${row.game_key} homepage metadata`, error);
                            }
                        }
                    }

                    return {
                        ...row,
                        key,
                        title: metadata?.pool_title || row.title || row.game_label || key,
                        description: metadata?.pool_description || row.description || "",
                        rules_html: metadata?.rules_html || "",
                        emoji: metadata?.emoji || row.emoji,
                        accent: metadata?.accent_color || row.accent,
                        category: (row.sport || "other").toLowerCase().trim(),
                        open_date: new Date(row.open_date),
                        lock_date: new Date(row.lock_date),
                        end_date: row.end_date ? new Date(row.end_date) : new Date("2100-01-01"),
                        isActive: row.is_active === true || row.is_active === 1 || row.is_active === "true",
                    };
                }));

                if (isCurrent) setCards(dynamicCards);
            } catch (error) {
                console.error("Failed to load homepage pools", error);
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        loadPools();
        return () => {
            isCurrent = false;
        };
    }, []);

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
                (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            <div key={card.key} className="card homepage-pool-card" style={{
                borderRadius: 12,
                borderLeft: `6px solid ${card.isActive ? (card.accent || GOLD) : GRAY}`,
                marginBottom: 14,
                overflow: "hidden",
                transition: "transform 0.2s ease"
            }}>
                <div className="homepage-pool-card-heading" onClick={() => setExpandedCards(p => ({ ...p, [card.key]: !p[card.key] }))}>
                    <div className="homepage-pool-card-row">
                        {/* Left: Emoji & Game Title */}
                        <div className="homepage-pool-card-name">
                            <span className="homepage-pool-card-emoji">{card.emoji || "🎮"}</span>
                            <h3 className="homepage-pool-card-title">
                                {card.title}
                            </h3>
                        </div>

                        {/* Middle: Full-Size Inline Countdown */}
                        <div className="homepage-pool-card-countdown">
                            {group === 'upcoming' && <PoolCountdown poolData={card} mode="upcoming" isDarkMode={isDarkMode} compact={false} />}
                            {group === 'live' && <PoolCountdown poolData={card} mode="active" isDarkMode={isDarkMode} compact={false} />}
                            {group === 'inactive' && card.open_date > new Date() && <PoolCountdown poolData={card} mode="inactive" isDarkMode={isDarkMode} compact={false} />}
                        </div>

                        {/* Right: Play Button & Expand Arrow */}
                        <div className="homepage-pool-card-actions">
                            {card.isActive && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(card.prefix); }}
                                    className="homepage-pool-card-play"
                                >
                                    Play →
                                </button>
                            )}
                            <span className={`homepage-pool-card-chevron${isExpanded ? " homepage-pool-card-chevron--expanded" : ""}`}>▼</span>
                        </div>
                    </div>
                </div>

                <div style={{ maxHeight: isExpanded ? "600px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                    <div style={{ padding: "0 20px 20px 62px", borderTop: "1px solid rgba(100, 116, 139, 0.2)" }}>
                        {card.description && (
                            <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.5 }}>
                                {card.description}
                            </p>
                        )}
                        {card.rules_html && (
                            <div className="pool-rules-content homepage-pool-rules" dangerouslySetInnerHTML={{ __html: card.rules_html }} />
                        )}
                        {!card.description && !card.rules_html && (
                            <p style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.5 }}>
                                Join this pool to compete with friends, track live standings, and test your predictive skills!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ minHeight: "100vh", transition: "background 0.3s ease", fontFamily: "system-ui, -apple-system, sans-serif", scrollBehavior: "smooth" }}>
            <div className="card" style={{ maxWidth: 850, margin: "0 auto 16px", borderRadius: "14px", padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                    <img src={logo} alt="POOL PLAY" style={{ width: "120px", height: "120px", borderRadius: "50%", border: `3px solid ${GOLD}`, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: "30px", fontWeight: 800, letterSpacing: "-0.5px" }}>🏆 POOL PLAY 🏊</h1>
                        <p style={{ color: GOLD, margin: "6px 0 0", fontSize: "13px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Jump on in, the water's fine!</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", width: "100%", borderTop: "1px solid rgba(100, 116, 139, 0.2)", paddingTop: "14px" }}>
                    <a href="#pools-section" onClick={(e) => { e.preventDefault(); document.getElementById('pools-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ textDecoration: "none" }}>
                        <span style={{ padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, display: "inline-block", cursor: "pointer", border: "1px solid rgba(100, 116, 139, 0.2)" }}>
                            🔥 {live.length} {live.length === 1 ? "Game Live" : "Games Live"}
                        </span>
                    </a>
                    <a href="#open-entries-section" onClick={(e) => { e.preventDefault(); document.getElementById('open-entries-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ textDecoration: "none" }}>
                        <span style={{ padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, display: "inline-block", cursor: "pointer", border: "1px solid rgba(100, 116, 139, 0.2)" }}>
                            ⏰ {upcoming.length} {upcoming.length === 1 ? "Open Entry" : "Open Entries"}
                        </span>
                    </a>
                </div>
            </div>

            <div id="pools-section" style={{ maxWidth: 850, margin: "0 auto", scrollMarginTop: "20px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginBottom: 20, alignItems: "center" }}>
                    <input type="text" placeholder="🔍 Search pools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "8px 16px", borderRadius: "20px", border: `1px solid ${GOLD}`, fontSize: "13px", outline: "none", width: "200px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ background: selectedCategory === cat.id ? GOLD : undefined, border: selectedCategory === cat.id ? `1px solid ${GOLD}` : "1px solid #cbd5e1", borderRadius: "20px", padding: "6px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", boxShadow: selectedCategory === cat.id ? "0 2px 4px rgba(0,0,0,0.2)" : "none" }}>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: GRAY, fontSize: "14px" }}>Loading your pools...</div>
                ) : (
                    <>
                        {live.length > 0 && <><h3 style={{ color: GOLD, fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>🔥 Live & In-Play</h3>{live.map(c => renderCard(c, 'live'))}</>}
                        {upcoming.length > 0 && <><h3 id="open-entries-section" style={{ color: GOLD, fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px", scrollMarginTop: "20px" }}>⏰ Open / Accepting Entries</h3>{upcoming.map(c => renderCard(c, 'upcoming'))}</>}
                        {inactive.length > 0 && <><h3 style={{ color: GRAY, fontSize: "15px", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>💤 Inactive / Upcoming Season</h3>{inactive.map(c => renderCard(c, 'inactive'))}</>}

                        {filteredCards.length === 0 && (
                            <div className="card" style={{ textAlign: "center", padding: "40px", borderRadius: "12px" }}>
                                No pools match your search criteria.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}