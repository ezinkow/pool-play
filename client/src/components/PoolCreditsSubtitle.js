import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PoolCreditsSubtitle({ gameKey }) {
    const [credits, setCredits] = useState(null);

    useEffect(() => {
        let isCurrent = true;

        axios.get("/api/settings/active-states")
            .then(({ data }) => {
                const pool = (data || []).find(item => item.game_key === gameKey);
                if (isCurrent && pool?.credits != null) setCredits(pool.credits);
            })
            .catch(error => {
                console.error(`Failed to load credits for ${gameKey}`, error);
            });

        return () => {
            isCurrent = false;
        };
    }, [gameKey]);

    if (credits == null) return null;

    return <p className="pool-credits-subtitle">Entry: {credits} credits</p>;
}
