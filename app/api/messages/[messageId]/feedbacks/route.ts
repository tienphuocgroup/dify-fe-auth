import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

export async function POST(
  request: NextRequest,
  props: {
    params: Promise<{ messageId: string }>
  }
) {
  const params = await props.params;
  const body = await request.json()
  const {
    rating,
  } = body
  const { messageId } = params
  const { user } = await getInfo(request)
  const { data } = await client.messageFeedback(messageId, rating, user)
  return NextResponse.json(data)
}
