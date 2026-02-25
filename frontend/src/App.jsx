import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";
import EndPage from "./pages/EndPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:gameId" element={<LobbyPage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/end/:gameId" element={<EndPage />} />
        <Route path="*" element={<Navigate to="/" replace />} /> // redirige les routes inconnues vers la page d'accueil
      </Routes>
    </BrowserRouter>
  );
}