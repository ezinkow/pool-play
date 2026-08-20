import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer style={{
            background: "#0a1628",
            color: "#94a3b8",
            padding: "32px 16px",
            textAlign: "center",
            fontSize: "13px",
            borderTop: "1px solid #1e293b",
            marginTop: "auto"
        }}>
            <div style={{ maxWidth: 850, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Navigation Links */}
                <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", fontWeight: 600 }}>
                    <Link to="/" style={{ color: "#cbd5e1", textDecoration: "none" }}>Home</Link>
                    <Link to="/contact" style={{ color: "#cbd5e1", textDecoration: "none" }}>Contact</Link>
                    <Link to="/help" style={{ color: "#cbd5e1", textDecoration: "none" }}>Help</Link>
                    <Link to="/privacy" style={{ color: "#cbd5e1", textDecoration: "none" }}>Privacy Statement</Link>
                    <Link to="/terms" style={{ color: "#cbd5e1", textDecoration: "none" }}>Terms of Use</Link>
                </div>

                {/* Disclaimer & Copyright */}
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: 16, color: "#64748b", lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 8px 0", fontWeight: 700, letterSpacing: "0.5px", color: "#94a3b8" }}>
                        FOR ENTERTAINMENT USE ONLY.
                    </p>
                    <p style={{ margin: "0 0 8px 0" }}>
                        This site is not affiliated in any way with the NFL, NBA, NHL, MLB, NCAA, UFC or any other professional or collegiate sports team, league, or association. Any league, association, or team names/logos are copyright of their respective owners.
                    </p>
                    <p style={{ margin: 0 }}>
                        Copyright © 2026-{new Date().getFullYear()} Pool Play. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}