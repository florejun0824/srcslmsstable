import React, { Fragment, useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Tab } from '@headlessui/react';
import UserInitialsAvatar from './UserInitialsAvatar';
import Spinner from './Spinner'; // <-- 1. IMPORT Spinner

// --- 2. IMPORT FIRESTORE FUNCTIONS ---
import { db } from '../../services/firebase'; // Adjust path if needed
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';

// Reaction emoji map
const reactionIcons = {
  like: { component: (props) => (<span {...props}>👍</span>), label: 'Like' },
  love: { component: (props) => (<span {...props}>❤️</span>), label: 'Love' },
  haha: { component: (props) => (<span {...props}>😂</span>), label: 'Haha' },
  wow: { component: (props) => (<span {...props}>😮</span>), label: 'Wow' },
  sad: { component: (props) => (<span {...props}>😢</span>), label: 'Sad' },
  angry: { component: (props) => (<span {...props}>😡</span>), label: 'Angry' },
  care: { component: (props) => (<span {...props}>🤗</span>), label: 'Care' },
};
const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// --- 3. REMOVED usersMap from props ---
const ReactionsBreakdownModal = ({ isOpen, onClose, reactionsData }) => {

  // --- 4. ADD NEW STATE for usersMap and loading ---
  const [usersMap, setUsersMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // --- 5. ADD DATA FETCHING LOGIC ---
  const fetchReactingUsers = useCallback(async (reactions) => {
    if (!reactions || Object.keys(reactions).length === 0) {
        setIsLoading(false);
        return;
    }
    
    const userIdsToFetch = Object.keys(reactions);
    if (userIdsToFetch.length === 0) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const newUsers = {};
    
    try {
        // Fetch users in chunks of 30
        for (let i = 0; i < userIdsToFetch.length; i += 30) {
            const chunk = userIdsToFetch.slice(i, i + 30);
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            const userSnap = await getDocs(usersQuery);
            userSnap.forEach(doc => {
                newUsers[doc.id] = doc.data();
            });
        }
        setUsersMap(newUsers);
    } catch (err) {
        console.error("Error fetching users for reactions modal:", err);
    } finally {
        setIsLoading(false);
    }
  }, []); // Empty dependency array, this function is stable

  // --- 6. ADD useEffect to run fetch on open ---
  useEffect(() => {
    if (isOpen) {
        fetchReactingUsers(reactionsData);
    } else {
        // Reset state on close
        setUsersMap({});
        setIsLoading(true);
    }
  }, [isOpen, reactionsData, fetchReactingUsers]);
  // --- END NEW LOGIC ---


  const groupedReactions = useMemo(() => {
    if (!reactionsData) return { all: [], groups: {}, total: 0 };

    const all = [];
    const groups = {};
    let total = 0;

    for (const userId in reactionsData) {
      const reactionType = reactionsData[userId];
      // --- MODIFIED: Use internal usersMap state ---
      const user = usersMap[userId] || { id: userId, firstName: 'Loading...', lastName: '' };
      
      const reactionInfo = {
        userId,
        reactionType,
        user,
      };

      all.push(reactionInfo);
      
      if (!groups[reactionType]) {
        groups[reactionType] = [];
      }
      groups[reactionType].push(reactionInfo);
      total++;
    }

    reactionTypes.forEach(type => {
        if (!groups[type]) {
            groups[type] = [];
        }
    });

    return { all, groups, total };
  }, [reactionsData, usersMap]); // Now depends on internal usersMap

  const tabs = [
    { name: 'All', count: groupedReactions.total, type: 'all' },
    ...reactionTypes.map(type => ({
      name: reactionIcons[type].component({}).props.children, // Get the emoji
      count: groupedReactions.groups[type].length,
      type: type,
    })).filter(tab => tab.count > 0)
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="relative w-full max-w-md bg-neumorphic-base shadow-neumorphic rounded-3xl dark:bg-neumorphic-base-dark dark:shadow-lg overflow-hidden max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Header */}
            <div className="pt-6 pb-4 px-6 border-b border-slate-300/50 dark:border-slate-700 flex-shrink-0 flex items-center justify-between">
              <h2 id="reactions-title" className="text-xl font-bold text-slate-900 leading-tight dark:text-slate-100">
                Reactions
              </h2>
              <button 
                onClick={onClose} 
                className="p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark z-20"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto">
              <Tab.Group>
                <Tab.List className="sticky top-0 bg-neumorphic-base dark:bg-neumorphic-base-dark border-b border-slate-300/50 dark:border-slate-700 px-4 flex space-x-1">
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.type}
                      className={({ selected }) =>
                        classNames(
                          'px-4 py-2.5 text-sm font-semibold transition-colors',
                          'focus:outline-none',
                          selected
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                        )
                      }
                    >
                      {tab.name}
                      <span className={classNames(
                          'ml-1.5 rounded-full px-2 py-0.5 text-xs',
                          selected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      )}>
                        {tab.count}
                      </span>
                    </Tab>
                  ))}
                </Tab.List>

                {/* --- 7. ADD LOADING SPINNER --- */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Spinner />
                    </div>
                ) : (
                    <Tab.Panels className="p-4">
                        {/* "All" Tab Panel */}
                        <Tab.Panel className="focus:outline-none">
                        <ul className="space-y-3">
                            {groupedReactions.all.map(({ userId, user, reactionType }) => (
                            <li key={userId} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                <UserInitialsAvatar user={user} size="w-10 h-10" />
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    {user.firstName} {user.lastName}
                                </span>
                                </div>
                                <span className="text-2xl">{reactionIcons[reactionType].component({}).props.children}</span>
                            </li>
                            ))}
                        </ul>
                        </Tab.Panel>
                        
                        {/* Other Reaction Tab Panels */}
                        {reactionTypes.map(type => (
                        <Tab.Panel key={type} className="focus:outline-none">
                            <ul className="space-y-3">
                            {groupedReactions.groups[type].length > 0 ? (
                                groupedReactions.groups[type].map(({ userId, user }) => (
                                    <li key={userId} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UserInitialsAvatar user={user} size="w-10 h-10" />
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                                        {user.firstName} {user.lastName}
                                        </span>
                                    </div>
                                    <span className="text-2xl">{reactionIcons[type].component({}).props.children}</span>
                                    </li>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-4">No {reactionIcons[type].label} reactions.</p>
                            )}
                            </ul>
                        </Tab.Panel>
                        ))}
                    </Tab.Panels>
                )}
                {/* --- END LOADING WRAPPER --- */}
              </Tab.Group>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReactionsBreakdownModal;