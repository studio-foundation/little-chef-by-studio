import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local from the project root; no-op if already set in environment
config({ path: resolve(process.cwd(), '.env.local'), quiet: true })
config({ path: resolve(process.cwd(), '.env'), quiet: true })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

async function main() {
  process.stdin.setEncoding('utf-8')
  let raw = ''
  for await (const chunk of process.stdin) {
    raw += chunk
  }
  raw = raw.trim()
  if (!raw) {
    console.error(JSON.stringify({ success: false, error: 'Missing stdin input' }))
    process.exit(1)
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw)
  } catch {
    console.error(JSON.stringify({ success: false, error: 'Invalid JSON argument' }))
    process.exit(1)
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId:      data.userId as string,
      title:       data.title as string,
      cuisine:     data.cuisine as string ?? null,
      timeMinutes: data.timeMinutes as number ?? null,
      portions:    data.portions as number ?? null,
      emoji:       data.emoji as string ?? null,
      calories:    data.calories as number ?? null,
      ingredients: data.ingredients as object,
      steps:       data.steps as object,
      notes:       data.notes as object ?? null,
    }
  })

  console.log(JSON.stringify({ success: true, id: recipe.id, title: recipe.title }))
}

main()
  .catch(err => {
    console.error(JSON.stringify({ success: false, error: String(err.message ?? err) }))
    process.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
