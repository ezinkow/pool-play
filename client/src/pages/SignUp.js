import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import useAuth from "../hooks/useAuth";

const NAVY = "#0a1628";
const GOLD = "#c89d3c";

export default function SignUp() {
    const navigate = useNavigate();
    const { user, login } = useAuth();

    const [form, setForm] = useState({
        real_name: "",
        name: "",
        password: "",
        confirm_password: "",
        email: "",
        phone: "",
    });
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Already logged in — nothing to do here
    useEffect(() => {
        if (user) navigate("/");
    }, [user, navigate]);

    const set = (field) => (e) => {
        setForm(f => ({ ...f, [field]: e.target.value }));
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.real_name.trim()) return setError("Please enter your real name.");
        if (!form.name.trim()) return setError("Please choose a username.");
        if (form.password.length < 1) return setError("Please enter a password.");
        if (form.password !== form.confirm_password) return setError("Passwords do not match.");

        setSubmitting(true);
        try {
            const { data } = await axios.post("/api/auth/signup", {
                real_name: form.real_name.trim(),
                name: form.name.trim(),
                password: form.password,
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
            });

            if (!data.success) {
                setError(data.error || "Signup failed.");
                setSubmitting(false);
                return;
            }

            // Auto-login after account creation
            await login(form.name.trim(), form.password);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.error || "Signup failed — please try again.");
            setSubmitting(false);
        }
    };

    return (
        <div className="page-content" style={{ background: "#f4f7f9", minHeight: "100vh" }}>
            <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>

                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                    <h1 style={{
                        color: NAVY, fontSize: 26, fontWeight: 900,
                        textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                    }}>
                        Create account
                    </h1>
                    <p style={{ color: "#6b7280", fontSize: 14 }}>
                        One account works across all games — Pick'em, Bracket, NBA Pool, and more.
                    </p>
                </div>

                <div style={{
                    background: "white", borderRadius: 16, padding: 32,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    borderTop: `5px solid ${NAVY}`,
                }}>
                    <form onSubmit={handleSubmit}>
                        <Field label="Real name" required>
                            <input
                                type="text"
                                value={form.real_name}
                                onChange={set("real_name")}
                                placeholder="First and last name"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Username" required hint="How you'll appear in standings">
                            <input
                                type="text"
                                value={form.name}
                                onChange={set("name")}
                                placeholder="Choose a username"
                                style={inputStyle}
                                autoCapitalize="none"
                            />
                        </Field>

                        <Field label="Password" required>
                            <input
                                type="password"
                                value={form.password}
                                onChange={set("password")}
                                placeholder="Do not use your real password. There is no encryption!"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Confirm password" required>
                            <input
                                type="password"
                                value={form.confirm_password}
                                onChange={set("confirm_password")}
                                placeholder="Re-enter password"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Email" hint="Used for password recovery">
                            <input
                                type="email"
                                value={form.email}
                                onChange={set("email")}
                                placeholder="you@example.com"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Phone" hint="Optional">
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={set("phone")}
                                placeholder="(555) 555-5555"
                                style={inputStyle}
                            />
                        </Field>

                        {error && (
                            <div style={{
                                background: "#fef2f2", border: "1px solid #fecaca",
                                borderRadius: 8, padding: "10px 14px",
                                color: "#dc2626", fontSize: 13, marginBottom: 16,
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                width: "100%", padding: 14,
                                backgroundColor: submitting ? "#9ca3af" : NAVY,
                                color: "white", border: "none", borderRadius: 8,
                                fontWeight: 700, fontSize: 15,
                                cursor: submitting ? "default" : "pointer",
                                marginTop: 4,
                            }}
                        >
                            {submitting ? "Creating account…" : "Create account"}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6b7280" }}>
                    Already have an account?{" "}
                    <Link to="/" style={{ color: NAVY, fontWeight: 600 }}>
                        Log in from the nav bar
                    </Link>
                </p>
            </div>
        </div>
    );
}

function Field({ label, children, required, hint }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={{
                display: "block", fontSize: 13, fontWeight: 600,
                color: "#374151", marginBottom: 5,
            }}>
                {label}
                {required && <span style={{ color: "#dc2626" }}> *</span>}
                {hint && (
                    <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 6 }}>
                        — {hint}
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}

const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 15,
    outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
};