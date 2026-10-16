import { useEffect, useState } from "react";
import axios from "axios";

export default function usePoolMetadata(gameKey) {
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    axios.get(`/api/pools/metadata/${gameKey}`)
      .then((response) => {
        if (isCurrent) setMetadata(response.data);
      })
      .catch((error) => {
        console.error(`Failed to load ${gameKey} pool metadata`, error);
      });

    return () => {
      isCurrent = false;
    };
  }, [gameKey]);

  return metadata;
}
