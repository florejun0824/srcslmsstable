import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { 
    PlusIcon, 
    RectangleGroupIcon, 
    BuildingLibraryIcon, 
    GlobeAltIcon, 
    CheckCircleIcon,
    ExclamationTriangleIcon 
} from '@heroicons/react/24/solid';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

// --- HELPER: School Name Mapping ---
const getSchoolName = (schoolId) => {
    const schools = {
        'srcs_main': 'SRCS',
        'hras_sipalay': 'HRA',
        'kcc_kabankalan': 'KCC',
        'icad_dancalan': 'ICA',
        'mchs_magballo': 'MCHS',
        'ichs_ilog': 'ICHS'
    };
    return schools[schoolId] || 'School';
};

const getThemeModalStyle = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': return { background: 'linear-gradient(to bottom, rgba(15, 23, 66, 0.95), rgba(15, 23, 66, 0.9))', borderColor: 'rgba(100, 116, 139, 0.2)' };
        case 'valentines': return { background: 'linear-gradient(to bottom, rgba(60, 10, 20, 0.95), rgba(60, 10, 20, 0.9))', borderColor: 'rgba(255, 100, 100, 0.15)' };
        case 'graduation': return { background: 'linear-gradient(to bottom, rgba(30, 25, 10, 0.95), rgba(30, 25, 10, 0.9))', borderColor: 'rgba(255, 215, 0, 0.15)' };
        case 'rainy': return { background: 'linear-gradient(to bottom, rgba(20, 35, 20, 0.95), rgba(20, 35, 20, 0.9))', borderColor: 'rgba(100, 150, 100, 0.2)' };
        case 'cyberpunk': return { background: 'linear-gradient(to bottom, rgba(35, 5, 45, 0.95), rgba(35, 5, 45, 0.9))', borderColor: 'rgba(180, 0, 255, 0.2)' };
        case 'spring': return { background: 'linear-gradient(to bottom, rgba(50, 10, 20, 0.95), rgba(50, 10, 20, 0.9))', borderColor: 'rgba(255, 150, 180, 0.2)' };
        case 'space': return { background: 'linear-gradient(to bottom, rgba(5, 5, 10, 0.95), rgba(5, 5, 10, 0.9))', borderColor: 'rgba(100, 100, 255, 0.15)' };
        default: return {}; 
    }
};

