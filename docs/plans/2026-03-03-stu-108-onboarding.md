# STU-108 — Onboarding Conversationnel + Page Profil Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a conversational onboarding chat (7 scripted steps) that collects user preferences and saves them to DB, plus a profile page with a post-onboarding LLM-powered chat overlay for modifying the profile.

**Architecture:** The onboarding chat is a scripted state machine (no LLM needed — questions are fixed). The profile modification overlay uses Anthropic Claude directly to parse free-text user messages and propose structured diffs. The `/onboarding` route conditionally renders the chat (if not completed) or the profile view (if completed). The chat covers the Nav using `fixed inset-0 z-50` while in onboarding mode.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind v4, Prisma (PostgreSQL), NextAuth v5, `@anthropic-ai/sdk`

---

## Pre-flight: Worktree Setup

**Branch:** `feat/stu-108-onboarding-conversationnel`

```bash
git worktree add .worktrees/stu-108-onboarding -b feat/stu-108-onboarding-conversationnel
cd .worktrees/stu-108-onboarding
```

All subsequent work happens inside `.worktrees/stu-108-onboarding/`.

---

## Task 1: Prisma Schema — UserProfile + ChatQuota

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add models to schema**

In `prisma/schema.prisma`, add a relation on `User` and two new models:

```prisma
model User {
  id            String       @id @default(cuid())
  name          String?
  email         String       @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime     @default(now())
  accounts      Account[]
  recipes       Recipe[]
  sessions      Session[]
  plans         WeeklyPlan[]
  profile       UserProfile?   // ← ADD THIS LINE
}

model UserProfile {
  id                    String    @id @default(cuid())
  userId                String    @unique
  dietary               String[]  @default([])
  dislikes              String[]  @default([])
  cuisines              String[]  @default([])
  mealsPerWeek          Int       @default(5)
  portions              Int       @default(2)
  maxTimeMinutes        Int       @default(30)
  budgetWeekly          String    @default("medium")
  onboardingCompleted   Boolean   @default(false)
  onboardingCompletedAt DateTime?
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  chatQuota             ChatQuota?
}

model ChatQuota {
  id        String      @id @default(cuid())
  userId    String      @unique
  month     String      // "2026-03"
  used      Int         @default(0)
  max       Int         @default(10)
  profile   UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
}
```

**Step 2: Create and run migration**

```bash
pnpm exec prisma migrate dev --name stu_108_user_profile
```

Expected: Migration applied, `UserProfile` and `ChatQuota` tables created.

**Step 3: Verify**

```bash
pnpm exec prisma studio
```

Check that `UserProfile` and `ChatQuota` tables appear in the DB.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add UserProfile and ChatQuota models"
```

---

## Task 2: Install Anthropic SDK + Env

**Files:**
- `package.json` (modified by pnpm)
- `.env.local` (manual addition)

**Step 1: Install**

```bash
pnpm add @anthropic-ai/sdk
```

**Step 2: Add env var**

In `.env.local`, add:
```
ANTHROPIC_API_KEY=your_key_here
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @anthropic-ai/sdk"
```

---

## Task 3: Shared Profile Types

**Files:**
- Create: `src/types/profile.ts`

**Step 1: Create the file**

```typescript
// src/types/profile.ts

export interface UserProfile {
  dietary: string[]
  dislikes: string[]
  cuisines: string[]
  mealsPerWeek: number
  portions: number
  maxTimeMinutes: number
  budgetWeekly: "low" | "medium" | "flexible"
  onboardingCompleted: boolean
  onboardingCompletedAt?: string | null
}

export interface ChatQuota {
  used: number
  max: number
  month: string
}

export interface ProfileDiff {
  dietary?: string[] | null
  dislikes?: string[] | null
  cuisines?: string[] | null
  mealsPerWeek?: number | null
  portions?: number | null
  maxTimeMinutes?: number | null
  budgetWeekly?: "low" | "medium" | "flexible" | null
}

