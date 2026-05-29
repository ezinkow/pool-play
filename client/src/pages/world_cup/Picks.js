import React from 'react';
import Picks from '../../components/world_cup/Picks';
import BracketStageBracket from '../../components/world_cup/BracketStageBracket';

// 🧠 EXPECTS: `currentGame` object passed down from your master pool/route container
export default function BracketStagePicksDisplay({ currentGame }) {

    // 🧠 DYNAMIC SWITCH ENGINE: 
    // If your database profile has a specific lock date assigned, evaluate against that timestamp.
    // If no lock date exists yet (or it hasn't loaded), safely fall back to group stage pick sheets.
    const isKnockoutPhaseActive = currentGame?.lock_date
        ? new Date() >= new Date(currentGame.lock_date)
        : false;

    // Show personal group play picker match cards BEFORE the switchover date
    if (!isKnockoutPhaseActive) {
        return <div className='page-content'>
            <Picks />
        </div>;
    }

    // Show the personal bracket builder AFTER the switchover date
    return
    <div className='page-content'>
        <BracketStageBracket />
    </div>
}