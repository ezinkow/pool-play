import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import axios from "axios";
import BanterDrawer from './BanterDrawer';
import AuthModal from "./AuthModal";
import PoolEmoji from "./PoolEmoji";
import logo from '../../src/images/logo.jpg'

const GOLD = "#c89d3c";

const SPECIAL_POOL_NAV_LINKS = {
    ncaab_tourney_bracket: [
        { to: "/", label: "Home", emoji: "🏠" },
        { to: "/bracket", label: "Make Picks", emoji: "🎯" },
        { to: "/mybracket", label: "My Bracket", emoji: "📋" },
        { to: "/standings", label: "Standings", emoji: "🏆" }
    ],
    ncaab_tourney_squares: [
        { to: "/", label: "Home", emoji: "🏠" },
        { to: "/grid", label: "Grids", emoji: "🟩" },
        { to: "/results", label: "Results", emoji: "💰" }
    ],
    nfl_super_bowl_squares: [
        { to: "/", label: "Home", emoji: "🏠" },
        { to: "/grid", label: "Grids", emoji: "🟩" },
        { to: "/results", label: "Results", emoji: "💰" }
    ]
};

export default function Navbar({ isDarkMode, toggleTheme }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, loading } = useAuth();
    const [chatOpen, setChatOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
    const dropdownRef = useRef(null);
    const [rawPoolSettings, setRawPoolSettings] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const isHome = location.pathname === "/";

    const handleLogout = () => {
        logout();
        setMenuOpen(false);
        window.location.reload();
    };

    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(res => setRawPoolSettings(res.data || []))
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
        const sortedGames = [...rawPoolSettings].sort((a, b) => (b.url_path?.length || 0) - (a.url_path?.length || 0));

        return sortedGames.find(g => {
            if (!g.url_path) return false;
            const pfx = g.url_path;
            return location.pathname === pfx || location.pathname.startsWith(pfx + "/");
        });
    }, [rawPoolSettings, location.pathname, isHome]);

    const activeLinks = useMemo(() => {
        if (!currentGame || !currentGame.url_path) return [];
        const pfx = currentGame.url_path;
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

        const specialLinks = SPECIAL_POOL_NAV_LINKS[currentGame.game_key];
        let templateLinks = parsedNavLinks && Array.isArray(parsedNavLinks)
            ? parsedNavLinks.map(link => ({
                ...link,
                to: link.to.startsWith("http") ? link.to : `${pfx}${link.to === "/" ? "" : link.to}`
            }))
            : (specialLinks || [
                { to: `${pfx}`, label: "Home", emoji: "🏠" },
                { to: `${pfx}/picks`, label: "Make Picks", emoji: "🎯" },
                { to: `${pfx}/mypicks`, label: "My Picks", emoji: "📋" },
                { to: `${pfx}/grouppicks`, label: "Group Picks", emoji: "📊" },
                { to: `${pfx}/standings`, label: "Standings", emoji: "🏆" }
            ]).map(link => ({
                ...link,
                to: link.to.startsWith("http") ? link.to : `${pfx}${link.to === "/" ? "" : link.to}`
            }));

        return templateLinks.filter(({ to }) => isAdmin || !signupLocked || !to.endsWith("/signup"));
    }, [currentGame, user]);

    const brandLabel = currentGame ? `| ${currentGame.game_label.toUpperCase()}` : "🏆 POOL PLAY 🏊";
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

        const sorted = [...rawPoolSettings].sort((a, b) =>
            a.game_label.localeCompare(b.game_label)
        );
        sorted.forEach(game => {
            const isActiveState = game.is_active === true || game.is_active === 1 || game.is_active === "true";
            const userJoined = user?.is_admin === true || (game.user_ids && user && game.user_ids.includes(user.id));

            if (isActiveState && userJoined) {
                active.push(game);
            } else {
                inactive.push(game);
            }
        });
        return { active, inactive };
    }, [rawPoolSettings, user]);

    const renderGameLink = (game) => {
        const isLinkActive = (game.is_active === true || game.is_active === 1 || game.is_active === "true") || user?.is_admin === true;
        const isSelected = currentGame?.game_key === game.game_key;
        const destination = `${game.url_path}/picks`;

        return (
            <Link
                key={game.game_key}
                to={destination}
                onClick={(e) => handleDropdownLinkClick(e, isLinkActive, destination)}
                style={{
                    display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", fontSize: "12px",
                    color: !isLinkActive
                        ? (isDarkMode ? "#94a3b8" : "#9ca3af")
                        : (isSelected ? GOLD : (isDarkMode ? "#e2e8f0" : "#334155")),
                    textDecoration: "none", fontWeight: isSelected ? "700" : "500",
                    backgroundColor: isSelected
                        ? (isDarkMode ? "rgba(255,255,255,0.08)" : "#f8fafc")
                        : "transparent",
                    cursor: isLinkActive ? "pointer" : "default"
                }}
            >
                <PoolEmoji gameKey={game.game_key} style={{ width: "18px", textAlign: "center", flexShrink: 0 }} /> {game.game_label.toUpperCase()}
            </Link>
        );
    };

    const renderQuickJumpMenu = () => (
        <div className="navbar-quick-jump" style={{ backgroundColor: isDarkMode ? "#172438" : "white", border: `1px solid ${isDarkMode ? "#2a3a50" : "#e2e8f0"}` }}>
            <div style={{ padding: "6px 16px 4px", fontSize: "10px", fontWeight: 800, color: isDarkMode ? "#a9b8cb" : "#64748b", textTransform: "uppercase" }}>My Active Pools (Quick Picks)</div>
            {categorizedGames.active.length > 0 ? (
                categorizedGames.active.map(game => renderGameLink(game))
            ) : (
                <div style={{ padding: "10px 16px", fontSize: "12px", color: isDarkMode ? "#a9b8cb" : "#64748b" }}>No active joined pools found.</div>
            )}
        </div>
    );

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
                        {!isMobile && !loading && (
                            user ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div ref={dropdownRef} className="navbar-control-menu">
                                        <button
                                            className="navbar-control"
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
                                        {dropdownOpen && renderQuickJumpMenu()}
                                    </div>
                                    <button className="navbar-control" onClick={() => navigate("/contact")} style={{ border: "1px solid rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.1)", color: "white" }}>📩 Contact Us</button>
                                    <button className="navbar-control" onClick={() => navigate("/myaccount")} style={{ border: `1px solid ${GOLD}`, backgroundColor: "transparent", color: GOLD }}>👤 My Pools</button>
                                    <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{user.name}</span>
                                    <button className="navbar-control" onClick={handleLogout} style={{ border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white" }}>Log out</button>
                                    <button className="navbar-control" onClick={() => setChatOpen(true)} style={{ background: "rgba(255, 255, 255, 0.15)", color: "white", border: "1px solid rgba(255, 255, 255, 0.25)" }}>💬 Open Chat</button>
                                    <button
                                        className="navbar-control"
                                        onClick={toggleTheme}
                                        style={{
                                            background: isDarkMode ? "rgba(255,255,255,0.15)" : "#0f172a",
                                            color: isDarkMode ? "white" : "#ffffff",
                                            border: isDarkMode ? "1px solid rgba(255,255,255,0.3)" : "none",
                                        }}
                                    >
                                        {isDarkMode ? "☀️ Light" : "🌙 Dark"}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button className="navbar-control" onClick={() => navigate("/contact")} style={{ border: "1px solid rgba(255,255,255,0.3)", backgroundColor: "transparent", color: "white" }}>📩 Contact Us</button>
                                    <button className="navbar-control" onClick={() => setShowLogin(true)} style={{ border: "none", background: GOLD, color: "#0a1628" }}>Log in</button>
                                    <button
                                        className="navbar-control"
                                        onClick={toggleTheme}
                                        style={{
                                            background: isDarkMode ? "rgba(255,255,255,0.15)" : "#0f172a",
                                            color: isDarkMode ? "white" : "#ffffff",
                                            border: isDarkMode ? "1px solid rgba(255,255,255,0.3)" : "none",
                                        }}
                                    >
                                        {isDarkMode ? "☀️ Light" : "🌙 Dark"}
                                    </button>
                                </div>
                            )
                        )}

                        {isMobile && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div ref={dropdownRef} className="navbar-control-menu">
                                    <button
                                        className="navbar-control navbar-control-icon"
                                        aria-label="Quick jump to a pool"
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        style={{
                                        backgroundColor: "rgba(200, 157, 60, 0.25)", color: GOLD,
                                        border: `1px solid ${GOLD}`, borderRadius: "6px",
                                        padding: "4px 8px", fontSize: "11px", fontWeight: 700,
                                        cursor: "pointer", display: "flex", alignItems: "center", gap: "3px",
                                        whiteSpace: "nowrap"
                                        }}
                                    >
                                        ⚡{dropdownOpen ? "▲" : "▼"}
                                    </button>
                                    {dropdownOpen && renderQuickJumpMenu()}
                                </div>
                                <button
                                    className="navbar-control navbar-control-icon"
                                    onClick={toggleTheme}
                                    style={{
                                        background: isDarkMode ? "rgba(255,255,255,0.15)" : "#0f172a",
                                        color: isDarkMode ? "white" : "#ffffff",
                                        border: isDarkMode ? "1px solid rgba(255,255,255,0.3)" : "none",
                                    }}
                                >
                                    {isDarkMode ? "☀️" : "🌙"}
                                </button>
                                <button
                                    className="menu-toggle navbar-control navbar-control-icon"
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    aria-label="Toggle menu"
                                    style={{ background: "none", border: "none", color: "white", fontSize: "22px", cursor: "pointer", padding: "4px", display: "block" }}
                                >
                                    <span style={{
                                        display: "inline-block",
                                        transition: "transform 0.3s ease, opacity 0.2s ease",
                                        transform: menuOpen ? "rotate(90deg) scale(1.1)" : "rotate(0deg) scale(1)",
                                    }}>
                                        {menuOpen ? "✕" : "☰"}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {isMobile && user && currentGame && (
                <button
                    className="navbar-control navbar-control-icon navbar-chat-control"
                    onClick={() => setChatOpen(true)}
                    style={{
                        position: "fixed",
                        top: "42px",
                        right: "-3px",
                        zIndex: 2050,
                        backgroundColor: "transparent",
                        border: "none",
                        padding: "4px",
                        fontSize: "25px",
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
                    <div className="menu-overlay" onClick={() => setMenuOpen(false)} style={{ position: "fixed", top: "60px", insetX: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 2998, display: "block" }} />
                    <nav className="nav-links open" style={{ position: "absolute", top: "60px", right: "12px", width: "260px", maxHeight: "calc(100vh - 75px)", backgroundColor: "#0b132b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", zIndex: 2999, display: "flex", flexDirection: "column", padding: "10px 0", overflowY: "auto", animation: "slideDown 0.2s ease-out" }}>
                        <div style={{ padding: "4px 0", flex: "1 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                            {currentGame && activeLinks.length > 0 && (
                                <>
                                    <div style={{ padding: "4px 16px 4px 16px", fontSize: "9px", color: "#9ca3af", fontWeight: 800, letterSpacing: "1px", width: "100%", boxSizing: "border-box" }}>POOL LINKS</div>
                                    {activeLinks.map(({ to, label, emoji }) => {
                                        const isActive = location.pathname === to;
                                        return (
                                            <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", textDecoration: "none", color: isActive ? GOLD : "#f3f4f6", backgroundColor: isActive ? "rgba(212,175,55,0.1)" : "transparent", fontWeight: isActive ? 700 : 500, fontSize: "12px", width: "100%", boxSizing: "border-box" }}>
                                                <span style={{ width: "16px", textAlign: "center", flexShrink: 0 }}>{emoji}</span> {label}
                                            </Link>
                                        );
                                    })}
                                    <button type="button" onClick={() => { setMenuOpen(false); setChatOpen(true); }} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", minHeight: 40, padding: "8px 16px", background: "none", border: "none", color: "#f3f4f6", fontWeight: 500, fontSize: "12px", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                                        <span style={{ width: "16px", textAlign: "center", flexShrink: 0 }}>💬</span> Open Pool Chat
                                    </button>
                                    <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", width: "100%", margin: "6px 0" }} />
                                </>
                            )}

                            <div style={{ padding: "4px 16px 4px 16px", fontSize: "9px", color: "#64748b", fontWeight: 800, letterSpacing: "1px", width: "100%", boxSizing: "border-box" }}>MY ACTIVE POOLS</div>
                            {categorizedGames.active.map((game) => {
                                const isLinkActive = true;
                                const isSelected = currentGame?.game_key === game.game_key;
                                return (
                                    <Link key={game.game_key} to={`${game.url_path}/picks`} onClick={(e) => handleDropdownLinkClick(e, isLinkActive, `${game.url_path}/picks`)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", textDecoration: "none", fontSize: "12px", fontWeight: isSelected ? 700 : 500, color: isSelected ? GOLD : "#f3f4f6", width: "100%", boxSizing: "border-box" }}>
                                        <PoolEmoji gameKey={game.game_key} style={{ width: "16px", textAlign: "center", flexShrink: 0 }} /> {game.game_label.toUpperCase()}
                                    </Link>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: "6px", padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#060a17", borderRadius: "0 0 12px 12px", flexShrink: 0 }}>
                            {user ? (
                                <>
                                    <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "8px" }}>Logged in: <strong style={{ color: GOLD }}>{user.name}</strong></div>
                                    <button className="navbar-menu-control" onClick={() => { setMenuOpen(false); navigate("/myaccount"); }} style={{ width: "100%", border: `1px solid ${GOLD}`, background: "transparent", color: GOLD, marginBottom: "6px" }}>👤 My Account Dashboard</button>
                                    <button className="navbar-menu-control" onClick={handleLogout} style={{ width: "100%", border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.1)", color: "#f87171" }}>Log Out</button>
                                </>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <button className="navbar-menu-control" onClick={() => { setMenuOpen(false); setShowLogin(true); }} style={{ width: "100%", border: "none", background: GOLD, color: "#061a33" }}>Log In</button>
                                </div>
                            )}
                            <div style={{ paddingTop: "6px" }}>
                                <button className="navbar-menu-control" onClick={() => { setMenuOpen(false); navigate("/contact"); }} style={{ width: "100%", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#cbd5e1" }}>📩 Contact Support</button>
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