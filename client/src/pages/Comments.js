import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../hooks/useAuth";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function Comments() {
    const { user: authUser, loading: authLoading } = useAuth();
    const [comments, setComments] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setLoading(true);
        axios.get("/api/comments")
            .then(res => setComments(res.data || []))
            .catch(err => console.error("Error retrieving contact submission logs:", err))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!message.trim() || submitting) return;
        if (!authUser?.id) {
            toast.error("Please log in to send a message!");
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post("/api/comments", {
                user_id: authUser.id,
                message: message
            });
            setComments(prev => [res.data, ...prev]);
            setMessage("");
            toast.success("Message submitted successfully!");
        } catch (err) {
            toast.error("Failed sending your message submission.");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading) return <div style={{ padding: 100, textAlign: "center", color: NAVY, fontWeight: 700 }}>Loading support center...</div>;

    return (
        <div style={{ maxWidth: 750, margin: "0 auto", padding: "90px 16px 80px" }}>
            <Toaster />

            {/* Contact Us Page Header */}
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 20, marginBottom: 24, textAlign: "left" }}>
                <h2 style={{ color: NAVY, margin: 0, fontWeight: 900 }}>📩 Contact Us</h2>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
                    Have a question, suggestion, or run into a bug? Send a message directly to the pool administrators.
                </p>
            </div>

            {/* Submission Card Block */}
            <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.01)", marginBottom: 24, textAlign: "left" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 800, color: "#1e293b" }}>Send a Message</h3>

                {authUser ? (
                    <form onSubmit={handleSubmitComment}>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Type out your question, request, or platform feedback here..."
                            maxLength={800}
                            required
                            rows={4}
                            style={{
                                width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #cbd5e1",
                                fontSize: "14px", outline: "none", boxSizing: "border-box", resize: "vertical",
                                marginBottom: 12, fontFamily: "inherit"
                            }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>Sending as: <strong style={{ color: GOLD }}>@{authUser.name}</strong></span>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: "10px 24px", backgroundColor: NAVY, color: "white", border: "none",
                                    borderRadius: 6, fontWeight: 700, fontSize: "13px", cursor: submitting ? "default" : "pointer"
                                }}
                            >
                                {submitting ? "Sending..." : "Submit Message"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div style={{ padding: "16px", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", textAlign: "center" }}>
                        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>🔒 Please log in using the header menu to send messages to the admins.</p>
                    </div>
                )}
            </div>

            {/* Submission Logs Feed */}
            <div style={{ textAlign: "left" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>📋 Recent Submissions Log</h3>

                {loading ? (
                    <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Scanning submissions feed...</p>
                ) : comments.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No support entries logged yet.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {comments.map(comment => (
                            <div key={comment.id} style={{ background: "white", padding: "16px 20px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.01)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <strong style={{ color: GOLD, fontSize: 13 }}>@{comment.author?.name || "Anonymous"}</strong>
                                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                                        {new Date(comment.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                <p style={{ margin: 0, color: "#334155", fontSize: 14, lineHeight: "1.5", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                                    {comment.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}