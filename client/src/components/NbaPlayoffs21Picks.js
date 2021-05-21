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
import { nbaPlayoffs21 } from '../data/nbaPlayoffs21'

const useStyles = makeStyles({
    table: {
        maxWidth: 2000,

    },
});

export default function NbaPlayoffs21Picks() {
    const classes = useStyles()
    const [responseData, setResponseData] = useState([])
    const [nbaPicks, setNbaPicks] = useState([])
    const [teamPicks, setTeamPicks] = useState([])
    const [name, setName] = useState("")

    useEffect(() => {
        async function fetchNbaPicks() {
            try {
                const response = await axios('/api/nbaplayoffs21')
                setNbaPicks(response.data.map(pick => pick.picks))
                setResponseData(response.data)
                const picksArray = []
                // for (let i = 0; i < nbaPicks.length; i++) {
                //     const currentArray = nbaPicks[i];
                //     console.log(currentArray)
                //     const userPicks = currentArray.map(selection => selection.teamName)
                //     console.log(userPicks)
                //     picksArray.push(userPicks)
                //     setTeamPicks(picksArray)
                // }
            } catch (e) {
                console.log(e)
            }
        }
        fetchNbaPicks()
    }, [])

    // useEffect(() => {
    //     console.log(nbaPicks)
    //     const picksArray = nbaPicks.map(pick => pick.map(chosen => chosen))
    //     console.log('test', picksArray)
    //     setTeamPicks(picksArray)
    // }, [nbaPicks])

    // console.log(nbaPicks)
    // const picksArray = []
    // for (let i = 0; i < nbaPicks.length; i++) {
    //     const currentArray = nbaPicks[i];
    //     console.log(currentArray)
    //     const userPicks = currentArray.map(selection => selection.teamName)
    //     console.log(userPicks)
    //     picksArray.push(userPicks)
    //     setTeamPicks(picksArray)

    // }


    // console.log('pks array', picksArray, picksArray[0])
    // const firstPick = picksArray.map(first => first.teamName)
    // console.log(firstPick)

    return (
        <TableContainer component={Paper}>
            <Table className={classes.table} size="small" aria-label="simple table">
                <TableHead>
                    <TableRow>
                        <TableCell>
                            Name
                        </TableCell>
                        <TableCell>
                            Series
                        </TableCell>
                        <TableCell>
                            Pick
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        {responseData.map(res => (
                            <>
                                <TableCell>
                                    {res.name}
                                </TableCell>
                                {nbaPicks.map(element =>
                                    element.map(selection =>
                                        <TableCell>
                                            {selection.teamName}
                                        </TableCell>
                                    ))}
                            </>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    )



}



    // {nbaPlayoffs21.map(series => (
    //     nbaPicks.map(pick =>
    //         pick.picks.map(teams =>
    //             <>
    //                 <TableCell>
    //                     {series.highSeed} vs {series.lowSeed}
    //                 </TableCell>
    //                 <TableCell>
    //                     {teams.teamName}
    //                 </TableCell>
    //                 <TableCell>
    //                     {teams.points}
    //                 </TableCell>
    //                 <TableCell>
    //                     {teams.games}
    //                 </TableCell>
    //             </>
    //         ))
    // ))}