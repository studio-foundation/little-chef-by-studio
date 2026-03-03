"use client"

import { useState } from "react"
import type { UserProfile, ChatQuota } from "@/src/types/profile"
import { ChatOverlay } from "./ChatOverlay"

interface Section {
  key: keyof Pick<UserProfile, "dietary" | "dislikes" | "cuisines">
  label: string
  emoji: string
  bgClass: string
  textClass: string
}

const SECTIONS: Section[] = [
  { key: "dietary",  label: "Contraintes alimentaires", emoji: "🌿", bgClass: "bg-emerald-50",  textClass: "text-emerald-700"  },
  { key: "dislikes", label: "Ingrédients évités",       emoji: "🚫", bgClass: "bg-rose-50",    textClass: "text-rose-600"     },
  { key: "cuisines", label: "Cuisines préférées",       emoji: "🌍", bgClass: "bg-amber-50",   textClass: "text-amber-700"    },
]

function formatBudget(b: string): string {
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
  const [currentQuota, setCurrentQuota] = useState(quota)

  const handleProfileUpdate = (updated: UserProfile) => {
    setCurrentProfile(updated)
    onProfileUpdate(updated)
  }

  const handleQuotaIncrement = () => {
    setCurrentQuota(q => ({ ...q, used: Math.min(q.used + 1, q.max) }))
  }

  const practicalItems = [
    `${currentProfile.mealsPerWeek} repas/semaine`,
    `${currentProfile.portions} personne${currentProfile.portions > 1 ? "s" : ""}`,
    `${currentProfile.maxTimeMinutes} min max`,
    formatBudget(currentProfile.budgetWeekly),
  ]

  return (
    <div className="pb-20">
      {/* Page title */}
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
        className="mb-6 w-full rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] p-5 text-left shadow-lg shadow-[var(--color-primary)]/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
        aria-label="Ouvrir le chat avec ton Little Chef"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-[family-name:var(--font-playfair)] text-[17px] font-bold text-white">
              🍳 Parler à ton Little Chef
            </div>
            <div className="mt-1 text-[12px] text-white/70">
              Modifier tes préférences en conversation ·{" "}
              {currentQuota.max - currentQuota.used} messages ce mois-ci
            </div>
          </div>
          <span className="text-xl text-white/80">→</span>
        </div>
      </button>

      {/* Quota bar */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-white p-4">
        <div className="mb-2 flex justify-between">
          <span className="text-[12px] text-[var(--color-text-muted)]">Messages utilisés ce mois</span>
          <span className="text-[12px] font-bold text-[var(--color-primary)]">
            {currentQuota.used}/{currentQuota.max}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]" role="progressbar" aria-label="Messages utilisés ce mois" aria-valuenow={currentQuota.used} aria-valuemin={0} aria-valuemax={currentQuota.max}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${Math.min((currentQuota.used / currentQuota.max) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Dietary / Dislikes / Cuisines sections */}
      {SECTIONS.map(section => {
        const items = currentProfile[section.key] as string[]
        return (
          <div
            key={section.key}
            className="mb-3 rounded-2xl border border-[var(--color-border)] bg-white p-[18px]"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[15px] ${section.bgClass}`}>
                {section.emoji}
              </span>
              <span className="font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
                {section.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(items.length ? items : ["Aucune"]).map(item => (
                <span
                  key={item}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold ${section.bgClass} ${section.textClass}`}
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
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-[15px]">
            ⏱
          </span>
          <span className="font-[family-name:var(--font-playfair)] text-[15px] font-bold text-[var(--color-text)]">
            Contraintes pratiques
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {practicalItems.map(item => (
            <span
              key={item}
              className="rounded-full bg-violet-50 px-3 py-1 text-[13px] font-semibold text-violet-700"
            >
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
          quota={currentQuota}
          onClose={() => setChatOpen(false)}
          onProfileUpdate={handleProfileUpdate}
          onQuotaIncrement={handleQuotaIncrement}
        />
      )}
    </div>
  )
}
