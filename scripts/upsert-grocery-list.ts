import { config } from 'dotenv'
import { resolve } from 'path'

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

  if (!data.planId) {
    console.log(JSON.stringify({ success: true, skipped: true, reason: 'no planId provided' }))
    return
  }

  const groceryList = await prisma.groceryList.upsert({
    where: { planId: data.planId as string },
    update: { items: data.items as object },
    create: {
      planId: data.planId as string,
      items:  data.items as object,
    },
  })

  console.log(JSON.stringify({ success: true, id: groceryList.id, planId: groceryList.planId }))
}

main()
  .catch(err => {
    console.error(JSON.stringify({ success: false, error: String(err.message ?? err) }))
    process.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
