import React, { useState, useEffect } from 'react';
import api from '../services/api';

const EXERCISE_DATA = {
  stuttering: {
    words: ['Calm', 'Slow', 'Breath', 'Relax', 'Smooth', 'Easy', 'Pace', 'Gentle'],
    sentences: [
      'I take a deep breath before speaking.',
      'Speaking slowly makes me feel calm.',
      'My voice is clear, smooth, and relaxed.',
      'I speak one word at a time with confidence.',
      'Taking my time is perfectly okay.'
    ]
  },
  stroke: {
    words: ['Water', 'Hello', 'Eat', 'Home', 'Family', 'Doctor', 'Apple', 'Help'],
    sentences: [
      'Please pass the glass of water.',
      'I am feeling much stronger today.',
      'Let us go for a short walk outside.',
      'The sun is shining bright this afternoon.',
      'Can you please help me with this?'
    ]
  },
  aphasia: {
    words: ['Yes', 'No', 'Thank you', 'Please', 'Good', 'More', 'Sleep', 'Drink'],
    sentences: [
      'I would like a drink of water.',
      'It is nice to meet you today.',
      'The food tastes very delicious.',
      'I want to watch some television.',
      'Have a wonderful and blessed day.'
    ]
  },
  dysarthria: {
    words: ['Tip', 'Top', 'Pat', 'Bag', 'Cup', 'Key', 'Run', 'Sit'],
    sentences: [
      'The cat sat on the mat.',
      'Please speak clearly and slowly.',
      'Pick up the pen and paper.',
      'Open the door and look outside.',
      'The yellow dog chased the ball.'
    ]
  },
  autism: {
    words: ['Happy', 'Friend', 'Share', 'Please', 'Smile', 'Game', 'Love', 'Listen'],
    sentences: [
      'Can I play this game with you?',
      'Thank you for sharing your toys.',
      'I want to be your friend today.',
      'How are you feeling this afternoon?',
      'Let us make a drawing together.'
    ]
  },
  developmental_delay: {
    words: ['Ball', 'Car', 'Book', 'Play', 'Milk', 'Mama', 'Papa', 'Baby'],
    sentences: [
      'Look at the big blue ball.',
      'I like to read this book.',
      'The red car goes very fast.',
      'Can I have a cup of milk?',
      'I love playing with my friends.'
    ]
  },
  articulation: {
    words: ['Red', 'Like', 'Ship', 'Think', 'Chair', 'Zone', 'Think', 'Thimble'],
    sentences: [
      'She sells sea shells by the seashore.',
      'The red rabbit ran down the road.',
      'Think about thirty three things clearly.',
      'The light bright light shines tonight.',
      'Charles chose a cheap blue chair.'
    ]
  },
  english_fluency: {
    words: ['Excellent', 'Opportunity', 'Communication', 'Beautiful', 'Confidence', 'Together'],
    sentences: [
      'Practice makes perfect when learning languages.',
      'Communication is key to understanding others.',
      'I enjoy practicing speech every single day.',
      'Today is a beautiful day to learn something new.',
      'Speech recognition tools help me improve daily.'
    ]
  },
  other: {
    words: ['Speak', 'Voice', 'Clarity', 'Sound', 'Tone', 'Pitch', 'Learn', 'Better'],
    sentences: [
      'My voice is clear and easy to understand.',
      'I practice my pronunciation every day.',
      'I love learning new words and phrases.',
      'Clear communication brings people together.',
      'Speech therapy helps me build confidence.'
    ]
  }
};

