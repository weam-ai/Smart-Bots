"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  File,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Bot,
} from "lucide-react";
import { AgentData } from "@/app/[agentId]/page";
import { useCompleteUpload } from "@/hooks/useUpload";
import { useDeleteFile, useDeleteFileImmediate } from "@/hooks";
import { InlineLoader } from "@/components/ui/Loader";
import { axiosInstance } from "@/services/axios";
import { useRouter } from "next/navigation";
import AgentHeader from "./AgentHeader";

interface AgentUploadProps {
  agentData: AgentData;
  onFilesUploaded: (files: File[]) => void;
  onBack: () => void;
  onStartTraining?: () => void;
  onStartTesting?: () => void;
  hasNewUploads?: boolean;
}

export default function AgentUpload({
  agentData,
  onFilesUploaded,
  onBack,
  onStartTraining,
  onStartTesting,
  hasNewUploads,
}: AgentUploadProps) {
  const router = useRouter();
  // Use real upload hooks
  const {
    uploadedFiles,
    addFiles,
    removeFile,
    clearFiles,
    allCompleted,
    allSuccessful,
    formatFileSize,
    getTotalSize,
    constraints,
    isUploading,
  } = useCompleteUpload();

  // File deletion hook
  const { deleteFile, isDeleting, error: deleteError, clearError, deletionJob, checkDeletionStatus, clearDeletionJob } = useDeleteFile();
  const { deleteFileImmediate, isDeleting: isDeletingImmediate, error: deleteImmediateError, clearError: clearImmediateError } = useDeleteFileImmediate();

  // State for managing already uploaded files
  const [existingFiles, setExistingFiles] = useState(agentData.files || []);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Create file handler with agent ID for automatic upload
      const fileHandler = addFiles(agentData.id);
      fileHandler(acceptedFiles);
    },
    [addFiles, agentData.id]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: constraints.ACCEPTED_TYPES,
    multiple: true,
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "application/pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return <FileText className="h-5 w-5 text-gray-500" />;
      case "application/msword":
        return <FileText className="h-5 w-5 text-gray-500" />;
      case "text/plain":
        return <File className="h-5 w-5 text-gray-500" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  // Files upload automatically, so we just need to handle completion
  const handleFilesCompleted = useCallback(() => {
    if (allCompleted && allSuccessful && uploadedFiles.length > 0) {
      const files = uploadedFiles.map((f) => f.file);
      onFilesUploaded(files);
      
      // Clear the uploaded files from local state since they're now in "Already Uploaded Files"
      // This prevents them from showing in both sections
      setTimeout(() => {
        clearFiles();
        toast.success(`Files moved to "Already Uploaded Files" section`, {
          duration: 3000,
          icon: '📁',
        });
      }, 1000); // Small delay to let the user see the success state
    }
  }, [allCompleted, allSuccessful, uploadedFiles, onFilesUploaded, clearFiles]);

  // Call handleFilesCompleted when upload status changes
  useEffect(() => {
    handleFilesCompleted();
  }, [handleFilesCompleted]);

  // Update existing files when agentData changes
  useEffect(() => {
    setExistingFiles(agentData.files || []);
  }, [agentData.files]);

  // Check deletion job status periodically
  useEffect(() => {
    if (!deletionJob) return;

    const interval = setInterval(async () => {
      const isCompleted = await checkDeletionStatus(deletionJob.jobId);
      if (isCompleted) {
        // Job completed, remove file from list and clear the deletion job
        setExistingFiles(prev => prev.filter(file => file._id !== deletionJob.fileId));
        clearDeletionJob();
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [deletionJob, checkDeletionStatus]);

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    setDeletingFileId(fileId);
    clearError();

    // Use background deletion for files in "Already Uploaded Files" section
    const success = await deleteFile(agentData.id, fileId);
    
    if (success) {
      // Remove file from local state (optimistic update)
      setExistingFiles(prev => prev.filter(file => file._id !== fileId));
      console.log("🗑️ File deletion queued for background processing");
    }
    
    setDeletingFileId(null);
    setShowDeleteConfirm(null);
  };

  // Handle remove uploaded file (from the "Uploaded Files" section)
  const handleRemoveUploadedFile = async (fileId: string, status: string) => {
    
    if (status === 'success') {
      // If file was successfully uploaded, we need to delete it from the server
      // Find the file in the uploaded files list
      const fileToRemove = uploadedFiles.find(f => f.id === fileId);
      if (fileToRemove) {
        // Find the corresponding file in the existing files (server-side)
        const serverFile = existingFiles.find(f => f.originalFilename === fileToRemove.file.name);
        if (serverFile) {
          // Queue deletion from server (background processing)
          const success = await deleteFile(agentData.id, serverFile._id);
          if (success) {
            // Remove from local uploaded files list immediately (optimistic update)
            removeFile(fileId);
            // Remove from existing files list immediately (optimistic update)
            setExistingFiles(prev => prev.filter(file => file._id !== serverFile._id));
            toast.success(`File "${fileToRemove.file.name}" queued for deletion`);
          } else {
            toast.error(`Failed to queue file deletion for "${fileToRemove.file.name}"`);
          }
        } else {
          // File not found on server, just remove from local list
          removeFile(fileId);
        }
      }
    } else if (status === 'pending' || status === 'processing') {
      // File is still being processed, but may already be in database
      // Find the file in the uploaded files list
      const fileToRemove = uploadedFiles.find(f => f.id === fileId);
      if (fileToRemove) {
        // Check if file exists in database (already uploaded)
        const serverFile = existingFiles.find(f => f.originalFilename === fileToRemove.file.name);
        if (serverFile) {
          // File is in database, delete it immediately (not background processing)
          const success = await deleteFileImmediate(agentData.id, serverFile._id);
          if (success) {
            // Remove from local uploaded files list
            removeFile(fileId);
            // Remove from existing files list (optimistic update)
            setExistingFiles(prev => prev.filter(file => file._id !== serverFile._id));
          }
        } else {
          // File not in existingFiles, but might still be in database with pending status
          // We need to try to delete it from database using the filename
          // Since we don't have the database _id, we need to find it by filename
          try {
            // Try to find and delete the file by searching for it in the database
            // We'll need to make an API call to find the file by filename and agent
            const response = await axiosInstance.get(`/upload/${agentData.id}/files?filename=${encodeURIComponent(fileToRemove.file.name)}`);
            
            if (response.data.success && response.data.data.files.length > 0) {
              // Found the file in database, delete it immediately
              const dbFile = response.data.data.files[0];
              const success = await deleteFileImmediate(agentData.id, dbFile._id);
              if (success) {
                // Remove from local uploaded files list
                removeFile(fileId);
                toast(`File "${fileToRemove.file.name}" deleted from database`, {
                  icon: '🗑️',
                  duration: 3000,
                });
              } else {
                // If deletion fails, just remove from local queue
                removeFile(fileId);
                toast(`File upload cancelled`, {
                  icon: 'ℹ️',
                  duration: 3000,
                });
              }
            } else {
              // File not found in database, just remove from local queue
              removeFile(fileId);
              toast(`File upload cancelled`, {
                icon: 'ℹ️',
                duration: 3000,
              });
            }
          } catch (error) {
            // If there's an error, just remove from local queue
            removeFile(fileId);
            toast(`File upload cancelled`, {
              icon: 'ℹ️',
              duration: 3000,
            });
          }
        }
      }
    } else {
      // File upload failed or other status, just remove from local list
      removeFile(fileId);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (fileId: string) => {
    setShowDeleteConfirm(fileId);
    
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
    clearError();
  };

  const totalSize = getTotalSize();
  const hasScannedPDFs = uploadedFiles.some(
    (f) => f.file.type === "application/pdf"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AgentHeader
        title="Upload Documents"
        subtitle="Step 1 of 4"
        currentStep={1}
        totalSteps={4}
        stepName="Upload"
        onBack={onBack}
        agentName={agentData.name}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Upload Your Documents
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Upload the documents you want your AI agent to learn from. These
            will be processed and used to answer questions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span>PDF, DOCX, TXT files</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span>Max 5MB per file</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span>Up to 10 files total</span>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="card mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragActive
                ? "border-gray-500 bg-gray-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            {isDragActive ? (
              <div>
                <p className="text-xl text-gray-600 mb-2">
                  Drop the files here...
                </p>
                <p className="text-gray-500">Release to upload</p>
              </div>
            ) : (
              <div>
                <p className="text-xl text-gray-900 mb-1">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-gray-500 mb-4 text-sm">
                  Choose PDF, DOCX, or TXT files to train your AI agent
                </p>
                <button className="border px-4 py-2 rounded-md text-sm hover:bg-black hover:text-white">Choose Files</button>
              </div>
            )}
          </div>
        </div>

        {/* Already Uploaded Files */}
        {existingFiles && existingFiles.length > 0 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Already Uploaded Files
              </h3>
              <div className="text-sm text-gray-500">
                {existingFiles.length} file
                {existingFiles.length !== 1 ? "s" : ""} ready for training
              </div>
            </div>

            {/* Delete Error Message */}
            {deleteError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Delete Failed
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {deleteError}
                    </p>
                    <button
                      onClick={clearError}
                      className="text-sm text-red-600 hover:text-red-800 underline mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {existingFiles.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg flex-col md:flex-row"
                >
                  <div className="flex items-center gap-4">
                    <div>{getFileIcon(file.mimeType)}</div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {file.originalFilename}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.fileSize)} • {file.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status indicator */}
                    {deletionJob && deletionJob.fileId === file._id ? (
                      <div className="flex items-center gap-2">
                        <InlineLoader variant="dots" size="sm" />
                        <span className="text-sm text-blue-600">Deleting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600">Ready</span>
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteConfirm(file._id)}
                      disabled={deletingFileId === file._id || isDeleting || (deletionJob?.fileId === file._id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete file"
                    >
                      {deletingFileId === file._id ? (
                        <InlineLoader variant="dots" size="sm" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Uploaded Files
              </h3>
              <div className="text-sm text-gray-500">
                {uploadedFiles.length} file
                {uploadedFiles.length !== 1 ? "s" : ""} •{" "}
                {formatFileSize(totalSize)}
              </div>
            </div>

            <div className="space-y-4">
              {uploadedFiles.map((fileInfo) => (
                <div
                  key={fileInfo.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getFileIcon(fileInfo.file.type)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {fileInfo.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(fileInfo.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {fileInfo.status === "uploading" && (
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileInfo.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">
                          {Math.round(fileInfo.progress)}%
                        </span>
                      </div>
                    )}

                    {fileInfo.status === "success" && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600">Ready</span>
                      </div>
                    )}

                    {fileInfo.status === "error" && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm text-red-600">Error</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleRemoveUploadedFile(fileInfo.id, fileInfo.status)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {hasScannedPDFs && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      PDF Files Detected
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Make sure your PDFs contain selectable text. Scanned PDFs
                      (images) may not be processed correctly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="border px-4 py-2 rounded-md text-sm hover:bg-black hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </button>

          <div className="flex items-center gap-4">
            {/* Show upload status */}
            {uploadedFiles.length > 0 && (
              <div className="flex items-center gap-4">
                {isUploading && (
                  <InlineLoader 
                    variant="dots" 
                    size="sm" 
                    text="Uploading files..." 
                    className="text-gray-600"
                  />
                )}

                {allCompleted && allSuccessful && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Files uploaded successfully!
                    </span>
                  </div>
                )}

                {allCompleted && !allSuccessful && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Some files failed to upload</span>
                  </div>
                )}
              </div>
            )}

            {/* Button Logic based on file states */}
            {(() => {
              const hasUploadedFiles = uploadedFiles.length > 0;
              const hasExistingFiles = existingFiles.length > 0;
              const canTrain = allCompleted && allSuccessful;

              // Case 1: No new uploads but has existing files -> Show "Test Chatbot" button
              if (!hasNewUploads && !hasUploadedFiles && hasExistingFiles) {
                return (
                  <button
                    onClick={onStartTesting}
                    className="border px-4 py-2 rounded-md text-sm bg-black text-white hover:bg-gray-700 hover:text-white flex items-center gap-2"
                  >
                    Test Chatbot
                    <ArrowRight className="h-4 w-4" />
                  </button>
                );
              }

              // Case 2: No files at all -> Disable "Train Chatbot" button
              if (!hasUploadedFiles && !hasExistingFiles) {
                return (
                  <button
                    className="border px-4 py-2 rounded-md text-sm bg-black text-white hover:bg-gray-700 hover:text-white"
                    disabled={true}
                  >
                    Train Chatbot
                  </button>
                );
              }

              // Case 3 & 4: Has uploaded files (with or without existing files) -> Enable "Train Chatbot" button
              if (hasUploadedFiles && onStartTraining) {
                return (
                  <button
                    onClick={onStartTraining}
                    className="border px-4 py-2 rounded-md text-sm bg-black text-white cursor-pointer hover:bg-gray-700 hover:text-white"
                    disabled={isUploading}
                  >
                    Train Chatbot
                  </button>
                );
              }

              return null;
            })()}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete File
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this file? This action will remove the file from S3 storage, Pinecone vector database, and the local database. This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="border px-4 py-2 rounded-md text-sm hover:bg-black hover:text-white"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFile(showDeleteConfirm)}
                disabled={isDeleting}
                className="border px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-gray-700 hover:text-white flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <InlineLoader variant="dots" size="sm" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
