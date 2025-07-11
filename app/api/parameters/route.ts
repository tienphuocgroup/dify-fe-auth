import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, getSessionHeaders } from '@/app/api/utils/common'

export async function GET(request: NextRequest) {
  try {
    const { sessionId, user } = getInfo(request)
    const { data } = await client.getApplicationParameters(user)
    return NextResponse.json(data as object, {
      headers: getSessionHeaders(request, sessionId),
    })
  }
  catch (error: any) {
    console.error('Parameters API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