export interface ChatMessage {
  from: "chef" | "user"
  text: string
}
```

**Step 2: Commit**

```bash
git add src/types/profile.ts
git commit -m "feat(types): add UserProfile, ChatQuota, ProfileDiff types"
```

---

## Task 4: API Route — GET + PUT /api/profile

**Files:**
- Create: `app/api/profile/route.ts`

**Step 1: Create the file**

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/src/lib/prisma'
import type { UserProfile } from '@/src/types/profile'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
    include: { chatQuota: true },
  })

  return NextResponse.json(profile)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as Partial<UserProfile>
  const { dietary, dislikes, cuisines, mealsPerWeek, portions, maxTimeMinutes, budgetWeekly } = body

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      dietary: dietary ?? [],
      dislikes: dislikes ?? [],
      cuisines: cuisines ?? [],
      mealsPerWeek: mealsPerWeek ?? 5,
      portions: portions ?? 2,
      maxTimeMinutes: maxTimeMinutes ?? 30,
      budgetWeekly: budgetWeekly ?? 'medium',
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
    update: {
      ...(dietary !== undefined && { dietary }),
      ...(dislikes !== undefined && { dislikes }),
      ...(cuisines !== undefined && { cuisines }),
      ...(mealsPerWeek !== undefined && { mealsPerWeek }),
      ...(portions !== undefined && { portions }),
      ...(maxTimeMinutes !== undefined && { maxTimeMinutes }),
      ...(budgetWeekly !== undefined && { budgetWeekly }),
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  })

  return NextResponse.json(profile)
}
```

**Step 2: Verify types compile**

```bash
pnpm exec tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "feat(api): GET + PUT /api/profile"
```

---

## Task 5: API Route — POST /api/profile/chat (Anthropic)

> **REQUIRED SUB-SKILL:** Invoke `claude-developer-platform` skill before implementing this task.

**Files:**
- Create: `app/api/profile/chat/route.ts`

**Step 1: Create the file**

```typescript
// app/api/profile/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/src/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import type { UserProfile, ProfileDiff, ChatMessage } from '@/src/types/profile'

const client = new Anthropic()

function formatProfileForPrompt(profile: UserProfile): string {
  return JSON.stringify({
    dietary: profile.dietary,
    dislikes: profile.dislikes,
    cuisines: profile.cuisines,
    mealsPerWeek: profile.mealsPerWeek,
    portions: profile.portions,
    maxTimeMinutes: profile.maxTimeMinutes,
    budgetWeekly: profile.budgetWeekly,
  }, null, 2)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    message: string
    currentProfile: UserProfile
    conversationHistory: ChatMessage[]
  }

  // Check and update quota
  const currentMonth = new Date().toISOString().slice(0, 7)
  const quota = await prisma.chatQuota.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, month: currentMonth, used: 1, max: 10 },
    update: {
      used: { increment: 1 },
      // Reset if month changed — handled via conditional in application logic
    },
  })

  // If month changed, reset counter
  if (quota.month !== currentMonth) {
    await prisma.chatQuota.update({
      where: { userId: session.user.id },
      data: { month: currentMonth, used: 1 },
    })
  }

  if (quota.used > quota.max) {
    return NextResponse.json({ error: 'Quota mensuel atteint' }, { status: 429 })
  }

  const systemPrompt = `Tu es Little Chef, un assistant culinaire chaleureux et bienveillant.
Tu aides l'utilisateur à modifier son profil alimentaire via une conversation naturelle.

Profil actuel de l'utilisateur :
${formatProfileForPrompt(body.currentProfile)}

Réponds toujours de façon conversationnelle et chaleureuse. Quand l'utilisateur mentionne des changements à son profil, propose un diff précis.

Réponds UNIQUEMENT avec du JSON valide dans ce format exact :
{
  "chefResponse": "ton message conversationnel ici",
  "suggestedChanges": null
}

Ou si des changements sont à proposer :
{
  "chefResponse": "ton message décrivant les changements proposés",
  "suggestedChanges": {
    "dietary": ["Végétarien·ne"] or null,
    "dislikes": ["Champignons"] or null,
    "cuisines": ["Japonaise", "Thaïe"] or null,
    "mealsPerWeek": 5 or null,
    "portions": 2 or null,
    "maxTimeMinutes": 30 or null,
    "budgetWeekly": "low" | "medium" | "flexible" or null
  }
}

Important : suggestedChanges remplace ENTIÈREMENT le champ modifié (pas un patch partiel).`

  const messages = body.conversationHistory
    .filter(m => m.from !== 'chef' || body.conversationHistory.indexOf(m) > 0)
    .map(m => ({
      role: m.from === 'user' ? 'user' as const : 'assistant' as const,
      content: m.text,
    }))

  messages.push({ role: 'user', content: body.message })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  let parsed: { chefResponse: string; suggestedChanges: ProfileDiff | null }
  try {
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    parsed = { chefResponse: text, suggestedChanges: null }
  }

  return NextResponse.json(parsed)
}
```

**Step 2: Verify types compile**

```bash
pnpm exec tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/api/profile/chat/route.ts
git commit -m "feat(api): POST /api/profile/chat — Anthropic profile modifier"
```

---

## Task 6: OnboardingChat Component

This is the scripted 7-step chat. No LLM call — pure state machine. Styled with Tailwind v4 CSS variables.

**Files:**
- Create: `src/components/onboarding/OnboardingChat.tsx`

**Step 1: Create the component**

