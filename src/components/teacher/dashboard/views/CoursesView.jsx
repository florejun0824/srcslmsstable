// src/components/teacher/dashboard/views/CoursesView.jsx
import React, { useEffect, memo } from 'react';
import { Routes, Route } from 'react-router-dom';

// Import newly refactored components
import ContentGroupSelector from './courses/ContentGroupSelector';
import CategoryList from './courses/CategoryList';
import SubjectList from './courses/SubjectList';
import SubjectDetail from './courses/SubjectDetail';
import { GLOBAL_CSS } from './courses/coursesStyles';

const CoursesView = memo((props) => {
    useEffect(() => {
        const styleId = 'courses-view-material-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = GLOBAL_CSS;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <Routes>
            <Route path="courses">
                <Route index element={<ContentGroupSelector {...props} />} />
                <Route path=":contentGroup" element={<CategoryList {...props} />} />
                <Route path=":contentGroup/:categoryName" element={<SubjectList {...props} />} />
                <Route path=":contentGroup/:categoryName/:subjectId" element={<SubjectDetail {...props} />} />
                <Route path=":contentGroup/:categoryName/:subjectId/:unitId" element={<SubjectDetail {...props} />} />
            </Route>
        </Routes>
    );
});

export default CoursesView;