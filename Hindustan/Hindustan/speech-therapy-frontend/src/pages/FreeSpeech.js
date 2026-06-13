import React, { useState, useEffect } from 'react';
import api from '../services/api';

const READING_PARAGRAPHS = [
  {
    id: 1,
    title: '🐶 The Happy Puppy',
    text: 'The happy puppy ran down the street to catch a yellow ball.'
  },
  {
    id: 2,
    title: '🐸 The Sparkling Pond',
    text: 'Once upon a time, a small green frog lived in a sparkling pond.'
  },
  {
    id: 3,
    title: '🌟 Building Confidence',
    text: 'Speech practice makes me feel proud and builds my self confidence.'
  },
  {
    id: 4,
    title: '🌬️ Smooth Breathing',
    text: 'Deep breaths help me speak slowly, clearly, and smoothly.'
  },
  {
    id: 5,
    title: '🎈 Speak Freely (No Target)',
    text: ''
  }
];

function FreeSpeech() {
  const [selectedParagraph, setSelectedParagraph] = useState(READING_PARAGRAPHS[0]);
  const [spoken, setSpoken] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Analysis results
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setSpoken('');
      };

      let finalTranscript = '';
      rec.onresult = (e) => {
        let interimTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript + ' ';
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }
        setSpoken(finalTranscript || interimTranscript);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        if (e.error !== 'no-speech') {
          setSpoken(`Error: ${e.error}. Try restarting mic.`);
          setIsRecording(false);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported by your browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      // Analyze what was captured so far
      setTimeout(() => {
        if (spoken && spoken.trim().length > 0) {
          analyzeSpeech(spoken);
        }
      }, 500);
    } else {
      setResult(null);
      recognition.start();
    }
  };

  const analyzeSpeech = async (speechText) => {
    setLoading(true);
    try {
      const response = await api.post('/therapy/analyze', {
        target: selectedParagraph.text,
        spoken: speechText,
        mode: 'freespeech'
      });
      setResult(response.data);

      // Speak feedback out loud using text-to-speech
      if ('speechSynthesis' in window && response.data.voice_feedback) {
        window.speechSynthesis.cancel();
        const utterance = new SynthesisUtteranceWrapper(response.data.voice_feedback);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Error analyzing free speech:', err);
    } finally {
      setLoading(false);
    }
  };

  const SynthesisUtteranceWrapper = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // Slow down feedback slightly
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en'));
    if (englishVoice) utterance.voice = englishVoice;
    return utterance;
  };

  const getMetricColorClass = (score) => {
    if (score >= 80) return 'green';
    if (score >= 65) return 'yellow';
    return 'red';
  };

  return (
    <div className="glass-card animate-slide-up" style={{ maxWidth: '900px', margin: 'auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'Outfit' }}>
        💬 Free Conversation & Analysis
      </h2>

      {/* Paragraph Selection */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontWeight: '600', marginBottom: '0.8rem', color: 'var(--dark-text)', fontFamily: 'Outfit' }}>
          Select reading text:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {READING_PARAGRAPHS.map((p) => (
            <button
              key={p.id}
              className={`mode-btn ${selectedParagraph.id === p.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedParagraph(p);
                setSpoken('');
                setResult(null);
              }}
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Target Paragraph Display */}
      {selectedParagraph.text && (
        <div className="exercise-box" style={{ background: 'rgba(255,107,157,0.03)', border: '1px solid rgba(255,107,157,0.1)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Reading Target:
          </p>
          <p style={{ fontSize: '1.2rem', fontWeight: '600', fontStyle: 'italic', lineHeight: '1.4' }}>
            "{selectedParagraph.text}"
          </p>
        </div>
      )}

      {/* Recording Microphone section */}
      <div className="exercise-box" style={{ textAlign: 'center' }}>
        <div className="audio-controls">
          <button
            className={`mic-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={loading}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
          <span className="mic-label">
            {isRecording ? 'Listening... Tap to stop and analyze' : 'Tap to start speaking'}
          </span>
        </div>

        <div className={`spoken-transcript ${spoken ? 'has-content' : ''}`} style={{ textAlign: 'left', minHeight: '120px' }}>
          {spoken || 'Your speech transcript will be generated in real-time as you speak...'}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>AI Speech Engine analyzing your parameters... 💫</div>}

      {/* Analysis Results Display */}
      {result && (
        <div className="animate-slide-up" style={{ marginTop: '2rem' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', marginBottom: '2rem' }} />
          
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--dark-text)' }}>
            📝 AI speech analysis results
          </h3>

          <div style={{ background: '#f5fcf9', border: '1px solid rgba(181, 234, 215, 0.5)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#27ae60', fontFamily: 'Outfit', marginBottom: '0.4rem' }}>
              🌟 {result.feedback}
            </h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--light-text)', fontWeight: '500' }}>
              {result.voice_feedback}
            </p>
          </div>

          {/* Stuttering / Stammering info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ flex: 1, minWidth: '200px', background: '#fdf2f2', border: '1px solid rgba(231, 76, 60, 0.1)', padding: '1.2rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#c0392b', fontWeight: 'bold', textTransform: 'uppercase' }}>Stammering detected</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#c0392b', fontFamily: 'Outfit' }}>
                {result.stammering_detected ? 'Yes' : 'No'}
              </div>
            </div>
            
            <div style={{ flex: 1, minWidth: '200px', background: '#fdf6e2', border: '1px solid rgba(241, 196, 15, 0.1)', padding: '1.2rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#d4ac0d', fontWeight: 'bold', textTransform: 'uppercase' }}>Stammering severity level</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#d4ac0d', fontFamily: 'Outfit' }}>
                {result.stammering_level}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '200px', background: '#ebf5fb', border: '1px solid rgba(41, 128, 185, 0.1)', padding: '1.2rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#2980b9', fontWeight: 'bold', textTransform: 'uppercase' }}>Word repetition count</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2980b9', fontFamily: 'Outfit' }}>
                {result.repetition_count}
              </div>
            </div>
          </div>

          {/* Speech Metrics Grid */}
          <div className="speech-metrics-grid">
            <div className="metric-bar-card">
              <div className="metric-header">
                <span>Clarity</span>
                <span>{result.clarity_score}%</span>
              </div>
              <div className="metric-value">{result.clarity_rating}</div>
              <div className="progress-track">
                <div className={`progress-fill ${getMetricColorClass(result.clarity_score)}`} style={{ width: `${result.clarity_score}%` }}></div>
              </div>
            </div>

            <div className="metric-bar-card">
              <div className="metric-header">
                <span>Fluency</span>
                <span>{result.fluency_score}%</span>
              </div>
              <div className="metric-value">{result.fluency_rating}</div>
              <div className="progress-track">
                <div className={`progress-fill ${getMetricColorClass(result.fluency_score)}`} style={{ width: `${result.fluency_score}%` }}></div>
              </div>
            </div>

            <div className="metric-bar-card">
              <div className="metric-header">
                <span>Pace</span>
                <span>{result.pace_score}%</span>
              </div>
              <div className="metric-value">{result.pace_rating}</div>
              <div className="progress-track">
                <div className={`progress-fill ${getMetricColorClass(result.pace_score)}`} style={{ width: `${result.pace_score}%` }}></div>
              </div>
            </div>

            <div className="metric-bar-card">
              <div className="metric-header">
                <span>Confidence</span>
                <span>{result.confidence_score}%</span>
              </div>
              <div className="metric-value">{result.confidence_rating}</div>
              <div className="progress-track">
                <div className={`progress-fill ${getMetricColorClass(result.confidence_score)}`} style={{ width: `${result.confidence_score}%` }}></div>
              </div>
            </div>
          </div>

          {/* Word by word breakdown */}
          {selectedParagraph.text && result.word_comparison && result.word_comparison.length > 0 && (
            <div className="comparison-box">
              <h4 className="comparison-title">🔍 Word-by-Word accuracy breakdown:</h4>
              <div className="word-comparison-flex">
                {result.word_comparison.map((item, index) => (
                  <div key={index} className={`word-comp-pill ${item.status}`}>
                    <span>{item.target}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>({item.spoken})</span>
                    <span className="word-comp-label">{item.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions List */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="suggestions-box">
              <h4 className="suggestions-title">💡 Personalized Speech Recommendations:</h4>
              <ul className="suggestions-list">
                {result.suggestions.map((sug, index) => (
                  <li key={index}>{sug}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FreeSpeech;
