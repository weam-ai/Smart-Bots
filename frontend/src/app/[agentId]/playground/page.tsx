'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { httpGet } from '@/services/axios';
import { Agent } from '@/types/agent';
import AgentPlayground from '@/components/AgentPlayground';
import { PageLoader } from '@/components/ui/Loader';

export interface AgentFile {
  _id: string
  originalFilename: string
  fileSize: number
  mimeType: string
  status: string
  processing: {
    status: string
    completedAt?: string
  }
  createdAt: string
}

export interface AgentData {
  id: string
  name: string
  systemPrompt: string
  temperature: number
  model: string
  files: AgentFile[]
  status: 'uploading' | 'training' | 'trained' | 'error'
  trainingProgress: number
}

export default function PlaygroundPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = params.agentId as string;
  
  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState<AgentData>({
    id: agentId,
    name: 'Loading...',
    systemPrompt: 'You are a helpful AI assistant. Answer questions based on the provided documents.',
    temperature: 0.7,
    model: 'gpt-3.5-turbo',
    files: [],
    status: 'uploading',
    trainingProgress: 0
  });

  // Fetch agent data
  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        setLoading(true);
        
        // Fetch real agent data
        const agentResponse = await httpGet<Agent | {agent: Agent}>(`/agents/${agentId}`);
        const agent = (agentResponse as any).agent || agentResponse;
        
        if (!agent) {
          throw new Error('Agent not found');
        }

        // Fetch agent files
        let files: AgentFile[] = [];
        try {
          const filesResponse = await httpGet<{files: AgentFile[], pagination: any}>(`/upload/${agentId}/files`);
          files = filesResponse.files || [];
        } catch (fileError) {
          console.error('Error fetching files:', fileError);
          files = [];
        }

        // Map backend status to frontend status
        const mapAgentStatus = (backendStatus: string): 'uploading' | 'training' | 'trained' | 'error' => {
          switch (backendStatus) {
            case 'ready': return 'trained'
            case 'completed': return 'trained'
            case 'creating': return 'training'
            case 'error': return 'error'
            default: return 'uploading'
          }
        };

        // Calculate training progress
        const calculateTrainingProgress = (status: string, files: AgentFile[]): number => {
          if (status === 'ready' || status === 'completed') return 100
          if (files.length === 0) return 0
          
          const completedFiles = files.filter(f => f.processing.status === 'completed').length
          return Math.round((completedFiles / files.length) * 100)
        };

        setAgentData({
          id: agent._id,
          name: agent.name,
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature,
          model: agent.model,
          files: files,
          status: mapAgentStatus(agent.status),
          trainingProgress: calculateTrainingProgress(agent.status, files)
        });

      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId]);

  const handleAgentUpdate = (updates: Partial<AgentData>) => {
    setAgentData(prev => ({ ...prev, ...updates }));
  };

  const handleBack = () => {
    // Navigate back to agent detail page (step 2)
    window.history.back();
  };

  if (loading) {
    return <PageLoader text="Loading playground..." />;
  }

  return (
    <AgentPlayground
      agentData={agentData}
      onAgentUpdate={handleAgentUpdate}
      onBack={handleBack}
    />
  );
}
