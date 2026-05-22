import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const NAVY = "#13447a";
const GOLD = "#c89d3c";

export default function BanterDrawer({ isOpen, onClose, gameKey, authUser }) {
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const chatEndRef = useRef(null);

    // Fetch pool chat streams on toggle open or pool context shifts
    useEffect(() => {
        if (!isOpen || !gameKey) return;

        axios.get(`/api/banter/${gameKey}`)
            .then(res => setMessages(res.data || []))
            .catch(err => console.error("Banter sync block error:", err));
    }, [isOpen, gameKey]);

    // Keep view pinned to the bottom text lines on fresh messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMsg.trim() || submitting) return;
        if (!authUser?.id) {
            toast.error("Please log in to talk smack!");
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post("/api/banter", {
                user_id: authUser.id,
                game_key: gameKey,
                message: newMsg
            });
            setMessages(prev => [...prev, res.data]);
            setNewMsg("");
        } catch (err) {
            toast.error("Message drop failed.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop Blur Mask */}
            <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 9000 }} />

            {/* Main Sliding Drawer Structural Node */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: "360px",
                backgroundColor: "#ffffff", boxShadow: "-10px 0 30px rgba(0,0,0,0.15)", zIndex: 9001,
                display: "flex", flexDirection: "column", textAlign: "left"
            }}>
                {/* Header Control Segment */}
                <div style={{ padding: "16px", background: NAVY, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, letterSpacing: "0.5px" }}>💬 POOL BANTER BOARD</h3>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer", fontWeight: 700 }}>✕</button>
                </div>

                {/* Live Messages Scrolling Stream Container */}
                <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc" }}>
                    {messages.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", marginTop: "40px" }}>No smack talked yet. Fire the first shot!</p>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.user_id === authUser?.id;
                            return (
                                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                                    <span style={{ fontSize: "11px", fontWeight: 700, color: isMe ? GOLD : NAVY, marginBottom: "3px", padding: "0 4px" }}>
                                        @{msg.author?.name || "Anonymous"}
                                    </span>
                                    <div style={{
                                        background: isMe ? NAVY : "#ffffff",
                                        color: isMe ? "white" : "#334155",
                                        padding: "10px 14px", borderRadius: "12px",
                                        border: isMe ? "none" : "1px solid #e2e8f0",
                                        maxWidth: "85%", wordBreak: "break-word", fontSize: "13px", lineHeight: "1.4",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                                    }}>
                                        {msg.message}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Text Form Row Footer */}
                <div style={{ padding: "14px", borderTop: "1px solid #e2e8f0", background: "#ffffff" }}>
                    {authUser ? (
                        <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                value={newMsg}
                                onChange={e => setNewMsg(e.target.value)}
                                placeholder="Type some trash talk..."
                                maxLength={300}
                                required
                                style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                            />
                            <button type="submit" disabled={submitting} style={{ padding: "10px 16px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                                Send
                            </button>
                        </form>
                    ) : (
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b", textAlign: "center", padding: "6px 0" }}>🔒 Please log in to join the conversation loop.</p>
                    )}
                </div>
            </div>
        </>
    );
}