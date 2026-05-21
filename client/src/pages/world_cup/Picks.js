import React from 'react';
import Picks from '../../components/world_cup/Picks';
import BracketStageBracket from '../../components/world_cup/BracketStageBracket';

const KNOCKOUT_SWITCH_TIME = new Date("2026-06-27T21:00:00-05:00");

export default function BracketStagePicksDisplay() {
    // FIX: Show personal group play picker match cards BEFORE the switchover date
    if (new Date() < KNOCKOUT_SWITCH_TIME) {
        return <Picks />;
    }

    // Show the personal bracket builder AFTER the switchover date
    return <BracketStageBracket />;
}