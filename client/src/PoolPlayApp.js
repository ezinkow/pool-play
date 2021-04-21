import React from 'react'
import './App.css';
import Header from './components/Header'
import Games from './components/Games'
import BaseballWeekly from './components/BaseballWeekly'
import BaseballWeeklyPicks from './components/BaseballWeeklyPicks'
import Card from './components/Card'
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";



function App() {
  return (
    <div>
      <Router>
        <div className="App">
          <Header />
        </div>
        <div className="container">
          <Switch>
            <Route path="/baseballweekly">
              <BaseballWeekly />
            </Route>
            <Route path="/baseballweeklypicks">
              <BaseballWeeklyPicks />
            </Route>
            <Route path="/">
              <Games />
            </Route>
          </Switch>
        </div>
      </Router>
    </div>
  );
}

export default App;
