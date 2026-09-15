// src/app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const aiSchema = z.object({
  prompt: z.string().min(1).max(1000),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  action: z.enum(['generate', 'rewrite', 'shorten', 'expand', 'professional', 'friendly', 'translate']),
  existingText: z.string().optional(),
  language: z.string().optional(),
})

const demoResponses: Record<string, string[]> = {
  WHATSAPP: [
    "Hi {{first_name}}! 👋 We have an exciting announcement just for you. Don't miss out on our latest offer — check your inbox for details. Reply STOP to opt out.",
    "Hello {{first_name}}! Your appointment is confirmed for tomorrow. We look forward to seeing you. If you need to reschedule, reply to this message.",
    "🎉 Great news, {{first_name}}! Your order is ready. We'll send you tracking details shortly. Thank you for choosing us!",
    "Hi {{first_name}}, just a friendly reminder about your upcoming renewal on Friday. Reply YES to confirm or NO to cancel. Thanks!",
  ],
  EMAIL: [
    "Subject: Exciting news just for you!\n\nDear {{first_name}},\n\nWe're thrilled to share something special with you today. As one of our valued customers, you're the first to hear about our latest update.\n\nClick below to learn more.\n\nBest regards,\nThe Team",
    "Subject: Your account summary — {{first_name}}\n\nHello {{first_name}},\n\nHere's a quick summary of your activity this month. Everything looks great!\n\nIf you have any questions, our support team is here to help.\n\nBest,\nThe Team",
  ],
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = aiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { prompt, channel, action, existingText } = parsed.data

    // Track AI usage
    await prisma.aiUsage.create({
      data: {
        userId: session.user.id,
        action,
        prompt,
        model: process.env.AI_MODEL || 'demo',
      },
    })

    // Demo mode — return realistic sample responses
    const isDemoMode = process.env.DEMO_MODE === 'true'
    const noApiKey = !process.env.AI_API_KEY

    if (isDemoMode || noApiKey) {
      const responses = demoResponses[channel]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      return NextResponse.json({
        text: randomResponse,
        model: 'demo',
        tokensUsed: 0,
        isDemoMode: true,
      })
    }

    // Real OpenAI call
    const systemPrompt = `You are a professional marketing copywriter specializing in ${channel === 'WHATSAPP' ? 'WhatsApp Business' : 'email'} campaigns.
    Write concise, personalized, engaging messages. 
    Use {{first_name}}, {{last_name}}, {{email}}, {{phone}} as personalization variables where appropriate.
    Always include an opt-out note for marketing messages.
    ${channel === 'WHATSAPP' ? 'Keep messages under 500 characters. Use emojis sparingly.' : 'Use proper email formatting with greeting and signature.'}
    Return only the message text, nothing else.`

    let userPrompt = prompt
    if (action === 'rewrite' && existingText) {
      userPrompt = `Rewrite this message to be more engaging:\n\n${existingText}`
    } else if (action === 'shorten' && existingText) {
      userPrompt = `Shorten this message while keeping the key points:\n\n${existingText}`
    } else if (action === 'professional' && existingText) {
      userPrompt = `Rewrite in a professional tone:\n\n${existingText}`
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error('AI provider error')
    }

    const aiData = await response.json()
    const text = aiData.choices[0]?.message?.content?.trim() || ''
    const tokensUsed = aiData.usage?.total_tokens || 0

    return NextResponse.json({ text, model: process.env.AI_MODEL, tokensUsed })
  } catch (error) {
    console.error('[AI Generate] Error:', error)
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 })
  }
}
