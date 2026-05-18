# Studybo Instagram Intelligence System

A production-ready Node.js backend for **Instagram trend discovery and marketing intelligence** for the Studybo student productivity app.

> ⚠️ **Important**: This system is ONLY for content discovery, trend analysis, and manual marketing research. It does NOT automate likes, comments, DMs, or any other engagement activity that would violate Instagram's Terms of Service.

---

## Features

- 🔍 **Apify Integration** — Scrapes trending Instagram posts/reels via hashtags
- 🧹 **Filtering Engine** — Rejects coaching ads, flags authentic student content
- 📊 **Ranking Engine** — Scores posts intelligently (reels, POV hooks, student creators)
- 👤 **Creator Analytics** — Identifies high-potential micro-creators for outreach
- 📈 **Hashtag Tracking** — Trend scores, engagement history, and hook extraction
- ⏰ **Auto Scheduler** — Runs every 2 hours via node-cron
- 📁 **CSV Export** — Export top posts and creators for manual review
- 🌐 **REST API** — 10+ endpoints for dashboard integration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB Atlas + Mongoose |
| Scraping | Apify Instagram Scraper |
| Scheduler | node-cron |
| HTTP Client | Axios |

---

## Project Structure

```
insta_scrapper/
├── server.js                    # Entry point
├── .env.example                 # Environment variable template
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── env.js               # Env variable validation
│   ├── controllers/
│   │   ├── scrapeController.js  # POST /scrape handler
│   │   ├── postController.js    # Post API handlers
│   │   ├── creatorController.js # Creator API handlers
│   │   └── hashtagController.js # Hashtag API handlers
│   ├── jobs/
│   │   └── scheduler.js         # node-cron scheduler
│   ├── models/
│   │   ├── RawPost.js           # Raw scraped post schema
│   │   ├── FilteredPost.js      # Scored & ranked post schema
│   │   ├── Creator.js           # Creator analytics schema
│   │   └── Hashtag.js           # Hashtag performance schema
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── scrape.js
│   │   ├── posts.js
│   │   ├── creators.js
│   │   └── hashtags.js
│   ├── services/
│   │   ├── apifyService.js      # Apify API integration
│   │   ├── filterService.js     # Content filtering engine
│   │   ├── rankingService.js    # Scoring engine
│   │   ├── creatorService.js    # Creator analytics
│   │   ├── hashtagService.js    # Hashtag tracking
│   │   ├── exportService.js     # CSV export
│   │   └── pipelineService.js   # Full pipeline orchestrator
│   └── utils/
│       ├── logger.js            # Structured logger
│       └── duplicateCheck.js    # Dedup utility
└── frontend/                    # React dashboard (see frontend/README.md)
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB Atlas account and cluster
- Apify account with API token

### 1. Clone & Install

```bash
cd insta_scrapper
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/studybo_instagram
APIFY_TOKEN=your_apify_token_here
APIFY_ACTOR_ID=apify~instagram-scraper
SCRAPE_RESULTS_LIMIT=50
SCRAPE_RESULTS_TYPE=posts
CRON_SCHEDULE=0 */2 * * *
DEFAULT_HASHTAGS=studygram,studywithme,neetprep,jee2026,upsc,productivity,deepwork,notetaking
```

### 3. Run in Development

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

### 4. Run in Production

```bash
npm start
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas connection string |
| `APIFY_TOKEN` | **Yes** | — | Apify API token |
| `APIFY_ACTOR_ID` | No | `apify~instagram-scraper` | Apify actor to use |
| `SCRAPE_RESULTS_LIMIT` | No | `50` | Max posts per hashtag per run |
| `SCRAPE_RESULTS_TYPE` | No | `posts` | Content type: `posts`, `reels`, `stories` |
| `CRON_SCHEDULE` | No | `0 */2 * * *` | Cron schedule (every 2 hours) |
| `DEFAULT_HASHTAGS` | No | (8 defaults) | Comma-separated hashtag list |

---

## How Scraping Works

1. **Trigger**: Either via cron (every 2 hours) or `POST /api/scrape`
2. **Apify Call**: Builds hashtag explore URLs and calls `apify/instagram-scraper`
3. **Polling**: Polls the Apify run every 5 seconds until status = `SUCCEEDED`
4. **Fetch**: Downloads all dataset items (raw posts)
5. **Dedup**: Skips posts already in the database (by `shortCode`)
6. **Store**: Saves new raw posts to `raw_posts` collection

