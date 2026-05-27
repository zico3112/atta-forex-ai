import { getSupabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

// Seed knowledge base dari markdown files
export async function POST(req: Request) {
  try {
    const knowledgeDir = path.join(process.cwd(), 'knowledge-base')
    const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md'))

    const chunks = []

    for (const file of files) {
      const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8')
      const topic = file.replace(/^\d+-/, '').replace('.md', '').replace(/-/g, ' ')

      // Split content into smaller chunks by heading sections
      const sections = content.split(/\n## /)

      for (const section of sections) {
        if (section.trim().length < 50) continue

        chunks.push({
          topic: topic,
          content: section.trim(),
          metadata: { file, source: 'hatta-notes' }
        })
      }
    }

    // Insert into Supabase (without embeddings for now — will add later)
    const db = getSupabaseAdmin()
    const { error } = await db
      .from('knowledge_chunks')
      .upsert(chunks, { onConflict: 'id' })

    if (error) throw error

    return Response.json({
      success: true,
      message: `Berjaya seed ${chunks.length} knowledge chunks dari ${files.length} files`,
      chunks: chunks.length
    })
  } catch (error) {
    console.error('Seed error:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
