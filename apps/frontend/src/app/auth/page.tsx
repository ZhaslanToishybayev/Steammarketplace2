'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SteamAuth() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const handleSteamLogin = () => {
    const authWindow = window.open(
      'http://localhost:3000/api/steam/auth',
      'SteamAuth',
      'width=800,height=600,toolbar=no,menubar=no,scrollbars=yes'
    );

    if (!authWindow) {
      console.error('❌ Failed to open Steam auth popup');
      return;
    }

    console.log('✅ Steam auth popup opened, waiting for authentication...');
  };

  // Обработчик postMessage от Steam OAuth
  useEffect(() => {
    const handleSteamAuthMessage = (event) => {
      console.log('📨 Message received from:', event.origin, 'Data:', event.data);

      // Проверяем origin для безопасности - разрешаем несколько портов
      const allowedOrigins = ['http://localhost:3000', 'http://localhost:3004', 'http://localhost:3006'];
      if (!allowedOrigins.includes(event.origin)) {
        console.log('❌ Invalid origin:', event.origin);
        return;
      }

      if (event.data.type === 'STEAM_AUTH_SUCCESS') {
        console.log('✅ Steam auth success received:', event.data.data);
        setCurrentUser(event.data.data.user);
        setCheckingAuth(false);
        // Перенаправляем на главную страницу
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else if (event.data.type === 'STEAM_AUTH_ERROR') {
        console.error('❌ Steam auth error:', event.data.data);
        setCheckingAuth(false);
        setTimeout(() => router.push('/auth'), 3000);
      }
    };

    // Добавляем прослушку postMessage
    window.addEventListener('message', handleSteamAuthMessage);

    // Очищаем прослушку при размонтировании
    return () => {
      window.removeEventListener('message', handleSteamAuthMessage);
    };
  }, [router]);

  // Добавим принудительную проверку каждые 3 секунды
  useEffect(() => {
    const checkAuthInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3000/api/steam/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.data && !currentUser) {
            console.log('✅ User detected via polling:', data.data.nickname);
            setCurrentUser(data.data);
            setCheckingAuth(false);
            // Перенаправляем на главную страницу
            setTimeout(() => {
              router.push('/');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking auth via polling:', error);
      }
    }, 3000);

    return () => clearInterval(checkAuthInterval);
  }, [currentUser, router]);

  // Проверяем аутентификацию при загрузке страницы
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/steam/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setCurrentUser(data.data);
            // Автоматически перенаправляем на главную страницу
            setTimeout(() => {
              router.push('/');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Если пользователь уже аутентифицирован
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md border-gray-600/20 bg-gray-800/95 backdrop-blur-sm rounded-lg p-8 text-center">
          <div className="h-20 w-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Добро пожаловать!</h1>
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <img
              src={currentUser.avatar}
              alt="Avatar"
              className="h-16 w-16 rounded-full mx-auto mb-4"
              onError={(e) => {
                e.target.src = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fallback/fallback_bighead.png';
              }}
            />
            <p className="text-white font-semibold text-lg">{currentUser.nickname}</p>
            <p className="text-gray-300 text-sm">Steam ID: {currentUser.steamId}</p>
          </div>
          <p className="text-gray-300 mb-6">Вы успешно вошли в систему. Через 2 секунды вы будете перенаправлены на главную страницу.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors"
            >
              Перейти на главную
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-md transition-colors"
            >
              Перейти в профиль
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Если идет проверка аутентификации
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Проверка аутентификации...</p>
        </div>
      </div>
    );
  }

  // Страница входа
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md border-gray-600/20 bg-gray-800/95 backdrop-blur-sm rounded-lg p-6">
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01 3-3h7a3 3 0 01 3 3v1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Steam Marketplace</h1>
          <p className="text-gray-300">Авторизуйтесь через Steam для доступа ко всем функциям</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSteamLogin}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md text-center transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center justify-center">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01 3-3h7a3 3 0 01 3 3v1" />
              </svg>
              Войти через Steam
            </div>
          </button>

          <div className="text-center text-sm text-gray-300">
            🔒 Безопасная авторизация через Steam
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div className="flex items-center">
              <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Безопасно
            </div>
            <div className="flex items-center">
              <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 01-7 7h14a7 7 0 01-7-7z" />
              </svg>
              Надежно
            </div>
            <div className="flex items-center">
              <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2V13m0-3h6m-6 0h-6m6 0v6" />
              </svg>
              Инвентарь
            </div>
            <div className="flex items-center">
              <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Торговля
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}