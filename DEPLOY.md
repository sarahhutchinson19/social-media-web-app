# Deploy to Vercel

## One-time setup

### 1. Push to GitHub
Create a GitHub repo and push this folder.

### 2. Deploy to Vercel
1. Go to https://vercel.com → **Add New → Project**
2. Import your GitHub repo
3. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `ANTHROPIC_API_KEY` | your Anthropic key (`sk-ant-...`) |
   | `BLOTATO_API_KEY` | your Blotato key (Settings → API in Blotato) |
4. Click **Deploy**

## Using the dashboard (hands-off flow)

### First time
1. Open the app → **Blotato tab**
2. Click **Connect & Load Accounts** — your Twitter, Instagram, Facebook, LinkedIn accounts appear
3. Select the correct account for each platform (Innago company pages for Facebook/LinkedIn)
4. Set your preferred **posting time** (e.g. 9:00 AM ET)
5. Make sure **Auto-schedule after generation** is checked

### Every week/month
1. **Configure tab** — set date range, posts per week, any topic boosts
2. Click **Generate Posts** — Claude writes posts and immediately schedules them to Blotato
3. **Review tab** — check posts and scheduling status (✓ chips per platform)
4. That's it — Blotato handles publishing at the scheduled times

### Manual scheduling
If auto-schedule is off, use the **Schedule** button on each post card in the Review tab,
or **Schedule All to Blotato** in the header after generation is complete.

## Local development
```bash
ANTHROPIC_API_KEY=sk-ant-... BLOTATO_API_KEY=your-blotato-key npm run dev
```
Then open http://localhost:3000
