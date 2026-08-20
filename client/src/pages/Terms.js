import React from "react";

const NAVY = "#0a1628";

export default function Terms() {
    return (
        <div style={{ maxWidth: 850, margin: "0 auto", padding: "40px 16px 80px", paddingTop: 90 }}>
            <h1 style={{ color: NAVY, fontSize: "28px", fontWeight: 800, marginBottom: 16 }}>Terms of Use</h1>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: 32 }}>Last updated: August 2026</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, color: "#4b5563", fontSize: "15px", lineHeight: 1.7 }}>
                <div style={{ background: "#f8fafc", borderLeft: `4px solid ${NAVY}`, padding: "16px 20px", borderRadius: "0 8px 8px 0" }}>
                    <p style={{ margin: 0, fontWeight: 700, color: NAVY }}>
                        FOR ENTERTAINMENT USE ONLY.
                    </p>
                </div>

                <h3 style={{ color: NAVY, fontSize: "18px", fontWeight: 700, marginTop: 12 }}>1. Acceptance of Terms</h3>
                <p>
                    By accessing or using Pool Play, you agree to be bound by these Terms of Use. If you do not agree to all terms, please do not use the platform.
                </p>

                <h3 style={{ color: NAVY, fontSize: "18px", fontWeight: 700, marginTop: 12 }}>2. Non-Affiliation Disclaimer</h3>
                <p>
                    Pool Play is an independent platform created for entertainment and office pool hosting. This site is not affiliated in any way with the NFL, NBA, NHL, MLB, NCAA, UFC, or any other professional or collegiate sports team, league, or association. All team names, logos, and trademarks remain the property of their respective owners.
                </p>

                <h3 style={{ color: NAVY, fontSize: "18px", fontWeight: 700, marginTop: 12 }}>3. User Conduct</h3>
                <p>
                    Users agree not to exploit the platform for unlawful activities, harass other participants on message boards, or attempt to compromise system security or data integrity.
                </p>
            </div>
        </div>
    );
}