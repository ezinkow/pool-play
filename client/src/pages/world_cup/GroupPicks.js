import React from 'react';
// Use a clean, explicit token identifier for the imported module function
import GroupPicksGroupStage from '../../components/world_cup/UserPicksDisplay';
import GroupPicksBracketStage from '../../components/world_cup/BracketStageUserPicksDisplay';

const KNOCKOUT_SWITCH_TIME = new Date("2026-06-27T21:00:00-05:00");

export default function PicksDisplay() {
    if (new Date() < KNOCKOUT_SWITCH_TIME) {
        // Render using the fresh identifier
        return <GroupPicksBracketStage />;
    }

    return <GroupPicksGroupStage />;
}