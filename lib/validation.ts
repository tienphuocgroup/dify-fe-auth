import { z } from 'zod'

// Basic validation schemas
export const baseSchemas = {
  // Safe string validation with XSS protection
  safeString: z.string().min(1).max(10000).refine(
    (val) => !/<script[\s\S]*?<\/script>/gi.test(val),
    { message: 'Input contains potentially malicious content' }
  ),
  
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format').max(320)
}

// Chat message validation schema - more permissive for compatibility
export const chatMessageSchema = z.object({
  inputs: z.any().optional(), // Allow any inputs for flexibility
  query: z.string().min(1, 'Query cannot be empty'), // Basic string validation
  files: z.array(z.any()).optional(), // Allow any file format for now
  conversation_id: z.string().optional(), // Allow any string, not just UUID
  response_mode: z.enum(['streaming', 'blocking']).optional().default('streaming')
})

// File upload validation
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  // Documents
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_FILES_PER_REQUEST = 5

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` }
  }
  
  // Check file name for dangerous patterns
  const dangerousPatterns = [/\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.sh$/i, /\.php$/i]
  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    return { valid: false, error: 'File type not allowed for security reasons' }
  }
  
  return { valid: true }
}