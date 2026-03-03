// src/components/profile/ChatOverlay.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import type { UserProfile, ChatQuota, ProfileDiff, ChatMessage } from "@/src/types/profile"

function applyDiff(profile: UserProfile, diff: ProfileDiff): UserProfile {
  return {
    ...profile,
    ...(diff.dietary != null && { dietary: diff.dietary }),
    ...(diff.dislikes != null && { dislikes: diff.dislikes }),
    ...(diff.cuisines != null && { cuisines: diff.cuisines }),
    ...(diff.mealsPerWeek != null && { mealsPerWeek: diff.mealsPerWeek }),
    ...(diff.portions != null && { portions: diff.portions }),
    ...(diff.maxTimeMinutes != null && { maxTimeMinutes: diff.maxTimeMinutes }),
    ...(diff.budgetWeekly != null && { budgetWeekly: diff.budgetWeekly }),
  }
}

interface PendingUpdate {
  diff: ProfileDiff
  newProfile: UserProfile
}

export interface ChatOverlayProps {
  currentProfile: UserProfile
  quota: ChatQuota
  onClose: () => void
  onProfileUpdate: (updated: UserProfile) => void
  onQuotaIncrement: () => void
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

export function ChatOverlay({ currentProfile, quota, onClose, onProfileUpdate, onQuotaIncrement }: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "chef", text: "Bonjour ! Tu veux modifier quelque chose dans ton profil ? Je suis là 🍳" },
  ])
  const [inputVal, setInputVal] = useState("")
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null)
  const [localProfile, setLocalProfile] = useState(currentProfile)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const MAX_SESSION = 10

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing, pendingUpdate])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading || typing || sessionCount >= MAX_SESSION) return

    const userMsg: ChatMessage = { from: "user", text: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInputVal("")
    setLoading(true)
    setTyping(true)

    try {
      const res = await fetch("/api/profile/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          currentProfile: localProfile,
          conversationHistory: [...messages, userMsg],
        }),
      })

      const data = await res.json() as { chefResponse?: string; suggestedChanges?: ProfileDiff | null; error?: string }

      setTyping(false)

      if (!res.ok || !data.chefResponse) {
        const errText = data.error === 'Monthly quota reached'
          ? "Tu as atteint ton quota mensuel de messages 😔"
          : "Une erreur s'est produite, réessaie !"
        setMessages(prev => [...prev, { from: "chef", text: errText }])
        return
      }

      setMessages(prev => [...prev, { from: "chef", text: data.chefResponse! }])
      setSessionCount(c => c + 1)
      onQuotaIncrement()

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
    setConfirmError(null)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingUpdate.newProfile),
      })
      if (!res.ok) throw new Error("Failed to save")
      setLocalProfile(pendingUpdate.newProfile)
      onProfileUpdate(pendingUpdate.newProfile)
      setPendingUpdate(null)
      setMessages(prev => [...prev, { from: "chef", text: "✓ Profil mis à jour ! Autre chose ?" }])
    } catch {
      setConfirmError("Erreur lors de la sauvegarde. Réessaie !")
    }
  }

  const DIFF_LABELS: { label: string; field: keyof ProfileDiff }[] = [
    { label: "Contraintes alimentaires", field: "dietary" },
    { label: "Ingrédients évités", field: "dislikes" },
    { label: "Cuisines préférées", field: "cuisines" },
  ]

  const remainingMessages = quota.max - quota.used - sessionCount
  const isExhausted = sessionCount >= MAX_SESSION || remainingMessages <= 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex h-[75vh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--color-background)] animate-[slideUp_0.35s_cubic-bezier(0.34,1.2,0.64,1)]"
        role="dialog"
        aria-modal="true"
        aria-label="Chat avec ton Little Chef"
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
                {Math.max(0, remainingMessages)} messages restants ce mois
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-[var(--color-border)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-muted)]"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, i) => {
            const isChef = msg.from === "chef"
            return (
              <div
                key={i}
                className={`mb-2.5 flex animate-[fadeSlideUp_0.3s_ease] ${isChef ? "justify-start" : "justify-end"}`}
              >
                {isChef && (
                  <div className="mr-2 flex h-[28px] w-[28px] shrink-0 items-end justify-center self-end rounded-full bg-[var(--color-secondary)]/20 text-sm">
                    🍳
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    isChef
                      ? "rounded-tl-[4px] bg-white text-[var(--color-text)] shadow-sm"
                      : "rounded-tr-[4px] bg-[var(--color-primary)] text-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            )
          })}

          {typing && (
            <div className="mb-2.5 flex items-end gap-2">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)]/20 text-sm">
                🍳
              </div>
              <div className="rounded-2xl rounded-tl-[4px] bg-white shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Pending update diff card */}
          {pendingUpdate && !typing && (
            <div className="mb-2.5 animate-[fadeSlideUp_0.3s_ease] rounded-2xl bg-white p-4 shadow-md">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                Modifications proposées
              </div>
              {DIFF_LABELS.map(({ label, field }) => {
                const newVal = pendingUpdate.diff[field] as string[] | null | undefined
                if (newVal == null) return null
                const oldVal = localProfile[field as keyof UserProfile] as string[]
                const added = newVal.filter(v => !oldVal.includes(v))
                const removed = oldVal.filter(v => !newVal.includes(v))
                if (!added.length && !removed.length) return null
                return (
                  <div key={field} className="mb-2">
                    {added.map(v => (
                      <div key={v} className="mb-1 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          + Ajouter
                        </span>
                        {v} dans {label}
                      </div>
                    ))}
                    {removed.map(v => (
                      <div key={v} className="mb-1 flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-600">
                          − Retirer
                        </span>
                        {v} dans {label}
                      </div>
                    ))}
                  </div>
                )
              })}
              {confirmError && (
                <p className="mb-2 text-center text-[12px] text-red-500">{confirmError}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void confirmUpdate()}
                  className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-[13px] font-bold text-white"
                >
                  ✓ Confirmer
                </button>
                <button
                  onClick={() => { setPendingUpdate(null); setConfirmError(null) }}
                  className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-[13px] font-semibold text-[var(--color-text-muted)]"
                >
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
            placeholder={isExhausted ? "Quota atteint pour ce mois" : "Ex : j'aime plus les champignons…"}
            disabled={loading || typing || isExhausted}
            aria-label="Ton message"
            className="flex-1 rounded-xl bg-[var(--color-bg-muted)] px-3.5 py-2.5 text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
          />
          <button
            onClick={() => void sendMessage(inputVal)}
            disabled={!inputVal.trim() || loading || typing || isExhausted}
            aria-label="Envoyer"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white disabled:bg-[var(--color-border)]"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
