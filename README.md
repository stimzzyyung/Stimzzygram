# 🚀 Stimzzy'sgram  (with 🤖 Rizz Bot)

Connect. Share. Vibe. A React Native (Expo) social app with an Express + MongoDB backend, Socket.IO realtime, and an AI-powered Rizz Bot.

```
stimzzysgram/
├── backend/   Node.js + Express + MongoDB + Socket.IO
└── mobile/    React Native (Expo) app
```

Deploying for real users? See **DEPLOY.md**.

## 1. Run the backend

Requirements: Node 18+, MongoDB (local, or a free MongoDB Atlas cluster).

```bash
cd backend
npm install
cp .env.example .env        # then edit .env
npm run dev                 # http://localhost:5000/api/health
```

Edit `.env`:
- `MONGO_URI` – your MongoDB connection string
- `JWT_SECRET` – any long random string
- `AI_API_KEY`, `AI_MODEL`, `AI_PROVIDER` – for Rizz Bot (`anthropic` or `openai`-compatible). The key stays on the server.
- `CLOUDINARY_*` – optional. If empty, uploads are saved in `backend/uploads/` and served locally (fine for development).

Make yourself an admin (after registering in the app):
```bash
npm run make-admin -- you@email.com
```
Then open **Settings → Admin dashboard** in the app.

Password reset codes are printed in the backend console until you plug in an email provider (see `authController.forgotPassword`).

## 2. Run the mobile app

```bash
cd mobile
npm install
npx expo install --fix      # aligns package versions with your Expo Go version
cp .env.example .env        # set EXPO_PUBLIC_API_URL
npx expo start
```

`EXPO_PUBLIC_API_URL` must be reachable from your phone: use your computer's **LAN IP** (e.g. `http://192.168.1.10:5000`), phone and computer on the same Wi-Fi. Android emulator: `http://10.0.2.2:5000`. Restart Expo after editing `.env`.

## What's included

| Area | Where |
|---|---|
| Auth (register w/ avatar, login by email/username, forgot/reset, logout, logout-all, remembered session) | `backend/controllers/authController.js`, `mobile/src/screens/AuthScreens.js` |
| Feed, likes, comments (+replies, delete), save, share, report | `postController.js`, `HomeScreen`, `PostCard`, `CommentsScreen` |
| Stories (photo/video, text, emoji stickers, music title, 24h TTL, viewed rings, reply, react, delete) | `storyController.js`, `StoryViewerScreen` |
| Create post (gallery/camera/video, crop, filters, caption, hashtags, tags, location, visibility, upload progress) | `CreateScreen` |
| Profiles, tabs (posts/videos/saved/tagged), follow/unfollow, private-account requests, remove follower, block, report | `userController.js`, `ProfileScreen`, `ListScreens` |
| Explore + search suggestions, trending, hashtag pages | `searchController.js`, `ExploreScreen` |
| Vibes (vertical autoplay videos, like, comment, share, follow) | `videoController.js`, `VibesScreen` |
| DMs (text/image/video/voice, reactions, reply, delete, typing, online, read receipts) | `messageController.js`, `services/socket.js`, `MessageScreens` |
| Notifications (in-app realtime + Expo push) | `services/notify.js`, `NotificationsScreen` |
| Privacy + notification settings, dark/light/system theme | `SettingsScreens`, `ThemeContext` |
| Rizz Bot (6 categories, 6 styles, screenshot analyzer, copy, regenerate, restyle, history, clear) | `services/rizzService.js`, `rizzController.js`, `RizzScreen` |
| Admin (stats, users, reports, hashtags, flagged content) | `adminController.js`, `AdminScreen` |
| Security: bcrypt, JWT (with revocation), validation, rate limiting, helmet | `middleware/`, `server.js` |
| 15 database models with indexes | `backend/models/` |

## Known gaps / next steps (be aware before launching)

This is a solid, working foundation, but it has **not been run end-to-end by me** (no device or database here), so expect to fix small issues on first run. Not yet built or only partial:
- Saving Vibes (posts can be saved; videos can't yet)
- Email sending for password reset, and a real 2FA flow (the toggle is stored, not enforced)
- Music/audio on stories is a title label only (no audio library or playback)
- Image filters are colour overlays (visual only, not baked into the uploaded file)
- Saved/likes/comment counts are eventually consistent (counters, not transactions)
- No automated tests yet; add Jest + Supertest for the API before going to production
- Admin dashboard is inside the app; a web admin panel would be a good later addition
- For production: use MongoDB Atlas, Cloudinary, HTTPS, a strict `CLIENT_URL`, and EAS Build for app-store builds
