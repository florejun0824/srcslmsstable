// src/components/teacher/CommandPalette.jsx
import React, { useState, Fragment } from 'react';
import { Dialog, DialogPanel, DialogBackdrop, Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Transition, TransitionChild } from '@headlessui/react';
import { 
    Search, 
    BookOpen, 
    GraduationCap, 
    Rocket, 
    UserCircle, 
    Plus, 
    LogOut,
    Archive,
    Sparkles,
    Command
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CommandPalette({ 
    isOpen, 
    onClose, 
    courses = [], 
    classes = [], 
    actions = {},
    onNavigate 
}) {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    // Define static actions
    const staticActions = [
        { id: 'create-class', name: 'Create New Class', icon: Plus, shortcut: 'C', action: actions.createClass },
        { id: 'create-subject', name: 'Add New Subject', icon: BookOpen, shortcut: 'S', action: actions.createSubject },
        { id: 'ai-hub', name: 'AI Generation Hub', icon: Sparkles, shortcut: 'A', action: actions.openAiHub },
        { id: 'lounge', name: 'Go to Lounge', icon: Rocket, shortcut: 'L', action: actions.openLounge },
        { id: 'profile', name: 'Edit Profile', icon: UserCircle, shortcut: 'P', action: actions.openProfile },
        { id: 'archived', name: 'View Archived Classes', icon: Archive, action: actions.viewArchived },
        { id: 'logout', name: 'Log Out', icon: LogOut, action: actions.logout },
    ];

    // Safe filtering function
    const safeInclude = (text, searchQuery) => {
        return (text || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    };

    // Filter Logic with Safety Checks
    const filteredItems = query === ''
        ? []
        : [
            ...staticActions.filter((action) => safeInclude(action.name, query)),
            
            // Map Classes safely
            ...classes.map(c => ({ 
                id: c.id, 
                name: c.className || 'Untitled Class', // Default if missing
                group: 'Classes', 
                icon: GraduationCap,
                action: () => onNavigate('classes') 
            })).filter(item => safeInclude(item.name, query)),

            // Map Courses safely
            ...courses.map(c => ({ 
                id: c.id, 
                name: c.title || 'Untitled Subject', // Default if missing
                group: 'Subjects', 
                icon: BookOpen,
                action: () => onNavigate('courses', c)
            })).filter(item => safeInclude(item.name, query))
        ];

    const groups = query === '' 
        ? [{ name: 'Quick Actions', items: staticActions.slice(0, 3) }] 
        : [
            { name: 'Actions', items: filteredItems.filter(i => !i.group) },
            { name: 'Classes', items: filteredItems.filter(i => i.group === 'Classes') },
            { name: 'Subjects', items: filteredItems.filter(i => i.group === 'Subjects') }
        ].filter(g => g.items.length > 0);

    return (
        <Transition show={isOpen} as={Fragment} afterLeave={() => setQuery('')}>
            <Dialog 
                as="div" 
                className="relative z-[9999]" 
                onClose={onClose}
            >
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 pt-[20vh] sm:p-6 md:p-20">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95 translate-y-4"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-95 translate-y-4"
                    >
                        <DialogPanel className="mx-auto max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-[#1A1D24] shadow-2xl ring-1 ring-black/5 transition-all">
                            <Combobox
                                onChange={(item) => {
                                    if (item?.action) item.action();
                                    onClose();
                                }}
                            >
                                <div className="flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
                                    <Search className="h-6 w-6 text-gray-500" aria-hidden="true" />
                                    <ComboboxInput
                                        className="h-14 w-full border-0 bg-transparent pl-4 pr-4 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 sm:text-sm focus:outline-none"
                                        placeholder="Search commands, classes, or subjects..."
                                        onChange={(event) => setQuery(event.target.value)}
                                        autoComplete="off"
                                    />
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">ESC</span>
                                    </div>
                                </div>

                                {filteredItems.length > 0 || query === '' ? (
                                    <ComboboxOptions static className="max-h-96 scroll-py-3 overflow-y-auto p-3 focus:outline-none">
                                        {groups.map((group) => (
                                            <div key={group.name} className="mb-2">
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                                    {group.name}
                                                </div>
                                                <ul className="text-sm text-gray-700 dark:text-gray-200">
                                                    {group.items.map((item) => (
                                                        <ComboboxOption
                                                            key={item.id}
                                                            value={item}
                                                            className={({ active }) =>
                                                                `group flex cursor-default select-none items-center rounded-xl px-3 py-3 transition-colors ${
                                                                    active 
                                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                                                                    : 'hover:bg-slate-100 dark:hover:bg-white/5'
                                                                }`
                                                            }
                                                        >
                                                            {({ active }) => (
                                                                <>
                                                                    <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
                                                                        active 
                                                                        ? 'bg-white/20 text-white' 
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700'
                                                                    }`}>
                                                                        <item.icon className="h-5 w-5" aria-hidden="true" />
                                                                    </div>
                                                                    <span className="ml-3 flex-auto truncate font-medium">
                                                                        {item.name}
                                                                    </span>
                                                                    {item.shortcut && (
                                                                        <span className={`ml-3 flex-none text-xs font-semibold ${
                                                                            active ? 'text-blue-100' : 'text-gray-400'
                                                                        }`}>
                                                                            <span className="opacity-60 mr-1">⌘</span>
                                                                            {item.shortcut}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </ComboboxOption>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </ComboboxOptions>
                                ) : (
                                    <div className="py-14 px-6 text-center text-sm sm:px-14">
                                        <Command className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
                                        <p className="mt-4 font-semibold text-gray-900 dark:text-gray-100">No results found</p>
                                        <p className="mt-2 text-gray-500">
                                            We couldn't find anything with that term. Please try again.
                                        </p>
                                    </div>
                                )}
                            </Combobox>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}