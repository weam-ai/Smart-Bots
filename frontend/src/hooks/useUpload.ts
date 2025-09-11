/**
 * File Upload API Hooks
 * Custom hooks for file upload operations
 */

import { useState, useCallback, useRef } from 'react'
import { httpUpload } from '@/services/axios'
import { API_ENDPOINTS, FILE_UPLOAD } from '@/utils/constants'
import type { FileUploadResponse, UploadedFile, FileValidationError } from '@/types/upload'
import toast from 'react-hot-toast'

// ==================== FILE VALIDATION ====================

export const useFileValidation = () => {
  const validateFiles = useCallback((files: File[]): {
    validFiles: File[]
    errors: FileValidationError[]
  } => {
    const validFiles: File[] = []
    const errors: FileValidationError[] = []

    for (const file of files) {
      // Check file type
      if (!Object.keys(FILE_UPLOAD.ACCEPTED_TYPES).includes(file.type)) {
        errors.push({
          filename: file.name,
          error: `Unsupported file type. Only ${Object.values(FILE_UPLOAD.ACCEPTED_TYPES).flat().join(', ')} files are allowed.`,
          code: 'INVALID_FILE_TYPE'
        })
        continue
      }

      // Check individual file size
      if (file.size > FILE_UPLOAD.MAX_FILE_SIZE) {
        errors.push({
          filename: file.name,
          error: `File size exceeds ${(FILE_UPLOAD.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB limit.`,
          code: 'FILE_TOO_LARGE'
        })
        continue
      }

      // Check for zero-byte files
      if (file.size === 0) {
        errors.push({
          filename: file.name,
          error: 'File is empty.',
          code: 'EMPTY_FILE'
        })
        continue
      }

      validFiles.push(file)
    }

    // Check total files count
    if (validFiles.length > FILE_UPLOAD.MAX_FILES) {
      const excess = validFiles.length - FILE_UPLOAD.MAX_FILES
      for (let i = 0; i < excess; i++) {
        const file = validFiles.pop()
        if (file) {
          errors.push({
            filename: file.name,
            error: `Maximum ${FILE_UPLOAD.MAX_FILES} files allowed.`,
            code: 'TOO_MANY_FILES'
          })
        }
      }
    }

    // Check total size
    const totalSize = validFiles.reduce((acc, file) => acc + file.size, 0)
    if (totalSize > FILE_UPLOAD.MAX_TOTAL_SIZE) {
      errors.push({
        filename: 'Multiple files',
        error: `Total size exceeds ${(FILE_UPLOAD.MAX_TOTAL_SIZE / 1024 / 1024).toFixed(1)}MB limit.`,
        code: 'TOTAL_SIZE_EXCEEDED'
      })
    }

    return { validFiles, errors }
  }, [])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  return {
    validateFiles,
    formatFileSize,
    constraints: FILE_UPLOAD,
  }
}

// ==================== FILE UPLOAD ====================

export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFiles = useCallback(async (
    agentId: string, 
    files: File[]
  ): Promise<FileUploadResponse | null> => {
    try {
      setIsUploading(true)
      setError(null)
      setUploadProgress({})

      // Create FormData
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })

      // Upload with progress tracking
      const response = await httpUpload<FileUploadResponse>(
        API_ENDPOINTS.UPLOAD.BY_AGENT(agentId),
        formData,
        (progress) => {
          // Update overall progress
          setUploadProgress(prev => ({
            ...prev,
            overall: progress
          }))
        }
      )

      // Show success/error messages based on results
      console.log('📊 Response structure:', response)
      
      if (response.data?.summary?.successful > 0) {
        toast.success(`${response.data.summary.successful} file(s) uploaded successfully!`)
      }
      
      if (response.data?.summary?.failed > 0) {
        toast.error(`${response.data.summary.failed} file(s) failed to upload`)
      }
      
      // Fallback for different response structures
      if (response.success && !response.data?.summary) {
        toast.success('Files uploaded successfully!')
      }

      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload files'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setIsUploading(false)
      setUploadProgress({})
    }
  }, [])

  const resetUpload = useCallback(() => {
    setUploadProgress({})
    setIsUploading(false)
    setError(null)
  }, [])

  return {
    uploadFiles,
    uploadProgress,
    isUploading,
    error,
    resetUpload,
  }
}

// ==================== UPLOADED FILES MANAGEMENT ====================

export const useUploadedFiles = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const addFiles = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0,
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    return newFiles
  }, [])

  const updateFileStatus = useCallback((fileId: string, status: UploadedFile['status'], progress?: number, error?: string) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status, progress: progress ?? file.progress, error }
        : file
    ))
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }, [])

  const clearFiles = useCallback(() => {
    setUploadedFiles([])
  }, [])

  const getFilesByStatus = useCallback((status: UploadedFile['status']) => {
    return uploadedFiles.filter(file => file.status === status)
  }, [uploadedFiles])

  const getTotalSize = useCallback(() => {
    return uploadedFiles.reduce((acc, file) => acc + file.file.size, 0)
  }, [uploadedFiles])

  const allCompleted = uploadedFiles.length > 0 && uploadedFiles.every(file => 
    file.status === 'success' || file.status === 'error'
  )

  const allSuccessful = uploadedFiles.length > 0 && uploadedFiles.every(file => 
    file.status === 'success'
  )

  return {
    uploadedFiles,
    addFiles,
    updateFileStatus,
    removeFile,
    clearFiles,
    getFilesByStatus,
    getTotalSize,
    allCompleted,
    allSuccessful,
  }
}

