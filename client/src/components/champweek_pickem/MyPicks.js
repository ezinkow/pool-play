import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

export default function MyPicks() {
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState("SELECT YOUR NAME");
    const [password, setPassword] = useState("");
    const [authenticated, setAuthenticated] = useState(false);
    const [picks, setPicks] = useState([]);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const fetchPicks = async (name) => {
        setLoading(true);
        try {
            const res = await axios.get("/api/mypicks", { params: { name } });
            const sortedData = (res.data || []).sort((b, a) => new Date(a.game_date) - new Date(b.game_date));
            setPicks(sortedData);
        } catch {
            toast.error("Failed loading picks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        axios.get("/api/users").then(r => setUsers(r.data.sort((a, b) => a.name.localeCompare(b.name))));
        axios.get("/api/standings").then(r => setStandings(r.data));

        // Auto-login from picks page
        const authedUser = sessionStorage.getItem("authedUser");
        if (authedUser) {
            sessionStorage.removeItem("authedUser");
            setUser(authedUser);
            setAuthenticated(true);
            fetchPicks(authedUser);
            return;
        }

        // Auto-login from remembered token
        const saved = localStorage.getItem("rememberedUser");
        if (saved) {
            const { name, token } = JSON.parse(saved);
            axios.post("/api/users/verify-token", { name, token })
                .then(res => {
                    if (res.data.success) {
                        setUser(name);
                        setAuthenticated(true);
                        fetchPicks(name);
                    } else {
                        localStorage.removeItem("rememberedUser");
                    }
                })
                .catch(() => localStorage.removeItem("rememberedUser"));
        }
    }, []);

    const verify = async () => {
        try {
            const res = await axios.post("/api/users/verify", { name: user, password });
            if (!res.data.success) return toast.error("Wrong password");
            setAuthenticated(true);
            toast.success("Identity verified!");

            if (rememberMe) {
                localStorage.setItem("rememberedUser", JSON.stringify({
                    name: user,
                    token: res.data.token
                }));
            }

            fetchPicks(user);
        } catch {
            toast.error("Verify failed");
        }
    };

    const logout = async () => {
        const saved = localStorage.getItem("rememberedUser");
        if (saved) {
            const { token } = JSON.parse(saved);
            await axios.post("/api/users/logout", { token });
            localStorage.removeItem("rememberedUser");
        }
        setAuthenticated(false);
        setUser("SELECT YOUR NAME");
        setPicks([]);
    };

    const myStanding = standings.find(s => s.name === user);

    const getPickLogo = (p) => {
        if (p.pick === p.home_team) return p.home_logo;
        if (p.pick === p.away_team) return p.away_logo;
        return null;
    };

    const getWinnerLogo = (p) => {
        const game = p.Game;
        if (!game || !game.winner || game.winner === "PUSH") return null;
        if (game.winner === p.home_team) return p.home_logo;
        if (game.winner === p.away_team) return p.away_logo;
        return null;
    };

    const renderResultIcon = (p) => {
        const game = p.Game;
        if (!game || game.status !== "STATUS_FINAL" || !game.winner) return null;
        if (game.winner === "PUSH") return <span style={{ color: "orange" }}>➖</span>;
        return p.pick === game.winner
            ? <span style={{ color: "green", fontWeight: "bold" }}>✅</span>
            : <span style={{ color: "red", fontWeight: "bold" }}>❌</span>;
    };

    const getRowClass = (p) => {
        if (!p.Game?.winner) return "";
        if (p.pick === p.Game.winner) return "pick-win";
        if (p.missed_pick_flag) return "pick-missed";
        return "pick-loss";
    };

    const rowBg = (p) => {
        const c = getRowClass(p);
        if (c === "pick-win") return "#f0fdf4";
        if (c === "pick-loss") return "#fef2f2";
        if (c === "pick-missed") return "#fffbeb";
        return "white";
    };

    const PickCard = ({ p }) => {
        const game = p.Game;
        const isFinal = game?.status === "STATUS_FINAL";
        const isLive = game?.status === "STATUS_IN_PROGRESS" || game?.status === "STATUS_HALFTIME";
        const rowClass = getRowClass(p);
        const borderColor = rowClass === "pick-win" ? "#86efac"
            : rowClass === "pick-loss" ? "#fca5a5"
                : rowClass === "pick-missed" ? "#fde68a"
                    : "#e5e7eb";
        return (
            <div style={{
                background: "white", borderRadius: 12, padding: "12px 14px",
                borderLeft: `4px solid ${borderColor}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8, alignItems: "center",
            }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <img src={p.away_logo} height={20} alt="" />
                        {p.Game?.away_team === p.Game?.favorite && (
                            <span style={{ fontSize: 10, color: "#374151" }}>(-{p.line})</span>
                        )}
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>vs</span>
                        <img src={p.home_logo} height={20} alt="" />
                        {p.Game?.home_team === p.Game?.favorite && (
                            <span style={{ fontSize: 10, color: "#374151" }}>(-{p.line})</span>
                        )}
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                        background: isLive ? "#fef2f2" : isFinal ? "#f0fdf4" : "#f3f4f6",
                        color: isLive ? "#dc2626" : isFinal ? "#16a34a" : "#6b7280",
                    }}>
                        {isLive ? "🔴 LIVE" : isFinal ? "Final" : game?.game_clock || "Sched"}
                    </span>
                    {(isFinal || isLive) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700 }}>
                            <img src={p.away_logo} height={16} alt="" />
                            <span>{p.away_score}–{p.home_score}</span>
                            <img src={p.home_logo} height={16} alt="" />
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                    {isFinal && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {p.Game?.winner === "PUSH" ? (
                                <span style={{ fontSize: 11, fontWeight: "bold" }}>PUSH</span>
                            ) : getWinnerLogo(p) ? (
                                <img src={getWinnerLogo(p)} height={18} alt="winner" />
                            ) : "—"}
                            <span style={{ color: "#9ca3af", fontSize: 10, textTransform: "uppercase" }}>Covered</span>
                        </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#9ca3af", fontSize: 10, textTransform: "uppercase" }}>Pick</span>
                        {getPickLogo(p) && <img src={getPickLogo(p)} height={20} alt="pick" />}
                        {renderResultIcon(p)}
                    </div>
                </div>
            </div>
        );
    };

    const thStyle = {
        position: "sticky", top: 65, zIndex: 4,
        padding: "10px 12px", backgroundColor: "#13447a", color: "white",
        borderBottom: "2px solid #c89d3c", textAlign: "left",
        whiteSpace: "nowrap", fontWeight: 600, fontSize: 13,
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "68px 16px 80px" }}>
            <Toaster />
            <h2 style={{ color: "var(--primary-navy)", marginBottom: 16 }}>🏀 My Picks 📝</h2>
            {!authenticated && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                    <select
                        value={user}
                        onChange={e => setUser(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, minWidth: 160 }}
                    >
                        <option value="SELECT YOUR NAME" disabled>SELECT YOUR NAME</option>
                        {users.map(n => (
                            <option key={n.name} value={n.name}>{n.name}</option>
                        ))}
                    </select>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        onKeyDown={e => e.key === "Enter" && verify()}
                        style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, minWidth: 140 }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                        />
                        Remember me
                    </label>
                    <button
                        onClick={verify}
                        style={{ padding: "8px 16px", borderRadius: 6, backgroundColor: "#13447a", color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}
                    >
                        Verify Identity
                    </button>
                </div>
            )}
            {authenticated && (
                <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                        <h4>
                            {user}
                            <button
                                onClick={logout}
                                style={{ marginLeft: 12, fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer", color: "#6b7280", backgroundColor: "transparent" }}
                            >
                                Log out
                            </button>
                        </h4>
                        <h5 style={{ color: "#666" }}>Total Points: {myStanding?.points || 0}</h5>
                    </div>
                    {loading && <p>Loading your picks...</p>}
                    {!loading && picks.length === 0 && <p>No picks found.</p>}
                    {!loading && picks.length > 0 && (
                        <>
                            <div className="mypicks-desktop">
                                <table style={{ borderCollapse: "collapse", width: "100%", background: "white", fontSize: 14 }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Matchup</th>
                                            <th style={thStyle}>Status / Score</th>
                                            <th style={thStyle}>Winner (ATS)</th>
                                            <th style={thStyle}>Your Pick</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {picks.map((p, i) => (
                                            <tr key={i} style={{ backgroundColor: rowBg(p), borderBottom: "1px solid #e5e7eb" }}>
                                                <td style={{ padding: "10px 12px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                                                        <img src={p.away_logo} height={22} alt="" />
                                                        {p.Game?.away_team === p.Game?.favorite && (
                                                            <span style={{ fontSize: 13, color: "#374151" }}>(-{p.line})</span>
                                                        )}
                                                        <span style={{ color: "#9ca3af" }}>vs</span>
                                                        <img src={p.home_logo} height={22} alt="" />
                                                        {p.Game?.home_team === p.Game?.favorite && (
                                                            <span style={{ fontSize: 13, color: "#374151" }}>(-{p.line})</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "10px 12px" }}>
                                                    {(p.Game?.status === "STATUS_FINAL" || p.Game?.status === "STATUS_IN_PROGRESS" || p.Game?.status === "STATUS_HALFTIME") ? (
                                                        <div style={{ whiteSpace: "nowrap" }}>
                                                            <span style={{ fontWeight: p.Game?.status === "STATUS_IN_PROGRESS" ? "bold" : "normal" }}>
                                                                {p.Game?.status === "STATUS_FINAL" ? "Final: " : `${p.Game.game_clock}: `}
                                                            </span>
                                                            <img src={p.away_logo} height={22} style={{ margin: "0 4px" }} alt="" />
                                                            {p.away_score} - {p.home_score}
                                                            <img src={p.home_logo} height={22} style={{ margin: "0 4px" }} alt="" />
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: "#666" }}>{p.Game?.game_clock || "Scheduled"}</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                                    {p.Game?.winner === "PUSH" ? (
                                                        <span style={{ fontSize: 12, fontWeight: "bold" }}>PUSH</span>
                                                    ) : getWinnerLogo(p) ? (
                                                        <img src={getWinnerLogo(p)} height={24} alt="winner" style={{ borderRadius: 4 }} />
                                                    ) : "—"}
                                                </td>
                                                <td style={{ padding: "10px 12px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                        <img src={getPickLogo(p)} height={24} style={{ borderRadius: 4 }} alt="pick" />
                                                        {renderResultIcon(p)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mypicks-mobile">
                                {picks.map((p, i) => <PickCard key={i} p={p} />)}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}