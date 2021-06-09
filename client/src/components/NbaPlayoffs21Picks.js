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
    const [pickSet, setPickSet] = useState([])
    const [name, setName] = useState("")
    const [elansPicks, setElansPicks] = useState(['test', 'test'])

    useEffect(() => {
        async function fetchNbaPicks() {
            try {
                const response = await axios('/api/nbaplayoffs21')
                setNbaPicks(response.data.map(res => res.picks))
                setElansPicks(nbaPicks[0])
                const lowSeed = nbaPlayoffs21.lowSeed
                const highSeed = nbaPlayoffs21.highSeed
                setResponseData(response.data)
                console.log(nbaPicks, response.data)
                // const picksArray = []

            } catch (e) {
                console.log(e)
            }
        }
        fetchNbaPicks()
    }, [])
    console.log(responseData)

    useEffect(() => {
        console.log(nbaPicks)
        // for (let i = 0; i < nbaPicks.length; i++) {
        //     const picksArray = nbaPicks[i]
        //     console.log(picksArray)
        //     for (let j = 0; j < picksArray.length; j++) {
        //         const currentPick = picksArray[j];
        //         console.log(currentPick)
        //     }
        // }

        // ===

        // const pickSet = nbaPicks.map(element => element.map(pick =>
        // (
        // )
        // ))

        const newArray = nbaPicks.map(pick => pick)
        console.log(newArray)

        const seriesPicks = []
        const picksMap = {}

        for (let i = 0; i < newArray.length; i++) {
            for (let j = 0; j < newArray.length; j++) {
                const currentPicks = newArray[j][i]
                console.log(currentPicks)
                const thisPickSet = `Pick: ${currentPicks.teamName} Points: ${currentPicks.points} Games: ${currentPicks.games}`
                // picksMap[] = thisPickSet
                console.log(picksMap)
                seriesPicks.push(thisPickSet)
                setPickSet(seriesPicks)

            }
        }

        //     const currentArray = nbaPicks[i];
        //     console.log(currentArray)
        //     const userPicks = currentArray.map(selection => selection.teamName)
        // console.log(nbaPicks[i][i].teamName)
        //     picksArray.push(userPicks)
        //     setTeamPicks(picksArray)
        // const picksArray = nbaPicks.map(pick => pick.map(chosen => chosen))
        // console.log('test', picksArray)
        // setTeamPicks(picksArray)
    }, [nbaPicks])
    console.log(pickSet)

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
                        </TableCell>
                        {responseData.map(res =>
                            <>
                                {/* < TableCell >
                                </TableCell> */}
                                <TableCell>
                                    {res.name}
                                </TableCell>
                                {/* <TableCell>
                                </TableCell> */}
                            </>
                        )}
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            Series
                        </TableCell>
                        <TableCell>
                            Pick
                        </TableCell>
                        {/* <TableCell>
                            Points
                        </TableCell>
                        <TableCell>
                            Games
                        </TableCell> */}

                    </TableRow>
                </TableHead>
                <TableBody>
                    {/* 
                    
                    Each user is every column
                    Each series/series picks is every row

                        Map over the array of users
                        one column per user

                    
                    
                    */}
                    {nbaPlayoffs21.map(series => (
                        <TableRow>
                            <TableCell>
                                {series.highSeed} vs {series.lowSeed}
                            </TableCell>
                            {pickSet.map(pick => pick)}
                        </TableRow>
                    ))}

                </TableBody>
            </Table>
        </TableContainer >

    )}