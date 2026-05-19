import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ReviewDetail from './pages/ReviewDetail';
import Repos from './pages/Repos';
import Reviews from './pages/Reviews'; // <-- 1. Import the new page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="reviews/:id" element={<ReviewDetail />} />
          <Route path="reviews" element={<Reviews />} /> {/* <-- 2. Replace the placeholder */}
          <Route path="repos" element={<Repos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;