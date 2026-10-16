import { useEffect, useState } from "react";
import axios from "axios";

const metadataRequests = new Map();

export default function usePoolMetadata(gameKey) {
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    let metadataRequest = metadataRequests.get(gameKey);
    if (!metadataRequest) {
      metadataRequest = axios.get(`/api/pools/metadata/${gameKey}`)
        .then((response) => response.data)
        .catch((error) => {
          metadataRequests.delete(gameKey);
          throw error;
        });
      metadataRequests.set(gameKey, metadataRequest);
    }

    metadataRequest
      .then((poolMetadata) => {
        if (isCurrent) setMetadata(poolMetadata);
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
