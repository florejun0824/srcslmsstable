// src/components/teacher/dashboard/views/courses/SkeletonGrid.jsx
import React, { memo } from 'react';

const SkeletonGrid = memo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-56 rounded-[32px] bg-zinc-200/40 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10"></div>
        ))}
    </div>
));

export default SkeletonGrid;
