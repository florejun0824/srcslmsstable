import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, CalendarDays } from 'lucide-react';

// Adjust import paths for these widgets as needed
import ClockWidget from '../../widgets/ClockWidget';
import InspirationCard from '../../widgets/InspirationCard';
import GradientStatCard from '../../widgets/GradientStatCard';

const DashboardWidgets = ({ 
    activeClassesCount, 
    onViewClasses, 
    onOpenScheduleModal 
}) => {
    // Animation properties for staggered fade-in
    const fadeProps = (delay) => ({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.4, delay: delay }
    });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            <motion.div {...fadeProps(0.1)}>
                {/* --- MODIFIED: Added dark mode classes --- */}
                <ClockWidget className="h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" />
            </motion.div>

            <motion.div {...fadeProps(0.2)}>
                {/* --- MODIFIED: Added dark mode classes --- */}
                <InspirationCard className="h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" />
            </motion.div>

            <motion.div
                {...fadeProps(0.3)}
                // --- MODIFIED: Added dark mode classes ---
                className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-center flex-col text-center cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                onClick={onOpenScheduleModal}
            >
                {/* --- MODIFIED: Added dark mode classes --- */}
                <CalendarDays className="h-10 w-10 text-sky-500 dark:text-sky-400 mb-2" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Schedule of Activities</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Click to view what's coming up.</p>
            </motion.div>

            <motion.div
                {...fadeProps(0.4)}
                className="cursor-pointer"
                onClick={onViewClasses}
            >
                {/* --- MODIFIED: Added dark mode classes --- */}
		<GradientStatCard
		        title="Active Classes"
		        value={activeClassesCount}
		        icon={<GraduationCap />}
		        gradient="from-sky-400 to-cyan-400"
		        className="z-0 h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
		/>
            </motion.div>
        </div>
    );
};

export default DashboardWidgets;