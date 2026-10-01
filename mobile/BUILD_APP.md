# Turn the mobile app into an installable app

## Try it instantly (no build)
1. Install **Expo Go** on your phone (Play Store / App Store).
2. `npm install && npx expo install --fix && npx expo start`
3. Scan the QR code. Phone and computer must be on the same Wi-Fi, and `.env` must point to your computer's LAN IP.

## Make a real Android APK you can install and share
1. Deploy the backend somewhere public (Render, Railway, Fly.io) with a MongoDB Atlas database.
2. Put that HTTPS URL in `eas.json` (replace YOUR-DEPLOYED-BACKEND-URL).
3. Free Expo account, then:
   ```
   npm install -g eas-cli
   eas login
   eas build:configure
   npm run build:apk
   ```
4. When the build finishes, Expo gives you a download link for the .apk.

## iPhone
`npm run build:ios` needs a paid Apple Developer account ($99/year).
