import React from "react";
import usePoolMetadata from "../hooks/usePoolMetadata";

export default function PoolEmoji({ gameKey, className, style }) {
    const metadata = usePoolMetadata(gameKey);

    if (!metadata?.emoji) return null;

    return (
        <span className={className} style={style} aria-hidden="true">
            {metadata.emoji}
        </span>
    );
}
