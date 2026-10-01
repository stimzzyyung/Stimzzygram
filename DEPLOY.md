# Deploy Stimzzy'sgram (Render + MongoDB Atlas)

Website screens change from time to time, so button names may differ slightly. The steps stay the same.

## Pick your region first
Users in Lagos get the best speed from the **Frankfurt (Europe)** region. Use Frankfurt for BOTH Atlas and Render so they sit next to each other.

## Step 1: Database (MongoDB Atlas, free)
1. Create an account at mongodb.com/atlas and create a free cluster (M0).
2. Choose a Frankfurt / Europe region.
3. Database Access: create a database user with a password. Save both.
4. Network Access: add IP `0.0.0.0/0` (Render's free plan has no fixed IP).
5. Connect > Drivers: copy the connection string and replace `<password>` with yours. Add the database name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/stimzzysgram`

## Step 2: Put the code on GitHub
1. Create a GitHub repository and upload the whole `stimzzysgram` folder.
2. `.env` files are already ignored by `.gitignore`, so your secrets stay private. Never upload them.

## Step 3: Backend (Render)
1. Sign in at render.com > New > **Web Service** > connect your GitHub repo.
2. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Region: Frankfurt
   - Health Check Path: `/api/health`
3. Environment variables (Add each one):
   - `NODE_ENV` = `production`
   - `MONGO_URI` = your Atlas string from Step 1
   - `JWT_SECRET` = a long random string (30+ characters)
   - `CLIENT_URL` = `*`
   - `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` (for Rizz Bot)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (**required in production**: Render's disk is wiped on every deploy, so local uploads would disappear)
4. Deploy. When done, open `https://YOUR-APP.onrender.com/api/health`. You should see `{"success":true,...}`.

## Step 4: Point the app at your server
- Testing with Expo Go: in `mobile/.env` set `EXPO_PUBLIC_API_URL=https://YOUR-APP.onrender.com`, then restart `npx expo start`.
- Building an APK: put the same URL in `mobile/eas.json` (both places), then `npm run build:apk`.

## Step 5: Make yourself admin
Register in the app, then in Render open your service > **Shell** and run:
`npm run make-admin -- you@email.com`

## Avoid the "sleeping server" delay
Render's free plan sleeps after about 15 minutes idle, and the next request can take 30 to 60 seconds. Options:
- Upgrade the service to a paid instance (cheapest reliable fix).
- Or use a free uptime monitor (UptimeRobot) to ping `/api/health` every 5 minutes. This helps, but can break if the provider changes its free-plan rules.

## Before real users arrive
- Rotate any key you pasted into a chat or screenshot.
- Check MongoDB Atlas backups are on.
- Set up a real email service so password reset codes are emailed (currently only printed in server logs).
