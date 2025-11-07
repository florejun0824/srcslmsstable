import React, { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
    BriefcaseIcon,
    AcademicCapIcon,
    MapPinIcon,
    PhoneIcon,
    HeartIcon 
} from '@heroicons/react/24/solid';

// Helper component for each info row
const InfoRow = ({ icon: Icon, label, value }) => {
    const hasValue = value && value.trim() !== '';
    
    return (
        <div className="flex items-start gap-4">
            <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
                <p className={`font-medium ${!hasValue ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-800 dark:text-slate-100'}`}>
                    {hasValue ? value : `No ${label.toLowerCase()} provided`}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            </div>
        </div>
    );
};

const AboutInfoModal = ({ isOpen, onClose, userProfile }) => {
    
    // Format the relationship status to include the partner
    let relationshipValue = userProfile?.relationship_status;
    if (userProfile?.relationship_status && (userProfile.relationship_status === 'In a Relationship' || userProfile.relationship_status === 'Married') && userProfile.relationship_partner) {
        relationshipValue += ` with ${userProfile.relationship_partner}`;
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    aria-labelledby="about-info-title"
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
                        {/* Header */}
                        <div className="pt-6 pb-4 px-6 border-b border-slate-300/50 dark:border-slate-700 flex-shrink-0 flex items-center justify-between">
                            <h2 id="about-info-title" className="text-xl font-bold text-slate-900 leading-tight dark:text-slate-100">
                                About Info
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
                        <div className="p-6 flex-grow overflow-y-auto">
                            <div className="space-y-5">
                                <InfoRow icon={BriefcaseIcon} label="Work" value={userProfile?.work} />
                                <InfoRow icon={AcademicCapIcon} label="Education" value={userProfile?.education} />
                                <InfoRow icon={MapPinIcon} label="Lives in" value={userProfile?.current_city} />
                                <InfoRow icon={MapPinIcon} label="From" value={userProfile?.hometown} />
                                <InfoRow icon={PhoneIcon} label="Mobile" value={userProfile?.mobile_phone} />
                                <InfoRow icon={HeartIcon} label="Relationship" value={relationshipValue} />
                            </div>
                        </div>

                        {/* Footer (just for padding) */}
                        <div className="p-2 flex-shrink-0"></div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AboutInfoModal;