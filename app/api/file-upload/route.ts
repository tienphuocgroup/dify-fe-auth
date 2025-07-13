import { type NextRequest } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'
import { validateFile, MAX_FILES_PER_REQUEST } from '@/lib/validation'
import { createSecureResponse } from '@/lib/security-headers'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract and validate files
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value)
      }
    }
    
    // Check file count
    if (files.length > MAX_FILES_PER_REQUEST) {
      return createSecureResponse({ error: `Maximum ${MAX_FILES_PER_REQUEST} files allowed` }, 400)
    }
    
    // Validate each file
    for (const file of files) {
      const validation = validateFile(file)
      if (!validation.valid) {
        return createSecureResponse({ error: validation.error }, 400)
      }
    }
    
    const { user } = await getInfo(request)
    formData.append('user', user)
    const res = await client.fileUpload(formData)
    return createSecureResponse({ id: res.data.id })
  }
  catch (e: any) {
    console.error('File upload API error:', e)
    return createSecureResponse({ error: 'File upload failed' }, 500)
  }
}
