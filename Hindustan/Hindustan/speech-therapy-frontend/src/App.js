import React, { useState, useEffect } from 'react';
import api from './services/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import FreeSpeech from './pages/FreeSpeech';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check active session (auto-login)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.success && response.data.user) {
          setUser(response.data.user);
        }
      } catch (err) {
        // User not logged in, ignore error
        console.log('No active session found.');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="glass-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ fontFamily: 'Outfit' }}>🎤 Speech Therapy AI 🌈</h2>
          <div style={{ marginTop: '1.5rem', color: 'var(--light-text)', fontWeight: 'bold' }}>Loading App...</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
        <main className="main-content">
          <Login onLoginSuccess={handleLoginSuccess} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Global Brand Header */}
      <header className="app-header">
        <div className="brand-section">
          <h1 className="brand-title">🎤 Speech Therapy AI 🌈</h1>
        </div>

        {/* Tab Links */}
        <nav className="nav-links">
          <button 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            📊 Dashboard
          </button>
          
          <button 
            className={`nav-link ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('practice')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            🎯 Guided Practice
          </button>

          <button 
            className={`nav-link ${activeTab === 'freespeech' ? 'active' : ''}`}
            onClick={() => setActiveTab('freespeech')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            💬 Free Speech
          </button>

          <div className="user-tag">
            👤 {user.fullName}
          </div>

          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      {/* Main Pages */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard user={user} onNavigate={setActiveTab} />
        )}
        
        {activeTab === 'practice' && (
          <Practice user={user} />
        )}
        
        {activeTab === 'freespeech' && (
          <FreeSpeech />
        )}
      </main>
    </div>
  );
}

export default App;
