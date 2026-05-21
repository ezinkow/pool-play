import React from 'react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Table from 'react-bootstrap/Table';

export default function UsersDisplay() {
    const [users, setUsers] = useState([])

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
        async function fetchUsers() {
            try {
                const response = await axios("api/nba/users/")
                setUsers(response.data.sort((a, b) => (a.name > b.name) ? 1 : -1));
            } catch (e) {
                console.log(e)
            }
        }
        fetchUsers()
    }, [])

    const tableGrid =
        users.map(name =>
            <tr>
                <>
                    <td key={name.id}>{name.name}</td>
                    <td key={name.name}>{name.paid}</td>
                </>
            </tr>
        )


    return (
        <div className='container'>
            <div className="table" style={{paddingBottom: 80}}>
                <h2>Signed Up:</h2>
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Paid?</th>
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

