import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    IconX, 
    IconBriefcase, 
    IconSchool, 
    IconMapPin, 
    IconPhone, 
    IconHeart 
} from '@tabler/icons-react';
import { useTheme } from '../../contexts/ThemeContext'; //

// --- MACOS 26 DESIGN SYSTEM CONSTANTS ---

const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

const windowContainerClasses = "relative w-full max-w-lg flex flex-col bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] rounded-[2rem] shadow-2xl shadow-black/20 dark:shadow-black/50 ring-1 ring-white/40 dark:ring-white/5 overflow-hidden transition-colors duration-500";
const cardSurface = "bg-white/40 dark:bg-[#1F2229]/40 backdrop-blur-xl rounded-[1.5rem] border border-white/20 dark:border-white/5 shadow-sm";

const iconButton = `
    relative font-semibold rounded-full transition-all duration-300 
    flex items-center justify-center p-2 text-slate-500 dark:text-slate-400 
    bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/15 
    hover:text-slate-700 dark:hover:text-slate-200
    backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md
    active:scale-95
`;

const secondaryButton = `
    relative font-semibold rounded-full transition-all duration-300 
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 
    px-5 py-2.5 text-sm text-slate-700 dark:text-slate-200 
    bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 
    backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md
`;

// --- [ADDED] Helper: Monet/Theme Background Extraction ---
const getThemeModalStyle = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': 
            return { background: 'linear-gradient(to bottom, rgba(15, 23, 66, 0.95), rgba(15, 23, 66, 0.9))', borderColor: 'rgba(100, 116, 139, 0.2)' };
        case 'valentines': 
            return { background: 'linear-gradient(to bottom, rgba(60, 10, 20, 0.95), rgba(60, 10, 20, 0.9))', borderColor: 'rgba(255, 100, 100, 0.15)' };
        case 'graduation': 
            return { background: 'linear-gradient(to bottom, rgba(30, 25, 10, 0.95), rgba(30, 25, 10, 0.9))', borderColor: 'rgba(255, 215, 0, 0.15)' };
        case 'rainy': 
            return { background: 'linear-gradient(to bottom, rgba(20, 35, 20, 0.95), rgba(20, 35, 20, 0.9))', borderColor: 'rgba(100, 150, 100, 0.2)' };
        case 'cyberpunk': 
            return { background: 'linear-gradient(to bottom, rgba(35, 5, 45, 0.95), rgba(35, 5, 45, 0.9))', borderColor: 'rgba(180, 0, 255, 0.2)' };
        case 'spring': 
            return { background: 'linear-gradient(to bottom, rgba(50, 10, 20, 0.95), rgba(50, 10, 20, 0.9))', borderColor: 'rgba(255, 150, 180, 0.2)' };
        case 'space': 
            return { background: 'linear-gradient(to bottom, rgba(5, 5, 10, 0.95), rgba(5, 5, 10, 0.9))', borderColor: 'rgba(100, 100, 255, 0.15)' };
        default: 
            return {}; 
    }
};

// --- COMPONENT ---

const InfoRow = ({ icon: Icon, label, value }) => {
    const hasValue = value && value.trim() !== '';
    
    return (
        <div className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors shadow-inner">
                <Icon size={18} stroke={2} />
            </div>
            <div className="flex-grow">
                <p className={`text-sm font-semibold ${!hasValue ? 'text-slate-400 dark:text-slate-600 italic' : 'text-slate-700 dark:text-slate-200'}`}>
                    {hasValue ? value : `No ${label.toLowerCase()} added`}
                </p>
                <p className={subHeadingStyle}>{label}</p>
            </div>
        </div>
    );
};

const AboutInfoModal = ({ isOpen, onClose, userProfile }) => {
    
    // [Added] Theme Context
    const { activeOverlay } = useTheme(); //
    const dynamicThemeStyle = getThemeModalStyle(activeOverlay);

    // Format the relationship status to include the partner
    let relationshipValue = userProfile?.relationship_status;
    if (userProfile?.relationship_status && (userProfile.relationship_status === 'In a Relationship' || userProfile.relationship_status === 'Married') && userProfile.relationship_partner) {
        relationshipValue += ` with ${userProfile.relationship_partner}`;
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    aria-labelledby="about-info-title"
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Window */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={windowContainerClasses}
                        style={dynamicThemeStyle} // [Applied Theme]
                    >
                        {/* Header */}
                        <div className="pt-6 pb-4 px-6 border-b border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md flex items-center justify-between">
                            <div>
                                <h2 id="about-info-title" className={headingStyle + " text-xl"}>
                                    About Info
                                </h2>
                                <p className={subHeadingStyle}>Personal Details</p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className={iconButton}
                                aria-label="Close"
                            >
                                <IconX size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className={cardSurface + " p-2 space-y-1"}>
                                <InfoRow icon={IconBriefcase} label="Work" value={userProfile?.work} />
                                <InfoRow icon={IconSchool} label="Education" value={userProfile?.education} />
                                <InfoRow icon={IconMapPin} label="Lives in" value={userProfile?.current_city} />
                                <InfoRow icon={IconMapPin} label="From" value={userProfile?.hometown} />
                                <InfoRow icon={IconPhone} label="Mobile" value={userProfile?.mobile_phone} />
                                <InfoRow icon={IconHeart} label="Relationship" value={relationshipValue} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md flex justify-end">
                            <button onClick={onClose} className={secondaryButton}>
                                Close
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AboutInfoModal;