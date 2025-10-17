/**
 * AI Chatbot Widget - Embeddable Chat Interface
 * Optimized version with improved performance, accessibility, and maintainability
 * Version: 2.0.0
 */

(function() {
  'use strict';

  // Configuration with better defaults and validation
  const CONFIG = {
    API_BASE_URL: 'https://dev.weam.ai/ai-chatbot-api',
    WIDGET_VERSION: '2.0.0',
    DEFAULT_SETTINGS: {
      _id: null, // Deployment ID - required for API calls
      theme: 'light',
      position: 'bottom-right',
      size: {
        width: '400px',
        height: '600px'
      },
      autoOpen: false,
      welcomeMessage: 'Hi! How can I help you today?',
      logo: '',
      primaryColor: '#8b5cf6',
      secondaryColor: '#7c3aed',
      animationDuration: 300,
      maxMessageLength: 1000,
      typingDelay: 1000
    },
    
    // Default logo SVG (optimized)
    DEFAULT_LOGO_SVG: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/></svg>',
    
    // Animation timing
    ANIMATIONS: {
      SLIDE_UP: 'cubic-bezier(0.4, 0, 0.2, 1)',
      BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      FADE: 'ease-in-out'
    }
  };

  // Optimized widget state with better structure
  const widgetState = {
    isInitialized: false,
    isOpen: false,
    isMinimized: false,
    config: null,
    messages: [],
    currentSessionId: null,
    isLoading: false,
    visitor: null,
    showIdentityForm: true,
    websiteUrl: window.location.origin,
    messageQueue: [],
    retryCount: 0,
    maxRetries: 3
  };

  // Cached DOM elements for better performance
  let elements = {};
  
  // Event listener cleanup tracking
  const eventListeners = new Map();
  
  // Debounce utility
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Throttle utility
  const throttle = (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };

  /**
   * Load configuration dynamically from API with better error handling
   */
  async function loadConfig() {
    try {
      // For now, use default config - can be extended for dynamic loading
      // This prevents unnecessary API calls during development
      return CONFIG.DEFAULT_SETTINGS;
    } catch (error) {
      console.warn('⚠️ Error loading widget config:', error);
      return CONFIG.DEFAULT_SETTINGS;
    }
  }

  /**
   * Validate configuration object
   */
  function validateConfig(config) {
    const defaults = CONFIG.DEFAULT_SETTINGS;
    const validated = { ...defaults };
    
    // Validate _id (deployment ID) - required for API calls
    if (config._id && typeof config._id === 'string' && config._id.trim()) {
      validated._id = config._id.trim();
    } else if (config._id === null || config._id === undefined) {
      // Keep default null value
      validated._id = null;
    }
    
    // Validate theme
    if (config.theme && ['light', 'dark', 'auto'].includes(config.theme)) {
      validated.theme = config.theme;
    }
    
    // Validate position
    if (config.position && ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'].includes(config.position)) {
      validated.position = config.position;
    }
    
    // Validate size
    if (config.size && typeof config.size === 'object') {
      validated.size = {
        width: config.size.width || defaults.size.width,
        height: config.size.height || defaults.size.height
      };
    }
    
    // Validate colors
    if (config.primaryColor && /^#[0-9A-F]{6}$/i.test(config.primaryColor)) {
      validated.primaryColor = config.primaryColor;
    }
    
    if (config.secondaryColor && /^#[0-9A-F]{6}$/i.test(config.secondaryColor)) {
      validated.secondaryColor = config.secondaryColor;
    }
    
    // Validate other properties
    if (typeof config.autoOpen === 'boolean') {
      validated.autoOpen = config.autoOpen;
    }
    
    if (typeof config.welcomeMessage === 'string' && config.welcomeMessage.length <= 200) {
      validated.welcomeMessage = config.welcomeMessage;
    }
    
    if (typeof config.logo === 'string') {
      validated.logo = config.logo;
    }
    
    return validated;
  }

  /**
   * Generate a unique session ID
   */
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Initialize the widget with optimized setup
   */
  async function init(config = {}) {
    try {
      // Prevent double initialization
      if (widgetState.isInitialized) {
        console.warn('Widget already initialized');
        return;
      }

      // Load and validate configuration
      const defaultConfig = await loadConfig();
      widgetState.config = validateConfig({ ...defaultConfig, ...config });
      
      // Create widget HTML structure
      createWidgetHTML();
      
      // Setup event listeners with proper cleanup tracking
      setupEventListeners();
      
      // Apply custom styling
      applyCustomCSS(widgetState.config.customCSS);
      
      // Execute custom JavaScript safely
      executeCustomJS(widgetState.config.customJS);
      
      // Initialize widget state
      initializeWidgetState();
      
      // Setup global keyboard shortcuts
      setupGlobalShortcuts();
      
      // Mark as initialized
      widgetState.isInitialized = true;
      
      // Track initialization
      // trackAnalytics('init');
      
      // Auto-open if configured
      if (widgetState.config.autoOpen) {
        setTimeout(() => openWidget(), widgetState.config.animationDuration);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize widget:', error);
      throw error;
    }
  }

  /**
   * Initialize widget state and positioning
   */
  function initializeWidgetState() {
    widgetState.isOpen = false;
    widgetState.isMinimized = true;
    
    if (!elements.widget) return;
    
    // Apply minimized state
    elements.widget.classList.add('minimized');
    applyMinimizedStyles();
    
    // Show initial state
    elements.widget.style.display = 'block';
    elements.container.style.display = 'none';
    elements.minimized.style.display = 'flex';
    
    // Show welcome message
    if (elements.welcomeMessage) {
      elements.welcomeMessage.style.display = 'block';
    }
  }

  /**
   * Apply minimized state styles efficiently
   */
  function applyMinimizedStyles() {
    if (!elements.widget) return;
    
    const position = getMinimizedPositionStyles();
    const size = 'width: 300px; height: 0px;';
    
    // Use CSS custom properties for better performance
    elements.widget.style.setProperty('--widget-position', position);
    elements.widget.style.setProperty('--widget-size', size);
    
    // Apply styles in one operation
    elements.widget.style.cssText = `
      ${elements.widget.style.cssText}
      ${position}
      ${size}
    `;
  }

  /**
   * Execute custom JavaScript safely
   */
  function executeCustomJS(customJS) {
    if (!customJS || typeof customJS !== 'string') return;
    
    try {
      // Use Function constructor instead of eval for better security
      const func = new Function(customJS);
      func();
    } catch (error) {
      console.error('Error executing custom JS:', error);
    }
  }

  /**
   * Setup global keyboard shortcuts
   */
  function setupGlobalShortcuts() {
    const handleKeydown = (e) => {
      // Ctrl+Shift+C to toggle widget
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        toggleWidget();
      }
      
      // Escape to close widget
      if (e.key === 'Escape' && widgetState.isOpen) {
        e.preventDefault();
        closeWidget();
      }
    };
    
    // Add event listener with cleanup tracking
    document.addEventListener('keydown', handleKeydown);
    eventListeners.set('global-keydown', [{ element: document, handler: handleKeydown }]);
  }

  /**
   * Create widget HTML structure with optimized DOM creation
   */
  function createWidgetHTML() {
    const widgetId = 'ai-chatbot-widget';
    
    // Remove existing widget if present
    const existingWidget = document.getElementById(widgetId);
    if (existingWidget) {
      existingWidget.remove();
    }
    
    // Create widget container with proper ARIA attributes
    const widget = document.createElement('div');
    widget.id = widgetId;
    widget.className = `ai-chatbot-widget ai-chatbot-${widgetState.config.theme}`;
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-label', 'AI Chat Assistant');
    widget.setAttribute('aria-live', 'polite');
    widget.style.cssText = getWidgetPositionStyles();
    
    // Create widget HTML
    widget.innerHTML = `
      <!-- Welcome Message Card (shown when minimized) -->
      <div class="ai-chatbot-welcome-message" style="display: none;">${widgetState.config?.welcomeMessage || 'Hi! How can I help you today?'}</div>
      
      <div class="ai-chatbot-container" style="display: none;">
        <!-- Chat Header -->
        <div class="ai-chatbot-header">
          <div class="ai-chatbot-header-content">
            <div class="ai-chatbot-avatar">
              ${widgetState.config?.logo && widgetState.config.logo.trim() ? 
                `<img src="${widgetState.config.logo}" alt="Chatbot Logo" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                 <div style="display: none;">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                   </svg>
                 </div>` :
                `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                </svg>`
              }
            </div>
            <div class="ai-chatbot-header-text">
              <div class="ai-chatbot-title">AI Assistant</div>
              <div class="ai-chatbot-subtitle">Online</div>
            </div>
          </div>
          <div class="ai-chatbot-header-actions">
            <button class="ai-chatbot-refresh-btn" title="Refresh Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
            <button class="ai-chatbot-close-btn" title="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Identity Form -->
        <div class="ai-chatbot-identity-form" id="ai-chatbot-identity-form" style="display: ${widgetState.showIdentityForm ? 'block' : 'none'};">
          <div class="ai-chatbot-identity-header">
            <h3>Let's get started!</h3>
            <p>Please provide your details to begin chatting</p>
          </div>
          <form id="ai-chatbot-identity-form-element">
            <div class="ai-chatbot-form-group">
              <label for="ai-chatbot-name">Name *</label>
              <input type="text" id="ai-chatbot-name" name="name" required placeholder="Enter your name">
            </div>
            <div class="ai-chatbot-form-group">
              <label for="ai-chatbot-email">Email *</label>
              <input type="email" id="ai-chatbot-email" name="email" required placeholder="Enter your email">
            </div>
            <div class="ai-chatbot-form-group">
              <label class="ai-chatbot-checkbox-label">
                <input type="checkbox" id="ai-chatbot-privacy" name="privacy" required>
                <span class="ai-chatbot-checkbox-text">I agree to the privacy policy and terms of service</span>
              </label>
            </div>
            <button type="submit" class="ai-chatbot-identity-submit">Start Chatting</button>
          </form>
        </div>

        <!-- Chat Messages -->
        <div class="ai-chatbot-messages" id="ai-chatbot-messages" style="display: ${widgetState.showIdentityForm ? 'none' : 'block'};">
          <!-- Welcome message will be added dynamically when visitor submits identity form -->
        </div>
        
        <!-- Chat Input -->
        <div class="ai-chatbot-input-container" style="display: ${widgetState.showIdentityForm ? 'none' : 'block'};">
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
      <div class="ai-chatbot-minimized" style="display: flex;">
        <div class="ai-chatbot-minimized-content">
          <div class="ai-chatbot-minimized-avatar">
            ${widgetState.config?.logo && widgetState.config.logo.trim() ? 
              `<img src="${widgetState.config.logo}" alt="Chatbot Logo" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
               <div style="display: none;">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                 </svg>
               </div>` :
              `<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
              </svg>`
            }
          </div>
          
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
      welcomeMessage: widget.querySelector('.ai-chatbot-welcome-message'),
      messages: widget.querySelector('#ai-chatbot-messages'),
      identityForm: widget.querySelector('#ai-chatbot-identity-form'),
      identityFormElement: widget.querySelector('#ai-chatbot-identity-form-element'),
      input: widget.querySelector('#ai-chatbot-input'),
      sendBtn: widget.querySelector('#ai-chatbot-send-btn'),
      refreshBtn: widget.querySelector('.ai-chatbot-refresh-btn'),
      closeBtn: widget.querySelector('.ai-chatbot-close-btn')
    };
    
    // Apply dynamic positioning to welcome message and button
    applyWelcomeMessagePositioning();
    applyButtonPositioning();
    
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
      border-radius: 20px;
      overflow: hidden;
      display: none;
      padding: 2px;
    `;
  }

  /**
   * Get minimized widget position styles
   */
  function getMinimizedPositionStyles() {
    const position = widgetState.config.position;
    
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
    };
    
    return positions[position] || positions['bottom-right'];
  }

  /**
   * Get open widget position styles (positioned above the floating icon)
   */
  function getOpenPositionStyles() {
    const position = widgetState.config.position;
    
    const positions = {
      'bottom-right': 'bottom: 100px; right: 20px;', // Above the 70px floating icon + 30px margin
      'bottom-left': 'bottom: 100px; left: 20px;',   // Above the 70px floating icon + 30px margin
      'top-right': 'top: 100px; right: 20px;',       // Below the 70px floating icon + 30px margin
      'top-left': 'top: 100px; left: 20px;',         // Below the 70px floating icon + 30px margin
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
    };
    
    return positions[position] || positions['bottom-right'];
  }

  /**
   * Get speech bubble position styles based on widget position
   */
  function getSpeechBubblePositionStyles() {
    const position = widgetState.config.position;
    
    const positions = {
      'bottom-right': {
        bottom: '70px',
        right: '0px',
        arrowRight: '20px'
      },
      'bottom-left': {
        bottom: '70px',
        left: '0px',
        arrowLeft: '20px'
      },
      'top-right': {
        top: '70px',
        right: '0px',
        arrowRight: '20px'
      },
      'top-left': {
        top: '70px',
        left: '0px',
        arrowLeft: '20px'
      },
      'center': {
        bottom: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        arrowLeft: '50%',
        arrowTransform: 'translateX(-50%)'
      }
    };
    
    return positions[position] || positions['bottom-right'];
  }

  /**
   * Get button position styles based on widget position
   */
  function getButtonPositionStyles() {
    const position = widgetState.config.position;
    
    const positions = {
      'bottom-right': {
        bottom: '10px',
        right: '10px'
      },
      'bottom-left': {
        bottom: '10px',
        left: '10px'
      },
      'top-right': {
        top: '10px',
        right: '10px'
      },
      'top-left': {
        top: '10px',
        left: '10px'
      },
      'center': {
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)'
      }
    };
    
    return positions[position] || positions['bottom-right'];
  }

  /**
   * Apply dynamic positioning to welcome message based on widget position
   */
  function applyWelcomeMessagePositioning() {
    if (!elements.welcomeMessage) return;
    
    const position = getSpeechBubblePositionStyles();
    
    // Apply positioning styles with !important to override CSS
    elements.welcomeMessage.style.setProperty('bottom', position.bottom || '', 'important');
    elements.welcomeMessage.style.setProperty('top', position.top || '', 'important');
    elements.welcomeMessage.style.setProperty('left', position.left || '', 'important');
    elements.welcomeMessage.style.setProperty('right', position.right || '', 'important');
    elements.welcomeMessage.style.setProperty('transform', position.transform || '', 'important');
    
    // Update arrow positioning
    const arrowAfter = elements.welcomeMessage.querySelector('::after');
    const arrowBefore = elements.welcomeMessage.querySelector('::before');
    
    // Apply arrow styles via CSS custom properties
    elements.welcomeMessage.style.setProperty('--arrow-right', position.arrowRight || '');
    elements.welcomeMessage.style.setProperty('--arrow-left', position.arrowLeft || '');
    elements.welcomeMessage.style.setProperty('--arrow-transform', position.arrowTransform || '');
  }

  /**
   * Apply dynamic positioning to button based on widget position
   */
  function applyButtonPositioning() {
    if (!elements.minimized) return;
    
    const position = getButtonPositionStyles();
    
    // Apply positioning styles
    elements.minimized.style.bottom = position.bottom || '';
    elements.minimized.style.top = position.top || '';
    elements.minimized.style.left = position.left || '';
    elements.minimized.style.right = position.right || '';
    elements.minimized.style.transform = position.transform || '';
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
   * Get widget CSS with optimized theme handling
   */
  function getWidgetCSS() {
    const theme = widgetState.config.theme;
    const isLight = theme === 'light' || (theme === 'auto' && !window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Use CSS custom properties for better performance
    const colors = isLight ? {
      primary: widgetState.config.primaryColor || '#8b5cf6',
      primaryHover: widgetState.config.secondaryColor || '#7c3aed',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b'
    } : {
      primary: widgetState.config.primaryColor || '#a78bfa',
      primaryHover: widgetState.config.secondaryColor || '#8b5cf6',
      background: '#1f2937',
      surface: '#374151',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#4b5563',
      shadow: 'rgba(0, 0, 0, 0.3)',
      success: '#34d399',
      error: '#f87171',
      warning: '#fbbf24'
    };
    
    return `
      .ai-chatbot-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        --primary-color: ${widgetState.config.primaryColor || '#3B82F6'};
        --secondary-color: ${widgetState.config.secondaryColor || '#1E40AF'};
      }
      
      /* When minimized, widget should only show floating icon */
      .ai-chatbot-widget.minimized {
        position: fixed !important;
        z-index: 999999 !important;
        overflow: visible !important;
      }
      
      /* When chat is open, position container above the floating icon */
      .ai-chatbot-widget:not(.minimized) {
        /* Position will be set dynamically based on configuration */
      }
      
      .ai-chatbot-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: ${colors.background};
        border: 2px solid var(--primary-color);
        border-radius: 12px;
        box-sizing: border-box;
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
        background: var(--primary-color);
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
      
      .ai-chatbot-refresh-btn,
      .ai-chatbot-close-btn {
        width: 30px;
        height: 30px;
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
      
      .ai-chatbot-refresh-btn:hover,
      .ai-chatbot-close-btn:hover {
        background: var(--primary-color);
        color: white;
      }
      
      .ai-chatbot-welcome-message {
        position: absolute;
        background: white;
        border-radius: 18px 18px 4px 18px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 12px 16px;
        z-index: 1001;
        display: none;
        text-align: left;
        font-size: 14px;
        color: #374151;
        font-weight: 500;
        max-width: 280px;
        min-width: 200px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        animation: slideUp 0.3s ease-out;
        word-wrap: break-word;
        line-height: 1.4;
        margin-bottom: 10px;
      }
      
      /* Speech bubble arrow pointing down */
      .ai-chatbot-welcome-message::after {
        content: '';
        position: absolute;
        bottom: -8px;
        right: var(--arrow-right, 20px);
        left: var(--arrow-left, auto);
        transform: var(--arrow-transform, none);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
      }
      
      /* Speech bubble arrow border */
      .ai-chatbot-welcome-message::before {
        content: '';
        position: absolute;
        bottom: -9px;
        right: calc(var(--arrow-right, 20px) - 1px);
        left: calc(var(--arrow-left, auto) - 1px);
        transform: var(--arrow-transform, none);
        width: 0;
        height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 9px solid rgba(0, 0, 0, 0.1);
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      
      .ai-chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
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
        background: var(--primary-color);
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
        margin-bottom: 8px;
      }
      
      .ai-chatbot-message:last-child {
        margin-bottom: 0;
      }
      
      /* Reduce spacing for consecutive messages from same sender */
      .ai-chatbot-message + .ai-chatbot-message.user,
      .ai-chatbot-message + .ai-chatbot-message.assistant {
        margin-top: -4px;
      }
      
      .ai-chatbot-message.user + .ai-chatbot-message.user,
      .ai-chatbot-message.assistant + .ai-chatbot-message.assistant {
        margin-top: -8px;
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
        background: var(--primary-color);
        color: white;
      }
      
      .ai-chatbot-message.assistant .ai-chatbot-message-avatar {
        background: ${colors.surface};
        color: ${colors.text};
      }
      
      .ai-chatbot-message-content {
        background: ${colors.surface};
        padding: 14px 18px;
        border-radius: 18px;
        color: ${colors.text};
        font-size: 14px;
        max-width: 80%;
        word-wrap: break-word;
        line-height: 1.5;
      }
      
      .ai-chatbot-message.user .ai-chatbot-message-content {
        background: var(--primary-color);
        color: white;
      }
      
      .ai-chatbot-identity-form {
        padding: 20px;
        background: ${colors.background};
      }
      
      .ai-chatbot-identity-header {
        text-align: center;
        margin-bottom: 20px;
      }
      
      .ai-chatbot-identity-header h3 {
        margin: 0 0 8px 0;
        color: ${colors.text};
        font-size: 18px;
        font-weight: 600;
      }
      
      .ai-chatbot-identity-header p {
        margin: 0;
        color: ${colors.textSecondary};
        font-size: 14px;
      }
      
      .ai-chatbot-form-group {
        margin-bottom: 16px;
      }
      
      .ai-chatbot-form-group label {
        display: block;
        margin-bottom: 6px;
        color: ${colors.text};
        font-size: 14px;
        font-weight: 500;
      }
      
      .ai-chatbot-form-group input[type="text"],
      .ai-chatbot-form-group input[type="email"] {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid ${colors.border};
        border-radius: 8px;
        background: ${colors.surface};
        color: ${colors.text};
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .ai-chatbot-form-group input[type="text"]:focus,
      .ai-chatbot-form-group input[type="email"]:focus {
        outline: none;
        border-color: ${colors.primary};
        box-shadow: 0 0 0 2px ${colors.primary}20;
      }
      
      .ai-chatbot-checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        cursor: pointer;
        font-size: 12px;
        line-height: 1.4;
      }
      
      .ai-chatbot-checkbox-label input[type="checkbox"] {
        margin: 0;
        flex-shrink: 0;
      }
      
      .ai-chatbot-checkbox-text {
        color: ${colors.textSecondary};
      }
      
      .ai-chatbot-identity-submit {
        width: 100%;
        padding: 12px 16px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .ai-chatbot-identity-submit:hover {
        background: var(--secondary-color);
      }
      
      .ai-chatbot-identity-submit:disabled {
        background: ${colors.border};
        cursor: not-allowed;
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
        border-color: var(--primary-color);
      }
      
      .ai-chatbot-input::placeholder {
        color: ${colors.textSecondary};
      }
      
      .ai-chatbot-send-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: var(--primary-color);
        color: white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }
      
      .ai-chatbot-send-btn:hover {
        background: var(--secondary-color);
      }
      
      .ai-chatbot-send-btn:disabled {
        background: ${colors.border};
        cursor: not-allowed;
      }
      
      .ai-chatbot-minimized {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 16px ${colors.shadow};
        transition: all 0.2s;
        position: absolute !important;
        z-index: 1000000;
        border: 3px solid ${colors.primary};
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
      
      /* Notification styles */
      .ai-chatbot-notification {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors.surface};
        color: ${colors.text};
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 2px 8px ${colors.shadow};
        z-index: 1000001;
        animation: slideDown 0.3s ${CONFIG.ANIMATIONS.SLIDE_UP};
        max-width: 200px;
        text-align: center;
      }
      
      .ai-chatbot-notification-error {
        background: ${colors.error};
        color: white;
      }
      
      .ai-chatbot-notification-success {
        background: ${colors.success};
        color: white;
      }
      
      .ai-chatbot-notification-warning {
        background: ${colors.warning};
        color: white;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      
      /* Focus styles for accessibility */
      .ai-chatbot-input:focus,
      .ai-chatbot-send-btn:focus,
      .ai-chatbot-minimized:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .ai-chatbot-widget {
          border: 2px solid ${colors.text};
        }
        
        .ai-chatbot-message-content {
          border: 1px solid ${colors.border};
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .ai-chatbot-widget *,
        .ai-chatbot-widget *::before,
        .ai-chatbot-widget *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
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
        
        .ai-chatbot-welcome-message {
          max-width: 90%;
          left: 5%;
          right: 5%;
          transform: none;
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
   * Setup event listeners with proper cleanup tracking
   */
  function setupEventListeners() {
    // Identity form submission
    addWidgetEventListener('submit', handleIdentitySubmit, elements.identityFormElement);
    
    // Send button click
    addWidgetEventListener('click', handleSendMessage, elements.sendBtn);
    
    // Enter key in input (throttled to prevent spam)
    const handleKeypress = throttle((e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }, 100);
    addWidgetEventListener('keypress', handleKeypress, elements.input);
    
    // Refresh button
    addWidgetEventListener('click', refreshWidget, elements.refreshBtn);
    
    // Close button
    addWidgetEventListener('click', closeWidget, elements.closeBtn);
    
    // Minimized widget click - toggle chat open/close
    addWidgetEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWidget();
    }, elements.minimized);
    
    // Keyboard navigation for minimized state
    addWidgetEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleWidget();
      }
    }, elements.minimized);
    
    // Input validation (debounced)
    const handleInputValidation = debounce(validateInput, 300);
    addWidgetEventListener('input', handleInputValidation, elements.input);
    
    // Form validation
    addWidgetEventListener('input', validateForm, elements.identityFormElement);
  }

  /**
   * Add event listener with cleanup tracking
   */
  function addWidgetEventListener(type, handler, element) {
    if (!element) return;
    
    element.addEventListener(type, handler);
    
    // Track for cleanup
    const key = `${type}-${element.id || element.className}`;
    if (!eventListeners.has(key)) {
      eventListeners.set(key, []);
    }
    eventListeners.get(key).push({ element, handler });
  }

  /**
   * Validate input in real-time
   */
  function validateInput(e) {
    const input = e.target;
    const maxLength = widgetState.config.maxMessageLength;
    
    if (input.value.length > maxLength) {
      input.value = input.value.substring(0, maxLength);
      showNotification(`Message too long. Maximum ${maxLength} characters.`);
    }
  }

  /**
   * Validate form fields
   */
  function validateForm(e) {
    const form = e.target.closest('form');
    if (!form) return;
    
    const submitBtn = form.querySelector('.ai-chatbot-identity-submit');
    const inputs = form.querySelectorAll('input[required]');
    
    let isValid = true;
    inputs.forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
      }
    });
    
    if (submitBtn) {
      submitBtn.disabled = !isValid;
    }
  }

  /**
   * Show notification to user
   */
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `ai-chatbot-notification ai-chatbot-notification-${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    // Add to widget
    if (elements.widget) {
      elements.widget.appendChild(notification);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  }

  /**
   * Handle identity form submission
   */
  async function handleIdentitySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const name = formData.get('name').trim();
    const email = formData.get('email').trim();
    const privacy = formData.get('privacy');
    
    // Validate form
    if (!name || !email || !privacy) {
      alert('Please fill in all required fields and accept the privacy policy.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    try {
      // Check if deployment ID is available
      if (!widgetState.config._id) {
        throw new Error('Deployment ID is required. Please ensure the widget is properly configured with a valid deployment ID.');
      }
      
      // Disable form during submission
      const submitBtn = e.target.querySelector('.ai-chatbot-identity-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
      
      // Create or update visitor
      const response = await fetch(`${CONFIG.API_BASE_URL}/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: widgetState.config._id,
          name: name,
          email: email,
          websiteUrl: widgetState.websiteUrl
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Store visitor data
        widgetState.visitor = {
          id: result.data.visitorId,
          name: result.data.name,
          email: result.data.email,
          isNewVisitor: result.data.isNewVisitor
        };

        // Generate a session ID for this conversation
        widgetState.currentSessionId = generateSessionId();
        
        // Hide identity form and show chat
        widgetState.showIdentityForm = false;
        elements.identityForm.style.display = 'none';
        elements.messages.style.display = 'block';
        
        // Show chat input
        const inputContainer = elements.widget.querySelector('.ai-chatbot-input-container');
        if (inputContainer) {
          inputContainer.style.display = 'block';
        }
        
        // Add welcome message with visitor name
        addMessage('assistant', `Hi ${name}! ${widgetState.config.welcomeMessage}`);
        
        // Focus input after welcome message
        setTimeout(() => {
          if (elements.input) {
            elements.input.focus();
          }
        }, 200);
      } else {
        throw new Error(result.error?.message || 'Failed to create visitor account');
      }
      
    } catch (error) {
      console.error('❌ Failed to submit identity form:', error);
      alert('Failed to create your account. Please try again.');
      
      // Re-enable form
      const submitBtn = e.target.querySelector('.ai-chatbot-identity-submit');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Start Chatting';
    }
  }

  /**
   * Handle send message with improved error handling and retry logic
   */
  async function handleSendMessage() {
    const message = elements.input.value.trim();
    if (!message || widgetState.isLoading) return;
    
    // Validate message length
    if (message.length > widgetState.config.maxMessageLength) {
      showNotification(`Message too long. Maximum ${widgetState.config.maxMessageLength} characters.`, 'error');
      return;
    }
    
    // Clear input immediately for better UX
    elements.input.value = '';
    
    // Add user message
    addMessage('user', message);
    
    // Set loading state
    setLoadingState(true);
    
    try {
      // Send message to backend with retry logic
      const response = await sendMessageWithRetry(message);
      
      if (response.success) {
        // Add assistant response with typing animation
        await addMessageWithTyping('assistant', response.data.content);
        
        // Update session ID if new
        if (response.data.sessionId && response.data.sessionId !== widgetState.currentSessionId) {
          widgetState.currentSessionId = response.data.sessionId;
        }
        
        // Track interaction
        trackAnalytics('interaction');
        
        // Reset retry count on success
        widgetState.retryCount = 0;
      } else {
        throw new Error(response.error?.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show user-friendly error message
      const errorMessage = getErrorMessage(error);
      addMessage('assistant', errorMessage);
      
      // Track error
      trackAnalytics('error', { error: error.message });
    } finally {
      setLoadingState(false);
      
      // Focus input after message is processed
      requestAnimationFrame(() => {
        if (elements.input) {
          elements.input.focus();
        }
      });
    }
  }

  /**
   * Send message with retry logic
   */
  async function sendMessageWithRetry(message) {
    const maxRetries = widgetState.maxRetries;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await sendMessageToBackend(message);
        return response;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get user-friendly error message
   */
  function getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    } else if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    } else if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment before trying again.';
    } else if (error.message.includes('500')) {
      return 'Server error occurred. Please try again later.';
    } else {
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Add message with typing animation
   */
  async function addMessageWithTyping(type, content) {
    if (type === 'assistant' && widgetState.config.typingDelay > 0) {
      // Show typing indicator
      setLoadingState(true);
      
      // Wait for typing delay
      await new Promise(resolve => setTimeout(resolve, widgetState.config.typingDelay));
      
      // Hide typing indicator
      setLoadingState(false);
    }
    
    // Add the actual message
    addMessage(type, content);
  }

  /**
   * Send message to backend
   */
  async function sendMessageToBackend(message) {
    // Check if deployment ID is available
    if (!widgetState.config._id) {
      throw new Error('Deployment ID is required. Please ensure the widget is properly configured with a valid deployment ID.');
    }
    
    // First, get the agent ID from the deployment
    const deploymentResponse = await fetch(`${CONFIG.API_BASE_URL}/deployments/${widgetState.config._id}/embed`);
    
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
        sessionId: widgetState.currentSessionId,
        visitorId: widgetState.visitor?.id || null,
        _id: widgetState.config._id
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
    const messageElement = document.createElement('div');
    messageElement.className = `ai-chatbot-message ${type}`;
    
    // Check if this is a consecutive message from the same sender
    const lastMessage = elements.messages.lastElementChild;
    const isConsecutive = lastMessage && lastMessage.classList.contains(type);
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-chatbot-message-avatar';
    
    // Only show avatar if it's not a consecutive message from the same sender
    if (!isConsecutive) {
      if (type === 'user') {
        avatar.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        `;
      } else {
        avatar.innerHTML = `
          ${widgetState.config?.logo && widgetState.config.logo.trim() ? 
            `<img src="${widgetState.config.logo}" alt="Chatbot Logo" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
             <div style="display: none;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
               </svg>
             </div>` :
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
            </svg>`
          }
        `;
      }
    } else {
      // For consecutive messages, add a spacer instead of avatar
      avatar.style.width = '24px';
      avatar.style.height = '24px';
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
          ${widgetState.config?.logo && widgetState.config.logo.trim() ? 
            `<img src="${widgetState.config.logo}" alt="Chatbot Logo" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
             <div style="display: none;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
               </svg>
             </div>` :
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
            </svg>`
          }
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
   * Toggle widget (open if closed, close if open)
   */
  function toggleWidget() {
    if (!widgetState.isInitialized) return;
    
    if (widgetState.isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  /**
   * Open widget
   */
  function openWidget() {
    if (!widgetState.isInitialized) return;
    
    // Prevent multiple calls
    if (widgetState.isOpen) {
      return;
    }
    
    // Remove minimized class to restore full size
    elements.widget.classList.remove('minimized');
    
    // Apply open position styles to the main widget (chat container)
    const openPositionStyles = getOpenPositionStyles();
    elements.widget.style.cssText = elements.widget.style.cssText.replace(
      /(bottom|top|left|right):\s*[^;]+;?/g, 
      ''
    ) + openPositionStyles;
    
    // Restore full widget size for open state
    elements.widget.style.width = widgetState.config.size.width;
    elements.widget.style.height = widgetState.config.size.height;
    
    // Ensure purple button stays in its fixed position
    const minimizedPositionStyles = getMinimizedPositionStyles();
    elements.minimized.style.cssText = elements.minimized.style.cssText.replace(
      /(bottom|top|left|right):\s*[^;]+;?/g, 
      ''
    ) + minimizedPositionStyles + 'position: fixed !important;';
    
    elements.widget.style.display = 'block';
    elements.container.style.display = 'flex';
    // Keep floating icon visible above the container
    elements.minimized.style.display = 'flex';
    
    // Hide welcome message when opened
    if (elements.welcomeMessage) {
      elements.welcomeMessage.style.display = 'none';
    }
    
    widgetState.isOpen = true;
    widgetState.isMinimized = false;
    
    // Focus input
    setTimeout(() => {
      if (elements.input) {
        elements.input.focus();
      }
    }, 100);
  }

  /**
   * Refresh widget (reset to identity form)
   */
  function refreshWidget() {
    if (!widgetState.isInitialized) return;
    
    // Reset widget state
    widgetState.showIdentityForm = true;
    widgetState.messages = [];
    widgetState.currentSessionId = null;
    widgetState.visitor = null;
    widgetState.isLoading = false;
    
    // Clear messages
    elements.messages.innerHTML = '';
    
    // Show identity form, hide messages and input
    elements.identityForm.style.display = 'block';
    elements.messages.style.display = 'none';
    
    // Hide chat input
    const inputContainer = elements.widget.querySelector('.ai-chatbot-input-container');
    if (inputContainer) {
      inputContainer.style.display = 'none';
    }
    
    // Reset form fields
    const nameInput = elements.identityFormElement.querySelector('#ai-chatbot-name');
    const emailInput = elements.identityFormElement.querySelector('#ai-chatbot-email');
    const privacyCheckbox = elements.identityFormElement.querySelector('#ai-chatbot-privacy');
    
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (privacyCheckbox) privacyCheckbox.checked = false;
    
    // Re-enable submit button
    const submitBtn = elements.identityFormElement.querySelector('.ai-chatbot-identity-submit');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Start Chatting';
    }
  }

  /**
   * Minimize widget
   */
  function minimizeWidget() {
    if (!widgetState.isInitialized) return;
    
    // Add minimized class to widget
    elements.widget.classList.add('minimized');
    
    
    // Set widget size for minimized state (accommodate speech bubble)
    elements.widget.style.width = '300px';
    elements.widget.style.height = '0px';
    
    elements.container.style.display = 'none';
    elements.minimized.style.display = 'flex';
    
    // Show welcome message when minimized
    if (elements.welcomeMessage) {
      elements.welcomeMessage.style.display = 'block';
      applyWelcomeMessagePositioning();
    }
    
    // Apply button positioning
    applyButtonPositioning();
    
    widgetState.isOpen = false;
    widgetState.isMinimized = true;
  }

  /**
   * Close widget (show floating icon)
   */
  function closeWidget() {
    if (!widgetState.isInitialized) return;
    
    // Prevent multiple calls
    if (!widgetState.isOpen) {
      return;
    }
    
    // Add minimized class to widget
    elements.widget.classList.add('minimized');
    
    // Reset widget position to minimized position
    const minimizedPositionStyles = getMinimizedPositionStyles();
    elements.widget.style.cssText = elements.widget.style.cssText.replace(
      /(bottom|top|left|right):\s*[^;]+;?/g, 
      ''
    ) + minimizedPositionStyles;
    
    // Set widget size for minimized state (accommodate speech bubble)
    elements.widget.style.width = '300px';
    elements.widget.style.height = '0px';
    
    // Show floating icon, hide chat container
    elements.container.style.display = 'none';
    elements.minimized.style.display = 'flex';

    // Show welcome message when minimized
    if (elements.welcomeMessage) {
      elements.welcomeMessage.style.display = 'block';
      applyWelcomeMessagePositioning();
    }
    
    // Apply button positioning
    applyButtonPositioning();
    
    widgetState.isOpen = false;
    widgetState.isMinimized = true;
  }

  /**
   * Track analytics
   */
  function trackAnalytics(event, data = {}) {
    return true
    if (!widgetState.config._id) {
      console.warn('Analytics tracking skipped: Deployment ID not available');
      return;
    }
    
    try {
      fetch(`${CONFIG.API_BASE_URL}/deployments/${widgetState.config._id}/analytics`, {
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
   * Show widget (show floating icon)
   */
  function showWidget() {
    if (!widgetState.isInitialized) return;
    
    // Add minimized class to widget
    elements.widget.classList.add('minimized');
    
    
    // Set widget size for minimized state (accommodate speech bubble)
    elements.widget.style.width = '300px';
    elements.widget.style.height = '0px';
    
    elements.widget.style.display = 'block';
    elements.container.style.display = 'none';
    elements.minimized.style.display = 'flex';
    
    // Show welcome message when minimized
    if (elements.welcomeMessage) {
      elements.welcomeMessage.style.display = 'block';
      applyWelcomeMessagePositioning();
    }
    
    // Apply button positioning
    applyButtonPositioning();
    
    widgetState.isOpen = false;
    widgetState.isMinimized = true;
  }

  /**
   * Cleanup event listeners
   */
  function cleanupEventListeners() {
    eventListeners.forEach((listeners, key) => {
      listeners.forEach(({ element, handler }) => {
        if (element && element.removeEventListener) {
          // Handle global listeners differently
          if (key === 'global-keydown') {
            element.removeEventListener('keydown', handler);
          } else {
            // Extract event type from key
            const eventType = key.split('-')[0];
            element.removeEventListener(eventType, handler);
          }
        }
      });
    });
    eventListeners.clear();
  }

  /**
   * Cleanup widget resources
   */
  function cleanup() {
    // Remove event listeners
    cleanupEventListeners();
    
    // Clear intervals and timeouts
    if (widgetState.typingInterval) {
      clearInterval(widgetState.typingInterval);
    }
    
    // Reset state
    widgetState.isInitialized = false;
    widgetState.messages = [];
    widgetState.messageQueue = [];
    widgetState.retryCount = 0;
    
    // Clear DOM references
    Object.keys(elements).forEach(key => {
      elements[key] = null;
    });
  }

  /**
   * Enhanced Public API with better error handling
   */
  window.AIChatbotWidget = {
    /**
     * Initialize the widget
     * @param {Object} config - Configuration object
     * @returns {Promise} - Initialization promise
     */
    init: async (config = {}) => {
      try {
        await init(config);
        return { success: true };
      } catch (error) {
        console.error('Failed to initialize widget:', error);
        return { success: false, error: error.message };
      }
    },
    
    /**
     * Open the widget
     */
    open: () => {
      if (!widgetState.isInitialized) {
        console.warn('Widget not initialized');
        return false;
      }
      openWidget();
      return true;
    },
    
    /**
     * Close the widget
     */
    close: () => {
      if (!widgetState.isInitialized) {
        console.warn('Widget not initialized');
        return false;
      }
      closeWidget();
      return true;
    },
    
    /**
     * Show the widget (minimized state)
     */
    show: () => {
      if (!widgetState.isInitialized) {
        console.warn('Widget not initialized');
        return false;
      }
      showWidget();
      return true;
    },
    
    /**
     * Minimize the widget
     */
    minimize: () => {
      if (!widgetState.isInitialized) {
        console.warn('Widget not initialized');
        return false;
      }
      minimizeWidget();
      return true;
    },
    
    /**
     * Refresh the widget (reset to identity form)
     */
    refresh: () => {
      if (!widgetState.isInitialized) {
        console.warn('Widget not initialized');
        return false;
      }
      refreshWidget();
      return true;
    },
    
    /**
     * Send a message programmatically
     * @param {string} message - Message to send
     * @returns {boolean} - Success status
     */
    sendMessage: (message) => {
      if (!widgetState.isInitialized) {
        console.warn('Widget not initialized');
        return false;
      }
      
      if (!message || typeof message !== 'string') {
        console.warn('Invalid message provided');
        return false;
      }
      
      if (elements.input) {
        elements.input.value = message;
        handleSendMessage();
        return true;
      }
      
      return false;
    },
    
    /**
     * Get current widget state
     * @returns {Object} - Widget state
     */
    getState: () => {
      if (!widgetState.isInitialized) {
        return { initialized: false };
      }
      
      return {
        initialized: widgetState.isInitialized,
        isOpen: widgetState.isOpen,
        isMinimized: widgetState.isMinimized,
        isLoading: widgetState.isLoading,
        messageCount: widgetState.messages.length,
        hasVisitor: !!widgetState.visitor,
        config: { ...widgetState.config }
      };
    },
    
    /**
     * Update widget configuration
     * @param {Object} newConfig - New configuration
     * @returns {boolean} - Success status
     */
    updateConfig: (newConfig) => {
      if (!widgetState.isInitialized) {
        console.warn('Widget not initialized');
        return false;
      }
      
      try {
        widgetState.config = validateConfig({ ...widgetState.config, ...newConfig });
        
        // Reapply styles if colors changed
        if (newConfig.primaryColor || newConfig.secondaryColor) {
          applyWidgetStyles();
        }
        
        return true;
      } catch (error) {
        console.error('Failed to update config:', error);
        return false;
      }
    },
    
    /**
     * Destroy the widget and cleanup resources
     */
    destroy: () => {
      try {
        const widget = document.getElementById('ai-chatbot-widget');
        if (widget) {
          widget.remove();
        }
        
        // Remove custom styles
        const customStyles = document.getElementById('ai-chatbot-custom-styles');
        if (customStyles) {
          customStyles.remove();
        }
        
        const widgetStyles = document.getElementById('ai-chatbot-widget-styles');
        if (widgetStyles) {
          widgetStyles.remove();
        }
        
        // Cleanup resources
        cleanup();
        
        return true;
      } catch (error) {
        console.error('Failed to destroy widget:', error);
        return false;
      }
    },
    
    /**
     * Get widget version
     * @returns {string} - Version string
     */
    getVersion: () => CONFIG.WIDGET_VERSION
  };

  // Auto-initialize if config is provided in global scope
  if (window.aiChatbotConfig) {
    init(window.aiChatbotConfig).catch(error => {
      console.error('❌ Failed to initialize widget:', error);
    });
  }

})();