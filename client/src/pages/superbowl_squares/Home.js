import React from 'react';
import { Link } from 'react-router-dom';
import CountdownDisplay from '../../components/CountdownDisplay'
import PoolRulesCard from '../../components/PoolRulesCard'
import PoolCreditsSubtitle from '../../components/PoolCreditsSubtitle'

const GOLD = "#c89d3c";
const BLUE = "#0369a1";
const GAME_LOCK_SWITCHOVER = new Date("2026-03-19T16:15:00Z"); // 11:15 AM CT





export default function SquaresHome() {
    const gameLocked = new Date() >= GAME_LOCK_SWITCHOVER;
    return (
        <div style={{ paddingTop: 68, paddingBottom: 80, backgroundColor: "var(--bg-body)", minHeight: "100vh" }}>
            {gameLocked ? '' : <CountdownDisplay />}
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px" }}>
                {/* Action buttons */}
                <nav className="pool-home-actions pool-home-actions--two" aria-label="Super Bowl squares navigation">
                    <Link to="/superbowlsquares/grid" className="pool-home-action">
                        <span aria-hidden="true">🟩</span><span>See Grids</span>
                    </Link>
                    <Link to="/superbowlsquares/results" className="pool-home-action">
                        <span aria-hidden="true">💰</span><span>Results</span>
                    </Link>
                </nav>
                <PoolCreditsSubtitle gameKey="superbowl_squares" />
                <PoolRulesCard gameKey="superbowl_squares" title="Game Rules" accentColor={GOLD} subtitle="" className="compact-card">
                    <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                        <p><strong>For Fun!</strong> — 100 squares total.</p>
                        <p>After all squares are claimed, numbers (0–9) are randomly assigned to each row and column.</p>
                        <p>
                            The <strong>columns</strong> represent the <strong>winning team's last score digit</strong>.<br />
                            The <strong>rows</strong> represent the <strong>losing team's last score digit</strong>.
                        </p>
                        <p>The same grid is used for <strong>all 63 games</strong> of the tournament (Rounds 1 through the National Championship — First Four games excluded).</p>
                        <p>Tournament runs <strong>March 19 – April 6, 2026</strong>. Squares lock at tip-off on March 19.</p>
                    </div>
                </PoolRulesCard>
                {/* Payout card */}
                <div style={{
                    background: "white", borderRadius: 16, padding: "24px 28px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                    borderTop: `4px solid ${BLUE}`,
                }}>
                    <h3 style={{ color: BLUE, marginTop: 0, marginBottom: 16 }}> Credits Per Round</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr>
                                {["Round", "Per Game", "# Games", "Total"].map(h => (
                                    <th key={h} style={{
                                        padding: "8px 12px", backgroundColor: BLUE, color: "white",
                                        textAlign: "left", fontWeight: 600, fontSize: 13,
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ["1st Round", "12.50", "32", "400"],
                                ["2nd Round", "25", "16", "400"],
                                ["Sweet 16", "50", "8", "400"],
                                ["Elite 8", "100", "4", "400"],
                                ["Final Four", "200", "2", "400"],
                                ["Championship", "500", "1", "500"],
                            ].map(([round, perGame, games, total], i) => (
                                <tr key={round} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{round}</td>
                                    <td style={{ padding: "8px 12px", color: "#16a34a", fontWeight: 700 }}>{perGame}</td>
                                    <td style={{ padding: "8px 12px", color: "#6b7280" }}>{games}</td>
                                    <td style={{ padding: "8px 12px", fontWeight: 700, color: GOLD }}>{total}</td>
                                </tr>
                            ))}
                            <tr style={{ backgroundColor: "#f0fdf4", borderTop: `2px solid ${GOLD}` }}>
                                <td colSpan={3} style={{ padding: "8px 12px", fontWeight: 800, color: BLUE }}>Total Credits</td>
                                <td style={{ padding: "8px 12px", fontWeight: 800, color: GOLD, fontSize: 15 }}>2,500</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}