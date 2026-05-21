import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import NbaGatekeeper from "../../components/nba/NbaGatekeeper";

const NAVY = "#0a1628";
const GOLD = "#c89d3c";

export default function MyPicks() {
    const { user: authUser, logout, loading: authLoading } = useAuth();
    const [picks, setPicks] = useState([]);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authUser) return;
        setLoading(true);
        Promise.all([
            axios.get("/api/nba/picks", { params: { name: authUser.name } }),
            axios.get("/api/nba/standings"),
        ]).then(([picksRes, standingsRes]) => {
            setPicks(picksRes.data || []);
            setStandings(standingsRes.data || []);
        }).catch(() => toast.error("Failed to load your data"))
            .finally(() => setLoading(false));
    }, [authUser]);

    const myStanding = useMemo(() =>
        standings.find(s => s.entry_name === authUser?.name || s.name === authUser?.name),
        [standings, authUser]
    );

    const totalConfidence = useMemo(() =>
        picks.reduce((sum, p) => sum + (parseInt(p.confidence) || 0), 0),
        [picks]
    );

    const getSeries = p => p.series || p.NbaSeries;
    const getPickLogo = p => {
        const s = getSeries(p);
        if (!s) return null;
        return p.pick === s.home_team ? s.home_logo : s.away_logo;
    };
    const getResult = p => {
        const s = getSeries(p);
        if (!s || s.status !== "STATUS_FINAL" || !s.winner) return null;
        if (p.pick !== s.winner) return { icon: "❌", color: "#fef2f2", label: "Wrong" };
        const perfect = p.series_length_guess === s.series_length;
        return perfect
            ? { icon: "🌟", color: "#fef9c3", label: `Perfect! ×2 (${p.confidence * 2} pts)` }
            : { icon: "✅", color: "#f0fdf4", label: `+${p.confidence} pts` };
    };
    const getSeriesStatus = s => {
        if (!s) return "—";
        if (s.status === "STATUS_FINAL")
            return `Final ${s.away_wins}–${s.home_wins}`;
        if (!s.away_wins && !s.home_wins)
            return "Scheduled";
        const leader = s.away_wins > s.home_wins ? s.away_team : s.home_team;
        return `${leader} leads ${Math.max(s.away_wins, s.home_wins)}–${Math.min(s.away_wins, s.home_wins)}`;
    };

    if (authLoading) return <div style={{ paddingTop: 100, textAlign: "center" }}>Verifying session…</div>;
    if (!authUser) return <div style={{ paddingTop: 100, textAlign: "center" }}><h3>Please log in.</h3></div>;

    return (
        <NbaGatekeeper user={authUser}>
            <div style={{ maxWidth: 900, margin: "0 auto", padding: "68px 16px 80px" }}>
                <Toaster />

                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12,
                }}>
                    <div>
                        <h2 style={{ color: NAVY, margin: 0 }}>🏀 My Picks</h2>
                        <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>
                            {authUser.name}
                        </p>
                        <div style={{ fontSize: 13, color: NAVY, fontWeight: 600, marginTop: 4 }}>
                            Confidence assigned: {totalConfidence} pts
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>
                            {myStanding?.points || 0} pts
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>standing score</div>
                        <button
                            onClick={logout}
                            style={{
                                marginTop: 8, fontSize: 12, padding: "4px 12px",
                                borderRadius: 6, border: "1px solid #d1d5db",
                                cursor: "pointer", background: "white",
                            }}
                        >
                            Log out
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p style={{ color: "#9ca3af" }}>Loading your picks…</p>
                ) : picks.length === 0 ? (
                    <div style={{
                        padding: 40, textAlign: "center",
                        background: "#f9fafb", borderRadius: 12,
                        border: "2px dashed #d1d5db",
                    }}>
                        <p style={{ color: "#6b7280", fontWeight: 600 }}>
                            No picks yet for this round.
                        </p>
                        <button
                            onClick={() => { window.location.hash = "#/nba/picks"; }}
                            style={{
                                padding: "10px 20px", backgroundColor: NAVY,
                                color: "white", border: "none", borderRadius: 8,
                                cursor: "pointer", fontWeight: 700,
                            }}
                        >
                            Go make picks →
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ── Desktop table ── */}
                        <div className="mypicks-desktop" style={{
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            borderRadius: 10, overflow: "hidden",
                        }}>
                            <table style={{ borderCollapse: "collapse", width: "100%", background: "white" }}>
                                <thead style={{ backgroundColor: NAVY, color: "white" }}>
                                    <tr>
                                        <th style={th("left")}>Matchup</th>
                                        <th style={th("left")}>Status</th>
                                        <th style={th("center")}>Points</th>
                                        <th style={th("center")}>Pick</th>
                                        <th style={th("center")}>Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {picks.map((p, i) => {
                                        const s = getSeries(p);
                                        const result = getResult(p);
                                        return (
                                            <tr key={i} style={{
                                                backgroundColor: result?.color || "white",
                                                borderBottom: "1px solid #f3f4f6",
                                            }}>
                                                <td style={td("left")}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        {s?.away_logo && <img src={s.away_logo} height={20} alt="" />}
                                                        <span style={{ fontSize: 12 }}>
                                                            ({s?.away_seed}) {s?.away_team}
                                                        </span>
                                                        <span style={{ color: "#9ca3af", fontSize: 11 }}>vs</span>
                                                        <span style={{ fontSize: 12 }}>
                                                            ({s?.home_seed}) {s?.home_team}
                                                        </span>
                                                        {s?.home_logo && <img src={s.home_logo} height={20} alt="" />}
                                                    </div>
                                                </td>
                                                <td style={{ ...td("left"), fontSize: 12, color: "#374151" }}>
                                                    {getSeriesStatus(s)}
                                                </td>
                                                <td style={{ ...td("center"), fontWeight: 800, color: NAVY, fontSize: 15 }}>
                                                    {p.confidence}
                                                </td>
                                                <td style={td("center")}>
                                                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4 }}>
                                                        {getPickLogo(p) && <img src={getPickLogo(p)} height={20} alt="" />} in {p.series_length_guess ?? "—"}
                                                    </div>
                                                </td>
                                                <td style={{ ...td("center"), fontSize: 13 }}>
                                                    {result ? (
                                                        <span title={result.label}>{result.icon}</span>
                                                    ) : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Mobile cards ── */}
                        <div className="mypicks-mobile">
                            {picks.map((p, i) => {
                                const s = getSeries(p);
                                const result = getResult(p);
                                return (
                                    <div key={i} style={{
                                        background: result?.color || "white",
                                        borderRadius: 10, padding: 14,
                                        marginBottom: 10,
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                        border: "1px solid #f0f0f0",
                                    }}>
                                        {/* Matchup row */}
                                        <div style={{
                                            display: "flex", alignItems: "center",
                                            justifyContent: "space-between", marginBottom: 10,
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {s?.away_logo && <img src={s.away_logo} height={24} alt="" />}
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>
                                                    ({s?.away_seed}) {s?.away_team}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>VS</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>
                                                    ({s?.home_seed}) {s?.home_team}
                                                </span>
                                                {s?.home_logo && <img src={s.home_logo} height={24} alt="" />}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                                            {getSeriesStatus(s)}
                                        </div>

                                        {/* Pick details row */}
                                        <div style={{
                                            display: "flex", justifyContent: "space-between",
                                            alignItems: "center", borderTop: "1px solid #f0f0f0",
                                            paddingTop: 8,
                                        }}>
                                            {/* Pick */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                {getPickLogo(p) && <img src={getPickLogo(p)} height={32} alt="" />}
                                                <div>
                                                    <div style={{ fontSize: 15, color: "#000000" }}>
                                                        in <strong>{p.series_length_guess ?? "?"}</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Confidence */}
                                            <div style={{ textAlign: "center" }}>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: NAVY, lineHeight: 1 }}>
                                                    {p.confidence}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#9ca3af" }}>pts</div>
                                            </div>

                                            {/* Result */}
                                            <div style={{ textAlign: "right" }}>
                                                {result ? (
                                                    <>
                                                        <div style={{ fontSize: 20 }}>{result.icon}</div>
                                                        <div style={{ fontSize: 10, color: "#6b7280" }}>{result.label}</div>
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: 11, color: "#d1d5db" }}>Pending</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </NbaGatekeeper>
    );
}

const th = (align) => ({
    padding: "12px 14px", textAlign: align,
    fontSize: 12, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.4px",
    borderBottom: `2px solid ${GOLD}`,
});
const td = (align) => ({
    padding: "12px 14px", textAlign: align, verticalAlign: "middle",
});