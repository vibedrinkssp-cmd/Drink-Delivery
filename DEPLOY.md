# Deployment Guide - Vercel (Frontend) + Render (Backend)

This project is configured for free-tier deployment on Vercel and Render.

## Architecture

- **Frontend (Vercel)**: React + Vite app
- **Backend (Render)**: Express API server
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage

## Step 1: Deploy Backend to Render

1. Create a new account at [render.com](https://render.com)
2. Connect your GitHub repository
3. Create a new **Web Service**
4. Configure:
   - **Name**: `vibe-drinks-api`
   - **Environment**: `Node`
   - **Build Command**: `npm ci --include=dev && npx tsx script/build-server.ts`
   - **Start Command**: `node dist/index.cjs`
   - **Instance Type**: Free

5. Add Environment Variables in Render Dashboard:
   ```
   NODE_ENV=production
   SUPABASE_URL=https://bdiqskitwcryglxfkftm.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   SUPABASE_DATABASE_URL=<your-database-url>
   SESSION_SECRET=<generate-a-random-string>
   FRONTEND_URL=<your-vercel-url-after-step-2>
   ```

6. Deploy and note your Render URL (e.g., `https://vibe-drinks-api.onrender.com`)

## Step 2: Deploy Frontend to Vercel

1. Create account at [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `vite build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

4. Add Environment Variables in Vercel Dashboard:
   ```
   VITE_API_URL=https://your-render-backend.onrender.com
   VITE_SUPABASE_URL=https://bdiqskitwcryglxfkftm.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

5. Deploy

**Note:** Vercel will auto-detect Vite and use the vercel.json configuration provided.

## Step 3: Update Render with Frontend URL

After deploying to Vercel, go back to Render and update:
```
FRONTEND_URL=https://your-app.vercel.app
```

## Important Notes

### Free Tier Limitations

**Render Free Tier:**
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- 750 hours/month (enough for one always-on service)

**Vercel Free Tier:**
- Unlimited static hosting
- 100GB bandwidth/month
- Great for frontends

### Scripts Available

- `npm run dev` - Development (Replit)
- `npm run build` - Build both frontend and backend (for Replit)
- `npm run start` - Start production server
- `npx tsx script/build-server.ts` - Build server only (for Render)

### Supabase Configuration

Make sure your Supabase project has:
1. Storage bucket named `images` with public access
2. Database tables created (run migrations if needed)

### CORS

The backend is configured to accept requests from:
- Your Vercel frontend URL (set via `FRONTEND_URL`)
- localhost for development

## Troubleshooting

**API not responding:**
- Check Render logs
- Ensure environment variables are set correctly
- Wait for cold start if service was sleeping (free tier sleeps after 15 min)

**CORS errors:**
- Verify `FRONTEND_URL` is set correctly in Render
- Include protocol (https://) - e.g., `https://your-app.vercel.app`
- Do NOT include trailing slash

**Build failures:**
- Check Node version (should be 18 or 20)
- Verify all dependencies are in package.json
- Make sure build command is exactly: `npm ci --include=dev && npx tsx script/build-server.ts`
