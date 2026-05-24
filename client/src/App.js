import React from 'react';
import './App.css';
import { HashRouter as Router, Routes, Route } from "react-router-dom";

// Shared
import Home from './pages/Home';
import SignUp from './pages/SignUp';
import Navbar from './components/Navbar';
import ChangePassword from './pages/ChangePassword';
import LoginPage from "./pages/LogIn";
import MyAccount from "./pages/MyAccount";
import Comments from "./pages/Comments";

// ChampWeekPickem pages
import ChampWeekPickemHome from './pages/champweek_pickem/Home';
import ChampWeekPickemPicks from './pages/champweek_pickem/Picks';
import ChampWeekPickemMyPicks from './pages/champweek_pickem/MyPicks';
import ChampWeekPickemStandings from './pages/champweek_pickem/Standings';
import ChampWeekPickemScoreboard from './pages/champweek_pickem/Scoreboard';
import ChampWeekPickemUserPicksDisplay from './pages/champweek_pickem/UserPicksDisplay';
import ChampWeekPickemSignUp from './pages/champweek_pickem/SignUp';
import ChampWeekPickemAdminRefresh from './pages/champweek_pickem/AdminRefresh';

// TourneyPickem pages
import TourneyPickemHome from './pages/tourney_pickem/Home';
import TourneyPickemPicks from './pages/tourney_pickem/Picks';
import TourneyPickemMyPicks from './pages/tourney_pickem/MyPicks';
import TourneyPickemStandings from './pages/tourney_pickem/Standings';
import TourneyPickemScoreboard from './pages/tourney_pickem/Scoreboard';
import TourneyPickemUserPicksDisplay from './pages/tourney_pickem/UserPicksDisplay';
import TourneyPickemSignUp from './pages/tourney_pickem/SignUp';
import TourneyPickemAdminRefresh from './pages/tourney_pickem/AdminRefresh';

// TourneySquares pages
import TourneySquaresGrid from "./pages/tourney_squares/Grid";
import TourneySquaresResults from "./pages/tourney_squares/Results";
import TourneySquaresSignUp from "./pages/tourney_squares/SignUp";
import TourneySquaresNumbers from "./pages/tourney_squares/SquaresNumbers";
import TourneySquaresHome from "./pages/tourney_squares/Home";
import TourneySquaresAdmin from "./pages/tourney_squares/Admin";

// Bracket pages
import BracketHome from './pages/bracket/Home';
import BracketChallenge from './pages/bracket/Bracket';
import BracketMyBracket from './pages/bracket/MyBracket';
import BracketStandings from './pages/bracket/Standings';
import BracketSignUp from './pages/bracket/SignUp';

// NBA pages
import NbaHome from './pages/nba/Home';
import NbaPicks from './pages/nba/Picks';
import NbaMyPicks from './pages/nba/MyPicks';
import NbaStandings from './pages/nba/Standings';
import NbaGroupPicks from './pages/nba/GroupPicks';
import NbaSignUp from './pages/nba/SignUp';       // ← pool entry, not account creation

// NFL pages
import NflHome from './pages/nfl/Home';
import NflScoreboard from './pages/nfl/Scoreboard';
import NflStandings from './pages/nfl/Standings';
import NflRosterPicks from './pages/nfl/RosterPicks';
import NflMyRoster from './pages/nfl/MyRoster';
import NflSignUp from './pages/nfl/SignUp';
import NflPlayerPoolsTable from './pages/nfl/PlayerStats';

// Olympics pages
import OlympicsHome from './pages/olympics/Home';
import OlympicsScoreboard from './pages/olympics/Scoreboard';
import OlympicsStandings from './pages/olympics/Standings';
import OlympicsCountryPicks from './pages/olympics/CountryPicks';
import OlympicsSignUp from './pages/olympics/SignUp';
import OlympicsMedalTable from './pages/olympics/MedalTable';
import OlympicsMyRoster from './pages/olympics/MyRoster';

