import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { FormDataProvider } from './FormDataContext';
import useGoogleMapsApi from './useGoogleMapsApi';
import Login from './login';

// Lazy load components
const Home = lazy(() => import('./Home'));
const AnotherPage = lazy(() => import('./AnotherPage'));
const MapLayoutVisualizer = lazy(() => import('./MapLayoutVisualizer'));
const SatelliteLayoutTool = lazy(() => import('./SatelliteLayoutTool'));
const SolarSight = lazy(() => import('./SolarSight').then(module => ({ default: module.SolarSight })));

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const isGoogleMapsLoaded = useGoogleMapsApi();

  useEffect(() => {
    console.log("App mounted, isLoggedIn:", isLoggedIn);
  }, [isLoggedIn]);

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
    console.log("User logged in");
  };

  const handleLogout = () => {
    localStorage.setItem('isLoggedIn', 'false');
    setIsLoggedIn(false);
    console.log("User logged out");
  };

  if (!isGoogleMapsLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <Router>
      <FormDataProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route 
              path="/" 
              element={!isLoggedIn ? <Login onLogin={handleLogin} /> : <Navigate to="/home" />} 
            />
            <Route 
              path="/home" 
              element={isLoggedIn ? <Home onLogout={handleLogout} isGoogleMapsLoaded={isGoogleMapsLoaded} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/rectangular-layout" 
              element={isLoggedIn ? <AnotherPage onLogout={handleLogout} isGoogleMapsLoaded={isGoogleMapsLoaded} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/map-layout-page" 
              element={isLoggedIn ? <MapLayoutVisualizer isGoogleMapsLoaded={isGoogleMapsLoaded} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/satellite-layout-tool" 
              element={isLoggedIn ? <SatelliteLayoutTool isGoogleMapsLoaded={isGoogleMapsLoaded} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/solar-sight" 
              element={isLoggedIn ? <SolarSight isGoogleMapsLoaded={isGoogleMapsLoaded} /> : <Navigate to="/" />} 
            />
          </Routes>
        </Suspense>
      </FormDataProvider>
    </Router>
  );
}

export default App;