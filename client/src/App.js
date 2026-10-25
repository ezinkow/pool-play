import React, { useEffect, useState } from "react";
import './App.css';
import { HashRouter as BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import OpenPoolsCard from "./components/OpenPoolsCard"
import UserLiveStandingsCard from "./components/UserLiveStandingsCard"

// Global
import Home from './pages/Home';
import SignUp from './pages/SignUp';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChangePassword from './pages/ChangePassword';
import ForgotUsername from './pages/ForgotUsername';
import LoginPage from "./pages/LogIn";
import MyAccount from "./pages/MyAccount";
import Comments from "./pages/Comments";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Admin from "./pages/AdminDashboard";

// CFB Pickem ATS pages
import CfbPickemAtsHome from './pages/cfb_pickem_ats/Home';
import CfbPickemAtsStandings from './pages/cfb_pickem_ats/Standings';
import CfbPickemAtsPicks from './pages/cfb_pickem_ats/Picks';
import CfbPickemAtsMyPicks from './pages/cfb_pickem_ats/MyPicks';
import CfbPickemAtsGroupPicks from './pages/cfb_pickem_ats/GroupPicks';

// CFB Bowl Confidence Pickem pages
import BowlConfidenceHome from './pages/cfb_bowl_confidence_pickem/Home';
import BowlConfidenceStandings from './pages/cfb_bowl_confidence_pickem/Standings';
import BowlConfidencePicks from './pages/cfb_bowl_confidence_pickem/Picks';
import BowlConfidenceMyPicks from './pages/cfb_bowl_confidence_pickem/MyPicks';
import BowlConfidenceGroupPicks from './pages/cfb_bowl_confidence_pickem/GroupPicks';

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

// NBA Playoffs pages
import NbaHome from './pages/nba_playoffs/Home';
import NbaPicks from './pages/nba_playoffs/Picks';
import NbaMyPicks from './pages/nba_playoffs/MyPicks';
import NbaStandings from './pages/nba_playoffs/Standings';
import NbaGroupPicks from './pages/nba_playoffs/GroupPicks';
import NbaSignUp from './pages/nba_playoffs/SignUp';
import NbaAdminRefresh from './pages/nba_playoffs/AdminRefresh';

// NBA Survivor pages
import NbaSurvivorHome from './pages/nba_survivor/Home';
import NbaSurvivorPicks from './pages/nba_survivor/Picks';
import NbaSurvivorMyPicks from './pages/nba_survivor/MyPicks';
import NbaSurvivorGroupPicks from './pages/nba_survivor/GroupsPicks';

// NCAAB Pickem ATS pages
import NcaabPickemAtsHome from './pages/ncaab_pickem_ats/Home';
import NcaabPickemAtsStandings from './pages/ncaab_pickem_ats/Standings';
import NcaabPickemAtsPicks from './pages/ncaab_pickem_ats/Picks';
import NcaabPickemAtsMyPicks from './pages/ncaab_pickem_ats/MyPicks';
import NcaabPickemAtsGroupPicks from './pages/ncaab_pickem_ats/GroupPicks';

// MLB Playoffs pages
import MlbPlayoffsHome from './pages/mlb_playoffs/Home';
import MlbPlayoffsPicks from './pages/mlb_playoffs/Picks';
import MlbPlayoffsMyPicks from './pages/mlb_playoffs/MyPicks';
import MlbPlayoffsGroupPicks from './pages/mlb_playoffs/GroupPicks';
import MlbPlayoffsStandings from './pages/mlb_playoffs/Standings';

// NFL BTS pages
import NflBtsHome from './pages/nfl_bts/Home';
import NflBtsStandings from './pages/nfl_bts/Standings';
import NflBtsPicks from './pages/nfl_bts/Picks';
import NflBtsMyPicks from './pages/nfl_bts/MyPicks';

// NFL Pickem ATS pages
import NflPickemAtsHome from './pages/nfl_pickem_ats/Home';
import NflPickemAtsStandings from './pages/nfl_pickem_ats/Standings';
import NflPickemAtsPicks from './pages/nfl_pickem_ats/Picks';
import NflPickemAtsMyPicks from './pages/nfl_pickem_ats/MyPicks';
import NflPickemAtsGroupPicks from './pages/nfl_pickem_ats/GroupPicks';
import NflBtsGroupPicks from './pages/nfl_bts/GroupPicks';

// NFL Playoffs DFS pages
import NflDfsHome from './pages/nfl_playoffs_dfs/Home';
import NflDfsScoreboard from './pages/nfl_playoffs_dfs/Scoreboard';
import NflDfsStandings from './pages/nfl_playoffs_dfs/Standings';
import NflDfsRosterPicks from './pages/nfl_playoffs_dfs/RosterPicks';
import NflDfsMyRoster from './pages/nfl_playoffs_dfs/MyRoster';
import NflDfsPlayerPoolsTable from './pages/nfl_playoffs_dfs/PlayerStats';

// NFL Playoffs Pick Three pages
import NflPickThreeHome from './pages/nfl_playoffs_pick_three/Home';
import NflPickThreeScoreboard from './pages/nfl_playoffs_pick_three/Scoreboard';
import NflPickThreeStandings from './pages/nfl_playoffs_pick_three/Standings';
import NflPickThreePicks from './pages/nfl_playoffs_pick_three/Picks';
import NflPickThreeMyPicks from './pages/nfl_playoffs_pick_three/MyPicks';
import NflPickThreeGroupPicks from './pages/nfl_playoffs_pick_three/GroupPicks';
import NflPickThreePlayerPoolsTable from './pages/nfl_playoffs_pick_three/PlayerStats';

// NFL Survivor pages
import NflSurvivorHome from './pages/nfl_survivor/Home';
import NflSurvivorPicks from './pages/nfl_survivor/Picks';
import NflSurvivorMyPicks from './pages/nfl_survivor/MyPicks';
import NflSurvivorGroupPicks from './pages/nfl_survivor/GroupsPicks';

// NFL 2nd Chance Survivor pages
import NflSurvivorSecondChanceHome from './pages/nfl_survivor_secondchance/Home';
import NflSurvivorSecondChancePicks from './pages/nfl_survivor_secondchance/Picks';
import NflSurvivorSecondChanceMyPicks from './pages/nfl_survivor_secondchance/MyPicks';
import NflSurvivorSecondChanceGroupPicks from './pages/nfl_survivor_secondchance/GroupsPicks';

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

function MainLayout({ isDarkMode }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className={`main-layout-shell${isHome ? " main-layout-shell--home" : " main-layout-shell--pool"}`}>
      <div className="home-layout-grid">
        <div className="home-sidebar-col mobile-open-pools-banner">
          <OpenPoolsCard isDarkMode={isDarkMode} />
        </div>
        <div className="home-main-col">
          <Outlet context={{ isDarkMode }} />
        </div>
        <aside className={`home-right-col${isHome ? "" : " home-right-col--mobile-hidden"}`}>
          <UserLiveStandingsCard isDarkMode={isDarkMode} />
        </aside>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  // Explicitly default to dark mode unless explicitly set to "light" in localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("poolplay_theme");
    return savedTheme !== "light"; // Defaults to true (dark mode) on first load
  });

  useEffect(() => {
    const container = document.getElementById('root-app-container');
    if (container) {
      if (isDarkMode) {
        container.classList.add("dark-mode");
      } else {
        container.classList.remove("dark-mode");
      }
    }
    localStorage.setItem("poolplay_theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div id="root-app-container" className="app-container">
        <Navbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <Routes>
          {/* --- GROUP 1: Pages wrapped inside MainLayout --- */}
          <Route element={<MainLayout isDarkMode={isDarkMode} />}>
            <Route path="/" element={<div className="home-content"><Home /></div>} />

            <Route path="/signup" element={<SignUp />} />
            <Route path="/admin" element={<Admin />} />

            {/* CFB Pickem ATS */}
            <Route path="/cfbpickemats" element={<CfbPickemAtsHome />} />
            <Route path="/cfbpickemats/picks" element={<CfbPickemAtsPicks />} />
            <Route path="/cfbpickemats/mypicks" element={<CfbPickemAtsMyPicks />} />
            <Route path="/cfbpickemats/standings" element={<CfbPickemAtsStandings />} />
            <Route path="/cfbpickemats/grouppicks" element={<CfbPickemAtsGroupPicks />} />

            {/* CFB Bowl Confidence Pickem */}
            <Route path="/bowlpickem" element={<BowlConfidenceHome />} />
            <Route path="/bowlpickem/picks" element={<BowlConfidencePicks />} />
            <Route path="/bowlpickem/mypicks" element={<BowlConfidenceMyPicks />} />
            <Route path="/bowlpickem/standings" element={<BowlConfidenceStandings />} />
            <Route path="/bowlpickem/grouppicks" element={<BowlConfidenceGroupPicks />} />

            {/* Champ Week Pickem */}
            <Route path="/champweekpickem" element={<ChampWeekPickemHome />} />
            <Route path="/champweekpickem/signup" element={<ChampWeekPickemSignUp />} />
            <Route path="/champweekpickem/picks" element={<ChampWeekPickemPicks />} />
            <Route path="/champweekpickem/mypicks" element={<ChampWeekPickemMyPicks />} />
            <Route path="/champweekpickem/scoreboard" element={<ChampWeekPickemScoreboard />} />
            <Route path="/champweekpickem/picksdisplay" element={<ChampWeekPickemUserPicksDisplay />} />
            <Route path="/champweekpickem/standings" element={<ChampWeekPickemStandings />} />
            <Route path="/champweekpickem/adminrefresh" element={<ChampWeekPickemAdminRefresh />} />

            {/* Home Run Derby */}
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

            {/* MLB Playoffs */}
            <Route path="/mlbplayoffs" element={<MlbPlayoffsHome />} />
            <Route path="/mlbplayoffs/picks" element={<MlbPlayoffsPicks />} />
            <Route path="/mlbplayoffs/mypicks" element={<MlbPlayoffsMyPicks />} />
            <Route path="/mlbplayoffs/grouppicks" element={<MlbPlayoffsGroupPicks />} />
            <Route path="/mlbplayoffs/standings" element={<MlbPlayoffsStandings />} />

            {/* NBA Playoffs */}
            <Route path="/nbaplayoffs" element={<NbaHome />} />
            <Route path="/nbaplayoffs/picks" element={<NbaPicks />} />
            <Route path="/nbaplayoffs/mypicks" element={<NbaMyPicks />} />
            <Route path="/nbaplayoffs/standings" element={<NbaStandings />} />
            <Route path="/nbaplayoffs/grouppicks" element={<NbaGroupPicks />} />
            <Route path="/nbaplayoffs/signup" element={<NbaSignUp />} />
            <Route path="/nbaplayoffs/adminrefresh" element={<NbaAdminRefresh />} />

            {/* NBA Survivor */}
            <Route path="/nbasurvivor" element={<NbaSurvivorHome />} />
            <Route path="/nbasurvivor/picks" element={<NbaSurvivorPicks />} />
            <Route path="/nbasurvivor/mypicks" element={<NbaSurvivorMyPicks />} />
            <Route path="/nbasurvivor/grouppicks" element={<NbaSurvivorGroupPicks />} />

            {/* NCAAB Pickem ATS */}
            <Route path="/ncaabpickemats" element={<NcaabPickemAtsHome />} />
            <Route path="/ncaabpickemats/picks" element={<NcaabPickemAtsPicks />} />
            <Route path="/ncaabpickemats/mypicks" element={<NcaabPickemAtsMyPicks />} />
            <Route path="/ncaabpickemats/standings" element={<NcaabPickemAtsStandings />} />
            <Route path="/ncaabpickemats/grouppicks" element={<NcaabPickemAtsGroupPicks />} />

            {/* NFL BTS */}
            <Route path="/nflbts" element={<NflBtsHome />} />
            <Route path="/nflbts/picks" element={<NflBtsPicks />} />
            <Route path="/nflbts/mypicks" element={<NflBtsMyPicks />} />
            <Route path="/nflbts/standings" element={<NflBtsStandings />} />
            <Route path="/nflbts/grouppicks" element={<NflBtsGroupPicks />} />

            {/* NFL Pickem ATS */}
            <Route path="/nflpickemats" element={<NflPickemAtsHome />} />
            <Route path="/nflpickemats/picks" element={<NflPickemAtsPicks />} />
            <Route path="/nflpickemats/mypicks" element={<NflPickemAtsMyPicks />} />
            <Route path="/nflpickemats/standings" element={<NflPickemAtsStandings />} />
            <Route path="/nflpickemats/grouppicks" element={<NflPickemAtsGroupPicks />} />

            {/* NFL Playoffs DFS */}
            <Route path="/nflplayoffsdfs" element={<NflDfsHome />} />
            <Route path="/nflplayoffsdfs/rosterpicks" element={<NflDfsRosterPicks />} />
            <Route path="/nflplayoffsdfs/scoreboard" element={<NflDfsScoreboard />} />
            <Route path="/nflplayoffsdfs/myroster" element={<NflDfsMyRoster />} />
            <Route path="/nflplayoffsdfs/standings" element={<NflDfsStandings />} />
            <Route path="/nflplayoffsdfs/playerstats" element={<NflDfsPlayerPoolsTable />} />

            {/* NFL Playoffs Pick Three */}
            <Route path="/nflplayoffspickthree" element={<NflPickThreeHome />} />
            <Route path="/nflplayoffspickthree/picks" element={<NflPickThreePicks />} />
            <Route path="/nflplayoffspickthree/mypicks" element={<NflPickThreeMyPicks />} />
            <Route path="/nflplayoffspickthree/grouppicks" element={<NflPickThreeGroupPicks />} />
            <Route path="/nflplayoffspickthree/scoreboard" element={<NflPickThreeScoreboard />} />
            <Route path="/nflplayoffspickthree/standings" element={<NflPickThreeStandings />} />
            <Route path="/nflplayoffspickthree/playerstats" element={<NflPickThreePlayerPoolsTable />} />

            {/* NFL Survivor */}
            <Route path="/nflsurvivor" element={<NflSurvivorHome />} />
            <Route path="/nflsurvivor/picks" element={<NflSurvivorPicks />} />
            <Route path="/nflsurvivor/mypicks" element={<NflSurvivorMyPicks />} />
            <Route path="/nflsurvivor/grouppicks" element={<NflSurvivorGroupPicks />} />

            {/* NFL 2nd Chance Survivor */}
            <Route path="/nflsurvivor_secondchance" element={<NflSurvivorSecondChanceHome />} />
            <Route path="/nflsurvivor_secondchance/picks" element={<NflSurvivorSecondChancePicks />} />
            <Route path="/nflsurvivor_secondchance/mypicks" element={<NflSurvivorSecondChanceMyPicks />} />
            <Route path="/nflsurvivor_secondchance/grouppicks" element={<NflSurvivorSecondChanceGroupPicks />} />

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
          </Route>

          {/* --- GROUP 2: Standalone / Full-Screen Routes OUTSIDE MainLayout --- */}
          <Route path="/changepassword" element={<ChangePassword />} />
          <Route path="/forgotusername" element={<ForgotUsername />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/myaccount" element={<MyAccount />} />
          <Route path="/contact" element={<Comments />} />
          <Route path="/help" element={<Help />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}