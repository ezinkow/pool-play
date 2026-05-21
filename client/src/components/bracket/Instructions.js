import React from 'react'

export default function instructions() {
    return (
        <div className="instructions-card">
            <h3>Instructions:</h3>
            <ul>
                <li>Select name and log in</li>
                <li>Make your picks and submit</li>
                <li>Points increase by 1 each round (Round 1 = 1 point, Sweet 16 = 3 points, etc.)</li>
                <li>If you need to make a change, you can resubmit single picks at any time up until the scheduled tip-off time.</li>
                <li>Lines that are whole numbers will shift .5 in favor of the underdog (-5 moves to -5.5)</li>
                <li>Missed picks will default to underdog and are worth half the round value</li>
                <li>Games lock at scheduled tip-off time. Lines lock one hour before.</li>
                <li>Games will be selectable once both teams are decided.</li>
            </ul>
        </div>

    )
}