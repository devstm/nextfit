# Nexfiit: Smart PT & Sports Club Matching Platform

Nexfiit is an intent-based fitness platform that connects users with personal trainers and clubs through "Deep Search"—focusing on goals and lifestyle rather than just location.

## 🚀 The Stack
- **Frontend**: Next.js (App Router) for high-performance UI and SEO.
- **Backend (Decoupled)**: Supabase Edge Functions (Deno/TypeScript) for global, independent logic scaling.
- **Database**: PostgreSQL (Supabase) managed via **Migration-Led Workflow**.
- **Security**: Row Level Security (RLS) and custom Edge Function validation.

## 🧠 Core Feature: "Deep Search"
Uses a scoring system to match free-text user intent (e.g., "lose weight at home") with trainer specializations and club facilities.