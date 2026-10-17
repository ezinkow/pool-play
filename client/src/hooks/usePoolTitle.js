import { useEffect, useState } from "react";
import axios from "axios";

export default function usePoolTitle(gameKey, fallbackTitle) {
    const [poolTitle, setPoolTitle] = useState("");

    useEffect(() => {
        let isCurrent = true;

        axios.get("/api/settings/active-states")
            .then(({ data }) => {
                const pool = (data || []).find(item => item.game_key === gameKey);
                if (isCurrent && pool?.title) setPoolTitle(pool.title);
            })
            .catch(error => {
                console.error(`Failed to load pool title for ${gameKey}`, error);
            });

        return () => {
            isCurrent = false;
        };
    }, [gameKey]);

    return poolTitle || fallbackTitle;
}
