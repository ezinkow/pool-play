import React from 'react'
import SignUp from '../../components/nba/SignUp'
import Users from '../../components/nba/UsersDisplay'


export default function UserSignUp() {


    return (
        <div>
            <div className='container page-content'>
                <SignUp />
              </div>
              <Users />
        </div>
    )
}