import React from 'react';
import './App.css';
import { HashRouter as Router, Routes, Route } from "react-router-dom";

// Shared
import Home from './pages/Home';
import SignUp from './pages/SignUp';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChangePassword from './pages/ChangePassword';
import LoginPage from "./pages/LogIn";
import MyAccount from "./pages/MyAccount";
import Comments from "./pages/Comments";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// CFB Pickem ATS pages
import CfbPickemAtsHome from './pages/cfb_pickem_ats/Home';
import CfbPickemAtsStandings from './pages/cfb_pickem_ats/Standings';
import CfbPickemAtsPicks from './pages/cfb_pickem_ats/Picks';
import CfbPickemAtsMyPicks from './pages/cfb_pickem_ats/MyPicks';
import CfbPickemAtsGroupPicks from './pages/cfb_pickem_ats/GroupPicks';

// ChampWeekPickem pages
import ChampWeekPickemHome from './pages/champweek_pickem/Home';
import ChampWeekPickemPicks from './pages/champweek_pickem/Picks';
import ChampWeekPickemMyPicks from './pages/champweek_pickem/MyPicks';
import ChampWeekPickemStandings from './pages/champweek_pickem/Standings';
import ChampWeekPickemScoreboard from './pages/champweek_pickem/Scoreboard';
import ChampWeekPickemUserPicksDisplay from './pages/champweek_pickem/UserPicksDisplay';
import ChampWeekPickemSignUp from './pages/champweek_pickem/SignUp';
import ChampWeekPickemAdminRefresh from './pages/champweek_pickem/AdminRefresh';

// Home Run Derby pages
import HomeRunDerbyHome from './pages/home_run_derby/Home';
import HomeRunDerbyStandings from './pages/home_run_derby/Standings';
import HomeRunDerbyPicks from './pages/home_run_derby/Picks';
// import HomeRunDerbyMyPicks from './pages/home_run_derby/MyPicks';
import ViewAllTeams from './pages/home_run_derby/ViewAllTeams';

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
import NbaAdminRefresh from './pages/nba/AdminRefresh';

// MLB Pages
import MlbHome from './pages/mlb/Home';
import MlbPicks from './pages/mlb/Picks';
import MlbPicksDisplay from './pages/mlb/GroupPicks';
import MlbStandings from './pages/mlb/Standings';
import MlbSignUp from './pages/mlb/SignUp';

// NFL Playoffs pages
import NflHome from './pages/nfl_playoffs/Home';
import NflScoreboard from './pages/nfl_playoffs/Scoreboard';
import NflStandings from './pages/nfl_playoffs/Standings';
import NflRosterPicks from './pages/nfl_playoffs/RosterPicks';
import NflMyRoster from './pages/nfl_playoffs/MyRoster';
import NflSignUp from './pages/nfl_playoffs/SignUp';
import NflPlayerPoolsTable from './pages/nfl_playoffs/PlayerStats';

// NFL Pickem ATS pages
import NflPickemAtsHome from './pages/nfl_pickem_ats/Home';
import NflPickemAtsStandings from './pages/nfl_pickem_ats/Standings';
import NflPickemAtsPicks from './pages/nfl_pickem_ats/Picks';
import NflPickemAtsMyPicks from './pages/nfl_pickem_ats/MyPicks';
import NflPickemAtsGroupPicks from './pages/nfl_pickem_ats/GroupPicks';

// NFL BTS pages
import NflBtsHome from './pages/nfl_bts/Home';
import NflBtsStandings from './pages/nfl_bts/Standings';
import NflBtsPicks from './pages/nfl_bts/Picks';
import NflBtsGroupPicks from './pages/nfl_bts/GroupPicks';
import AdminTeamAssignment from './pages/nfl_bts/AdminTeamAssignment';

// NFL Survivor pages
import NflSurvivorHome from './pages/nfl_survivor/Home';
import NflSurvivorPicks from './pages/nfl_survivor/Picks';
import NflSurvivorMyPicks from './pages/nfl_survivor/MyPicks';
import NflSurvivorGroupPicks from './pages/nfl_survivor/GroupsPicks';

