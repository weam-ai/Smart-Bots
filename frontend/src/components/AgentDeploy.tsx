"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  ExternalLink,
  Settings,
  Eye,
  Trash2,
  Plus,
  Globe,
  Code,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import { httpGet, httpPost, httpPut, httpDelete } from "@/services/axios";
import { PageLoader } from "@/components/ui/Loader";

interface Deployment {
  _id: string;
  name: string;
  description: string;
  websiteUrl?: string;
  settings: {
    theme: string;
    position: string;
    size: {
      width: string;
      height: string;
    };
    autoOpen: boolean;
    welcomeMessage: string;
    customCSS?: string;
    customJS?: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  isActive: boolean;
  analytics: {
    views: number;
    interactions: number;
    lastViewed?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AgentDeployProps {
  agentId: string;
  agentName: string;
  onBack: () => void;
  onViewHistory?: () => void;
}

export default function AgentDeploy({
  agentId,
  agentName,
  onBack,
  onViewHistory,
}: AgentDeployProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(
    null
  );
  const [showEmbedCode, setShowEmbedCode] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    show: boolean;
    deploymentId: string;
    deploymentName: string;
  }>({
    show: false,
    deploymentId: "",
    deploymentName: "",
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!showCreateModal) {
      resetForm();
      setEditingDeployment(null);
    }
  }, [showCreateModal]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    settings: {
      theme: "light",
      position: "bottom-right",
      size: {
        width: "400px",
        height: "600px",
      },
      autoOpen: false,
      welcomeMessage: "Hi! How can I help you today?",
      customCSS: "",
      customJS: "",
      logo: "",
      primaryColor: "#000000",
      secondaryColor: "#1E40AF",
    },
  });

  useEffect(() => {
    fetchDeployments();
  }, [agentId]);


  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const response = await httpGet<Deployment[]>(
        `/agents/${agentId}/deployments`
      );

      // Handle both array response and object with data property
      const deployments = Array.isArray(response)
        ? response
        : (response as any).data || [];

