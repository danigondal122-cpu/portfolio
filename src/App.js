import logo from './logo.svg';
import './App.css';
import './styles/utils.css'
import Navbar from './components/navbar';
import Intro from './pages/intro';
import Stats from './components/portfolio_stats';
import Services from './pages/services';
import TechStack from './pages/TechStack';
import Experience from './pages/Experience';
import Contact from './pages/ContactMe';
import FooterHeader from './components/Footer';

function App() {

  
  return (
    <div className="App">
      <Navbar/>
      <Intro/>
      <Stats/>
      <Services/>
      <TechStack/>
      <Experience/>
      <Contact/>
      <FooterHeader/>
     
    </div>
  );
}

export default App;
