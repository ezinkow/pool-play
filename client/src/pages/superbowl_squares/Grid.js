import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const GOLD = "#c89d3c";
const BLUE = "#0369a1";
const LOCK_TIME = new Date("2026-03-19T09:10:00-05:00");
const SQ = 52;
const ROW_NUM_W = 28;
const GUTTER_W = 28;

export default function SquaresGrid() {
    const [activeGrid, setActiveGrid] = useState(1);
    const [grid1, setGrid1] = useState([]);
    const [grid2, setGrid2] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState("SELECT YOUR NAME");
    const [password, setPassword] = useState("");
    const [authenticated, setAuthenticated] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(true);
    const isLocked = new Date() >= LOCK_TIME;

    const grid = activeGrid === 2 ? grid2 : grid1;
    const setGrid = activeGrid === 2 ? setGrid2 : setGrid1;

    useEffect(() => {
        Promise.all([
            axios.get("/api/tourneysquares/grid?grid_id=1"),
            axios.get("/api/tourneysquares/grid?grid_id=2"),
            axios.get("/api/tourneysquares/users"),
        ]).then(([grid1Res, grid2Res, usersRes]) => {
            setGrid1(grid1Res.data);
            setGrid2(grid2Res.data);
            setUsers(usersRes.data);
            setLoading(false);
        });

        const saved = localStorage.getItem("rememberedUserSquares");
        if (saved) {
            const { name, token } = JSON.parse(saved);
            axios.post("/api/tourneysquares/users/verify-token", { name, token })
                .then(res => {
                    if (res.data.success) {
                        setSelectedUser(name);
                        setAuthenticated(true);
                    } else {
                        localStorage.removeItem("rememberedUserSquares");
                    }
                })
                .catch(() => localStorage.removeItem("rememberedUserSquares"));
        }
    }, []);

    const verify = async () => {
        try {
            const res = await axios.post("/api/tourneysquares/users/verify", { name: selectedUser, password });
            if (!res.data.success) return toast.error("Wrong password");
            setAuthenticated(true);
            toast.success("Identity verified!");
            if (rememberMe) {
                localStorage.setItem("rememberedUserSquares", JSON.stringify({
                    name: selectedUser, token: res.data.token
                }));
            }
        } catch {
            toast.error("Verify failed");
        }
    };

    const logout = async () => {
        const saved = localStorage.getItem("rememberedUserSquares");
        if (saved) {
            const { token } = JSON.parse(saved);
            await axios.post("/api/tourneysquares/users/logout", { token });
            localStorage.removeItem("rememberedUserSquares");
        }
        setAuthenticated(false);
        setSelectedUser("SELECT YOUR NAME");
        setPassword("");
    };

    const handleSquareClick = async (square) => {
        if (isLocked) return;
        if (!authenticated) return toast.error("Verify your identity first");
        try {
            if (square.owner_name === selectedUser) {
                await axios.post("/api/tourneysquares/unclaim", { square_id: square.square_id, owner_name: selectedUser });
                setGrid(prev => prev.map(s => s.square_id === square.square_id ? { ...s, owner_name: null } : s));
                toast.success("Square unclaimed");
            } else if (!square.owner_name) {
                await axios.post("/api/tourneysquares/claim", { square_id: square.square_id, owner_name: selectedUser });
                setGrid(prev => prev.map(s => s.square_id === square.square_id ? { ...s, owner_name: selectedUser } : s));
                toast.success("Square claimed!");
            } else {
                toast.error(`Already claimed by ${square.owner_name}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Action failed");
        }
    };

    const colNumbers = useMemo(() => {
        const assigned = grid.filter(s => s.colNumber !== null);
        if (assigned.length === 0) return Array(10).fill("?");
        const cols = Array(10).fill("?");
        for (const s of assigned) cols[s.square_id % 10] = s.colNumber;
        return cols;
    }, [grid]);

    const rowNumbers = useMemo(() => {
        const assigned = grid.filter(s => s.rowNumber !== null);
        if (assigned.length === 0) return Array(10).fill("?");
        const rows = Array(10).fill("?");
        for (const s of assigned) rows[Math.floor((s.square_id - (activeGrid === 1 ? 0 : 100)) / 10)] = s.rowNumber;
        return rows;
    }, [grid, activeGrid]);

    const claimedCount = grid.filter(s => s.owner_name).length;
    const myCount = grid.filter(s => s.owner_name === selectedUser).length;
    const totalMyCount = [...grid1, ...grid2].filter(s => s.owner_name === selectedUser).length;

    const ownerColors = useMemo(() => {
        const allSquares = [...grid1, ...grid2];
        const owners = [...new Set(allSquares.map(s => s.owner_name).filter(Boolean))];
        const palette = [
            "#dbeafe", "#dcfce7", "#fef9c3", "#fce7f3", "#ede9fe",
            "#ffedd5", "#cffafe", "#f0fdf4", "#fef2f2", "#e0f2fe",
            "#fef3c7", "#d1fae5", "#fee2e2", "#ede9fe", "#fce7f3",
        ];
        const map = {};
        owners.forEach((o, i) => { map[o] = palette[i % palette.length]; });
        return map;
    }, [grid1, grid2]);

    if (loading) return <div style={{ padding: 80, textAlign: "center", color: BLUE }}>Loading grid...</div>;

    const gridWidth = GUTTER_W + ROW_NUM_W + SQ * 10;

    // Normalize square index for display (grid2 squares start at 100)
    const getRowIdx = (square_id) => Math.floor((square_id - (activeGrid === 1 ? 0 : 100)) / 10);
    const getColIdx = (square_id) => square_id % 10;

    return (
        <div style={{ paddingTop: 68, paddingBottom: 80, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            <Toaster />

            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #0284c7 100%)`, color: "white", padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h2 style={{ margin: 0, color: GOLD, fontWeight: 900 }}>🟩 Tournament Squares</h2>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                            Grid {activeGrid}: {claimedCount}/100 claimed · 25 credits/square
                        </div>
                    </div>
                    {authenticated && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ color: GOLD, fontWeight: 700 }}>{selectedUser}</span>
                            {totalMyCount > 0 && (
                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                                    {totalMyCount} total square{totalMyCount !== 1 ? "s" : ""}
                                </span>
                            )}
                            <button onClick={logout} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", color: "white", backgroundColor: "transparent" }}>
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 12px" }}>

                {/* Auth */}
                {!authenticated && !isLocked && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}>
                            <option value="SELECT YOUR NAME" disabled>SELECT YOUR NAME</option>
                            {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                        </select>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="Password" onKeyDown={e => e.key === "Enter" && verify()}
                            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, minWidth: 140 }} />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                            Remember me
                        </label>
                        <button onClick={verify}
                            style={{ padding: "8px 16px", borderRadius: 6, backgroundColor: BLUE, color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}>
                            Verify Identity
                        </button>
                        <button onClick={() => window.location.hash = "#/squares/change-password"}
                            style={{ padding: "8px 16px", borderRadius: 6, backgroundColor: "transparent", color: "#6b7280", border: "1px solid #d1d5db", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                            Forgot Password?
                        </button>
                    </div>
                )}

                {/* Grid tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[1, 2].map(g => (
                        <button key={g} onClick={() => setActiveGrid(g)} style={{
                            padding: "8px 24px", borderRadius: 20, border: "none",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                            backgroundColor: activeGrid === g ? BLUE : "#e5e7eb",
                            color: activeGrid === g ? "white" : "#374151",
                        }}>
                            Grid {g} {activeGrid === g ? `(${claimedCount}/100)` : `(${(g === 1 ? grid1 : grid2).filter(s => s.owner_name).length}/100)`}
                        </button>
                    ))}
                </div>

                {authenticated && !isLocked && (
                    <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: ownerColors[selectedUser] || "#dbeafe", border: `2px solid ${BLUE}`, display: "inline-block" }} />
                            Your squares (click to unclaim)
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "white", border: "1px solid #d1d5db", display: "inline-block" }} />
                            Available (click to claim)
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#e5e7eb", border: "1px solid #9ca3af", display: "inline-block" }} />
                            Taken by others
                        </span>
                    </div>
                )}

                {/* Scrollable grid */}
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <div style={{ width: gridWidth + GUTTER_W }}>

                        {/* Winner's Last Digit label */}
                        <div style={{ display: "flex" }}>
                            <div style={{ width: GUTTER_W + ROW_NUM_W, flexShrink: 0 }} />
                            <div style={{ width: SQ * 10, textAlign: "center", fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
                                Winner's Last Digit
                            </div>
                        </div>

                        {/* Col numbers */}
                        <div style={{ display: "flex", marginBottom: 4 }}>
                            <div style={{ width: GUTTER_W + ROW_NUM_W, flexShrink: 0 }} />
                            {colNumbers.map((n, i) => (
                                <div key={i} style={{ width: SQ, flexShrink: 0, textAlign: "center", fontSize: 13, fontWeight: 800, color: BLUE }}>
                                    {n === "?" ? "?" : n}
                                </div>
                            ))}
                        </div>

                        {/* Grid with loser label */}
                        <div style={{ display: "flex" }}>
                            <div style={{ width: GUTTER_W, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{
                                    fontSize: 10, fontWeight: 700, color: GOLD,
                                    textTransform: "uppercase", letterSpacing: "1px",
                                    writingMode: "vertical-rl", transform: "rotate(180deg)",
                                    whiteSpace: "nowrap",
                                }}>
                                    Loser's Last Digit
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                {Array.from({ length: 10 }).map((_, rowIdx) => (
                                    <div key={rowIdx} style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                                        <div style={{ width: ROW_NUM_W, flexShrink: 0, textAlign: "center", fontSize: 13, fontWeight: 800, color: BLUE }}>
                                            {rowNumbers[rowIdx] === "?" ? "?" : rowNumbers[rowIdx]}
                                        </div>
                                        {Array.from({ length: 10 }).map((_, colIdx) => {
                                            const squareId = (activeGrid === 1 ? 0 : 100) + rowIdx * 10 + colIdx;
                                            const square = grid.find(s => s.square_id === squareId);
                                            if (!square) return <div key={colIdx} style={{ width: SQ, height: SQ - 4, flexShrink: 0 }} />;
                                            const isOwner = square.owner_name === selectedUser;
                                            const isTaken = !!square.owner_name && !isOwner;
                                            const bgColor = square.owner_name ? ownerColors[square.owner_name] || "#e5e7eb" : "white";
                                            const borderColor = isOwner ? BLUE : isTaken ? "#9ca3af" : "#d1d5db";
                                            const borderWidth = isOwner ? 2 : 1;
                                            return (
                                                <div key={colIdx}
                                                    onClick={() => handleSquareClick(square)}
                                                    title={square.owner_name || "Available"}
                                                    style={{
                                                        width: SQ, height: SQ - 4, flexShrink: 0,
                                                        backgroundColor: bgColor,
                                                        border: `${borderWidth}px solid ${borderColor}`,
                                                        borderRadius: 4,
                                                        cursor: isLocked ? "default" : (isTaken ? "not-allowed" : "pointer"),
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: 8, fontWeight: 600, color: "#374151",
                                                        textAlign: "center", padding: 2,
                                                        overflow: "hidden", transition: "all 0.1s",
                                                        userSelect: "none", lineHeight: 1.2,
                                                    }}
                                                    onMouseEnter={e => { if (!isLocked && !isTaken) e.currentTarget.style.opacity = "0.8"; }}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                                                >
                                                    {square.owner_name
                                                        ? square.owner_name
                                                        : <span style={{ color: "#d1d5db", fontSize: 11 }}>+</span>
                                                    }
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Square ownership */}
                <div style={{ marginTop: 24 }}>
                    <h4 style={{ color: BLUE, marginBottom: 12 }}>Grid {activeGrid} Ownership</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {Object.entries(
                            grid.reduce((acc, s) => {
                                if (s.owner_name) acc[s.owner_name] = (acc[s.owner_name] || 0) + 1;
                                return acc;
                            }, {})
                        )
                            .sort((a, b) => b[1] - a[1])
                            .map(([name, count]) => (
                                <div key={name} style={{
                                    padding: "6px 12px", borderRadius: 20,
                                    backgroundColor: ownerColors[name] || "#e5e7eb",
                                    fontSize: 13, fontWeight: 600,
                                    border: name === selectedUser ? `2px solid ${BLUE}` : "1px solid #e5e7eb",
                                }}>
                                    {name} — {count} square{count !== 1 ? "s" : ""} ({count * 25} cr)
                                </div>
                            ))
                        }
                        {claimedCount < 100 && (
                            <div style={{ padding: "6px 12px", borderRadius: 20, backgroundColor: "#f3f4f6", fontSize: 13, color: "#6b7280" }}>
                                {100 - claimedCount} unclaimed
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}