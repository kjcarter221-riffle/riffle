# Riffle - AI-Powered Fly Fishing Companion

A Progressive Web App (PWA) for fly anglers featuring AI-powered fly recommendations, real-time river conditions, and community hatch reports.

## Features

- **AI Fly Guide** - Get personalized fly recommendations based on current conditions
- **Real-Time Conditions** - Weather, USGS river data, moon phases, fishing scores
- **Trip Journal** - Log your trips with photos, conditions, and patterns used
- **Community Hatch Reports** - See what's hatching near you
- **Works Offline** - PWA that works without internet at the river
- **Subscription Model** - Free tier + Pro ($12.99/month)

## Quick Start (5 minutes)

### Prerequisites

- Node.js 18+ installed
- A Stripe account (free to create)
- An OpenAI API key

### Step 1: Install Dependencies

```bash
cd riffle
npm install
```

### Step 2: Run Setup Script

```bash
npm run setup
```

This will prompt you for your API keys and create the `.env.local` file.

### Step 3: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Manual Configuration

If you prefer to set up manually, copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your API keys:

```env
# Required for AI Chatbot
OPENAI_API_KEY=sk-your-key-here

# Required for Payments
STRIPE_SECRET_KEY=sk_test_your-key-here
STRIPE_PRICE_ID=price_your-price-id
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Optional - improves weather accuracy
OPENWEATHER_API_KEY=your-key-here

# Security - CHANGE THIS IN PRODUCTION
JWT_SECRET=generate-a-long-random-string
```

## Setting Up Stripe

### 1. Create a Product & Price

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) > Products
2. Click **Add Product**
3. Name: "Riffle Pro"
4. Price: $12.99/month (recurring)
5. Copy the Price ID (starts with `price_`)

### 2. Get API Keys

1. Go to Developers > API Keys
2. Copy your **Secret Key** (starts with `sk_test_` for test mode)

### 3. Set Up Webhooks (for production)

1. Go to Developers > Webhooks
2. Click **Add Endpoint**
3. URL: `https://your-domain.com/api/stripe/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing Secret** (starts with `whsec_`)

## Deployment

### Option 1: Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Option 2: Railway

1. Create new project at [Railway](https://railway.app)
2. Connect GitHub repo
3. Add environment variables
4. Deploy!

### Option 3: Self-Hosted

```bash
npm run build
npm start
```

## Revenue Model

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 journal entries/month, basic AI, view reports |
| Pro | $4.99/mo (launch) | Unlimited entries, advanced AI, offline mode, analytics |

**Launch pricing:** $4.99/month for first 100 users (normally $12.99)

**To hit $1,000/month:** ~200 Pro subscribers at launch price

## Growth Strategy

1. **Launch** - Post on r/flyfishing, fly fishing Facebook groups
2. **Content** - Create helpful fishing content linking to the app
3. **SEO** - Target "fly fishing app" and location-based terms
4. **Community** - Hatch reports create network effects
5. **Word of mouth** - Anglers share good tools with each other

## Tech Stack

- **Framework:** Next.js 14
- **Database:** SQLite (via better-sqlite3)
- **Styling:** Tailwind CSS
- **AI:** OpenAI GPT-4o-mini
- **Payments:** Stripe
- **Weather:** OpenWeatherMap API
- **River Data:** USGS Water Services API (free)

## Project Structure

```
riffle/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── api/          # API routes
│   │   ├── chat/         # AI chatbot
│   │   ├── conditions/   # Weather/river conditions
│   │   ├── journal/      # Trip logging
│   │   └── community/    # Hatch reports
│   ├── components/       # React components
│   └── lib/              # Utilities
├── public/               # Static files, PWA manifest
├── data/                 # SQLite database (gitignored)
└── scripts/              # Setup scripts
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/me` | GET | Get current user |
| `/api/chat` | POST | AI chat |
| `/api/conditions` | GET | Weather & conditions |
| `/api/journal` | GET/POST/DELETE | Journal entries |
| `/api/hatch` | GET/POST | Hatch reports |
| `/api/rivers` | GET | USGS river data |
| `/api/stripe/checkout` | POST | Create checkout |
| `/api/stripe/webhook` | POST | Stripe webhooks |

## Maintenance (1-2 hrs/week)

- Check Stripe dashboard for revenue
- Respond to support emails
- Post in fishing communities occasionally
- Monitor error logs

## Future Features (for later sessions)

- [ ] Fly tying tutorials
- [ ] Trip planning with packing lists
- [ ] Follow other anglers
- [ ] Photo gallery
- [ ] Personal analytics dashboard
- [ ] Push notifications for conditions

## Support

If you run into issues, the most common fixes are:

1. **"Stripe not configured"** - Add your Stripe keys to `.env.local`
2. **"AI not responding"** - Check your OpenAI API key
3. **Database errors** - Delete `data/riffle.db` and restart

## License

MIT - Use this code however you want!

---

Built with Riffle 🎣
