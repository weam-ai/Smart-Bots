import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bounce' | 'wave' | 'orbit';
  text?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'spinner',
  text = 'Loading...',
  showRefresh = false,
  onRefresh = () => window.location.reload(),
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const renderLoader = () => {
    const baseClasses = `animate-spin ${sizeClasses[size]} ${className}`;
    
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`bg-primary-600 rounded-full animate-bounce ${sizeClasses[size].replace('h-', 'h-').replace('w-', 'w-')}`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: size === 'sm' ? '8px' : size === 'md' ? '12px' : size === 'lg' ? '16px' : '20px',
                  width: size === 'sm' ? '8px' : size === 'md' ? '12px' : size === 'lg' ? '16px' : '20px'
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div className={`bg-primary-600 rounded-full animate-pulse ${sizeClasses[size]}`} />
        );

      case 'bounce':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`bg-primary-600 rounded-full animate-bounce ${sizeClasses[size].replace('h-', 'h-').replace('w-', 'w-')}`}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  height: size === 'sm' ? '8px' : size === 'md' ? '12px' : size === 'lg' ? '16px' : '20px',
                  width: size === 'sm' ? '8px' : size === 'md' ? '12px' : size === 'lg' ? '16px' : '20px'
                }}
              />
            ))}
          </div>
        );

      case 'wave':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-primary-600 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: size === 'sm' ? '8px' : size === 'md' ? '12px' : size === 'lg' ? '16px' : '20px',
                  width: size === 'sm' ? '4px' : size === 'md' ? '6px' : size === 'lg' ? '8px' : '10px'
                }}
              />
            ))}
          </div>
        );

      case 'orbit':
        return (
          <div className={`relative ${sizeClasses[size]}`}>
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-primary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-2 border-transparent border-r-primary-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
        );

      case 'spinner':
      default:
        return (
          <div className={`${baseClasses} border-4 border-primary-200 border-t-primary-600 rounded-full`} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {renderLoader()}
        <p className={`text-gray-600 mt-4 ${textSizeClasses[size]}`}>
          {text}
        </p>
        {showRefresh && (
          <button 
            onClick={onRefresh} 
            className="mt-4 text-sm text-primary-600 hover:text-primary-700 underline transition-colors duration-200"
          >
            Refresh if stuck
          </button>
        )}
      </div>
    </div>
  );
};

// Inline loader for smaller components
export const InlineLoader: React.FC<Omit<LoaderProps, 'text' | 'showRefresh' | 'onRefresh'> & { text?: string }> = ({
  size = 'sm',
  variant = 'spinner',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10'
  };

  const renderLoader = () => {
    const baseClasses = `animate-spin ${sizeClasses[size]} ${className}`;
    
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-primary-600 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: size === 'sm' ? '6px' : size === 'md' ? '8px' : size === 'lg' ? '10px' : '12px',
                  width: size === 'sm' ? '6px' : size === 'md' ? '8px' : size === 'lg' ? '10px' : '12px'
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div className={`bg-primary-600 rounded-full animate-pulse ${sizeClasses[size]}`} />
        );

      case 'spinner':
      default:
        return (
          <div className={`${baseClasses} border-2 border-primary-200 border-t-primary-600 rounded-full`} />
        );
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      {renderLoader()}
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

// Page loader with more elaborate animation
export const PageLoader: React.FC<{ text?: string; showRefresh?: boolean; onRefresh?: () => void }> = ({
  text = 'Loading...',
  showRefresh = false,
  onRefresh = () => window.location.reload()
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo or icon */}
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto relative">
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-primary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-2 border-transparent border-r-primary-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            <div className="absolute inset-4 border border-transparent border-b-primary-300 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Loading text with typing animation */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">AI Chatbot Generator</h2>
          <p className="text-gray-600 animate-pulse">{text}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center space-x-1 mb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        {showRefresh && (
          <button 
            onClick={onRefresh} 
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white border border-primary-200 rounded-lg hover:bg-primary-50 transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh if stuck
          </button>
        )}
      </div>
    </div>
  );
};

export default Loader;
