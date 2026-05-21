import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local'), quiet: true })
config({ path: resolve(process.cwd(), '.env'), quiet: true })

import { mkdirSync, writeFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

interface GroceryItem {
  name: string
  quantity?: string
  unit?: string
  category?: string
}

function writeDemoMarkdown(items: GroceryItem[]): string {
  const outDir = resolve(process.cwd(), 'fixtures', 'grocery-lists')
  mkdirSync(outDir, { recursive: true })
  const slug = `demo-${Date.now()}`
  const path = resolve(outDir, `${slug}.md`)

  const byCategory = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const cat = item.category ?? 'Divers'
    ;(acc[cat] ??= []).push(item)
    return acc
  }, {})

  const lines = ['# Liste d\'épicerie\n']
  for (const [cat, catItems] of Object.entries(byCategory)) {
    lines.push(`## ${cat}\n`)
    for (const item of catItems) {
      const qty = [item.quantity, item.unit].filter(Boolean).join(' ')
      lines.push(`- [ ] ${item.name}${qty ? ` — ${qty}` : ''}`)
    }
    lines.push('')
  }

  writeFileSync(path, lines.join('\n'))
  return path
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

async function main() {
  process.stdin.setEncoding('utf-8')
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
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

  // Demo mode: no planId → write markdown file instead of DB
  if (!data.planId) {
    const items = (data.items as GroceryItem[]) ?? []
    const path = writeDemoMarkdown(items)
    console.log(JSON.stringify({ success: true, demo: true, path, itemCount: items.length }))
    return
  }

  const prisma = createPrismaClient()
  try {
    const groceryList = await prisma.groceryList.upsert({
      where: { planId: data.planId as string },
      update: { items: data.items as object },
      create: { planId: data.planId as string, items: data.items as object },
    })
    console.log(JSON.stringify({ success: true, id: groceryList.id, planId: groceryList.planId }))
  } catch {
    // planId not found in DB (e.g. demo run) — fall back to markdown file
    const items = (data.items as GroceryItem[]) ?? []
    const path = writeDemoMarkdown(items)
    console.log(JSON.stringify({ success: true, demo: true, path, itemCount: items.length }))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(JSON.stringify({ success: false, error: String(err.message ?? err) }))
  process.exit(1)
})
