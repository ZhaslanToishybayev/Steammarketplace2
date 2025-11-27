'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Badge } from '@/components/shared/Badge';

interface AddBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function AddBotModal({ isOpen, onClose, onSubmit, isLoading = false }: AddBotModalProps) {
  const [formData, setFormData] = useState({
    accountName: '',
    password: '',
    sharedSecret: '',
    identitySecret: '',
    steamGuardCode: '',
    apiKey: '',
    maxConcurrentTrades: 5
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'accountName':
        if (!value.trim()) return 'Account name is required';
        if (value.length < 3) return 'Account name must be at least 3 characters';
        if (value.length > 50) return 'Account name cannot exceed 50 characters';
        break;

      case 'password':
        if (!value.trim()) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        break;

      case 'sharedSecret':
        if (!value.trim()) return 'Shared secret is required';
        if (value.length !== 28) return 'Shared secret must be exactly 28 characters';
        if (!/^[A-Za-z0-9+/=]+$/.test(value)) return 'Shared secret must be base64 format';
        break;

      case 'identitySecret':
        if (!value.trim()) return 'Identity secret is required';
        if (value.length !== 28) return 'Identity secret must be exactly 28 characters';
        if (!/^[A-Za-z0-9+/=]+$/.test(value)) return 'Identity secret must be base64 format';
        break;

      case 'steamGuardCode':
        if (value && value.length !== 5) return 'Steam guard code must be exactly 5 characters';
        break;

      case 'apiKey':
        // API key is optional
        if (value && value.length < 10) return 'API key must be at least 10 characters';
        break;

      case 'maxConcurrentTrades':
        const numValue = parseInt(value);
        if (isNaN(numValue)) return 'Must be a valid number';
        if (numValue < 1) return 'Must be at least 1';
        if (numValue > 20) return 'Cannot exceed 20';
        break;
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value.toString());
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const isFormValid = () => {
    // Check required fields are filled
    const requiredFieldsValid = formData.accountName.trim() &&
                               formData.password.trim() &&
                               formData.sharedSecret.trim() &&
                               formData.identitySecret.trim() &&
                               formData.maxConcurrentTrades >= 1;

    // Check specific constraints for required fields
    const constraintsValid = formData.sharedSecret.length === 28 &&
                            formData.identitySecret.length === 28 &&
                            formData.password.length >= 8;

    // Check that optional fields are valid if provided
    const optionalFieldsValid = (!formData.steamGuardCode || formData.steamGuardCode.length === 5) &&
                               (!formData.apiKey || formData.apiKey.length >= 10);

    // Check that there are no validation errors
    const noErrors = Object.values(errors).every(error => !error);

    return requiredFieldsValid && constraintsValid && optionalFieldsValid && noErrors;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Bot"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>👤</span>
            <span>Account Information</span>
          </h3>

          <Input
            label="Account Name *"
            name="accountName"
            value={formData.accountName}
            onChange={handleChange}
            error={errors.accountName}
            placeholder="Enter Steam account name"
            className="bg-gray-700 border-gray-600"
          />

          <Input
            label="Password *"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="Enter Steam account password"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-white"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            }
            className="bg-gray-700 border-gray-600"
          />
        </div>

        {/* Steam Guard Secrets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>🔐</span>
            <span>Steam Guard Secrets</span>
          </h3>

          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-3">
              <p className="mb-2">
                To get your shared and identity secrets, use Steam Desktop Authenticator (SDA) or similar tools.
              </p>
              <p>
                These secrets are required for bot authentication and trade operations.
              </p>
            </div>

            <Badge variant="info" size="sm" className="mb-3">
              Need help? Check the Bot Activation Guide in the README
            </Badge>

            <Input
              label="Shared Secret *"
              name="sharedSecret"
              value={formData.sharedSecret}
              onChange={handleChange}
              error={errors.sharedSecret}
              placeholder="Enter 28-character base64 shared secret"
              helperText="Must be exactly 28 characters in base64 format"
              className="bg-gray-700 border-gray-600"
            />

            <Input
              label="Identity Secret *"
              name="identitySecret"
              value={formData.identitySecret}
              onChange={handleChange}
              error={errors.identitySecret}
              placeholder="Enter 28-character base64 identity secret"
              helperText="Must be exactly 28 characters in base64 format"
              className="bg-gray-700 border-gray-600"
            />

            <Input
              label="Steam Guard Code (Optional)"
              name="steamGuardCode"
              value={formData.steamGuardCode}
              onChange={handleChange}
              error={errors.steamGuardCode}
              placeholder="Enter 5-character guard code if available"
              helperText="Optional: Only if your account has mobile authenticator enabled"
              className="bg-gray-700 border-gray-600"
            />
          </div>
        </div>

        {/* Optional Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>⚙️</span>
            <span>Optional Settings</span>
          </h3>

          <Input
            label="Steam API Key"
            name="apiKey"
            value={formData.apiKey}
            onChange={handleChange}
            error={errors.apiKey}
            placeholder="Enter Steam Web API key (optional)"
            helperText="Optional: Get from https://steamcommunity.com/dev/apikey"
            className="bg-gray-700 border-gray-600"
          />

          <Input
            label="Max Concurrent Trades"
            name="maxConcurrentTrades"
            type="number"
            value={formData.maxConcurrentTrades}
            onChange={handleChange}
            error={errors.maxConcurrentTrades}
            placeholder="5"
            helperText="Number of trades bot can handle simultaneously (1-20)"
            min="1"
            max="20"
            className="bg-gray-700 border-gray-600"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="orange"
            disabled={!isFormValid() || isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>Add Bot</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}