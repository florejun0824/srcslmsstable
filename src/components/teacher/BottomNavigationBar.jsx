// src/components/teacher/BottomNavigationBar.jsx
import React, { useState, Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { Transition } from '@headlessui/react';
import { IconX } from '@tabler/icons-react';

// --- This component is unchanged ---
const BottomNavItem = ({ item, onClick }) => (
    <NavLink
        to={item.view === 'home' ? '/dashboard' : `/dashboard/${item.view}`}
        end={item.view === 'home'}
        onClick={onClick}
        className="flex flex-col items-center justify-center w-full h-full pt-1"
    >
        {({ isActive }) => (
            <>
                <div
                    className={`
                        flex items-center justify-center w-10 h-10 rounded-full
                        bg-neumorphic-base dark:bg-neumorphic-base-dark
                        transition-all duration-200
                        ${
                            isActive
                                ? 'shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark'
                                : 'shadow-neumorphic dark:shadow-neumorphic-dark'
                        }
                    `}
                >
                    <item.icon
                        size={22}
                        className={`
                            transition-colors duration-200
                            ${
                                isActive
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-slate-400'
                            }
                        `}
                    />
                </div>
                <span
                    className={`
                        text-xs font-medium mt-1
                        transition-colors duration-200
                        ${
                            isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 dark:text-slate-400'
                        }
                    `}
                >
                    {item.text}
                </span>
            </>
        )}
    </NavLink>
);

// --- This component is unchanged ---
const ActionMenuItem = ({ item, onClick, index, total }) => {
    
    let angleDeg;
    const arc = 150; 
    
    if (total === 1) {
        angleDeg = -90;
    } else {
        angleDeg = -15 - (index * (arc / (total - 1)));
    }
    const angleRad = (angleDeg * Math.PI) / 180;
    
    const radius = 105; 
    const x = Math.round(Math.cos(angleRad) * radius); 
    const y = Math.round(Math.sin(angleRad) * radius);

    return (
        <Transition.Child
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 scale-50"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-50"
        >
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    willChange: 'transform',
                    transform: `translate(${x}px, ${y}px)`,
                    transitionDelay: `${index * 30}ms`,
                }}
            >
                <NavLink
                    to={item.view === 'home' ? '/dashboard' : `/dashboard/${item.view}`}
                    end={item.view === 'home'}
                    onClick={onClick}
                    className="flex flex-col items-center justify-center w-16"
                >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all">
                        <item.icon
                            size={24}
                            className="text-slate-700 dark:text-slate-300"
                        />
                    </div>
                    <span className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 text-center">
                        {item.text}
                    </span>
                </NavLink>
            </div>
        </Transition.Child>
    );
};

// --- Main component is unchanged ---
const BottomNavigationBar = ({
    bottomNavItems,
    actionMenuItems,
    onNavigate,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleToggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleClose = () => {
        setIsMenuOpen(false);
    };

    const handleNavAndClose = () => {
        onNavigate();
        handleClose();
    };

    const navItemsLeft = bottomNavItems.slice(0, 2); // Home, Classes
    const navItemsRight = bottomNavItems.slice(2, 4); // Subjects, Profile

    return (
        <>
            {/* Backdrop (unchanged) */}
            <Transition show={isMenuOpen} as={Fragment}>
                <div
                    className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={handleClose}
                    aria-hidden="true"
                />
            </Transition>

            {/* Action Menu Items Container (unchanged) */}
            <div className="fixed bottom-10 left-1/2 z-[50] -translate-x-1/2 w-16 h-16 lg:hidden">
                <Transition 
                    show={isMenuOpen} 
                    as="div" 
                    className="relative w-full h-full"
                >
                    {actionMenuItems.map((item, index) => (
                        <ActionMenuItem
                            key={item.view}
                            item={item}
                            onClick={handleNavAndClose}
                            index={index}
                            total={actionMenuItems.length}
                        />
                    ))}
                </Transition>
            </div>

            {/* --- THIS SECTION IS MODIFIED --- */}
            {/* Central Action Button (Centering method changed) z-[51] */}
            <div className="fixed bottom-4 left-0 right-0 z-[51] lg:hidden flex justify-center pointer-events-none">
                <button
                    onClick={handleToggleMenu}
                    aria-expanded={isMenuOpen}
                    aria-label={isMenuOpen ? "Close action menu" : "Open action menu"}
                    // MODIFIED: Added pointer-events-auto
                    className={`flex items-center justify-center w-16 h-16 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-all duration-300 transform-gpu pointer-events-auto ${
                        isMenuOpen
                            ? 'shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark -rotate-180'
                            : ''
                    }`}
                >
                    {isMenuOpen ? (
                        <IconX size={30} className="text-slate-700 dark:text-slate-300" />
                    ) : (
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-12 h-12 rounded-full"
                        />
                    )}
                </button>
            </div>
            {/* --- END OF MODIFIED SECTION --- */}


            {/* Bottom Navigation Bar (STICKY CONTAINER) (Unchanged) */}
            <div className="sticky bottom-0 z-40 h-16 lg:hidden">
                {/* THIS IS THE "CURVE" MASK (FIXED) (Unchanged) */}
                <div 
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 w-24 h-12 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-t-full z-[1]"
                    aria-hidden="true"
                />

                {/* This is the nav bar itself (Unchanged) */}
                <nav className="relative z-0 w-full h-16 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-top dark:shadow-neumorphic-top-dark">
                    <div className="flex justify-between items-start h-full max-w-md mx-auto">
                        
                        {/* Left Items (Spacing changed) */}
                        <div className="flex-1 flex justify-evenly items-center h-full"> 
                            {navItemsLeft.map((item) => (
                                <BottomNavItem
                                    key={item.view}
                                    item={item}
                                    onClick={handleNavAndClose}
                                />
                            ))}
                        </div>

                        {/* Center Spacer (Unchanged) */}
                        <div className="w-24 flex-shrink-0" aria-hidden="true" />

                        {/* Right Items (Spacing changed) */}
                        <div className="flex-1 flex justify-evenly items-center h-full"> 
                            {navItemsRight.map((item) => (
                                <BottomNavItem
                                    key={item.view}
                                    item={item}
                                    onClick={handleNavAndClose}
                                />
                            ))}
                        </div>

                    </div>
                </nav>
            </div>
        </>
    );
};

export default BottomNavigationBar;