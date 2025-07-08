import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    HomeIcon, AcademicCapIcon, BookOpenIcon, UserIcon, ShieldCheckIcon, Bars3Icon,
    ArrowLeftOnRectangleIcon, MagnifyingGlassIcon, PlusCircleIcon,
    ExclamationTriangleIcon, UserGroupIcon, BeakerIcon, GlobeAltIcon, CalculatorIcon,
    PaintBrushIcon, ComputerDesktopIcon, CodeBracketIcon, MusicalNoteIcon,
    ClipboardDocumentListIcon, PencilSquareIcon, KeyIcon, EnvelopeIcon, IdentificationIcon,
    ArchiveBoxIcon, TrashIcon, ClipboardIcon,
    UserPlusIcon, ArrowUturnLeftIcon, MegaphoneIcon, UsersIcon, CalendarDaysIcon,
    LightBulbIcon, XMarkIcon, PaperAirplaneIcon
} from '@heroicons/react/24/outline';

// --- Component Imports ---
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import SidebarButton from '../components/common/SidebarButton';
import AdminDashboard from './AdminDashboard';
import UnitAccordion from '../components/teacher/UnitAccordion';
import ArchivedClassesModal from '../components/teacher/ArchivedClassesModal';
import EditProfileModal from '../components/teacher/EditProfileModal';
import ChangePasswordModal from '../components/teacher/ChangePasswordModal';
import CreateCategoryModal from '../components/teacher/CreateCategoryModal';
import EditCategoryModal from '../components/teacher/EditCategoryModal';
import CreateClassModal from '../components/teacher/CreateClassModal';
import CreateCourseModal from '../components/teacher/CreateCourseModal';
import ClassOverviewModal from '../components/teacher/ClassOverviewModal';
import EditClassModal from '../components/common/EditClassModal';
import AddUnitModal from '../components/teacher/AddUnitModal';
import EditUnitModal from '../components/teacher/EditUnitModal';
import AddLessonModal from '../components/teacher/AddLessonModal';
import AddQuizModal from '../components/teacher/AddQuizModal';
import DeleteUnitModal from '../components/teacher/DeleteUnitModal';
import EditLessonModal from '../components/teacher/EditLessonModal';
import ViewLessonModal from '../components/teacher/ViewLessonModal';
import ShareMultipleLessonsModal from '../components/teacher/ShareMultipleLessonsModal';
import DeleteConfirmationModal from '../components/teacher/DeleteConfirmationModal';
import EditSubjectModal from '../components/teacher/EditSubjectModal';
import DeleteSubjectModal from '../components/teacher/DeleteSubjectModal';


// --- Reusable Components for the Home Tab ---

