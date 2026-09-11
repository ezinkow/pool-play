import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What was your childhood nickname?",
    "What is your mother's maiden name?",
    "What was the make and model of your first car?",
    "What elementary school did you attend?"
];

export default function SecuritySettings() {
    const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
    const [securityAnswer, setSecurityAnswer] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [loading, setLoading] = useState(true);

    const inputStyle = {
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #d1d5db",
        fontSize: 14,
        width: "100%",
        boxSizing: "border-box",
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios.get("/api/auth/security-question", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.data?.security_question) {
                    setSecurityQuestion(res.data.security_question);
                }
            })
            .catch(err => console.error("Failed to load security question setting", err))
            .finally(() => setLoading(false));
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!securityAnswer || !currentPassword) {
            return toast.error("Please enter your answer and current password.");
        }

        const token = localStorage.getItem("token");
        try {
            const res = await axios.post("/api/auth/update-security-question", {
                securityQuestion,
                securityAnswer,
                currentPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success("Security question updated successfully!");
                setSecurityAnswer("");
                setCurrentPassword("");
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update security settings");
        }
    };

    if (loading) return null;

    return (
        <div style={{ maxWidth: 500, margin: "40px auto", background: "white", borderRadius: 16, padding: "32px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <Toaster />
            <h3 style={{ color: "#0a1628", marginTop: 0, marginBottom: 8, textAlign: "center" }}>🛡️ Security Question Settings</h3>
            <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", marginBottom: 24 }}>
                Configure or update your recovery question used for password resets.
            </p>

            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4, display: "block" }}>
                        Select Security Question
                    </label>
                    <select
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        style={inputStyle}
                    >
                        {SECURITY_QUESTIONS.map((q, idx) => (
                            <option key={idx} value={q}>{q}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4, display: "block" }}>
                        Security Answer
                    </label>
                    <input
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="Enter new answer"
                        style={inputStyle}
                        required
                    />
                </div>

                <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4, display: "block" }}>
                        Current Password (Required for confirmation)
                    </label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        style={inputStyle}
                        required
                    />
                </div>

                <button
                    type="submit"
                    style={{
                        marginTop: 8, padding: "12px 20px", backgroundColor: "#0a1628",
                        color: "white", border: "none", borderRadius: 8, fontWeight: 700,
                        cursor: "pointer", fontSize: "14px"
                    }}
                >
                    Save Security Question
                </button>
            </form>
        </div>
    );
}