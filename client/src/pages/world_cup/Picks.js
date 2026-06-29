import React from 'react';
import Picks from '../../components/world_cup/Picks';
import BracketStageBracket from '../../components/world_cup/BracketStageBracket';

export default function BracketStagePicksDisplay({ currentGame }) {

    // Logic updated: We are forcing this to true to make everything available.
    // If you want to revert later, just change this back to the Date() check.
    const forceShowAll = true; 

    return (
        <div className='page-content'>
            {/* Displaying both components to ensure maximum availability */}
            <div style={{ marginBottom: "40px" }}>
                {/* <h3 style={{ color: "#13447a" }}>Group Stage Picks</h3> */}
                <Picks />
            </div>
            
            <hr style={{ margin: "40px 0", border: "0", borderTop: "2px solid #e2e8f0" }} />
            
            <div>
                <h3 style={{ color: "#13447a" }}>Knockout Bracket</h3>
                <BracketStageBracket />
            </div>
        </div>
    );
}