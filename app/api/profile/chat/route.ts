// app/api/profile/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/src/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import type { UserProfile, ProfileDiff, ChatMessage } from '@/src/types/profile'

const anthropic = new Anthropic()

const VALID_BUDGETS = ['low', 'medium', 'flexible'] as const

function profileToText(p: UserProfile): string {
  return JSON.stringify({
    dietary: p.dietary,
    dislikes: p.dislikes,
    cuisines: p.cuisines,
    mealsPerWeek: p.mealsPerWeek,
    portions: p.portions,
    maxTimeMinutes: p.maxTimeMinutes,
    budgetWeekly: p.budgetWeekly,
  }, null, 2)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const message = typeof b.message === 'string' ? b.message.trim() : ''

  if (typeof b.currentProfile !== 'object' || b.currentProfile === null) {
    return NextResponse.json({ error: 'currentProfile is required' }, { status: 400 })
  }
  const currentProfile = b.currentProfile as UserProfile

  const conversationHistory = Array.isArray(b.conversationHistory)
    ? (b.conversationHistory as unknown[]).filter(
        (item): item is ChatMessage =>
          typeof item === 'object' &&
          item !== null &&
          (('from' in item && (item as Record<string, unknown>).from === 'chef') ||
            ('from' in item && (item as Record<string, unknown>).from === 'user')) &&
          'text' in item &&
          typeof (item as Record<string, unknown>).text === 'string',
      )
    : []

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // Quota check (increment happens after successful Claude call)
  const currentMonth = new Date().toISOString().slice(0, 7)
  let quota
  try {
    quota = await prisma.chatQuota.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, month: currentMonth, used: 0, max: 10 },
      update: {},
    })
    // Reset if month changed
    if (quota.month !== currentMonth) {
      quota = await prisma.chatQuota.update({
        where: { userId: session.user.id },
        data: { month: currentMonth, used: 0 },
      })
    }
    // Check limit
    if (quota.used >= quota.max) {
      return NextResponse.json({ error: 'Monthly quota reached' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Build Anthropic messages (exclude first chef message from history)
  const messages: Anthropic.MessageParam[] = conversationHistory
    .filter((_, i) => i > 0 || conversationHistory[0].from === 'user')
    .map(m => ({
      role: m.from === 'user' ? 'user' as const : 'assistant' as const,
      content: m.text,
    }))
  messages.push({ role: 'user', content: message })

  const systemPrompt = `Tu es Little Chef, un assistant culinaire chaleureux et bienveillant.
Tu aides l'utilisateur à modifier son profil alimentaire via une conversation naturelle.

Profil actuel :
${profileToText(currentProfile)}

Réponds toujours de façon conversationnelle. Quand l'utilisateur mentionne des changements à son profil, propose un diff précis.

Réponds UNIQUEMENT avec du JSON valide dans ce format exact :
{"chefResponse":"ton message","suggestedChanges":null}

Ou si des changements sont proposés :
{"chefResponse":"ton message décrivant les changements","suggestedChanges":{"dietary":["val"] ou null,"dislikes":["val"] ou null,"cuisines":["val"] ou null,"mealsPerWeek":5 ou null,"portions":2 ou null,"maxTimeMinutes":30 ou null,"budgetWeekly":"low"|"medium"|"flexible" ou null}}

Important : suggestedChanges remplace ENTIÈREMENT le champ modifié, pas un patch. Seuls les champs modifiés sont présents dans suggestedChanges.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    const text =
      response.content.length > 0 && response.content[0].type === 'text'
        ? response.content[0].text
        : ''

    let parsed: { chefResponse: string; suggestedChanges: ProfileDiff | null }
    try {
      parsed = JSON.parse(text) as typeof parsed
      if (typeof parsed.chefResponse !== 'string') {
        parsed = { chefResponse: text, suggestedChanges: null }
      }
      // Validate suggestedChanges if present
      if (parsed.suggestedChanges !== null && parsed.suggestedChanges !== undefined) {
        const sc = parsed.suggestedChanges
        if ('budgetWeekly' in sc && sc.budgetWeekly !== null &&
            !(VALID_BUDGETS as readonly string[]).includes(sc.budgetWeekly as string)) {
          sc.budgetWeekly = null
        }
      }
    } catch {
      parsed = { chefResponse: text, suggestedChanges: null }
    }

    // Increment quota after successful Claude call
    await prisma.chatQuota.update({
      where: { userId: session.user.id },
      data: { used: { increment: 1 } },
    })

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