```typescript
// src/components/onboarding/OnboardingChat.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { UserProfile, ChatMessage } from "@/src/types/profile"

const LS_KEY = "lc_onboarding_session"

const SCRIPT = [
  {
    text: "Bonjour ! Je suis ton Little Chef 🍳 Je vais te poser quelques questions pour personnaliser tes repas. Ça prend 2-3 minutes. On commence ?",
    quick: ["C'est parti !", "Allons-y"],
    field: null,
  },
  {
    text: "Est-ce que tu as des contraintes alimentaires — végane, végétarien·ne, sans gluten, allergies, intolérances ?",
    quick: ["Végétarien·ne", "Végétalien·ne", "Sans gluten", "Sans lactose", "Aucune contrainte"],
    field: "dietary",
  },
  {
    text: "Y a-t-il des ingrédients que tu détestes ou évites ? (texture, goût, peu importe la raison)",
    quick: ["Champignons", "Coriandre", "Betterave", "Aucun en particulier"],
    field: "dislikes",
  },
  {
    text: "Quelles cuisines tu aimes ? Choisis tout ce qui t'attire.",
    quick: ["Japonaise", "Méditerranéenne", "Mexicaine", "Italienne", "Asiatique en général"],
    field: "cuisines",
  },
  {
    text: "Combien de repas par semaine tu veux planifier ?",
    quick: ["3 repas", "5 repas", "7 repas (tous les soirs)"],
    field: "mealsPerWeek",
  },
  {
    text: "Combien de personnes tu cuisines habituellement ?",
    quick: ["1 personne", "2 personnes", "3-4 personnes", "Plus de 4"],
    field: "portions",
  },
  {
    text: "Combien de temps tu as pour cuisiner en semaine ?",
    quick: ["20 min max", "30 min", "45 min", "1h ou plus"],
    field: "maxTimeMinutes",
  },
  {
    text: "Dernier truc : ton budget épicerie hebdomadaire est plutôt…",
    quick: ["Serré — moins de 50$/sem", "Moyen — 50-100$", "Flexible — pas de limite"],
    field: "budgetWeekly",
  },
]

function parseAnswer(field: string | null, answer: string): Partial<UserProfile> {
  if (!field) return {}
  if (field === "mealsPerWeek") {
    const num = parseInt(answer)
    return { mealsPerWeek: isNaN(num) ? 5 : num }
  }
  if (field === "portions") {
    if (answer.includes("1 ")) return { portions: 1 }
    if (answer.includes("2 ")) return { portions: 2 }
    if (answer.includes("3-4")) return { portions: 4 }
    return { portions: 2 }
  }
  if (field === "maxTimeMinutes") {
    if (answer.includes("20")) return { maxTimeMinutes: 20 }
    if (answer.includes("30")) return { maxTimeMinutes: 30 }
    if (answer.includes("45")) return { maxTimeMinutes: 45 }
    return { maxTimeMinutes: 60 }
  }
  if (field === "budgetWeekly") {
    if (answer.toLowerCase().includes("serré")) return { budgetWeekly: "low" }
    if (answer.toLowerCase().includes("flexible")) return { budgetWeekly: "flexible" }
    return { budgetWeekly: "medium" }
  }
  // Arrays: dietary, dislikes, cuisines
  if (answer.toLowerCase().includes("aucun")) return { [field]: [] }
  return { [field]: [answer] }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="h-[7px] w-[7px] rounded-full bg-[var(--color-border)]"
          style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

interface ChatBubbleProps { msg: ChatMessage }
function ChatBubble({ msg }: ChatBubbleProps) {
  const isChef = msg.from === "chef"
  return (
    <div
      className={`mb-2.5 flex animate-[fadeSlideUp_0.3s_ease] ${isChef ? "justify-start" : "justify-end"}`}
    >
      {isChef && (
        <div className="mr-2 flex h-[30px] w-[30px] shrink-0 items-end justify-center self-end rounded-full bg-[var(--color-secondary)]/20 text-[15px]">
          🍳
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-[15px] py-[11px] text-[14px] leading-relaxed ${
          isChef
            ? "rounded-tl-[4px] bg-white text-[var(--color-text)] shadow-sm"
            : "rounded-tr-[4px] bg-[var(--color-primary)] text-white"
        }`}
      >
        {msg.text}
      </div>
    </div>
  )
}

