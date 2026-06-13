import React, { useState } from 'react';
import api from '../services/api';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [condition, setCondition] = useState('stuttering');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login API Call
        const response = await api.post('/auth/login', {
          username,
          password,
          userType: 'child' // default userType in project schema
        });

        if (response.data.success) {
          onLoginSuccess(response.data.user);
        } else {
          setError(response.data.message || 'Login failed. Please try again.');
        }
      } else {
        // Register API Call
        if (!fullName || !age) {
          setError('Please fill out all fields.');
          setLoading(false);
          return;
        }

        const response = await api.post('/auth/register', {
          username,
          password,
          fullName,
          age: parseInt(age),
          condition
        });

        if (response.data.success) {
          // Auto-login after registration
          const loginResponse = await api.post('/auth/login', {
            username,
            password,
            userType: 'child'
          });
          if (loginResponse.data.success) {
            onLoginSuccess(loginResponse.data.user);
          }
        } else {
          setError(response.data.message || 'Registration failed.');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(
        err.response?.data?.message || 
        'An error occurred. Check your network or credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container glass-card animate-slide-up">
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'Outfit' }}>
        🎤 Speech Therapy AI 🌈
      </h2>
      
      <div className="auth-tabs">
        <button 
          className={`auth-tab ${isLogin ? 'active' : ''}`}
          onClick={() => { setIsLogin(true); setError(''); }}
        >
          Sign In
        </button>
        <button 
          className={`auth-tab ${!isLogin ? 'active' : ''}`}
          onClick={() => { setIsLogin(false); setError(''); }}
        >
          Register
        </button>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className="form-control"
                placeholder="Enter child's full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                min="2"
                max="100"
                className="form-control"
                placeholder="Enter age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="condition">Speech Condition</label>
              <select
                id="condition"
                className="form-control"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
              >
                <option value="stuttering">Stuttering / Stammering</option>
                <option value="stroke">Stroke Recovery / Aphasia</option>
                <option value="autism">Autism Spectrum Disorder</option>
                <option value="developmental_delay">Developmental Delay</option>
                <option value="articulation">Articulation Disorder</option>
                <option value="english_fluency">Language Fluency Practice</option>
                <option value="aphasia">Aphasia</option>
                <option value="dysarthria">Dysarthria</option>
                <option value="other">Other Speech Improvement</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            className="form-control"
            placeholder="Choose username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="form-control"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processing...' : isLogin ? 'Let\'s Go!' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        {isLogin ? (
          <p>Don't have an account? Select the Register tab above!</p>
        ) : (
          <p>Already registered? Select the Sign In tab above!</p>
        )}
      </div>
    </div>
  );
}

export default Login;
