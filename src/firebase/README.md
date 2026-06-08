# ⚡ Mooderia Education — Secure Firebase SDK Integration Setup

Welcome to the production-grade **Firebase v10+ Backend Architectural Engine** for Mooderia Education. This configuration empowers the platform with user profiles, instant AI-cached quizzes, scalable cloud file vaults, and ultra-fast real-time lobbies.

---

## 🏗️ 1. Complete Architecture Map

```
  [ Student Client App ] (Web / Mobile Hub)
     │
     ├─ (Uploads document pdf/pptx) ──► [ Secure Cloud Storage ]
     │                                     │
     │                           (Upload URL callback)
     │                                     ▼
     ├─ (Initialize study_set) ──────► [ Cloud Firestore ]
     │                                     │ (Undergoing Cache Check)
     │                                     ▼
     └─ (Checks Caching Engine) ─────── [ Cache Hit? Yes ] ──► (Returns cached quiz in <50ms)
                                           │
                                    [ Cache Miss? No ]
                                           │
                                           ▼
                                [ Secure Cloud Function ]
                                           │ (Loads process.env.GEMINI_API_KEY)
                                           ▼
                                  [ Gemini 2.5 Flash ]
                                           │ (Returns exact JSON)
                                           ▼
                                [ Saved into Firestore ]
```

---

## 🧱 2. File Manifest

The integration is modular and structured as follows:

| Path | Purpose |
| :--- | :--- |
| `src/firebase/config.ts` | Connection singleton initializing Auth, Firestore, Storage, and RTDB with defensive fail-safes. |
| `src/firebase/errorHandler.ts` | Enforces standard secure diagnostic logging when security rules reject client calls. |
| `src/firebase/authService.ts` | Layer 1: Google & Email authentication + automatic User Profile creation. |
| `src/firebase/storageService.ts` | Layer 2: Uploads lectures (.pptx, Word, MP4, MP3) and creates asset references in Firestore. |
| `src/firebase/functions/generateGameData.js` | Layer 3: Centralized serverless HTTPS function generating quiz data using Gemini 2.5 Flash. |
| `src/firebase/multiplayerService.ts` | Layer 4: Lobbies hosting and synchronization with sub-100ms synchronization. |
| `src/firebase/cachingService.ts` | Layer 5: High-efficiency idempotent caching loop checking database records first. |

---

## 🔌 3. Configuration & Web Environment Vars

Create a `.env` configuration file in your SPA workspace with the following connection strings:

```env
# Client-side configuration mapping
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="mooderia-v1.firebaseapp.com"
VITE_FIREBASE_DATABASE_URL="https://mooderia-v1-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="mooderia-v1"
VITE_FIREBASE_STORAGE_BUCKET="mooderia-v1.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"

# AI Generation Trigger Address
VITE_GENERATION_FUNCTION_URL="https://generategamedata-xxxxxx.a.run.app"
```

---

## ⚡ 4. Realtime Multiplayer Session Schema (RTDB JSON Structure)

Multiplayer lobbys are synchronized under the following layout prefix in the **Realtime Database**:

```json
{
  "lobbies": {
    "675301": {
      "lobby_id": "675301",
      "host_id": "user_auth_uid_123",
      "deck_id": "set_1717849102",
      "game_state": "waiting",
      "current_question_index": 0,
      "joined_players": {
        "user_auth_uid_456": {
          "uid": "user_auth_uid_456",
          "name": "LectureLegend42",
          "score": 1400
        },
        "user_auth_uid_789": {
          "uid": "user_auth_uid_789",
          "name": "StudyDrillHero",
          "score": 1150
        }
      }
    }
  }
}
```

---

## 🛠️ 5. Deployment Commands

1. **Deploy Security Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```
2. **Deploy Cloud Functions (AI Brain):**
   ```bash
   cd src/firebase/functions
   npm install
   firebase deploy --only functions:generateGameData
   ```
