import { Link } from 'react-router-dom'

export default function Games() {




    return (
        <>
            <Link to='/baseballweekly'>
                <button>Baseball weekly pick em</button>
            </Link>
            <Link to='/nbaplayoffs21'>
                <button>NBA Playoffs 2021</button>
            </Link>
        </>
    )
}