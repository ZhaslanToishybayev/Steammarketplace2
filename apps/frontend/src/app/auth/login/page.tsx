'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import Image from 'next/image';

export default function LoginPage() {
  const { user, isAuthenticated, isLoggingIn } = useAuth();

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (isAuthenticated && user) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, user]);

  const handleSteamLogin = () => {
    // Redirect to Steam OAuth
    window.location.href = '/api/auth/steam';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Brand */}
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-2xl"></div>
            <div className="relative w-full h-full bg-gray-900 rounded-2xl flex items-center justify-center shadow-inner">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Steam<span className="text-orange-500">Market</span>
          </h1>
          <p className="text-gray-300">The premier Steam marketplace</p>
        </div>

        {/* Main Card */}
        <Card className="bg-black/50 backdrop-blur-lg border-gray-700">
          <div className="space-y-6">
            {/* Welcome Message */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-400">
                Sign in with your Steam account to access your inventory, trades, and marketplace
              </p>
            </div>

            {/* Steam Login Button */}
            <div className="space-y-4">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSteamLogin}
                isLoading={isLoggingIn}
                className="w-full bg-[#171a21] hover:bg-[#2a2e37] border border-[#8d9199] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" viewBox="0 0 256 256" fill="currentColor">
                    <path d="M128,256C57.48,256,0,198.52,0,128S57.48,0,128,0s128,57.48,128,128S198.52,256,128,256z M128,20c-59.6,0-108,48.4-108,108s48.4,108,108,108s108-48.4,108-108S187.6,20,128,20z"/>
                    <path d="M128,64c-35.35,0-64,28.65-64,64s28.65,64,64,64s64-28.65,64-64S163.35,64,128,64z M128,192c-35.35,0-64-28.65-64-64s28.65-64,64-64s64,28.65,64,64S163.35,192,128,192z"/>
                  </svg>
                  <span>Sign in with Steam</span>
                </div>
              </Button>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <Badge variant="green" size="sm">🔒</Badge>
                  <span>Secure Steam authentication</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <Badge variant="blue" size="sm">📦</Badge>
                  <span>Access your Steam inventory</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <Badge variant="orange" size="sm">🔄</Badge>
                  <span>Trade with other users</span>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoggingIn && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Redirecting to Steam...</p>
              </div>
            )}

            {/* Demo Info */}
            <div className="border-t border-gray-700 pt-4">
              <p className="text-xs text-gray-500 text-center">
                By signing in, you agree to our{' '}
                <a href="/terms" className="text-orange-500 hover:text-orange-400">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-orange-500 hover:text-orange-400">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            This is a demo marketplace. All trades are simulated for demonstration purposes.
          </p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-blue-500/10 rounded-full"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full"></div>
      </div>
    </div>
  );
}