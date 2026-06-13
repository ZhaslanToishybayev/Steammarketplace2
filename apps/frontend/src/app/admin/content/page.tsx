'use client';

import { useState, useEffect } from 'react';

interface ContentItem {
    id: number;
    key: string;
    title: string;
    content: string;
    type: string;
    is_active: boolean;
    updated_at: string;
}

export default function ContentPage() {
    const [items, setItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ title: '', content: '' });

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const res = await fetch('/api/admin/content', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setItems(data.data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch content:', err);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (item: ContentItem) => {
        setEditing(item.id);
        setEditForm({ title: item.title, content: item.content });
    };

    const handleSave = async () => {
        if (!editing) return;

        try {
            const res = await fetch(`/api/admin/content/${editing}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                await fetchContent();
                setEditing(null);
            }
        } catch (err) {
            alert('Ошибка сохранения');
        }
    };

    const toggleActive = async (id: number, isActive: boolean) => {
        try {
            await fetch(`/api/admin/content/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: !isActive })
            });
            await fetchContent();
        } catch (err) {
            alert('Ошибка');
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
                    <h1 className="text-2xl font-bold text-white">📝 Управление контентом</h1>
                    <p className="text-gray-400 mt-1">FAQ, новости и статические страницы</p>
                </div>
            </div>

            <div className="space-y-4">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
                    >
                        {editing === item.id ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    placeholder="Заголовок"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                />
                                <textarea
                                    value={editForm.content}
                                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                    placeholder="Содержимое (поддерживает HTML)"
                                    rows={6}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono text-sm"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Сохранить
                                    </button>
                                    <button
                                        onClick={() => setEditing(null)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-white font-semibold text-lg">{item.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded ${item.is_active
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {item.is_active ? 'Активно' : 'Скрыто'}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Ключ: {item.key} | Тип: {item.type}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleActive(item.id, item.is_active)}
                                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${item.is_active
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                }`}
                                        >
                                            {item.is_active ? 'Скрыть' : 'Показать'}
                                        </button>
                                        <button
                                            onClick={() => startEdit(item)}
                                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                        >
                                            Редактировать
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4 text-gray-300 text-sm max-h-32 overflow-y-auto">
                                    {item.content.substring(0, 300)}
                                    {item.content.length > 300 && '...'}
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-4xl mb-4">📝</p>
                        <p>Нет контента</p>
                    </div>
                )}
            </div>
        </div>
    );
}
