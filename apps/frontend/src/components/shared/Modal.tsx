'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  className,
  children,
  footer,
  closeOnEsc = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  initialFocus,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={(closeOnOverlayClick && onClose) || (() => {})}
        initialFocus={initialFocus}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={twMerge(
                  'relative w-full transform overflow-hidden rounded-lg bg-gray-900 text-left shadow-xl transition-all border border-gray-700',
                  sizes[size],
                  size !== 'full' && 'max-h-[90vh] overflow-y-auto',
                  className
                )}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex-1">
                      {title && (
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold leading-6 text-white"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-1 text-sm text-gray-400">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        type="button"
                        className="ml-auto inline-flex rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={twMerge('p-6', !title && !description && 'pt-0')}>
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="flex items-center justify-end space-x-3 bg-gray-800/50 px-6 py-4 border-t border-gray-700">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Modal variants for common use cases
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary' as const,
  cancelVariant = 'secondary' as const,
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  cancelVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  isLoading?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
      showCloseButton={false}
    >
      <div className="mt-4 flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          onClick={onClose}
        >
          {cancelText}
        </button>
        <button
          type="button"
          disabled={isLoading}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
            confirmVariant === 'primary'
              ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
              : confirmVariant === 'secondary'
              ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
              : confirmVariant === 'success'
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              : confirmVariant === 'warning'
              ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
              : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
          } focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={onConfirm}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  );
}

// Loading modal for processing states
export function LoadingModal({
  isOpen,
  title = 'Processing...',
  description,
}: {
  isOpen: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={title}
      description={description}
      size="sm"
      showCloseButton={false}
    >
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    </Modal>
  );
}