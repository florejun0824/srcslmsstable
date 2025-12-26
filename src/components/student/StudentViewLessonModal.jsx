// src/components/teacher/StudentViewLessonModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    QueueListIcon,
    ArrowDownTrayIcon,
    QuestionMarkCircleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    Squares2X2Icon,
    BookOpenIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import LessonPage from '../teacher/LessonPage';
import ContentRenderer from '../teacher/ContentRenderer';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

// --- PDF & NATIVE IMPORTS ---
import htmlToPdfmake from 'html-to-pdfmake';
import { marked } from 'marked';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

pdfMake.vfs = pdfFonts;

// --- HELPERS ---
const isNativePlatform = () => Capacitor.isNativePlatform();

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result.toString();
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) reject(new Error("Failed to convert blob to base64."));
      else resolve(base64Data);
    };
    reader.readAsDataURL(blob);
  });
};

const fetchImageAsBase64 = async (url) => {
    if (!url) return null;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error loading image:", url, error);
        return null; 
    }
};

const nativeSave = async (blob, fileName, mimeType, showToast) => {
  if (!isNativePlatform()) return;
  const directory = Directory.Data; 
  try {
    const base64Data = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: directory,
      recursive: true
    });
    showToast(`Opening PDF...`, 'info');
    await FileOpener.open({ filePath: result.uri, contentType: mimeType });
  } catch (error) {
    console.error('Unable to save or open file', error);
    showToast(`Error saving file: ${error.message}`, 'error');
  }
};

// --- FONT LOADING ---
async function loadFontToVfs(name, url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
  pdfMake.vfs[name] = base64;
}

let dejaVuLoaded = false;
async function registerDejaVuFonts() {
  if (dejaVuLoaded) return;
  try {
    await loadFontToVfs("DejaVuSans.ttf", "/fonts/DejaVuSans.ttf");
    await loadFontToVfs("DejaVuSans-Bold.ttf", "/fonts/DejaVuSans-Bold.ttf");
    await loadFontToVfs("DejaVuSans-Oblique.ttf", "/fonts/DejaVuSans-Oblique.ttf");
    await loadFontToVfs("DejaVuSans-BoldOblique.ttf", "/fonts/DejaVuSans-BoldOblique.ttf");
    
    const dejaVuConfig = { 
        normal: "DejaVuSans.ttf", 
        bold: "DejaVuSans-Bold.ttf", 
        italics: "DejaVuSans-Oblique.ttf", 
        bolditalics: "DejaVuSans-BoldOblique.ttf" 
    };

    pdfMake.fonts = {
      DejaVu: dejaVuConfig,
      "DejaVu Sans": dejaVuConfig,
      "DejavuSans": dejaVuConfig,
      "DejaVuSans": dejaVuConfig,
      Roboto: dejaVuConfig,
      Arial: dejaVuConfig
    };
    dejaVuLoaded = true;
  } catch (error) { console.error("Failed to load fonts:", error); }
}

// --- ROBUST PDF PROCESSING HELPERS (Ported from UnitAccordion) ---

const processLatex = (text) => {
    if (!text || typeof text !== 'string') return '';
    let processed = text
        .replace(/\\degree/g, '°')
        .replace(/\\angle/g, '∠')
        .replace(/\\vec\{(.*?)\}/g, (_, c) => c.split('').map(x => x + '\u20D7').join(''));

    const latexToImg = (match, code) => {
        const cleanCode = code.trim();
        const url = `https://latex.codecogs.com/png.latex?\\dpi{200}\\bg_white\\color{black} ${encodeURIComponent(cleanCode)}`;
        return `<img src="${url}" class="math-img" />`;
    };

    return processed
        .replace(/\$\$(.*?)\$\$/g, latexToImg) 
        .replace(/\$(.*?)\$/g, latexToImg);    
};

