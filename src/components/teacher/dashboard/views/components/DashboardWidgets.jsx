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
                <ClockWidget className="h-full rounded-3xl shadow-xl shadow-slate-300/25 transition-transform transform hover:-translate-y-2 hover:scale-[1.02] duration-300 ease-in-out hover:shadow-2xl hover:shadow-slate-300/40 border border-white/50" />
            </motion.div>
            <motion.div {...fadeProps(0.2)}>
                <InspirationCard className="h-full rounded-3xl shadow-xl shadow-slate-300/25 transition-transform transform hover:-translate-y-2 hover:scale-[1.02] duration-300 ease-in-out hover:shadow-2xl hover:shadow-slate-300/40 border border-white/50" />
            </motion.div>
            <motion.div
                {...fadeProps(0.3)}
                className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-slate-300/25 flex items-center justify-center flex-col text-center cursor-pointer transition-transform transform hover:-translate-y-2 hover:scale-[1.02] duration-300 ease-in-out border border-white/50 hover:shadow-2xl hover:shadow-slate-300/40"
                onClick={onOpenScheduleModal} // This one already works
            >
                <CalendarDays className="h-10 w-10 text-sky-500 mb-2" />
                <h3 className="font-bold text-slate-800 text-lg">Schedule of Activities</h3>
                <p className="text-sm text-slate-600 mt-1">Click to view what's coming up.</p>
            </motion.div>
            <motion.div
                {...fadeProps(0.4)}
                className="cursor-pointer transition-transform transform hover:-translate-y-2 hover:scale-[1.02] duration-300 ease-in-out hover:shadow-2xl hover:shadow-slate-300/40"
                onClick={onViewClasses}
            >
                <GradientStatCard
                    title="Active Classes"
                    value={activeClassesCount}
                    icon={<GraduationCap />}
                    gradient="from-sky-400 to-cyan-400"
                    className="h-full rounded-3xl shadow-xl shadow-slate-300/25"
                />
            </motion.div>
        </div>
    );
};

export default DashboardWidgets;