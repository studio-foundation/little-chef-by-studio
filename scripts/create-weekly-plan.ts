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
  const userId = process.argv[2]
  if (!userId) {
    throw new Error('userId is required as first argument')
  }

  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)

  const plan = await prisma.weeklyPlan.create({
    data: {
      userId,
      weekStart,
    },
  })

  console.log(JSON.stringify({ success: true, planId: plan.id }))
}

main()
  .catch(err => {
    console.error(JSON.stringify({ success: false, error: String(err.message ?? err) }))
    process.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
