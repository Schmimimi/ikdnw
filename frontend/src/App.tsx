import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Pages
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import SessionSelect from './pages/SessionSelect';
import PlayerPanel from './pages/PlayerPanel';
import HostPanel from './pages/HostPanel';
import Overlay from './pages/Overlay';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/sessions" element={<SessionSelect />} />
        <Route path="/player/:sessionId" element={<PlayerPanel />} />
        <Route path="/host/:sessionId" element={<HostPanel />} />
        <Route path="/overlay/:sessionId" element={<Overlay />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
