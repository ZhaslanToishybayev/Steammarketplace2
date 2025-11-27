'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SteamAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Обработка Steam авторизации...');

  useEffect(() => {
    const handleSteamCallback = async () => {
      try {
        console.log('🎯 Steam callback detected');
        console.log('🎯 Query params:', Object.fromEntries(searchParams.entries()));

        const mode = searchParams.get('openid.mode');
        console.log('🎯 OpenID mode:', mode);

        if (mode === 'id_res') {
          // Steam OAuth successful
          console.log('✅ Steam OAuth successful, redirecting to Steam service');

          // Redirect to Steam Inventory Service to handle the callback
          const steamServiceUrl = new URL('http://localhost:3000/api/steam/auth/return');
          for (const [key, value] of searchParams.entries()) {
            steamServiceUrl.searchParams.append(key, value);
          }

          console.log('🔗 Redirecting to Steam service:', steamServiceUrl.toString());

          // Make the request to Steam service
          try {
            const response = await fetch(steamServiceUrl.toString());

            if (response.ok) {
              console.log('✅ Steam service processed successfully, redirecting to home');
              // Redirect to home page
              router.push('/');
            } else {
              throw new Error(`Steam service returned ${response.status}`);
            }
          } catch (error) {
            console.error('❌ Steam service error:', error);
            setStatus('error');
            setMessage('Ошибка обработки авторизации');
            setTimeout(() => router.push('/auth'), 3000);
          }

        } else if (mode === 'cancel') {
          setStatus('error');
          setMessage('Steam авторизация отменена');
          setTimeout(() => router.push('/auth'), 3000);
        } else {
          setStatus('error');
          setMessage('Ошибка Steam авторизации');
          setTimeout(() => router.push('/auth'), 3000);
        }

      } catch (error) {
        console.error('❌ Steam callback error:', error);
        setStatus('error');
        setMessage('Ошибка обработки Steam авторизации');
        setTimeout(() => router.push('/auth'), 3000);
      }
    };

    handleSteamCallback();
  }, [router, searchParams]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md border-gray-600/20 bg-gray-800/95 backdrop-blur-sm rounded-lg p-8 text-center">
          <div className="h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-white mb-4">Обработка Steam авторизации</h1>
          <p className="text-gray-300">Пожалуйста, подождите...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md border-gray-600/20 bg-gray-800/95 backdrop-blur-sm rounded-lg p-8 text-center">
          <div className="h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Ошибка авторизации</h1>
          <p className="text-gray-300 mb-6">{message}</p>
          <button
            onClick={() => router.push('/auth')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition-colors"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return null;
}