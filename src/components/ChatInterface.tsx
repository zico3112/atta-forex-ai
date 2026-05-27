'use client'

import { useState, useRef, useEffect } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  image?: string // base64 image
}

const QUICK_PROMPTS = [
  "Explain sepit pagar system",
  "Macam mana nak guna ETA untuk H1?",
  "Apa itu Theory of Long Run?",
  "Check mindset sebelum trade",
  "Fibonacci rules untuk TP dan SL",
  "Apa beza Sepit Sepit vs Pagar Sepit?",
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Assalamualaikum! Saya **Hatta AI** 🤖📈

Saya dilatih dengan sistem trading Hatta — termasuk **3M Foundation**, **Sepit/Pagar System**, **Total Sum Market**, **Fibonacci**, dan semua konsep dalam nota beliau.

Boleh tanya saya apa-apa tentang:
- 📊 Setup trade & pattern analysis
- 💰 Money management & risk
- 🧠 Mindset & psychology trading
- ⏱️ ETA untuk sebarang timeframe
- 🌊 Wave count & structure analysis
- 📸 Upload chart untuk analisa

Apa yang awak ingin tanya? 👇`
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [pendingImageName, setPendingImageName] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setPendingImage(base64)
      setPendingImageName(file.name)
      // Auto-fill placeholder text
      if (!input) setInput('Analisa chart ni — ini trend atau sideway? Setup apa yang nampak?')
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  const sendMessage = async (content: string, imageData?: string) => {
    const hasContent = content.trim() || imageData || pendingImage
    if (!hasContent || isLoading) return

    const imgToSend = imageData || pendingImage || undefined
    const userMessage: Message = {
      role: 'user',
      content: content.trim() || '📸 Analisa chart ini berdasarkan sistem Hatta.',
      image: imgToSend
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setPendingImage(null)
    setPendingImageName('')
    setIsLoading(true)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) throw new Error('API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No reader')

      let assistantContent = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantContent += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Ralat berlaku. Cuba lagi.' }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 rounded text-green-400">$1</code>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-gray-900">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xl">
          📈
        </div>
        <div>
          <h1 className="font-bold text-lg text-white">Hatta AI Trading Assistant</h1>
          <p className="text-xs text-gray-400">Dilatih dengan sistem 3M • Sepit/Pagar • Fibonacci</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                🤖
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-800 text-gray-100 rounded-bl-sm'
            }`}>
              {/* Show image if attached */}
              {msg.image && (
                <div className="mb-2">
                  <img
                    src={msg.image}
                    alt="Chart"
                    className="rounded-lg max-w-full max-h-60 object-contain border border-gray-600"
                  />
                </div>
              )}
              {msg.role === 'assistant' && msg.content === '' && isLoading ? (
                <div className="flex gap-1 py-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : (
                <div
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Soalan popular:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt)}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-gray-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview */}
      {pendingImage && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-2 border border-gray-700">
            <img src={pendingImage} alt="preview" className="w-14 h-14 object-cover rounded-lg" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 truncate">📸 {pendingImageName}</p>
              <p className="text-xs text-gray-500">Chart sedia untuk dianalisa</p>
            </div>
            <button
              onClick={() => { setPendingImage(null); setPendingImageName('') }}
              className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2 items-end">
          {/* Image Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 rounded-xl px-3 py-3 transition-colors flex-shrink-0"
            title="Upload chart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingImage ? "Tanya tentang chart ni... (Enter untuk hantar)" : "Tanya tentang sistem trading Hatta... (Enter untuk hantar)"}
            rows={1}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-green-500 text-sm"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />

          <button
            onClick={() => sendMessage(input)}
            disabled={(!input.trim() && !pendingImage) || isLoading}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Hatta AI • Upload chart 📸 untuk analisa • Bukan nasihat kewangan
        </p>
      </div>
    </div>
  )
}