// ==================== COMBINED UPLOAD HOOK ====================

export const useCompleteUpload = () => {
  const { validateFiles, formatFileSize, constraints } = useFileValidation()
  const { uploadFiles, uploadProgress, isUploading, error: uploadError, resetUpload } = useFileUpload()
  const {
    uploadedFiles,
    addFiles,
    updateFileStatus,
    removeFile,
    clearFiles,
    getTotalSize,
    allCompleted,
    allSuccessful,
  } = useUploadedFiles()

  // Ref to track if we're currently uploading to prevent multiple uploads
  const isUploadingRef = useRef(false)

  const performUpload = useCallback(async (agentId: string, filesToUpload?: File[]): Promise<boolean> => {
    console.log('🚀 Starting upload for agent:', agentId)
    
    // Use provided files or fall back to uploadedFiles state
    const files = filesToUpload || uploadedFiles.map(f => f.file)
    console.log('📁 Files to upload:', files.length)
    
    // Prevent multiple simultaneous uploads
    if (isUploadingRef.current) {
      console.log('⏳ Upload already in progress, skipping')
      return false
    }
    
    if (files.length === 0) {
      console.error('❌ No files to upload')
      toast.error('No files to upload')
      return false
    }

    // Set uploading flag
    isUploadingRef.current = true

    // If using uploadedFiles state, set all files to uploading status
    if (!filesToUpload && uploadedFiles.length > 0) {
      uploadedFiles.forEach(fileInfo => {
        console.log('📤 Setting file to uploading:', fileInfo.file.name)
        updateFileStatus(fileInfo.id, 'uploading', 0)
      })
    }

    try {
      console.log('📡 Calling uploadFiles with:', files.map(f => f.name))
      
      const response = await uploadFiles(agentId, files)
      console.log('📡 Upload response:', response)
      
      if (response) {
        console.log('✅ Upload successful')
        // Mark all files as successful (only if using uploadedFiles state)
        if (!filesToUpload && uploadedFiles.length > 0) {
          uploadedFiles.forEach(fileInfo => {
            updateFileStatus(fileInfo.id, 'success', 100)
          })
        }
        
        // Show success toast
        toast.success(`Successfully uploaded ${files.length} file(s)!`)
        return true
      } else {
        console.error('❌ Upload failed - no response')
        // Mark all files as failed (only if using uploadedFiles state)
        if (!filesToUpload && uploadedFiles.length > 0) {
          uploadedFiles.forEach(fileInfo => {
            updateFileStatus(fileInfo.id, 'error', 0, 'Upload failed')
          })
        }
        
        // Show error toast
        toast.error('Upload failed - no response from server')
        return false
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      // Mark all files as failed (only if using uploadedFiles state)
      if (!filesToUpload && uploadedFiles.length > 0) {
        uploadedFiles.forEach(fileInfo => {
          updateFileStatus(fileInfo.id, 'error', 0, error instanceof Error ? error.message : 'Upload failed')
        })
      }
      
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      toast.error(`Upload failed: ${errorMessage}`)
      return false
    } finally {
      // Clear uploading flag
      isUploadingRef.current = false
    }
  }, [uploadedFiles, uploadFiles, updateFileStatus])



  const handleFilesSelected = useCallback(async (files: File[], agentId: string) => {
    console.log('📁 Files selected:', files.map(f => ({ name: f.name, type: f.type, size: f.size })))
    console.log('🤖 Agent ID for upload:', agentId)
    
    const { validFiles, errors } = validateFiles(files)
    
    console.log('✅ Valid files:', validFiles.length)
    console.log('❌ Validation errors:', errors.length)
    
    // Show validation errors
    errors.forEach(error => {
      console.error('Validation error:', error)
      toast.error(`${error.filename}: ${error.error}`)
    })

    // Add valid files and upload immediately
    if (validFiles.length > 0) {
      console.log('📤 Adding valid files and starting automatic upload')
      addFiles(validFiles)
      
      // Upload files directly (bypassing state race condition)
      try {
        const success = await performUpload(agentId, validFiles)
        if (success) {
          console.log('✅ Automatic upload completed successfully')
        } else {
          console.error('❌ Automatic upload failed')
        }
      } catch (error) {
        console.error('❌ Automatic upload error:', error)
      }
    }

    return validFiles.length > 0
  }, [validateFiles, addFiles, performUpload])

  const reset = useCallback(() => {
    clearFiles()
    resetUpload()
  }, [clearFiles, resetUpload])

  // Create a function that takes agentId and returns the file handler
  const createFileHandler = useCallback((agentId: string) => {
    return (files: File[]) => handleFilesSelected(files, agentId)
  }, [handleFilesSelected])

  return {
    // File management
    uploadedFiles,
    addFiles: createFileHandler, // Now returns a function that needs agentId
    removeFile,
    clearFiles: reset,
    
    // Upload operations
    performUpload,
    isUploading,
    uploadProgress,
    
    // Status
    allCompleted,
    allSuccessful,
    
    // Utilities
    formatFileSize,
    getTotalSize,
    constraints,
    
    // Errors
    uploadError,
  }
}
