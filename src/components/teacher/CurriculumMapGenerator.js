import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

export default function CurriculumMapGenerator({ isOpen, onClose, subjectId }) {
    const { showToast } = useToast();
    
    const [view, setView] = useState('form'); 
    const [generatedHtml, setGeneratedHtml] = useState('');
    const [subjectDetails, setSubjectDetails] = useState(null);

    const [units, setUnits] = useState([]);
    const [selectedUnits, setSelectedUnits] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [gradeLevelStd, setGradeLevelStd] = useState('');
    const [contentStd, setContentStd] = useState('');
    const [performanceStd, setPerformanceStd] = useState('');

    useEffect(() => {
        if (isOpen && subjectId) {
            const fetchSubjectDetails = async () => {
                setIsLoading(true);
                try {
                    const subjectRef = doc(db, 'courses', subjectId);
                    const subjectSnap = await getDoc(subjectRef);
                    if (subjectSnap.exists()) {
                        setSubjectDetails({ id: subjectSnap.id, ...subjectSnap.data() });
                    } else {
                        showToast("Error: Could not find the specified subject.", "error");
                        console.error("No such subject document with ID:", subjectId);
                    }
                } catch (error) {
                    showToast("Error fetching subject details.", "error");
                    console.error("Firebase error fetching subject:", error);
                }
            };
            fetchSubjectDetails();
        } else {
            setSubjectDetails(null);
        }
    }, [isOpen, subjectId, showToast]);

    const fetchUnits = useCallback(async () => {
        if (!subjectDetails?.id) return; 
        
        try {
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectDetails.id), orderBy('order'));
            const querySnapshot = await getDocs(unitsQuery);
            const fetchedUnits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const unitsWithUlp = await Promise.all(fetchedUnits.map(async (unit) => {
                const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unit.id));
                const lessonsSnapshot = await getDocs(lessonsQuery);
                const ulpLesson = lessonsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .find(lesson => lesson.title.toLowerCase().includes('unit learning plan') || lesson.title.toLowerCase().includes('ulp'));
                
                return { ...unit, ulpContent: ulpLesson?.pages?.[0]?.content || null };
            }));

            setUnits(unitsWithUlp);
            const defaultSelected = new Set(unitsWithUlp.filter(u => u.ulpContent).map(u => u.id));
            setSelectedUnits(defaultSelected);

        } catch (error) {
            console.error("Error fetching units:", error);
            showToast("Failed to load units for this subject.", "error");
        }
        setIsLoading(false);
    }, [subjectDetails, showToast]);

    useEffect(() => {
        if (isOpen) {
            setView('form');
            setGeneratedHtml('');
            if (subjectDetails) {
                fetchUnits();
            }
        }
    }, [isOpen, subjectDetails, fetchUnits]);

    const handleToggleUnit = (unitId) => {
        setSelectedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitId)) newSet.delete(unitId);
            else newSet.add(unitId);
            return newSet;
        });
    };

    /**
     * --- COMPLETELY REBUILT PARSING LOGIC (VERSION 5) ---
     * Corrects the TypeError by ensuring keywords are arrays.
     */
    const parseUlpContent = (htmlContent) => {
        if (!htmlContent) return { acquisition: [], meaningMaking: [], transfer: [] };
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const table = doc.querySelector('table');
        if (!table) return { acquisition: [], meaningMaking: [], transfer: [] };

        const result = { acquisition: [], meaningMaking: [], transfer: [] };
        let currentSection = null;

        const tableRows = table.querySelectorAll('tbody > tr');

        // --- FIXED: Keyword values are now arrays ---
        const keywords = {
            en: { competency: ['competency'], assessment: ['assessment'], activity: ['activit'], resource: ['resource'], value: ['value'] },
            fil: { competency: ['kompetensi', 'kasanayan'], assessment: ['pagtatasa'], activity: ['gawain'], resource: ['kagamitan'], value: ['pagpapahalaga'] }
        };

        tableRows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const rowText = row.textContent.toLowerCase();

            if (cells.length === 1 && cells[0].getAttribute('colspan')) {
                if (rowText.includes('acquisition')) { currentSection = 'acquisition'; return; }
                if (rowText.includes('meaning')) { currentSection = 'meaningMaking'; return; }
                if (rowText.includes('transfer')) { currentSection = 'transfer'; return; }
            }

            if (cells.length >= 2 && currentSection) {
                const competencyCell = cells[0];
                const contentCell = cells[1];

                let competency = 'N/A';
                let assessments = 'N/A';
                let activities = 'N/A';
                let resources = 'N/A';
                let values = 'N/A';

                // --- V5: Precise Competency Extraction ---
                const competencyParagraphs = Array.from(competencyCell.querySelectorAll('p'));
                for (const p of competencyParagraphs) {
                    const strongTag = p.querySelector('strong');
                    if (strongTag) {
                        const strongText = strongTag.textContent.toLowerCase();
                        // Combine both language keywords for the check
                        if ([...keywords.en.competency, ...keywords.fil.competency].some(kw => strongText.startsWith(kw))) {
                            const clone = p.cloneNode(true);
                            clone.querySelector('strong').remove();
                            competency = clone.innerHTML.trim().replace(/^[:\s]+/, '');
                            break; 
                        }
                    }
                }
                if (competency === 'N/A' && competencyParagraphs.length > 0) {
                    competency = competencyParagraphs[0].innerHTML.trim();
                }

                // --- V5: Intelligent Content Extraction from Column 2 ---
                const contentElements = Array.from(contentCell.children);
                let isCapturingActivities = false;
                let capturedActivities = [];

                contentElements.forEach(el => {
                    const strongTag = el.querySelector('strong');
                    const strongText = strongTag ? strongTag.textContent.toLowerCase() : '';

                    // Combine keywords for robust checking
                    const isAssessment = [...keywords.en.assessment, ...keywords.fil.assessment].some(k => strongText.includes(k));
                    const isActivity = [...keywords.en.activity, ...keywords.fil.activity].some(k => strongText.includes(k));
                    const isResource = [...keywords.en.resource, ...keywords.fil.resource].some(k => strongText.includes(k));
                    const isValue = [...keywords.en.value, ...keywords.fil.value].some(k => strongText.includes(k));

                    if (isAssessment || isResource || isValue) {
                        isCapturingActivities = false;
                    }
                    if (isActivity) {
                        isCapturingActivities = true;
                    }

                    const clone = el.cloneNode(true);
                    if (strongTag) clone.querySelector('strong').remove();
                    const textContent = clone.textContent.trim().replace(/^[:\s]+/, '');

                    if (isAssessment) {
                        assessments = textContent.split('\n')[0].trim();
                    } else if (isResource) {
                        resources = textContent.split('\n')[0].trim();
                    } else if (isValue) {
                        values = textContent.split('\n')[0].trim();
                    }
                    
                    if (isCapturingActivities) {
                        // Use textContent for cleaner output, removing HTML tags
                        capturedActivities.push(textContent);
                    }
                });

                if (capturedActivities.length > 0) {
                    activities = capturedActivities.join('<br>');
                }

                result[currentSection].push({ competency, assessments, activities, resources, values });
            }
        });
        return result;
    };

    const handleGeneratePreview = () => {
        setIsProcessing(true);
        const orderedSelectedUnits = units.filter(u => selectedUnits.has(u.id));

        if (orderedSelectedUnits.length === 0) {
            showToast("Please select at least one unit with ULP content.", "error");
            setIsProcessing(false);
            return;
        }

        let tableRowsHtml = '';
        orderedSelectedUnits.forEach(unit => {
            const parsedData = parseUlpContent(unit.ulpContent);
            const sections = [
                { title: 'ACQUISITION', data: parsedData.acquisition },
                { title: 'MAKE MEANING', data: parsedData.meaningMaking },
                { title: 'TRANSFER', data: parsedData.transfer }
            ];
            
            let totalRowsForUnit = 0;
            sections.forEach(sec => {
                if (sec.data.length > 0) {
                    totalRowsForUnit += sec.data.length + 1;
                }
            });

            if (totalRowsForUnit === 0) return;

            let isFirstRowOfUnit = true;

            sections.forEach(section => {
                if (section.data.length > 0) {
                    tableRowsHtml += `
                        <tr>
                            ${isFirstRowOfUnit ? `<td rowspan="${totalRowsForUnit}" style="vertical-align: top;"><b>${unit.title}</b></td>` : ''}
                            <td colspan="5" style="background-color: #e9ecef; font-weight: bold; padding: 8px;">${section.title}</td>
                        </tr>
                    `;
                    isFirstRowOfUnit = false;

                    section.data.forEach(data => {
                        tableRowsHtml += `
                            <tr>
                                <td>${data.competency}</td>
                                <td>${data.assessments}</td>
                                <td>${data.activities}</td>
                                <td>${data.resources}</td>
                                <td>${data.values}</td>
                            </tr>
                        `;
                    });
                }
            });
        });

        const finalHtml = `
            <h1 style="text-align: center; font-size: 1.5em; margin-bottom: 20px;">Curriculum Map</h1>
            <table style="border: none; margin-bottom: 20px; width: 100%; font-size: 11pt;">
              <tr>
                <td style="border: none; padding: 2px 0;"><b>Subject:</b> ${subjectDetails?.title || 'N/A'}</td>
                <td style="border: none; padding: 2px 0;"><b>Grade Level:</b> ${gradeLevelStd.split(' ')[1] || 'N/A'}</td>
              </tr>
            </table>
            <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
                <thead>
                    <tr><th colspan="6" style="border: 1px solid black; padding: 8px; text-align: left; font-size: 11pt;"><b>Grade Level Standard:</b> ${gradeLevelStd}</th></tr>
                    <tr><th colspan="6" style="border: 1px solid black; padding: 8px; text-align: left; font-size: 11pt;"><b>Content Standard:</b> ${contentStd}</th></tr>
                    <tr><th colspan="6" style="border: 1px solid black; padding: 8px; text-align: left; font-size: 11pt;"><b>Performance Standard:</b> ${performanceStd}</th></tr>
                    <tr>
                        <th style="width: 15%; border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; background-color: #f8f9fa;">UNIT/TOPICS/LESSONS</th>
                        <th style="width: 25%; border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; background-color: #f8f9fa;">PRIORITIZED COMPETENCIES OR SKILLS/ AMT LEARNING</th>
                        <th style="width: 15%; border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; background-color: #f8f9fa;">ASSESSMENTS</th>
                        <th style="width: 20%; border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; background-color: #f8f9fa;">ACTIVITIES</th>
                        <th style="width: 15%; border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; background-color: #f8f9fa;">RESOURCES</th>
                        <th style="width: 10%; border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; background-color: #f8f9fa;">INSTITUTIONAL CORE VALUES</th>
                    </tr>
                </thead>
                <tbody>${tableRowsHtml}</tbody>
            </table>
        `;
        
        setGeneratedHtml(finalHtml);
        setView('preview');
        setIsProcessing(false);
    };

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            const unitsRef = collection(db, 'units');
            const q = query(unitsRef, where('subjectId', '==', subjectDetails.id), where('title', '==', 'Curriculum Maps'));
            const querySnapshot = await getDocs(q);
            
            let mapsUnitId;
            if (querySnapshot.empty) {
                showToast("Creating a new 'Curriculum Maps' unit...", "info");
                const newUnitRef = await addDoc(unitsRef, {
                    title: 'Curriculum Maps',
                    subjectId: subjectDetails.id,
                    createdAt: serverTimestamp(),
                    order: -1 
                });
                mapsUnitId = newUnitRef.id;
            } else {
                mapsUnitId = querySnapshot.docs[0].id;
            }

            const lessonsRef = collection(db, 'lessons');
            const mapTitle = `Curriculum Map (${new Date().toLocaleDateString()})`;
            await addDoc(lessonsRef, {
                title: mapTitle,
                unitId: mapsUnitId,
                subjectId: subjectDetails.id,
                createdAt: serverTimestamp(),
                order: Date.now(),
                pages: [{
                    title: 'Curriculum Map',
                    content: generatedHtml
                }]
            });

            showToast("Curriculum Map saved successfully!", "success");
            onClose();

        } catch (error) {
            console.error("Error saving curriculum map:", error);
            showToast("Failed to save the curriculum map.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const renderForm = () => (
        <>
            <div className="p-6 overflow-y-auto" style={{maxHeight: '80vh'}}>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level Standard</label>
                    <textarea rows="2" className="w-full border-gray-300 rounded-md shadow-sm" placeholder="Enter the grade level standard..." value={gradeLevelStd} onChange={e => setGradeLevelStd(e.target.value)} />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Standard</label>
                    <textarea rows="2" className="w-full border-gray-300 rounded-md shadow-sm" placeholder="Enter the content standard..." value={contentStd} onChange={e => setContentStd(e.target.value)} />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performance Standard</label>
                    <textarea rows="2" className="w-full border-gray-300 rounded-md shadow-sm" placeholder="Enter the performance standard..." value={performanceStd} onChange={e => setPerformanceStd(e.target.value)} />
                </div>
                <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Select Units to Include</h3>
                    {isLoading ? <div className="flex justify-center p-8"><Spinner /></div> : (
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-gray-50">
                            {units.length > 0 ? units.map(unit => (
                                <div key={unit.id} className="flex items-center gap-3">
                                    <input type="checkbox" id={`unit-${unit.id}`} checked={selectedUnits.has(unit.id)} onChange={() => handleToggleUnit(unit.id)} disabled={!unit.ulpContent} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    <label htmlFor={`unit-${unit.id}`} className={`flex-1 ${!unit.ulpContent ? 'text-gray-400' : 'text-gray-800'}`}>
                                        {unit.title}
                                        {!unit.ulpContent && <span className="text-xs text-red-500 ml-2">(No ULP content found)</span>}
                                    </label>
                                </div>
                            )) : <p className="text-sm text-center text-gray-500">No units found for this subject.</p>}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 border-t rounded-b-2xl">
                <button onClick={onClose} className="text-gray-600 font-semibold hover:text-gray-800">Cancel</button>
                <button onClick={handleGeneratePreview} disabled={isProcessing || isLoading} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center">
                    {isProcessing && <Spinner size="sm" className="mr-2" />}
                    {isProcessing ? 'Generating...' : 'Generate Preview'}
                </button>
            </div>
        </>
    );

    const renderPreview = () => (
        <>
            <div className="p-6 overflow-y-auto bg-gray-100" style={{maxHeight: '80vh'}}>
                <div className="bg-white p-8 shadow-lg" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 border-t rounded-b-2xl">
                <button onClick={() => setView('form')} className="text-gray-600 font-semibold hover:text-gray-800 flex items-center gap-2">
                    <ArrowUturnLeftIcon className="w-5 h-5" />
                    Back to Edit
                </button>
                <button onClick={handleSave} disabled={isProcessing} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 flex items-center">
                    {isProcessing && <Spinner size="sm" className="mr-2" />}
                    {isProcessing ? 'Saving...' : 'Save Curriculum Map'}
                </button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Curriculum Map Generator</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                {view === 'form' ? renderForm() : renderPreview()}
            </div>
        </div>
    );
}
