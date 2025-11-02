// src/components/common/ConfirmBiometricModal.jsx
import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FingerPrintIcon } from '@heroicons/react/24/solid';

export default function ConfirmBiometricModal({ isOpen, onResolve, accentColor }) {

  const colorMap = {
    blue: {
      button: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400',
      text: 'text-blue-600 dark:text-blue-400',
    },
    teal: {
      button: 'bg-teal-500 hover:bg-teal-600 dark:bg-teal-500 dark:hover:bg-teal-400',
      text: 'text-teal-600 dark:text-teal-400',
    },
  };
  const scheme = colorMap[accentColor] || colorMap.blue;

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={() => onResolve(false)}>
        {/* Backdrop */}
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-gray-100 dark:bg-neumorphic-base-dark p-6 sm:p-8 text-left align-middle shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark transition-all">
                <div className="text-center">
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-neumorphic dark:shadow-neumorphic-dark ${scheme.text}`}>
                    <FingerPrintIcon className="h-10 w-10" aria-hidden="true" />
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="mt-4 text-2xl font-bold leading-6 text-gray-800 dark:text-slate-100"
                  >
                    Enable Biometric Login?
                  </Dialog.Title>
                  <div className="mt-3">
                    <p className="text-base text-gray-500 dark:text-slate-400">
                      Would you like to use your fingerprint or face to log in next time?
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-3 sm:space-y-0 sm:flex sm:flex-row-reverse sm:gap-4">
                  <button
                    type="button"
                    className={`w-full sm:w-auto inline-flex justify-center rounded-2xl border border-transparent px-6 py-3 font-semibold text-white shadow-neumorphic dark:shadow-neumorphic-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all active:scale-[0.98] ${scheme.button}`}
                    onClick={() => onResolve(true)}
                  >
                    Yes, Enable
                  </button>
                  <button
                    type="button"
                    className="w-full sm:w-auto inline-flex justify-center rounded-2xl px-6 py-3 font-semibold text-gray-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all active:scale-[0.98]"
                    onClick={() => onResolve(false)}
                  >
                    No, Thanks
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}