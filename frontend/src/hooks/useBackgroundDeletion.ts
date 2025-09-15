/**
 * Hook for managing background file deletion operations
 */

import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '../services/axios';
import toast from 'react-hot-toast';

interface DeletionJob {
  jobId: string;
  fileId: string;
  originalName: string;
  fileSize: number;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimatedProcessingTime?: string;
  queuedAt: string;
  processedOn?: string;
  finishedOn?: string;
  failedReason?: string;
  attempts: number;
  maxAttempts: number;
}

interface DeletionJobStatus {
  exists: boolean;
  jobId: string;
  status: string;
  progress: number;
  data: any;
  createdAt: string;
  processedOn?: string;
  finishedOn?: string;
  failedReason?: string;
  attempts: number;
  maxAttempts: number;
}

interface UseBackgroundDeletionReturn {
  // State
  deletionJobs: DeletionJob[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  deleteFile: (agentId: string, fileId: string) => Promise<DeletionJob | null>;
  batchDeleteFiles: (agentId: string, fileIds: string[]) => Promise<DeletionJob | null>;
  checkJobStatus: (jobId: string) => Promise<DeletionJobStatus | null>;
  cancelJob: (jobId: string) => Promise<boolean>;
  clearError: () => void;
  
  // Utilities
  getJobById: (jobId: string) => DeletionJob | undefined;
  getActiveJobs: () => DeletionJob[];
  getCompletedJobs: () => DeletionJob[];
  getFailedJobs: () => DeletionJob[];
}

export const useBackgroundDeletion = (): UseBackgroundDeletionReturn => {
  const [deletionJobs, setDeletionJobs] = useState<DeletionJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Delete single file
  const deleteFile = useCallback(async (agentId: string, fileId: string): Promise<DeletionJob | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axiosInstance.delete(`/upload/${agentId}/files/${fileId}`);
      
      if (response.data.success) {
        const job: DeletionJob = {
          jobId: response.data.data.jobId,
          fileId: response.data.data.fileId,
          originalName: response.data.data.originalName,
          fileSize: response.data.data.fileSize,
          status: 'queued',
          progress: 0,
          estimatedProcessingTime: response.data.data.estimatedProcessingTime,
          queuedAt: response.data.data.queuedAt,
          attempts: 0,
          maxAttempts: 3
        };

        setDeletionJobs(prev => [job, ...prev]);
        
        // // Show success toast
        // toast.success(`File "${job.originalName}" queued for deletion`, {
        //   duration: 4000,
        //   icon: '🗑️',
        // });
        
        return job;
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to delete file';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Batch delete files
  const batchDeleteFiles = useCallback(async (agentId: string, fileIds: string[]): Promise<DeletionJob | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axiosInstance.delete(`/upload/${agentId}/files/batch`, {
        data: { fileIds }
      });
      
      if (response.data.success) {
        const job: DeletionJob = {
          jobId: response.data.data.jobId,
          fileId: 'batch', // Special identifier for batch jobs
          originalName: `Batch deletion (${response.data.data.totalFiles} files)`,
          fileSize: 0,
          status: 'queued',
          progress: 0,
          estimatedProcessingTime: response.data.data.estimatedProcessingTime,
          queuedAt: response.data.data.queuedAt,
          attempts: 0,
          maxAttempts: 3
        };

        setDeletionJobs(prev => [job, ...prev]);
        
        // Show success toast
        toast.success(`Batch deletion queued for ${response.data.data.totalFiles} files`, {
          duration: 4000,
          icon: '🗑️',
        });
        
        return job;
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to batch delete files';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check job status
  const checkJobStatus = useCallback(async (jobId: string): Promise<DeletionJobStatus | null> => {
    try {
      const response = await axiosInstance.get(`/upload/deletion-status/${jobId}`);
      
      if (response.data.success) {
        return response.data.data.job;
      }

      return null;
    } catch (err: any) {
      console.error('Failed to check job status:', err);
      return null;
    }
  }, []);

  // Cancel job
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/upload/deletion-job/${jobId}`);
      
      if (response.data.success) {
        setDeletionJobs(prev => 
          prev.map(job => 
            job.jobId === jobId 
              ? { ...job, status: 'cancelled' as const }
              : job
          )
        );
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Failed to cancel job:', err);
      return false;
    }
  }, []);

  // Get job by ID
  const getJobById = useCallback((jobId: string): DeletionJob | undefined => {
    return deletionJobs.find(job => job.jobId === jobId);
  }, [deletionJobs]);

  // Get active jobs
  const getActiveJobs = useCallback((): DeletionJob[] => {
    return deletionJobs.filter(job => job.status === 'queued' || job.status === 'active');
  }, [deletionJobs]);

  // Get completed jobs
  const getCompletedJobs = useCallback((): DeletionJob[] => {
    return deletionJobs.filter(job => job.status === 'completed');
  }, [deletionJobs]);

  // Get failed jobs
  const getFailedJobs = useCallback((): DeletionJob[] => {
    return deletionJobs.filter(job => job.status === 'failed');
  }, [deletionJobs]);

  // Auto-refresh job statuses for active jobs
  useEffect(() => {
    const activeJobs = getActiveJobs();
    
    if (activeJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of activeJobs) {
        const status = await checkJobStatus(job.jobId);
        if (status) {
          const previousJob = deletionJobs.find(j => j.jobId === job.jobId);
          const newStatus = status.status as any;
          
          // Show toast for status changes
          if (previousJob && previousJob.status !== newStatus) {
            if (newStatus === 'completed') {
              toast.success(`File "${job.originalName}" deleted successfully!`, {
                duration: 3000,
                icon: '✅',
              });
            } else if (newStatus === 'failed') {
              toast.error(`File deletion failed: ${status.failedReason || 'Unknown error'}`, {
                duration: 5000,
              });
            }
          }
          
          setDeletionJobs(prev => 
            prev.map(j => 
              j.jobId === job.jobId 
                ? {
                    ...j,
                    status: newStatus,
                    progress: status.progress,
                    processedOn: status.processedOn,
                    finishedOn: status.finishedOn,
                    failedReason: status.failedReason,
                    attempts: status.attempts,
                    maxAttempts: status.maxAttempts
                  }
                : j
            )
          );
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [getActiveJobs, checkJobStatus]);

  return {
    // State
    deletionJobs,
    isLoading,
    error,
    
    // Actions
    deleteFile,
    batchDeleteFiles,
    checkJobStatus,
    cancelJob,
    clearError,
    
    // Utilities
    getJobById,
    getActiveJobs,
    getCompletedJobs,
    getFailedJobs
  };
};
