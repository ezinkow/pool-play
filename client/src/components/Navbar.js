import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import axios from "axios";
import BanterDrawer from './BanterDrawer'

const GOLD = "#c89d3c";
const NAVY = "#0a1628";

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, login, logout, loading } = useAuth();
    const [chatOpen, setChatOpen] = useState(false);

    const [menuOpen, setMenuOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    // ── AUTH MODE SWITCHES ──────────────────────────────────────────────────
    const [isSignUpMode, setIsSignUpMode] = useState(false); // Toggle between Login and Registration
    const [registerName, setRegisterName] = useState("");     // Full Name for Sign Up

    const [loginName, setLoginName] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginSubmitting, setLoginSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // ── OUTSIDE CLICK REF MATRIX CONTAINER ─────────────────────────────────
    const dropdownRef = useRef(null);

    // ── DATA LAYER STATE ───────────────────────────────────────────────────
    const [rawGameSettings, setRawGameSettings] = useState([]);

    const isHome = location.pathname === "/";

    // ── AUTH HANDLERS ──────────────────────────────────────────────────────
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoginError("");
        setLoginSubmitting(true);

        if (isSignUpMode) {
            // ── SIGN UP REGISTRATION FLOW ──────────────────────────────────────
            if (!registerName.trim()) {
                setLoginError("Please enter your display name.");
                setLoginSubmitting(false);
                return;
            }
            try {
                const res = await axios.post("/api/shared/auth/signup", {
                    username: loginName.trim(),
                    password: loginPassword,
                    name: registerName.trim()
                });

                if (res.data && res.data.success) {
                    // Auto-log the user in following successful creation
                    const result = await login(loginName.trim(), loginPassword);
                    if (result.success) {
                        closeAuthModal();
                    } else {
                        setLoginError("Account created! Please log in manually.");
                        setIsSignUpMode(false);
                    }
                } else {
                    setLoginError(res.data.error || "Failed to create account.");
                }
            } catch (err) {
                setLoginError(err.response?.data?.error || "Registration error occurred.");
            } finally {
                setLoginSubmitting(false);
            }
        } else {
            // ── LOG IN FLOW ──────────────────────────────────────────────────
            const result = await login(loginName.trim(), loginPassword);
            setLoginSubmitting(false);
            if (result.success) {
                closeAuthModal();
            } else {
                setLoginError(result.error);
            }
        }
    };

    const closeAuthModal = () => {
        setShowLogin(false);
        setIsSignUpMode(false);
        setRegisterName("");
        setLoginName("");
        setLoginPassword("");
        setLoginError("");
    };

    const handleLogout = () => {
        logout();
        setMenuOpen(false);
    };

    // Pull tournament matrix metadata elements dynamically out of database
    useEffect(() => {
        axios.get("/api/settings/active-states")
            .then(res => setRawGameSettings(res.data || []))
            .catch(err => console.error("❌ Navbar dynamic data load failure:", err));
    }, []);

    // Bind a dynamic native structural click listener context
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
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

    // ── DYNAMIC NAVIGATION ENGINE ──────────────────────────────────────────

    const currentGame = useMemo(() => {
        if (isHome) return null;
        return rawGameSettings.find(g => g.prefix && location.pathname.startsWith(g.prefix));
    }, [rawGameSettings, location.pathname, isHome]);

    const SIGNUP_LOCK = new Date("2026-03-19T16:15:00Z");
    const signupLocked = new Date() >= SIGNUP_LOCK;

    const activeLinks = useMemo(() => {
        if (!currentGame || !currentGame.prefix) return [];

        const pfx = currentGame.prefix;

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
        } else if (pfx === "/tourneypickem") {
            templateLinks.splice(1, 2,
                { to: "/tourneypickem/picks", label: "Submit Picks", emoji: "📝" },
                { to: "/tourneypickem/mypicks", label: "My Sheet", emoji: "📋" }
            );
            templateLinks.push({ to: "/tourneypickem/scoreboard", label: "Scores", emoji: "🏀" });
            templateLinks.push({ to: "/tourneypickem/picksdisplay", label: "User Picks", emoji: "🔍" });
            templateLinks.push({ to: "/tourneypickem/signup", label: "Join Pool", emoji: "▶️" });
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
        } else if (pfx === "/nfl") {
            templateLinks = [
                { to: "/nfl", label: "Home", emoji: "🏠" },
                { to: "/nfl/rosterpicks", label: "Pick Roster", emoji: "🏈" },
                { to: "/nfl/myroster", label: "My Team", emoji: "📋" },
                { to: "/nfl/scoreboard", label: "Scoreboard", emoji: "📋" },
                { to: "/nfl/standings", label: "Standings", emoji: "🏆" },
                { to: "/nfl/playerstats", label: "Player Pools", emoji: "📊" },
                { to: "/nfl/signup", label: "Join Pool", emoji: "▶️" }
            ];
        } else if (pfx === "/olympics") {
            templateLinks = [
                { to: "/olympics", label: "Home", emoji: "🏠" },
                { to: "/olympics/countrypicks", label: "Country Draft", emoji: "🌍" },
                { to: "/olympics/myroster", label: "My Countries", emoji: "📋" },
                { to: "/olympics/scoreboard", label: "Live Events", emoji: "⏱️" },
                { to: "/olympics/medaltable", label: "Medal Count", emoji: "🏅" },
                { to: "/olympics/standings", label: "Standings", emoji: "🏆" },
                { to: "/olympics/signup", label: "Join Pool", emoji: "▶️" }
            ];
        }

        return templateLinks.filter(({ to }) => !signupLocked || !to.endsWith("/signup"));
    }, [currentGame, signupLocked]);

    const brandLabel = currentGame ? `${currentGame.emoji} ${currentGame.game_label.toUpperCase()}` : "🏆 POOL PLAY 🏊";
    const navBg = currentGame ? currentGame.navBg : "#13447a";

    const handleDropdownLinkClick = (e, isLinkActive, destination) => {
        if (!isLinkActive) {
            e.preventDefault();
            return;
        }
        setDropdownOpen(false);
        navigate(destination);
    };

    const handleNavClick = (path) => {
        setMenuOpen(false);
        if (location.pathname !== path) navigate(path);
    };

    return (
        <>
            <header className="navbar-header" style={{ backgroundColor: navBg, position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, transition: "background-color 0.2s" }}>
                <div className="navbar-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px", padding: "0 16px", gap: "12px" }}>

                    {/* LEFT CONTAINER */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: "1 1 auto" }}>
                        {!isHome && (
                            <Link to="/" style={{ color: "white", fontSize: 12, textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                                ← Home
                            </Link>
                        )}
                        <Link to="/" className="navbar-brand" style={{ fontWeight: 800, textDecoration: "none", color: "white", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px", minWidth: 0, width: "100%" }}>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", width: "100%" }}>
                                {brandLabel}
                            </span>
                        </Link>
                    </div>

                    {/* RIGHT CONTAINER */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>

                        {/* DESKTOP POOL SWITCHER DROPDOWN */}
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
                                    {isHome ? (
                                        <><span>🚀</span> Go to Pool {dropdownOpen ? "▲" : "▼"}</>
                                    ) : (
                                        <><span>🎮</span> Switch Pool {dropdownOpen ? "▲" : "▼"}</>
                                    )}
                                </button>
                                {dropdownOpen && (
                                    <div style={{
                                        position: "absolute", top: "110%", right: 0, backgroundColor: "white",
                                        minWidth: "240px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                        border: "1px solid #e2e8f0", padding: "6px 0", zIndex: 500
                                    }}>
                                        {rawGameSettings.map((game) => {
                                            const isLinkActive = game.is_active === true;
                                            const isSelected = currentGame?.game_key === game.game_key;
                                            return (
                                                <Link
                                                    key={game.game_key}
                                                    to={game.prefix}
                                                    onClick={(e) => handleDropdownLinkClick(e, isLinkActive, game.prefix)}
                                                    style={{
                                                        display: "block", padding: "10px 16px", fontSize: "13px",
                                                        color: !isLinkActive ? "#cbd5e1" : (isSelected ? GOLD : "#334155"),
                                                        textDecoration: "none",
                                                        fontWeight: isSelected ? "700" : "500",
                                                        backgroundColor: isSelected ? "#f8fafc" : "transparent",
                                                        cursor: isLinkActive ? "pointer" : "not-allowed",
                                                        fontStyle: isLinkActive ? "normal" : "italic"
                                                    }}
                                                >
                                                    <span>{game.emoji}</span> {game.game_label.toUpperCase()} {!isLinkActive && " (Inactive)"}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* USER AUTH TRACKER CLUSTERS */}
                        {!loading && (
                            user ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }} className="desktop-auth-cluster">

                                    {/* Optimized Contact Us Button */}
                                    <button
                                        onClick={() => navigate("/comments")}
                                        style={{
                                            fontSize: isMobile ? "10px" : "11px",
                                            fontWeight: 700,
                                            padding: isMobile ? "4px 6px" : "4px 10px",
                                            borderRadius: 12,
                                            border: "1px solid rgba(255,255,255,0.4)",
                                            backgroundColor: "rgba(255,255,255,0.1)",
                                            color: "white",
                                            cursor: "pointer",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        📩 {isMobile ? "Contact" : "Contact Us"}
                                    </button>

                                    {/* Optimized My Pools Button */}
                                    <button
                                        onClick={() => navigate("/myaccount")}
                                        style={{
                                            fontSize: isMobile ? "10px" : "11px",
                                            fontWeight: 700,
                                            padding: isMobile ? "4px 6px" : "4px 10px",
                                            borderRadius: 12,
                                            border: `1px solid ${GOLD}`,
                                            backgroundColor: "transparent",
                                            color: GOLD,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        👤 {isMobile ? "Pools" : "My Pools"}
                                    </button>

                                    {!isMobile && (
                                        <>
                                            <span style={{ color: GOLD, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                                                {user.name}
                                            </span>
                                            <button onClick={handleLogout} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", cursor: "pointer", whiteSpace: "nowrap" }}>
                                                Log out
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <button onClick={() => navigate("/comments")} style={{ fontSize: isMobile ? "10px" : "11px", fontWeight: 700, padding: isMobile ? "4px 6px" : "4px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.3)", backgroundColor: "transparent", color: "white", cursor: "pointer" }}>
                                        📩 {isMobile ? "Contact" : "Contact Us"}
                                    </button>
                                    <button onClick={() => setShowLogin(true)} style={{ fontSize: isMobile ? "10px" : "11px", fontWeight: 700, padding: isMobile ? "4px 6px" : "4px 10px", borderRadius: 12, border: "none", background: GOLD, color: "#0a1628", cursor: "pointer", whiteSpace: "nowrap" }}>
                                        Log in
                                    </button>
                                </div>
                            )
                        )}

                        <button
                            className="menu-toggle"
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Toggle menu"
                            style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer", padding: "4px" }}
                        >
                            {menuOpen ? "✕" : "☰"}
                        </button>
                    </div>
                </div>

                {/* DESKTOP HORIZONTAL LINK SUB-ROW BAR */}
                {!isHome && activeLinks.length > 0 && (
                    <>
                        <div className="desktop-subnav-row" style={{
                            backgroundColor: "rgba(0, 0, 0, 0.14)",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            overflowX: "auto", whiteSpace: "nowrap",
                            padding: "6px 16px", display: "flex", gap: "18px",
                            alignItems: "center",
                            WebkitOverflowScrolling: "touch"
                        }}>
                            {activeLinks.map(({ to, label }) => {
                                const isActive = location.pathname === to;
                                return (
                                    <Link
                                        key={to}
                                        to={to}
                                        style={{
                                            color: isActive ? GOLD : "rgba(255,255,255,0.75)",
                                            textDecoration: "none", fontSize: "12px",
                                            fontWeight: isActive ? "700" : "500", padding: "4px 2px"
                                        }}
                                    >
                                        {label}
                                    </Link>
                                );
                            })}

                            {/* Desktop Inline Trigger View Node */}
                            {!isMobile && (
                                <button
                                    onClick={() => setChatOpen(true)}
                                    style={{
                                        marginLeft: "auto",
                                        background: "rgba(255, 255, 255, 0.15)", color: "white",
                                        border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: "4px",
                                        padding: "2px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                                    }}
                                >
                                    💬 Open Pool Chat
                                </button>
                            )}
                        </div>

                        {/* 📱 MOBILE FLOATING CHAT BUBBLE TRIGGER */}
                        {isMobile && (
                            <button
                                onClick={() => setChatOpen(true)}
                                style={{
                                    position: "fixed",
                                    top: "66px", // Fixed layout offset height beneath navbar header line
                                    right: "12px",
                                    backgroundColor: "#16a34a",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "42px",
                                    height: "42px",
                                    fontSize: "18px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    zIndex: 95
                                }}
                                aria-label="Open pool trash talk chat"
                            >
                                💬
                            </button>
                        )}
                    </>
                )}
            </header>

            {/* Mobile Hamburger Drawer Menu Overlays */}
            {menuOpen && (
                <>
                    <div className="menu-overlay" onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 199 }} />
                    <nav className="nav-links open" style={{ position: "fixed", top: "56px", right: 0, bottom: isMobile ? "56px" : 0, width: "270px", backgroundColor: "#f8f9fa", boxShadow: "-4px 0 12px rgba(0,0,0,0.1)", zIndex: 200, display: "flex", flexDirection: "column", padding: "16px 0", overflowY: "auto" }}>
                        <div style={{ padding: "6px 16px", fontSize: "10px", color: "#64748b", fontWeight: 800, letterSpacing: "0.5px" }}>SELECT TOURNAMENT</div>
                        <div style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "12px" }}>
                            {rawGameSettings.map((game) => {
                                const isLinkActive = game.is_active === true;
                                const isSelected = currentGame?.game_key === game.game_key;
                                return (
                                    <Link
                                        key={game.game_key}
                                        to={game.prefix}
                                        onClick={(e) => handleDropdownLinkClick(e, isLinkActive, game.prefix)}
                                        style={{
                                            padding: "8px 20px", textDecoration: "none", fontSize: "13px",
                                            fontWeight: isSelected ? 700 : 500,
                                            color: !isLinkActive ? "#cbd5e1" : (isSelected ? GOLD : "#475569"),
                                            backgroundColor: isSelected ? "rgba(0,0,0,0.02)" : "transparent",
                                            cursor: isLinkActive ? "pointer" : "not-allowed",
                                            fontStyle: isLinkActive ? "normal" : "italic"
                                        }}
                                    >
                                        <span>{game.emoji}</span> {game.game_label.toUpperCase()} {!isLinkActive && " (🔒)"}
                                    </Link>
                                );
                            })}
                        </div>

                        {currentGame && activeLinks.length > 0 && (
                            <>
                                <div style={{ padding: "4px 16px", fontSize: "10px", color: "#64748b", fontWeight: 800, letterSpacing: "0.5px" }}>POOL NAVIGATION</div>
                                {activeLinks.map(({ to, label, emoji }) => {
                                    const isActive = location.pathname === to;
                                    return (
                                        <Link
                                            key={to}
                                            to={to}
                                            onClick={() => setMenuOpen(false)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px",
                                                textDecoration: "none", color: isActive ? GOLD : "#334155",
                                                backgroundColor: isActive ? "rgba(0,0,0,0.03)" : "transparent",
                                                fontWeight: isActive ? 700 : 500, fontSize: "13px"
                                            }}
                                        >
                                            <span style={{ fontSize: "15px" }}>{emoji}</span>
                                            {label}
                                        </Link>
                                    );
                                })}
                            </>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", padding: "12px 0", borderTop: "1px solid #e2e8f0", marginTop: currentGame ? 12 : 0 }}>
                            <button
                                onClick={() => { setMenuOpen(false); navigate("/comments"); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "10px 20px",
                                    border: "none", background: "transparent", color: "#334155", fontWeight: 700, fontSize: "13px",
                                    cursor: "pointer", textAlign: "left"
                                }}
                            >
                                <span style={{ fontSize: "15px" }}>📩</span>
                                Contact Us
                            </button>
                        </div>

                        {user && (
                            <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid #e2e8f0" }}>
                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>User: <strong>{user.name}</strong></div>
                                <button
                                    onClick={() => { setMenuOpen(false); navigate("/myaccount"); }}
                                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${GOLD}`, background: "white", color: GOLD, fontWeight: 700, fontSize: "12px", cursor: "pointer", marginBottom: "8px" }}
                                >
                                    👤 My Pools Dashboard
                                </button>
                                <button onClick={handleLogout} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", color: "#b91c1c", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                                    Log Out
                                </button>
                            </div>
                        )}
                    </nav>
                </>
            )}

            {/* Bottom Mobile Tab Bar Navigation Row */}
            <nav className="mobile-bottom-nav" style={{
                backgroundColor: navBg, position: "fixed", bottom: 0, left: 0, right: 0,
                height: "56px", display: isMobile && !isHome ? "flex" : "none",
                justifyContent: "space-around", alignItems: "center", zIndex: 100,
                borderTop: "1px solid rgba(255,255,255,0.1)", transition: "background-color 0.2s"
            }}>
                {activeLinks
                    .filter(({ to }) => !to.endsWith("/signup"))
                    .slice(0, 5)
                    .map(({ to, label, emoji }) => {
                        const isActive = location.pathname === to;
                        return (
                            <button
                                key={to}
                                onClick={() => handleNavClick(to)}
                                className="mobile-nav-link"
                                style={{
                                    background: "none", border: "none", color: isActive ? GOLD : "rgba(255,255,255,0.6)",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer"
                                }}
                            >
                                <span style={{ fontSize: "18px" }}>{emoji}</span>
                                <span style={{ fontSize: "10px", fontWeight: isActive ? 700 : 500 }}>{label}</span>
                            </button>
                        );
                    })}
            </nav>

            {/* Auth Modal Overlay UI (Handles Login & Registration Switches) */}
            {showLogin && (
                <div onClick={closeAuthModal} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "white", borderRadius: 16, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                        <button onClick={closeAuthModal} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>

                        <h2 style={{ marginBottom: 4, color: "#0a1628", fontWeight: 800, fontSize: 20 }}>
                            {isSignUpMode ? "Create Account" : "Log in"}
                        </h2>
                        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
                            One account works across all games.
                        </p>

                        <form onSubmit={handleAuthSubmit}>
                            {isSignUpMode && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Full Name</label>
                                    <input type="text" value={registerName} onChange={e => setRegisterName(e.target.value)} placeholder="e.g. John Doe" required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
                                </div>
                            )}

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Username</label>
                                <input type="text" value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Your username" required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
                                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
                            </div>

                            {loginError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{loginError}</p>}

                            <button type="submit" disabled={loginSubmitting} style={{ width: "100%", padding: "12px", backgroundColor: loginSubmitting ? "#9ca3af" : "#0a1628", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loginSubmitting ? "default" : "pointer", marginBottom: 16 }}>
                                {loginSubmitting ? "Processing…" : (isSignUpMode ? "Sign Up" : "Log in")}
                            </button>
                        </form>

                        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, textAlign: "center", fontSize: 13, color: "#4b5563" }}>
                            {isSignUpMode ? (
                                <>
                                    Already have an account?{" "}
                                    <button onClick={() => { setIsSignUpMode(false); setLoginError(""); }} style={{ background: "none", border: "none", color: NAVY, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit" }}>
                                        Log In
                                    </button>
                                </>
                            ) : (
                                <>
                                    Don't have an account?{" "}
                                    <button onClick={() => { setIsSignUpMode(true); setLoginError(""); }} style={{ background: "none", border: "none", color: NAVY, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit" }}>
                                        Create one
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 🛠️ PASSED VIEWPORT PROPERTY STATE TRACKER DOWN */}
            <BanterDrawer
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                gameKey={currentGame?.game_key}
                authUser={user}
                isMobile={isMobile}
            />
        </>
    );
}