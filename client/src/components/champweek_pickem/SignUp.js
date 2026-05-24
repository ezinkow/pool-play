import React, { useState } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'

export default function UserSubmit() {
    const [real_name, setReal_name] = useState('')
    const [name, setName] = useState('')
    const [email_address, setEmail_address] = useState('')
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')

    const handleNameSubmit = event => {
        event.preventDefault()
        axios.post('api/users', { real_name, name, password, email_address, phone })
        toast.success(`THANKS, ${real_name}, YOU'RE SIGNED UP!`, {
            duration: 10001,
            position: 'top-center',
            style: {
                border: '2px solid #713200',
                padding: '20px',
                marginTop: '100px',
                color: 'white',
                backgroundColor: 'rgb(60, 179, 113, 0.7)'
            },
            icon: '🏀',
        });
        setName("")
    }

    const inputStyle = {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #d1d5db",
        fontSize: 15,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
    };

    const labelStyle = {
        display: "block",
        fontWeight: 600,
        fontSize: 13,
        color: "#374151",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
    };

    const fieldStyle = {
        marginBottom: 20,
    };

    return (
        <div style={{ paddingTop: 68 }}>
            <div style={{
                maxWidth: 520,
                margin: "0 auto",
                padding: "32px 24px",
                background: "white",
                borderRadius: 16,
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                marginTop: 24,
            }}>
                <Toaster />
                <h2 style={{ color: "var(--primary-navy)", marginBottom: 4,textAlign: "center"  }}>🏀 Sign Up 🏀</h2>
                <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24, textAlign: "center"  }}>
                    Create your entry to start making picks.
                </p>

                <form onSubmit={handleNameSubmit}>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Real Name</label>
                        <input
                            style={inputStyle}
                            type="text"
                            value={real_name}
                            onChange={e => setReal_name(e.target.value)}
                            placeholder="Your real name"
                            required
                        />
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Username</label>
                        <input
                            style={inputStyle}
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Name you'll select all week"
                            required
                        />
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Password</label>
                        <input
                            style={inputStyle}
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Simple password (no encryption)"
                            required
                        />
                        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                            ⚠️ Use a simple password — do NOT use your normal password. No encryption is applied.
                        </p>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Email Address</label>
                        <input
                            style={inputStyle}
                            type="email"
                            value={email_address}
                            onChange={e => setEmail_address(e.target.value)}
                            placeholder="your@email.com"
                        />
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Phone</label>
                        <input
                            style={inputStyle}
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="Phone number"
                        />
                    </div>
            <p>Sign up is now closed</p>
                    {/* <button
                        type="submit"
                        style={{
                            width: "100%",
                            padding: "12px",
                            backgroundColor: "var(--primary-navy)",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: "pointer",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}
                    >
                        Sign Up
                    </button> */}
                </form>

                <p style={{ marginTop: 20, fontSize: 13, color: "#6b7280", textAlign: "center" }}>
                    ⚠️ Check the list below for duplicate names — include your last initial if needed.
                </p>
            </div>
        </div>
    )
}