"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Globe } from "lucide-react";

interface AgentHeaderProps {
  title: string;
  subtitle: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  onBack: () => void;
  agentName?: string;
  showDeployButton?: boolean;
  onDeploy?: () => void;
}

const AgentHeader: React.FC<AgentHeaderProps> = ({
  title,
  subtitle,
  currentStep,
  totalSteps,
  stepName,
  onBack,
  agentName,
  showDeployButton = false,
  onDeploy,
}) => {
  const router = useRouter();

  const renderStepIndicators = () => {
    const indicators = [];
    for (let i = 1; i <= totalSteps; i++) {
      indicators.push(
        <div
          key={i}
          className={`w-8 h-2 rounded-full ${
            i < currentStep
              ? "bg-black"
              : i === currentStep
              ? "bg-gray-500"
              : "bg-gray-200"
          }`}
        />
      );
    }
    return indicators;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-gray-200">
          {/* Center - Logo and Text */}
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              router.replace("/");
            }}
          >
            <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Bot className="h-7 w-7 text-black p-1" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weam AI</h2>
            </div>
          </div>

          {/* back to button */}
          <button
            onClick={() => {
              window.location.assign("/");
            }}
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-md text-sm hover:bg-black hover:text-white"
          >
            <>
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </>
          </button>
        </div>
        <div className="flex mx-auto md:items-center justify-between gap-4 mt-2 mb-2 md:flex-row flex-col px-2 md:px-0">
          {/* Left side - Back button and title */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 bg-gray-100 rounded-md hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">
                {subtitle}
                {agentName && ` • Agent: ${agentName}`}
              </p>
            </div>
          </div>

          {/* Right side - Step indicators and optional deploy button */}
          <div className="flex items-center gap-4 flex-col md:flex-row">
            <div className="flex items-center gap-1">
              {renderStepIndicators()}
            </div>
            <span className="text-sm text-gray-500">{stepName}</span>
            {showDeployButton && onDeploy && (
              <button
                onClick={onDeploy}
                className="border px-4 py-2 rounded-md text-sm bg-black text-white hover:bg-gray-700 hover:text-white flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Deploy
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AgentHeader;
