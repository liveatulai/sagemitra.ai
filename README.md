# SageMitra - AI Wisdom Companion Platform

**Chat with Divine Sages & Visionary Leaders** — An AI-powered platform that connects users with wisdom from spiritual masters, scientists, and modern innovators.

![SageMitra](https://img.shields.io/badge/Platform-SageMitra-purple)
![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green)

## 🌟 Overview

SageMitra is an AI-powered wisdom platform where users can have meaningful conversations with AI avatars representing legendary figures like Buddha, Einstein, Ramana Maharshi, Nikola Tesla, Steve Jobs, and more. Each avatar maintains its unique personality, teaching style, and wisdom tradition.

## ✨ Key Features

### 🗣️ AI Chat Companions
- **14+ Pre-built Avatars**: Spiritual sages (Buddha, Ramana Maharshi, Guru Nanak), Scientists (Einstein, Tesla, Carl Jung), and Modern Innovators (Elon Musk, Steve Jobs)
- **Personalized Responses**: Each avatar responds in character with relevant wisdom and modern context
- **Presence Indicators**: Physical cues and gestures to make conversations feel alive
- **Follow-up Suggestions**: AI-generated conversation starters after each response

### 🎨 Custom Avatar Creation
- **AI-Powered Profile Generation**: Describe any person/character and get a complete avatar profile
- **Knowledge Base Support**: Upload PDFs, documents, or fetch content from URLs to enrich avatar knowledge
- **Image Options**: AI-generate images, upload your own, or import from URLs
- **Tags & Categories**: Organize avatars with custom tags

### 💰 Credit System
- **100 Free Credits** on signup
- **1 Credit per Chat** message
- **Referral Rewards**: Earn 50 credits per successful referral
- **Milestone Bonuses**: Earn credits for achievements (first chat, creating avatars, etc.)
- **Credit Requests**: Request additional credits with admin approval

### 👥 Social Features
- **Referral System**: Share personalized referral links
- **Leaderboard**: Top referrers displayed publicly
- **Favorites**: Mark avatars as favorites for quick access

### 🛡️ Admin Dashboard
- **Analytics**: User growth, chat statistics, credit trends
- **Avatar Management**: Enable/disable avatars, regenerate images, optimize prompts
- **User Management**: Adjust credits, assign roles
- **Credit Request Processing**: Approve/reject credit requests
- **Feedback Management**: View and respond to user feedback

## 🏗️ Architecture

### Frontend
```
src/
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   ├── ChatInterface.tsx      # Main chat UI
│   ├── AvatarGrid.tsx         # Avatar selection gallery
│   ├── PresenceLayer.tsx      # Physical cue animations
│   └── ...
├── contexts/           # React contexts (Auth)
├── pages/              # Route pages
│   ├── Index.tsx       # Landing page
│   ├── Avatars.tsx     # Avatar selection
│   ├── Chat.tsx        # Chat interface
│   ├── CreateAvatar.tsx # Custom avatar creation
│   ├── Credits.tsx     # Credit management
│   ├── Admin.tsx       # Admin dashboard
│   └── ...
├── hooks/              # Custom hooks
├── lib/                # Utility functions
└── integrations/       # Supabase client
```

### Backend (Supabase Edge Functions)
```
supabase/functions/
├── chat/               # AI chat completion with Lovable AI
├── create-avatar/      # AI-powered avatar profile generation
├── generate-avatar-image/  # AI image generation
├── optimize-avatar/    # Prompt optimization with AI
├── detect-mood/        # Sentiment analysis
├── summarize-conversation/ # Chat summarization
├── fetch-knowledge-from-url/ # Web content extraction
├── parse-document/     # PDF/DOCX parsing
├── admin-*/            # Admin operations
├── request-credits/    # Credit request submission
├── process-credit-request/ # Admin credit approval
└── process-referral/   # Referral reward processing
```

### Database Schema (Supabase)
- **avatars**: Pre-built system avatars
- **user_avatars**: Custom user-created avatars
- **chat_sessions**: Conversation sessions
- **chat_messages**: Individual messages with reactions
- **credits**: User credit balances
- **credit_transactions**: Credit history
- **credit_requests**: Pending credit requests
- **profiles**: User profiles with preferences
- **referrals**: Referral tracking
- **user_roles**: Admin/moderator roles
- **user_milestones**: Achievement tracking
- **mood_logs**: Sentiment analysis logs

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- Supabase account (connected via Lovable Cloud)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
The following are auto-configured by Lovable Cloud:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

Backend secrets (configured in Supabase):
- `LOVABLE_API_KEY` - Lovable AI gateway key (auto-provisioned)
- `GEMINI_API_KEY` - Google Gemini API (optional)
- `OPENAI_API_KEY` - OpenAI API (optional)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 with TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | React Query (TanStack) |
| **Routing** | React Router v6 |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **AI** | Lovable AI Gateway (Gemini 2.5 Flash) |
| **Animation** | Framer Motion |
| **Authentication** | Supabase Auth |

## 📱 Pages & Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Landing page | No |
| `/auth` | Login/Signup | No |
| `/avatars` | Avatar gallery | Yes |
| `/chat/:sessionId` | Chat interface | Yes |
| `/create-avatar` | Create custom avatar | Yes |
| `/credits` | Credit management | Yes |
| `/feedback` | Submit feedback | Yes |
| `/admin` | Admin dashboard | Yes (Admin role) |
| `/pricing` | Pricing info | No |
| `/leaderboard` | Referral leaderboard | No |
| `/blog` | Blog/content | No |
| `/terms` | Terms of service | No |
| `/privacy` | Privacy policy | No |

## 🔐 Security

- **Row Level Security (RLS)**: All database tables protected with RLS policies
- **Role-based Access**: Admin/moderator roles for sensitive operations
- **Secure Edge Functions**: All AI calls through authenticated edge functions
- **Credit System**: Prevents abuse with per-message deduction

## 🎯 Product Philosophy

SageMitra bridges **timeless wisdom** with **modern context**:
- Avatar responses include a "Modern Context Adapter" that translates ancient wisdom to 2025 realities
- Addresses contemporary issues: mental health, relationships, technology, work-life balance
- Maintains character authenticity while being relatable

## 📊 Credit Economics

| Action | Credits |
|--------|---------|
| Signup bonus | +100 |
| Chat message | -1 |
| Avatar optimization | -5 |
| Successful referral | +50 |
| First chat milestone | +10 |
| First avatar milestone | +5 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary. All rights reserved.

## 🔗 Links

- **Lovable Project**: [Edit on Lovable](https://lovable.dev/projects/aab110c1-84a3-4848-aa85-2ffd1d915cd9)
- **Documentation**: [Lovable Docs](https://docs.lovable.dev)

---

Built with ❤️ using [Lovable](https://lovable.dev)
