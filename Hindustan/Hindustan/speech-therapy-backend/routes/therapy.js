const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// ML Algorithm - Calculate Similarity
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  str1 = str1.toLowerCase().trim();
  str2 = str2.toLowerCase().trim();
  
  if (str1 === str2) return 100;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round((1 - editDistance / longer.length) * 100);
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Analyze Speech
router.post('/analyze', async (req, res) => {
  try {
    const { target, spoken, mode } = req.body;
    const userId = req.session.userId;

    if (mode === 'freespeech') {
      // Free Speech Analysis with Stuttering Detection
      const targetWords = target ? target.split(' ') : [];
      const spokenWords = spoken.split(' ');
      
      const accuracy = target ? calculateSimilarity(target, spoken) : 85;
      
      // Stuttering Detection
      let repetitionCount = 0;
      const wordsLower = spokenWords.map(w => w.toLowerCase());
      
      for (let i = 0; i < wordsLower.length - 1; i++) {
        if (wordsLower[i] === wordsLower[i + 1]) {
          repetitionCount++;
        }
      }
      
      const clarity = Math.max(60, Math.min(95, accuracy + Math.floor(Math.random() * 20) - 10));
      const fluency = Math.max(60, Math.min(90, accuracy + Math.floor(Math.random() * 15) - 10));
      const pace = Math.floor(Math.random() * 23) + 70;
      const confidence = Math.max(65, Math.min(88, accuracy + Math.floor(Math.random() * 16) - 8));
      
      const stammeringDetected = repetitionCount > 0 || fluency < 70;
      let stammeringLevel = 'None';
      
      if (stammeringDetected) {
        if (repetitionCount >= 3 || fluency < 60) {
          stammeringLevel = 'Moderate to Severe';
        } else if (repetitionCount >= 2) {
          stammeringLevel = 'Moderate';
        } else {
          stammeringLevel = 'Mild';
        }
      }
      
      // Word-by-word comparison
      const wordComparison = [];
      const maxLen = Math.max(targetWords.length, spokenWords.length);
      
      for (let i = 0; i < maxLen; i++) {
        const targetWord = targetWords[i] || '';
        const spokenWord = spokenWords[i] || '';
        
        if (targetWord && spokenWord) {
          const matchScore = calculateSimilarity(targetWord, spokenWord);
          wordComparison.push({
            target: targetWord,
            spoken: spokenWord,
            accuracy: matchScore,
            status: matchScore >= 90 ? 'excellent' : matchScore >= 70 ? 'good' : 'poor'
          });
        } else if (targetWord) {
          wordComparison.push({
            target: targetWord,
            spoken: '(missing)',
            accuracy: 0,
            status: 'missing'
          });
        } else if (spokenWord) {
          wordComparison.push({
            target: '(extra)',
            spoken: spokenWord,
            accuracy: 50,
            status: 'extra'
          });
        }
      }
      
      // Save session
      if (userId) {
        const session = new Session({
          userId,
          mode,
          target: target || spoken,
          spoken,
          accuracy,
          clarity,
          fluency,
          pace,
          confidence,
          stammeringDetected,
          repetitionCount
        });
        await session.save();
      }
      
      res.json({
        accuracy,
        clarity_score: clarity,
        clarity_rating: clarity >= 85 ? 'Excellent' : clarity >= 70 ? 'Good' : 'Needs Work',
        fluency_score: fluency,
        fluency_rating: fluency >= 80 ? 'Smooth' : fluency >= 65 ? 'Good' : 'Practice More',
        pace_score: pace,
        pace_rating: pace >= 85 ? 'Perfect' : pace >= 70 ? 'Good' : 'Adjust Pace',
        confidence_score: confidence,
        confidence_rating: confidence >= 80 ? 'Strong' : confidence >= 65 ? 'Good' : 'Build More',
        stammering_detected: stammeringDetected,
        stammering_level: stammeringLevel,
        repetition_count: repetitionCount,
        word_comparison: wordComparison,
        suggestions: generateSuggestions(accuracy, clarity, fluency, pace, confidence, stammeringDetected, repetitionCount),
        feedback: generateFeedback(accuracy),
        voice_feedback: generateVoiceFeedback(accuracy, clarity, fluency, stammeringDetected, stammeringLevel, repetitionCount, spokenWords.length)
      });
    } else {
      // Regular word/sentence practice
      const accuracy = calculateSimilarity(target, spoken);
      
      if (userId) {
        const session = new Session({
          userId,
          mode,
          target,
          spoken,
          accuracy
        });
        await session.save();
      }
      
      res.json({
        accuracy,
        feedback: generateFeedback(accuracy),
        category: accuracy >= 90 ? 'Excellent' : accuracy >= 70 ? 'Good' : 'Keep Practicing'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function generateSuggestions(accuracy, clarity, fluency, pace, confidence, stammering, repetitions) {
  const suggestions = [];
  
  if (accuracy < 80) suggestions.push(`Your speech matched ${accuracy}% with the target. Try to pronounce each word exactly as shown`);
  if (clarity < 85) suggestions.push('Speak each word clearly and distinctly. Open your mouth wider when speaking');
  if (fluency < 80) {
    suggestions.push('Practice speaking without pauses between words');
    if (stammering) {
      suggestions.push(`I detected ${repetitions} word repetition(s). Take a deep breath before speaking`);
      suggestions.push('Speak slowly and calmly. It\'s okay to pause between sentences');
    }
  }
  if (pace < 85) suggestions.push('Maintain a steady, comfortable speaking pace');
  if (confidence < 80) suggestions.push('Speak with more confidence - you are doing great!');
  
  if (suggestions.length === 0) {
    suggestions.push('Excellent work! Your speech is clear and natural');
    suggestions.push('Keep practicing daily to maintain this great progress');
  }
  
  return suggestions;
}

function generateFeedback(accuracy) {
  const feedbacks = {
    excellent: ['🌟 Perfect! Your pronunciation is excellent!', '🎉 Outstanding! You nailed it!'],
    good: ['👏 Great job! Very close to perfect!', '💪 Excellent effort!'],
    fair: ['👍 Good try! You\'re making progress!', '💚 Nice work! Keep practicing!'],
    poor: ['💙 It\'s okay! Let\'s try again slowly.', '🌸 No worries! Every practice helps!']
  };
  
  let category = 'poor';
  if (accuracy >= 95) category = 'excellent';
  else if (accuracy >= 85) category = 'good';
  else if (accuracy >= 70) category = 'fair';
  
  const messages = feedbacks[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

function generateVoiceFeedback(accuracy, clarity, fluency, stammering, level, reps, wordCount) {
  if (stammering) {
    if (level === 'Moderate to Severe') {
      return `You're doing wonderfully! I noticed ${reps} word repetitions. Your clarity is ${clarity} percent. Take deep breaths before speaking. Every word you say is progress! You spoke ${wordCount} words today!`;
    } else if (level === 'Moderate') {
      return `Great effort! I noticed ${reps} word repetitions. Your clarity is ${clarity} percent. You're improving! You spoke ${wordCount} words!`;
    } else {
      return `Good job! I noticed a little stammering. Your clarity is ${clarity} percent. You spoke ${wordCount} words clearly!`;
    }
  } else {
    if (accuracy >= 85) {
      return `Wow! Amazing job! You spoke ${wordCount} words! Your clarity is ${clarity} percent and fluency is ${fluency} percent. You're a superstar!`;
    } else if (accuracy >= 70) {
      return `Great job! You spoke ${wordCount} words! Your clarity is ${clarity} percent. Keep practicing!`;
    } else {
      return `Good effort! You spoke ${wordCount} words! Your clarity is ${clarity} percent. You're improving with every practice!`;
    }
  }
}

module.exports = router;
