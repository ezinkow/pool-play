import React from 'react';
import { Toaster } from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import Countdown from '../../components/nba/Countdown';
import PoolGatekeeper from '../../components/PoolGatekeeper';
import PoolRulesCard from '../../components/PoolRulesCard';
import usePoolMetadata from '../../hooks/usePoolMetadata';
import PoolHomeActions from "../../components/PoolHomeActions";

const GOLD = "#c89d3c";
const NAVY = "#0a1628";

export default function Home() {
    const { user, loading: authLoading } = useAuth();
    const poolMetadata = usePoolMetadata("nba_playoffs");

    if (authLoading) return null;

    return (
        /* 🧠 THE RESPONSIVE BOUNDARY TRACK: Enforces structural limits to shut down breaking window blowouts */
        <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }} >
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
                    gameKey="nba_playoffs"
                >
                    <PoolHomeActions gameKey="nba_playoffs" />

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

                <PoolRulesCard
                    title={poolMetadata?.pool_title || "NBA Playoff Pool"}
                    rulesHtml={poolMetadata?.rules_html}
                    accentColor={poolMetadata?.accent_color || GOLD}
                    subtitle="Rules"
                />
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