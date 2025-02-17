import React from 'react'
import './App.css'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Login from './components/Login';
import { Home } from './routes/Home';
import FrenteCaixa from './components/FrenteCaixa';
import CriarConta from './routes/CriarConta';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/frente-de-caixa" element={<FrenteCaixa />} />
        <Route path="/criar-conta" element={<CriarConta />} />
      </Routes>
    </Router>
  );
}

export default App
