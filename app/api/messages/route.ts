import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, getSessionHeaders } from '@/app/api/utils/common'

export async function GET(request: NextRequest) {
  try {
    const { sessionId, user } = getInfo(request)
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')
    const { data }: any = await client.getConversationMessages(user, conversationId as string)
    return NextResponse.json(data, {
      headers: getSessionHeaders(request, sessionId),
    })
  }
  catch (error: any) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
