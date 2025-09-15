import { useState } from 'react';
import { axiosInstance } from '@/services/axios';
import toast from 'react-hot-toast';

interface ImmediateDeleteResponse {
  success: boolean;
  message: string;
  data: {
    deletedFile: {
      id: string;
      originalName: string;
      size: number;
    };
    deletedFrom: string[];
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

export const useDeleteFileImmediate = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteFileImmediate = async (agentId: string, fileId: string): Promise<boolean> => {
    console.log(`🗑️  Immediate file deletion for ID: ${fileId} in agent: ${agentId}`);
    setIsDeleting(true);
    setError(null);

    try {
      const response = await axiosInstance.delete<ImmediateDeleteResponse | DeleteFileError>(
        `/upload/${agentId}/files/${fileId}/immediate`
      );

      if (response.data.success) {
        const successData = response.data as ImmediateDeleteResponse;
        console.log('File deleted immediately:', successData.data);
        
        // Show success toast
        toast.success(`File "${successData.data.deletedFile.originalName}" deleted immediately`, {
          duration: 3000,
          icon: '🗑️',
        });
        
        return true;
      } else {
        const errorData = response.data as DeleteFileError;
        setError(errorData.error.message);
        console.error('Immediate file deletion failed:', errorData.error);
        
        // Show error toast
        toast.error(`Failed to delete file: ${errorData.error.message}`, {
          duration: 5000,
        });
        
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.message || 
                          'Failed to delete file immediately';
      setError(errorMessage);
      console.error('Immediate file deletion error:', err);
      
      // Show error toast
      toast.error(`Failed to delete file: ${errorMessage}`, {
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

  return {
    deleteFileImmediate,
    isDeleting,
    error,
    clearError,
  };
};
