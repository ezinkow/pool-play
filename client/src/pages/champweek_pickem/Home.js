import React from 'react'
import CountdownDisplay from '../../components/champweek_pickem/CountdownDisplay'
import CountdownNextGameLock from '../../components/champweek_pickem/CountdownNextGameLock'
import PoolHomeActions from '../../components/PoolHomeActions'
import PoolCreditsSubtitle from '../../components/PoolCreditsSubtitle'

export default function Home() {
    return (
        <div>
            <div >   {/* ← ADD THIS */}
                {/* <CountdownDisplay /> */}
                <CountdownNextGameLock />
                <div className='container'>
                    <PoolCreditsSubtitle gameKey="ncaab_champ_week_pickem" />
                    <PoolHomeActions gameKey="ncaab_champ_week_pickem" />
                    <br />
                    <strong>The game:</strong><br />
                    Runs from March 7 - March 15<br />
                    Pick every conference tournament game <strong><u>against the spread</u></strong> from the following conferences: <br />
                    <ul style={{ listStyleType: 'none', paddingLeft: 0, marginTop: '10px' }}>
                        <li>A10</li>
                        <li>American</li>
                        <li>ACC</li>
                        <li>Big East</li>
                        <li>Big 10</li>
                        <li>Big 12</li>
                        <li>Conference USA</li>
                        <li>Mountain West</li>
                        <li>SEC</li>
                    </ul>
                    <strong>AND ALL </strong>conference championship games between March 7th and 15th.
                    <br /><br />
                    Games lock at scheduled tip-off time.<br />
                    Lines lock one hour before scheduled tip-off time.<br />
                    No matter what the line is when pick is submitted, the final, closed locked line will be the line everyone is using.
                    <br /><br />
                    <h4>Conference Tournament Schedules:</h4>
                    <a href="https://www.ncaa.com/march-madness-live/bracket"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: "inline-block",
                            padding: "12px 24px",
                            backgroundColor: "var(--primary-navy)",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: "pointer",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            textDecoration: "none",
                        }}>
                        📋 Full List of Conference Tournaments ↗
                    </a>
                </div>
            </div>
        </div >
    )
}