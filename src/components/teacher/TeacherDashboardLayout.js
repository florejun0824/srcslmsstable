import React, { useState, useEffect } from 'react';
import {
    FaHouse, FaUserGroup, FaBook, FaBookOpen, FaUser, FaShieldHalved, FaArrowRightFromBracket
} from 'react-icons/fa6';
import { Bars3Icon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, writeBatch, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { CSSTransition, SwitchTransition } from 'react-transition-group';

import Spinner from '../common/Spinner';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import SidebarButton from '../common/SidebarButton';
import AdminDashboard from '../../pages/AdminDashboard';
import AiGenerationHub from './AiGenerationHub';
import ChatDialog from './ChatDialog';
import AnimatedRobot from './dashboard/widgets/AnimatedRobot';

import HomeView from './dashboard/views/HomeView';
import ClassesView from './dashboard/views/ClassesView';
import CoursesView from './dashboard/views/CoursesView';
import StudentManagementView from './dashboard/views/StudentManagementView';
import ProfileView from './dashboard/views/ProfileView';

import ArchivedClassesModal from './ArchivedClassesModal';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';
import CreateCategoryModal from './CreateCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import CreateClassModal from './CreateClassModal';
import CreateCourseModal from './CreateCourseModal';
import ClassOverviewModal from './ClassOverviewModal';
import EditClassModal from '../common/EditClassModal';
import AddUnitModal from './AddUnitModal';
import EditUnitModal from './EditUnitModal';
import AddLessonModal from './AddLessonModal';
import AddQuizModal from './AddQuizModal';
import DeleteUnitModal from './DeleteUnitModal';
import EditLessonModal from './EditLessonModal';
import ViewLessonModal from './ViewLessonModal';
import ShareMultipleLessonsModal from './ShareMultipleLessonsModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import EditSubjectModal from './EditSubjectModal';
import DeleteSubjectModal from './DeleteSubjectModal';

const GlobalAiSpinner = ({ isGenerating, text }) => {
    if (!isGenerating) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex flex-col justify-center items-center backdrop-blur-sm">
            <Spinner />
            <p className="text-white text-lg mt-4 font-semibold animate-pulse">{text || "AI is working its magic..."}</p>
        </div>
    );
};

