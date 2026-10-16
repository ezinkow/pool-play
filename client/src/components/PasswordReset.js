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

export default function ChangePassword({ embedded = false }) {
  const [identifier, setIdentifier] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!identifier || !selectedQuestion || !securityAnswer || !newPassword || !confirmPassword)
      return toast.error("All fields are required");
    if (newPassword !== confirmPassword)
      return toast.error("Passwords don't match");

    try {
      const apiUrl = window.location.hostname === "localhost"
        ? "http://localhost:3001/api/auth/changepassword"
        : "/api/auth/changepassword";

      const res = await axios.post(apiUrl, {
        email: identifier,
        securityQuestion: selectedQuestion,
        securityAnswer,
        newPassword
      });

      if (res.data.success) {
        setDone(true);
        toast.success("Password updated!");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong");
    }
  };

  const panel = (
    <section className="security-panel">
      <Toaster />
        <h2 className="security-panel-title">
          🔑 Reset Password
        </h2>
        <p className="security-panel-description">
          Enter your email, select your security question, and provide your answer to change your password.
        </p>

        {done ? (
          <div className="security-panel-success">
            ✅ Password updated successfully!
            <button
              onClick={() => window.location.hash = "#/login"}
              className="security-panel-link"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="security-panel-form">
            <div>
              <label className="security-panel-label">
                Email Address
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Enter your email"
                className="security-panel-input"
              />
            </div>
            <div>
              <label className="security-panel-label">
                Security Question
              </label>
              <select
                value={selectedQuestion}
                onChange={e => setSelectedQuestion(e.target.value)}
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
                onChange={e => setSecurityAnswer(e.target.value)}
                placeholder="Enter your security answer"
                className="security-panel-input"
              />
            </div>
            <div>
              <label className="security-panel-label">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="security-panel-input"
              />
            </div>
            <div>
              <label className="security-panel-label">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="security-panel-input"
              />
            </div>
            <button
              onClick={handleSubmit}
              className="security-panel-submit"
            >
              Update Password
            </button>
          </div>
        )}
    </section>
  );

  return embedded ? panel : (
    <div className="security-panel-page">
      {panel}
    </div>
  );
}