      setDeployments(deployments);
    } catch (error: any) {
      console.error("Error fetching deployments:", error);
      toast.error("Failed to fetch deployments");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Deployment name is required");
      return false;
    }

    // Validate size format (CSS size pattern: number + unit)
    const sizePattern = /^\d+(px|%|rem|em)$/;
    if (!sizePattern.test(formData.settings.size.width)) {
      toast.error("Width must be a valid CSS size (e.g., 400px, 50%, 20rem)");
      return false;
    }

    if (!sizePattern.test(formData.settings.size.height)) {
      toast.error("Height must be a valid CSS size (e.g., 600px, 80%, 30rem)");
      return false;
    }

    // Validate website URL if provided
    if (formData.websiteUrl && formData.websiteUrl.trim()) {
      const url = formData.websiteUrl.trim();
      // Allow localhost URLs and URLs with protocols
      if (
        !url.startsWith("http://") &&
        !url.startsWith("https://") &&
        !url.startsWith("localhost:") &&
        !url.includes(".")
      ) {
        toast.error(
          "Please enter a valid website URL (e.g., https://example.com or localhost:3002)"
        );
        return false;
      }
    }

    return true;
  };

  const handleCreateDeployment = async () => {
    if (!validateForm()) {
      return;
    }

    // Prepare data for backend (add protocol to URL if missing)
    const backendData = {
      ...formData,
      websiteUrl:
        formData.websiteUrl && formData.websiteUrl.trim()
          ? formData.websiteUrl.startsWith("http")
            ? formData.websiteUrl
            : `http://${formData.websiteUrl}`
          : formData.websiteUrl,
    };

    try {
      const response = await httpPost<{ data: Deployment }>(
        `/agents/${agentId}/deployments`,
        backendData
      );

      // Handle both direct response and response with data property
      const newDeployment = response.data || response;
      setDeployments((prev) => [newDeployment, ...prev]);

      setShowCreateModal(false);
      toast.success("Deployment created successfully!");
    } catch (error: any) {
      console.error("Error creating deployment:", error);
      toast.error("Failed to create deployment");
    }
  };

  const handleUpdateDeployment = async () => {
    if (!editingDeployment) return;

    if (!validateForm()) {
      return;
    }

    // Prepare data for backend (add protocol to URL if missing)
    const backendData = {
      ...formData,
      websiteUrl:
        formData.websiteUrl && formData.websiteUrl.trim()
          ? formData.websiteUrl.startsWith("http")
            ? formData.websiteUrl
            : `http://${formData.websiteUrl}`
          : formData.websiteUrl,
    };


    try {
      const response = await httpPut<{ data: Deployment }>(
        `/agents/${agentId}/deployments/${editingDeployment._id}`,
        backendData
      );

      // Handle both direct response and response with data property
      const updatedDeployment = response.data || response;
      setDeployments((prev) =>
        prev.map((d) =>
          d._id === editingDeployment._id ? updatedDeployment : d
        )
      );

      setEditingDeployment(null);
      setShowCreateModal(false);
      toast.success("Deployment updated successfully!");
    } catch (error: any) {
      console.error("Error updating deployment:", error);
      toast.error("Failed to update deployment");
    }
  };

  const handleDeleteDeployment = async (_id: string) => {
    if (!showDeleteConfirm.show) return;

    try {
      await httpDelete(`/agents/${agentId}/deployments/${_id}`);
      setDeployments((prev) => prev.filter((d) => d._id !== _id));
      toast.success("Deployment deleted successfully!");
      setShowDeleteConfirm({ show: false, deploymentId: "", deploymentName: "" });
    } catch (error: any) {
      console.error("Error deleting deployment:", error);
      toast.error("Failed to delete deployment");
    }
  };

  const openDeleteConfirm = (deployment: Deployment) => {
    setShowDeleteConfirm({
      show: true,
      deploymentId: deployment._id,
      deploymentName: deployment.name,
    });
  };

  const handleCopyEmbedCode = async (_id: string) => {
    try {
      const response = await httpGet<{ embedCode: string }>(
        `/deployments/${_id}/embed`
      );
      await navigator.clipboard.writeText(response.embedCode);
      toast.success("Embed code copied to clipboard!");
    } catch (error: any) {
      console.error("Error copying embed code:", error);
      toast.error("Failed to copy embed code");
    }
  };

  const handleViewEmbedCode = async (_id: string) => {
    try {
      const response = await httpGet<{ embedCode: string }>(
        `/deployments/${_id}/embed`
      );
      setShowEmbedCode(response.embedCode);
    } catch (error: any) {
      console.error("Error fetching embed code:", error);
      toast.error("Failed to fetch embed code");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      websiteUrl: "",
      settings: {
        theme: "light",
        position: "bottom-right",
        size: {
          width: "400px",
          height: "600px",
        },
        autoOpen: false,
        welcomeMessage: "Hi! How can I help you today?",
        customCSS: "",
        customJS: "",
        logo: "",
        primaryColor: "#000000",
        secondaryColor: "#1E40AF",
      },
    });
  };

  const openCreateModal = () => {
    setEditingDeployment(null);
    setShowCreateModal(true);
  };

  const openEditModal = (deployment: Deployment) => {

    const newFormData = {
      name: deployment.name,
      description: deployment.description,
      websiteUrl: deployment.websiteUrl || "",
      settings: {
        theme: deployment.settings.theme || "light",
        position: deployment.settings.position || "bottom-right",
        size: {
          width: deployment.settings.size?.width || "400px",
          height: deployment.settings.size?.height || "600px",
        },
        autoOpen: deployment.settings.autoOpen || false,
        welcomeMessage:
          deployment.settings.welcomeMessage || "Hi! How can I help you today?",
        customCSS: deployment.settings.customCSS || "",
        customJS: deployment.settings.customJS || "",
        logo: deployment.settings.logo || "",
        primaryColor: deployment.settings.primaryColor || "#3B82F6",
        secondaryColor: deployment.settings.secondaryColor || "#1E40AF",
      },
    };

    setFormData(newFormData);
    setEditingDeployment(deployment);
    setShowCreateModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <PageLoader text="Loading deployment..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex md:items-center justify-between mb-8 flex-col md:flex-row max-md:gap-y-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Deploy Your Chatbot
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Create deployments to embed your chatbot on any website
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="border px-4 py-2 rounded-md text-sm hover:bg-black hover:text-white flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Deployment
          </button>
        </div>
      </div>

      {/* Deployments Grid */}
      {deployments.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            No deployments yet
          </h3>
          <p className="text-gray-600 mb-6 text-sm">
            Create your first deployment to start embedding your chatbot on
            websites
          </p>
          <button
            onClick={openCreateModal}
            className="border px-4 py-2 rounded-md text-sm bg-black text-white hover:bg-gray-700 hover:text-white flex items-center gap-2 mx-auto"
          >
            <Plus className="h-5 w-5" />
            Create Your First Deployment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deployments
            .filter((deployment) => deployment && deployment._id)
            .map((deployment) => (
              <div
                key={deployment._id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {deployment?.name || "Unnamed Deployment"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {deployment?.description || "No description"}
                    </p>
                    {deployment?.websiteUrl && (
                      <div className="flex items-center gap-1 text-sm text-primary-600">
                        <ExternalLink className="h-4 w-4" />
                        <a
                          href={deployment.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {deployment.websiteUrl}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(deployment)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(deployment)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Edit Deployment */}
                  </div>
                </div>

                {/* Analytics */}
                {/* <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{deployment?.analytics?.views || 0} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>
                      {deployment?.analytics?.interactions || 0} interactions
                    </span>
                  </div>
                </div> */}

                {/* Settings Preview */}
                <div className="text-sm text-gray-600 mb-4">
                  <div>Theme: {deployment?.settings?.theme || "light"}</div>
                  <div>
                    Position: {deployment?.settings?.position || "bottom-right"}
                  </div>
                  <div>
                    Size: {deployment?.settings?.size?.width || "400px"} ×{" "}
                    {deployment?.settings?.size?.height || "600px"}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={() => handleCopyEmbedCode(deployment?._id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </button>
                  <button
                    onClick={() => handleViewEmbedCode(deployment?._id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Code className="h-4 w-4" />
                    View Code
                  </button>
                </div>

                <div className="text-xs text-gray-500 mt-3">
                  Created{" "}
                  {deployment?.createdAt
                    ? formatDate(deployment.createdAt)
                    : "Unknown"}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold mb-4">
                {editingDeployment
                  ? "Edit Deployment"
                  : "Create New Deployment"}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deployment Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                  placeholder="My Website Chatbot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                  rows={3}
                  placeholder="Brief description of this deployment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={formData.websiteUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      websiteUrl: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                  placeholder="https://example.com or localhost:3002"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: The website where this chatbot will be deployed
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Theme
                  </label>
                  <select
                    value={formData.settings.theme}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, theme: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={formData.settings.position}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          position: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width
                  </label>
                  <input
                    type="text"
                    value={formData.settings.size.width}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          size: {
                            ...prev.settings.size,
                            width: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                    placeholder="400px"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    e.g., 400px, 50%, 20rem
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height
                  </label>
                  <input
                    type="text"
                    value={formData.settings.size.height}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          size: {
                            ...prev.settings.size,
                            height: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                    placeholder="600px"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    e.g., 600px, 80%, 30rem
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Welcome Message
                </label>
                <input
                  type="text"
                  value={formData.settings.welcomeMessage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        welcomeMessage: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                  placeholder="Hi! How can I help you today?"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo (Optional)
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={formData.settings.logo}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, logo: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a URL to your logo image (PNG, JPG, SVG recommended)
                    </p>
                  </div>
                  {formData.settings.logo && (
                    <div className="w-12 h-12 border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={formData.settings.logo}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Color Picker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.settings.primaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            primaryColor: e.target.value,
                          },
                        }))
                      }
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.settings.primaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            primaryColor: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.settings.secondaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            secondaryColor: e.target.value,
                          },
                        }))
                      }
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.settings.secondaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            secondaryColor: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                      placeholder="#1E40AF"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoOpen"
                  checked={formData.settings.autoOpen}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        autoOpen: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="autoOpen"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Auto-open chatbot when page loads
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="border px-4 py-2 rounded-md text-sm hover:bg-black hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={
                  editingDeployment
                    ? handleUpdateDeployment
                    : handleCreateDeployment
                }
                disabled={!formData.name.trim()}
                className="border px-4 py-2 rounded-md text-sm bg-black text-white hover:bg-gray-700 hover:text-white"
              >
                {editingDeployment ? "Update Deployment" : "Create Deployment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbedCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Embed Code</h2>
              <button
                onClick={() => setShowEmbedCode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-100 rounded-md p-4 mb-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {showEmbedCode}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(showEmbedCode);
                  toast.success("Embed code copied to clipboard!");
                }}
                className="btn-gray flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowEmbedCode(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Deployment
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Are you sure you want to delete <strong>"{showDeleteConfirm.deploymentName}"</strong>? 
                  This action cannot be undone and will remove all associated data.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm({ show: false, deploymentId: "", deploymentName: "" })}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteDeployment(showDeleteConfirm.deploymentId)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
