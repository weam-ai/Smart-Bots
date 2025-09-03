/**
 * File Upload Types
 * All types related to file uploads and processing
 */

// File Upload Status
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error'

// File Processing Status
export type ProcessingStatus = 'pending' | 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'failed'

// Uploaded File Info
export type UploadedFile = {
  id: string
  file: File
  status: UploadStatus
  progress: number
  error?: string
  fileId?: string
}

// File Upload Response
export type FileUploadResponse = {
  success: boolean
  message: string
  data: {
    agentId: string
    files: FileUploadResult[]
    failedFiles: FileUploadResult[]
    summary: {
      totalFiles: number
      successful: number
      failed: number
      queueBased: boolean
      s3Storage: boolean
    }
  }
  queue: {
    jobsQueued: number
    estimatedProcessingTime: string
    jobs: Array<{
      jobId: string
      status: string
    }>
  }
}

// Individual File Upload Result
export type FileUploadResult = {
  filename: string
  status: 'success' | 'error'
  fileId?: string
  error?: string
  size?: number
  mimeType?: string
}

// File Processing Info
export type FileProcessingInfo = {
  fileId: string
  filename: string
  status: ProcessingStatus
  progress: number
  stages: {
    textExtraction: ProcessingStage
    chunking: ProcessingStage
    embeddings: ProcessingStage
    qdrant: ProcessingStage
  }
  error?: string
  completedAt?: string
}

// Processing Stage
export type ProcessingStage = {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  error?: string
  metadata?: any
}

// File Validation Error
export type FileValidationError = {
  filename: string
  error: string
  code: string
}

// File Constraints
export type FileConstraints = {
  maxFileSize: number
  maxTotalSize: number
  maxFiles: number
  acceptedTypes: Record<string, string[]>
}
