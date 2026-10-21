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
    const [collapsedSections, setCollapsedSections] = useState({
        live: false,
        upcoming: false,
        inactive: false,
    });
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
                        emoji: metadata?.emoji,
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

    const toggleSection = (sectionKey) => {
        setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    };

 const renderCard = (card, group) => {
        const isExpanded = !!expandedCards[card.key];
        return (
            <div key={card.key} className="card homepage-pool-card" style={{
                borderRadius: 8,
                borderLeft: `5px solid ${card.isActive ? (card.accent || GOLD) : GRAY}`,
                marginBottom: 8,
                overflow: "hidden",
                transition: "transform 0.2s ease"
            }}>
                <div className="homepage-pool-card-heading" onClick={() => setExpandedCards(p => ({ ...p, [card.key]: !p[card.key] }))} style={{ padding: "14px 16px", cursor: "pointer" }}>
                    
                    {/* Uses the CSS class that adapts automatically between desktop row and mobile stack */}
                    <div className="homepage-pool-row">
                        
                        {/* Left: Emoji & Title */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            {card.emoji && <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{card.emoji}</span>}
                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {card.title}
                            </h3>
                        </div>

                        {/* Center: Countdown Timer */}
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            {group === 'upcoming' && <PoolCountdown poolData={card} mode="upcoming" isDarkMode={isDarkMode} compact={false} />}
                            {group === 'live' && <PoolCountdown poolData={card} mode="active" isDarkMode={isDarkMode} compact={false} />}
                            {group === 'inactive' && card.open_date > new Date() && <PoolCountdown poolData={card} mode="inactive" isDarkMode={isDarkMode} compact={false} />}
                        </div>

                        {/* Right / Bottom Action Row */}
                        <div className="homepage-pool-actions-row" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {card.isActive && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(card.url_path); }}
                                    className="homepage-pool-card-play"
                                    style={{ flex: 1, padding: "8px 16px", fontSize: "13px", fontWeight: "bold", textAlign: "center", cursor: "pointer" }}
                                >
                                    Play →
                                </button>
                            )}
                            
                            <span className={`homepage-pool-card-chevron${isExpanded ? " homepage-pool-card-chevron--expanded" : ""}`} style={{ fontSize: "12px", opacity: 0.7, padding: "4px" }}>▼</span>
                        </div>

                    </div>
                </div>

                <div style={{ maxHeight: isExpanded ? "600px" : "0px", opacity: isExpanded ? 1 : 0, transition: "all 0.25s ease-in-out", overflow: "hidden" }}>
                    <div style={{ padding: "0 16px 14px 48px", borderTop: "1px solid rgba(100, 116, 139, 0.2)" }}>
                        {card.description && (
                            <p style={{ margin: "10px 0 0", fontSize: "13px", lineHeight: 1.4 }}>
                                {card.description}
                            </p>
                        )}
                        {card.rules_html && (
                            <div className="pool-rules-content homepage-pool-rules" style={{ fontSize: "13px" }} dangerouslySetInnerHTML={{ __html: card.rules_html }} />
                        )}
                        {!card.description && !card.rules_html && (
                            <p style={{ margin: "10px 0 0", fontSize: "13px", lineHeight: 1.4 }}>
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
            <div className="card" style={{ maxWidth: 950, margin: "0 auto 16px", borderRadius: "12px", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", gap: "10px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                    <img src={logo} alt="POOL PLAY" style={{ width: "90px", height: "90px", borderRadius: "50%", border: `2px solid ${GOLD}`, boxShadow: "0 3px 12px rgba(0,0,0,0.3)" }} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>🏆 POOL PLAY 🏊</h1>
                        <p style={{ color: GOLD, margin: "4px 0 0", fontSize: "12px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Jump on in, the water's fine!</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", width: "100%", borderTop: "1px solid rgba(100, 116, 139, 0.2)", paddingTop: "10px" }}>
                    <a href="#pools-section" onClick={(e) => { e.preventDefault(); document.getElementById('pools-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ textDecoration: "none" }}>
                        <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, display: "inline-block", cursor: "pointer", border: "1px solid rgba(100, 116, 139, 0.2)" }}>
                            🔥 {live.length} {live.length === 1 ? "Game Live" : "Games Live"}
                        </span>
                    </a>
                    <a href="#open-entries-section" onClick={(e) => { e.preventDefault(); document.getElementById('open-entries-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ textDecoration: "none" }}>
                        <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, display: "inline-block", cursor: "pointer", border: "1px solid rgba(100, 116, 139, 0.2)" }}>
                            ⏰ {upcoming.length} {upcoming.length === 1 ? "Open Entry" : "Open Entries"}
                        </span>
                    </a>
                </div>
            </div>

            <div id="pools-section" style={{ maxWidth: 950, margin: "0 auto", scrollMarginTop: "20px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: 14, alignItems: "center" }}>
                    <input type="text" placeholder="🔍 Search pools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "6px 14px", borderRadius: "16px", border: `1px solid ${GOLD}`, fontSize: "12px", outline: "none", width: "180px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ background: selectedCategory === cat.id ? GOLD : undefined, border: selectedCategory === cat.id ? `1px solid ${GOLD}` : "1px solid #cbd5e1", borderRadius: "16px", padding: "4px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: selectedCategory === cat.id ? "0 2px 4px rgba(0,0,0,0.2)" : "none" }}>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "30px", color: GRAY, fontSize: "13px" }}>Loading your pools...</div>
                ) : (
                    <>
                        {live.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div 
                                    onClick={() => toggleSection('live')} 
                                    style={{ color: GOLD, fontSize: "13px", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none", fontWeight: 700 }}
                                >
                                    <span>🔥 Live & In-Play ({live.length})</span>
                                    <span style={{ fontSize: "14px", transform: collapsedSections.live ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", marginLeft: "6px" }}>▼</span>
                                </div>
                                {!collapsedSections.live && live.map(c => renderCard(c, 'live'))}
                            </div>
                        )}

                        {upcoming.length > 0 && (
                            <div style={{ marginBottom: 16 }} id="open-entries-section">
                                <div 
                                    onClick={() => toggleSection('upcoming')} 
                                    style={{ color: GOLD, fontSize: "13px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none", fontWeight: 700, scrollMarginTop: "20px" }}
                                >
                                    <span>⏰ Open / Accepting Entries ({upcoming.length})</span>
                                    <span style={{ fontSize: "14px", transform: collapsedSections.upcoming ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", marginLeft: "6px" }}>▼</span>
                                </div>
                                {!collapsedSections.upcoming && upcoming.map(c => renderCard(c, 'upcoming'))}
                            </div>
                        )}

                        {inactive.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div 
                                    onClick={() => toggleSection('inactive')} 
                                    style={{ color: GRAY, fontSize: "13px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none", fontWeight: 700 }}
                                >
                                    <span>💤 Inactive / Upcoming Season ({inactive.length})</span>
                                    <span style={{ fontSize: "14px", transform: collapsedSections.inactive ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", marginLeft: "6px" }}>▼</span>
                                </div>
                                {!collapsedSections.inactive && inactive.map(c => renderCard(c, 'inactive'))}
                            </div>
                        )}

                        {filteredCards.length === 0 && (
                            <div className="card" style={{ textAlign: "center", padding: "30px", borderRadius: "8px", fontSize: "13px" }}>
                                No pools match your search criteria.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}