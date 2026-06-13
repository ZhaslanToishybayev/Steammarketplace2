'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface PriceChartProps {
    marketHashName: string;
    gameId?: number;
    period?: '7d' | '30d' | '90d';
}

export default function PriceChart({ marketHashName, gameId = 730, period = '7d' }: PriceChartProps) {
    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState(period);

    useEffect(() => {
        fetchChartData();
    }, [marketHashName, gameId, selectedPeriod]);

    const fetchChartData = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/analytics/price-chart/${encodeURIComponent(marketHashName)}?period=${selectedPeriod}&gameId=${gameId}`
            );
            if (!res.ok) throw new Error('Failed to fetch price data');
            const data = await res.json();

            if (data.success) {
                setChartData({
                    labels: data.data.labels.map((d: string) =>
                        new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
                    ),
                    datasets: [
                        {
                            label: 'Цена ($)',
                            data: data.data.prices,
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                        }
                    ]
                });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#fff',
                bodyColor: '#9ca3af',
                borderColor: 'rgba(75, 85, 99, 0.5)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context: any) => `$${context.parsed.y.toFixed(2)}`
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(75, 85, 99, 0.2)',
                },
                ticks: {
                    color: '#9ca3af',
                }
            },
            y: {
                grid: {
                    color: 'rgba(75, 85, 99, 0.2)',
                },
                ticks: {
                    color: '#9ca3af',
                    callback: (value: any) => `$${value}`
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !chartData) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 h-80 flex items-center justify-center">
                <p className="text-gray-400">Нет данных о ценах</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Динамика цены</h3>
                <div className="flex gap-2">
                    {(['7d', '30d', '90d'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setSelectedPeriod(p)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${selectedPeriod === p
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : '90 дней'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-64">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}
