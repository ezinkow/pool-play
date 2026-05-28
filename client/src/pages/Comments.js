import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../hooks/useAuth";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function Comments() {
    const { user: user, loading: authLoading } = useAuth();
    const [comments, setComments] = useState([]);
    const [message, setMessage] = useState("");
    const [isPrivate, setIsPrivate] = useState(false); // ✨ Added privacy state tracker
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setLoading(true);
        // Pass user_id query param so backend can verify ownership of private rows if needed
        const url = user ? `/api/comments?user_id=${user.id}` : "/api/comments";

        axios.get(url)
            .then(res => setComments(res.data || []))
            .catch(err => console.error("Error retrieving contact submission logs:", err))
            .finally(() => setLoading(false));
    }, [user]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!message.trim() || submitting) return;
        if (!user?.id) {
            toast.error("Please log in to send a message!");
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post("/api/comments", {
                user_id: user.id,
                message: message,
                is_private: isPrivate // ✨ Pass state flag value down to database engine
            });
            setComments(prev => [res.data, ...prev]);
            setMessage("");
            setIsPrivate(false); // Reset toggle state down following successful dispatch
            toast.success(isPrivate ? "Private message sent to admins!" : "Message posted successfully!");
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

                {user ? (
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span style={{ fontSize: 11, color: "#94a3b8" }}>Sending as: <strong style={{ color: GOLD }}>@{user.name}</strong></span>

                                {/* ✨ PRIVACY INTERFACE FOOTER TOGGLE */}
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer", userSelect: "none" }}>
                                    <input
                                        type="checkbox"
                                        checked={isPrivate}
                                        onChange={e => setIsPrivate(e.target.checked)}
                                        style={{ cursor: "pointer", width: 14, height: 14 }}
                                    />
                                    🔒 Send as private note to admins
                                </label>
                            </div>

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
                            <div
                                key={comment.id}
                                style={{
                                    background: "white", padding: "16px 20px", borderRadius: 12,
                                    border: `1px solid ${comment.is_private ? "#fed7aa" : "#e2e8f0"}`, // Light orange tint if private
                                    backgroundColor: comment.is_private ? "#fffaf5" : "white",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.01)"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <strong style={{ color: GOLD, fontSize: 13 }}>@{comment.author?.name || "Anonymous"}</strong>

                                        {/* ✨ CONDITIONAL BADGE INDICATION CHIP */}
                                        {comment.is_private && (
                                            <span style={{ fontSize: 10, backgroundColor: "#ffedd5", color: "#c2410c", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                                🔒 Private Note
                                            </span>
                                        )}
                                    </div>
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