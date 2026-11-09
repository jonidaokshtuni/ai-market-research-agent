# Autonomous AI Market Research Agent

An end-to-end agentic market intelligence application built with **Next.js App Router**, **TypeScript**, **Vercel AI SDK**, **Google Gemini**, **Tavily Search API**, and **Neon Serverless PostgreSQL**.

Instead of relying on static training data or unverified text responses, the agent autonomously decides when to search the live web, scrape competitor URLs, synthesize structured **4-quadrant SWOT reports**, and persist research sessions in PostgreSQL with verifiable source citations.

---

## Key Engineering Features

- **Autonomous Multi-Tool Orchestration:** Uses Vercel AI SDK tool calling (`stepCountIs(10)`) to dynamically route between real-time web discovery (`searchInternet` via Tavily `/search`) and targeted webpage content scraping (`extractWebsite` via Tavily `/extract`).
- **Type-Safe Structured SWOT Reports:** Enforces strict runtime and compile-time JSON schemas (`Output.object` + **Zod**) to render structured **Executive Summaries**, **Key Market Trends**, and **4-Quadrant SWOT Cards** (_Strengths, Weaknesses, Opportunities, Threats_).
- **Verifiable Source Grounding:** Captures every URL and tool execution step across multi-step agent runs and renders clickable source citations alongside tool action badges to prevent hallucinations.
- **Serverless PostgreSQL Persistence:** Stores multi-turn research threads, structured `JSONB` SWOT reports, and citations in **Neon PostgreSQL** using **Drizzle ORM** with cascading session deletion.

---

## System Architecture

```text
┌──────────────────────┐       POST /api/chat        ┌──────────────────────────┐
│   Next.js Frontend   │ ──────────────────────────► │   Next.js API Route      │
│  (React + Tailwind)  │                             │   (Vercel AI SDK)        │
│                      │ ◄────────────────────────── │                          │
│ • Quick Chat Mode    │   JSON + SWOT + Citations   │ • Multi-step Tool Loop   │
│ • SWOT Report Grid   │                             │ • Zod Schema Validation  │
│ • Session Sidebar    │                             └──────┬────────────┬──────┘
└──────────┬───────────┘                                    │            │
           │                                                ▼            ▼
           │ GET/POST/DELETE                      ┌──────────────┐ ┌──────────────┐
           │ /api/sessions                        │ Google Gemini│ │  Tavily API  │
           ▼                                      │ (3.5 Flash)  │ │ /search &    │
┌──────────────────────┐                          └──────────────┘ │ /extract     │
│  Neon PostgreSQL     │ ◄─── Drizzle ORM ─────────────────────────┴──────────────┘
│ (sessions, messages) │
└──────────────────────┘
```

---

## Tech Stack

| Layer                | Technology                              | Purpose                                                       |
| :------------------- | :-------------------------------------- | :------------------------------------------------------------ |
| **Framework**        | Next.js (App Router) & React            | Full-stack client UI and serverless API route handlers        |
| **Language**         | TypeScript                              | End-to-end type safety across UI, API routes, and DB queries  |
| **AI Orchestration** | Vercel AI SDK (`ai`, `@ai-sdk/google`)  | Multi-step tool execution loops and Zod structured outputs    |
| **LLM**              | Google Gemini (`gemini-3.5-flash-lite`) | Reasoning, tool selection, and market intelligence synthesis  |
| **Web Intelligence** | Tavily API (`/search` & `/extract`)     | Real-time web search and clean HTML content extraction        |
| **Database & ORM**   | Neon PostgreSQL & Drizzle ORM           | Relational persistence (`sessions` + `messages` with `JSONB`) |
| **Styling**          | Tailwind CSS                            | Responsive multi-pane dashboard and SWOT quadrant UI          |

---

## Database Schema (`db/schema.ts`)

- **`sessions`**: Tracks individual market research threads (`id`, `title`, `created_at`).
- **`messages`**: Stores user prompts, assistant replies, structured `JSONB` SWOT reports, tool execution logs, and source URLs linked via foreign key (`session_id` with `onDelete: "cascade"`).

---

## Local Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com
cd ai-market-research-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and add your keys:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_studio_key
TAVILY_API_KEY=your_tavily_api_key
DATABASE_URL=your_neon_postgresql_direct_url
DATABASE_URL_POOLED=your_neon_postgresql_pooled_url
```

### 4. Push the database schema to Neon

```bash
npx drizzle-kit push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Future Improvements

- **Upstash Redis Rate Limiting & Query Caching:** Protect public API routes from abuse and cache repeated Tavily searches to reduce latency and API credit usage.
- **User Authentication:** Integrate NextAuth / Clerk so individual users have private, isolated research workspaces.
- **Real-Time Partial Streaming:** Stream SWOT report fields incrementally as the model generates them.