const TeacherDashboardLayout = (props) => {
    const {
        user, userProfile, loading, error, activeView, handleViewChange, isSidebarOpen, setIsSidebarOpen, logout,
        isAiGenerating,
        setIsAiGenerating,
        isChatOpen, setIsChatOpen, messages, isAiThinking, handleAskAi,
        aiConversationStarted, handleAskAiWrapper, isAiHubOpen, setIsAiHubOpen, activeSubject,
        activeUnit, onSetActiveUnit, setViewLessonModalOpen,
        reloadKey,
        // Deletion props from parent
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        handleConfirmDelete,
        deleteTarget,
        handleInitiateDelete,
        ...rest
    } = props;

    const [courses, setCourses] = useState(rest.courses || []);
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
    const { showToast } = useToast();
    const [preselectedCategoryForCourseModal, setPreselectedCategoryForCourseModal] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'courses'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(coursesData);
        });
        return () => unsubscribe();
    }, []);

    const handleRenameCategory = async (newName) => {
        const oldName = categoryToEdit?.name;
        if (!oldName || !newName || oldName === newName) {
            setIsEditCategoryModalOpen(false);
            return;
        }
        const subjectsQuery = query(collection(db, 'courses'), where('category', '==', oldName));
        try {
            const querySnapshot = await getDocs(subjectsQuery);
            const batch = writeBatch(db);
            querySnapshot.forEach((document) => {
                const subjectRef = doc(db, 'courses', document.id);
                batch.update(subjectRef, { category: newName });
            });
            await batch.commit();
            showToast("Category renamed successfully!", "success");
        } catch (error) {
            console.error("Error renaming category:", error);
            showToast("Failed to rename category.", "error");
        } finally {
            setIsEditCategoryModalOpen(false);
        }
    };

    const handleEditCategory = (category) => {
        setCategoryToEdit(category);
        setIsEditCategoryModalOpen(true);
    };

    const courseCategories = [...new Set(courses.map(c => c.category).filter(Boolean))]
        .map(name => ({ id: name, name: name }));

    const handleAddSubjectWithCategory = (categoryName) => {
        setPreselectedCategoryForCourseModal(categoryName);
        rest.setCreateCourseModalOpen(true);
    };

    const renderMainContent = () => {
        if (loading) return <Spinner />;
        if (error) {
            return (
                <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded-md shadow-md">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 mt-1" />
                        <div><strong className="block">An error occurred</strong><span>{error}</span></div>
                    </div>
                </div>
            );
        }

        switch (activeView) {
            case 'home':
                return <HomeView key={reloadKey} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
            case 'classes':
                return <ClassesView key={reloadKey} {...rest} />;
            case 'courses':
                return <CoursesView
                    key={reloadKey}
                    {...rest}
                    userProfile={userProfile}
                    activeSubject={activeSubject}
                    isAiGenerating={isAiGenerating}
                    setIsAiHubOpen={setIsAiHubOpen}
                    activeUnit={activeUnit}
                    onSetActiveUnit={onSetActiveUnit}
                    courses={courses}
                    courseCategories={courseCategories}
                    handleEditCategory={handleEditCategory}
                    onAddSubjectClick={handleAddSubjectWithCategory}
                    handleInitiateDelete={handleInitiateDelete}
                />;
            case 'studentManagement':
                return <StudentManagementView key={reloadKey} {...rest} />;
            case 'profile':
                return <ProfileView key={reloadKey} user={user} userProfile={userProfile} logout={logout} {...rest} />;
            case 'admin':
                return <div key={reloadKey} className="p-4 sm:p-6 rounded-3xl text-gray-800"><AdminDashboard /></div>;
            default:
                return <HomeView key={reloadKey} userProfile={userProfile} handleViewChange={handleViewChange} {...rest} />;
        }
    };

    const navItems = [
        { view: 'home', text: 'Home', icon: <FaHouse />, color: 'text-orange-500' },
        { view: 'studentManagement', text: 'Students', icon: <FaUserGroup />, color: 'text-blue-500' },
        { view: 'classes', text: 'Classes', icon: <FaBookOpen />, color: 'text-green-500' },
        { view: 'courses', text: 'Subjects', icon: <FaBook />, color: 'text-purple-500' },
        { view: 'profile', text: 'Profile', icon: <FaUser />, color: 'text-pink-500' },
    ];
    if (userProfile?.role === 'admin') {
        navItems.push({ view: 'admin', text: 'Admin', icon: <FaShieldHalved />, color: 'text-gray-500' });
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-slate-50 to-indigo-100 font-sans antialiased text-gray-800 relative">
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-1/4 right-0 w-72 h-72 bg-purple-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <header className="sticky top-0 z-50 p-3 md:p-4 bg-white/60 backdrop-blur-2xl rounded-b-3xl shadow-2xl flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-10 h-10 rounded-full shadow-lg" />
                    <span className="hidden md:block font-bold text-xl text-gray-900 drop-shadow-sm">SRCS Learning Portal</span>
                </div>
                
                <nav className="hidden lg:flex items-center justify-center gap-2 flex-1">
                    {navItems.map(item => (
                        <button
                            key={item.view}
                            onClick={() => handleViewChange(item.view)}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500 ease-in-out transform active:scale-95 text-gray-700 font-semibold
                                ${activeView === item.view ? 'bg-indigo-500/10 text-indigo-700 shadow-md scale-105' : 'hover:bg-gray-100/70 hover:shadow-sm'}
                            `}
                        >
                            {React.cloneElement(item.icon, {
                                className: `h-6 w-6 transition-all duration-500 ease-in-out group-hover:scale-110 ${activeView === item.view ? 'scale-110 ' + item.color : 'text-gray-500 group-hover:' + item.color}`,
                                strokeWidth: 2,
                            })}
                            <span className="text-sm">{item.text}</span>
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <div onClick={() => handleViewChange('profile')} className="flex items-center gap-2 cursor-pointer transition-all duration-300 hover:text-primary-600 hover:scale-[1.02] active:scale-95" title="View Profile">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
                            {userProfile?.photoURL ? (
                                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-contain" />
                            ) : (
                                <UserInitialsAvatar firstName={userProfile?.firstName} lastName={userProfile?.lastName} size="sm" />
                            )}
                        </div>
                        <span className="hidden lg:block font-medium text-gray-700">{userProfile?.firstName || 'Profile'}</span>
                    </div>
                    <button onClick={logout} className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-700 transition-all duration-300 active:scale-95 shadow-sm" title="Logout">
                        <FaArrowRightFromBracket className="h-6 w-6" />
                    </button>
                    <button className="lg:hidden p-2 rounded-full bg-gray-200/50 hover:bg-gray-300/70 text-gray-600 transition-colors duration-300 active:scale-95" onClick={() => setIsSidebarOpen(true)}>
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                </div>
            </header>

            <div className="relative z-10 flex flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
                <CSSTransition
                    in={isSidebarOpen}
                    timeout={300}
                    classNames="sidebar"
                    unmountOnExit
                >
                    <div className="fixed inset-0 z-[999] lg:hidden">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setIsSidebarOpen(false)}></div>
                        <div className="relative w-64 h-full bg-white/90 backdrop-blur-3xl p-6 shadow-2xl flex flex-col justify-between rounded-r-3xl">
                             <div>
                                <div className="flex items-center gap-2 mb-10 px-2">
                                    <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-12 h-12 rounded-full shadow-lg" />
                                    <span className="font-bold text-2xl text-gray-900 drop-shadow-md tracking-wide">SRCS Learning Portal</span>
                                </div>
                                <nav className="space-y-3">
                                     {navItems.map(item => (
                                         <SidebarButton
                                            key={item.view}
                                            icon={item.icon}
                                            text={item.text}
                                            onClick={() => { handleViewChange(item.view); setIsSidebarOpen(false); }}
                                            isActive={activeView === item.view}
                                            color={item.color}
                                         />
                                     ))}
                                </nav>
                            </div>
                            <div className="flex items-center justify-center p-2">
                                <button onClick={logout} className="flex items-center gap-2 w-full p-3 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-700 transition-all duration-300 active:scale-95 shadow-md font-semibold justify-center">
                                    <FaArrowRightFromBracket className="h-6 w-6" />
                                    <span className="hidden sm:block">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </CSSTransition>

                <main className="flex-1 w-full overflow-y-auto rounded-3xl shadow-2xl p-4 md:p-6 lg:p-8 bg-white/60 backdrop-blur-2xl">
                    <SwitchTransition mode="out-in">
                        <CSSTransition
                            key={activeView}
                            timeout={500}
                            classNames="fade"
                        >
                            <div className="h-full w-full">
                                {renderMainContent()}
                            </div>
                        </CSSTransition>
                    </SwitchTransition>
                </main>
            </div>
            
            <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} subjectId={activeSubject?.id} unitId={activeUnit?.id} />
            
            <CSSTransition
                in={!isChatOpen}
                timeout={500}
                classNames="animated-robot"
                unmountOnExit
            >
                <AnimatedRobot onClick={() => setIsChatOpen(true)} />
            </CSSTransition>
            <ChatDialog
                isOpen={isChatOpen}
                onClose={() => {
                    setIsChatOpen(false);
                    rest.setAiConversationStarted(false);
                }}
                messages={messages}
                onSendMessage={handleAskAiWrapper}
                isAiThinking={isAiThinking}
                userFirstName={userProfile?.firstName}
            />

            <GlobalAiSpinner isGenerating={isAiGenerating} text="Crafting content..." />

            <ArchivedClassesModal isOpen={rest.isArchivedModalOpen} onClose={() => rest.setIsArchivedModalOpen(false)} archivedClasses={rest.archivedClasses} onUnarchive={rest.handleUnarchiveClass} onDelete={(classId) => rest.handleDeleteClass(classId, true)} />
            <EditProfileModal isOpen={rest.isEditProfileModalOpen} onClose={() => rest.setEditProfileModalOpen(false)} userProfile={userProfile} onUpdate={rest.handleUpdateProfile} />
            <ChangePasswordModal isOpen={rest.isChangePasswordModalOpen} onClose={() => rest.setChangePasswordModalOpen(false)} onSubmit={rest.handleChangePassword} />
            <CreateCategoryModal
                isOpen={rest.isCreateCategoryModalOpen}
                onClose={() => rest.setCreateCategoryModalOpen(false)}
                teacherId={user?.uid || user?.id}
            />
            {categoryToEdit && (
                <EditCategoryModal
                    isOpen={isEditCategoryModalOpen}
                    onClose={() => setIsEditCategoryModalOpen(false)}
                    categoryName={categoryToEdit.name}
                    onSave={handleRenameCategory}
                />
            )}
            <CreateClassModal isOpen={rest.isCreateClassModalOpen} onClose={() => rest.setCreateClassModalOpen(false)} teacherId={user?.uid || user?.id} />
            <CreateCourseModal
                isOpen={rest.isCreateCourseModalOpen}
                onClose={() => {
                    rest.setCreateCourseModalOpen(false);
                    setPreselectedCategoryForCourseModal(null);
                }}
                teacherId={user?.uid || user?.id}
                courseCategories={courseCategories}
                preselectedCategory={preselectedCategoryForCourseModal}
            />
            <ClassOverviewModal isOpen={rest.classOverviewModal.isOpen} onClose={() => rest.setClassOverviewModal({ isOpen: false, data: null })} classData={rest.classOverviewModal.data} courses={courses} onRemoveStudent={rest.handleRemoveStudentFromClass} />
            <EditClassModal isOpen={rest.isEditClassModalOpen} onClose={() => rest.setEditClassModalOpen(false)} classData={rest.classToEdit} />
            <AddUnitModal isOpen={rest.isAddUnitModalOpen} onClose={() => rest.setAddUnitModalOpen(false)} subjectId={activeSubject?.id} />
            {rest.selectedUnit && <EditUnitModal isOpen={rest.editUnitModalOpen} onClose={() => rest.setEditUnitModalOpen(false)} unit={rest.selectedUnit} />}
            {rest.selectedUnit && <AddLessonModal isOpen={rest.addLessonModalOpen} onClose={() => rest.setAddLessonModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} setIsAiGenerating={setIsAiGenerating} />}
            {rest.selectedUnit && <AddQuizModal isOpen={rest.addQuizModalOpen} onClose={() => rest.setAddQuizModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
            {rest.selectedUnit && <DeleteUnitModal isOpen={rest.deleteUnitModalOpen} onClose={() => rest.setDeleteUnitModalOpen(false)} unitId={rest.selectedUnit?.id} subjectId={activeSubject?.id} />}
            {rest.selectedLesson && <EditLessonModal isOpen={rest.editLessonModalOpen} onClose={() => rest.setEditLessonModalOpen(false)} lesson={rest.selectedLesson} />}
            {rest.selectedLesson && <ViewLessonModal isOpen={rest.viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={rest.selectedLesson} />}
            {activeSubject && (<ShareMultipleLessonsModal isOpen={rest.isShareContentModalOpen} onClose={() => rest.setShareContentModalOpen(false)} subject={activeSubject} />)}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                deletingItemType={deleteTarget?.type}
            />
            <EditSubjectModal isOpen={rest.isEditSubjectModalOpen} onClose={() => rest.setEditSubjectModalOpen(false)} subject={rest.subjectToActOn} />
            <DeleteSubjectModal isOpen={rest.isDeleteSubjectModalOpen} onClose={() => rest.setDeleteSubjectModalOpen(false)} subject={rest.subjectToActOn} />

            <footer className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-2xl flex justify-around lg:hidden border-t border-gray-200/50 shadow-2xl z-50 rounded-t-3xl p-2 animate-fade-in-up">
                {navItems.map(item => {
                    const isActive = activeView === item.view;
                    return (
                        <button key={item.view} onClick={() => handleViewChange(item.view)} className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 text-center transition-all duration-300 active:scale-95 ${isActive ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-indigo-500'}`}>
                            {React.cloneElement(item.icon, {
                                className: `h-6 w-6 transform ${isActive ? 'scale-110 -translate-y-0.5 ' + item.color : 'text-gray-500 hover:' + item.color}`,
                            })}
                            <span className={`text-xs mt-1 ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.text}</span>
                        </button>
                    );
                })}
            </footer>
        </div>
    );
};

export default TeacherDashboardLayout;