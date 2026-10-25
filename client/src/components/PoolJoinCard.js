import React from "react";
import PoolCreditsSubtitle from "./PoolCreditsSubtitle";

export default function PoolJoinCard({
    gameKey,
    poolTitle,
    poolEmoji,
    userEntry,
    userEntries = [],
    isMultiEntry = false,
    isPoolStarted,
    confirmLeave,
    setConfirmLeave,
    handleJoinPool,
    handleLeavePool,
    customEntryName,
    setCustomEntryName,
    user,
    accentColor = "#013369",
    icon,
    joinDescription,
    joinButtonText = "Join Pool",
    registeredMessage = "✓ You are officially registered!",
    closedMessage = "This pool has already started or reached its lock time. New entries are no longer accepted."
}) {
    const displayIcon = poolEmoji || icon;
    const hasJoinedAny = userEntries.length > 0 || !!userEntry;
    return (
        <section className="pool-card pool-join-card" style={{ "--pool-accent": accentColor }}>
            <h3>
                {displayIcon && <span>{displayIcon}</span>}
                {displayIcon ? " " : ""}
                {poolTitle}
                {displayIcon ? " " : ""}
                {displayIcon && <span className="pool-reversed-icon">{displayIcon}</span>}
            </h3>
            {gameKey && <PoolCreditsSubtitle gameKey={gameKey} />}

            {/* --- MULTI-ENTRY DISPLAY MODE --- */}
            {isMultiEntry ? (
                <div className="pool-join-status">
                    {hasJoinedAny && (
                        <div style={{ marginBottom: 16 }}>
                            <p className="pool-registered-message">
                                {registeredMessage} ({userEntries.length} {userEntries.length === 1 ? 'Entry' : 'Entries'})
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                                {userEntries.map((entry, idx) => (
                                    <div key={entry.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-alt, #f8fafc)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color, #e2e8f0)" }}>
                                        <div style={{ textAlign: "left" }}>
                                            <span style={{ fontSize: "12px", fontWeight: 800, color: accentColor, marginRight: 8 }}>#{idx + 1}</span>
                                            <strong style={{ fontSize: "13px", color: accentColor }}>{entry.entry_name}</strong>
                                        </div>
                                        {!isPoolStarted && (
                                            <button
                                                type="button"
                                                onClick={() => handleLeavePool(entry)}
                                                style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, cursor: "pointer", fontSize: "12px" }}
                                                title="Remove Entry"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isPoolStarted && (
                        <div style={{ marginTop: 16, borderTop: "1px solid var(--border-color, #e2e8f0)", paddingTop: 16 }}>
                            {joinDescription && <p className="text-subtitle pool-join-description">{joinDescription}</p>}
                            <div className="pool-entry-field" style={{ marginBottom: 12 }}>
                                <div className="pool-entry-label-row">
                                    <label>New Entry Name:</label>
                                    {user?.name && (
                                        <button
                                            type="button"
                                            onClick={() => setCustomEntryName(user.name)}
                                            className="pool-username-button"
                                        >
                                            Use Username ({user.name})
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={customEntryName}
                                    onChange={(e) => setCustomEntryName(e.target.value)}
                                    placeholder={user?.name || "Enter entry name"}
                                    className="pool-entry-input"
                                />
                            </div>
                            <button onClick={handleJoinPool} className="pool-join-button">
                                {hasJoinedAny ? "Add Another Entry" : joinButtonText}
                            </button>
                        </div>
                    )}

                    {isPoolStarted && !hasJoinedAny && (
                        <div className="pool-closed-state" style={{ marginTop: 16 }}>
                            <span className="pool-lock-icon">🔒</span>
                            <p className="pool-closed-message">Registration is Closed</p>
                            <p className="text-subtitle pool-closed-detail">{closedMessage}</p>
                        </div>
                    )}
                </div>
            ) : (
                /* --- SINGLE-ENTRY DISPLAY MODE --- */
                userEntry ? (
                    <div className="pool-join-status">
                        <p className={`pool-registered-message${userEntry?.is_eliminated ? " pool-eliminated-message" : ""}`}>
                            {registeredMessage}
                        </p>
                        <p className="text-subtitle pool-entry-name">Display Name: <strong>{userEntry?.entry_name}</strong></p>

                        {!isPoolStarted && (
                            <div>
                                {confirmLeave ? (
                                    <div className="pool-confirm-leave">
                                        <p className="pool-confirm-message">Are you sure you want to leave?</p>
                                        <button className="pool-danger-button" onClick={handleLeavePool}>Yes, Leave</button>
                                        <button className="pool-cancel-button" onClick={() => setConfirmLeave(false)}>Cancel</button>
                                    </div>
                                ) : (
                                    <button className="pool-leave-button" onClick={() => setConfirmLeave(true)}>
                                        Leave Pool
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : isPoolStarted ? (
                    <div className="pool-closed-state">
                        <span className="pool-lock-icon">🔒</span>
                        <p className="pool-closed-message">Registration is Closed</p>
                        <p className="text-subtitle pool-closed-detail">{closedMessage}</p>
                    </div>
                ) : (
                    <div>
                        {joinDescription && <p className="text-subtitle pool-join-description">{joinDescription}</p>}
                        <div className="pool-entry-field">
                            <div className="pool-entry-label-row">
                                <label>Entry / Display Name:</label>
                                {user?.name && (
                                    <button
                                        type="button"
                                        onClick={() => setCustomEntryName(user.name)}
                                        className="pool-username-button"
                                    >
                                        Use Username ({user.name})
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={customEntryName}
                                onChange={(e) => setCustomEntryName(e.target.value)}
                                placeholder={user?.name || "Enter display name"}
                                className="pool-entry-input"
                            />
                        </div>
                        <button onClick={handleJoinPool} className="pool-join-button">
                            {joinButtonText}
                        </button>
                    </div>
                )
            )}
        </section>
    );
}