// Super Bowl Squares pages
import SuperBowlSquaresGrid from "./pages/superbowl_squares/Grid";
import SuperBowlSquaresResults from "./pages/superbowl_squares/Results";
import SuperBowlSquaresSignUp from "./pages/superbowl_squares/SignUp";
import SuperBowlSquaresNumbers from "./pages/superbowl_squares/SquaresNumbers";
import SuperBowlSquaresHome from "./pages/superbowl_squares/Home";
import SuperBowlSquaresAdmin from "./pages/superbowl_squares/Admin";

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
      <main className="page-content">
        <Routes>
          {/* Landing + shared account creation */}
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/changepassword" element={<ChangePassword />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/myaccount" element={<MyAccount />} />
          <Route path="/contact" element={<Comments />} />
          <Route path="/help" element={<Help />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />

          {/* CFB Pickem ATS*/}
          <Route path="/cfbpickemats" element={<CfbPickemAtsHome />} />
          <Route path="/cfbpickemats/picks" element={<CfbPickemAtsPicks />} />
          <Route path="/cfbpickemats/mypicks" element={<CfbPickemAtsMyPicks />} />
          <Route path="/cfbpickemats/standings" element={<CfbPickemAtsStandings />} />
          <Route path="/cfbpickemats/grouppicks" element={<CfbPickemAtsGroupPicks />} />

          {/* Champ Week Pickem */}
          <Route path="/champweekpickem/" element={<ChampWeekPickemHome />} />
          <Route path="/champweekpickem/signup" element={<ChampWeekPickemSignUp />} />
          <Route path="/champweekpickem/picks" element={<ChampWeekPickemPicks />} />
          <Route path="/champweekpickem/mypicks" element={<ChampWeekPickemMyPicks />} />
          <Route path="/champweekpickem/scoreboard" element={<ChampWeekPickemScoreboard />} />
          <Route path="/champweekpickem/picksdisplay" element={<ChampWeekPickemUserPicksDisplay />} />
          <Route path="/champweekpickem/standings" element={<ChampWeekPickemStandings />} />
          <Route path="/champweekpickem/adminrefresh" element={<ChampWeekPickemAdminRefresh />} />

          {/* Home Run Derby*/}
          <Route path="/hrd" element={<HomeRunDerbyHome />} />
          <Route path="/hrd/picks" element={<HomeRunDerbyPicks />} />
          <Route path="/hrd/standings" element={<HomeRunDerbyStandings />} />
          <Route path="/hrd/allteams" element={<ViewAllTeams />} />

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

          {/* MLB */}
          <Route path="/mlb" element={<MlbHome />} />
          <Route path="/mlb/signup" element={<MlbSignUp />} />
          <Route path="/mlb/picks" element={<MlbPicks />} />
          <Route path="/mlb/picksdisplay" element={<MlbPicksDisplay />} />
          <Route path="/mlb/standings" element={<MlbStandings />} />

          {/* NBA */}
          <Route path="/nba" element={<NbaHome />} />
          <Route path="/nba/picks" element={<NbaPicks />} />
          <Route path="/nba/mypicks" element={<NbaMyPicks />} />
          <Route path="/nba/standings" element={<NbaStandings />} />
          <Route path="/nba/grouppicks" element={<NbaGroupPicks />} />
          <Route path="/nba/signup" element={<NbaSignUp />} />
          <Route path="/nba/adminrefresh" element={<NbaAdminRefresh />} />

          {/* NFL Playoffs*/}
          <Route path="/nfl" element={<NflHome />} />
          <Route path="/nfl/signup" element={<NflSignUp />} />
          <Route path="/nfl/rosterpicks" element={<NflRosterPicks />} />
          <Route path="/nfl/scoreboard" element={<NflScoreboard />} />
          <Route path="/nfl/myroster" element={<NflMyRoster />} />
          <Route path="/nfl/standings" element={<NflStandings />} />
          <Route path="/nfl/playerstats" element={<NflPlayerPoolsTable />} />

          {/* NFL Pickem ATS*/}
          <Route path="/nflpickemats" element={<NflPickemAtsHome />} />
          <Route path="/nflpickemats/picks" element={<NflPickemAtsPicks />} />
          <Route path="/nflpickemats/mypicks" element={<NflPickemAtsMyPicks />} />
          <Route path="/nflpickemats/standings" element={<NflPickemAtsStandings />} />
          <Route path="/nflpickemats/grouppicks" element={<NflPickemAtsGroupPicks />} />

          {/* NFL BTS*/}
          <Route path="/nflbts" element={<NflBtsHome />} />
          <Route path="/nflbts/picks" element={<NflBtsPicks />} />
          <Route path="/nflbts/standings" element={<NflBtsStandings />} />
          <Route path="/nflbts/grouppicks" element={<NflBtsGroupPicks />} />
          <Route path="/nflbts/admin/teamassignments" element={<AdminTeamAssignment />} />

          {/* NFL Survivor*/}
          <Route path="/nflsurvivor" element={<NflSurvivorHome />} />
          <Route path="/nflsurvivor/picks" element={<NflSurvivorPicks />} />
          <Route path="/nflsurvivor/mypicks" element={<NflSurvivorMyPicks />} />
          <Route path="/nflsurvivor/grouppicks" element={<NflSurvivorGroupPicks />} />

          {/* Super Bowl Squares */}
          <Route path="/superbowlsquares" element={<SuperBowlSquaresHome />} />
          <Route path="/superbowlsquares/grid" element={<SuperBowlSquaresGrid />} />
          <Route path="/superbowlsquares/results" element={<SuperBowlSquaresResults />} />
          <Route path="/superbowlsquares/signup" element={<SuperBowlSquaresSignUp />} />
          <Route path="/superbowlsquares/numbers" element={<SuperBowlSquaresNumbers />} />
          <Route path="/superbowlsquares/admin" element={<SuperBowlSquaresAdmin />} />

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
      </main>
      <Footer />
    </Router >
  );
}