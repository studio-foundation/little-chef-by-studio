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
