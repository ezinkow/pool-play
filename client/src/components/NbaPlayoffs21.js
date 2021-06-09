import { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { nbaPlayoffs21 } from '../data/nbaPlayoffs21'
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
// import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import axios from 'axios'
// import DropdownButton from 'react-bootstrap/DropdownButton'
// import Dropdown from 'react-bootstrap/Dropdown'

const useStyles = makeStyles((theme) => ({
    root: {
        '& > *': {
            margin: theme.spacing(1),
            // width: '25ch',
        }
    },
    table: {
        minWidth: 650,
        color: 'green',
        // minHeight: 1000,
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
    container: {
        minHeight: 300,
        backgroundColor: 'lightGray'
    },
    select: {
        maxHeight: '30px'
    },
    viewPicksBtn: {
        // marginLeft: '5000px'
        display: 'none'
    }
}));

export default function NbaPlayoffs21() {
    const classes = useStyles();
    const [userName, setUserName] = useState("")
    const [picks, setPicks] = useState([])
    const [totalPoints, setTotalPoints] = useState(0)

    const handleNameChange = (event) => {
        setUserName(event.target.value)
        console.log(userName)
    }

    const handlePickChange = (event) => {
        // console.log(event.target)
        const { value, name } = event.target
        const teamName = value
        const id = name
        /*
        when user selects a drop down, either add the new team name or change it
        
        find the object
        update team name of found object
        setPicks with all old picks + updated pick
        */
        if (picks.find(pick => pick.id === event.target.name) !== undefined) {
            const foundObj = picks.find(pick => pick.id === event.target.name)
            const i = picks.indexOf(foundObj)
            let seriesObj = nbaPlayoffs21.find(srs => srs.id === event.target.name)
            let series = `${seriesObj.lowSeed} vs ${seriesObj.highSeed}`
            console.log(series)
            const updatedPick = { ...foundObj, teamName, series }
            const picksArray = picks.slice()
            picksArray[i] = updatedPick
            setPicks(picksArray)
            console.log("TEST", picks)
        } else {
            const newArray = picks.slice()
            let seriesObj = nbaPlayoffs21.find(srs => srs.id === event.target.name)
            let series = `${seriesObj.lowSeed} vs ${seriesObj.highSeed}`
            newArray.push({ teamName, id, series })
            setPicks(newArray)
        }
    };

    const handleConfidencePointsChange = (event) => {
        const { value, name } = event.target
        const points = value
        const id = name
        if (picks.find(pick => pick.id === event.target.name) !== undefined) {
            const foundObj = picks.find(pick => pick.id === event.target.name)
            const i = picks.indexOf(foundObj)
            const updatedPick = { ...foundObj, points }
            const picksArray = picks.slice()
            picksArray[i] = updatedPick
            setPicks(picksArray)
            if (foundObj.points == undefined) {
                setTotalPoints(points + totalPoints)
            } else {
                let resetPoints = totalPoints - foundObj.points
                let newPoints = resetPoints + points
                setTotalPoints(newPoints)
            }
        } else {
            const newArray = picks.slice()
            newArray.push({ points, id })
            // console.log('new array', newArray)
            setPicks(newArray)
            setTotalPoints(points + totalPoints)
        }
    };

    const handleGamesChange = (event) => {
        const { value, name } = event.target
        let games = value
        const id = name
        // setGames(event.target.value)
        if (picks.find(pick => pick.id === event.target.name) !== undefined) {
            const foundObj = picks.find(pick => pick.id === event.target.name)
            const i = picks.indexOf(foundObj)
            const updatedPick = { ...foundObj, games }
            const picksArray = picks.slice()
            picksArray[i] = updatedPick
            setPicks(picksArray)
        } else {
            const newArray = picks.slice()
            newArray.push({ games, id })
            // console.log('new array', newArray)
            setPicks(newArray)
        }
    };

    function handleSubmitClick(event) {
        // event.preventDefault()
        // console.log("submit", picks)
        axios.post('/api/nbaplayoffs21', {
            name: userName,
            picks
        })
        setUserName("")
        setPicks([])
        // console.log(event.target)
        // document.getElementById('picksBtn').classlist.remove('hide');

    }

    // function handlePicksViewClick(){
    //     console.log('clik')
    // }

    useEffect(() => {
        console.log(picks)
    }, [picks])

    const val = picks.teamName !== undefined ? picks.teamName : ''


    return (
        <>
            <form className={classes.root} noValidate autoComplete="off">
                <TextField id="name" label="Name" variant="outlined" onChange={handleNameChange} />
            </form>
            <TableContainer component={Paper} className={classes.container}>
                <Table className={classes.table} size="small" aria-label="nba table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Game</TableCell>
                            <TableCell>Pick</TableCell>
                            <TableCell>Confidence Points (Must equal 32: {totalPoints})</TableCell>
                            <TableCell>Number of Games</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {nbaPlayoffs21.map(series =>
                            <TableRow>
                                <TableCell align="left">{series.highSd} {series.highSeed} vs {series.lowSd} {series.lowSeed}</TableCell>
                                <TableCell align="left">
                                    <FormControl letiant="outlined" className={classes.formControl}>
                                        <InputLabel id="teamPicks" key={series.id}>Pick</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId='a'
                                            onChange={handlePickChange}
                                            name={series.id}
                                            // value={picks.teamName}
                                        // id={pick}
                                        // label="test"
                                        >
                                            {/* <MenuItem value="">
                                                <em>None</em>
                                            </MenuItem> */}
                                            <MenuItem value={series.lowSeed}>{series.lowSeed}</MenuItem>
                                            <MenuItem value={series.highSeed}>{series.highSeed}</MenuItem>
                                        </Select>
                                    </FormControl>
                                </TableCell>
                                <TableCell>
                                    <FormControl letiant="outlined" className={classes.formControl}>
                                        <InputLabel id="points" key={series.id}>Points</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId='a'
                                            name={series.id}
                                            onChange={handleConfidencePointsChange}
                                            // value={picks.points}
                                        // id={series.id}
                                        // label="Pick"
                                        >
                                            <MenuItem value={1}>1</MenuItem>
                                            <MenuItem value={2}>2</MenuItem>
                                            <MenuItem value={3}>3</MenuItem>
                                            <MenuItem value={4}>4</MenuItem>
                                            <MenuItem value={5}>5</MenuItem>
                                            <MenuItem value={6}>6</MenuItem>
                                            <MenuItem value={7}>7</MenuItem>
                                            <MenuItem value={8}>8</MenuItem>
                                            <MenuItem value={9}>9</MenuItem>
                                            <MenuItem value={10}>10</MenuItem>
                                        </Select>
                                    </FormControl>
                                </TableCell>
                                <TableCell>
                                    <FormControl letiant="outlined" className={classes.formControl}>
                                        <InputLabel id="games" key={series.id}>Games</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId='a'
                                            name={series.id}
                                            onChange={handleGamesChange}
                                            // value={picks.games}
                                        >
                                            <MenuItem value={4}>4</MenuItem>
                                            <MenuItem value={5}>5</MenuItem>
                                            <MenuItem value={6}>6</MenuItem>
                                            <MenuItem value={7}>7</MenuItem>
                                        </Select>
                                    </FormControl>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <div className={classes.root}>
                <Button variant="contained" onClick={handleSubmitClick}>Submit</Button>
                {/* <Button variant="contained" onClick={handlePicksViewClick} className={classes.viewPicksBtn} id='picksBtn'>View Picks</Button> */}
            </div>
        </>
    );
}