import React from 'react'
import SignUp from '../../components/tourney_pickem/SignUp'
import Users from '../../components/tourney_pickem/UsersDisplay'


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