function Practice({ user }) {
  const userCondition = user?.condition || 'other';
  const exercises = EXERCISE_DATA[userCondition] || EXERCISE_DATA.other;

  const [mode, setMode] = useState('word'); // 'word' or 'sentence'
  const [index, setIndex] = useState(0);
  const [spoken, setSpoken] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  
  // Feedback states
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentList = mode === 'word' ? exercises.words : exercises.sentences;
  const targetText = currentList[index] || '';

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setSpoken('Listening...');
      };

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setSpoken(transcript);
        analyzePronunciation(transcript);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setSpoken(`Error: ${e.error}. Try again.`);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [mode, index]);

  // Reset states when mode or index changes
  useEffect(() => {
    setSpoken('');
    setResult(null);
  }, [mode, index]);

  const speakTarget = () => {
    if ('speechSynthesis' in window) {
      // Cancel previous voices
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(targetText);
      utterance.rate = 0.8; // Speak slightly slower for guidance
      
      // Select a child-friendly or clear voice if available
      const voices = window.speechSynthesis.getVoices();
      const defaultVoice = voices.find(v => v.lang.includes('en')) || voices[0];
      if (defaultVoice) utterance.voice = defaultVoice;
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech Synthesis not supported in this browser.');
    }
  };

  const startRecording = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported by your browser. Please use Google Chrome or Edge.');
      return;
    }
    setResult(null);
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const analyzePronunciation = async (spokenText) => {
    setLoading(true);
    try {
      const response = await api.post('/therapy/analyze', {
        target: targetText,
        spoken: spokenText,
        mode: mode
      });
      setResult(response.data);
      
      // Provide audio feedback if accuracy is good
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const feedbackUtterance = new SpeechSynthesisUtterance(response.data.feedback);
        feedbackUtterance.rate = 0.95;
        window.speechSynthesis.speak(feedbackUtterance);
      }
    } catch (err) {
      console.error('Error analyzing speech:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (index < currentList.length - 1) {
      setIndex(index + 1);
    } else {
      setIndex(0); // wrap around
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    } else {
      setIndex(currentList.length - 1);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  };

  return (
    <div className="practice-container glass-card animate-slide-up">
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'Outfit' }}>
        🎯 Guided Practice
      </h2>

      <div className="mode-selector">
        <button 
          className={`mode-btn ${mode === 'word' ? 'active' : ''}`}
          onClick={() => { setMode('word'); setIndex(0); }}
        >
          🔤 Words
        </button>
        <button 
          className={`mode-btn ${mode === 'sentence' ? 'active' : ''}`}
          onClick={() => { setMode('sentence'); setIndex(0); }}
        >
          📝 Sentences
        </button>
      </div>

      <div className="exercise-box" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--light-text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          EXERCISE {index + 1} OF {currentList.length}
        </p>
        <div className="target-text">"{targetText}"</div>
        
        <button className="play-target-btn" onClick={speakTarget}>
          🔊 Listen Guide
        </button>

        <div className="audio-controls">
          <button 
            className={`mic-btn ${isRecording ? 'recording' : ''}`} 
            onClick={startRecording}
            disabled={loading}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
          <span className="mic-label">
            {isRecording ? 'Recording... Tap to stop' : 'Tap mic and speak'}
          </span>
        </div>

        <div className={`spoken-transcript ${spoken ? 'has-content' : ''}`}>
          {spoken || 'Your recognized text will appear here...'}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>Analyzing your speech... 💫</div>}

      {result && (
        <div className="feedback-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="feedback-score">{result.accuracy}%</div>
              <div className="feedback-msg">{result.feedback}</div>
            </div>
            <div style={{ fontSize: '3rem' }}>
              {result.accuracy >= 90 ? '🌟' : result.accuracy >= 70 ? '👍' : '🌸'}
            </div>
          </div>
          
          <div className="progress-track" style={{ marginTop: '1rem', height: '10px', borderRadius: '5px' }}>
            <div 
              className={`progress-fill ${getScoreColor(result.accuracy)}`} 
              style={{ width: `${result.accuracy}%`, borderRadius: '5px' }}
            ></div>
          </div>
        </div>
      )}

      <div className="nav-exercise-btns">
        <button className="btn-nav" onClick={handlePrev}>
          ⬅️ Prev
        </button>
        <button className="btn-nav" onClick={handleNext}>
          Next ➡️
        </button>
      </div>
    </div>
  );
}

export default Practice;