---

## How Filtering Works

Posts are processed through `filterService.js`:

**Reject** (post discarded) if caption contains:
- `admissions open`, `academy`, `coaching institute`, `register now`, `call now`, `enroll today`, etc.

**Prefer** (boost score) if caption contains:
- `POV`, `exam`, `revision`, `burnout`, `productivity`, `study routine`, `motivation`, `night study`, `discipline`, etc.

**Detect**:
- Post type: reel, carousel, image
- Creator type: student, educational, general
- Micro-creator: followers between 1k–100k

---

## How Ranking Works

Each post receives a `contentScore` based on this matrix:

| Signal | Points |
|---|---|
| Is a Reel | +20 |
| Is a Carousel | +10 |
| Caption has POV hook | +15 |
| Emotional/motivational caption | +10 |
| Student/educational creator | +20 |
| ≥3 target hashtags match | +15 |
| Coaching ad detected (penalty) | −50 |

Maximum possible score: **90 points**

---

## How the Cron Scheduler Works

Configured in `src/jobs/scheduler.js`:

- **Default schedule**: `0 */2 * * *` (every 2 hours at minute :00)
- **Timezone**: Asia/Kolkata (IST)
- **Guard**: Skips a run if the previous one is still in progress
- **Override**: Change `CRON_SCHEDULE` in `.env` to any valid cron expression

Example schedules:
```
0 */2 * * *    — every 2 hours
0 */6 * * *    — every 6 hours
0 9,21 * * *   — at 9am and 9pm daily
```

---

## API Endpoints

### Health
```
GET  /health              Backend status
GET  /api/health          Same (under /api prefix)
```

### Scraping
```
POST /api/scrape
Body: { hashtags: ["studygram", ...], resultsType: "posts", resultsLimit: 50 }
```

### Posts
```
GET  /api/posts/top           Top ranked posts (sorted by contentScore)
GET  /api/posts/reels         Reel posts only
GET  /api/posts/carousels     Carousel posts only
GET  /api/posts/export        Download CSV

Query params: ?limit=20&page=1
```

### Creators
```
GET  /api/creators/top        Top creators by avg score
GET  /api/creators/micro      Micro-creators (1k–100k followers)
GET  /api/creators/export     Download CSV
GET  /api/creators/:username  Single creator profile + recent posts

Query params: ?limit=20&page=1&priority=high&creatorType=student
```

### Hashtags
```
GET  /api/hashtags/trending           Trending hashtags by trend score
GET  /api/hashtags/:hashtag           Single hashtag stats
GET  /api/hashtags/:hashtag/history   Time-series history
```

---

## Changing Scrape Type

To switch between scraping **posts**, **reels**, or **stories**:

1. Open `.env`
2. Change `SCRAPE_RESULTS_TYPE=posts` to `reels` or `stories`
3. Restart the server

Or pass it dynamically per request:
```json
POST /api/scrape
{
  "hashtags": ["studygram"],
  "resultsType": "reels",
  "resultsLimit": 30
}
```

---

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `raw_posts` | Original unmodified scraped data |
| `filtered_posts` | Processed, scored, and ranked posts |
| `creators` | Aggregated per-creator analytics |
| `hashtags` | Hashtag performance with time-series history |

---

## Deployment Suggestions

### Railway / Render (Recommended for Solo Projects)
1. Push to GitHub
2. Connect to Railway or Render
3. Add environment variables via dashboard
4. Deploy — it will auto-run `npm start`

### PM2 (VPS)
```bash
npm install -g pm2
pm2 start server.js --name studybo-api
pm2 save
pm2 startup
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Frontend Dashboard

See [frontend/README.md](./frontend/README.md) for the React dashboard setup.

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Important Legal Notes

This system is built for **internal marketing intelligence only**:

✅ Discovering trending content  
✅ Analyzing hashtag performance  
✅ Identifying potential creator partners  
✅ Manual outreach planning  

❌ Automated liking  
❌ Automated commenting  
❌ Automated DMs  
❌ Mass following/unfollowing  

Always comply with [Instagram's Terms of Service](https://help.instagram.com/581066165581870) and [Apify's usage policies](https://apify.com/legal).
