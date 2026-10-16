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
        <section className="security-panel">
            <Toaster />
            <h2 className="security-panel-title">🛡️ Security Question Settings</h2>
            <p className="security-panel-description">
                Configure or update your recovery question used for password resets.
            </p>

            <form onSubmit={handleUpdate} className="security-panel-form">
                <div>
                    <label className="security-panel-label">
                        Select Security Question
                    </label>
                    <select
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        className="security-panel-input"
                    >
                        {SECURITY_QUESTIONS.map((q, idx) => (
                            <option key={idx} value={q}>{q}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="security-panel-label">
                        Security Answer
                    </label>
                    <input
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="Enter new answer"
                        className="security-panel-input"
                        required
                    />
                </div>

                <div>
                    <label className="security-panel-label">
                        Current Password (Required for confirmation)
                    </label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="security-panel-input"
                        required
                    />
                </div>

                <button type="submit" className="security-panel-submit">
                    Save Security Question
                </button>
            </form>
            <br></br>
            <p className="security-panel-note">
                *Note: If you did not set a security question when you signed up, use: <br />
                "What is your mother's maiden name?" <br />
                and your answer is "Smith" (without quotes).<br />
                This is the default for all accounts created before this enhancement.
            </p>
        </section>
    );
}