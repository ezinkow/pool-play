import React from 'react'
import CountdownDisplay from '../../components/CountdownDisplay'
import CountdownNextGameLock from '../../components/tourney_pickem/CountdownNextGameLock'
import PoolRulesCard from '../../components/PoolRulesCard'
import usePoolMetadata from '../../hooks/usePoolMetadata'
import PoolHomeActions from '../../components/PoolHomeActions'

const GOLD = "#c89d3c";
const GAME_LOCK_SWITCHOVER = new Date("2026-03-19T16:15:00Z"); // 11:15 AM CT

export default function Home() {
    const poolMetadata = usePoolMetadata("ncaab_tourney_pickem");
    const gameLocked = new Date() >= GAME_LOCK_SWITCHOVER;

    return (
        <div>
            <div >
                {gameLocked ? <CountdownNextGameLock /> : <CountdownDisplay />}
                <div className='container'>
                    <PoolHomeActions gameKey="ncaab_tourney_pickem" />
                    <br />
                    <PoolRulesCard
                        gameKey="ncaab_tourney_pickem"
                        title={poolMetadata?.pool_title || "NCAA Tournament Pick'em"}
                        rulesHtml={poolMetadata?.rules_html}
                        accentColor={poolMetadata?.accent_color || GOLD}
                        subtitle="Game Rules"
                    />
                    <a href="https://www.ncaa.com/march-madness-live/scores"
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
                        📋 Tourney Scores ↗
                    </a>
                </div>
            </div>
        </div>
    )
}