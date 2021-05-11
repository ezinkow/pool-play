import { useState } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import Paper from '@material-ui/core/Paper'
import moment from 'moment'
import { baseballWeekly } from '../data/baseballWeekly'
import Button from '@material-ui/core/Button'
import axios from 'axios'
import TextField from '@material-ui/core/TextField';

const useStyles = makeStyles((theme) => ({
  table: {
    maxWidth: 1000
  },
  root: {
    '& > *': {
      margin: theme.spacing(1),
      width: '25ch',
    }
  }
}));

export default function BaseballWeekly() {
  const classes = useStyles()
  const [picks, setPicks] = useState([])
  const [name, setName] = useState("")
  // const [radioButtons, setRadioButtons] = useState([])

  function handleChange(event) {
    const { id, value, className } = event.target
    const game = event.target.attributes[5].value
    console.log(id, value, className, game)
    if (picks.find(findClass => findClass.className === className) !== undefined) {
      const foundObj = picks.find((findClass => findClass.className === className))
      console.log(foundObj)
      const i = picks.indexOf(foundObj)
      picks[i] = { id, value, className }
      console.log('picks', picks)
    } else {
      const newArray = picks
      newArray.push({ game, id, value, className })
      setPicks(newArray)
      console.log('picks', picks, name)
    }
  }

  const handleNameChange = event => {
    setName(event.target.value);
  };

  function handleSubmit(event) {
    event.preventDefault()
    axios.post('/api/baseballweekly', {
      name: name,
      picks: picks
    })
    setName("")
    setPicks([])
    
  }

  const tomorrow = moment().add(1, 'days').format('dddd')
  const tmrwDate = moment().add(1, 'days').format("MMMM Do YYYY")

  return (
    <form>
      <TableContainer component={Paper} className="baseballForm">
        <TextField
          value={name}
          onChange={handleNameChange}
          required id="name"
          label="Name"
          placeholder="Required" />
        <Table size="small" aria-label="a dense table" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell align="center">{tomorrow}, {tmrwDate}</TableCell>
              <TableCell align="right"></TableCell>
              <TableCell align="right">No pick</TableCell>
              <TableCell align="right">Time(ET)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {baseballWeekly.map((game) => (
              < TableRow key={game.id} >
                <TableCell align="right">
                  <input type="radio" id={`${game.id}a`} className={game.id} name={`${game.id}radio`} value={game.away} opponent={game.home} game={`${game.away} at ${game.home}`} onChange={handleChange} />
                  <label htmlFor={`${game.id}a`}>{game.away} ({game.line})</label>
                </TableCell>
                <TableCell align="center">@</TableCell>
                <TableCell align="left">
                  <label htmlFor={`${game.id}h`}>{game.home} ({game.line})</label>
                  <input type="radio" id={`${game.id}h`} className={game.id} name={`${game.id}radio`} value={game.home} opponent={game.away} game={`${game.away} at ${game.home}`} onChange={handleChange} />
                </TableCell>
                <TableCell align="left">
                  <label htmlFor={`${game.id}n`}>No Pick</label>
                  <input type="radio" id={`${game.id}n`} className={game.id} name={`${game.id}radio`} value="No pick" onChange={handleChange} />
                </TableCell>
                <TableCell align="right">{game.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer >
      <Button variant="contained" onClick={handleSubmit}>Submit</Button>
    </form>
  )
}
