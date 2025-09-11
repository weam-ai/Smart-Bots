"use client";

import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  File,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { AgentData } from "@/app/[agentId]/page";
import { useCompleteUpload } from "@/hooks/useUpload";
import { InlineLoader } from "@/components/ui/Loader";

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
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "application/msword":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "text/plain":
        return <File className="h-5 w-5 text-gray-500" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  // Files upload automatically, so we just need to handle completion
  const handleFilesCompleted = useCallback(() => {
    if (allCompleted && allSuccessful && uploadedFiles.length > 0) {
      console.log("✅ All files uploaded successfully, proceeding to training");
      const files = uploadedFiles.map((f) => f.file);
      onFilesUploaded(files);
    }
  }, [allCompleted, allSuccessful, uploadedFiles, onFilesUploaded]);

  // Call handleFilesCompleted when upload status changes
  useEffect(() => {
    handleFilesCompleted();
  }, [handleFilesCompleted]);

  const totalSize = getTotalSize();
  const hasScannedPDFs = uploadedFiles.some(
    (f) => f.file.type === "application/pdf"
  );

  console.log("🚀 ~ uploadedFiles:", uploadedFiles);
  console.log("🚀 ~ agentData.files:", agentData.files);
  console.log("🚀 ~ allCompleted:", allCompleted);
  console.log("🚀 ~ allSuccessful:", allSuccessful);
  console.log("🚀 ~ hasNewUploads:", hasNewUploads);
  console.log("🚀 ~ onStartTraining:", onStartTraining);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Upload Documents
                </h1>
                <p className="text-sm text-gray-500">
                  Step 1 of 4 • Agent: {agentData.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-8 h-2 bg-primary-600 rounded-full"></div>
                <div className="w-8 h-2 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-2 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <span className="text-sm text-gray-500 ml-2">Upload</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Upload Your Documents
          </h2>
          <p className="text-gray-600 mb-4">
            Upload the documents you want your AI agent to learn from. These
            will be processed and used to answer questions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>PDF, DOCX, TXT files</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Max 5MB per file</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
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
                ? "border-primary-500 bg-primary-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            {isDragActive ? (
              <div>
                <p className="text-xl text-primary-600 mb-2">
                  Drop the files here...
                </p>
                <p className="text-gray-500">Release to upload</p>
              </div>
            ) : (
              <div>
                <p className="text-xl text-gray-900 mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-gray-500 mb-4">
                  Choose PDF, DOCX, or TXT files to train your AI agent
                </p>
                <button className="btn-primary">Choose Files</button>
              </div>
            )}
          </div>
        </div>

        {/* Already Uploaded Files */}
        {agentData.files && agentData.files.length > 0 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Already Uploaded Files
              </h3>
              <div className="text-sm text-gray-500">
                {agentData.files.length} file
                {agentData.files.length !== 1 ? "s" : ""} ready for training
              </div>
            </div>

            <div className="space-y-4">
              {agentData.files.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getFileIcon(file.mimeType)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {file.originalFilename}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.fileSize)} • {file.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600">Ready</span>
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
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
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
            className="btn-secondary inline-flex items-center gap-2"
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
                    className="text-blue-600"
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

            {!hasNewUploads &&
              !(
                allCompleted &&
                allSuccessful &&
                (agentData.files.length > 0 || uploadedFiles.length > 0)
              ) &&
              onStartTraining && (
                <button
                  onClick={onStartTraining}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Train Chatbot
                </button>
              )}
          </div>
        </div>
      </main>
    </div>
  );
}
