import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage.js';
import { LobbyPage } from './pages/LobbyPage.js';
import { GamePage } from './pages/GamePage.js';
import { LocalSetupPage } from './pages/LocalSetupPage.js';
import { LocalGamePage } from './pages/LocalGamePage.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lobby/:code" element={<LobbyPage />} />
      <Route path="/game/:id" element={<GamePage />} />
      <Route path="/local/setup" element={<LocalSetupPage />} />
      <Route path="/local/game" element={<LocalGamePage />} />
    </Routes>
  );
}
