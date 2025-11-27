'use client';

import { forwardRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'flushed' | 'unstyled';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  errorMessage?: string;
  helperMessage?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  isSuccess?: boolean;
  isDisabled?: boolean;
}

const baseClasses = [
  'block w-full rounded-md border-0 bg-transparent py-1.5 pl-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-transparent focus:border-transparent',
  'disabled:cursor-not-allowed disabled:opacity-50',
];

const variants = {
  default: [
    'bg-gray-800 border-gray-600 text-gray-100',
    'focus:bg-gray-700 focus:border-orange-500 focus:ring-orange-500/20',
    'shadow-sm',
  ],
  filled: [
    'bg-gray-700 border border-gray-600 text-gray-100',
    'focus:bg-gray-600 focus:border-orange-500 focus:ring-orange-500/20',
  ],
  flushed: [
    'bg-transparent border-0 border-b-2 border-b-gray-600 text-gray-100',
    'focus:border-b-orange-500 focus:ring-0',
  ],
  unstyled: [
    'bg-transparent border-0 text-gray-100',
    'focus:ring-2 focus:ring-orange-500/20 focus:border-transparent',
  ],
};

const sizes = {
  sm: ['text-sm py-1 px-3', 'pr-8'],
  md: ['text-base py-2 px-3', 'pr-10'],
  lg: ['text-lg py-3 px-4', 'pr-12'],
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      size = 'md',
      className,
      errorMessage,
      helperMessage,
      isRequired,
      isInvalid,
      isSuccess,
      isDisabled,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const isInvalidState = isInvalid || !!error || !!errorMessage;
    const isDisabledState = isDisabled || disabled;

    const inputClasses = twMerge(
      ...baseClasses,
      ...variants[variant],
      ...sizes[size],
      isInvalidState && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      isSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
      isFocused && !isInvalidState && !isSuccess && 'ring-2 ring-orange-500/20',
      className
    );

    const iconClasses = twMerge(
      'absolute inset-y-0 flex items-center',
      leftIcon && 'left-3',
      rightIcon && sizes[size][1]
    );

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium leading-6 text-gray-300 mb-1"
          >
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className={twMerge(iconClasses, 'left-3')}>
              <span className="text-gray-400">{leftIcon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            disabled={isDisabledState}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {rightIcon && (
            <div className={twMerge(iconClasses, sizes[size][1])}>
              <span className="text-gray-400">{rightIcon}</span>
            </div>
          )}

          {/* Error icon for invalid state */}
          {isInvalidState && !rightIcon && (
            <div className={twMerge(iconClasses, sizes[size][1])}>
              <svg
                className="h-5 w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="8" />
                <path
                  fillRule="evenodd"
                  d="M10 8a2 2 0 100-4 2 2 0 000 4zM10 12a2 2 0 100 4 2 2 0 000-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}

          {/* Success icon for valid state */}
          {isSuccess && !rightIcon && !isInvalidState && (
            <div className={twMerge(iconClasses, sizes[size][1])}>
              <svg
                className="h-5 w-5 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.857a.75.75 0 00-1.214-.857A6.25 6.25 0 1110 5.25a.75.75 0 001.214-.857zm-3.687 3.687a.75.75 0 001.06 1.06l-1.5 1.5a.75.75 0 11-1.06-1.06l1.5-1.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Helper text */}
        {helperText && !isInvalidState && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}

        {/* Error message */}
        {(error || errorMessage) && (
          <p className="mt-1 text-sm text-red-400" id={`${inputId}-error`}>
            {error || errorMessage}
          </p>
        )}

        {/* Success message */}
        {isSuccess && !isInvalidState && helperMessage && (
          <p className="mt-1 text-sm text-green-400">{helperMessage}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'flushed' | 'unstyled';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  isSuccess?: boolean;
  isDisabled?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      variant = 'default',
      size = 'md',
      className,
      isRequired,
      isInvalid,
      isSuccess,
      isDisabled,
      disabled,
      resize = 'vertical',
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const isInvalidState = isInvalid || !!error;
    const isDisabledState = isDisabled || disabled;

    const textareaClasses = twMerge(
      ...baseClasses,
      ...variants[variant],
      ...sizes[size],
      resize === 'none' && 'resize-none',
      resize === 'vertical' && 'resize-y',
      resize === 'horizontal' && 'resize-x',
      resize === 'both' && 'resize',
      isInvalidState && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      isSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
      isFocused && !isInvalidState && !isSuccess && 'ring-2 ring-orange-500/20',
      className
    );

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium leading-6 text-gray-300 mb-1"
          >
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          disabled={isDisabledState}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Error message */}
        {(error) && (
          <p className="mt-1 text-sm text-red-400" id={`${textareaId}-error`}>
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !isInvalidState && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'flushed' | 'unstyled';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  isSuccess?: boolean;
  isDisabled?: boolean;
  options?: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      variant = 'default',
      size = 'md',
      className,
      isRequired,
      isInvalid,
      isSuccess,
      isDisabled,
      disabled,
      options = [],
      children,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const isInvalidState = isInvalid || !!error;
    const isDisabledState = isDisabled || disabled;

    const selectClasses = twMerge(
      ...baseClasses,
      ...variants[variant],
      ...sizes[size],
      isInvalidState && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      isSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
      isFocused && !isInvalidState && !isSuccess && 'ring-2 ring-orange-500/20',
      'appearance-none bg-gray-800 pr-10', // Remove default arrow and add padding
      className
    );

    const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium leading-6 text-gray-300 mb-1"
          >
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            disabled={isDisabledState}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          >
            {children ||
              options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>

          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.75a.75.75 0 01-1.08 0l-4.25-4.75a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Error message */}
        {(error) && (
          <p className="mt-1 text-sm text-red-400" id={`${selectId}-error`}>
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !isInvalidState && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';