import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { Toaster } from 'react-hot-toast';
import { initializeDataStore } from './services/dataStore';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeDataStore()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('[Fayha] Initialization failed:', err);
        // Still render the app even if auth fails, so the user can see the UI
        setReady(true);
      });
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
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </BrowserRouter>
  );
}

export default App;
