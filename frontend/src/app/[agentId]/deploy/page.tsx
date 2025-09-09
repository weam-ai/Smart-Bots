'use client';

import { useParams } from 'next/navigation';
import DeployWithChatHistory from '@/components/DeployWithChatHistory';

export default function DeployPage() {
  const params = useParams();
  const agentData = params.agentId as string;

  return <DeployWithChatHistory agentId={agentData} />;
}
