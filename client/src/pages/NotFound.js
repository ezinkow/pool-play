import React from "react";
import { Link } from "react-router-dom";
import img from '../images/notfound.png';

const GOLD = "#c89d3c";
const NAVY = "#0a1628";

export default function NotFound() {
    return (
        <div style={{
            textAlign: "center",
            padding: "20px",
            height: "100vh", // Force full height
            display: "flex",
            flexDirection: "column",
            justifyContent: "center", // Center vertically
            alignItems: "center",
            backgroundColor: "#001633",
            color: "white",
            overflow: "hidden" // Prevent scrolling
        }}>
            <style>{`
                .submerged-404 {
                    font-size: 150px;
                    font-weight: 900;
                    color: ${NAVY};
                    position: relative;
                    display: inline-block;
                    text-shadow: 0 0 10px rgba(0, 100, 255, 0.5), 0 0 20px rgba(0, 100, 255, 0.3);
                    animation: ripple 3s infinite ease-in-out;
                }
                @keyframes ripple {
                    0%, 100% { transform: translateY(0) skewX(0deg); }
                    50% { transform: translateY(10px) skewX(5deg); }
                }
            `}</style>
            {/* Reduced image size to keep it above the fold */}
            <img
                src={img}
                alt="Drowning Mascot"
                style={{
                    maxWidth: "350px",
                    width: "100%",
                    marginBottom: "10px"
                }}
                className="submerged-404"
            />

            <h1 style={{ color: "white", marginTop: "0", fontSize: "1.5rem" }}>Oops, drifted into the deep end!</h1>
            <p style={{ marginBottom: "20px", color: "#cbd5e1", fontSize: "0.9rem" }}>
                Penalty call: This page is out of bounds.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <button style={btnStyle(NAVY, "white", GOLD)}>Home</button>
                </Link>
                <Link to="/myaccount" style={{ textDecoration: 'none' }}>
                    <button style={btnStyle("transparent", GOLD, GOLD)}>Dashboard</button>
                </Link>
                <Link to="/contact" style={{ textDecoration: 'none' }}>
                    <button style={btnStyle("transparent", "#ef4444", "#ef4444")}>Support</button>
                </Link>
            </div>
        </div>
    );
}

function btnStyle(bg, color, borderColor) {
    return {
        padding: "8px 16px", // Tightened button padding
        backgroundColor: bg,
        color: color,
        border: `2px solid ${borderColor}`,
        borderRadius: "6px",
        fontSize: "13px", // Smaller text
        fontWeight: 700,
        cursor: "pointer",
        textTransform: "uppercase",
        transition: "all 0.2s"
    };
}