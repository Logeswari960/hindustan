# AI SPEECH THERAPY ASSISTANT - React + Node.js

## 🚀 SETUP INSTRUCTIONS

### BACKEND SETUP

1. Navigate to backend folder:
```bash
cd speech-therapy-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file:
```bash
copy .env.example .env
```

4. Edit .env file and add your MongoDB URL:
```
PORT=5000
MONGODB_URI=your_mongodb_url_here
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_secret
```

5. Start backend server:
```bash
npm start
```

Backend will run on: http://localhost:5000

---

### FRONTEND SETUP

1. Navigate to frontend folder:
```bash
cd speech-therapy-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start React app:
```bash
npm start
```

Frontend will run on: http://localhost:3000

---

## 📁 PROJECT STRUCTURE

```
speech-therapy-backend/
├── models/
│   ├── User.js
│   └── Session.js
├── routes/
│   ├── auth.js
│   ├── therapy.js
│   └── progress.js
├── server.js
├── package.json
└── .env

speech-therapy-frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── Practice.js
│   │   └── FreeSpeech.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   └── index.js
└── package.json
```

---

## 🔧 TECHNOLOGIES USED

### Backend:
- Node.js
- Express.js
- MongoDB + Mongoose
- bcryptjs (password hashing)
- express-session (authentication)

### Frontend:
- React.js
- React Router
- Axios (API calls)
- Web Speech API (speech recognition)

### AI/ML:
- Levenshtein Distance Algorithm
- SequenceMatcher for accuracy
- Stuttering Detection Algorithm
- NLP for text comparison

---

## 🎯 FEATURES

✅ User Authentication (Register/Login)
✅ Disability-Specific Adaptation
✅ Real-time Speech Analysis
✅ Stuttering Detection
✅ Word-by-Word Comparison
✅ Progress Tracking
✅ Dashboard with Statistics
✅ Multiple Practice Modes
✅ Voice Assistant Feedback

---

## 📝 API ENDPOINTS

### Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Therapy:
- POST /api/therapy/analyze

### Progress:
- GET /api/progress/dashboard

---

## 🎨 COLOR SCHEME

- Primary: #ff6b9d (Light Rose)
- Secondary: #b5ead7 (Light Green)
- Background: Linear gradient (rose to green)

---

## 👤 DEFAULT TEST USER

Username: jayadharani
Password: poongodi
Condition: stroke
Age: 18

---

## 📞 SUPPORT

For issues or questions, contact: JAYADHARANI

Project: AI Speech Therapy Assistant
Technologies: AI + ML + NLP + Speech Processing + Computer Vision
