import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { Toaster } from 'react-hot-toast';
import { hasAuthToken, ensureAuth } from './services/api';

function App() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if there's a valid token on startup
    if (hasAuthToken()) {
      ensureAuth()
        .then((valid) => {
          setIsAuthenticated(valid);
          setReady(true);
        })
        .catch(() => {
          setIsAuthenticated(false);
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, []);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </BrowserRouter>
  );
}

export default App;
