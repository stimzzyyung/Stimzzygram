# 🍷 StimzzyVibe (with 🤖 AI Rizz Bot)

Connect. Share. Vibe. **StimzzyVibe** is a modern, polished mobile social-media application that blends the best ideas from **Instagram** (feed, stories, explore grid), **Snapchat** (profiles, circular avatars, disappearing snaps, View Once, vibe scores), and **Telegram** (group chats, document sharing, voice notes, message editing, forwarding, and read receipts), centered around a distinctive **Burgundy brand identity** and a dedicated **AI Rizz Bot**.

```
Stimzzygram/
├── backend/   Node.js + Express + MongoDB Atlas + Socket.IO
└── mobile/    React Native (Expo SDK 51) app
```

---

## 🌟 Key Features

### 1. App Identity & Burgundy Branding
* **Primary Brand Color**: Deep Burgundy (`#800020`, `#7D1128`, `#A31D3B`) paired with luxury gold accents (`#D4AF6A`) and sleek neutral tones.
* **Modern Typography**: Distinctive, youthful wordmark using *Outfit* & *Plus Jakarta Sans*.

### 2. Account Creation & Smart Localization
* **Profile Fields**: Full name, username, email, password, date of birth, country, language, and circular profile picture.
* **Country & Language Mapping**: Selecting a country automatically selects its primary language (*Nigeria → English*, *France → French*, *Spain → Spanish*, *Germany → German*, *Brazil → Portuguese*, etc.).
* **Searchable Language Dropdown**: Full support for international & African languages (English, French, Spanish, Portuguese, German, Arabic, Chinese, Japanese, Korean, Hindi, Yoruba, Igbo, Hausa, Swahili, etc.).
* **Gmail Detection & Google Auth**: Detects Google/Gmail addresses in real time with 1-tap Google Authentication (never storing users' Gmail passwords).
* **6-Digit Email OTP Recovery**:
  * Forgot Password → Enter email → 6-digit verification code with 15-minute expiration and rate limiting → Verify OTP → New Password & Confirm → Automatic login.

### 3. Snapchat-Inspired Profile & Snaps
* **Circular Profile Pictures**: Camera capture or gallery selection with preview before saving, remove photo option, and automatic app-wide sync.
* **User Badges**: VIP StimzzyVibe badge, location & language display (`📍 Nigeria · 🗣️ English`), followers/following counts, bio, and vibe moods.
* **Vibe Studio**: Customizable Snapchat-style avatar moods, custom frames, and vibe score.

### 4. Instagram-Style Feed & Stories
* **Home Feed**: Photos, videos, multi-media carousel posts, and text posts with smooth vertical scrolling.
* **Post Interactions**: Like, comment, share, save, send to direct chat, report, and delete own post.
* **Video Player**: Autoplay on viewport focus, play/pause, mute/unmute, progress indicator, and fullscreen video modal.
* **Stories**: Horizontal story bar, photo/video uploads, text, Stimzzy stickers (`🍷 STIMZZY VIBE`, `👑 VIP`), music, viewer tracking list, and 24h auto-expiration.

### 5. Telegram-Style Messaging & Group Chats
* **Direct & Group Chats**: 1-to-1 encrypted conversations and group chats with custom avatars, descriptions, admin privileges, member management, and permissions.
* **Rich Attachments**: Text, images, videos, voice recordings, and document/file uploads (PDF, DOCX, ZIP) up to 100MB with file size indicators.
* **Chat Controls**: Quoted replies, emoji reactions, message editing (`[edited]`), message forwarding, deletion, and in-chat keyword search.
* **Message Delivery Status**: 🕒 Sending, ✓ Sent, ✓✓ Delivered, ✓✓ (Gold) Read.

### 6. 👀 View Once & Disappearing Media
* **View Once Photo / Video**: Send photos and videos that can only be opened once.
* **Auto-Burn Engine**: Once viewed and closed, the media URL is removed from the chat and the status updates to `👀 Opened (View Once) · Media disappeared`; Premium replay copies remain available only during the 24-hour window.
* **Premium Replay & Save**: Premium users can replay a received View Once snap for 24 hours, double-tap while viewing to save it in the app and device gallery, and revisit saved snaps from Inbox.
* **Flexible Durations**: Choose between `👀 View Once`, `5s Disappearing`, and `10s Disappearing`.

### 7. 🤖 Dedicated AI Rizz Bot
* **9 Specialized Categories**:
  1. *Romantic*
  2. *Funny*
  3. *Flirty*
  4. *Confident*
  5. *Cute*
  6. *Savage*
  7. *Conversation Starter*
  8. *First Message*
  9. *Dating Reply*
* **Response Generation**: Paste any received message (*"Why are you always smiling?"* → *"Maybe because you keep giving me reasons to 😉"*).
* **Live Modifiers**: `Copy`, `Regenerate`, `😉 More Flirty`, `😂 More Funny`, `👑 More Confident`, `✂️ Make It Shorter`, and `Use in Chat`.
* **Direct Chat Launcher**: Tap the sparkle icon directly inside any conversation input bar to get instant reply suggestions.

### 8. 🌍 Individual Translation System
* **Settings Toggle**: `Translator: ON/OFF` with default language selection.
* **In-Line `[Translate ▼]` Buttons**: Displays directly beneath individual messages and post captions without forcing entire conversations to translate.
* **14+ Languages**: Instant translation into English, French, Spanish, Portuguese, German, Arabic, Chinese, Japanese, Korean, Hindi, Yoruba, Igbo, Hausa, Swahili, and more.

### 9. ⭐ StimzzyVibe Premium & Dynamic Currency
* **Configurable Base Pricing**: ₦2,000 NGN base subscription configured in backend.
* **Dynamic FX Conversion**: Converts base price into local user currencies without hardcoding:
  * Nigeria: **₦2,000 NGN**
  * United States: **$1.35 USD**
  * United Kingdom: **£1.05 GBP**
  * Europe: **€1.25 EUR**
  * Ghana: **GH₵20 GHS**
  * South Africa: **R25 ZAR**
  * Kenya: **KSh175 KES**
* **Payment Gateways**: Paystack / Flutterwave for Nigeria and Africa, Stripe for international cards.
* **VIP Perks**: StimzzyVibe VIP badge, gold avatar frames, extended 7-day story durations, higher AI usage limits, and priority translations.

### 10. 🛡️ Administrator Dashboard
* **Platform Telemetry & Stats**: Total users, 24h active users, 7d new users, total posts/videos, and flagged content counts.
* **Content Moderation**: Review open reports on posts, videos, comments, and messages with 1-tap delete or dismiss actions.
* **Subscription Management**: Full ledger of active subscriber IDs, usernames, plans, amounts, currencies, payment providers, and dates.
* **Pricing Manager**: View and adjust the platform base price in NGN with real-time conversion rates preview.
* **User Management**: Search users, suspend/unsuspend, grant/revoke verified badges, and ban/delete accounts.
* **Hashtag Governance**: Search and ban/unban hashtags.

---

## 🚀 Getting Started

### 1. Run the Backend

Requirements: **Node 18+**, **MongoDB** (local or free MongoDB Atlas cluster).

```bash
cd backend
npm install
cp .env.example .env    # configure your MongoDB & secrets
npm run dev             # Server listens at http://localhost:5000
```

#### Environment Variables (`backend/.env`):
* `MONGO_URI` – MongoDB Atlas connection URI
* `JWT_SECRET` – Secret for signing session tokens
* `AI_API_KEY`, `AI_MODEL`, `AI_PROVIDER` – Required to generate Rizz Bot replies and use AI translations; Rizz Bot reports a provider error instead of returning canned replies when AI is unavailable
* `CLOUDINARY_*` – Optional cloud media storage (falls back to local `/uploads` if not configured)
* `RESEND_API_KEY` – Optional API key for password reset OTP delivery (logs code to console in development)

Make yourself an admin (after registering in the app):
```bash
npm run make-admin -- your_email@domain.com
```

---

### 2. Run the Mobile App

Requirements: **Node 18+**, **Expo Go (SDK 51)** on Android or iOS.

```bash
cd mobile
npm install
cp .env.example .env    # set EXPO_PUBLIC_API_URL to your computer's LAN IP
npx expo start -c
```

* Open on Android: Press **`a`** (or scan QR code from Expo Go app).
* Open on iOS: Press **`i`** (or scan QR code with Camera app).

---

## 🛠️ Tech Stack

* **Frontend**: React Native, Expo SDK 51, React Navigation, Expo AV, Expo Linear Gradient, Socket.IO Client.
* **Backend**: Node.js, Express.js, MongoDB Atlas, Mongoose, Socket.IO, Multer, Argon2/bcrypt.
* **Security**: JWT tokens, OTP expiration, rate limiting, helmet, input validation, role-based authorization.