const convertSvgStringToPngDataUrl = (svgString) => {
    return new Promise((resolve, reject) => {
        const MAX_WIDTH = 550;
        let corrected = svgString.replace(/xmlns="\[http:\/\/www\.w3\.org\/2000\/svg\]\(http:\/\/www\.w3\.org\/2000\/svg\)"/g, 'xmlns="http://www.w3.org/2000/svg"');
        if (!corrected.includes('xmlns=')) corrected = corrected.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        
        const img = new Image();
        const src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(corrected)))}`;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const aspectRatio = img.height / img.width || 1;
            const width = MAX_WIDTH;
            const height = Math.round(width * aspectRatio);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
        };
        img.onerror = () => reject(new Error("SVG Load Failed"));
        img.src = src;
    });
}

const formatCellContent = (text) => {
    if (!text) return '';
    let formatted = text
        .replace(/\\n/g, '<br/>')      
        .replace(/\n/g, '<br/>')       
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
        .replace(/\*(.*?)\*/g, '<i>$1</i>');    
    return marked.parseInline(formatted);
};

const forceParseMarkdownTable = (text) => {
    if (!text) return text;
    if (text.includes('<table') && (text.includes('inner-table') || text.includes('border='))) return text;

    const lines = text.replace(/<br\s*\/?>/gi, '\n').split('\n');
    let processedLines = [];
    let tableBuffer = [];
    
    const isRow = (line) => line.trim().startsWith('|') || (line.includes('|') && line.trim().length > 5);
    const isSeparator = (line) => /^\|?[\s:-]+\|[\s:-]+\|?$/.test(line.trim());

    const renderBuffer = (rows) => {
         if (!rows.length) return '';
         const normalizedRows = rows.map(r => {
            let row = r.trim();
            if (!row.startsWith('|')) row = '|' + row;
            if (!row.endsWith('|')) row = row + '|';
            return row;
         });
         let maxCols = 0;
         const parsedRows = normalizedRows.map(r => {
            const cells = r.split('|').slice(1, -1);
            maxCols = Math.max(maxCols, cells.length);
            return cells;
         });

         let html = '<table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000;"><tbody>';
         parsedRows.forEach(cells => {
            html += '<tr>';
            while(cells.length < maxCols) cells.push('');
            cells.forEach(c => {
                html += `<td style="border: 1px solid #000; padding: 5px;">${formatCellContent(c)}</td>`;
            });
            html += '</tr>';
         });
         html += '</tbody></table>';
         return html;
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (isRow(line) && !isSeparator(line)) {
            tableBuffer.push(line);
        } else if (tableBuffer.length > 0 && line !== '' && !isRow(line)) {
            let lastRow = tableBuffer[tableBuffer.length - 1];
            if (lastRow.endsWith('|')) lastRow = lastRow.slice(0, -1);
            tableBuffer[tableBuffer.length - 1] = lastRow + " " + line + "|";
        } else {
            if (tableBuffer.length > 0) {
                processedLines.push(renderBuffer(tableBuffer));
                tableBuffer = [];
            }
            if (!isSeparator(line)) processedLines.push(line);
        }
    }
    if (tableBuffer.length > 0) processedLines.push(renderBuffer(tableBuffer));

    return processedLines.join('\n');
};

const preProcessHtmlForExport = (rawHtml) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

    // Inject styles to force word break
    const style = document.createElement('style');
    style.innerHTML = `
      table { width: 100% !important; table-layout: fixed; word-wrap: break-word; }
      td, th { word-wrap: break-word; word-break: break-all; white-space: normal; }
      img { max-width: 100%; height: auto; }
    `;
    tempDiv.insertBefore(style, tempDiv.firstChild);

    // Parse Markdown tables manually if needed
    const textNodes = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToReplace = [];
    while ((node = textNodes.nextNode())) {
        if (node.nodeValue.includes('|') && node.nodeValue.includes('---')) {
            if (!node.parentNode.closest('table')) nodesToReplace.push(node);
        }
    }
    nodesToReplace.forEach(node => {
        try {
            const htmlTable = forceParseMarkdownTable(node.nodeValue);
            if (htmlTable.includes('<table')) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = htmlTable;
                node.parentNode.replaceChild(wrapper, node);
            }
        } catch (e) { console.warn("Markdown conversion error", e); }
    });

    // Style cleanup
    tempDiv.querySelectorAll('[style]').forEach(el => {
        let style = el.getAttribute('style') || '';
        style = style.replace(/(width|min-width|max-width):\s*[\d\.]+(px|pt|em|rem);?/gi, '');
        if (el.tagName === 'TD' || el.tagName === 'TH') {
            style += '; word-break: break-all; word-wrap: break-word;';
        }
        el.setAttribute('style', style);
    });
    
    // Safety check for all TD/TH without style
    tempDiv.querySelectorAll('td:not([style]), th:not([style])').forEach(el => {
        el.setAttribute('style', 'word-break: break-all; word-wrap: break-word;');
    });

    // Clean images
    tempDiv.querySelectorAll('img').forEach(img => {
        img.removeAttribute('width'); img.removeAttribute('height');
        img.style.maxWidth = '400px'; 
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px auto';
    });

    // Format tables for PDFMake
    const tables = Array.from(tempDiv.querySelectorAll('table'));
    tables.forEach(table => {
        table.setAttribute('border', '1');
        table.style.width = '100%';
        table.style.border = '1px solid #000'; 
        table.style.marginBottom = '10px';

        const firstRow = table.querySelector('tr');
        const hasTh = firstRow && firstRow.querySelector('th');
        const hasThead = table.querySelector('thead');

        if (hasTh && !hasThead) {
            const thead = document.createElement('thead');
            const tbody = table.querySelector('tbody') || document.createElement('tbody');
            thead.appendChild(firstRow);
            if (!table.querySelector('tbody')) {
                const remainingRows = Array.from(table.querySelectorAll('tr')); 
                remainingRows.forEach(row => {
                    if (row !== firstRow) tbody.appendChild(row);
                });
                table.appendChild(tbody);
            }
            table.insertBefore(thead, table.firstChild);
        }
    });

    return tempDiv;
};

const cleanUpPdfContent = (content, inTable = false, depth = 0, tableCols = 1) => {
    if (!content) return;

    if (Array.isArray(content)) {
        content.forEach((item, index) => {
            if (typeof item === 'string' && inTable) {
                content[index] = item.replace(/([^\s\u200B]{10})/g, "$1\u200B");
            } else {
                cleanUpPdfContent(item, inTable, depth, tableCols);
            }
        });
        return;
    }

    if (typeof content === 'object') {
        if (content.text && typeof content.text === 'string' && inTable) {
             content.text = content.text.replace(/([^\s\u200B]{10})/g, "$1\u200B");
        }

        if (content.content || content.stack) {
            const stack = content.content || content.stack;
            if (Array.isArray(stack)) {
                cleanUpPdfContent(stack, inTable, depth, tableCols);
            }
        }
        if (content.image) {
            const isMath = content.style && (
                            content.style === 'math-img' || 
                            (Array.isArray(content.style) && content.style.includes('math-img'))
                        );

            if (isMath) {
                if (!content.width || content.width === 'auto') {
                    content.width = 'auto'; 
                    content.fit = [100, 50]; 
                }
                content.margin = [0, 3, 0, 0]; 
                delete content.alignment;
            } else {
                const availablePageWidth = 480; 
                const calculatedMax = inTable ? (availablePageWidth / Math.max(1, tableCols)) - 20 : 400; 
                const finalMax = Math.max(40, calculatedMax);
                
                content.fit = [finalMax, 600];
                delete content.width; 
                delete content.height;
                content.alignment = 'center';
                content.margin = [0, 5, 0, 5]; 
            }
        }
        if (content.table) {
            delete content.width; 
            delete content.height;
            content.margin = [0, 5, 0, 5];

            const body = content.table.body;
            if (!Array.isArray(body) || body.length === 0) {
                content.table.body = [[{ text: '' }]];
            }

            content.table.body = content.table.body.filter(row => Array.isArray(row));

            const maxCols = content.table.body.reduce((max, row) => Math.max(max, row.length), 0);
            const safeMaxCols = maxCols > 0 ? maxCols : 1;

            // Fix rows that are shorter than max cols
            content.table.body.forEach(row => {
                while (row.length < safeMaxCols) {
                    row.push({ text: '', border: [true, true, true, true] });
                }
                row.forEach(cell => {
                    if (typeof cell === 'object') {
                        delete cell.width; 
                        cell.noWrap = false; 
                        cleanUpPdfContent(cell, true, depth + 1, safeMaxCols);
                    }
                });
            });

            const colWidth = 100 / safeMaxCols;
            content.table.widths = Array(safeMaxCols).fill(colWidth + '%');
        
            content.layout = {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#444', 
                vLineColor: () => '#444',
                paddingLeft: () => 2, 
                paddingRight: () => 2,
                paddingTop: () => 2, 
                paddingBottom: () => 2,
            };
        }
        if (content.ul) cleanUpPdfContent(content.ul, inTable, depth, tableCols);
        if (content.ol) cleanUpPdfContent(content.ol, inTable, depth, tableCols);
    }
};

// --- ANIMATION VARIANTS ---
const modalVariants = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", bounce: 0.2, duration: 0.5 } },
    exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.3 } },
};

const pageTransitionVariants = {
    hidden: { opacity: 0, x: 10, filter: "blur(4px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { ease: "circOut", duration: 0.3 } },
    exit: { opacity: 0, x: -10, filter: "blur(4px)", transition: { ease: "circIn", duration: 0.2 } },
};

const navMenuVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
    exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }
};

// --- HELPER: MONET EFFECT COLOR EXTRACTION ---
const getMonetStyle = (activeOverlay) => {
    if (activeOverlay === 'christmas') return { background: 'rgba(15, 23, 66, 0.95)', borderColor: 'rgba(100, 116, 139, 0.2)' }; 
    if (activeOverlay === 'valentines') return { background: 'rgba(60, 10, 20, 0.95)', borderColor: 'rgba(255, 100, 100, 0.15)' }; 
    if (activeOverlay === 'graduation') return { background: 'rgba(30, 25, 10, 0.95)', borderColor: 'rgba(255, 215, 0, 0.15)' }; 
    if (activeOverlay === 'rainy') return { background: 'rgba(20, 35, 20, 0.95)', borderColor: 'rgba(100, 150, 100, 0.2)' };
    if (activeOverlay === 'cyberpunk') return { background: 'rgba(20, 5, 30, 0.95)', borderColor: 'rgba(180, 0, 255, 0.2)' };
    if (activeOverlay === 'spring') return { background: 'rgba(50, 10, 20, 0.95)', borderColor: 'rgba(255, 150, 180, 0.2)' };
    if (activeOverlay === 'space') return { background: 'rgba(5, 5, 10, 0.95)', borderColor: 'rgba(100, 100, 255, 0.15)' };
    return {}; 
};

function StudentViewLessonModal({ isOpen, onClose, onComplete, lesson, userId, className }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [maxPageReached, setMaxPageReached] = useState(0);
    const [xpAwarded, setXpAwarded] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isPageNavOpen, setIsPageNavOpen] = useState(false);
    
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); 
    const monetStyle = getMonetStyle(activeOverlay); 

    const contentRef = useRef(null);
    const lessonPageRef = useRef(null);

    useEffect(() => { setCurrentLesson(lesson); }, [lesson]);
    
    useEffect(() => { 
        if (isOpen) { 
            setCurrentPage(0); 
            setMaxPageReached(0); 
            setXpAwarded(false);
            setIsPageNavOpen(false);
            if (contentRef.current) contentRef.current.scrollTop = 0; 
        } 
    }, [isOpen]);

    useEffect(() => { 
        if (currentPage > maxPageReached) setMaxPageReached(currentPage); 
    }, [currentPage, maxPageReached]);

    const lessonTitle = currentLesson?.lessonTitle || currentLesson?.title || 'Untitled Lesson';
    const pages = currentLesson?.pages || [];
    const objectives = currentLesson?.learningObjectives || currentLesson?.objectives || [];
    const totalPages = pages.length;
    const objectivesLabel = currentLesson?.language === 'Filipino' ? "Mga Layunin" : "Objectives";
    const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
    const pageData = pages[currentPage];

    const scrollToTop = () => { if(contentRef.current) contentRef.current.scrollTop = 0; };

    const goToNextPage = useCallback(() => { 
        if (currentPage < totalPages - 1) { 
            setCurrentPage(p => p + 1); 
            scrollToTop();
        } 
    }, [currentPage, totalPages]);

    const goToPreviousPage = useCallback(() => { 
        if (currentPage > 0) { 
            setCurrentPage(p => p - 1); 
            scrollToTop();
        } 
    }, [currentPage]);

    const jumpToPage = (index) => {
        setCurrentPage(index);
        setIsPageNavOpen(false);
        scrollToTop();
    };

    const handleFinishLesson = async () => {
        if (xpAwarded) {
            handleClose();
            return;
        }
        if (!onComplete || totalPages === 0 || currentPage < totalPages - 1) return;
        try {
            await onComplete({ pagesRead: maxPageReached + 1, totalPages, isFinished: true, lessonId: currentLesson?.id || null });
            setXpAwarded(true); 
        } catch (error) { 
            showToast("Failed to finalize lesson progress.", "error"); 
        }
    };

    const handleClose = () => {
        if (!xpAwarded && onComplete && totalPages > 0) {
            onComplete({ pagesRead: maxPageReached + 1, totalPages, isFinished: currentPage === totalPages - 1, lessonId: currentLesson?.id || null });
        }
        onClose();
    };

    useEffect(() => { 
        const handleKeyDown = (e) => { 
            if (!isOpen) return; 
            if (e.key === 'ArrowRight') goToNextPage(); 
            else if (e.key === 'ArrowLeft') goToPreviousPage(); 
            else if (e.key === 'Escape') {
                if(isPageNavOpen) setIsPageNavOpen(false);
                else handleClose();
            }
        }; 
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); 
    }, [isOpen, goToNextPage, goToPreviousPage, handleClose, isPageNavOpen]);

    // --- REFINED PDF EXPORT (Matches UnitAccordion) ---
	const handleExportLessonPdf = async (lessonToExport) => {
	    if (exportingLessonId) return;
	    setExportingLessonId(lessonToExport.id);
        
        // Define sizes (Student view always standard A4 lesson)
        const pageSize = 'A4';
        const pageMargins = [40, 80, 40, 60];

	    showToast("Preparing PDF...", "info");
	    try {
            await registerDejaVuFonts();
            
            const headerBase64 = await fetchImageAsBase64("/header-port.png");
            const footerBase64 = await fetchImageAsBase64("/Footer.png");

			const lessonTitleToExport = lessonToExport.lessonTitle || lessonToExport.title || 'Untitled Lesson';
	        let safeTitle = lessonTitleToExport.replace(/[^a-zA-Z0-9.-_]/g, '_').substring(0, 200);
			const sanitizedFileName = (safeTitle || 'lesson') + '.pdf';
	        
            let lessonContent = [];
            let collectedImages = {}; 

	        for (const page of lessonToExport.pages) {
	            const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
	            
                if (cleanTitle) {
                    lessonContent.push({ text: cleanTitle, fontSize: 16, bold: true, color: '#005a9c', margin: [0, 10, 0, 5] });
                }

                // --- HANDLE OBJECT CONTENT (IMAGES/DIAGRAMS) ---
                if (typeof page.content === 'object' && page.content !== null) {
                    // 1. Handle Images (Diagrams)
                    const imageUrls = page.content.imageUrls || (page.content.generatedImageUrl ? [page.content.generatedImageUrl] : []);
                    
                    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
                         for (const url of imageUrls) {
                             if(!url) continue;
                             try {
                                 const base64 = await fetchImageAsBase64(url);
                                 if(base64) {
                                     lessonContent.push({
                                         image: base64,
                                         width: 450, 
                                         alignment: 'center',
                                         margin: [0, 10, 0, 5]
                                     });
                                 }
                             } catch (e) {
                                 console.warn("Failed to load lesson image", url);
                             }
                         }
                    }

                    // 2. Handle Caption
                    if (page.caption) {
                         let captionHtml = marked.parse(processLatex(page.caption));
                         const processedCaption = preProcessHtmlForExport(captionHtml);
                         const pdfCaption = htmlToPdfmake(processedCaption.innerHTML, { 
                             defaultStyles: { fontSize: 10, alignment: 'center', color: '#444' } 
                         });
                         
                         let captionBody = pdfCaption.content || pdfCaption;
                         if(Array.isArray(captionBody)) lessonContent.push(...captionBody);
                         else lessonContent.push(captionBody);
                    }
                } else {
                    // --- HANDLE TEXT/HTML CONTENT ---
                    const contentString = typeof page.content === 'string' ? page.content : '';
                    const rawHtml = marked.parse(processLatex(contentString));
                    const processedDiv = preProcessHtmlForExport(rawHtml);
                    
                    // Pre-fetch images in HTML
                    const htmlImages = processedDiv.querySelectorAll('img');
                    if (htmlImages.length > 0) {
                        await Promise.all(Array.from(htmlImages).map(async (img) => {
                            if (img.src && img.src.startsWith('http')) {
                                try {
                                    const base64 = await fetchImageAsBase64(img.src);
                                    img.src = base64; 
                                } catch (err) { console.warn("Failed to load image:", img.src); }
                            }
                        }));
                    }

                    const pdfResult = htmlToPdfmake(processedDiv.innerHTML, { 
                        defaultStyles: { 
                            fontSize: 11, 
                            lineHeight: 1.5, 
                            color: '#333333', 
                            alignment: 'justify' 
                        },
                        customStyles: {
                            'math-img': { margin: [0, 0, 0, 0] }
                        },
                        tableAutoSize: false,
                        imagesByReference: true
                    });

                    let pageBody = pdfResult.content || pdfResult;
                    if (pdfResult.images) {
                        Object.assign(collectedImages, pdfResult.images);
                    }
                    if (!Array.isArray(pageBody)) pageBody = [pageBody];

                    cleanUpPdfContent(pageBody, false, 0);

                    if (pageBody.length > 0) {
                        lessonContent.push(...pageBody);
                    }
                }
	        }

	        const docDefinition = {
	            pageSize: pageSize, pageMargins: pageMargins,
	            header: headerBase64 ? { margin: [0, 10, 0, 0], stack: [{ image: "headerImg", width: 450, alignment: "center" }] } : undefined,
	            footer: footerBase64 ? { margin: [0, 0, 0, 20], stack: [{ image: "footerImg", width: 450, alignment: "center" }] } : undefined,
                defaultStyle: { font: 'DejaVu', fontSize: 11 },
	            content: [
	                { text: lessonTitleToExport, fontSize: 32, bold: true, alignment: "center", margin: [0, 200, 0, 0] },
                    { text: "SRCS Learning Portal", fontSize: 18, italics: true, color: '#555555', alignment: "center", margin: [0, 0, 0, 0], pageBreak: "after" },
	                ...lessonContent
	            ],
	            images: { 
                    ...collectedImages,
                    ...(headerBase64 ? { headerImg: headerBase64 } : {}),
                    ...(footerBase64 ? { footerImg: footerBase64 } : {})
                }
	        };

	        const pdfDoc = pdfMake.createPdf(docDefinition);
            if (isNativePlatform()) {
                pdfDoc.getBlob(async (blob) => { await nativeSave(blob, sanitizedFileName, 'application/pdf', showToast); setExportingLessonId(null); });
            } else {
				pdfDoc.download(sanitizedFileName, () => { setExportingLessonId(null); });
            }
	    } catch (error) { 
            console.error("Failed to export PDF:", error); 
            showToast("Error creating PDF.", "error"); 
            setExportingLessonId(null); 
        }
	};

    if (!isOpen || !currentLesson) return null;

    // --- DESIGN CONSTANTS ---
    const glassPanelClass = !monetStyle.background 
        ? "bg-white/90 dark:bg-[#121212]/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-2xl"
        : "backdrop-blur-2xl shadow-2xl border border-white/10"; 
    
    return (
        <Dialog open={isOpen} onClose={handleClose} className={`fixed inset-0 z-[50] flex items-center justify-center font-sans ${className}`}>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" 
            />
            
            <Dialog.Panel 
                as={motion.div} 
                variants={modalVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                style={monetStyle} 
                className={`relative w-full max-w-6xl h-[100dvh] md:h-[90vh] flex flex-col overflow-hidden md:rounded-[2.5rem] ${glassPanelClass}`}
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100/10 z-20">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
                    />
                </div>

                <header className="relative z-20 flex justify-between items-center px-4 py-3 sm:px-8 sm:py-5 border-b border-slate-200/50 dark:border-white/5 flex-shrink-0 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        <Dialog.Title className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate tracking-tight">
                            {lessonTitle}
                        </Dialog.Title>
                        
                        <button 
                            onClick={() => setIsPageNavOpen(!isPageNavOpen)}
                            className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit"
                        >
                            <span>{totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'Empty'}</span>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isPageNavOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => currentLesson.studyGuideUrl ? window.open(currentLesson.studyGuideUrl, '_blank') : handleExportLessonPdf(currentLesson)}
                            disabled={!!exportingLessonId}
                            className="
                                flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl 
                                text-[10px] sm:text-xs font-bold transition-all duration-200
                                text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 
                                hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-500/30
                                disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
                            "
                            title={currentLesson.studyGuideUrl ? "Download Study Guide" : "Export as PDF"}
                        >
                            <ArrowDownTrayIcon className={`w-4 h-4 sm:w-4 sm:h-4 stroke-2 ${exportingLessonId ? 'animate-bounce' : ''}`} />
                            <span className="hidden sm:inline font-bold uppercase tracking-wider">
                                {currentLesson.studyGuideUrl ? 'Guide' : (exportingLessonId ? 'Saving...' : 'PDF')}
                            </span>
                        </button>

                        <button onClick={handleClose} className="p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all">
                            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-2" />
                        </button>
                    </div>

                    <AnimatePresence>
                        {isPageNavOpen && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-10 bg-black/10 backdrop-blur-[1px]" 
                                    onClick={() => setIsPageNavOpen(false)}
                                />
                                <motion.div 
                                    variants={navMenuVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="absolute top-full left-4 sm:left-8 mt-2 w-64 p-3 rounded-2xl bg-white/90 dark:bg-[#1a1d24]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl z-20"
                                >
                                    <div className="flex items-center gap-2 mb-2 px-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        <Squares2X2Icon className="w-3 h-3" />
                                        Jump to page
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                        {pages.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => jumpToPage(idx)}
                                                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                                                    currentPage === idx
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </header>
                
                <main ref={contentRef} className="flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center p-4 sm:p-6 md:p-10 pb-20 sm:pb-10 relative bg-[#f8f9fa] dark:bg-transparent">
                    <div className="w-full max-w-4xl flex-grow">
                        <AnimatePresence initial={false} mode="wait">
                            <motion.div 
                                key={currentPage} 
                                variants={pageTransitionVariants} 
                                initial="hidden" 
                                animate="visible" 
                                exit="exit" 
                                className="w-full min-h-full"
                            >
                                {currentPage === 0 && objectives.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm"
                                    >
                                        <h3 className="flex items-center gap-3 text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">
                                            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                                                <QueueListIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                                            </div>
                                            {objectivesLabel}
                                        </h3>
                                        <ul className="grid gap-3 sm:gap-4 text-xs sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                            {objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-3 sm:gap-4">
                                                    <CheckCircleSolid className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1"><ContentRenderer text={objective} /></div>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}

                                {pageData ? (
                                    <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-justify [&_p]:indent-8">
                                        {pageData.title && (
                                            <motion.h1 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 sm:mb-8 tracking-tight leading-tight text-left indent-0"
                                            >
                                                {pageData.title}
                                            </motion.h1>
                                        )}
                                        
                                        <LessonPage
                                            ref={lessonPageRef}
                                            page={pageData}
                                            isEditable={false} 
                                            isFinalizing={false} 
                                        />
                                    </article>
                                ) : (
                                    currentPage === 0 && objectives.length > 0 ? null : ( 
                                        <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 h-64">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                                <QuestionMarkCircleIcon className="w-8 h-8 sm:w-10 sm:w-10 opacity-50 stroke-1" />
                                            </div>
                                            <p className="text-sm sm:text-lg font-medium">This page is empty.</p>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
                
                <footer className="absolute bottom-0 left-0 right-0 sm:static flex-shrink-0 py-4 sm:py-5 px-6 border-t border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl flex justify-center items-center z-20">
                    <div className="flex items-center gap-2 sm:gap-4 p-1.5 sm:p-2 pl-2 sm:pl-3 pr-2 sm:pr-3 bg-white dark:bg-white/5 backdrop-blur-xl rounded-full shadow-lg border border-slate-100 dark:border-white/10">
                        <button 
                            onClick={goToPreviousPage} 
                            disabled={currentPage === 0} 
                            className="p-2 sm:p-2.5 rounded-full transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 bg-white/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 stroke-2" />
                        </button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                        <button
                            onClick={currentPage < totalPages - 1 ? goToNextPage : (xpAwarded ? handleClose : handleFinishLesson)}
                            className={`
                                flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm text-white shadow-md transition-all active:scale-95
                                ${currentPage < totalPages - 1 
                                    ? 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:scale-105' 
                                    : xpAwarded 
                                        ? 'bg-green-500 hover:bg-green-600' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }
                                ${totalPages === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <span>{currentPage < totalPages - 1 ? 'Next' : xpAwarded ? 'Done' : 'Finish'}</span>
                            {currentPage < totalPages - 1 
                                ? <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4 stroke-2" /> 
                                : xpAwarded ? <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 stroke-2" /> : <CheckCircleSolid className="h-3 w-3 sm:h-4 sm:w-4" />
                            }
                        </button>
                    </div>
                </footer>
            </Dialog.Panel>
        </Dialog>
    );
}
export default React.memo(StudentViewLessonModal);