const AnimatedRobot = ({ onClick }) => {
    const [animationState, setAnimationState] = useState('idle');
    const robotRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    // Position now stores top/left instead of x/y for direct CSS application
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // Offset from mouse click to element top-left
    const dragStartedAt = useRef({ x: 0, y: 0 }); // To differentiate click from drag

    useEffect(() => {
        let timeoutId;
        const scheduleNextAnimation = () => {
            const delay = Math.random() * 4000 + 2000;
            timeoutId = setTimeout(() => {
                const animations = ['blink', 'look-left', 'look-right', 'tilt-left', 'tilt-right', 'idle'];
                const nextAnimation = animations[Math.floor(Math.random() * animations.length)];
                setAnimationState(nextAnimation);
                if (nextAnimation !== 'idle' && nextAnimation !== 'blink') {
                    setTimeout(() => setAnimationState(''), 1500);
                }
                scheduleNextAnimation();
            }, delay);
        };
        scheduleNextAnimation();
        return () => clearTimeout(timeoutId);
    }, []);

    // Adjust initial position dynamically based on screen size
    useEffect(() => {
        const handleResize = () => {
            const currentRobotWidth = window.innerWidth < 768 ? 50 : 70;
            const currentRobotHeight = window.innerWidth < 768 ? 65 : 90;
            const mobileNavHeight = 60; // Approximate height of your bottom navigation

            let initialLeft = window.innerWidth - currentRobotWidth - 20; // 20px right padding
            let initialTop = window.innerHeight - currentRobotHeight - 20; // 20px bottom padding

            if (window.innerWidth < 768) { // Mobile view, adjust for bottom nav
                initialTop = window.innerHeight - currentRobotHeight - mobileNavHeight - 20; // 20px above nav
            }
            // Ensure robot stays within bounds on resize if it was dragged
            initialLeft = Math.max(0, Math.min(initialLeft, window.innerWidth - currentRobotWidth));
            initialTop = Math.max(0, Math.min(initialTop, window.innerHeight - currentRobotHeight - (window.innerWidth < 768 ? mobileNavHeight : 0)));

            setPosition({ left: initialLeft, top: initialTop });
        };

        handleResize(); // Set initial position on mount
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const handleMouseDown = useCallback((e) => {
        if (robotRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.clientX, y: e.clientY }; // Record start position
            const bbox = robotRef.current.getBoundingClientRect();
            setOffset({
                x: e.clientX - bbox.left,
                y: e.clientY - bbox.top,
            });
            e.preventDefault(); // Prevent default browser drag behavior
            e.stopPropagation(); // Stop event propagation to prevent text selection etc.
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const newLeft = e.clientX - offset.x;
        const newTop = e.clientY - offset.y;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const robotWidth = robotRef.current ? robotRef.current.offsetWidth : (window.innerWidth < 768 ? 50 : 70);
        const robotHeight = robotRef.current ? robotRef.current.offsetHeight : (window.innerWidth < 768 ? 65 : 90);

        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - robotWidth;
        const mobileNavHeight = (viewportWidth < 768) ? 60 : 0; // Approx nav height on mobile
        const maxTop = viewportHeight - robotHeight - mobileNavHeight;

        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));

        setPosition({ left: boundedLeft, top: boundedTop });
    }, [isDragging, offset]);

    const handleMouseUp = useCallback((e) => {
        setIsDragging(false);
        // Check if the mouse moved significantly to distinguish drag from click
        const movedX = Math.abs(e.clientX - dragStartedAt.current.x);
        const movedY = Math.abs(e.clientY - dragStartedAt.current.y);

        // If moved less than a small threshold (e.g., 5px), it's considered a click
        if (movedX < 5 && movedY < 5) {
            onClick();
        }
        e.stopPropagation(); // Prevent further propagation after drag/click action
    }, [onClick]);

    // Touch event handlers for mobile
    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1 && robotRef.current) {
            setIsDragging(true);
            dragStartedAt.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; // Record start position
            const touch = e.touches[0];
            const bbox = robotRef.current.getBoundingClientRect();
            setOffset({
                x: touch.clientX - bbox.left,
                y: touch.clientY - bbox.top,
            });
            e.preventDefault(); // Prevent scrolling while dragging
            e.stopPropagation(); // Stop event propagation
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const newLeft = touch.clientX - offset.x;
        const newTop = touch.clientY - offset.y;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const robotWidth = robotRef.current ? robotRef.current.offsetWidth : 50; // Use mobile default
        const robotHeight = robotRef.current ? robotRef.current.offsetHeight : 65; // Use mobile default

        const minLeft = 0;
        const minTop = 0;
        const maxLeft = viewportWidth - robotWidth;
        const mobileNavHeight = 60; // Approximate height of your bottom navigation
        const maxTop = viewportHeight - robotHeight - mobileNavHeight;

        const boundedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const boundedTop = Math.max(minTop, Math.min(newTop, maxTop));

        setPosition({ left: boundedLeft, top: boundedTop });
        e.preventDefault(); // Prevent scrolling while dragging
    }, [isDragging, offset]);

    const handleTouchEnd = useCallback((e) => {
        setIsDragging(false);
        // Check if the touch moved significantly to distinguish drag from tap
        const movedX = Math.abs(e.changedTouches[0].clientX - dragStartedAt.current.x);
        const movedY = Math.abs(e.changedTouches[0].clientY - dragStartedAt.current.y);

        // If moved less than a small threshold (e.g., 5px), it's considered a click
        if (movedX < 5 && movedY < 5) {
            onClick();
        }
        e.stopPropagation(); // Prevent further propagation
    }, [onClick]);


    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        } else {
            // Ensure listeners are removed even if `isDragging` changes due to external factors
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        }
        // Cleanup function
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);


    return (
        <>
            <style jsx>{`
                .robot-container-fixed {
                    position: fixed;
                    /* top and left set directly by JS in the style attribute */
                    width: 70px; /* Desktop default */
                    height: 90px; /* Desktop default */
                    animation: robot-float 5s ease-in-out infinite;
                    z-index: 1000; /* Higher z-index to ensure it's always on top */
                    cursor: grab; /* Indicate it's draggable */
                    background-color: rgba(255, 255, 255, 0.7);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: box-shadow 0.3s ease-in-out; /* Only smooth shadow transition */
                    will-change: top, left; /* Hint to browser for performance on position changes */
                }
                .robot-container-fixed.dragging {
                    cursor: grabbing;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                }
                .robot { position: relative; width: 100%; height: 100%; }
                .head { width: 60px; height: 50px; background-image: linear-gradient(to bottom, #d1d5db, #9ca3af); border-radius: 50% 50% 10px 10px; position: absolute; left: 5px; top: 10px; border: 2px solid #6b7280; z-index: 10; transition: transform 0.4s ease-in-out; }
                .body { width: 70px; height: 55px; background-image: linear-gradient(to bottom, #e5e7eb, #b3b9c4); position: absolute; bottom: 10px; border-radius: 10px 10px 50% 50%; border: 2px solid #9ca3af; }
                .neck { width: 20px; height: 8px; background: #9ca3af; position: absolute; top: 58px; left: 25px; z-index: 5; }
                .panel { width: 15px; height: 5px; background: #4fe0f0; border-radius: 2px; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); box-shadow: 0 0 5px #4fe0f0; animation: panel-pulse 3s infinite ease-in-out; }
                .antenna { width: 3px; height: 20px; background: #9ca3af; position: absolute; left: 50%; transform: translateX(-50%); top: -5px; }
                .antenna::after { content: ''; width: 10px; height: 10px; background: #22d3ee; border-radius: 50%; position: absolute; top: -5px; left: -3.5px; animation: antenna-glow 2.5s infinite; }
                .eye-socket { position: absolute; top: 22px; width: 14px; height: 14px; background: #374151; border-radius: 50%; display: flex; justify-content: center; align-items: center; }
                .eye-socket.left { left: 12px; }
                .eye-socket.right { right: 12px; }
                .pupil { width: 5px; height: 5px; background: #22d3ee; border-radius: 50%; box-shadow: 0 0 3px #67e8f9; transition: transform 0.3s ease-out; }
                .pupil-glint { width: 2px; height: 2px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; }
                .tilt-left .head { transform: rotate(-8deg); }
                .tilt-right .head { transform: rotate(8deg); }
                .blink .pupil { animation: blink-animation 0.4s; }
                .look-left .pupil { transform: translateX(-2px); }
                .look-right .pupil { transform: translateX(2px); }
                @keyframes robot-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
                @keyframes antenna-glow { 0% { box-shadow: 0 0 8px #67e8f9; } 50% { box-shadow: 0 0 18px #a5f3fd, 0 0 8px #67e8f9; } 100% { box-shadow: 0 0 8px #67e8f9; } }
                @keyframes panel-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
                @keyframes blink-animation { 0% { transform: scaleY(1); } 5% { transform: scaleY(0.1); } 10% { transform: scaleY(1); } 100% { transform: scaleY(1); } }

                /* Mobile-specific styles for the robot icon */
                @media (max-width: 767px) { /* Tailwind's 'md' breakpoint is 768px, so max-width 767px targets mobile */
                    .robot-container-fixed {
                        width: 50px; /* Smaller width for mobile */
                        height: 65px; /* Smaller height for mobile */
                    }
                    /* Adjust internal robot parts for smaller size (relative to their new container size) */
                    .robot .head {
                        width: 40px;
                        height: 35px;
                        left: 5px;
                        top: 8px;
                    }
                    .robot .body {
                        width: 50px;
                        height: 40px;
                        bottom: 8px;
                    }
                    .robot .neck {
                        width: 15px;
                        height: 6px;
                        top: 42px;
                        left: 17.5px;
                    }
                    .robot .eye-socket {
                        width: 10px;
                        height: 10px;
                        top: 15px;
                    }
                    .robot .eye-socket.left { left: 8px; }
                    .robot .eye-socket.right { right: 8px; }
                    .robot .pupil {
                        width: 4px;
                        height: 4px;
                    }
                    .robot .pupil-glint {
                        width: 1px;
                        height: 1px;
                    }
                    .robot .panel {
                        width: 10px;
                        height: 4px;
                    }
                    .robot .antenna {
                        height: 15px;
                    }
                    .robot .antenna::after {
                        width: 8px;
                        height: 8px;
                        top: -4px;
                        left: -2.5px;
                    }
                }
            `}</style>
            <div
                ref={robotRef}
                className={`robot-container-fixed ${isDragging ? 'dragging' : ''}`}
                style={{ top: `${position.top}px`, left: `${position.left}px` }} // Use top/left directly
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                // No onClick directly here; handled by mouseUp/touchEnd to differentiate from drag
            >
                <div className={`robot ${animationState}`}>
                    <div className="antenna"></div>
                    <div className="head">
                        <div className="eye-socket left"><div className="pupil"><div className="pupil-glint"></div></div></div>
                        <div className="eye-socket right"><div className="pupil"><div className="pupil-glint"></div></div></div>
                    </div>
                    <div className="neck"></div>
                    <div className="body"><div className="panel"></div></div>
                </div>
            </div>
        </>
    )
};

