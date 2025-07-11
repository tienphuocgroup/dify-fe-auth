import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, getSessionHeaders } from '@/app/api/utils/common'

export async function GET(request: NextRequest) {
  try {
    const { sessionId, user } = await getInfo(request)
    const { data }: any = await client.getConversations(user)
    return NextResponse.json(data, {
      headers: getSessionHeaders(request, sessionId),
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