interface OnboardingChatProps {
  onComplete: () => void
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [step, setStep] = useState(0)
  const [typing, setTyping] = useState(false)
  const [done, setDone] = useState(false)
  const [inputVal, setInputVal] = useState("")
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    dietary: [],
    dislikes: [],
    cuisines: [],
    mealsPerWeek: 5,
    portions: 2,
    maxTimeMinutes: 30,
    budgetWeekly: "medium",
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const MAX_MESSAGES = 20

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      try {
        const s = JSON.parse(saved) as {
          messages: ChatMessage[]
          step: number
          profile: Partial<UserProfile>
          done: boolean
        }
        setMessages(s.messages)
        setStep(s.step)
        setProfile(s.profile)
        setDone(s.done)
        return
      } catch {
        localStorage.removeItem(LS_KEY)
      }
    }
    // First load — show first message
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const first: ChatMessage = { from: "chef", text: SCRIPT[0].text }
      setMessages([first])
    }, 800)
  }, [])

  // Persist session to localStorage
  useEffect(() => {
    if (messages.length === 0) return
    localStorage.setItem(LS_KEY, JSON.stringify({ messages, step, profile, done }))
  }, [messages, step, profile, done])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  const sendAnswer = (text: string) => {
    if (!text.trim() || done || messages.length >= MAX_MESSAGES) return

    const userMsg: ChatMessage = { from: "user", text }
    const nextProfile = { ...profile, ...parseAnswer(SCRIPT[step].field, text) }
    setMessages(prev => [...prev, userMsg])
    setInputVal("")
    setProfile(nextProfile)

    const nextStep = step + 1

    if (nextStep >= SCRIPT.length) {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages(prev => [...prev, {
          from: "chef",
          text: "Parfait ! Voilà ce que j'ai compris de toi. Est-ce que ça te ressemble ?",
        }])
        setDone(true)
      }, 900)
    } else {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages(prev => [...prev, { from: "chef", text: SCRIPT[nextStep].text }])
        setStep(nextStep)
      }, 900)
    }
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })
      localStorage.removeItem(LS_KEY)
      onComplete()
      router.push("/generate")
    } finally {
      setSaving(false)
    }
  }

  const handleCorrect = () => {
    // Re-ask last question without reset
    setDone(false)
    setMessages(prev => [
      ...prev,
      { from: "chef", text: "Pas de problème ! Qu'est-ce que tu veux corriger ?" },
    ])
  }

  const currentQuick = !done ? SCRIPT[step]?.quick : null
  const messagesLeft = MAX_MESSAGES - messages.length
  const progressStep = Math.min(step, SCRIPT.length - 1)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)]">

      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] bg-white px-5 py-4">
        <span className="text-2xl">🍳</span>
        <div className="flex-1">
          <div className="font-[family-name:var(--font-playfair)] text-base font-bold text-[var(--color-text)]">
            Ton Little Chef
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {messagesLeft} messages restants
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {SCRIPT.slice(1).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
              style={{
                background: i < progressStep
                  ? "var(--color-primary)"
                  : i === progressStep - 1
                  ? "var(--color-primary-hover)"
                  : "var(--color-border)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 pt-5">
        {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}

        {typing && (
          <div className="mb-2.5 flex items-end gap-2">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)]/20 text-[15px]">
              🍳
            </div>
            <div className="rounded-2xl rounded-tl-[4px] bg-white shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        {/* Profile confirmation card */}
        {done && !typing && (
          <div className="mb-4 animate-[fadeSlideUp_0.4s_ease] rounded-2xl bg-white p-[18px] shadow-md">
            <div className="mb-3 font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
              Ton profil 🌿
            </div>
            {[
              { label: "Contraintes", values: (profile.dietary?.length ? profile.dietary : ["Aucune"]) },
              { label: "Évite", values: (profile.dislikes?.length ? profile.dislikes : ["Rien"]) },
              { label: "Cuisines", values: (profile.cuisines?.length ? profile.cuisines : ["Toutes"]) },
              {
                label: "Pratique",
                values: [
                  `${profile.mealsPerWeek} repas/sem`,
                  `${profile.portions} pers.`,
                  `${profile.maxTimeMinutes} min max`,
                  profile.budgetWeekly === "low" ? "Budget serré" : profile.budgetWeekly === "flexible" ? "Budget flexible" : "Budget moyen",
                ],
              },
            ].map(section => (
              <div key={section.label} className="mb-2.5">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {section.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {section.values.map(v => (
                    <span
                      key={v}
                      className="rounded-full bg-[var(--color-secondary)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-secondary)]"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 rounded-xl bg-[var(--color-primary)] py-3 text-[14px] font-bold text-white disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "✓ C'est moi, on y va !"}
              </button>
              <button
                onClick={handleCorrect}
                className="flex-1 rounded-xl border-[1.5px] border-[var(--color-border)] py-3 text-[14px] font-semibold text-[var(--color-text-muted)]"
              >
                Corriger quelque chose
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {currentQuick && !typing && (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--color-border)] px-4 py-2">
          {currentQuick.map(q => (
            <button
              key={q}
              onClick={() => sendAnswer(q)}
              className="rounded-full border-[1.5px] border-[var(--color-border)] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Text input */}
      {!done && (
        <div className="flex gap-2 border-t border-[var(--color-border)] bg-white px-4 py-3">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendAnswer(inputVal)}
            placeholder="Ou écris ta réponse…"
            className="flex-1 rounded-xl bg-[var(--color-bg-muted)] px-3.5 py-2.5 text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <button
            onClick={() => sendAnswer(inputVal)}
            disabled={!inputVal.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white disabled:bg-[var(--color-border)]"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add typingBounce keyframe to globals.css**

In `app/globals.css`, add after the existing `@keyframes` blocks:

```css
@keyframes typingBounce {
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-5px); }
}
```

**Step 3: Verify types compile**

```bash
pnpm exec tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/onboarding/OnboardingChat.tsx app/globals.css
git commit -m "feat(onboarding): OnboardingChat component — 7-step scripted chat"
```

---

## Task 7: ProfileView Component

**Files:**
- Create: `src/components/profile/ProfileView.tsx`

**Step 1: Create the component**

```typescript
// src/components/profile/ProfileView.tsx
"use client"

import { useState } from "react"
import type { UserProfile, ChatQuota } from "@/src/types/profile"
import { ChatOverlay } from "./ChatOverlay"

const SECTIONS = [
  { key: "dietary",  label: "Contraintes alimentaires", emoji: "🌿", bg: "bg-emerald-50",   text: "text-emerald-700" },
  { key: "dislikes", label: "Ingrédients évités",       emoji: "🚫", bg: "bg-rose-50",      text: "text-rose-600"   },
  { key: "cuisines", label: "Cuisines préférées",       emoji: "🌍", bg: "bg-amber-50",     text: "text-amber-700"  },
]

function formatBudget(b: string) {
  if (b === "low") return "Budget serré"
  if (b === "flexible") return "Budget flexible"
  return "Budget moyen"
}

interface ProfileViewProps {
  profile: UserProfile
  quota: ChatQuota
  onProfileUpdate: (updated: UserProfile) => void
}

export function ProfileView({ profile, quota, onProfileUpdate }: ProfileViewProps) {
  const [chatOpen, setChatOpen] = useState(false)
  const [currentProfile, setCurrentProfile] = useState(profile)

  const handleProfileUpdate = (updated: UserProfile) => {
    setCurrentProfile(updated)
    onProfileUpdate(updated)
  }

  const practicalItems = [
    `${currentProfile.mealsPerWeek} repas/semaine`,
    `${currentProfile.portions} personne${currentProfile.portions > 1 ? "s" : ""}`,
    `${currentProfile.maxTimeMinutes} min max`,
    formatBudget(currentProfile.budgetWeekly),
  ]

  return (
    <div className="pb-20">
      {/* Title */}
      <div className="mb-7">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--color-text)]">
          Ton profil
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Généré lors de ton onboarding · Modifiable via ton Little Chef
        </p>
      </div>

      {/* Talk to chef CTA */}
      <button
        onClick={() => setChatOpen(true)}
        className="mb-6 w-full rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] p-5 text-left shadow-lg shadow-[var(--color-primary)]/20 transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-[family-name:var(--font-playfair)] text-[17px] font-bold text-white">
              🍳 Parler à ton Little Chef
            </div>
            <div className="mt-1 text-[12px] text-white/70">
              Modifier tes préférences en conversation · {quota.max - quota.used} messages ce mois-ci
            </div>
          </div>
          <span className="text-xl opacity-80 text-white">→</span>
        </div>
      </button>

      {/* Quota bar */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-white p-4">
        <div className="mb-2 flex justify-between">
          <span className="text-[12px] text-[var(--color-text-muted)]">Messages utilisés ce mois</span>
          <span className="text-[12px] font-bold text-[var(--color-primary)]">{quota.used}/{quota.max}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] transition-all"
            style={{ width: `${Math.min((quota.used / quota.max) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Profile sections */}
      {SECTIONS.map(section => {
        const items = currentProfile[section.key as keyof UserProfile] as string[]
        return (
          <div
            key={section.key}
            className="mb-3 rounded-2xl border border-[var(--color-border)] bg-white p-[18px]"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[15px] ${section.bg}`}>
                {section.emoji}
              </span>
              <span className="font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
                {section.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(items?.length ? items : ["Aucune"]).map(item => (
                <span
                  key={item}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold ${section.bg} ${section.text}`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )
      })}

      {/* Practical section */}
      <div className="mb-3 rounded-2xl border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-[15px]">⏱</span>
          <span className="font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
            Contraintes pratiques
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {practicalItems.map(item => (
            <span key={item} className="rounded-full bg-violet-50 px-3 py-1 text-[13px] font-semibold text-violet-700">
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-[12px] text-[var(--color-border)]">
        Les changements sont suggérés par ton Little Chef et confirmés par toi avant d&apos;être appliqués.
      </p>

      {chatOpen && (
        <ChatOverlay
          currentProfile={currentProfile}
          quota={quota}
          onClose={() => setChatOpen(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/profile/ProfileView.tsx
git commit -m "feat(profile): ProfileView component"
```

---

## Task 8: ChatOverlay Component

**Files:**
- Create: `src/components/profile/ChatOverlay.tsx`

**Step 1: Create the component**

```typescript
// src/components/profile/ChatOverlay.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import type { UserProfile, ChatQuota, ChatMessage, ProfileDiff } from "@/src/types/profile"

interface PendingUpdate {
  diff: ProfileDiff
  newProfile: UserProfile
}

function applyDiff(profile: UserProfile, diff: ProfileDiff): UserProfile {
  return {
    ...profile,
    ...(diff.dietary !== null && diff.dietary !== undefined && { dietary: diff.dietary }),
    ...(diff.dislikes !== null && diff.dislikes !== undefined && { dislikes: diff.dislikes }),
    ...(diff.cuisines !== null && diff.cuisines !== undefined && { cuisines: diff.cuisines }),
    ...(diff.mealsPerWeek !== null && diff.mealsPerWeek !== undefined && { mealsPerWeek: diff.mealsPerWeek }),
    ...(diff.portions !== null && diff.portions !== undefined && { portions: diff.portions }),
    ...(diff.maxTimeMinutes !== null && diff.maxTimeMinutes !== undefined && { maxTimeMinutes: diff.maxTimeMinutes }),
    ...(diff.budgetWeekly !== null && diff.budgetWeekly !== undefined && { budgetWeekly: diff.budgetWeekly }),
  }
}

interface ChatOverlayProps {
  currentProfile: UserProfile
  quota: ChatQuota
  onClose: () => void
  onProfileUpdate: (updated: UserProfile) => void
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="h-[7px] w-[7px] rounded-full bg-[var(--color-border)]"
          style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  )
}

export function ChatOverlay({ currentProfile, quota, onClose, onProfileUpdate }: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "chef", text: "Bonjour ! Tu veux modifier quelque chose dans ton profil ? Je suis là 🍳" },
  ])
  const [inputVal, setInputVal] = useState("")
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null)
  const [localProfile, setLocalProfile] = useState(currentProfile)
  const [localQuota, setLocalQuota] = useState(quota)
  const bottomRef = useRef<HTMLDivElement>(null)
  const MAX_SESSION = 10

  const sessionMessages = messages.filter(m => m.from === "user").length

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing, pendingUpdate])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || sessionMessages >= MAX_SESSION) return

    const userMsg: ChatMessage = { from: "user", text }
    setMessages(prev => [...prev, userMsg])
    setInputVal("")
    setLoading(true)
    setTyping(true)

    try {
      const res = await fetch("/api/profile/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          currentProfile: localProfile,
          conversationHistory: [...messages, userMsg],
        }),
      })
      const data = await res.json() as {
        chefResponse: string
        suggestedChanges: ProfileDiff | null
      }

      setTyping(false)
      setMessages(prev => [...prev, { from: "chef", text: data.chefResponse }])
      setLocalQuota(q => ({ ...q, used: q.used + 1 }))

      if (data.suggestedChanges) {
        const newProfile = applyDiff(localProfile, data.suggestedChanges)
        setPendingUpdate({ diff: data.suggestedChanges, newProfile })
      }
    } catch {
      setTyping(false)
      setMessages(prev => [...prev, { from: "chef", text: "Désolé, une erreur s'est produite. Réessaie !" }])
    } finally {
      setLoading(false)
    }
  }

  const confirmUpdate = async () => {
    if (!pendingUpdate) return
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingUpdate.newProfile),
    })
    setLocalProfile(pendingUpdate.newProfile)
    onProfileUpdate(pendingUpdate.newProfile)
    setPendingUpdate(null)
    setMessages(prev => [...prev, { from: "chef", text: "✓ Profil mis à jour ! Autre chose ?" }])
  }

  const diffLabels: { label: string; field: keyof ProfileDiff }[] = [
    { label: "Contraintes alimentaires", field: "dietary" },
    { label: "Ingrédients évités", field: "dislikes" },
    { label: "Cuisines préférées", field: "cuisines" },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex h-[75vh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--color-background)] animate-[slideUp_0.35s_cubic-bezier(0.34,1.2,0.64,1)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-3xl border-b border-[var(--color-border)] bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍳</span>
            <div>
              <div className="font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
                Ton Little Chef
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                {localQuota.max - localQuota.used} messages restants ce mois
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-xl text-[var(--color-border)] hover:text-[var(--color-text-muted)]">×</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, i) => {
            const isChef = msg.from === "chef"
            return (
              <div key={i} className={`mb-2.5 flex animate-[fadeSlideUp_0.3s_ease] ${isChef ? "justify-start" : "justify-end"}`}>
                {isChef && (
                  <div className="mr-2 flex h-[28px] w-[28px] shrink-0 items-end justify-center self-end rounded-full bg-[var(--color-secondary)]/20 text-sm">
                    🍳
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${isChef ? "rounded-tl-[4px] bg-white shadow-sm text-[var(--color-text)]" : "rounded-tr-[4px] bg-[var(--color-primary)] text-white"}`}>
                  {msg.text}
                </div>
              </div>
            )
          })}

          {typing && (
            <div className="mb-2.5 flex items-end gap-2">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)]/20 text-sm">🍳</div>
              <div className="rounded-2xl rounded-tl-[4px] bg-white shadow-sm"><TypingIndicator /></div>
            </div>
          )}

          {/* Pending update diff card */}
          {pendingUpdate && (
            <div className="mb-2.5 animate-[fadeSlideUp_0.3s_ease] rounded-2xl bg-white p-4 shadow-md">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                Modifications proposées
              </div>
              {diffLabels.map(({ label, field }) => {
                const val = pendingUpdate.diff[field] as string[] | null | undefined
                if (val == null) return null
                const old = localProfile[field as keyof UserProfile] as string[]
                const added = val.filter(v => !old.includes(v))
                const removed = old.filter(v => !val.includes(v))
                return (
                  <div key={field} className="mb-2">
                    {added.map(v => (
                      <div key={v} className="mb-1 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">+ Ajouter</span>
                        {v} dans {label}
                      </div>
                    ))}
                    {removed.map(v => (
                      <div key={v} className="mb-1 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-600">− Retirer</span>
                        {v} dans {label}
                      </div>
                    ))}
                  </div>
                )
              })}
              <div className="mt-3 flex gap-2">
                <button onClick={confirmUpdate} className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-[13px] font-bold text-white">
                  ✓ Confirmer
                </button>
                <button onClick={() => setPendingUpdate(null)} className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-muted)]">
                  Ignorer
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t border-[var(--color-border)] bg-white px-4 py-3">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void sendMessage(inputVal)}
            placeholder="Ex : j'aime plus les champignons…"
            disabled={loading || sessionMessages >= MAX_SESSION}
            className="flex-1 rounded-xl bg-[var(--color-bg-muted)] px-3.5 py-2.5 text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
          />
          <button
            onClick={() => void sendMessage(inputVal)}
            disabled={!inputVal.trim() || loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white disabled:bg-[var(--color-border)]"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify types compile**

```bash
pnpm exec tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/profile/ChatOverlay.tsx
git commit -m "feat(profile): ChatOverlay component — Anthropic-powered profile chat"
```

---

## Task 9: Wire Up the Onboarding Page

**Files:**
- Modify: `app/(app)/onboarding/page.tsx`

**Step 1: Replace the placeholder page**

The page fetches the user's profile server-side. If onboarding not completed, renders the chat (which uses `fixed inset-0` to override the layout). If completed, renders ProfileView within the normal layout.

```typescript
// app/(app)/onboarding/page.tsx
import { auth } from "@/auth"
import { prisma } from "@/src/lib/prisma"
import { redirect } from "next/navigation"
import { OnboardingPageClient } from "./OnboardingPageClient"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const currentMonth = new Date().toISOString().slice(0, 7)

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
    include: { chatQuota: true },
  })

  const quota = profile.chatQuota ?? { used: 0, max: 10, month: currentMonth }

  // Reset quota if month changed
  const effectiveQuota = quota.month === currentMonth
    ? quota
    : { ...quota, used: 0, month: currentMonth }

  return (
    <OnboardingPageClient
      profile={{
        dietary: profile.dietary,
        dislikes: profile.dislikes,
        cuisines: profile.cuisines,
        mealsPerWeek: profile.mealsPerWeek,
        portions: profile.portions,
        maxTimeMinutes: profile.maxTimeMinutes,
        budgetWeekly: profile.budgetWeekly as "low" | "medium" | "flexible",
        onboardingCompleted: profile.onboardingCompleted,
        onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() ?? null,
      }}
      quota={{ used: effectiveQuota.used, max: effectiveQuota.max, month: effectiveQuota.month }}
    />
  )
}
```

**Step 2: Create the client component**

```typescript
// app/(app)/onboarding/OnboardingPageClient.tsx
"use client"

import { useState } from "react"
import { OnboardingChat } from "@/src/components/onboarding/OnboardingChat"
import { ProfileView } from "@/src/components/profile/ProfileView"
import type { UserProfile, ChatQuota } from "@/src/types/profile"

interface Props {
  profile: UserProfile
  quota: ChatQuota
}

export function OnboardingPageClient({ profile, quota }: Props) {
  const [completed, setCompleted] = useState(profile.onboardingCompleted)
  const [currentProfile, setCurrentProfile] = useState(profile)

  if (!completed) {
    return <OnboardingChat onComplete={() => setCompleted(true)} />
  }

  return (
    <ProfileView
      profile={currentProfile}
      quota={quota}
      onProfileUpdate={setCurrentProfile}
    />
  )
}
```

**Step 3: Verify types compile**

```bash
pnpm exec tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/(app)/onboarding/page.tsx app/(app)/onboarding/OnboardingPageClient.tsx
git commit -m "feat(onboarding): wire up /onboarding page — chat or profile based on onboardingCompleted"
```

---

## Task 10: Build + Manual Test

**Step 1: Build**

```bash
pnpm build
```

Expected: Build succeeds, no TypeScript or compilation errors.

**Step 2: Manual smoke test**

```bash
pnpm dev
```

- Navigate to `/onboarding` → should see OnboardingChat (fixed overlay covering nav)
- Go through 7 questions using quick replies and free text
- Confirm profile → should redirect to `/generate`
- Navigate back to `/onboarding` → should see ProfileView with the saved profile
- Click "Parler à ton Little Chef" → ChatOverlay opens, send a message, receive chef response
- If response has suggestedChanges → diff card shows, confirm → profile updated

**Step 3: Commit build artifacts (if any)**

```bash
git add -A
git commit -m "chore: build verification"
```

---

## Task 11: Push + PR

```bash
git push -u origin feat/stu-108-onboarding-conversationnel
gh pr create \
  --title "feat(onboarding): conversational onboarding + profile page [STU-108]" \
  --body "$(cat <<'EOF'
## Summary
- Conversational 7-step onboarding chat (scripted state machine, localStorage persistence)
- Profile page with colored chips per section (dietary, dislikes, cuisines, practical)
- LLM-powered chat overlay for modifying profile (Anthropic claude-haiku-4-5)
- Pending diff card: changes proposed by chef, confirmed before DB write
- UserProfile + ChatQuota models added to Prisma schema

## Acceptance criteria covered
- [x] Chat s'affiche immédiatement après inscription (fixed overlay)
- [x] Quick replies + input texte libre
- [x] Typing indicator entre chaque message
- [x] Dots de progression (7 étapes)
- [x] Carte de confirmation avec toutes les sections
- [x] "Corriger quelque chose" reprend sans reset
- [x] Profil écrit en DB uniquement après confirmation
- [x] Max 20 messages, compteur visible
- [x] Session persistée si refresh (localStorage)
- [x] Redirect vers Ma semaine après confirmation
- [x] 4 sections avec chips colorées
- [x] Quota mensuel affiché
- [x] Bottom sheet chat libre
- [x] Carte diff avant toute modification
- [x] Confirmer → DB, Ignorer → rien

## Test plan
- [ ] Onboarding fresh user: naviguer /onboarding, voir chat overlay
- [ ] Quick replies fonctionnels, free text accepté
- [ ] Refresh pendant onboarding → reprend au bon endroit
- [ ] Confirmer profil → redirect /generate, profil en DB
- [ ] Retour /onboarding → ProfileView avec données réelles
- [ ] Ouvrir overlay chat → message → réponse chef
- [ ] Réponse avec diff → confirmer → profil mis à jour
- [ ] pnpm build passe sans erreur

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --base main
```

---

## Notes for the implementer

- **No Anthropic SDK for onboarding** — the 7-step chat is fully scripted. Only `POST /api/profile/chat` uses Claude (Haiku for speed/cost).
- **`parseAnswer()` is intentionally simple** — it converts quick-reply text to typed values. If users type custom answers that don't match patterns, the raw string is stored (which is fine for arrays like `dietary`, `dislikes`, `cuisines`).
- **ChatQuota month reset** — quota resetting is handled in the server component (`OnboardingPage`) and the API route separately. There's a small race condition if the month changes mid-session, but it's acceptable for MVP.
- **ANTHROPIC_API_KEY** must be in `.env.local` (never committed). Verify it's in `.gitignore`.
- Tailwind v4 is used — class names use `bg-[var(--color-primary)]` pattern, not Tailwind color names, to stay on the design token system defined in `globals.css`.