const CreateCategoryModal = ({ isOpen, onClose, teacherId }) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    const { activeOverlay } = useTheme();
    
    // States
    // steps: 'select_type' | 'input_general' | 'existing_warning'
    const [step, setStep] = useState('select_type'); 
    const [categoryName, setCategoryName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const dynamicThemeStyle = getThemeModalStyle(activeOverlay);
    const userSchoolId = userProfile?.schoolId || 'srcs_main';
    const schoolDisplayName = getSchoolName(userSchoolId);

    // Reset state on open/close
    const handleClose = () => {
        setCategoryName('');
        setIsCreating(false);
        setStep('select_type');
        onClose();
    };

    const handleSelectType = async (type) => {
        if (type === 'general') {
            setStep('input_general');
        } else {
            // Check if School Category already exists
            setIsCreating(true);
            try {
                const targetName = `${schoolDisplayName} Courses`;
                const q = query(
                    collection(db, "courses"), 
                    where("category", "==", targetName),
                    where("schoolId", "==", userSchoolId)
                );
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    // ✅ CHANGED: Instead of toast, switch to warning step
                    setCategoryName(targetName);
                    setStep('existing_warning');
                    setIsCreating(false);
                } else {
                    setCategoryName(targetName);
                    createCategory(targetName, userSchoolId);
                }
            } catch (error) {
                console.error("Check failed", error);
                showToast("Error verifying categories.", "error");
                setIsCreating(false);
            }
        }
    };

    const createCategory = async (name, schoolId = null) => {
        if (!name.trim() || !teacherId) return;
        
        setIsCreating(true);
        try {
            await addDoc(collection(db, "courses"), {
                title: `(New Subject in ${name.trim()})`,
                category: name.trim(),
                teacherId: teacherId,
                createdAt: serverTimestamp(),
                units: [],
                // ✅ KEY LOGIC: If schoolId is present, this category is LOCKED to that school
                schoolId: schoolId || 'global',
                isSchoolSpecific: !!schoolId
            });
            showToast(schoolId ? "School-specific category created!" : "Category created successfully!", "success");
            handleClose();
        } catch (error) {
            console.error("Error creating category:", error);
            showToast("Failed to create category.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[6000]" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                     <div className="fixed inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4 text-center">
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
                            style={dynamicThemeStyle}
                            className={`w-full max-w-md transform overflow-hidden rounded-[2.5rem] 
                                       backdrop-blur-3xl p-8 text-left align-middle shadow-2xl 
                                       border border-white/60 dark:border-white/5 ring-1 ring-slate-900/5 transition-all
                                       ${activeOverlay === 'none' ? 'bg-white/90 dark:bg-[#16181D]/90' : ''}`}
                        >
                            {/* --- STEP 1: SELECT TYPE --- */}
                            {step === 'select_type' && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="mx-auto h-16 w-16 rounded-[1.2rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 mb-4">
                                            <RectangleGroupIcon className="h-8 w-8 text-white" />
                                        </div>
                                        <Dialog.Title as="h3" className="text-2xl font-bold text-slate-900 dark:text-white">New Category</Dialog.Title>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Who is this category for?</p>
                                    </div>

                                    <div className="grid gap-4">
                                        <button 
                                            onClick={() => handleSelectType('specific')}
                                            disabled={isCreating}
                                            className="group relative flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                                        >
                                            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                                <BuildingLibraryIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">School Specific</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Only visible to {schoolDisplayName} users.</p>
                                            </div>
                                            {isCreating && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-2xl flex items-center justify-center"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>}
                                        </button>

                                        <button 
                                            onClick={() => handleSelectType('general')}
                                            disabled={isCreating}
                                            className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left"
                                        >
                                            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                                <GlobeAltIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">General Use</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Visible to all schools in the network.</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* --- STEP 2: INPUT GENERAL NAME --- */}
                            {step === 'input_general' && (
                                <form onSubmit={(e) => { e.preventDefault(); createCategory(categoryName); }}>
                                    <div className="text-center mb-6">
                                        <Dialog.Title as="h3" className="text-xl font-bold text-slate-900 dark:text-white">Category Name</Dialog.Title>
                                    </div>
                                    
                                    <div className="mb-6 relative group">
                                        <input
                                            type="text"
                                            value={categoryName}
                                            onChange={(e) => setCategoryName(e.target.value)}
                                            placeholder="e.g., Computer Science"
                                            autoFocus
                                            className="w-full px-5 py-4 rounded-2xl bg-slate-100/80 dark:bg-black/40 border border-transparent focus:border-indigo-500/50 text-slate-900 dark:text-white text-center font-semibold text-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button type="button" onClick={() => setStep('select_type')} className="px-4 py-3.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-colors">Back</button>
                                        <button type="submit" disabled={isCreating || !categoryName.trim()} className="px-4 py-3.5 rounded-full text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg disabled:opacity-50 transition-all active:scale-95">
                                            {isCreating ? 'Creating...' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* --- STEP 3: EXISTING CATEGORY WARNING (New Requirement) --- */}
                            {step === 'existing_warning' && (
                                <div className="space-y-6 text-center">
                                    <div className="mx-auto h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2 ring-4 ring-amber-50 dark:ring-amber-900/10">
                                        <ExclamationTriangleIcon className="h-10 w-10 text-amber-500" />
                                    </div>
                                    
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                            Category Already Exists
                                        </Dialog.Title>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                            The <span className="font-bold text-slate-700 dark:text-slate-200">{categoryName}</span> category is already set up for your school.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-left flex gap-3">
                                        <div className="shrink-0 mt-0.5">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            You can find this category in your dashboard. Simply create your new subjects inside the existing <strong>{categoryName}</strong> card.
                                        </p>
                                    </div>

                                    <button 
                                        onClick={handleClose} 
                                        className="w-full px-4 py-3.5 rounded-full text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 shadow-lg transition-all active:scale-95"
                                    >
                                        Got it, thanks!
                                    </button>
                                </div>
                            )}

                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default CreateCategoryModal;