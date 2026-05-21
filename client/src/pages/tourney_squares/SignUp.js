import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const GOLD = "#c89d3c";
const BLUE = "#0369a1";

export default function SquaresSignUp() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [password, setPassword] = useState("");


    const handleSubmit = async () => {
        if (!name.trim()) return toast.error("Name is required");
        try {
            await axios.post("/api/tourneysquares/users/signup", { name, email, password, phone });
            setSubmitted(true);
            toast.success("You're signed up!");
        } catch (err) {
            toast.error(err.response?.data?.error || "Signup failed");
        }
    };

    return (
        <div style={{ paddingTop: 68, minHeight: "100vh", backgroundColor: "#f8fafc" }}>
            <Toaster />
            <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>
                <h2 style={{ color: BLUE, marginBottom: 8 }}>🟩 Join Tournament Squares</h2>
                <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
                    Sign up to claim your squares. $25 per square, 100 squares total.
                    Numbers assigned after all squares are claimed.
                </p>

                {submitted ? (
                    <div style={{ padding: 24, backgroundColor: "#f0fdf4", borderRadius: 12, border: "1px solid #86efac", textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                        <h3 style={{ color: "#16a34a" }}>You're in!</h3>
                        <p style={{ color: "#374151", fontSize: 14 }}>
                            Head to the grid to claim your squares.
                        </p>
                        <button
                            onClick={() => window.location.hash = "#/squares/grid"}
                            style={{ marginTop: 12, padding: "10px 20px", borderRadius: 8, backgroundColor: BLUE, color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}
                        >
                            Go to Grid →
                        </button>
                    </div>
                ) : (
                    <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                                Name *
                            </label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your name"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                            />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                                Email *
                            </label>
                            <input
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                type="email"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                            />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                                Password *
                            </label>
                            <input
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                type="password"
                                placeholder="Choose a password"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                                Phone *
                            </label>
                            <input
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="555-555-5555"
                                type="tel"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                            />
                        </div>
                        <button
                            onClick={handleSubmit}
                            style={{ width: "100%", padding: "12px", borderRadius: 8, backgroundColor: BLUE, color: "white", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
                        >
                            Sign Up →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}