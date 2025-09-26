'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  FileText, 
  File, 
  X, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UploadedFile {
  id: string
  file: File
  status: 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface DocumentUploadProps {
  onUpload: (files: File[]) => void
  onBack: () => void
  agentName: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_FILES = 10
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt']
}

export default function DocumentUpload({ onUpload, onBack, agentName }: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = []
    const errors: string[] = []
    let totalSize = uploadedFiles.reduce((acc, f) => acc + f.file.size, 0)

    for (const file of files) {
      // Check file type
      if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type. Only PDF, DOCX, and TXT files are allowed.`)
        continue
      }

      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 5MB limit.`)
        continue
      }

      // Check total file count
      if (uploadedFiles.length + valid.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed.`)
        break
      }

      // Check total size
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`${file.name}: Would exceed 50MB total size limit.`)
        continue
      }

      // Check for duplicates
      const isDuplicate = uploadedFiles.some(f => f.file.name === file.name) ||
                         valid.some(f => f.name === file.name)
      if (isDuplicate) {
        errors.push(`${file.name}: File already selected.`)
        continue
      }

      valid.push(file)
      totalSize += file.size
    }

    return { valid, errors }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const { valid, errors } = validateFiles(acceptedFiles)

    // Show errors
    errors.forEach(error => toast.error(error))

    if (valid.length === 0) return

    // Add files to upload queue
    const newFiles: UploadedFile[] = valid.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading',
      progress: 0
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    // Simulate upload progress
    newFiles.forEach((fileInfo, index) => {
      const interval = setInterval(() => {
        setUploadedFiles(prev => prev.map(f => {
          if (f.id === fileInfo.id) {
            const newProgress = Math.min(f.progress + Math.random() * 20, 100)
            if (newProgress >= 100) {
              clearInterval(interval)
              return { ...f, progress: 100, status: 'success' as const }
            }
            return { ...f, progress: newProgress }
          }
          return f
        }))
      }, 200)

      // Cleanup interval after 3 seconds
      setTimeout(() => clearInterval(interval), 3000)
    })
  }, [uploadedFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true
  })

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'application/pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return <FileText className="h-5 w-5 text-gray-500" />
      case 'text/plain':
        return <File className="h-5 w-5 text-gray-500" />
      default:
        return <File className="h-5 w-5 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleContinue = () => {
    const files = uploadedFiles.map(f => f.file)
    onUpload(files)
  }

  const totalSize = uploadedFiles.reduce((acc, f) => acc + f.file.size, 0)
  const allUploaded = uploadedFiles.length > 0 && uploadedFiles.every(f => f.status === 'success')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 bg-gray-100 rounded-md hover:text-black transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Upload Documents</h1>
                <p className="text-sm text-gray-500">Agent: {agentName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Area */}
        <div className="card mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-gray-500 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg text-gray-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg text-gray-900 mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, DOCX, and TXT files (max 5MB each, 50MB total)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Uploaded Files</h2>
              <div className="text-sm text-gray-500">
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} • {formatFileSize(totalSize)}
              </div>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((fileInfo) => (
                <div
                  key={fileInfo.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(fileInfo.file.type)}
                    <div>
                      <p className="font-medium text-gray-900">{fileInfo.file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(fileInfo.file.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {fileInfo.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                        <span className="text-sm text-gray-600">{Math.round(fileInfo.progress)}%</span>
                      </div>
                    )}
                    
                    {fileInfo.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    
                    {fileInfo.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}

                    <button
                      onClick={() => removeFile(fileInfo.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {uploadedFiles.some(f => f.file.type === 'application/pdf') && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    PDF files detected. Scanned PDFs may not be processed correctly.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Continue Button */}
        {allUploaded && (
          <div className="mt-8 text-center">
            <button
              onClick={handleContinue}
              className="border px-4 py-2 rounded-md text-sm bg-black text-white hover:bg-gray-700 hover:text-white flex items-center gap-2"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Continue to Training
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
