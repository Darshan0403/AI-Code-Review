import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import Repos from './pages/Repos';
import Reviews from './pages/Reviews';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The Product Landing Page */}
        <Route path="/" element={<Landing />} />
        
        {/* The Admin Vault Door */}
        <Route path="/login" element={<Login />} />

        {/* The Open App (Layout wraps the sidebar around these) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reviews/:id" element={<ReviewDetail />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/repos" element={<Repos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;