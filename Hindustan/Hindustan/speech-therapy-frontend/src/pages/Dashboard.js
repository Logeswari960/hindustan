import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/progress/dashboard');
        if (response.data.success) {
          setStats(response.data);
        } else {
          setError('Failed to load dashboard data');
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Could not connect to progress database.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCondition = (cond) => {
    if (!cond) return 'General Practice';
    return cond.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // SVG Chart Helper
  const renderSVGChart = (weeklyData) => {
    if (!weeklyData || weeklyData.length === 0) return null;

    const width = 600;
    const height = 180;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = 100;
    const pointsCount = weeklyData.length;

    // Map weekly progress data to coordinates
    const coordinates = weeklyData.map((item, index) => {
      const x = padding + (index * chartWidth) / (pointsCount - 1 || 1);
      // Invert Y coordinate since SVG (0,0) is top-left
      const y = padding + chartHeight - (item.accuracy * chartHeight) / maxVal;
      return { x, y, ...item };
    });

    // Generate SVG path (smooth bezier curve or straight lines)
    const linePath = coordinates.reduce((path, point, index) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
    }, '');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((gridValue, idx) => {
          const y = padding + chartHeight - (gridValue * chartHeight) / maxVal;
          return (
            <g key={idx}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid" />
              <text x={padding - 8} y={y + 3} textAnchor="end" className="chart-label" style={{ fontSize: '8px' }}>
                {gridValue}%
              </text>
            </g>
          );
        })}

        {/* Chart Line Path */}
        {linePath && <path d={linePath} className="chart-line" />}

        {/* Data points and labels */}
        {coordinates.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r={5} className="chart-point" />
            <text x={point.x} y={point.y - 10} textAnchor="middle" className="chart-label" style={{ fontSize: '9px', fontWeight: 'bold' }}>
              {point.accuracy}%
            </text>
            <text x={point.x} y={height - padding + 15} textAnchor="middle" className="chart-label">
              {point.day}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="glass-card animate-slide-up" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Loading your statistics... ⏱️</h2>
        <div style={{ marginTop: '1rem', color: 'var(--light-text)' }}>Connecting to database...</div>
      </div>
    );
  }

  return (
    <div className="glass-card animate-slide-up" style={{ width: '100%' }}>
      <div className="dashboard-title">
        <span style={{ fontSize: '2.5rem' }}>👋</span>
        <div>
          <h2 style={{ fontSize: '2rem' }}>Welcome Back, {user?.fullName || 'Champion'}!</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--light-text)', fontWeight: 500 }}>
            Condition Track: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCondition(user?.condition)}</span>
          </p>
        </div>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {/* Stats Cards Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">👑</span>
          <span className="stat-value">Lv. {stats?.level || 1}</span>
          <span className="stat-label">Your Level</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{stats?.streak || 0} Days</span>
          <span className="stat-label">Daily Streak</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📈</span>
          <span className="stat-value">{stats?.average_accuracy || 0}%</span>
          <span className="stat-label">Avg Accuracy</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-value">{stats?.total_sessions || 0}</span>
          <span className="stat-label">Sessions Done</span>
        </div>
      </div>

      {/* Progress Chart Section */}
      <div className="chart-section">
        <div className="chart-header">
          <h3 className="chart-title">📊 Weekly Progress Trends</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--light-text)', fontWeight: 600 }}>Daily Performance</span>
        </div>
        <div className="chart-container">
          {stats?.weekly_progress && stats.weekly_progress.length > 0 ? (
            renderSVGChart(stats.weekly_progress)
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--light-text)' }}>
              No practice data yet for this week. Start practicing to generate stats!
            </div>
          )}
        </div>
      </div>

      {/* Action Cards Section */}
      <div className="action-cards">
        <div className="action-card">
          <h3>🎯 Guided Practice</h3>
          <p>Practice specific words and sentences structured for your condition with instant feedback and visual cues.</p>
          <button className="btn-primary" onClick={() => onNavigate('practice')} style={{ marginTop: 'auto' }}>
            Start Guided Practice
          </button>
        </div>
        
        <div className="action-card">
          <h3>💬 Free Conversations</h3>
          <p>Speak freely or read any text you want. Our AI will analyze your stuttering, clarity, pace, and confidence level.</p>
          <button className="btn-secondary" onClick={() => onNavigate('freespeech')} style={{ marginTop: 'auto', width: '100%' }}>
            Start Free Speech
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
