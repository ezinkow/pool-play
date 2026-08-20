import React from "react";
import { Link } from "react-router-dom";

const NAVY = "#0a1628";

export default function Help() {
    return (
        <div style={{ maxWidth: 850, margin: "0 auto", padding: "40px 16px 80px", paddingTop: 90 }}>
            <h1 style={{ color: NAVY, fontSize: "28px", fontWeight: 800, marginBottom: 16 }}>Help & Frequently Asked Questions</h1>
            <p style={{ color: "#4b5563", fontSize: "15px", lineHeight: 1.6, marginBottom: 32 }}>
                Welcome to Pool Play! Everything you need to know about setting up, joining, and playing in office sports pools.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <Section title="1. How do I join or create a pool?">
                    Once you create a free account and log in, you can browse available pool game formats (like Pick'em or Survivor pools). You can join public pools or contact the website administrator to create private groups or customized pools.
                </Section>

                <Section title="2. When are picks locked?">
                    Picks lock automatically based on each individual game's scheduled kickoff/tipoff time. Make sure to submit your selections ahead of kickoff/tipoff to ensure they count.
                </Section>

                <Section title="3. How are points and standings calculated?">
                    Standings and scores are computed automatically based on game outcomes, points spreads, and any special options (like Best Bets) configured for your specific pool format.
                </Section>

                <Section title="4. Is there an app to download?">
                    No download is required! Pool Play is optimized for mobile, tablet, and desktop web browsers so you can manage your team and make picks from any device.
                </Section>
            </div>

            <div style={{ marginTop: 40, borderTop: "1px solid #e5e7eb", paddingTop: 24 }}>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>
                    Still have questions? Reach out through our <Link to="/contact" style={{ color: NAVY, fontWeight: 700 }}>Contact page</Link>.
                </p>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <h3 style={{ color: NAVY, fontSize: "17px", fontWeight: 700, marginBottom: 8 }}>{title}</h3>
            <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>{children}</p>
        </div>
    );
}