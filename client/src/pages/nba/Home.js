import React from 'react';
import { Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import Countdown from '../../components/nba/Countdown';
import NbaGatekeeper from '../../components/nba/NbaGatekeeper';

const GOLD = "#c89d3c";
const NAVY = "#0a1628";
const RED = "#c8102e";

export default function Home() {
    const { user: authUser, loading: authLoading } = useAuth();

    // 1. Handle the initial auth loading state
    if (authLoading) return null;

    // 2. Wrap everything in the Gatekeeper. 
    // If authUser has no entry, the Gatekeeper displays the "Join" UI.
    // If they do have an entry, it shows the Home page content below.
    return (
        <div>
            <Toaster />
            <div className="page-content">
                <Countdown />
                <div className="container" style={{ textAlign: "center" }}>
                    <NbaGatekeeper user={authUser}>

                        <div style={{ marginBottom: 20 }}>
                            {/* Since they passed the Gatekeeper, they definitely have an entry */}
                            <Link to="/nba/picks" style={{ textDecoration: 'none' }}>
                                <button className="btn-nba-main">🏀 Make My Picks</button>
                            </Link>
                        </div>
                        <a href="https://www.nba.com/playoffs/2026"
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: "inline-block",
                                padding: "12px 24px 12px 24px",
                                backgroundColor: "var(--primary-navy)",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                textDecoration: "none",
                            }}>
                            ⛹🏾‍♂️ Playoff Bracket ↗
                        </a>
                    </NbaGatekeeper>

                    {/* Rules card */}
                    <div style={{
                        background: "white", borderRadius: 16, padding: "24px 28px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 24,
                        borderTop: `4px solid ${GOLD}`, textAlign: "left",
                    }}>
                        <h3 style={{ color: RED, marginTop: 0, marginBottom: 16 }}>
                            📋 NBA Playoff Pool Rules
                        </h3>
                        <ul style={{ paddingLeft: 20, lineHeight: "1.8" }}>
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
            </div>

            <style>{`
                    .btn-nba-main {
                        padding: 14px 32px;
                        background-color: ${NAVY};
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 700;
                        cursor: pointer;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        transition: opacity 0.2s;
                        text-decoration: none;
                    }
                    .btn-nba-main:hover { opacity: 0.9; }
                `}</style>
        </div >
    );
}