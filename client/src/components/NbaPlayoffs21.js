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
        backgroundColor: 'yellow'
    },
    select: {
        maxHeight: '30px'
    }
}));

export default function NbaPlayoffs21() {
    const classes = useStyles();
    const [name, setName] = useState("")
    const [picks, setPicks] = useState([])
    // const [teamName, setTeamName] = useState("");
    // const [points, setPoints] = useState("")
    // const [games, setGames] = useState("")


    const handleNameChange = (event) => {
        setName(event.target.value)
    }
    //find series by id in picks array and update it. if is undefined, push new object
    const handlePickChange = (event) => {
        console.log(event.target)
        const { value, name } = event.target
        const teamName = value
        const id = name
        console.log(event.target)
        // setTeamName(event.target.value)
        /*
        when user selects a drop down, either add the new team name or change it

        find the object
        update team name of found object
        setPicks with all old picks + updated pick
        */


        if (picks.find(id => id.id === event.target.name) !== undefined) {
            const foundObj = picks.find(pick => pick.id === event.target.name)
            const i = picks.indexOf(foundObj)
            const updatedPick = { ...foundObj, teamName }
            const picksArray = picks.slice()
            picksArray[i] = updatedPick
            setPicks(picksArray)
        } else {
            const newArray = picks.slice()
            newArray.push({ teamName, id })
            setPicks(newArray)
        }
    };

    const handleConfidencePointsChange = (event) => {
        const { value, name } = event.target
        const points = value
        const id = name
        // setPoints(event.target.value)
        if (picks.find(id => id.id === event.target.name) !== undefined) {
            const foundObj = picks.find(id => id.id === event.target.name)
            const i = picks.indexOf(foundObj)
            const updatedPick = { ...foundObj, points }
            const picksArray = picks.slice()
            picksArray[i] = updatedPick
            setPicks(picksArray)
        } else {
            const newArray = picks.slice()
            newArray.push({ points, id })
            console.log('new array', newArray)
            setPicks(newArray)
        }
    };

    const handleGamesChange = (event) => {
        const { value, name } = event.target
        let games = value
        const id = name
        // setGames(event.target.value)
        if (picks.find(id => id.id === event.target.name) !== undefined) {
            const foundObj = picks.find(id => id.id === event.target.name)
            const i = picks.indexOf(foundObj)
            const updatedPick = { ...foundObj, games }
            const picksArray = picks.slice()
            picksArray[i] = updatedPick
            setPicks(picksArray)
        } else {
            const newArray = picks.slice()
            newArray.push({ games, id })
            console.log('new array', newArray)
            setPicks(newArray)
        }
    };

    function handleSubmit(event) {
        event.preventDefault()
        axios.post('/api/nbaplayoffs21', {
            name,
            picks
        })
        console.log("submit", picks)
        setName("")
        setPicks([])

    }

    useEffect(() => {
        console.log(picks)
    }, [picks])


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
                            <TableCell>Confidence Points</TableCell>
                            <TableCell>Number of Games</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {nbaPlayoffs21.map(series =>
                            <TableRow>
                                <TableCell align="left">{series.highSd} {series.highSeed} vs {series.lowSd} {series.lowSeed}</TableCell>
                                <TableCell align="left">
                                    <FormControl letiant="outlined" className={classes.formControl}>
                                        <InputLabel id="demo-simple-select-outlined-label">Pick</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId='a'
                                            onChange={handlePickChange}
                                            name={series.id}
                                        // value={picks}
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
                                        <InputLabel id="demo-simple-select-outlined-label">Points</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId='a'
                                            name={series.id}
                                            onChange={handleConfidencePointsChange}
                                        // value={picks}
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
                                        <InputLabel id="demo-simple-select-outlined-label">Games</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId='a'
                                            name={series.id}
                                            onChange={handleGamesChange}
                                        // value={picks}
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
                <Button variant="contained" onClick={handleSubmit}>Submit</Button>
            </div>
        </>
    );
}