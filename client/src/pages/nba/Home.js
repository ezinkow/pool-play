import React from 'react';
import { Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import Countdown from '../../components/nba/Countdown';
import PoolGatekeeper from '../../components/PoolGatekeeper';

const GOLD = "#c89d3c";
const NAVY = "#0a1628";
const RED = "#c8102e";

export default function Home() {
    const { user, loading: authLoading } = useAuth();
    console.log(user);

    if (authLoading) return null;

    return (
        /* 🧠 THE RESPONSIVE BOUNDARY TRACK: Enforces structural limits to shut down breaking window blowouts */
        <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} className='page-content'>
            <Toaster />

            {/* 🧠 COUNTDOWN SCALING WRAPPER: Ensures fluid, elastic adjustments on smaller viewports */}
            <div style={{ width: "100%", padding: "0 12px", boxSizing: "border-box" }}>
                <Countdown />
            </div>

            <div className="container" style={{ textAlign: "center", padding: "0 16px", boxSizing: "border-box" }}>
                {/* Passing isAdmin down to let the gatekeeper know it should grant full pass-through access */}
                <PoolGatekeeper
                    user={user}
                    isAdmin={user?.is_admin === true}
                    gameKey="nba"
                >
                    {/* Action Buttons Grid Layout Cluster */}
                    <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: 20 }}>
                        {/* Since they passed the Gatekeeper, they can access sheets */}
                        <Link to="/nba/picks" style={{ textDecoration: 'none' }}>
                            <button className="btn-nba-main">🏀 Make My Picks</button>
                        </Link>

                        {/* ✨ NEW ADDITION: Fast-navigation shortcut path node to user's summary card sheet */}
                        <Link to="/nba/mypicks" style={{ textDecoration: 'none' }}>
                            <button className="btn-nba-secondary">📋 My Picks</button>
                        </Link>
                    </div>

                    <a href="https://www.nba.com/playoffs"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-nba-bracket"
                        style={{
                            display: "inline-block",
                            padding: "12px 24px",
                            backgroundColor: NAVY,
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: "pointer",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            textDecoration: "none",
                            maxWidth: "100%",
                            boxSizing: "border-box"
                        }}>
                        ⛹🏾‍♂️ Playoff Bracket ↗
                    </a>
                </PoolGatekeeper>

                {/* Rules card */}
                <div style={{
                    background: "white",
                    borderRadius: 16,
                    padding: "24px 20px", // Snugged layout track slightly to optimize mobile displays
                    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                    marginTop: 24,
                    marginBottom: 80, // 🧠 BOTTOM SHIELD AREA: Keeps rules content above your floating mobile bottom nav tabs
                    borderTop: `4px solid ${GOLD}`,
                    textAlign: "left",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                }}>
                    <h3 style={{ color: RED, marginTop: 0, marginBottom: 16, fontSize: "1.2rem" }}>
                        📋 NBA Playoff Pool Rules
                    </h3>
                    <ul style={{ paddingLeft: 20, lineHeight: "1.7", fontSize: "14px" }}>
                        <li>Pick the winner of each playoff series.</li>
                        <li>Assign <strong>Confidence Points</strong> (1–10) to each pick.</li>
                        <li>Correct winner = confidence points earned.</li>
                        <li>
                            <strong>Double points:</strong> correctly guess the series length
                            (4, 5, 6, or 7 games).
                        </li>
                        <li>
                            Point budgets per round:{" "}
                            <strong>R1: 32 · R2: 24 · Conf Finals: 16 · Finals: 8</strong>
                        </li>
                        <li>Series lock at Game 1 tip-off for each series.</li>
                    </ul>
                </div>
            </div>

            <style>{`
                .btn-nba-main {
                    padding: 14px 28px;
                    background-color: ${NAVY};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    transition: opacity 0.2s;
                    text-decoration: none;
                }
                .btn-nba-main:hover { opacity: 0.9; }

                .btn-nba-secondary {
                    padding: 14px 28px;
                    background-color: transparent;
                    color: ${NAVY};
                    border: 2px solid ${NAVY};
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    transition: background-color 0.2s, color 0.2s;
                    text-decoration: none;
                }
                .btn-nba-secondary:hover { 
                    background-color: ${NAVY};
                    color: white;
                }

                /* Mobile Optimization Overrides */
                @media (max-width: 576px) {
                    .btn-nba-main, .btn-nba-secondary, .btn-nba-bracket {
                        width: 100% !important;
                        text-align: center;
                        padding: 12px 16px !important;
                        font-size: 14px !important;
                    }
                }
            `}</style>
        </div>
    );
}