const CreateAnnouncement = ({ classes, onPost }) => {
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('teachers');
    const [selectedClass, setSelectedClass] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); const selectedClassData = classes.find(c => c.id === selectedClass); onPost({ content, audience, classId: selectedClass, className: selectedClassData ? selectedClassData.name : null }); setContent(''); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="flex border-b border-gray-200">
                    <button type="button" onClick={() => setAudience('teachers')} className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 ${audience === 'teachers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}><MegaphoneIcon className="w-5 h-5" /> For Teachers</button>
                    <button type="button" onClick={() => setAudience('students')} className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 ${audience === 'students' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}><UsersIcon className="w-5 h-5" /> For Students</button>
                </div>
            </div>
            {audience === 'students' && (
                <div>
                    <label htmlFor="classSelect" className="block text-sm font-medium text-gray-700 mb-1">Select a Class</label>
                    <select id="classSelect" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" required>
                        <option value="" disabled>-- Choose a class --</option>
                        {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>))}
                    </select>
                </div>
            )}
            <div>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" rows="6" placeholder="What's on your mind?" required />
            </div>
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Post Announcement</button>
            </div>
        </form>
    );
};

const GradientStatCard = ({ icon, title, value, gradient, vectorIcon }) => (
    <div className={`relative text-white p-6 rounded-xl shadow-lg overflow-hidden bg-gradient-to-br ${gradient} h-full`}>
        {React.cloneElement(vectorIcon, { className: "absolute -right-4 -top-4 w-28 h-28 text-white opacity-10 -rotate-12 pointer-events-none" })}
        <div className="relative z-10 flex flex-col justify-center h-full"><div className="mb-4 p-2 bg-white/20 rounded-lg inline-block self-start">{React.cloneElement(icon, { className: "w-7 h-7" })}</div><p className="text-4xl font-bold">{value}</p><p className="text-white/80">{title}</p></div>
    </div>
);

