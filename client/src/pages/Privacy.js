import React from "react";

const NAVY = "#0a1628";

export default function Privacy() {
    return (
        <div style={{ maxWidth: 850, margin: "0 auto", padding: "40px 16px 80px", paddingTop: 90 }}>
            <h1 style={{ color: NAVY, fontSize: "28px", fontWeight: 800, marginBottom: 16 }}>Privacy Statement</h1>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: 32 }}>Last updated: August 2026</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, color: "#4b5563", fontSize: "15px", lineHeight: 1.7 }}>
                <p>
                    At Pool Play, we respect your privacy and are committed to protecting any personal information you share with us. This policy outlines how we collect, use, and safeguard your data.
                </p>

                <h3 style={{ color: NAVY, fontSize: "18px", fontWeight: 700, marginTop: 12 }}>Information We Collect</h3>
                <p>
                    When you register an account, we collect basic user details such as your username, display name, and authentication credentials. We also record your pool entries, weekly picks, and interaction data required to run the game leaderboards.
                </p>

                <h3 style={{ color: NAVY, fontSize: "18px", fontWeight: 700, marginTop: 12 }}>How We Use Information</h3>
                <p>
                    Your information is used strictly to provide, maintain, and improve the pool platform functionality (such as calculating scores, showing group matrices, and managing user profiles). We do not sell, trade, or rent your personal information to third parties.
                </p>

                <h3 style={{ color: NAVY, fontSize: "18px", fontWeight: 700, marginTop: 12 }}>Data Security</h3>
                <p>
                    We employ standard security measures, including password hashing and encrypted token sessions, to protect your account integrity against unauthorized access.
                </p>
            </div>
        </div>
    );
}