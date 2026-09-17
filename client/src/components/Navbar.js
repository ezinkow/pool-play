import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import axios from "axios";
import BanterDrawer from './BanterDrawer';
import AuthModal from "./AuthModal";
import logo from '../../src/images/logo.jpg'

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
        window.location.reload();
    };

    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(res => setRawGameSettings(res.data || []))
            .catch(err => console.error("❌ Navbar dynamic data load failure:", err));
    }, []);

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
        const sortedGames = [...rawGameSettings].sort((a, b) => (b.prefix?.length || 0) - (a.prefix?.length || 0));
        return sortedGames.find(g => g.prefix && location.pathname.startsWith(g.prefix));
    }, [rawGameSettings, location.pathname, isHome]);

    const activeLinks = useMemo(() => {
        if (!currentGame || !currentGame.prefix) return [];
        const pfx = currentGame.prefix;
        const isAdmin = user?.is_admin === true;

        const signupLocked = currentGame.lock_date
            ? new Date() >= new Date(currentGame.lock_date)
            : false;

        let parsedNavLinks = currentGame.nav_links;
        if (typeof parsedNavLinks === "string") {
            try {
                parsedNavLinks = JSON.parse(parsedNavLinks);
            } catch (e) {
                console.error("Failed to parse nav_links JSON:", e);
                parsedNavLinks = null;
            }
        }

        let templateLinks = parsedNavLinks && Array.isArray(parsedNavLinks)
            ? parsedNavLinks.map(link => ({
                ...link,
                to: link.to.startsWith("http") ? link.to : `${pfx}${link.to === "/" ? "" : link.to}`
            }))
            : [
                { to: `${pfx}`, label: "Home", emoji: "🏠" },
                { to: `${pfx}/picks`, label: "Make Picks", emoji: "🎯" },
                { to: `${pfx}/mypicks`, label: "My Picks", emoji: "📋" },
                { to: `${pfx}/grouppicks`, label: "Group Picks", emoji: "📊" },
                { to: `${pfx}/standings`, label: "Standings", emoji: "🏆" }
            ];

        return templateLinks.filter(({ to }) => isAdmin || !signupLocked || !to.endsWith("/signup"));
    }, [currentGame, user]);

    const brandLabel = currentGame ? `${currentGame.emoji} ${currentGame.game_label.toUpperCase()}` : "🏆 POOL PLAY 🏊";
    const navBg = currentGame ? currentGame.navBg : "#13447a";

    const getCompactLabel = (label) => {
        if (!label || typeof label !== "string") return "";
        const lower = label.toLowerCase();
        if (lower.includes("make picks") || lower.includes("submit")) return "Picks";
        if (lower.includes("my picks") || lower.includes("my sheet")) return "My Picks";
        if (lower.includes("group picks") || lower.includes("user picks") || lower.includes("weekly matrix") || lower.includes("matrix")) return "Matrix";
        if (lower.includes("standings")) return "Standings";
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

    const categorizedGames = useMemo(() => {
        const active = [];
        const inactive = [];

        const sorted = [...rawGameSettings].sort((a, b) =>
            a.game_label.localeCompare(b.game_label)
        );

        sorted.forEach(game => {
            const isActive = game.is_active === true || game.is_active === 1 || game.is_active === "true";
            if (isActive) {
                active.push(game);
            } else {
                inactive.push(game);
            }
        });
        return { active, inactive };
    }, [rawGameSettings]);

    const renderGameLink = (game) => {
        const isLinkActive = (game.is_active === true || game.is_active === 1 || game.is_active === "true") || user?.is_admin === true;
        const isSelected = currentGame?.game_key === game.game_key;
        const destination = `${game.prefix}/picks`;

        return (
            <Link
                key={game.game_key}
                to={destination}
                onClick={(e) => handleDropdownLinkClick(e, isLinkActive, destination)}
                style={{
                    display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", fontSize: "12px",
                    color: !isLinkActive ? "#9ca3af" : (isSelected ? GOLD : "#334155"),
                    textDecoration: "none", fontWeight: isSelected ? "700" : "500",
                    backgroundColor: isSelected ? "#f8fafc" : "transparent",
                    cursor: isLinkActive ? "pointer" : "default"
                }}
            >
                <span style={{ width: "18px", textAlign: "center", flexShrink: 0 }}>{game.emoji}</span> {game.game_label.toUpperCase()}
            </Link>
        );
    };

    return (
        <>
            <header className="navbar-header" style={{ backgroundColor: navBg, position: "fixed", top: 0, left: 0, right: 0, zIndex: 2100, transition: "background-color 0.2s" }}>
                <div className="navbar-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "50px", padding: "0 12px", width: "100%", gap: "8px" }}>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
                        <Link to="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                            <img
                                src={logo}
                                alt="POOL PLAY"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "50%",
                                    border: `1px solid ${GOLD}`,
                                    objectFit: "cover"
                                }}
                            />
                        </Link>
                        {!isHome && (
                            <Link to="/" style={{ color: "white", fontSize: 11, textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                                ← Home
                            </Link>
                        )}
                        <Link to="/" className="navbar-brand" style={{ fontWeight: 900, textDecoration: "none", color: "white", fontSize: "13px", display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                                {brandLabel}
                            </span>
                        </Link>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <div ref={dropdownRef} style={{ position: "relative" }}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                style={{
                                    backgroundColor: "rgba(200, 157, 60, 0.25)", color: GOLD,
                                    border: `1px solid ${GOLD}`, borderRadius: "6px",
                                    padding: "4px 8px", fontSize: "11px", fontWeight: 700,
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: "3px",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                ⚡ Quick Jump {dropdownOpen ? "▲" : "▼"}
                            </button>
                            {dropdownOpen && (
                                <div style={{ position: "absolute", top: "110%", right: 0, backgroundColor: "white", minWidth: "240px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", padding: "6px 0", zIndex: 2500, maxHeight: "70vh", overflowY: "auto" }}>
                                    <div style={{ padding: "6px 16px 4px", fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Active Pools (Quick Picks)</div>
                                    {categorizedGames.active.map(game => renderGameLink(game))}

                                    {categorizedGames.inactive.length > 0 && (
                                        <>
                                            <div style={{ height: "1px", background: "#e2e8f0", margin: "6px 0" }} />
                                            <div style={{ padding: "6px 16px 4px", fontSize: "10px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase" }}>Inactive Pools</div>
                                            {categorizedGames.inactive.map(game => renderGameLink(game))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {!isMobile && !loading && (
                            user ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button onClick={() => navigate("/contact")} style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.1)", color: "white", cursor: "pointer" }}>📩 Contact Us</button>
                                    <button onClick={() => navigate("/myaccount")} style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: `1px solid ${GOLD}`, backgroundColor: "transparent", color: GOLD, cursor: "pointer" }}>👤 My Pools</button>
                                    <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{user.name}</span>
                                    <button onClick={handleLogout} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", cursor: "pointer" }}>Log out</button>
                                    <button onClick={() => setChatOpen(true)} style={{ background: "rgba(255, 255, 255, 0.15)", color: "white", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>💬 Open Chat</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button onClick={() => navigate("/contact")} style={{ fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", backgroundColor: "transparent", color: "white", cursor: "pointer" }}>📩 Contact Us</button>
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

            {isMobile && user && currentGame && (
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
                    <nav className="nav-links open" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "280px", backgroundColor: "#111827", boxShadow: "-4px 0 20px rgba(0,0,0,0.3)", zIndex: 2999, display: "flex", flexDirection: "column", padding: "16px 0", overflowY: "auto" }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 12px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                            <span style={{ color: GOLD, fontWeight: 900, fontSize: "12px", letterSpacing: "1px", whiteSpace: "nowrap" }}>MENU PANELS</span>
                            <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: "18px", cursor: "pointer", padding: "4px 8px", lineHeight: 1, flexShrink: 0 }}>✕</button>
                        </div>

                        <div style={{ padding: "10px 0", flex: "1 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                            {currentGame && activeLinks.length > 0 && (
                                <>
                                    <div style={{ padding: "0 20px 6px 20px", fontSize: "10px", color: "#9ca3af", fontWeight: 800, letterSpacing: "1px", width: "100%", boxSizing: "border-box" }}>POOL CONTEXT LINKS</div>
                                    {activeLinks.map(({ to, label, emoji }) => {
                                        const isActive = location.pathname === to;
                                        return (
                                            <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", textDecoration: "none", color: isActive ? GOLD : "#f3f4f6", backgroundColor: isActive ? "rgba(255,255,255,0.05)" : "transparent", fontWeight: isActive ? 700 : 500, fontSize: "12px", width: "100%", boxSizing: "border-box" }}>
                                                <span style={{ width: "18px", textAlign: "center", flexShrink: 0 }}>{emoji}</span> {label}
                                            </Link>
                                        );
                                    })}
                                    <div onClick={() => { setMenuOpen(false); setChatOpen(true); }} style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", padding: "8px 20px", background: "none", border: "none", color: "#f3f4f6", fontWeight: 500, fontSize: "12px", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                                        <span style={{ width: "18px", textAlign: "center", flexShrink: 0 }}>💬</span> Open Pool Chat
                                    </div>
                                    <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", width: "100%", margin: "8px 0" }} />
                                </>
                            )}
                            
                            <div style={{ padding: "0 20px 6px 20px", fontSize: "10px", color: "#64748b", fontWeight: 800, letterSpacing: "1px", width: "100%", boxSizing: "border-box" }}>ACTIVE POOLS</div>
                            {categorizedGames.active.map((game) => {
                                const isLinkActive = true;
                                const isSelected = currentGame?.game_key === game.game_key;
                                return (
                                    <Link key={game.game_key} to={`${game.prefix}/picks`} onClick={(e) => handleDropdownLinkClick(e, isLinkActive, `${game.prefix}/picks`)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", textDecoration: "none", fontSize: "12px", fontWeight: isSelected ? 700 : 500, color: isSelected ? GOLD : "#f3f4f6", width: "100%", boxSizing: "border-box" }}>
                                        <span style={{ width: "18px", textAlign: "center", flexShrink: 0 }}>{game.emoji}</span> {game.game_label.toUpperCase()}
                                    </Link>
                                );
                            })}

                            {categorizedGames.inactive.length > 0 && (
                                <>
                                    <div style={{ padding: "10px 20px 6px 20px", fontSize: "10px", color: "#9ca3af", fontWeight: 800, letterSpacing: "1px", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "6px", width: "100%", boxSizing: "border-box" }}>INACTIVE POOLS</div>
                                    {categorizedGames.inactive.map((game) => {
                                        const isLinkActive = user?.is_admin === true;
                                        const isSelected = currentGame?.game_key === game.game_key;
                                        return (
                                            <Link key={game.game_key} to={`${game.prefix}/picks`} onClick={(e) => handleDropdownLinkClick(e, isLinkActive, `${game.prefix}/picks`)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", textDecoration: "none", fontSize: "12px", fontWeight: isSelected ? 700 : 500, color: !isLinkActive ? "#4b5563" : (isSelected ? GOLD : "#d1d5db"), fontStyle: isLinkActive ? "normal" : "italic", width: "100%", boxSizing: "border-box" }}>
                                                <span style={{ width: "18px", textAlign: "center", flexShrink: 0 }}>{game.emoji}</span> {game.game_label.toUpperCase()} {!isLinkActive && " (🔒)"}
                                            </Link>
                                        );
                                    })}
                                </>
                            )}
                        </div>

                        <div style={{ marginTop: "auto", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#1f2937", flexShrink: 0 }}>
                            {user ? (
                                <>
                                    <div style={{ fontSize: "12px", color: "#e5e7eb", marginBottom: "8px" }}>Logged in: <strong style={{ color: GOLD }}>{user.name}</strong></div>
                                    <button onClick={() => { setMenuOpen(false); navigate("/myaccount"); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${GOLD}`, background: "transparent", color: GOLD, fontWeight: 700, fontSize: "12px", cursor: "pointer", marginBottom: "6px" }}>👤 My Account Dashboard</button>
                                    <button onClick={handleLogout} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #4b5563", background: "#374151", color: "#f87171", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>Log Out</button>
                                </>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <button onClick={() => { setMenuOpen(false); setShowLogin(true); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "none", background: GOLD, color: "#0a1628", fontWeight: 700, fontSize: "12px" }}>Log In</button>
                                </div>
                            )}
                            <div style={{ paddingTop: "6px" }}>
                                <button onClick={() => { setMenuOpen(false); navigate("/contact"); }} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #4b5563", background: "transparent", color: "white", fontWeight: 700, fontSize: "12px" }}>📩 Contact Support</button>
                            </div>
                        </div>
                    </nav>
                </>
            )}

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