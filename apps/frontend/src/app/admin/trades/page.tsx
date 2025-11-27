'use client';

import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

export default function AdminTradesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trade Management</h1>
          <p className="text-gray-400 mt-1">Monitor and manage trade activities</p>
        </div>
      </div>

      {/* Placeholder Content */}
      <Card className="bg-gray-800/50 border-gray-700">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold text-white mb-2">Trade Management Interface</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            The trade management interface is currently under development. In the meantime, you can manage trades through the backend API.
          </p>

          <div className="space-y-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Available Actions:</h4>
              <ul className="text-sm text-gray-400 space-y-1 text-left max-w-sm mx-auto">
                <li>• Monitor trade offers and status</li>
                <li>• Handle trade disputes</li>
                <li>• Review trade history</li>
                <li>• Manage trade limits</li>
                <li>• Process manual trades</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => window.open('/api/docs', '_blank')}
                variant="secondary"
                size="md"
              >
                View API Documentation
              </Button>
              <Button
                onClick={() => window.location.href = '/admin'}
                variant="orange"
                size="md"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800/50 border-gray-700 text-center">
          <div className="text-3xl font-bold text-white mb-2">1,567</div>
          <div className="text-sm text-gray-400">Total Trades</div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">1,483</div>
          <div className="text-sm text-gray-400">Successful</div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 text-center">
          <div className="text-3xl font-bold text-orange-400 mb-2">84</div>
          <div className="text-sm text-gray-400">Failed</div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">$45,678</div>
          <div className="text-sm text-gray-400">Total Volume</div>
        </Card>
      </div>

      {/* Recent Activity Preview */}
      <Card className="bg-gray-800/50 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Trade Activity</h3>
        <div className="space-y-3">
          <div className="text-sm text-gray-400 text-center py-8">
            Trade activity feed will be displayed here.
            <br />
            <span className="text-xs">Real-time trade monitoring coming soon.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}