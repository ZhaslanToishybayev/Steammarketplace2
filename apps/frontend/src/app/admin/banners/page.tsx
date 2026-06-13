'use client';

import { useState, useEffect } from 'react';

interface Banner {
    id: number;
    title: string;
    image_url: string;
    link_url: string;
    position: string;
    is_active: boolean;
    priority: number;
    starts_at: string | null;
    ends_at: string | null;
}

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        title: '',
        image_url: '',
        link_url: '',
        position: 'home_top',
        priority: 0
    });

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await fetch('/api/admin/banners', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setBanners(data.data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch banners:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/admin/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form)
            });
            if (res.ok) {
                await fetchBanners();
                setShowForm(false);
                setForm({ title: '', image_url: '', link_url: '', position: 'home_top', priority: 0 });
            }
        } catch (err) {
            alert('Ошибка создания');
        }
    };

    const toggleActive = async (id: number, isActive: boolean) => {
        try {
            await fetch(`/api/admin/banners/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: !isActive })
            });
            await fetchBanners();
        } catch (err) {
            alert('Ошибка');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить баннер?')) return;

        try {
            await fetch(`/api/admin/banners/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            await fetchBanners();
        } catch (err) {
            alert('Ошибка удаления');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-700 rounded w-1/4"></div>
                    <div className="h-64 bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">🖼️ Баннеры</h1>
                    <p className="text-gray-400 mt-1">Управление рекламными баннерами</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    {showForm ? 'Отмена' : '+ Добавить баннер'}
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h3 className="text-white font-semibold mb-4">Новый баннер</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Название"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                        <input
                            type="text"
                            placeholder="URL изображения"
                            value={form.image_url}
                            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                        <input
                            type="text"
                            placeholder="Ссылка при клике"
                            value={form.link_url}
                            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                        <select
                            value={form.position}
                            onChange={(e) => setForm({ ...form, position: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        >
                            <option value="home_top">Главная (верх)</option>
                            <option value="home_side">Главная (боковая)</option>
                            <option value="marketplace">Маркетплейс</option>
                            <option value="footer">Футер</option>
                        </select>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Создать
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700"
                    >
                        {banner.image_url && (
                            <div className="h-32 bg-gray-700 flex items-center justify-center">
                                <img
                                    src={banner.image_url}
                                    alt={banner.title}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        )}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-white font-semibold">{banner.title}</h3>
                                    <p className="text-gray-500 text-sm">
                                        Позиция: {banner.position}
                                    </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${banner.is_active
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {banner.is_active ? 'Активен' : 'Скрыт'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleActive(banner.id, banner.is_active)}
                                    className="flex-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                                >
                                    {banner.is_active ? 'Скрыть' : 'Показать'}
                                </button>
                                <button
                                    onClick={() => handleDelete(banner.id)}
                                    className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {banners.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-400">
                        <p className="text-4xl mb-4">🖼️</p>
                        <p>Нет баннеров</p>
                    </div>
                )}
            </div>
        </div>
    );
}
