'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });

        // Log to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // TODO: Send to error tracking service (Sentry, etc.)
        // if (typeof window !== 'undefined' && window.Sentry) {
        //   window.Sentry.captureException(error, { extra: errorInfo });
        // }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        padding: '2rem',
                        backgroundColor: 'var(--bg-primary, #1a1a2e)',
                        color: 'var(--text-primary, #fff)',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ marginBottom: '2rem' }}>
                        <svg
                            width="80"
                            height="80"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            style={{ opacity: 0.7 }}
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>

                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Something went wrong
                    </h1>

                    <p style={{ color: 'var(--text-secondary, #888)', marginBottom: '2rem', maxWidth: '400px' }}>
                        We apologize for the inconvenience. An unexpected error has occurred.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--primary, #6366f1)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            Try Again
                        </button>

                        <button
                            onClick={this.handleGoHome}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'transparent',
                                color: 'var(--text-primary, #fff)',
                                border: '1px solid var(--border-default, #333)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            Go Home
                        </button>
                    </div>

                    {/* Error details (development only) */}
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details
                            style={{
                                marginTop: '2rem',
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                                borderRadius: '8px',
                                maxWidth: '600px',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                            }}
                        >
                            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                                Error Details (Development Only)
                            </summary>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {this.state.error.toString()}
                                {'\n\n'}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