const InspirationCard = () => {
    const [quote, setQuote] = useState({ text: 'Loading...', author: '', color: 'gray' });
    useEffect(() => {
        const quotes = [ { text: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren", color: "blue" }, { text: "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.", author: "Brad Henry", color: "green" }, { text: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein", color: "purple" }, { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", color: "red" }, { text: "The best teachers are those who show you where to look but don't tell you what to see.", author: "A. K. Trenfor", color: "indigo" }, { text: "Teaching is the greatest act of optimism.", author: "Colleen Wilcox", color: "pink" }, { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier", color: "yellow" }, { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", color: "teal" }, { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats", color: "orange" }, { text: "One child, one teacher, one book, one pen can change the world.", author: "Malala Yousafzai", color: "sky" }, { text: "The task of the modern educator is not to cut down jungles, but to irrigate deserts.", author: "C.S. Lewis", color: "lime" }, { text: "Good teaching is more a giving of right questions than a giving of right answers.", author: "Josef Albers", color: "cyan" }, { text: "I am not a teacher, but an awakener.", author: "Robert Frost", color: "fuchsia" }, { text: "The mediocre teacher tells. The good teacher explains. The superior teacher demonstrates. The great teacher inspires.", author: "W. A. Ward", color: "rose" }, { text: "A teacher affects eternity; he can never tell where his influence stops.", author: "Henry Adams", color: "blue" }, { text: "To teach is to learn twice over.", author: "Joseph Joubert", color: "green" }, { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch", color: "purple" }, { text: "I cannot teach anybody anything, I can only make them think.", author: "Socrates", color: "red" }, { text: "The whole purpose of education is to turn mirrors into windows.", author: "Sydney J. Harris", color: "indigo" }, { text: "Children must be taught how to think, not what to think.", author: "Margaret Mead", color: "pink" }, { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle", color: "yellow" }, { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", color: "teal" }, { text: "The function of education is to teach one to think intensively and to think critically.", author: "Martin Luther King, Jr.", color: "orange" }, { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", color: "sky" }, { text: "The only person who is educated is the one who has learned how to learn and change.", author: "Carl Rogers", color: "lime" }, { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", color: "cyan" }, { text: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein", color: "fuchsia" }, { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", color: "rose" }, { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X", color: "gray" }, { text: "The goal of education is the advancement of knowledge and the dissemination of truth.", author: "John F. Kennedy", color: "indigo" },];
        const now = new Date();
        const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
        const mulberry32 = a => () => { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
        const random = mulberry32(seed);
        const dailyQuote = quotes[Math.floor(random() * quotes.length)];
        setQuote(dailyQuote);
    }, []);
    const colorStyles = { blue: { border: 'border-blue-500', text: 'text-blue-500', bg: 'bg-blue-100' }, green: { border: 'border-green-500', text: 'text-green-500', bg: 'bg-green-100' }, purple: { border: 'border-purple-500', text: 'text-purple-500', bg: 'bg-purple-100' }, red: { border: 'border-red-500', text: 'text-red-500', bg: 'bg-red-100' }, indigo: { border: 'border-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-100' }, pink: { border: 'border-pink-500', text: 'text-pink-500', bg: 'bg-pink-100' }, yellow: { border: 'border-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-100' }, teal: { border: 'border-teal-500', text: 'text-teal-500', bg: 'bg-teal-100' }, orange: { border: 'border-orange-500', text: 'text-orange-500', bg: 'bg-orange-100' }, sky: { border: 'border-sky-500', text: 'text-sky-500', bg: 'bg-sky-100' }, lime: { border: 'border-lime-500', text: 'text-lime-500', bg: 'bg-lime-100' }, cyan: { border: 'border-cyan-500', text: 'text-cyan-500', bg: 'bg-cyan-100' }, fuchsia: { border: 'border-fuchsia-500', text: 'text-fuchsia-500', bg: 'bg-fuchsia-100' }, rose: { border: 'border-rose-500', text: 'text-rose-500', bg: 'bg-rose-100' }, gray: { border: 'border-gray-500', text: 'text-gray-500', bg: 'bg-gray-100' },};
    const currentColors = colorStyles[quote.color] || colorStyles.gray;
    return (<div className={`bg-white p-6 rounded-xl shadow-lg h-full flex flex-col justify-center border-l-4 ${currentColors.border}`}><div className="flex items-start gap-4"><div className={`p-3 rounded-full ${currentColors.bg}`}><LightBulbIcon className="w-7 h-7" /></div><div><p className="font-bold text-gray-800">Inspiration for the Day</p><blockquote className="mt-1"><p className="text-gray-600 text-sm">"{quote.text}"</p><cite className="block text-right not-italic text-xs text-gray-500 mt-2">- {quote.author}</cite></blockquote></div></div></div>)
}

const ClockWidget = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const timerId = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(timerId); }, []);
    return (<div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col justify-center items-center text-center h-full"><div className="flex items-center gap-2 text-lg text-gray-300"><CalendarDaysIcon className="w-5 h-5" /><span>{time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></div><div className="text-5xl lg:text-6xl font-bold my-2 tracking-wider">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>)
};

const ChatDialog = ({ isOpen, onClose, messages, onSendMessage, isAiThinking, userFirstName }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    useEffect(scrollToBottom, [messages]);

    // Track if conversation has started beyond the initial greeting
    const [conversationStarted, setConversationStarted] = useState(false);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
            setConversationStarted(true); // Once user sends a message, conversation has started
        }
    };
    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
    if (!isOpen) return null;

    // Initial AI greeting message
    // Only show the full greeting (with name) if it's the very first message in the session.
    // If messages already exist, it means the conversation has started, so no specific greeting is added here.
    const initialGreeting = messages.length === 0 && !conversationStarted ? [{
        sender: 'ai',
        text: `Hello${userFirstName ? ` ${userFirstName}` : ''}! How can I assist you today?`
    }] : [];


    // Combine initial greeting with actual messages, but only if it's the very first interaction
    const displayMessages = initialGreeting.concat(messages);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Chat with your AI Assistant</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><XMarkIcon className="w-6 h-6 text-gray-600" /></button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {displayMessages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 self-start"></div>}
                            <div className={`max-w-xl p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                {msg.sender === 'ai' ? (
                                    <ReactMarkdown className="prose prose-sm prose-p:my-0 prose-ul:my-0 prose-li:my-0">
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isAiThinking && (<div className="flex items-end gap-2"><div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0"></div><div className="max-w-md p-3 rounded-2xl bg-gray-200 text-gray-500 text-sm">AI is typing...</div></div>)}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t">
                    <div className="relative">
                        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask a question..." className="w-full p-3 pr-16 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500" rows="1"/>
                        <button onClick={handleSend} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300" disabled={!input.trim() || isAiThinking}><PaperAirplaneIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const TeacherDashboardUI = (props) => {
    const {
        user, userProfile, loading, error, activeView, handleViewChange, isSidebarOpen, setIsSidebarOpen, logout, showToast,
        activeClasses, archivedClasses, courses, courseCategories, teacherAnnouncements,
        selectedCategory, handleCategoryClick, handleBackToCategoryList, activeSubject, setActiveSubject,
        handleOpenEditClassModal, handleArchiveClass, handleDeleteClass, isHoveringActions, setIsHoveringActions,
        setClassOverviewModal, setIsArchivedModalOpen, setCreateClassModalOpen,
        setCreateCategoryModalOpen, setCreateCourseModalOpen, handleEditCategory,
        handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen, setAddUnitModalOpen,
        handleInitiateDelete, handleGenerateQuizForLesson, isAiGenerating,
        setEditProfileModalOpen, setChangePasswordModalOpen, editingAnnId, editingAnnText,
        setEditingAnnText, handleStartEditAnn, handleUpdateTeacherAnn, setEditingAnnId, handleDeleteTeacherAnn,
        importClassSearchTerm, setImportClassSearchTerm, allLmsClasses, filteredLmsClasses, isImportViewLoading,
        selectedClassForImport, setSelectedClassForImport, handleBackToClassSelection, importTargetClassId,
        setImportTargetClassId, handleImportStudents, isImporting, studentsToImport,
        handleToggleStudentForImport, handleSelectAllStudents, isArchivedModalOpen, handleUnarchiveClass,
        isEditProfileModalOpen, handleUpdateProfile, isChangePasswordModalOpen, handleChangePassword,
        isCreateCategoryModalOpen, isEditCategoryModalOpen, setEditCategoryModalOpen, categoryToEdit,
        isCreateClassModalOpen, isCreateCourseModalOpen, classOverviewModal, isEditClassModalOpen, setEditClassModalOpen, classToEdit,
        isAddUnitModalOpen, editUnitModalOpen, setEditUnitModalOpen, selectedUnit, addLessonModalOpen,
        setAddLessonModalOpen, addQuizModalOpen, setAddQuizModalOpen, deleteUnitModalOpen, setDeleteUnitModalOpen,
        editLessonModalOpen, setEditLessonModalOpen, selectedLesson, viewLessonModalOpen, setViewLessonModalOpen,
        isShareContentModalOpen, isDeleteModalOpen, setIsDeleteModalOpen, handleConfirmDelete, deleteTarget,
        isEditSubjectModalOpen, setEditSubjectModalOpen, subjectToActOn, isDeleteSubjectModalOpen, setDeleteSubjectModalOpen,
        handleCreateAnnouncement, isChatOpen, setIsChatOpen, messages, isAiThinking, handleAskAi, handleRemoveStudentFromClass
    } = props;
    
    // State to track if the AI conversation has moved beyond the initial greeting
    const [aiConversationStarted, setAiConversationStarted] = useState(false);

    // Modified handleAskAi to conditionally add the user's name
    const handleAskAiWrapper = (message) => {
        handleAskAi(message);
        if (!aiConversationStarted) {
            setAiConversationStarted(true); // Mark conversation as started after the first user message
        }
    };

    const renderMainContent = () => {
        if (loading) return <Spinner />;
        if (error) { return <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded-md shadow-md"><div className="flex items-start gap-3"><ExclamationTriangleIcon className="w-5 h-5 mt-1" /><div><strong className="block">An error occurred</strong><span>{error}</span></div></div></div>; }

        const wrapper = "bg-white/70 backdrop-blur-md border border-white/30 p-4 sm:p-6 rounded-xl shadow";
        const classVisuals = [{ icon: AcademicCapIcon, color: 'from-orange-500 to-red-500' }, { icon: UserGroupIcon, color: 'from-blue-500 to-sky-500' }, { icon: ClipboardDocumentListIcon, color: 'from-yellow-500 to-amber-500' }, { icon: ShieldCheckIcon, color: 'from-green-500 to-lime-500' },];
        const subjectVisuals = [{ icon: BookOpenIcon, color: 'from-sky-500 to-indigo-500' }, { icon: CalculatorIcon, color: 'from-green-500 to-emerald-500' }, { icon: BeakerIcon, color: 'from-violet-500 to-purple-500' }, { icon: GlobeAltIcon, color: 'from-rose-500 to-pink-500' }, { icon: ComputerDesktopIcon, color: 'from-slate-600 to-slate-800' }, { icon: PaintBrushIcon, color: 'from-amber-500 to-orange-500' }, { icon: UserGroupIcon, color: 'from-teal-500 to-cyan-500' }, { icon: CodeBracketIcon, color: 'from-gray-700 to-gray-900' }, { icon: MusicalNoteIcon, color: 'from-fuchsia-500 to-purple-600' },];
        const gradientButtonStyle = "flex items-center justify-center px-4 py-2 font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed";
        
        switch (activeView) {
            case 'admin':
                return <div className={wrapper}><AdminDashboard /></div>;

            case 'studentManagement':
                if (selectedClassForImport) {
                    return (
                        <div>
                            <div className="mb-6"><button onClick={handleBackToClassSelection} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 font-semibold"><ArrowUturnLeftIcon className="w-4 h-4" />Back to Class Selection</button><h1 className="text-3xl font-bold text-gray-800">Import Students</h1><p className="text-gray-500 mt-1">Import students from <span className="font-semibold text-gray-700">"{selectedClassForImport.name}"</span> into your class.</p></div>
                            <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
                                <div><h2 className="text-lg font-semibold text-gray-700 mb-2">1. Import To Your Class</h2><div className="flex flex-col md:flex-row items-start md:items-center gap-4"><select value={importTargetClassId} onChange={e => setImportTargetClassId(e.target.value)} className="w-full md:w-auto flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="">-- Choose one of your classes --</option>{activeClasses.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.gradeLevel} - {c.section})</option>))}</select><button onClick={handleImportStudents} disabled={!importTargetClassId || isImporting || studentsToImport.size === 0} className={`${gradientButtonStyle} w-full md:w-auto gap-2`}><UserPlusIcon className="w-5 h-5" />{isImporting ? 'Importing...' : `Import ${studentsToImport.size} Student(s)`}</button></div></div>
                                <div><h2 className="text-lg font-semibold text-gray-700 mb-2">2. Select Students</h2><div className="border rounded-lg max-h-80 overflow-y-auto"><div className="flex items-center gap-4 p-3 border-b bg-gray-50 sticky top-0 z-10"><input type="checkbox" onChange={handleSelectAllStudents} checked={(selectedClassForImport.students?.length || 0) > 0 && studentsToImport.size === selectedClassForImport.students.length} id="select-all-students" className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500" /><label htmlFor="select-all-students" className="font-semibold text-gray-800">Select All ({selectedClassForImport.students?.length || 0})</label></div>{(selectedClassForImport.students && selectedClassForImport.students.length > 0) ? selectedClassForImport.students.map(student => (<div key={student.id} onClick={() => handleToggleStudentForImport(student.id)} className={`flex items-center gap-4 p-3 border-b last:border-b-0 cursor-pointer transition-colors ${studentsToImport.has(student.id) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}><input type="checkbox" readOnly checked={studentsToImport.has(student.id)} className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500 pointer-events-none" /><UserInitialsAvatar firstName={student.firstName} lastName={student.lastName} /><div><p className="font-semibold text-gray-800">{student.firstName} {student.lastName}</p><p className="text-sm text-gray-500">{student.gradeLevel || 'N/A'}</p></div></div>)) : (<p className="p-4 text-center text-gray-500">This class has no students.</p>)}</div></div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div>
                        <div className="mb-6"><h1 className="text-3xl font-bold text-gray-800">Browse Classes</h1><p className="text-gray-500 mt-1">Select a class below to import students from it.</p></div>
                        <div className="mb-6 sticky top-0 bg-slate-100 py-3 z-20"><div className="relative"><MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" placeholder={`Filter from ${allLmsClasses.length} classes...`} value={importClassSearchTerm} onChange={e => setImportClassSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div></div>
                        {isImportViewLoading ? <Spinner /> : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredLmsClasses.length > 0 ? filteredLmsClasses.map((c, index) => { const { icon: Icon, color } = classVisuals[index % classVisuals.length]; return (<div key={c.id} onClick={() => setSelectedClassForImport(c)} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"><div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all`}></div><div className="relative z-10 flex flex-col h-full"><div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4 self-start`}><Icon className="w-8 h-8" /></div><h2 className="text-xl font-bold text-gray-800 truncate mb-1">{c.name}</h2><p className="text-gray-500">{c.gradeLevel} - {c.section}</p><div className="mt-auto pt-4 border-t border-gray-100"><p className="text-xs text-gray-500">{c.students?.length || 0} student(s)</p></div></div></div>); }) : (<p className="col-span-full text-center text-gray-500 py-10">No classes match your search.</p>)}</div>)}
                    </div>
                );

            case 'courses':
                if (selectedCategory) {
                    const categoryCourses = courses.filter(c => c.category === selectedCategory);
                    const handleSubjectChange = (e) => { const newActiveSubject = categoryCourses.find(c => c.id === e.target.value); setActiveSubject(newActiveSubject); };
                    return (
                        <div className="w-full">
                            <div className="flex items-center gap-2 mb-4">
                                <button onClick={handleBackToCategoryList} className="text-gray-700 p-2 rounded-full hover:bg-gray-200"><ArrowUturnLeftIcon className="w-5 h-5" /></button>
                                <select className="w-full p-3 border border-gray-300 rounded-lg bg-white text-base" value={activeSubject?.id || ''} onChange={handleSubjectChange} disabled={categoryCourses.length === 0}>
                                    {categoryCourses.map(course => (<option key={course.id} value={course.id}>{course.title}</option>))}
                                </select>
                            </div>
                            {activeSubject ? (
                                <div className={wrapper}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl font-bold text-gray-800">{activeSubject.title}</h1>
                                            <button onClick={() => handleOpenEditSubject(activeSubject)} className="text-gray-400 hover:text-blue-600" title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleOpenDeleteSubject(activeSubject)} className="text-gray-400 hover:text-red-600" title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setShareContentModalOpen(true)} className="btn-primary">Share Content</button>
                                            <button onClick={() => setAddUnitModalOpen(true)} className="btn-secondary">Add Unit</button>
                                        </div>
                                    </div>
                                    <div><UnitAccordion subject={activeSubject} onInitiateDelete={handleInitiateDelete} userProfile={userProfile} onGenerateQuiz={handleGenerateQuizForLesson} isAiGenerating={isAiGenerating} /></div>
                                </div>
                            ) : ( <div className={wrapper}><h1 className="text-2xl font-bold text-gray-800">{selectedCategory}</h1><div className="text-center py-10"><p className="text-gray-500">There are no subjects in this category yet.</p></div></div> )}
                        </div>
                    );
                }
                return (
                    <div>
                        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"><div><h1 className="text-3xl font-bold text-gray-800">Subjects</h1><p className="text-gray-500 mt-1">Manage subject categories and create new subjects.</p></div><div className="flex flex-shrink-0 gap-2"><button onClick={() => setCreateCategoryModalOpen(true)} className="btn-primary gap-2"><PlusCircleIcon className="w-5 h-5" />New Category</button><button onClick={() => setCreateCourseModalOpen(true)} className="btn-primary flex items-center"><PlusCircleIcon className="w-5 h-5 mr-2" />New Subject</button></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{courseCategories.map((cat, index) => { const courseCount = courses.filter(c => c.category === cat.name).length; const { icon: Icon, color } = subjectVisuals[index % subjectVisuals.length]; return (<div key={cat.id} onClick={() => handleCategoryClick(cat.name)} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"><div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-20 group-hover:opacity-30 transition-all duration-300`}></div><div className="relative z-10"><div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div><h2 className="text-xl font-bold text-gray-800 truncate mb-1">{cat.name}</h2><p className="text-gray-500">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p><button onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 bg-transparent opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-opacity" aria-label={`Edit category ${cat.name}`}><PencilSquareIcon className="w-5 h-5" /></button></div></div>); })}</div>
                    </div>
                );

            case 'classes':
                return (
                    <div>
                        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"><div><h1 className="text-3xl font-bold text-gray-800">Classes</h1><p className="text-gray-500 mt-1">Select a class to view details or manage settings.</p></div><div className="flex flex-shrink-0 gap-2"><button onClick={() => setIsArchivedModalOpen(true)} className="btn-secondary">View Archived</button><button onClick={() => setCreateClassModalOpen(true)} className="btn-primary flex items-center"><PlusCircleIcon className="w-5 h-5 mr-2" />Create Class</button></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{activeClasses.length > 0 ? activeClasses.map((c, index) => { const { icon: Icon, color } = classVisuals[index % classVisuals.length]; return (<div key={c.id} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"><div onClick={() => { if (!isHoveringActions) setClassOverviewModal({ isOpen: true, data: c }); }} className="cursor-pointer flex-grow flex flex-col h-full"><div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all`}></div><div className="relative z-10"><div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div><h2 className="text-xl font-bold text-gray-800 truncate mb-1">{c.name}</h2><p className="text-gray-500">{c.gradeLevel} - {c.section}</p></div>{c.classCode && (<div className="mt-auto pt-4 border-t border-gray-100"><p className="text-xs text-gray-500 mb-1">Class Code</p><div className="flex items-center gap-2"><p className="font-mono text-lg tracking-widest text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{c.classCode}</p><button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.classCode); showToast("Class code copied!", "success"); }} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600" title="Copy code"><ClipboardIcon className="w-5 h-5" /></button></div></div>)}</div><div className="absolute top-0 right-0 p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onMouseEnter={() => setIsHoveringActions(true)} onMouseLeave={() => setIsHoveringActions(false)}><button onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-gray-700 shadow-md" title="Edit"><PencilSquareIcon className="w-5 h-5" /></button><button onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-gray-700 shadow-md" title="Archive"><ArchiveBoxIcon className="w-5 h-5" /></button><button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-red-600 shadow-md" title="Delete"><TrashIcon className="w-5 h-5" /></button></div></div>); }) : <p className="col-span-full text-center text-gray-500 py-10">No active classes created yet.</p>}</div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                            {/* --- Left Column: User Info Card --- */}
                            <div className="lg:col-span-1">
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 text-center text-white h-full flex flex-col justify-between">
                                    <div>
                                        <div className="relative inline-block mb-4 w-40 h-40 rounded-full overflow-hidden">
                                            <UserInitialsAvatar
                                                firstName={userProfile?.firstName}
                                                lastName={userProfile?.lastName}
                                                size="full"
                                            />
                                        </div>
                                        <h1 className="text-3xl font-bold text-white">
                                            {userProfile?.firstName} {userProfile?.lastName}
                                        </h1>
                                        <p className="text-md text-slate-400 capitalize">{userProfile?.role}</p>
                                    </div>
                                    <div className="space-y-4 mt-8 text-left">
                                        <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                            <EnvelopeIcon className="w-6 h-6 text-white/70" />
                                            <div>
                                                <p className="text-sm text-white/60">Email</p>
                                                <p className="font-semibold text-white">{userProfile?.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                            <IdentificationIcon className="w-6 h-6 text-white/70" />
                                            <div>
                                                <p className="text-sm text-white/60">User ID</p>
                                                <p className="font-mono text-xs text-white">{user?.uid || user?.id}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Right Column: Actions --- */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-2xl shadow-xl p-8 h-full">
                                    <h3 className="text-2xl font-bold text-slate-800 mb-6">Account Actions</h3>
                                    <div className="space-y-4">
                                        <button 
                                            onClick={() => setEditProfileModalOpen(true)} 
                                            className="w-full text-left flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all duration-300 group"
                                        >
                                            <div className="p-3 bg-blue-100 rounded-lg">
                                                <PencilSquareIcon className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">Edit Profile</p>
                                                <p className="text-sm text-slate-500">Update your first and last name.</p>
                                            </div>
                                            <span className="ml-auto text-slate-400 group-hover:text-blue-600 transition-colors">&rarr;</span>
                                        </button>

                                        <button 
                                            onClick={() => setChangePasswordModalOpen(true)} 
                                            className="w-full text-left flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all duration-300 group"
                                        >
                                            <div className="p-3 bg-purple-100 rounded-lg">
                                                <KeyIcon className="w-6 h-6 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">Change Password</p>
                                                <p className="text-sm text-slate-500">Update your account security.</p>
                                            </div>
                                            <span className="ml-auto text-slate-400 group-hover:text-purple-600 transition-colors">&rarr;</span>
                                        </button>
                
                                        <div className="pt-8">
                                            <button 
                                                onClick={logout} 
                                                className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 shadow-lg"
                                            >
                                                <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            
            case 'home':
            default:
                return (
                    <div className="space-y-8">
                        <div className="relative flex justify-between items-start pt-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Welcome back, {userProfile?.firstName}!</h1>
                                <p className="text-gray-500 mt-1">Here is your dashboard overview.</p>
                            </div>
                            {/* The AnimatedRobot is now fixed on screen, rendered globally */}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <GradientStatCard title="Active Classes" value={activeClasses.length} icon={<AcademicCapIcon />} gradient="from-blue-500 to-indigo-600" vectorIcon={<AcademicCapIcon />} />
                            <InspirationCard />
                            <ClockWidget />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Make an Announcement</h2>
                                <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-lg">
                                <h2 className="text-xl font-bold text-gray-700 mb-4">Recent Teacher Announcements</h2>
                                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                    {teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => {
                                        const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                                        return (
                                            <div key={post.id} className="bg-slate-50 p-4 rounded-lg border group relative">
                                                {editingAnnId === post.id ? (
                                                    <><textarea className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" rows="3" value={editingAnnText} onChange={(e) => setEditingAnnText(e.target.value)} /><div className="flex justify-end gap-2 mt-2"><button className="btn-secondary" onClick={() => setEditingAnnId(null)}>Cancel</button><button className="btn-primary" onClick={handleUpdateTeacherAnn}>Save</button></div></>
                                                ) : (
                                                    <>{canModify && (<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleStartEditAnn(post)} className="p-1 hover:bg-gray-200 rounded-full" title="Edit"><PencilSquareIcon className="w-4 h-4 text-gray-600" /></button><button onClick={() => handleDeleteTeacherAnn(post.id)} className="p-1 hover:bg-gray-200 rounded-full" title="Delete"><TrashIcon className="w-4 h-4 text-red-500" /></button></div>)}<p className="text-gray-800 whitespace-pre-wrap pr-10">{post.content}</p><div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 flex justify-between"><span>From: {post.teacherName}</span><span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</span></div></>
                                                )}
                                            </div>
                                        );
                                    }) : (<p className="text-center text-gray-500 py-8">No new announcements for teachers.</p>)}
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    const SidebarContent = () => (
        <div className="bg-white/90 h-full p-4">
            <div className="flex items-center gap-2 mb-6 px-2"><img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-9 h-9 rounded-full" /><span className="font-bold text-lg">SRCS LMS</span></div>
            <div className="bg-white/60 p-4 rounded-xl">
                <SidebarButton icon={<HomeIcon className="h-6 w-6" />} text="Home" onClick={() => handleViewChange('home')} isActive={activeView === 'home'} />
                <SidebarButton icon={<UserGroupIcon className="h-6 w-6" />} text="Students" onClick={() => handleViewChange('studentManagement')} isActive={activeView === 'studentManagement'} />
                <SidebarButton icon={<AcademicCapIcon className="h-6 w-6" />} text="Classes" onClick={() => handleViewChange('classes')} isActive={activeView === 'classes'} />
                <SidebarButton icon={<BookOpenIcon className="h-6 w-6" />} text="Subjects" onClick={() => handleViewChange('courses')} isActive={activeView === 'courses' || selectedCategory} />
                <SidebarButton icon={<UserIcon className="h-6 w-6" />} text="Profile" onClick={() => handleViewChange('profile')} isActive={activeView === 'profile'} />
                {userProfile?.role === 'admin' && (<SidebarButton icon={<ShieldCheckIcon className="h-6 w-6" />} text="Admin Console" onClick={() => handleViewChange('admin')} isActive={activeView === 'admin'} />)}
            </div>
        </div>
    );

    const bottomNavItems = [
        { view: 'home', text: 'Home', icon: HomeIcon },
        { view: 'studentManagement', text: 'Students', icon: UserGroupIcon },
        { view: 'classes', text: 'Classes', icon: AcademicCapIcon },
        { view: 'courses', text: 'Subjects', icon: BookOpenIcon },
        { view: 'profile', text: 'Profile', icon: UserIcon },
    ];

    return (
        // Main container is now a flex column to properly position header, main, and footer
        <div className="min-h-screen bg-slate-100 flex flex-col"> 
             <style jsx global>{`
                 .btn-primary {
                     display: inline-flex; align-items: center; gap: 0.5rem; justify-content: center;
                     background-image: linear-gradient(to right, #3b82f6, #8b5cf6);
                     color: white; font-weight: 600;
                     padding: 0.5rem 1rem; border-radius: 0.5rem;
                     border: none;
                     box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                     transition: all 0.2s ease-in-out;
                 }
                 .btn-primary:hover {
                     filter: brightness(1.1);
                     box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                 }
                 /* Global padding for mobile main content to prevent overlap with fixed footer */
                 @media (max-width: 767px) {
                    main {
                        padding-bottom: 70px !important; /* Adjust as needed, based on your footer's exact height + desired spacing */
                    }
                 }
             `}</style>
            {/* This flex container now holds sidebar + main content */}
            <div className="md:flex flex-1"> 
                <aside className="w-64 flex-shrink-0 hidden md:block shadow-lg"><SidebarContent /></aside>
                <div className={`fixed inset-0 z-50 md:hidden transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div><div className="relative w-64 h-full"><SidebarContent /></div></div>
                {/* This internal flex column ensures nav, main, and robot icon are properly stacked */}
                <div className="flex-1 flex flex-col">
                    <nav className="bg-white/70 backdrop-blur-md p-3 flex justify-between items-center sticky top-0 z-40 border-b border-white/30"><button className="md:hidden p-2 rounded-full" onClick={() => setIsSidebarOpen(true)}><Bars3Icon className="h-6 w-6" /></button><div className="flex-1"></div><div className="flex items-center gap-4"><button className="p-2 rounded-full text-gray-600 hover:bg-gray-100" title="Search"><MagnifyingGlassIcon className="h-5 w-5" /></button><div className="flex items-center gap-2 border-l border-gray-200 pl-4"><div onClick={() => handleViewChange('profile')} className="flex items-center gap-2 cursor-pointer" title="View Profile"><UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" /><span className="hidden sm:block font-medium text-gray-700 hover:text-blue-600">{userProfile?.firstName || 'Profile'}</span></div><button onClick={logout} className="flex items-center p-2 rounded-lg text-red-600 hover:bg-red-50" title="Logout"><ArrowLeftOnRectangleIcon className="h-5 w-5" /></button></div></div></nav>
                    <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto"> {/* Removed pb-24 here and added it globally via CSS */}
                        {renderMainContent()}
                    </main>
                </div>
            </div>
            
            {/* Robot Icon is rendered globally as a fixed element, its position is managed by JS/CSS */}
            <AnimatedRobot onClick={() => setIsChatOpen(true)} />

            {/* Chat Dialog and Modals are already fixed/absolute, so they should overlay correctly */}
            <ChatDialog 
                isOpen={isChatOpen} 
                onClose={() => {
                    setIsChatOpen(false);
                    setAiConversationStarted(false); // Reset conversation status when chat is closed
                }} 
                messages={messages} 
                onSendMessage={handleAskAiWrapper} 
                isAiThinking={isAiThinking}
                userFirstName={userProfile?.firstName} 
            />
            <ArchivedClassesModal isOpen={isArchivedModalOpen} onClose={() => setIsArchivedModalOpen(false)} archivedClasses={archivedClasses} onUnarchive={handleUnarchiveClass} onDelete={(classId) => handleDeleteClass(classId, true)} />
            <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={handleUpdateProfile} />
            <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)} onSubmit={handleChangePassword} />
            <CreateCategoryModal isOpen={isCreateCategoryModalOpen} onClose={() => setCreateCategoryModalOpen(false)} onCategoryCreated={() => { }} />
            {categoryToEdit && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setEditCategoryModalOpen(false)} category={categoryToEdit} onCategoryUpdated={() => { }} />}
            <CreateClassModal isOpen={isCreateClassModalOpen} onClose={() => setCreateClassModalOpen(false)} teacherId={user?.uid || user?.id} />
            <CreateCourseModal isOpen={isCreateCourseModalOpen} onClose={() => setCreateCourseModalOpen(false)} teacherId={user?.uid || user?.id} courseCategories={courseCategories} />
            <ClassOverviewModal isOpen={classOverviewModal.isOpen} onClose={() => setClassOverviewModal({ isOpen: false, data: null })} classData={classOverviewModal.data} courses={courses} onRemoveStudent={handleRemoveStudentFromClass} />
            <EditClassModal isOpen={isEditClassModalOpen} onClose={() => setEditClassModalOpen(false)} classData={classToEdit} />
            <AddUnitModal isOpen={isAddUnitModalOpen} onClose={() => setAddUnitModalOpen(false)} subjectId={activeSubject?.id} />
            {selectedUnit && <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />}
            {selectedUnit && <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={activeSubject?.id} />}
            {selectedUnit && <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={activeSubject?.id} />}
            {selectedUnit && <DeleteUnitModal isOpen={deleteUnitModalOpen} onClose={() => setDeleteUnitModalOpen(false)} unitId={selectedUnit?.id} subjectId={activeSubject?.id} />}
            {selectedLesson && <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson} />}
            {selectedLesson && <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson} />}
            {activeSubject && (<ShareMultipleLessonsModal isOpen={isShareContentModalOpen} onClose={() => setShareContentModalOpen(false)} subject={activeSubject} />)}
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} deletingItemType={deleteTarget?.type} />
            <EditSubjectModal isOpen={isEditSubjectModalOpen} onClose={() => setEditSubjectModalOpen(false)} subject={subjectToActOn} />
            <DeleteSubjectModal isOpen={isDeleteSubjectModalOpen} onClose={() => setDeleteSubjectModalOpen(false)} subject={subjectToActOn} />
            
            {/* The mobile footer is kept fixed and should now be visible */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm flex justify-around md:hidden border-t border-gray-200/80 z-50">
                {bottomNavItems.map(item => {
                    const isActive = activeView === item.view;
                    return (
                        <button key={item.view} onClick={() => handleViewChange(item.view)} className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 text-center transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
                            <item.icon className="h-5 w-5" />
                            <span className="text-xs mt-1">{item.text}</span>
                        </button>
                    );
                })}
            </footer>
        </div>
    );
};

export default TeacherDashboardUI;