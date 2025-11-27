'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/steam/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setCurrentUser(data.data);
          } else {
            // Если пользователь не аутентифицирован, перенаправляем на auth
            router.push('/auth');
          }
        } else {
          router.push('/auth');
        }
      } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01 3-3h7a3 3 0 01 3 3v1" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Steam Marketplace</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="flex items-center text-gray-300 hover:text-white transition-colors"
              >
                <img
                  src={currentUser.avatar}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full mr-2"
                  onError={(e) => {
                    e.target.src = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fallback/fallback_bighead.png';
                  }}
                />
                <span>{currentUser.nickname}</span>
              </Link>
              <button
                onClick={() => {
                  fetch('http://localhost:3000/api/steam/auth/logout', { method: 'POST' });
                  router.push('/auth');
                }}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Добро пожаловать, {currentUser.nickname}!
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Ваш Steam Marketplace для безопасной торговли скинами
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/profile"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition-colors"
              >
                🎮 Просмотреть инвентарь
              </Link>
              <Link
                href="/market"
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-md transition-colors"
              >
                🛒 Рынок
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9.643l-1.447 1.447M6.75 19.5l-1.447-1.447" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Всего торгов</h3>
              <p className="text-gray-300 text-2xl font-bold">{currentUser.stats?.totalTrades || 0}</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Успешные</h3>
              <p className="text-gray-300 text-2xl font-bold">{currentUser.stats?.successfulTrades || 0}</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <div className="h-12 w-12 bg-yellow-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 3-1.343 3-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1-18 0" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">На заработано</h3>
              <p className="text-gray-300 text-2xl font-bold">${(currentUser.stats?.totalEarned || 0).toFixed(2)}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Быстрые действия</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/profile/inventory"
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-6 text-center transition-colors group"
              >
                <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-700 transition-colors">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2V13m0-3h6m-6 0h-6m6 0v6" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold mb-2">Просмотреть инвентарь</h4>
                <p className="text-gray-300 text-sm">Просмотрите свои скины из Steam и выставьте на продажу</p>
              </Link>

              <Link
                href="/market"
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-6 text-center transition-colors group"
              >
                <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-700 transition-colors">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 3-1.343 3-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1-18 0" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold mb-2">Рынок</h4>
                <p className="text-gray-300 text-sm">Купите скины у других пользователей</p>
              </Link>

              <Link
                href="/trades"
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-6 text-center transition-colors group"
              >
                <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-700 transition-colors">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold mb-2">Торги</h4>
                <p className="text-gray-300 text-sm">Просмотрите свои активные and завершенные торги</p>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}