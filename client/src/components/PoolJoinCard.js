import React from "react";
import PoolCreditsSubtitle from "./PoolCreditsSubtitle";

export default function PoolJoinCard({
    gameKey,
    poolTitle,
    poolEmoji,
    userEntry,
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

            {userEntry ? (
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
            )}
        </section>
    );
}