# Freedom Protocol

**90-day diabetes reversal coaching app powered by Claude AI**

A WhatsApp-based health coaching application that guides users through a structured 90-day protocol to reverse or manage type 2 diabetes and prediabetes, based on Dr. Jason Fung's clinical framework.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Deployment](#deployment)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### How It Works

```
User (WhatsApp) → Meta Cloud API → Your Server → Claude AI → Response → User
```

1. User sends a message on WhatsApp
2. Meta's WhatsApp Cloud API forwards the message to your server
3. Your server retrieves user context from the database
4. Claude AI generates a personalized coaching response
5. Response is sent back to the user via WhatsApp

### Features

- **Personalized AI coaching** via Claude
- **90-day structured protocol** (3 phases of 30 days)
- **Daily check-ins** via scheduled messages
- **Progress tracking** (weight, waist, glucose)
- **Ghanaian/Nigerian food guidance** built into the AI
- **Milestone celebrations** at key days

---

## Prerequisites

Before starting, you'll need:

1. **Node.js 18+** installed on your computer
2. **A Meta Business Account** (free)
3. **An Anthropic API key** (for Claude)
4. **A PostgreSQL database** (Supabase free tier works great)
5. **A hosting platform** (Railway, Render, or similar)

---

## Step-by-Step Setup

### Step 1: Clone and Install Dependencies

```bash
# Navigate to your project folder
cd freedom-protocol

# Install dependencies
npm install
```

### Step 2: Set Up Your Database (Supabase - Recommended)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to Ghana/Nigeria)
3. Wait for the project to be ready (~2 minutes)
4. Go to **Project Settings** → **Database**
5. Copy the **Connection string** (URI format)
   - It looks like: `postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres`

### Step 3: Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Go to **API Keys**
4. Create a new key and copy it

### Step 4: Set Up WhatsApp Cloud API

This is the most complex step. Follow carefully:

#### 4.1 Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Create a business account (or use existing)

#### 4.2 Create a Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Fill in app details and create

#### 4.3 Add WhatsApp Product

1. In your app dashboard, find **Add Products**
2. Find **WhatsApp** and click **Set Up**
3. You'll see **API Setup** - this is where you get your credentials

#### 4.4 Get Your Credentials

From the WhatsApp API Setup page:

1. **Phone Number ID**: Find under "From" phone number (e.g., `1234567890123456`)
2. **Temporary Access Token**: Click "Generate" (valid 24 hours - we'll make it permanent later)

#### 4.5 Add a Test Phone Number

1. Under "To" in API Setup, click **Manage phone number list**
2. Add your WhatsApp number (this is for testing)
3. You'll receive a verification code on WhatsApp

### Step 5: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your values:

```env
# Server
PORT=3000
NODE_ENV=development

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=your_token_from_step_4
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_from_step_4
WEBHOOK_VERIFY_TOKEN=freedom_protocol_2024

# Anthropic
ANTHROPIC_API_KEY=your_key_from_step_3

# Database
DATABASE_URL=your_supabase_connection_string_from_step_2
```

### Step 6: Initialize the Database

```bash
npm run db:init
```

You should see:
```
🔧 Initializing database...
✅ Database schema created successfully!
📋 Tables created:
   - daily_logs
   - messages
   - phase_completions
   - users
   - weekly_measurements
```

### Step 7: Test Locally

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║   🏃 FREEDOM PROTOCOL SERVER RUNNING                       ║
║   Port: 3000                                               ║
╚════════════════════════════════════════════════════════════╝
```

---

## Deployment

### Deploy to Railway (Recommended)

Railway is the easiest option for Node.js apps.

#### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

#### 2. Deploy from GitHub

1. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/freedom-protocol.git
git push -u origin main
```

2. In Railway:
   - Click **New Project**
   - Select **Deploy from GitHub repo**
   - Choose your repository

#### 3. Add Environment Variables

1. In Railway, go to your project
2. Click on **Variables**
3. Add all variables from your `.env` file

#### 4. Get Your Public URL

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy your URL (e.g., `https://freedom-protocol-production.up.railway.app`)

### Configure WhatsApp Webhook

Now we need to tell WhatsApp where to send messages.

1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App
2. Go to **WhatsApp** → **Configuration**
3. Under **Webhook**, click **Edit**
4. Enter:
   - **Callback URL**: `https://your-railway-url.up.railway.app/webhook`
   - **Verify token**: `freedom_protocol_2024` (must match your env variable)
5. Click **Verify and Save**
6. Under **Webhook fields**, subscribe to: `messages`

### Make Access Token Permanent

The temporary token expires in 24 hours. To get a permanent one:

1. Go to **Business Settings** → **System Users**
2. Create a system user (Admin role)
3. Add your WhatsApp app as an asset
4. Generate a permanent access token
5. Update your Railway environment variable

---

## Testing

### Test the Webhook

1. Open WhatsApp on your phone
2. Message the test number from Meta (shown in API Setup)
3. Send "Hello"
4. You should receive a response asking you to register

### Test User Registration

Create a test user via API:

```bash
curl -X POST https://your-railway-url/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "233XXXXXXXXX",
    "name": "Test User",
    "country": "Ghana",
    "has_diabetes": true,
    "on_medication": false,
    "eating_window_start": "12:00",
    "eating_window_end": "20:00",
    "why_starting": "Testing the app"
  }'
```

Then message the WhatsApp number and say "START" to begin.

---

## Troubleshooting

### "Webhook verification failed"

- Check that `WEBHOOK_VERIFY_TOKEN` matches exactly in both places
- Make sure your server is running and publicly accessible

### "Messages not being received"

- Check Railway logs: `railway logs`
- Verify webhook subscription includes `messages`
- Make sure your phone number is in the test list

### "Claude API errors"

- Verify your Anthropic API key is correct
- Check you have credits in your Anthropic account

### "Database connection failed"

- Check your DATABASE_URL is correct
- Make sure SSL is enabled for Supabase
- Try connecting with psql to verify credentials

---

## Project Structure

```
freedom-protocol/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   └── index.js          # Configuration
│   ├── routes/
│   │   └── webhook.js        # WhatsApp webhook handler
│   ├── services/
│   │   ├── claude.js         # Claude AI integration
│   │   ├── whatsapp.js       # WhatsApp API wrapper
│   │   └── protocol.js       # Protocol business logic
│   ├── prompts/
│   │   └── system-prompt.js  # Claude coaching prompt
│   ├── db/
│   │   ├── index.js          # Database connection
│   │   ├── init.js           # Schema initialization
│   │   └── queries.js        # Database queries
│   └── scheduler/
│       └── daily-checkin.js  # Scheduled messages
├── .env.example              # Environment template
├── package.json
└── README.md
```

---

## Next Steps

1. **Build an onboarding form** - A simple web form that calls `/api/users`
2. **Add a dashboard** - Show users their progress (optional)
3. **Get a dedicated WhatsApp number** - Apply for WhatsApp Business API access
4. **Collect beta users** - Start with 10-20 users and iterate

---

## Support

Built by Patrick. For questions, reach out via your usual channels.

---

## License

Private - All rights reserved.
