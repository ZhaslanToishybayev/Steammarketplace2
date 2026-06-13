'use client';

import { useState, useEffect } from 'react';

interface PlatformSetting {
    id: number;
    key: string;
    value: string;
    description: string;
    type: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<PlatformSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSettings(data.data);
                    const values: Record<string, string> = {};
                    data.data.forEach((s: PlatformSetting) => {
                        values[s.key] = s.value;
                    });
                    setEditValues(values);
                }
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (key: string) => {
        setSaving(key);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ key, value: editValues[key] })
            });
            if (res.ok) {
                alert('Настройка сохранена!');
            } else {
                alert('Ошибка сохранения');
            }
        } catch (err) {
            alert('Ошибка сохранения');
        } finally {
            setSaving(null);
        }
    };

    const getInputType = (type: string) => {
        switch (type) {
            case 'number': return 'number';
            case 'boolean': return 'checkbox';
            case 'json': return 'textarea';
            default: return 'text';
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
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">⚙️ Настройки платформы</h1>
                <p className="text-gray-400 mt-1">Управление основными параметрами сайта</p>
            </div>

            <div className="space-y-4">
                {settings.map((setting) => (
                    <div
                        key={setting.id}
                        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-white font-semibold">{setting.key}</h3>
                                <p className="text-gray-400 text-sm">{setting.description}</p>
                            </div>
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                                {setting.type}
                            </span>
                        </div>

                        <div className="flex gap-4 items-center">
                            {setting.type === 'boolean' ? (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editValues[setting.key] === 'true'}
                                        onChange={(e) => setEditValues({
                                            ...editValues,
                                            [setting.key]: e.target.checked ? 'true' : 'false'
                                        })}
                                        className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                                    />
                                    <span className="text-gray-300">
                                        {editValues[setting.key] === 'true' ? 'Включено' : 'Выключено'}
                                    </span>
                                </label>
                            ) : setting.type === 'json' ? (
                                <textarea
                                    value={editValues[setting.key] || ''}
                                    onChange={(e) => setEditValues({
                                        ...editValues,
                                        [setting.key]: e.target.value
                                    })}
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono text-sm h-24"
                                />
                            ) : (
                                <input
                                    type={getInputType(setting.type)}
                                    value={editValues[setting.key] || ''}
                                    onChange={(e) => setEditValues({
                                        ...editValues,
                                        [setting.key]: e.target.value
                                    })}
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                                />
                            )}
                            <button
                                onClick={() => handleSave(setting.key)}
                                disabled={saving === setting.key}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {saving === setting.key ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                ))}

                {settings.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-4xl mb-4">⚙️</p>
                        <p>Нет настроек</p>
                    </div>
                )}
            </div>
        </div>
    );
}