// World Cup pages
import WorldCupHome from './pages/world_cup/Home';
import WorldCupMyPicks from './pages/world_cup/MyPicks';
import WorldCupPicks from './pages/world_cup/Picks';
import WorldCupScoreboard from './pages/world_cup/Scoreboard';
import WorldCupSignUp from './pages/world_cup/SignUp';
import WorldCupStandings from './pages/world_cup/Standings';
import WorldCupGroupPicks from './pages/world_cup/GroupPicks';

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Landing + shared account creation */}
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/changepassword" element={<ChangePassword />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/myaccount" element={<MyAccount />} />
        <Route path="/comments" element={<Comments />} />

        {/* Champ Week Pickem */}
        <Route path="/champweekpickem/" element={<ChampWeekPickemHome />} />
        <Route path="/champweekpickem/signup" element={<ChampWeekPickemSignUp />} />
        <Route path="/champweekpickem/picks" element={<ChampWeekPickemPicks />} />
        <Route path="/champweekpickem/mypicks" element={<ChampWeekPickemMyPicks />} />
        <Route path="/champweekpickem/scoreboard" element={<ChampWeekPickemScoreboard />} />
        <Route path="/champweekpickem/picksdisplay" element={<ChampWeekPickemUserPicksDisplay />} />
        <Route path="/champweekpickem/standings" element={<ChampWeekPickemStandings />} />
        <Route path="/champweekpickem/adminrefresh" element={<ChampWeekPickemAdminRefresh />} />

        {/* Tourney Pickem */}
        <Route path="/tourneypickem" element={<TourneyPickemHome />} />
        <Route path="/tourneypickem/picks" element={<TourneyPickemPicks />} />
        <Route path="/tourneypickem/mypicks" element={<TourneyPickemMyPicks />} />
        <Route path="/tourneypickem/standings" element={<TourneyPickemStandings />} />
        <Route path="/tourneypickem/scoreboard" element={<TourneyPickemScoreboard />} />
        <Route path="/tourneypickem/picksdisplay" element={<TourneyPickemUserPicksDisplay />} />
        <Route path="/tourneypickem/signup" element={<TourneyPickemSignUp />} />
        <Route path="/tourneypickem/adminrefresh" element={<TourneyPickemAdminRefresh />} />

        {/* Tourney Bracket */}
        <Route path="/bracket" element={<BracketHome />} />
        <Route path="/bracket/bracket" element={<BracketChallenge />} />
        <Route path="/bracket/mybracket" element={<BracketMyBracket />} />
        <Route path="/bracket/standings" element={<BracketStandings />} />
        <Route path="/bracket/signup" element={<BracketSignUp />} />

        {/* Tourney Squares */}
        <Route path="/tourneysquares" element={<TourneySquaresHome />} />
        <Route path="/tourneysquares/grid" element={<TourneySquaresGrid />} />
        <Route path="/tourneysquares/results" element={<TourneySquaresResults />} />
        <Route path="/tourneysquares/signup" element={<TourneySquaresSignUp />} />
        <Route path="/tourneysquares/numbers" element={<TourneySquaresNumbers />} />
        <Route path="/tourneysquares/admin" element={<TourneySquaresAdmin />} />

        {/* NBA */}
        <Route path="/nba" element={<NbaHome />} />
        <Route path="/nba/picks" element={<NbaPicks />} />
        <Route path="/nba/mypicks" element={<NbaMyPicks />} />
        <Route path="/nba/standings" element={<NbaStandings />} />
        <Route path="/nba/grouppicks" element={<NbaGroupPicks />} />
        <Route path="/nba/signup" element={<NbaSignUp />} />

        {/* NFL */}
        <Route path="/nfl" element={<NflHome />} />
        <Route path="/nfl/signup" element={<NflSignUp />} />
        <Route path="/nfl/rosterpicks" element={<NflRosterPicks />} />
        <Route path="/nfl/scoreboard" element={<NflScoreboard />} />
        <Route path="/nfl/myroster" element={<NflMyRoster />} />
        <Route path="/nfl/standings" element={<NflStandings />} />
        <Route path="/nfl/playerstats" element={<NflPlayerPoolsTable />} />

        {/* Olympics */}
        <Route path="/olympics" element={<OlympicsHome />} />
        <Route path="/olympics/signup" element={<OlympicsSignUp />} />
        <Route path="/olympics/countrypicks" element={<OlympicsCountryPicks />} />
        <Route path="/olympics/scoreboard" element={<OlympicsScoreboard />} />
        <Route path="/olympics/standings" element={<OlympicsStandings />} />
        <Route path="/olympics/medaltable" element={<OlympicsMedalTable />} />
        <Route path="/olympics/myroster" element={<OlympicsMyRoster />} />

        {/* World Cup */}
        <Route path="/worldcup" element={<WorldCupHome />} />
        <Route path="/worldcup/signup" element={<WorldCupSignUp />} />
        <Route path="/worldcup/picks" element={<WorldCupPicks />} />
        <Route path="/worldcup/grouppicks" element={<WorldCupGroupPicks />} />
        <Route path="/worldcup/scoreboard" element={<WorldCupScoreboard />} />
        <Route path="/worldcup/mypicks" element={<WorldCupMyPicks />} />
        <Route path="/worldcup/standings" element={<WorldCupStandings />} />
        {/* <Route path="/worldcup/" element={<WorldCupCountryPoolsTable />} /> */}

      </Routes>
    </Router>
  );
}