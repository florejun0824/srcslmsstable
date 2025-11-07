import React, { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { RadioGroup } from '@headlessui/react';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import Spinner from '../common/Spinner';

const audienceOptions = [
  { name: 'Public', description: 'Anyone on the platform can see this post.', icon: GlobeAltIcon },
  { name: 'Private', description: 'Only you can see this post.', icon: LockClosedIcon },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const CreateStudentPostModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    userProfile, 
    isPosting 
}) => {
  const [content, setContent] = useState('');
  const [selectedAudience, setSelectedAudience] = useState(audienceOptions[0]); // Default to Public

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || isPosting) return;
    onSubmit(content, selectedAudience.name);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          aria-labelledby="create-post-title"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="relative w-full max-w-lg bg-neumorphic-base shadow-neumorphic rounded-3xl dark:bg-neumorphic-base-dark dark:shadow-lg overflow-hidden max-h-[90vh] flex flex-col"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark z-20"
              aria-label="Close"
              disabled={isPosting}
            >
              <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            
            <div className="pt-8 pb-4 px-6 text-center border-b border-slate-300/50 dark:border-slate-700 flex-shrink-0">
              <h2 id="create-post-title" className="text-2xl font-bold text-slate-900 leading-tight dark:text-slate-100">
                Create Post
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
              <div className="p-6 flex-grow overflow-y-auto space-y-6">
                
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <UserInitialsAvatar user={userProfile} size="full" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {userProfile?.displayName || `${userProfile.firstName} ${userProfile.lastName}`}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Posting as a student
                    </p>
                  </div>
                </div>

                {/* Text Area */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`What's on your mind, ${userProfile.firstName}?`}
                  className="w-full h-40 p-3 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-all text-base resize-none"
                  autoFocus
                />

                {/* Audience Selector */}
                <RadioGroup value={selectedAudience} onChange={setSelectedAudience}>
                  <RadioGroup.Label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Who can see this?
                  </RadioGroup.Label>
                  <div className="grid grid-cols-2 gap-4">
                    {audienceOptions.map((option) => (
                      <RadioGroup.Option
                        key={option.name}
                        value={option}
                        className={({ active, checked }) =>
                          classNames(
                            'relative flex cursor-pointer rounded-xl p-4 transition-all',
                            'bg-neumorphic-base dark:bg-neumorphic-base-dark',
                            'shadow-neumorphic dark:shadow-lg',
                            checked 
                              ? 'shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark ring-2 ring-blue-500' 
                              : 'hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'
                          )
                        }
                      >
                        {({ active, checked }) => (
                          <>
                            <div className="flex w-full items-start justify-between">
                              <div className="flex items-center">
                                <option.icon className={classNames(
                                  'h-6 w-6 flex-shrink-0',
                                  checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                                )} />
                                <div className="ml-3 text-sm">
                                  <RadioGroup.Label
                                    as="p"
                                    className={classNames(
                                      'font-semibold',
                                      checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'
                                    )}
                                  >
                                    {option.name}
                                  </RadioGroup.Label>
                                  <RadioGroup.Description
                                    as="span"
                                    className={classNames(
                                      'inline text-xs',
                                      checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                                    )}
                                  >
                                    {option.description}
                                  </RadioGroup.Description>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </RadioGroup.Option>
                    ))}
                  </div>
                </RadioGroup>

              </div>
              {/* --- END of scrollable part --- */}

              {/* --- Footer --- */}
              <div className="p-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
                <button
                  type="submit"
                  disabled={!content.trim() || isPosting}
                  className="w-full flex items-center justify-center min-w-[140px] px-5 py-3 rounded-xl bg-blue-500 text-white font-semibold shadow-md hover:bg-blue-600 active:shadow-inner transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPosting ? (
                    <>
                      <Spinner size="sm" />
                      <span className="ml-2">Posting...</span>
                    </>
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateStudentPostModal;