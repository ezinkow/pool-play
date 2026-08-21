import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const NAVY = "#0a1628";
const GOLD = "#c89d3c";

export default function Home() {
    const { user } = useAuth();

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px 80px", paddingTop: 90 }}>
            {/* Welcome Banner */}
            <div style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, #13447a 100%)`,
                borderRadius: 16, padding: "36px 32px", color: "white", marginBottom: 36,
                boxShadow: "0 10px 25px rgba(10, 22, 40, 0.15)", textAlign: "center"
            }}>
                <h1 style={{ fontSize: "32px", fontWeight: 900, margin: "0 0 8px 0", letterSpacing: "0.5px" }}>
                    🏆 Welcome to Pool Play
                </h1>
                <p style={{ fontSize: "16px", color: "#cbd5e1", maxWidth: 600, margin: "0 auto 20px" }}>
                    One account works across all office pools. Pick your teams, track live standings, and compete for the crown!
                </p>
                {!user && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                        <Link to="/signup" style={{ background: GOLD, color: NAVY, padding: "10px 24px", borderRadius: 8, fontWeight: 800, textDecoration: "none", fontSize: "14px" }}>
                            Create Account
                        </Link>
                    </div>
                )}
            </div>

            {/* Active Games Grid */}
            <h2 style={{ color: NAVY, fontSize: "22px", fontWeight: 800, marginBottom: 20 }}>Active Games</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                
                {/* Home Run Derby Card */}
                <GameCard
                    title="⚾ Home Run Derby"
                    description="Draft 12 sluggers under a 300 salary cap. Track full season and monthly races with the bench rule!"
                    links={[
                        { label: "Draft Roster", to: "/hrd/draft", primary: true },
                        { label: "All Rosters", to: "/hrd/teams" },
                        { label: "Standings", to: "/hrd/standings" }
                    ]}
                />

                {/* Placeholder Cards for other pools */}
                <GameCard
                    title="🏈 NFL Survivor / Pick'em"
                    description="Make your weekly NFL game selections and survive the elimination gauntlet."
                    links={[
                        { label: "Make Picks", to: "/picks", primary: true }
                    ]}
                />

                <GameCard
                    title="🏀 March Bracket Challenge"
                    description="Fill out your tournament brackets and compete for office supremacy."
                    links={[
                        { label: "View Brackets", to: "/bracket", primary: true }
                    ]}
                />

            </div>
        </div>
    );
}

function GameCard({ title, description, links }) {
    return (
        <div style={{
            background: "white", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", justifyContent: "space-between"
        }}>
            <div>
                <h3 style={{ color: NAVY, fontSize: "18px", fontWeight: 800, marginBottom: 8 }}>{title}</h3>
                <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.5, marginBottom: 20 }}>{description}</p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                {links.map((link, idx) => (
                    <Link
                        key={idx}
                        to={link.to}
                        style={{
                            padding: "6px 12px", borderRadius: 6, fontSize: "13px", fontWeight: 700, textDecoration: "none",
                            background: link.primary ? NAVY : "#f1f5f9", color: link.primary ? "white" : "#475569"
                        }}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}