/**
 * AI Chatbot Widget - Embeddable Chat Interface
 * This widget can be embedded on any website to provide AI chat functionality
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api',
    WIDGET_VERSION: '1.0.0',
    DEFAULT_SETTINGS: {
      theme: 'light',
      position: 'bottom-right',
      size: {
        width: '400px',
        height: '600px'
      },
      autoOpen: false,
      welcomeMessage: 'Hi! How can I help you today?'
    }
  };

  // Widget state
  let widgetState = {
    isInitialized: false,
    isOpen: false,
    isMinimized: false,
    config: null,
    messages: [],
    currentSessionId: null,
    isLoading: false
  };

  // DOM elements
  let elements = {};

  /**
   * Initialize the widget
   */
  function init(config) {
    console.log('🤖 AI Chatbot Widget initializing...', config);
    
    if (widgetState.isInitialized) {
      console.warn('Widget already initialized');
      return;
    }

    // Merge config with defaults
    widgetState.config = { ...CONFIG.DEFAULT_SETTINGS, ...config };
    
    // Create widget HTML
    createWidgetHTML();
    
    // Setup event listeners
    setupEventListeners();
    
    // Apply custom CSS if provided
    if (widgetState.config.customCSS) {
      applyCustomCSS(widgetState.config.customCSS);
    }
    
    // Apply custom JS if provided
    if (widgetState.config.customJS) {
      try {
        eval(widgetState.config.customJS);
      } catch (error) {
        console.error('Error executing custom JS:', error);
      }
    }
    
    // Auto-open if configured
    if (widgetState.config.autoOpen) {
      setTimeout(() => {
        openWidget();
      }, 1000);
    }
    
    widgetState.isInitialized = true;
    console.log('✅ AI Chatbot Widget initialized successfully');
    
    // Track widget view
    trackAnalytics('view');
  }

  /**
   * Create widget HTML structure
   */
  function createWidgetHTML() {
    const widgetId = 'ai-chatbot-widget';
    
    // Remove existing widget if present
    const existingWidget = document.getElementById(widgetId);
    if (existingWidget) {
      existingWidget.remove();
    }
    
    // Create widget container
    const widget = document.createElement('div');
    widget.id = widgetId;
    widget.className = `ai-chatbot-widget ai-chatbot-${widgetState.config.theme}`;
    widget.style.cssText = getWidgetPositionStyles();
    
    // Create widget HTML
    widget.innerHTML = `
      <div class="ai-chatbot-container">
        <!-- Chat Header -->
        <div class="ai-chatbot-header">
          <div class="ai-chatbot-header-content">
            <div class="ai-chatbot-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div class="ai-chatbot-header-text">
              <div class="ai-chatbot-title">AI Assistant</div>
              <div class="ai-chatbot-subtitle">Online</div>
            </div>
          </div>
          <div class="ai-chatbot-header-actions">
            <button class="ai-chatbot-minimize-btn" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            <button class="ai-chatbot-close-btn" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Chat Messages -->
        <div class="ai-chatbot-messages" id="ai-chatbot-messages">
          <div class="ai-chatbot-welcome">
            <div class="ai-chatbot-welcome-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div class="ai-chatbot-welcome-text">
              ${widgetState.config.welcomeMessage}
            </div>
          </div>
        </div>
        
        <!-- Chat Input -->
        <div class="ai-chatbot-input-container">
          <div class="ai-chatbot-input-wrapper">
            <input 
              type="text" 
              class="ai-chatbot-input" 
              placeholder="Type your message..."
              id="ai-chatbot-input"
            />
            <button class="ai-chatbot-send-btn" id="ai-chatbot-send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Minimized State -->
      <div class="ai-chatbot-minimized" style="display: none;">
        <div class="ai-chatbot-minimized-content">
          <div class="ai-chatbot-minimized-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div class="ai-chatbot-minimized-text">AI Assistant</div>
        </div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(widget);
    
    // Store element references
    elements = {
      widget: widget,
      container: widget.querySelector('.ai-chatbot-container'),
      minimized: widget.querySelector('.ai-chatbot-minimized'),
      messages: widget.querySelector('#ai-chatbot-messages'),
      input: widget.querySelector('#ai-chatbot-input'),
      sendBtn: widget.querySelector('#ai-chatbot-send-btn'),
      minimizeBtn: widget.querySelector('.ai-chatbot-minimize-btn'),
      closeBtn: widget.querySelector('.ai-chatbot-close-btn')
    };
    
    // Apply widget styles
    applyWidgetStyles();
  }

  /**
   * Get widget position styles
   */
  function getWidgetPositionStyles() {
    const position = widgetState.config.position;
    const size = widgetState.config.size;
    
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
    };
    
    return `
      position: fixed;
      z-index: 999999;
      width: ${size.width};
      height: ${size.height};
      ${positions[position] || positions['bottom-right']}
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      border-radius: 12px;
      overflow: hidden;
      display: none;
    `;
  }

  /**
   * Apply widget styles
   */
  function applyWidgetStyles() {
    const styleId = 'ai-chatbot-widget-styles';
    
    // Remove existing styles
    const existingStyles = document.getElementById(styleId);
    if (existingStyles) {
      existingStyles.remove();
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = getWidgetCSS();
    
    document.head.appendChild(style);
  }

  /**
   * Get widget CSS
   */
  function getWidgetCSS() {
    const theme = widgetState.config.theme;
    const isLight = theme === 'light' || (theme === 'auto' && !window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    const colors = isLight ? {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)'
    } : {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      background: '#1f2937',
      surface: '#374151',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#4b5563',
      shadow: 'rgba(0, 0, 0, 0.3)'
    };
    
    return `
      .ai-chatbot-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .ai-chatbot-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: ${colors.background};
        border: 1px solid ${colors.border};
      }
      
      .ai-chatbot-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: ${colors.surface};
        border-bottom: 1px solid ${colors.border};
      }
      
      .ai-chatbot-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .ai-chatbot-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${colors.primary};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-chatbot-title {
        font-weight: 600;
        color: ${colors.text};
        font-size: 14px;
      }
      
      .ai-chatbot-subtitle {
        font-size: 12px;
        color: ${colors.textSecondary};
      }
      
      .ai-chatbot-header-actions {
        display: flex;
        gap: 8px;
      }
      
      .ai-chatbot-minimize-btn,
      .ai-chatbot-close-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: none;
        color: ${colors.textSecondary};
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .ai-chatbot-minimize-btn:hover,
      .ai-chatbot-close-btn:hover {
        background: ${colors.border};
        color: ${colors.text};
      }
      
      .ai-chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .ai-chatbot-welcome {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      
      .ai-chatbot-welcome-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${colors.primary};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .ai-chatbot-welcome-text {
        background: ${colors.surface};
        padding: 12px 16px;
        border-radius: 18px;
        color: ${colors.text};
        font-size: 14px;
        max-width: 80%;
      }
      
      .ai-chatbot-message {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      
      .ai-chatbot-message.user {
        flex-direction: row-reverse;
      }
      
      .ai-chatbot-message-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .ai-chatbot-message.user .ai-chatbot-message-avatar {
        background: ${colors.primary};
        color: white;
      }
      
      .ai-chatbot-message.assistant .ai-chatbot-message-avatar {
        background: ${colors.surface};
        color: ${colors.text};
      }
      
      .ai-chatbot-message-content {
        background: ${colors.surface};
        padding: 12px 16px;
        border-radius: 18px;
        color: ${colors.text};
        font-size: 14px;
        max-width: 80%;
        word-wrap: break-word;
      }
      
      .ai-chatbot-message.user .ai-chatbot-message-content {
        background: ${colors.primary};
        color: white;
      }
      
      .ai-chatbot-input-container {
        padding: 16px;
        border-top: 1px solid ${colors.border};
        background: ${colors.background};
      }
      
      .ai-chatbot-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .ai-chatbot-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid ${colors.border};
        border-radius: 24px;
        background: ${colors.background};
        color: ${colors.text};
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      
      .ai-chatbot-input:focus {
        border-color: ${colors.primary};
      }
      
      .ai-chatbot-input::placeholder {
        color: ${colors.textSecondary};
      }
      
      .ai-chatbot-send-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: ${colors.primary};
        color: white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }
      
      .ai-chatbot-send-btn:hover {
        background: ${colors.primaryHover};
      }
      
      .ai-chatbot-send-btn:disabled {
        background: ${colors.border};
        cursor: not-allowed;
      }
      
      .ai-chatbot-minimized {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${colors.primary};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 16px ${colors.shadow};
        transition: all 0.2s;
      }
      
      .ai-chatbot-minimized:hover {
        transform: scale(1.05);
      }
      
      .ai-chatbot-minimized-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      
      .ai-chatbot-minimized-avatar {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-chatbot-minimized-text {
        font-size: 10px;
        font-weight: 500;
      }
      
      .ai-chatbot-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        color: ${colors.textSecondary};
        font-size: 14px;
      }
      
      .ai-chatbot-loading-dots {
        display: flex;
        gap: 4px;
      }
      
      .ai-chatbot-loading-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${colors.textSecondary};
        animation: ai-chatbot-bounce 1.4s infinite ease-in-out both;
      }
      
      .ai-chatbot-loading-dot:nth-child(1) { animation-delay: -0.32s; }
      .ai-chatbot-loading-dot:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes ai-chatbot-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      /* Responsive */
      @media (max-width: 480px) {
        .ai-chatbot-widget {
          width: 100% !important;
          height: 100% !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          transform: none !important;
          border-radius: 0 !important;
        }
      }
    `;
  }

  /**
   * Apply custom CSS
   */
  function applyCustomCSS(customCSS) {
    const styleId = 'ai-chatbot-custom-styles';
    
    // Remove existing custom styles
    const existingStyles = document.getElementById(styleId);
    if (existingStyles) {
      existingStyles.remove();
    }
    
    // Create custom style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = customCSS;
    
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Send button click
    elements.sendBtn.addEventListener('click', handleSendMessage);
    
    // Enter key in input
    elements.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
    
    // Minimize button
    elements.minimizeBtn.addEventListener('click', minimizeWidget);
    
    // Close button
    elements.closeBtn.addEventListener('click', closeWidget);
    
    // Minimized widget click
    elements.minimized.addEventListener('click', openWidget);
  }

  /**
   * Handle send message
   */
  async function handleSendMessage() {
    const message = elements.input.value.trim();
    if (!message || widgetState.isLoading) return;
    
    // Clear input
    elements.input.value = '';
    
    // Add user message
    addMessage('user', message);
    
    // Set loading state
    setLoadingState(true);
    
    try {
      // Send message to backend
      const response = await sendMessageToBackend(message);
      console.log('🤖 Chat widget received response:', response);
      
      if (response.success) {
        // Add assistant response
        console.log('🤖 Adding assistant message:', response.data.content);
        addMessage('assistant', response.data.content);
        
        // Update session ID if new
        if (response.data.sessionId && response.data.sessionId !== widgetState.currentSessionId) {
          widgetState.currentSessionId = response.data.sessionId;
        }
        
        // Track interaction
        trackAnalytics('interaction');
      } else {
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Send message to backend
   */
  async function sendMessageToBackend(message) {
    // First, get the agent ID from the deployment
    const deploymentResponse = await fetch(`${CONFIG.API_BASE_URL}/deployments/${widgetState.config.deploymentId}/embed`);
    
    if (!deploymentResponse.ok) {
      throw new Error(`Failed to get deployment info: ${deploymentResponse.status}`);
    }
    
    const deploymentData = await deploymentResponse.json();
    const agentId = deploymentData.data.agentId;
    
    // Then send the message to the chat API
    const response = await fetch(`${CONFIG.API_BASE_URL}/chat/${agentId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: widgetState.currentSessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Add message to chat
   */
  function addMessage(type, content) {
    console.log('🤖 addMessage called:', { type, content });
    const messageElement = document.createElement('div');
    messageElement.className = `ai-chatbot-message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-chatbot-message-avatar';
    
    if (type === 'user') {
      avatar.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      `;
    } else {
      avatar.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      `;
    }
    
    const contentElement = document.createElement('div');
    contentElement.className = 'ai-chatbot-message-content';
    contentElement.textContent = content;
    
    messageElement.appendChild(avatar);
    messageElement.appendChild(contentElement);
    
    elements.messages.appendChild(messageElement);
    
    // Scroll to bottom
    elements.messages.scrollTop = elements.messages.scrollHeight;
    
    // Store message
    widgetState.messages.push({ type, content, timestamp: new Date() });
  }

  /**
   * Set loading state
   */
  function setLoadingState(loading) {
    widgetState.isLoading = loading;
    elements.sendBtn.disabled = loading;
    elements.input.disabled = loading;
    
    if (loading) {
      // Add loading indicator
      const loadingElement = document.createElement('div');
      loadingElement.className = 'ai-chatbot-loading';
      loadingElement.id = 'ai-chatbot-loading';
      loadingElement.innerHTML = `
        <div class="ai-chatbot-message-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="ai-chatbot-loading">
          <span>AI is typing</span>
          <div class="ai-chatbot-loading-dots">
            <div class="ai-chatbot-loading-dot"></div>
            <div class="ai-chatbot-loading-dot"></div>
            <div class="ai-chatbot-loading-dot"></div>
          </div>
        </div>
      `;
      elements.messages.appendChild(loadingElement);
      elements.messages.scrollTop = elements.messages.scrollHeight;
    } else {
      // Remove loading indicator
      const loadingElement = document.getElementById('ai-chatbot-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
    }
  }

  /**
   * Open widget
   */
  function openWidget() {
    if (!widgetState.isInitialized) return;
    
    elements.widget.style.display = 'block';
    elements.container.style.display = 'flex';
    elements.minimized.style.display = 'none';
    
    widgetState.isOpen = true;
    widgetState.isMinimized = false;
    
    // Focus input
    setTimeout(() => {
      elements.input.focus();
    }, 100);
  }

  /**
   * Minimize widget
   */
  function minimizeWidget() {
    if (!widgetState.isInitialized) return;
    
    elements.container.style.display = 'none';
    elements.minimized.style.display = 'flex';
    
    widgetState.isOpen = false;
    widgetState.isMinimized = true;
  }

  /**
   * Close widget
   */
  function closeWidget() {
    if (!widgetState.isInitialized) return;
    
    elements.widget.style.display = 'none';
    
    widgetState.isOpen = false;
    widgetState.isMinimized = false;
  }

  /**
   * Track analytics
   */
  function trackAnalytics(event, data = {}) {
    if (!widgetState.config.deploymentId) return;
    
    try {
      fetch(`${CONFIG.API_BASE_URL}/deployments/${widgetState.config.deploymentId}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: event,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        })
      }).catch(error => {
        console.warn('Failed to track analytics:', error);
      });
    } catch (error) {
      console.warn('Failed to track analytics:', error);
    }
  }

  /**
   * Public API
   */
  window.AIChatbotWidget = {
    init: init,
    open: openWidget,
    close: closeWidget,
    minimize: minimizeWidget,
    sendMessage: (message) => {
      if (elements.input) {
        elements.input.value = message;
        handleSendMessage();
      }
    },
    getState: () => ({ ...widgetState }),
    destroy: () => {
      const widget = document.getElementById('ai-chatbot-widget');
      if (widget) {
        widget.remove();
      }
      widgetState.isInitialized = false;
    }
  };

  // Auto-initialize if config is provided in global scope
  if (window.aiChatbotConfig) {
    init(window.aiChatbotConfig);
  }

})();
