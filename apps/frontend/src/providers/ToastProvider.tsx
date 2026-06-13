'use client';

import { Toaster } from 'react-hot-toast';

export function CustomToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1f2937',
            color: '#ffffff',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#f97316',
              secondary: '#1f2937',
            },
            style: {
              background: '#059669',
              color: '#ffffff',
              border: '1px solid #047857',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1f2937',
            },
            style: {
              background: '#dc2626',
              color: '#ffffff',
              border: '1px solid #b91c1c',
            },
          },
          loading: {
            style: {
              background: '#4b5563',
              color: '#ffffff',
              border: '1px solid #374151',
            },
          },
        }}
        containerStyle={{
          top: '5rem',
        }}
        containerClassName=""
        gutter={8}
        reverseOrder={false}
      />
    </>
  );
}