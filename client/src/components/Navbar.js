import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import axios from "axios";
import BanterDrawer from './BanterDrawer';
import AuthModal from "./AuthModal";

const GOLD = "#c89d3c";

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, loading } = useAuth();
    const [chatOpen, setChatOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
    const dropdownRef = useRef(null);
    const [rawGameSettings, setRawGameSettings] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const isHome = location.pathname === "/";

    const handleLogout = () => {
        logout();
        setMenuOpen(false);
    };

    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(res => setRawGameSettings(res.data || []))
            .catch(err => console.error("❌ Navbar dynamic data load failure:", err));
    }, []);

    // 🧠 GLOBAL REPAIRED CLICK-OUT LISTENER:
    // Safely handles click tracking parameters across dropdown targets
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 992);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        setDropdownOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = (menuOpen || showLogin) ? "hidden" : "";
    }, [menuOpen, showLogin]);

    const currentGame = useMemo(() => {
        if (isHome) return null;
        return rawGameSettings.find(g => g.prefix && location.pathname.startsWith(g.prefix));
    }, [rawGameSettings, location.pathname, isHome]);

    const activeLinks = useMemo(() => {
        if (!currentGame || !currentGame.prefix) return [];
        const pfx = currentGame.prefix;
        const isAdmin = user?.is_admin === true;

        const signupLocked = currentGame.lock_date
            ? new Date() >= new Date(currentGame.lock_date)
            : false;

        let templateLinks = [
            { to: `${pfx}`, label: "Home", emoji: "🏠" },
            { to: `${pfx}/picks`, label: "Make Picks", emoji: "🌎" },
            { to: `${pfx}/mypicks`, label: "My Picks", emoji: "📋" },
            { to: `${pfx}/standings`, label: "Standings", emoji: "🏆" }
        ];

        if (pfx === "/worldcup") {
            templateLinks.splice(3, 0, { to: "/worldcup/grouppicks", label: "Group Picks", emoji: "⚽" });
            templateLinks.push({ to: "/worldcup/scoreboard", label: "Scoreboard", emoji: "📋" });
        } else if (pfx === "/nba") {
            templateLinks.splice(1, 1, { to: "/nba/picks", label: "Picks", emoji: "📝" });
            templateLinks.push({ to: "/nba/grouppicks", label: "Group Picks", emoji: "🏀" });
            templateLinks.push({ to: "/nba/signup", label: "Join Pool", emoji: "▶️" });
        } else if (pfx === "/tourneypickem" || pfx === "/champweekpickem") {
            templateLinks.splice(1, 2,
                { to: `${pfx}/picks`, label: "Submit Picks", emoji: "📝" },
                { to: `${pfx}/mypicks`, label: "My Sheet", emoji: "📋" }
            );
            templateLinks.push({ to: `${pfx}/scoreboard`, label: "Scores", emoji: "🏀" });
            templateLinks.push({ to: `${pfx}/picksdisplay`, label: "User Picks", emoji: "🔍" });
            templateLinks.push({ to: `${pfx}/signup`, label: "Join Pool", emoji: "▶️" });
        } else if (pfx === "/bracket") {
            templateLinks.splice(1, 2,
                { to: "/bracket/bracket", label: "Bracket Board", emoji: "🔱" },
                { to: "/bracket/mybracket", label: "My Bracket", emoji: "📋" }
            );
            templateLinks.push({ to: "/bracket/signup", label: "Join Pool", emoji: "▶️" });
        } else if (pfx === "/tourneysquares") {
            templateLinks = [
                { to: "/tourneysquares", label: "Home", emoji: "🏠" },
                { to: "/tourneysquares/grid", label: "Squares Grid", emoji: "⬛" },
                { to: "/tourneysquares/numbers", label: "My Numbers", emoji: "🔢" },
                { to: "/tourneysquares/results", label: "Prizes & Wins", emoji: "💵" },
                { to: "/tourneysquares/signup", label: "Buy Squares", emoji: "🎟️" }
            ];
        } else if (pfx === "/nfl" || pfx === "/olympics") {
            const sport = pfx === "/nfl" ? "🏈" : "🌍";
            const labelStr = pfx === "/nfl" ? "Pick Roster" : "Country Draft";
            const thirdStr = pfx === "/nfl" ? "My Team" : "My Countries";
            const liveStr = pfx === "/nfl" ? "Scoreboard" : "Live Events";
            templateLinks = [
                { to: pfx, label: "Home", emoji: "🏠" },
                { to: `${pfx}/${pfx === "/nfl" ? "rosterpicks" : "countrypicks"}`, label: labelStr, emoji: sport },
                { to: `${pfx}/myroster`, label: thirdStr, emoji: "📋" },
                { to: `${pfx}/scoreboard`, label: liveStr, emoji: pfx === "/nfl" ? "📋" : "⏱️" },
                { to: `${pfx}/standings`, label: "Standings", emoji: "🏆" }
            ];
            if (pfx === "/nfl") templateLinks.push({ to: "/nfl/playerstats", label: "Player Pools", emoji: "📊" });
            else templateLinks.push({ to: "/olympics/medaltable", label: "Medal Count", emoji: "🏅" });
            templateLinks.push({ to: `${pfx}/signup`, label: "Join Pool", emoji: "▶️" });
        }

        return templateLinks.filter(({ to }) => isAdmin || !signupLocked || !to.endsWith("/signup"));
    }, [currentGame, user]);

    const brandLabel = currentGame ? `${currentGame.emoji} ${currentGame.game_label.toUpperCase()}` : "🏆 POOL PLAY 🏊";
    const navBg = currentGame ? currentGame.navBg : "#13447a";

    const getCompactLabel = (label) => {
        const lower = label.toLowerCase();
        if (lower.includes("make picks") || lower.includes("submit")) return "Picks";
        if (lower.includes("my picks") || lower.includes("my sheet")) return "My Picks";
        if (lower.includes("group picks") || lower.includes("user picks")) return "Matrix";
        if (lower.includes("bracket board")) return "Bracket";
        return label;
    };

    const handleDropdownLinkClick = (e, isLinkActive, destination) => {
        if (!isLinkActive) {
            e.preventDefault();
            return;
        }
        setDropdownOpen(false);
        navigate(destination);
    };

    // 🧠 SORTED & CATEGORIZED POOL DATA ENGINE
    const categorizedGames = useMemo(() => {
        const active = [];
        const inactive = [];

        // Sort alphabetically first
        const sorted = [...rawGameSettings].sort((a, b) =>
            a.game_label.localeCompare(b.game_label)
        );

        sorted.forEach(game => {
            if (game.is_active === true) active.push(game);
            else inactive.push(game);
        });

        return { active, inactive };
    }, [rawGameSettings]);

    const renderGameLink = (game) => {
        const isLinkActive = game.is_active === true || user?.is_admin === true;
        const isSelected = currentGame?.game_key === game.game_key;
        return (
            <Link
                key={game.game_key}
                to={game.prefix}
                onClick={(e) => handleDropdownLinkClick(e, isLinkActive, game.prefix)}
                style={{
                    display: "block", padding: "10px 16px", fontSize: "13px",
                    color: !isLinkActive ? "#9ca3af" : (isSelected ? GOLD : "#334155"),
                    textDecoration: "none", fontWeight: isSelected ? "700" : "500",
                    backgroundColor: isSelected ? "#f8fafc" : "transparent",
                    cursor: isLinkActive ? "pointer" : "default"
                }}
            >
                <span>{game.emoji}</span> {game.game_label.toUpperCase()}
            </Link>
        );
    };

    return (
        <>
            <header className="navbar-header" style={{ backgroundColor: navBg, position: "fixed", top: 0, left: 0, right: 0, zIndex: 2100, transition: "background-color 0.2s" }}>
                <div className="navbar-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "50px", padding: "0 16px", width: "100%" }}>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "0 1 auto" }}>
                        {!isHome && (
                            <Link to="/" style={{ color: "white", fontSize: 12, textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                                ← Home
                            </Link>
                        )}
                        <Link to="/" className="navbar-brand" style={{ fontWeight: 900, textDecoration: "none", color: "white", fontSize: "14px", display: "flex", alignItems: "center", minWidth: 0 }}>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                                {brandLabel}
                            </span>
                        </Link>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, marginLeft: "auto" }}>
                        {!isMobile && (
                            <div ref={dropdownRef} style={{ position: "relative" }}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    style={{
                                        backgroundColor: "rgba(255,255,255,0.15)", color: "white",
                                        border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px",
                                        padding: "6px 12px", fontSize: "12px", fontWeight: 700,
                                        cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
                                    }}
                                >
                                    {isHome ? <>🚀 Go to Pool</> : <>🎮 Switch Pool</>} {dropdownOpen ? "▲" : "▼"}
                                </button>
                                {dropdownOpen && (
                                    <div style={{ position: "absolute", top: "110%", right: 0, backgroundColor: "white", minWidth: "240px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", padding: "6px 0", zIndex: 2500, maxHeight: "70vh", overflowY: "auto" }}>

                                        {/* ACTIVE SECTION */}
                                        <div style={{ padding: "6px 16px 4px", fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Active Pools</div>
                                        {categorizedGames.active.map(game => renderGameLink(game))}

                                        <div style={{ height: "1px", background: "#e2e8f0", margin: "6px 0" }} />

                                        {/* INACTIVE SECTION */}
                                        <div style={{ padding: "6px 16px 4px", fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase" }}>Inactive Pools</div>
                                        {categorizedGames.inactive.map(game => renderGameLink(game))}
                                    </div>
                                )}
                            </div>
                        )}

                        {!isMobile && !loading && (
                            user ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button onClick={() => navigate("/comments")} style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.1)", color: "white", cursor: "pointer" }}>📩 Contact Us</button>
                                    <button onClick={() => navigate("/myaccount")} style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: `1px solid ${GOLD}`, backgroundColor: "transparent", color: GOLD, cursor: "pointer" }}>👤 My Pools</button>
                                    <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{user.name}</span>
                                    <button onClick={handleLogout} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", cursor: "pointer" }}>Log out</button>
                                    <button onClick={() => setChatOpen(true)} style={{ background: "rgba(255, 255, 255, 0.15)", color: "white", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>💬 Open Chat</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button onClick={() => navigate("/comments")} style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", backgroundColor: "transparent", color: "white", cursor: "pointer" }}>📩 Contact Us</button>
                                    <button onClick={() => setShowLogin(true)} style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: "none", background: GOLD, color: "#0a1628", cursor: "pointer" }}>Log in</button>
                                </div>
                            )
                        )}

                        {isMobile && (
                            <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" style={{ background: "none", border: "none", color: "white", fontSize: "22px", cursor: "pointer", padding: "4px", display: "block" }}>
                                {menuOpen ? "✕" : "☰"}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* 🧠 FLOATING CHAT BALLOON ELEMENT */}
            {isMobile && user && !isHome && (
                <button
                    onClick={() => setChatOpen(true)}
                    style={{
                        position: "fixed",
                        top: "54px",
                        right: "24px",
                        zIndex: 2050,
                        backgroundColor: "transparent",
                        border: "none",
                        padding: "4px",
                        fontSize: "30px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        WebkitTapHighlightColor: "transparent",
                        filter: "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.35))"
                    }}
                    aria-label="Open pool banter drawer"
                >
                    💬
                </button>
            )}

            {!isMobile && !isHome && activeLinks.length > 0 && (
                <>
                    <style>{`
                        .desktop-subnav-row::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
                    `}</style>
                    <div className="desktop-subnav-row" style={{ backgroundColor: "rgba(10, 22, 40, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.1)", borderBottom: `2px solid ${GOLD}`, position: "fixed", top: "50px", left: 0, right: 0, overflowX: "auto", whiteSpace: "nowrap", padding: "10px 16px", display: "flex", gap: "20px", alignItems: "center", zIndex: 2000, scrollbarWidth: "none", msOverflowStyle: "none" }}>
                        {activeLinks.map(({ to, label }) => {
                            const isActive = location.pathname === to;
                            return (
                                <Link key={to} to={to} style={{ color: isActive ? GOLD : "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "12px", fontWeight: isActive ? "800" : "600", padding: "4px 2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </>
            )}

            {isMobile && !isHome && activeLinks.length > 0 && (
                <nav className="mobile-bottom-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "60px", backgroundColor: "#0a1628", borderTop: `3px solid ${GOLD}`, display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 2000, padding: "0 2px" }}>
                    {activeLinks.slice(0, 5).map(({ to, label, emoji }) => {
                        const isActive = location.pathname === to;
                        return (
                            <Link
                                key={to}
                                to={to}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", textDecoration: "none", color: isActive ? GOLD : "#cbd5e1", flex: 1, height: "100%", minWidth: 0, padding: "4px 0" }}
                            >
                                <span style={{ fontSize: "16px" }}>{emoji}</span>
                                <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: isActive ? "800" : "600", letterSpacing: "0.1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>
                                    {getCompactLabel(label)}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            )}

            {isMobile && menuOpen && (
                <>
                    <div className="menu-overlay" onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2998, display: "block" }} />
                    <nav className="nav-links open" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "280px", backgroundColor: "#111827", boxShadow: "-4px 0 20px rgba(0,0,0,0.3)", zIndex: 2999, display: "flex", flexDirection: "column", padding: "24px 0", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                            <span style={{ color: GOLD, fontWeight: 900, fontSize: "14px" }}>MENU PANELS</span>
                            <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer" }}>✕</button>
                        </div>

                        {currentGame && activeLinks.length > 0 && (
                            <div style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                <div style={{ padding: "0 20px 8px 20px", fontSize: "10px", color: "#9ca3af", fontWeight: 800, letterSpacing: "1px" }}>POOL CONTEXT LINKS</div>
                                {activeLinks.map(({ to, label, emoji }) => {
                                    const isActive = location.pathname === to;
                                    return (
                                        <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", textDecoration: "none", color: isActive ? GOLD : "#f3f4f6", backgroundColor: isActive ? "rgba(255,255,255,0.05)" : "transparent", fontWeight: isActive ? 700 : 500, fontSize: "14px" }}>
                                            <span style={{ fontSize: "16px" }}>{emoji}</span> {label}
                                        </Link>
                                    );
                                })}
                                <button onClick={() => { setMenuOpen(false); setChatOpen(true); }} style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 20px", background: "none", border: "none", color: "#f3f4f6", fontWeight: 500, fontSize: "14px", cursor: "pointer", textAlign: "left" }}>
                                    <span style={{ fontSize: "16px" }}>💬</span> Open Pool Chat
                                </button>
                            </div>
                        )}

                        <div style={{ padding: "16px 0" }}>
                            <div style={{ padding: "0 20px 8px 20px", fontSize: "10px", color: "#9ca3af", fontWeight: 800, letterSpacing: "1px" }}>SWITCH TOURNAMENTS</div>
                            {rawGameSettings.map((game) => {
                                const isLinkActive = game.is_active === true || user?.is_admin === true;
                                const isSelected = currentGame?.game_key === game.game_key;
                                return (
                                    <Link key={game.game_key} to={game.prefix} onClick={(e) => handleDropdownLinkClick(e, isLinkActive, game.prefix)} style={{ display: "block", padding: "10px 20px", textDecoration: "none", fontSize: "13px", fontWeight: isSelected ? 700 : 500, color: !isLinkActive ? "#4b5563" : (isSelected ? GOLD : "#d1d5db"), fontStyle: isLinkActive ? "normal" : "italic" }}>
                                        <span>{game.emoji}</span> {game.game_label.toUpperCase()} {!isLinkActive && " (🔒)"}
                                    </Link>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: "auto", padding: "20px", borderTop: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#1f2937" }}>
                            {user ? (
                                <>
                                    <div style={{ fontSize: "13px", color: "#e5e7eb", marginBottom: "12px" }}>Logged in: <strong style={{ color: GOLD }}>{user.name}</strong></div>
                                    <button onClick={() => { setMenuOpen(false); navigate("/myaccount"); }} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: `1px solid ${GOLD}`, background: "transparent", color: GOLD, fontWeight: 700, fontSize: "13px", cursor: "pointer", marginBottom: "8px" }}>👤 My Account Dashboard</button>
                                    <button onClick={handleLogout} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #4b5563", background: "#374151", color: "#f87171", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Log Out</button>
                                </>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <button onClick={() => { setMenuOpen(false); navigate("/comments"); }} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #4b5563", background: "transparent", color: "white", fontWeight: 700, fontSize: "13px" }}>📩 Contact Support</button>
                                    <button onClick={() => { setMenuOpen(false); setShowLogin(true); }} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "none", background: GOLD, color: "#0a1628", fontWeight: 700, fontSize: "13px" }}>Log In Platform</button>
                                </div>
                            )}
                        </div>
                    </nav>
                </>
            )}

            {/* 🧠 RE-MOUNTED AUTHENTICATION STEP PANEL PORTAL LINK */}
            <AuthModal show={showLogin} onClose={() => setShowLogin(false)} />

            <BanterDrawer
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                gameKey={currentGame?.game_key || "GLOBAL"}
                user={user}
                isMobile={isMobile}
            />
        </>
    );
}