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
                const response = await axios("api/auth/users/")
                setUsers(response.data.sort((a, b) => (a.name > b.name) ? 1 : -1));
            } catch (e) {
                console.log(e)
            }
        }
        fetchUsers()
    }, [])

    return (
        <div className='container'>
            <div className="table" style={{ paddingBottom: 80 }}>
            </div>
        </div>
    )
}

