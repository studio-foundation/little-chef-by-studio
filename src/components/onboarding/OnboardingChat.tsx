// src/components/onboarding/OnboardingChat.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { ChatMessage } from "@/src/types/profile"

const LS_KEY = "lc_onboarding_session"

const SCRIPT = [
  {
    text: "Bonjour ! Je suis ton Little Chef 🍳 Je vais te poser quelques questions pour personnaliser tes repas. Ça prend 2-3 minutes. On commence ?",
    quick: ["C'est parti !", "Allons-y"],
    field: null as string | null,
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

type ProfileAccumulator = {
  dietary: string[]
  dislikes: string[]
  cuisines: string[]
  mealsPerWeek: number
  portions: number
  maxTimeMinutes: number
  budgetWeekly: "low" | "medium" | "flexible"
}

function parseAnswer(field: string | null, answer: string): Partial<ProfileAccumulator> {
  if (!field) return {}
  if (field === "mealsPerWeek") {
    const match = answer.match(/\d+/)
    return { mealsPerWeek: match ? parseInt(match[0]) : 5 }
  }
  if (field === "portions") {
    if (answer.startsWith("1 ")) return { portions: 1 }
    if (answer.startsWith("2 ")) return { portions: 2 }
    if (answer.includes("3-4")) return { portions: 4 }
    if (answer.toLowerCase().includes("plus")) return { portions: 6 }
    return { portions: 2 }
  }
  if (field === "maxTimeMinutes") {
    const match = answer.match(/\d+/)
    return { maxTimeMinutes: match ? parseInt(match[0]) : 30 }
  }
  if (field === "budgetWeekly") {
    const lower = answer.toLowerCase()
    if (lower.includes("serré")) return { budgetWeekly: "low" }
    if (lower.includes("flexible") || lower.includes("pas de limite")) return { budgetWeekly: "flexible" }
    return { budgetWeekly: "medium" }
  }
  // Arrays: dietary, dislikes, cuisines
  if (answer.toLowerCase().includes("aucun") || answer.toLowerCase().includes("aucune")) {
    return { [field]: [] }
  }
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

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isChef = msg.from === "chef"
  return (
    <div className={`mb-2.5 flex animate-[fadeSlideUp_0.3s_ease] ${isChef ? "justify-start" : "justify-end"}`}>
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

export function OnboardingChat({ onComplete }: { onComplete: () => void }) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [step, setStep] = useState(0)
  const [typing, setTyping] = useState(false)
  const [done, setDone] = useState(false)
  const [inputVal, setInputVal] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileAccumulator>({
    dietary: [],
    dislikes: [],
    cuisines: [],
    mealsPerWeek: 5,
    portions: 2,
    maxTimeMinutes: 30,
    budgetWeekly: "medium",
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const MAX_MESSAGES = 20

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current)
    }
  }, [])

  // Restore or initialize
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      try {
        const s = JSON.parse(saved) as {
          messages: ChatMessage[]
          step: number
          profile: ProfileAccumulator
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
    // First load
    setTyping(true)
    const t = setTimeout(() => {
      setTyping(false)
      setMessages([{ from: "chef", text: SCRIPT[0].text }])
    }, 800)
    return () => clearTimeout(t)
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (messages.length === 0) return
    localStorage.setItem(LS_KEY, JSON.stringify({ messages, step, profile, done }))
  }, [messages, step, profile, done])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  const sendAnswer = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || done || typing || messages.length >= MAX_MESSAGES) return

    const userMsg: ChatMessage = { from: "user", text: trimmed }
    const nextProfile = { ...profile, ...parseAnswer(SCRIPT[step]?.field ?? null, trimmed) }
    setMessages(prev => [...prev, userMsg])
    setInputVal("")
    setProfile(nextProfile)

    const nextStep = step + 1

    if (nextStep >= SCRIPT.length) {
      setTyping(true)
      pendingTimeoutRef.current = setTimeout(() => {
        setTyping(false)
        setMessages(prev => [...prev, {
          from: "chef",
          text: "Parfait ! Voilà ce que j'ai compris de toi. Est-ce que ça te ressemble ?",
        }])
        setDone(true)
      }, 900)
      return
    }

    setTyping(true)
    pendingTimeoutRef.current = setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { from: "chef", text: SCRIPT[nextStep].text }])
      setStep(nextStep)
    }, 900)
  }

  const handleConfirm = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error("Failed to save")
      localStorage.removeItem(LS_KEY)
      onComplete()
      router.push("/generate")
    } catch {
      setSaveError("Une erreur s'est produite. Réessaie !")
    } finally {
      setSaving(false)
    }
  }

  const handleCorrect = () => {
    setDone(false)
    setMessages(prev => [...prev, {
      from: "chef",
      text: "Pas de problème ! Qu'est-ce que tu voudrais corriger ?",
    }])
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
        <div className="flex gap-1.5">
          {SCRIPT.slice(1).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
              style={{
                background:
                  i < progressStep - 1
                    ? "var(--color-primary)"
                    : i === progressStep - 1
                    ? "var(--color-secondary)"
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

        {/* Confirmation card */}
        {done && !typing && (
          <div className="mb-4 animate-[fadeSlideUp_0.4s_ease] rounded-2xl bg-white p-[18px] shadow-md">
            <div className="mb-3 font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
              Ton profil 🌿
            </div>
            {[
              { label: "Contraintes", values: profile.dietary.length ? profile.dietary : ["Aucune"] },
              { label: "Évite", values: profile.dislikes.length ? profile.dislikes : ["Rien"] },
              { label: "Cuisines", values: profile.cuisines.length ? profile.cuisines : ["Toutes"] },
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
                onClick={() => void handleConfirm()}
                disabled={saving}
                className="flex-1 rounded-xl bg-[var(--color-primary)] py-3 text-[14px] font-bold text-white transition-opacity disabled:opacity-60"
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
            {saveError && (
              <p className="mt-2 text-center text-[12px] text-red-500">{saveError}</p>
            )}
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
            aria-label="Ta réponse"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendAnswer(inputVal)}
            placeholder="Ou écris ta réponse…"
            disabled={typing}
            className="flex-1 rounded-xl bg-[var(--color-bg-muted)] px-3.5 py-2.5 text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <button
            aria-label="Envoyer"
            onClick={() => sendAnswer(inputVal)}
            disabled={!inputVal.trim() || typing}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white disabled:bg-[var(--color-border)]"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
