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
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import DropdownButton from 'react-bootstrap/DropdownButton'
import Dropdown from 'react-bootstrap/Dropdown'

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
    const [picks, setPicks] = useState([])
    // const [pick, setPick] = useState("");
    // const [points, setPoints] = useState("")
    // const [games, setGames] = useState("")

    //find series by id in picks array and update it. if is undefined, push new object
    const handlePickChange = (event) => {
        const { value, name } = event.target
        var pick = value
        const id = name
        console.log(event.target)
        if (picks.find(id => id.id === event.target.name) !== undefined) {
            const foundObj = picks.find(id => id.id === event.target.name)
            console.log(foundObj)
            if (foundObj.points !== undefined) {
                var points = foundObj.points
            }
            if (foundObj.games !== undefined) {
                var games = foundObj.games
            }
            const i = picks.indexOf(foundObj)
            picks[i] = { pick, id, points, games }
        } else {
            const newArray = picks.slice()
            newArray.push({ pick, id })
            setPicks(newArray)
        }
    };

    const handleConfidencePointsChange = (event) => {
        const { value, name } = event.target
        var points = value
        const id = name
        if (picks.find(id => id.id === event.target.name) !== undefined) {
            const foundObj = picks.find(id => id.id === event.target.name)
            console.log(foundObj)
            if (foundObj.pick !== undefined) {
                var pick = foundObj.pick
                console.log(pick)
            }
            if (foundObj.games !== undefined) {
                var games = foundObj.games
                console.log(games)
            }
            const i = picks.indexOf(foundObj)
            picks[i] = { pick, id, points, games }
        } else {
            const newArray = picks.slice()
            newArray.push({ points, id })
            console.log('new array', newArray)
            setPicks(newArray)
        }
    };

    const handleGamesChange = (event) => {
        const { value, name } = event.target
        var games = value
        const id = name
        if (picks.find(id => id.id === event.target.name) !== undefined) {
            const foundObj = picks.find(id => id.id === event.target.name)
            console.log(foundObj)
            if (foundObj.points !== undefined) {
                var points = foundObj.points
            }
            if (foundObj.pick !== undefined) {
                var pick = foundObj.pick
            }
            const i = picks.indexOf(foundObj)
            picks[i] = { pick, points, games, id }
            console.log('picks', picks)
        } else {
            const newArray = picks.slice()
            newArray.push({ games, id })
            console.log('new array', newArray)
            setPicks(newArray)
        }
    };

    const handleSelect = (event) => {
        console.log(event)
        // setPick([...setPick, ])

    }
    useEffect(() => {
        console.log(picks)
    }, [picks])

    return (
        <>
            <TableContainer component={Paper} className={classes.container}>
                <Table className={classes.table} size="small" aria-label="nba table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Game</TableCell>
                            <TableCell>Pick</TableCell>
                            <TableCell>Confidence Points</TableCell>
                            <TableCell>Number of Games</TableCell>
                            <TableCell>Selection</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {nbaPlayoffs21.map(series =>
                            <TableRow>
                                <TableCell align="left">{series.highSd} {series.highSeed} vs {series.lowSd} {series.lowSeed}</TableCell>
                                <TableCell align="left">
                                    <FormControl variant="outlined" className={classes.formControl}>
                                        <InputLabel id="demo-simple-select-outlined-label">Pick</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId='a'
                                            // id={pick}
                                            value={picks}
                                            onChange={handlePickChange}
                                            // label="test"
                                            name={series.id}
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
                                    <FormControl variant="outlined" className={classes.formControl}>
                                        <InputLabel id="demo-simple-select-outlined-label">Points</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId="points"
                                            name={series.id}
                                            // id={points}
                                            value={picks}
                                            onChange={handleConfidencePointsChange}
                                            label="Pick">
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
                                    <FormControl variant="outlined" className={classes.formControl}>
                                        <InputLabel id="demo-simple-select-outlined-label">Games</InputLabel>
                                        <Select
                                            className={classes.select}
                                            labelId="games"
                                            // id={games}
                                            name={series.id}
                                            value={picks}
                                            onChange={handleGamesChange}
                                            label="Games">
                                            <MenuItem value={4}>4</MenuItem>
                                            <MenuItem value={5}>5</MenuItem>
                                            <MenuItem value={6}>6</MenuItem>
                                            <MenuItem value={7}>7</MenuItem>
                                        </Select>
                                    </FormControl>
                                </TableCell>
                                <TableCell>
                                    {/* {picks.length > 0 ? {picks.map(select => select.pick)} : ""} */}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <button>Submit</button>
        </>
    );
}


                                //     <Dropdown
                                //         onSelect={handlePickSelect}
                                //         // value={pick.pick}
                                //     >
                                //         <Dropdown.Toggle variant="success" id="dropdown-basic">
                                //             {/* {pick.pick} */}
                                //     </Dropdown.Toggle>

                                //         <Dropdown.Menu>
                                //             <Dropdown.Item eventKey={series.lowSeed} game={`${series.lowSeed} vs ${series.highSeed}`} id="1">{series.lowSeed}</Dropdown.Item>
                                //             <Dropdown.Item eventKey={series.highSeed} id='2'>{series.highSeed}</Dropdown.Item>
                                //         </Dropdown.Menu>
                                //     </Dropdown>
                                // </TableCell>
                                // <TableCell align="left">
                                //     <Dropdown
                                //         onSelect={handleConfidencePointsSelect}
                                //         // eventKey={pick.points}
                                //     >
                                //         <Dropdown.Toggle variant="success" id="dropdown-basic">
                                //             Points
                                //     </Dropdown.Toggle>

                                //         <Dropdown.Menu>
                                            // <Dropdown.Item eventKey={1}>1</Dropdown.Item>
                                            // <Dropdown.Item eventKey={2}>2</Dropdown.Item>
                                            // <Dropdown.Item eventKey={3}>3</Dropdown.Item>  
                                            // <Dropdown.Item eventKey={4}>4</Dropdown.Item>
                                            // <Dropdown.Item eventKey={5}>5</Dropdown.Item>
                                            // <Dropdown.Item eventKey={6}>6</Dropdown.Item>
                                            // <Dropdown.Item eventKey={7}>7</Dropdown.Item>
                                            // <Dropdown.Item eventKey={8}>8</Dropdown.Item>
                                            // <Dropdown.Item eventKey={9}>9</Dropdown.Item>
                                            // <Dropdown.Item eventKey={10}>10</Dropdown.Item>
                                //         </Dropdown.Menu>
                                //     </Dropdown>
                                // </TableCell>
                                // <TableCell align="left">
                                //     <Dropdown
                                //         onSelect={handleGamesSelect}
                                //         // eventKey={pick.games}
                                //     >
                                //         <Dropdown.Toggle variant="success" id="dropdown-basic">
                                //             # of Games
                                //     </Dropdown.Toggle>

                                //         <Dropdown.Menu>
                                //             <Dropdown.Item eventKey={1}>1</Dropdown.Item>
                                //             <Dropdown.Item eventKey={2}>2</Dropdown.Item>
                                //             <Dropdown.Item eventKey={3}>3</Dropdown.Item>
                                //             <Dropdown.Item eventKey={4}>4</Dropdown.Item>
                                //             <Dropdown.Item eventKey={5}>5</Dropdown.Item>
                                //             <Dropdown.Item eventKey={6}>6</Dropdown.Item>
                                //         </Dropdown.Menu>
                                //     </Dropdown>