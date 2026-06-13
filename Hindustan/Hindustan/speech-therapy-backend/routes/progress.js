const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const User = require('../models/User');

// Get Dashboard Stats
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await User.findById(userId);
    const sessions = await Session.find({ userId }).sort({ createdAt: -1 });

    const totalSessions = sessions.length;
    const avgAccuracy = totalSessions > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions) 
      : 0;

    // Calculate streak
    const streak = calculateStreak(sessions);

    // Calculate level
    const level = Math.min(20, Math.floor((totalSessions * 10) / 100) + 1);

    // Weekly progress
    const weeklyProgress = getWeeklyProgress(sessions);

    res.json({
      success: true,
      total_sessions: totalSessions,
      average_accuracy: avgAccuracy,
      streak,
      level,
      weekly_progress: weeklyProgress,
      user_info: {
        fullName: user.fullName,
        condition: user.condition
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;

  const dates = [...new Set(sessions.map(s => s.createdAt.toISOString().split('T')[0]))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - streak);
    const expected = expectedDate.toISOString().split('T')[0];
    
    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function getWeeklyProgress(sessions) {
  const weekly = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = days[date.getDay()];
    
    const daySessions = sessions.filter(s => 
      s.createdAt.toISOString().split('T')[0] === dateStr
    );
    
    const avgAcc = daySessions.length > 0
      ? Math.round(daySessions.reduce((sum, s) => sum + s.accuracy, 0) / daySessions.length)
      : 0;
    
    weekly.push({
      day: dayName,
      date: dateStr,
      sessions: daySessions.length,
      accuracy: avgAcc
    });
  }
  
  return weekly;
}

module.exports = router;
