'use client';

import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage user accounts and permissions</p>
        </div>
      </div>

      {/* Placeholder Content */}
      <Card className="bg-gray-800/50 border-gray-700">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-white mb-2">User Management Interface</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            The user management interface is currently under development. In the meantime, you can manage users through the backend API.
          </p>

          <div className="space-y-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Available Actions:</h4>
              <ul className="text-sm text-gray-400 space-y-1 text-left max-w-sm mx-auto">
                <li>• View user registrations</li>
                <li>• Manage user roles and permissions</li>
                <li>• Ban/unban users</li>
                <li>• View user activity logs</li>
                <li>• Handle user support requests</li>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800/50 border-gray-700 text-center">
          <div className="text-3xl font-bold text-white mb-2">1,234</div>
          <div className="text-sm text-gray-400">Total Users</div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">456</div>
          <div className="text-sm text-gray-400">Active Today</div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 text-center">
          <div className="text-3xl font-bold text-orange-400 mb-2">12</div>
          <div className="text-sm text-gray-400">Banned Users</div>
        </Card>
      </div>
    </div>
  );
}