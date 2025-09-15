import { useState } from 'react';
import { axiosInstance } from '@/services/axios';
import toast from 'react-hot-toast';

interface BackgroundDeletionResponse {
  success: boolean;
  message: string;
  data: {
    jobId: string;
    fileId: string;
    originalName: string;
    fileSize: number;
    status: 'queued';
    estimatedProcessingTime: string;
    queuedAt: string;
  };
  background: {
    processing: true;
    jobId: string;
    queueName: string;
    checkStatusUrl: string;
  };
}

interface DeleteFileError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: string;
  };
}

export const useDeleteFile = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletionJob, setDeletionJob] = useState<BackgroundDeletionResponse['data'] | null>(null);

  const deleteFile = async (agentId: string, fileId: string): Promise<boolean> => {
    console.log(`🗑️  Queuing file deletion for ID: ${fileId} in agent: ${agentId}`);
    setIsDeleting(true);
    setError(null);
    setDeletionJob(null);

    try {
      const response = await axiosInstance.delete<BackgroundDeletionResponse | DeleteFileError>(
        `/upload/${agentId}/files/${fileId}`
      );

      if (response.data.success) {
        const successData = response.data as BackgroundDeletionResponse;
        console.log('File deletion queued successfully:', successData.data);
        setDeletionJob(successData.data);
        
        // Show success toast
        // toast.success(`File "${successData.data.originalName}" queued for deletion`, {
        //   duration: 4000,
        //   icon: '🗑️',
        // });
        
        return true;
      } else {
        const errorData = response.data as DeleteFileError;
        setError(errorData.error.message);
        console.error('File deletion queue failed:', errorData.error);
        
        // Show error toast
        toast.error(`Failed to queue file deletion: ${errorData.error.message}`, {
          duration: 5000,
        });
        
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.message || 
                          'Failed to queue file deletion';
      setError(errorMessage);
      console.error('File deletion error:', err);
      
      // Show error toast
      toast.error(`Failed to queue file deletion: ${errorMessage}`, {
        duration: 5000,
      });
      
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const clearDeletionJob = () => {
    setDeletionJob(null);
  };

  // Check deletion job status
  const checkDeletionStatus = async (jobId: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.get(`/upload/deletion-status/${jobId}`);
      
      if (response.data.success) {
        const job = response.data.data.job;
        
        if (job.status === 'completed') {
          toast.success('File deleted successfully!', {
            duration: 3000,
            icon: '✅',
          });
          return true;
        } else if (job.status === 'failed') {
          toast.error(`File deletion failed: ${job.failedReason || 'Unknown error'}`, {
            duration: 5000,
          });
          return false;
        }
      }
      
      return false;
    } catch (err: any) {
      console.error('Failed to check deletion status:', err);
      return false;
    }
  };

  return {
    deleteFile,
    isDeleting,
    error,
    deletionJob,
    clearError,
    clearDeletionJob,
    checkDeletionStatus,
  };
};
