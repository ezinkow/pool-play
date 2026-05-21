import React, { useState } from "react";
import axios from "axios";

const RefreshGamesButton = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const refreshGames = async () => {
    try {
      setLoading(true);

      await axios.post("/api/bracket/admin/refresh-games");

      // Re-fetch games instead of alert/modal
      if (onRefresh) {
        await onRefresh();
      }
      window.location.reload();
    } catch (err) {
      console.error("Error refreshing games", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={refreshGames} disabled={loading}>
      {loading ? "Refreshing..." : "Manually Refresh Games"}
    </button>
  );
};

export default RefreshGamesButton;