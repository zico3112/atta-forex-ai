import { anthropic, HATTA_SYSTEM_PROMPT } from '@/lib/anthropic'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const lastMsg = messages[messages.length - 1]

    // Search knowledge base
    let knowledgeContext = ''
    try {
      const db = getSupabaseAdmin()
      const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : lastMsg.content
      const keywords = textContent.split(' ').slice(0, 5).join(' | ')
      const { data: chunks } = await db
        .from('knowledge_chunks')
        .select('topic, content')
        .textSearch('content', keywords)
        .limit(3)

      if (chunks && chunks.length > 0) {
        knowledgeContext = chunks
          .map((c: { topic: string; content: string }) => `### ${c.topic}\n${c.content}`)
          .join('\n\n')
      }
    } catch { /* skip RAG errors */ }

    const systemPrompt = knowledgeContext
      ? `${HATTA_SYSTEM_PROMPT}\n\n## Rujukan Dari Knowledge Base Hatta:\n${knowledgeContext}`
      : HATTA_SYSTEM_PROMPT

    // Convert messages to Anthropic format (support images)
    const anthropicMessages = messages.map((m: { role: string; content: string; image?: string }) => {
      // If message has image, build multi-part content
      if (m.image) {
        const content: MessageContent[] = []

        // Add image
        const base64Data = m.image.includes(',') ? m.image.split(',')[1] : m.image
        const mediaType = m.image.startsWith('data:image/png') ? 'image/png'
          : m.image.startsWith('data:image/jpg') || m.image.startsWith('data:image/jpeg') ? 'image/jpeg'
          : m.image.startsWith('data:image/gif') ? 'image/gif'
          : m.image.startsWith('data:image/webp') ? 'image/webp'
          : 'image/jpeg'

        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Data }
        })

        // Add text
        if (m.content) {
          content.push({ type: 'text', text: m.content })
        } else {
          content.push({ type: 'text', text: 'Analisa chart ini berdasarkan sistem trading Hatta. Kenal pasti: 1) Trend atau Sideway? 2) Pattern apa yang nampak? 3) Ada setup Sepit/Pagar? 4) Structure number sequence berapa? 5) ETA untuk timeframe ini?' })
        }

        return { role: m.role as 'user' | 'assistant', content }
      }

      // Text only
      return { role: m.role as 'user' | 'assistant', content: m.content }
    })

    // Stream response
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      }
    })

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })

  } catch (error) {
    console.error('Chat error:', error)
    return Response.json({ error: 'Ralat berlaku. Cuba lagi.' }, { status: 500 })
  }
}
