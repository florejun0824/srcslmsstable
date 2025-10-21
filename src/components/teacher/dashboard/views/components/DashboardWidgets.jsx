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
                {/* MODIFIED: The Neumorphic styles are passed directly to the ClockWidget. */}
                {/* NOTE: You will need to edit ClockWidget.jsx to remove any internal background, border, or shadow styles for this to look correct. */}
                <ClockWidget className="h-full bg-neumorphic-base rounded-3xl shadow-neumorphic cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset" />
            </motion.div>

            <motion.div {...fadeProps(0.2)}>
                {/* MODIFIED: The Neumorphic styles are passed directly to the InspirationCard. */}
                {/* NOTE: You will need to edit InspirationCard.jsx to remove any internal background, border, or shadow styles. */}
                <InspirationCard className="h-full bg-neumorphic-base rounded-3xl shadow-neumorphic cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset" />
            </motion.div>

            <motion.div
                {...fadeProps(0.3)}
                // MODIFIED: Replaced glassmorphism with the Neumorphic style. The hover effect now uses the inset shadow.
                className="bg-neumorphic-base p-6 rounded-3xl shadow-neumorphic flex items-center justify-center flex-col text-center cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset"
                onClick={onOpenScheduleModal}
            >
                <CalendarDays className="h-10 w-10 text-sky-500 mb-2" />
                <h3 className="font-bold text-slate-800 text-lg">Schedule of Activities</h3>
                <p className="text-sm text-slate-600 mt-1">Click to view what's coming up.</p>
            </motion.div>

            <motion.div
                {...fadeProps(0.4)}
                className="cursor-pointer"
                onClick={onViewClasses}
            >
                {/* MODIFIED: Passed Neumorphic styles to the GradientStatCard. */}
                {/* NOTE: For the best effect, you should edit GradientStatCard.jsx to remove its gradient background. */}
                {/* The "gradient" can be applied to the text or icon instead, while the card itself uses 'bg-neumorphic-base'. */}
                <GradientStatCard
                    title="Active Classes"
                    value={activeClassesCount}
                    icon={<GraduationCap />}
                    gradient="from-sky-400 to-cyan-400"
                    className="h-full bg-neumorphic-base rounded-3xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset"
                />
            </motion.div>
        </div>
    );
};

export default DashboardWidgets;