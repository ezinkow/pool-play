import { useState, useEffect } from 'react'
import axios from 'axios'
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { baseballWeekly } from '../data/baseballWeekly'

const useStyles = makeStyles({
    table: {
        maxWidth: 2000,

    },
});

export default function BaseballWeeklyPicks() {
    const classes = useStyles();
    const [bwPicks, setBwPicks] = useState([])
    const [displayPicks, setDisplayPicks] = useState([])

    useEffect(() => {
        async function fetchBwPicks() {
            try {
                const response = await axios('/api/baseballweekly')
                let gamePicks = [];
                let picksArr = []

                // const pickSet = response.data.map((value, index) => {
                //     console.log('value', value, 'index', index)
                // })
                // console.log(pickSet)
                let i = 0
                for (i = 0; i < response.data.length; i++) {
                    for (const [key, value] of Object.entries(response.data)) {
                        if (key.includes("game")) {
                            setBwPicks(response.data)
                            console.log(response.data)
                            console.log("Elan's object being iterated over: " + " : " + value)
                            gamePicks.push(value)
                            // picksArr.push(gamePicks)
                            setDisplayPicks(gamePicks)
                        }
                    }
                }

                //======


                // console.log('response', response.data)
                // setBwPicks(response.data)
                // // for (let i = 0; i < response.data.length; i++) {
                //     //     let score = await response.data[i].game1 === baseballWeekly[0].result ? 1 : 0
                //     //     console.log(score)
                //     // }
                //     response.data.forEach(game => {
                //         console.log(game.game1 === baseballWeekly[0].result ? 1 : 0)
                //     });
                //     // score += await response.data[0].game2 === baseballWeekly[1].result ? 1 : 0
                //     // console.log(bwPicks[0].game1)
                //     // console.log('score', score)
                //     // console.log(score)
            } catch (e) {
                console.log(e)
            }
        }
        fetchBwPicks()
    }, [])

    console.log(bwPicks)
    console.log(displayPicks)

    // function getScore() {
    // for (let i = 0; i < baseballWeekly.length; i++) {

    // }
    // }
    // getScore()

    return (
        <TableContainer component={Paper}>
            <Table className={classes.table} size="small" aria-label="simple table">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        {baseballWeekly.map((game) => (
                            <>
                                <TableCell align="right">{game.away}@{game.home}</TableCell>
                            </>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {bwPicks.map((nm) => (
                        <>
                            <TableRow>
                                <TableCell>
                                    {nm.name}
                                </TableCell>
                                {displayPicks.map((game, i) => (
                                    <TableCell>
                                        { displayPicks}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </>
                    ))}
                </TableBody>
            </Table>
        </TableContainer >
    )
}
    // {bwPicks.map((pick, i) => (
    //     <TableRow key={pick.id}>
    //         <TableCell component="th" scope="row">
    //             {pick.name}
    //         </TableCell>
    //         {/* {Object.keys(pick).forEach((key) => {
    //             return (
    //                 <TableCell align="right">{pick[key]}</TableCell>
    //             )
    //         })} */}
    //         <TableCell align="right">{pick.game + i}</TableCell>
    //         <TableCell align="right">{pick.game2}</TableCell>
    //         <TableCell align="right">{pick.game3}</TableCell>
    //         <TableCell align="right">{pick.game4}</TableCell>
    //         <TableCell align="right">{pick.game5}</TableCell>
    //         <TableCell align="right">{pick.game6}</TableCell>
    //         <TableCell align="right">{pick.game7}</TableCell>
    //         <TableCell align="right">{pick.game8}</TableCell>
    //         <TableCell align="right">{pick.game9}</TableCell>
    //         <TableCell align="right">{pick.game10}</TableCell>
    //         <TableCell align="right">{pick.game11}</TableCell>
    //         <TableCell align="right">{pick.game12}</TableCell>
    //         <TableCell align="right">{pick.game13}</TableCell>
    //         <TableCell align="right">{pick.game14}</TableCell>
    //     </TableRow>
    // ))}