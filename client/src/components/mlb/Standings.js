import React from 'react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Table from 'react-bootstrap/Table';

export default function Standings() {
    const [standings, setStandings] = useState([])
    
    const customStyles = {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
        },
    };
    useEffect(() => {
        async function fetchStandings() {
            try {
                const response = await axios(`api/standings/`)
                const sortedList = response.data.sort( (a,b) => b.points - a.points );
                setStandings(sortedList)
            } catch (e) {
                console.log(e)
            }
        }
        fetchStandings()
    }, [])

    const tableGrid =
        standings.map(standing =>
            <tr>
                <>
                    
                    <td key={standing.rank}>{standing.rank}</td>
                    <td key={standing.name}>{standing.name}</td>
                    <td key={standing.points}>{standing.points}</td>
                </>
            </tr>
        )


    return (
        <div className='container'>
            <br></br>
            <div className="table">
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableGrid}
                    </tbody>
                </Table>

            </div>
        </div>
    )
}

