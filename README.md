I actually shipped :)

---

# Quicksub

Quicksub is a small web app that turns any video into **instant, multilingual subtitles**.

1. Upload a local video file *or* paste a YouTube link.
2. The backend uses OpenAI Whisper to create an English `.srt` transcription.
3. With one click, subtitles can be machine-translated into 15+ languages via GPT-3.5.
4. Download the result or keep it stored in your account.

There's a **Free** tier (2 transcriptions / month) you can use at quicksub.app or you can self host :)

Tech stack:
- Next.js 14 App Router & React Server Components
- TailwindCSS + shadcn/ui for a clean UI
- Supabase (Postgres, Auth, Edge Functions)
- Stripe (Checkout & Billing Portal)
- OpenAI Whisper + GPT-3.5

This repo is not production-ready, but it demonstrates how to stitch these services together to ship something usable in a weekend.

---

The story begins here.

I love the game.