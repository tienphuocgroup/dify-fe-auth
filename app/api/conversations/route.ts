import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, setSession } from '@/app/api/utils/common'

export async function GET(request: NextRequest) {
  try {
    const { sessionId, user } = getInfo(request)
    const { data }: any = await client.getConversations(user)
    return NextResponse.json(data, {
      headers: setSession(sessionId),
    })
  }
  catch (error: any) {
    console.error('Conversations API error:', error)
    return NextResponse.json({
      data: [],
      error: error.message,
    }, { status: 500 })
  }
}
