import React, { useState } from 'react';
import Loader, { InlineLoader, PageLoader } from './Loader';

const LoaderDemo: React.FC = () => {
  const [showPageLoader, setShowPageLoader] = useState(false);

  const variants = ['spinner', 'dots', 'pulse', 'bounce', 'wave', 'orbit'] as const;
  const sizes = ['sm', 'md', 'lg', 'xl'] as const;

  if (showPageLoader) {
    return (
      <PageLoader 
        text="This is a full page loader demo..." 
        showRefresh={true}
        onRefresh={() => setShowPageLoader(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Loader Component Demo</h1>
        
        {/* Page Loader Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Page Loader</h2>
          <p className="text-gray-600 mb-4">Full-screen loader with elaborate animation</p>
          <button
            onClick={() => setShowPageLoader(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Show Page Loader
          </button>
        </section>

        {/* Variants Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Loader Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {variants.map((variant) => (
              <div key={variant} className="text-center p-4 bg-white rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3 capitalize">{variant}</h3>
                <div className="flex justify-center mb-2">
                  <Loader variant={variant} size="md" />
                </div>
                <p className="text-xs text-gray-500">Medium size</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sizes Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Loader Sizes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {sizes.map((size) => (
              <div key={size} className="text-center p-4 bg-white rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase">{size}</h3>
                <div className="flex justify-center mb-2">
                  <Loader variant="spinner" size={size} />
                </div>
                <p className="text-xs text-gray-500">Spinner variant</p>
              </div>
            ))}
          </div>
        </section>

        {/* Inline Loader Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Inline Loaders</h2>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-2">With Text</h3>
              <InlineLoader variant="dots" size="sm" text="Processing..." />
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Without Text</h3>
              <InlineLoader variant="pulse" size="md" />
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Different Variants</h3>
              <div className="flex space-x-4">
                <InlineLoader variant="spinner" size="sm" text="Loading" />
                <InlineLoader variant="bounce" size="sm" text="Saving" />
                <InlineLoader variant="wave" size="sm" text="Uploading" />
              </div>
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Usage Examples</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Code Examples</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Page Loader</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<PageLoader 
  text="Loading agent details..." 
  showRefresh={true}
  onRefresh={() => window.location.reload()}
/>`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Loader</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<Loader 
  variant="orbit" 
  size="lg" 
  text="Processing files..." 
  showRefresh={true}
/>`}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Inline Loader</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<InlineLoader 
  variant="dots" 
  size="sm" 
  text="Saving..." 
/>`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoaderDemo;
