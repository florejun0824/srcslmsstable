// src/components/teacher/UnitAccordion.jsx
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
// --- NEW IMPORT FOR ULP EXPORT ---
import { asBlob } from 'html-docx-js-typescript'; 
// ---------------------------------
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    SparklesIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    Bars3Icon,
    RectangleStackIcon,
    QueueListIcon,
    ArrowsUpDownIcon,
    EllipsisVerticalIcon,
    CloudArrowUpIcon,
    ChevronRightIcon,
    FolderIcon,
    XMarkIcon,       
    PlayCircleIcon   
} from '@heroicons/react/24/solid';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { marked } from 'marked';
import { useToast } from '../../contexts/ToastContext';
import htmlToDocx from 'html-to-docx-ts';
import htmlToPdfmake from 'html-to-pdfmake';
import { saveAs } from "file-saver";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts;

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';


// --- STYLES ---
const performanceStyles = {
    touchAction: 'none',
    backfaceVisibility: 'hidden', 
};

// Base Candy Button
const candyBase = `
    relative overflow-hidden font-bold rounded-full transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 
    active:scale-95 tracking-wide shadow-lg hover:shadow-xl
    after:absolute after:inset-0 after:rounded-full after:pointer-events-none 
    after:shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]
`;

// Helper to get button/card classes based on monet presence
const getStyles = (monet) => {
    if (monet) {
        return {
            primaryButton: `${candyBase} ${monet.buttonPrimary}`,
            secondaryButton: `${candyBase} ${monet.buttonSecondary}`,
            iconButton: `${candyBase} p-2 rounded-full aspect-square ${monet.buttonSecondary}`,
            unitCard: `${monet.cardGradient} border border-white/20 text-white shadow-xl hover:-translate-y-1 hover:shadow-2xl`,
            contentItem: `${monet.buttonSecondary} !justify-start !rounded-[1.5rem] md:!rounded-[2rem] border-white/10 hover:border-white/30`
        };
    }
    // Default Candy Styles
    return {
        primaryButton: `${candyBase} bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-300 hover:to-blue-500 text-white shadow-blue-500/40 border-b-[2px] border-blue-700`,
        secondaryButton: `${candyBase} bg-gradient-to-b from-white/80 to-white/40 dark:from-slate-700/80 dark:to-slate-800/40 backdrop-blur-md text-slate-700 dark:text-white border border-white/40 dark:border-white/10 shadow-slate-200/50 dark:shadow-black/30 hover:bg-white/60 dark:hover:bg-slate-700/60`,
        iconButton: `${candyBase} p-2 rounded-full aspect-square bg-gradient-to-b from-white/90 to-slate-100/50 dark:from-slate-700 to-slate-800 text-slate-500 dark:text-slate-300 hover:text-blue-500 border border-white/50 dark:border-white/5`,
        unitCard: null, 
        contentItem: `bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-2xl border border-white/50 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/50 text-slate-800 dark:text-slate-100`
    };
};

// --- HELPER FUNCTIONS (Export Logic) ---
const isNativePlatform = () => Capacitor.isNativePlatform();

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const base64Data = reader.result.toString().split(',')[1];
      base64Data ? resolve(base64Data) : reject(new Error("Failed to convert blob."));
    };
    reader.readAsDataURL(blob);
  });
};

const nativeSave = async (blob, fileName, mimeType, showToast) => {
  if (!isNativePlatform()) return;
  try {
    const base64Data = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
      recursive: true
    });
    showToast(`Opening file...`, 'info');
    await FileOpener.open({ filePath: result.uri, contentType: mimeType });
  } catch (error) {
    showToast(`Error saving: ${error.message}`, 'error');
  }
};

async function loadFontToVfs(name, url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  pdfMake.vfs[name] = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
}

// --- UPDATED FONT REGISTRATION ---
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
      Arial: dejaVuConfig,
      Helvetica: dejaVuConfig
    };
    
    dejaVuLoaded = true;
  } catch (e) { console.error("Font load error", e); }
}

const processLatex = (text) => {
    if (!text) return '';

    let processed = text
        .replace(/\\degree/g, '°')
        .replace(/\\angle/g, '∠')
        .replace(/\\vec\{(.*?)\}/g, (_, c) => c.split('').map(x => x + '\u20D7').join(''));

		const latexToImg = (match, code) => {
		    const cleanCode = code.trim();

		    // Render at exact final pixel size
		    // 250 dpi visual sharpness ≈ 3× normal size
		    const url = `https://latex.codecogs.com/png.latex?\\dpi{1080}\\bg_white\\color{black} ${encodeURIComponent(cleanCode)}`;

		    return `<img src="${url}" class="math-img" />`;
		};
		


    return processed
        .replace(/\$\$(.*?)\$\$/g, latexToImg) 
        .replace(/\$(.*?)\$/g, latexToImg);    
};
// --- NEW HELPER: Get Image Dimensions ---
const getImageDimensions = (base64) => {
    return new Promise((resolve) => {
        const i = new Image();
        i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
        i.src = base64;
    });
};
async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

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

// --- HELPER: Cell Formatter ---
const formatCellContent = (text) => {
    if (!text) return '';
    let formatted = text
        .replace(/\\n/g, '<br/>')      
        .replace(/\n/g, '<br/>')       
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
        .replace(/\*(.*?)\*/g, '<i>$1</i>');    
    return marked.parseInline(formatted);
};

// --- HELPER: Smart Markdown Table Parser ---
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

// --- HELPER: Pre-process HTML ---
const preProcessHtmlForExport = (rawHtml, mode = 'pdf') => {

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

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

    tempDiv.querySelectorAll('[style]').forEach(el => {
        let style = el.getAttribute('style') || '';
        style = style.replace(/(width|min-width|max-width):\s*[\d\.]+(px|pt|em|rem);?/gi, '');
        el.setAttribute('style', style);
    });
    tempDiv.querySelectorAll('[width]').forEach(el => el.removeAttribute('width'));
    tempDiv.querySelectorAll('img').forEach(img => {
        img.removeAttribute('width'); img.removeAttribute('height');
        img.style.maxWidth = '400px'; 
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px auto';
    });

    const tables = Array.from(tempDiv.querySelectorAll('table'));

    tables.forEach(table => {
        table.setAttribute('border', '1');
        table.setAttribute('cellpadding', '5');
        table.setAttribute('cellspacing', '0');
        
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        table.style.border = '1px solid #000'; 
        table.style.marginBottom = '10px';
        table.style.pageBreakInside = 'auto'; 

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

        table.querySelectorAll("thead").forEach(thead => {
            thead.style.display = "table-header-group"; 
        });

        table.querySelectorAll("th").forEach(th => {
            th.setAttribute('border', '1'); 
            th.style.border = "1px solid #000"; 
            th.style.padding = "5px";
            th.style.backgroundColor = "#e0e0e0";
            th.style.fontWeight = "bold";
            th.style.color = "#000";
        });

        table.querySelectorAll("td").forEach(td => {
            td.setAttribute('border', '1');
            td.style.border = "1px solid #000"; 
            td.style.padding = "5px";
            td.style.verticalAlign = "top";
            
            const hasNestedTable = td.querySelector('table');
            if (hasNestedTable) {
                td.style.padding = "2px"; 
                td.style.pageBreakInside = 'auto'; 
                
                hasNestedTable.setAttribute('border', '1');
                hasNestedTable.style.border = '1px solid #000';
                hasNestedTable.style.width = '100%';
            }
        });

        if (mode === 'ulp-pdf') { 
             const rows = Array.from(table.rows || []);
             const splitKeywords = [
                'PERFORMANCE TASK', 'SYNTHESIS', 'VALUES INTEGRATION',
                'DEEPEN', 'TRANSFER', 'MEANING-MAKING', 'APPLICATION',
                'FIRM-UP', 'EXPLORE'
             ];

            if (!table.parentNode.closest('table')) {
                 let currentTable = document.createElement('table');
                 currentTable.setAttribute('border', '1');
                 currentTable.setAttribute('width', '100%');
                 currentTable.style.width = '100%';
                 currentTable.style.borderCollapse = 'collapse';
                 currentTable.style.marginBottom = '8px'; 
                 
                 table.parentNode.insertBefore(currentTable, table);
                 let hasRows = false;

                 rows.forEach(row => {
                    const txt = (row.textContent || '').toUpperCase().trim();
                    const isSectionHeader = splitKeywords.some(keyword => txt.includes(keyword)) && txt.length < 150;

                    if (isSectionHeader) {
                        const headerDiv = document.createElement('h3');
                        headerDiv.style.backgroundColor = '#f0f0f0';
                        headerDiv.style.padding = '5px';
                        headerDiv.style.marginTop = '10px';
                        headerDiv.style.marginBottom = '5px';
                        headerDiv.style.border = '1px solid #000';
                        headerDiv.style.fontWeight = 'bold';
                        headerDiv.style.fontFamily = 'DejaVu Sans, Arial, sans-serif';
                        headerDiv.textContent = row.textContent.trim();
                        table.parentNode.insertBefore(headerDiv, table);

                        currentTable = document.createElement('table');
                        currentTable.setAttribute('border', '1');
                        currentTable.setAttribute('width', '100%');
                        currentTable.style.width = '100%';
                        currentTable.style.borderCollapse = 'collapse';
                        currentTable.style.marginBottom = '8px';
                        
                        const colGroup = document.createElement('colgroup');
                        colGroup.innerHTML = '<col style="width:30%"><col style="width:70%">';
                        currentTable.appendChild(colGroup);

                        table.parentNode.insertBefore(currentTable, table);
                        hasRows = false;
                    } else {
                        currentTable.appendChild(row.cloneNode(true));
                        hasRows = true;
                    }
                 });
                 table.remove();
                 if (!hasRows) currentTable.remove();
            }
        }
    });

    return tempDiv;
};

// --- HELPER: Sanitize PDF Structure ---
const cleanUpPdfContent = (content, inTable = false, depth = 0) => {
    if (!content) return;

    if (Array.isArray(content)) {
        content.forEach(item => cleanUpPdfContent(item, inTable, depth));
        return;
    }

    if (typeof content === 'object') {
        if (content.text) {
            if (content.fontSize && content.fontSize > 12) {
               content.margin = [0, 5, 0, 5];
            } else {
               content.margin = [0, 2, 0, 2]; 
            }
        }
        if (content.content || content.stack) {
            const stack = content.content || content.stack;
            if (Array.isArray(stack)) {
                cleanUpPdfContent(stack, inTable, depth);
            }
            delete content.margin;
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
			                const maxWidth = inTable ? 120 : 400; 
			                content.fit = [maxWidth, 600];
			                delete content.width; 
			                delete content.height;
			                content.alignment = 'center';
			                content.margin = [0, 5, 0, 5]; 
			            }
					}
        else if (content.columns) {
            if (Array.isArray(content.columns)) {
                content.columns = content.columns.filter(col => col);
                content.columns.forEach(col => {
                    col.width = '*'; 
                    cleanUpPdfContent(col, inTable, depth);
                });
            } else { delete content.columns; }
            delete content.columnGap;
            delete content.margin; 
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

            content.table.body.forEach(row => {
                while (row.length < safeMaxCols) {
                    row.push({ text: '', border: [true, true, true, true] });
                }
                row.forEach(cell => {
                    if (typeof cell === 'object') {
                        delete cell.width; 
                        cleanUpPdfContent(cell, true, depth + 1);
                    }
                });
            });

            if (depth === 0 && safeMaxCols === 2) {
                content.table.widths = ['30%', '70%']; 
            } else {
                content.table.widths = Array(safeMaxCols).fill('*');
            }
        
            content.layout = {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#444', 
                vLineColor: () => '#444',
                paddingLeft: () => 3,
                paddingRight: () => 3,
                paddingTop: () => 2, 
                paddingBottom: () => 2,
            };
        }

        if (content.ul) {
            cleanUpPdfContent(content.ul, inTable, depth);
            content.margin = [0, 2, 0, 5]; 
        }
        if (content.ol) {
            cleanUpPdfContent(content.ol, inTable, depth);
            content.margin = [0, 2, 0, 5];
        }
    }
};

// --- LAZY RETRY HELPER ---
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

const AddLessonModal = lazyWithRetry(() => import('./AddLessonModal'));
const AddQuizModal = lazyWithRetry(() => import('./AddQuizModal'));
const EditLessonModal = lazyWithRetry(() => import('./EditLessonModal'));
const ViewLessonModal = lazyWithRetry(() => import('./ViewLessonModal'));
const EditUnitModal = lazyWithRetry(() => import('./EditUnitModal'));
const EditQuizModal = lazyWithRetry(() => import('./EditQuizModal.jsx'));
const ViewQuizModal = lazyWithRetry(() => import('./ViewQuizModal'));
const AiQuizModal = lazyWithRetry(() => import('./AiQuizModal'));
const AiGenerationHub = lazyWithRetry(() => import('./AiGenerationHub'));

// Skeleton
const ContentListSkeleton = () => (
    <div className="flex flex-col gap-4 animate-pulse">
        {[1,2,3].map(i => (
            <div key={i} className="h-32 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
        ))}
    </div>
);

// Menus
const MenuPortal = ({ children, menuStyle, onClose, monet }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handler = (e) => { 
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose(); 
            }
        };
        window.addEventListener('mousedown', handler); 
        window.addEventListener('scroll', onClose, true);
        return () => {
            window.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [onClose]);
    
    const containerClass = monet 
        ? `fixed z-[9999] backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/10 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 bg-[#1E212B]/90 border border-white/10`
        : `fixed z-[9999] bg-white/90 dark:bg-[#1E212B]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 border border-white/20 dark:border-white/5`;

    return createPortal(
        <div ref={menuRef} style={menuStyle} className={containerClass}>
            {children}
        </div>, 
        document.body
    );
};
const MenuContext = React.createContext(() => {});
const ActionMenu = ({ children, monet, styles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const iconRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (isOpen) { setIsOpen(false); return; }
        const rect = iconRef.current.getBoundingClientRect();
        const screenHeight = window.innerHeight;
        const spaceBelow = screenHeight - rect.bottom;
        const shouldFlip = spaceBelow < 220; 
        let newStyle = { right: `${window.innerWidth - rect.right}px`, minWidth: '180px', position: 'fixed', zIndex: 9999 };
        if (shouldFlip) { newStyle.bottom = `${screenHeight - rect.top + 5}px`; newStyle.transformOrigin = 'bottom right'; } 
        else { newStyle.top = `${rect.bottom + 5}px`; newStyle.transformOrigin = 'top right'; }
        setMenuStyle(newStyle);
        setIsOpen(true);
    };
    const closeMenu = () => setIsOpen(false);
    return (
        <>
            <div ref={iconRef} onClick={handleToggle} className={`${styles.iconButton} relative z-20 cursor-pointer`}>
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={closeMenu} monet={monet}><MenuContext.Provider value={closeMenu}>{children}</MenuContext.Provider></MenuPortal>}
        </>
    );
};
const MenuItem = ({ icon: Icon, text, onClick, disabled, loading, monet }) => {
    const closeMenu = React.useContext(MenuContext);
    const handleClick = (e) => {
        if (disabled || loading) return;
        if (onClick) onClick(e);
        if (closeMenu) closeMenu();
    };
    return (
        <button onClick={handleClick} disabled={disabled || loading} className={`flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${monet ? 'hover:bg-white/10 text-white' : 'hover:bg-blue-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'}`}>
            <Icon className={`h-4 w-4 mr-3 ${loading ? 'animate-spin text-blue-500' : (monet ? 'text-white/60' : 'text-slate-400')}`} />
            {text}
        </button>
    );
};

const AddContentButton = ({ onAddLesson, onAddQuiz, monet, styles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);
    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({ top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px`, minWidth: '180px' });
        setIsOpen(!isOpen);
    };
    
    const handleAddLesson = () => { onAddLesson(); setIsOpen(false); };
    const handleAddQuiz = () => { onAddQuiz(); setIsOpen(false); };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${styles.primaryButton} !px-3 !py-1.5 text-xs md:text-sm`}>
                <PlusIcon className="w-4 h-4" /> <span className="hidden md:inline">Add Content</span> <span className="md:hidden">Add</span>
            </button>
            {isOpen && <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)} monet={monet}>
                <MenuItem icon={DocumentTextIcon} text="Add Lesson" onClick={handleAddLesson} monet={monet} />
                <MenuItem icon={ClipboardDocumentListIcon} text="Add Quiz" onClick={handleAddQuiz} monet={monet} />
            </MenuPortal>}
        </>
    );
};

// --- EXPORT TUTORIAL MODAL ---
const ExportTutorialModal = ({ isOpen, onClose, onConfirm, monet }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`
                w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden
                flex flex-col
                ${monet ? 'bg-[#1E212B] border border-white/10' : 'bg-white dark:bg-[#1E212B]'}
            `}>
                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${monet ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        <PlayCircleIcon className="w-6 h-6 text-blue-500" />
                        Fixing Table Layouts
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <XMarkIcon className={`w-6 h-6 ${monet ? 'text-white/60' : 'text-gray-500'}`} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="mb-4">
                        <p className={`text-sm mb-4 ${monet ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'}`}>
                            Large tables in ULP/ATG documents may look cut off in Microsoft Word. 
                            <br/>
                            <strong>Please watch this quick fix (10s)</strong> to enable "Repeat Header Rows".
                        </p>
                        
                        <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video shadow-lg mb-4 ring-1 ring-white/10">
                            <video 
                                src="/table tutorial.mp4" 
                                className="w-full h-full object-contain"
                                controls
                                autoPlay
                                muted
                                loop
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>

                        <div className={`text-xs p-3 rounded-lg border ${monet ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'}`}>
                            <strong>Tip:</strong> In Word, Select Table Row → Layout → Properties → Row → Check "Repeat as header row at the top of each page".
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/5">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`
                            px-5 py-2 text-sm font-bold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all
                            ${monet ? monet.buttonPrimary : 'bg-blue-600 text-white hover:bg-blue-500'}
                        `}
                    >
                        I Understand, Download .docx
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- SORTABLE UNIT LIST ITEM ---
const SortableUnitListRow = memo(({ unit, onSelect, onAction, isReordering, index, monet, styles }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: unit.id, data: { type: 'unit' }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    
    const gradients = [
        "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600",
        "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500",
        "bg-gradient-to-br from-teal-400 via-emerald-500 to-green-600",
        "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500"
    ];

    const iconGradient = monet ? monet.cardGradient : gradients[index % gradients.length];
    
    const containerClasses = monet 
        ? `${monet.buttonSecondary} !justify-start !p-0 overflow-visible border-white/10 hover:border-white/30`
        : `bg-white dark:bg-[#15171B] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-lg dark:hover:shadow-black/40 hover:border-blue-400/30 dark:hover:border-white/10`;

    const rowClasses = isReordering 
        ? "opacity-70 bg-slate-50 border-2 border-dashed border-slate-300 dark:bg-slate-800 dark:border-slate-600"
        : `${containerClasses} rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 group`;

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="mb-4">
            <div 
                onClick={() => !isReordering && onSelect(unit)} 
                className={`relative w-full flex items-center p-3 md:p-4 ${rowClasses} ${!isReordering ? 'cursor-pointer active:scale-[0.99]' : ''}`}
            >
                {isReordering && (
                    <button {...listeners} className="p-2 mr-2 rounded-full bg-slate-100 dark:bg-slate-700 cursor-grab active:cursor-grabbing">
                        <ArrowsUpDownIcon className="h-5 w-5 text-slate-400" />
                    </button>
                )}

                <div className={`
                    h-14 w-14 md:h-16 md:w-16 flex-shrink-0 
                    rounded-[1rem] md:rounded-[1.3rem] 
                    flex items-center justify-center 
                    shadow-lg shadow-black/5
                    mr-4 md:mr-6
                    ${iconGradient}
                `}>
                    <FolderIcon className="h-7 w-7 md:h-8 md:w-8 text-white drop-shadow-md" />
                </div>

                <div className="flex-grow min-w-0 pr-2">
                    <h3 className={`
                        text-lg md:text-xl font-bold tracking-tight leading-tight truncate
                        ${monet ? 'text-white' : 'text-slate-800 dark:text-slate-100'}
                    `}>
                        {unit.title}
                    </h3>
                    <p className={`
                        text-xs md:text-sm font-medium mt-1 truncate
                        ${monet ? 'text-white/50' : 'text-slate-500 dark:text-slate-400'}
                    `}>
                        Tap to view contents
                    </p>
                </div>

                {!isReordering && (
                    <div className="flex items-center gap-2 md:gap-4">
                        <div onClick={(e) => e.stopPropagation()}>
                            <ActionMenu monet={monet} styles={styles}>
                                <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} monet={monet} />
                                <MenuItem icon={ArrowsUpDownIcon} text="Reorder" onClick={(e) => { e.stopPropagation(); onAction('reorder', unit); }} monet={monet} />
                                <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} monet={monet} />
                            </ActionMenu>
                        </div>
                        <div className={`
                            hidden md:flex h-10 w-10 rounded-full items-center justify-center 
                            transition-all duration-300
                            ${monet ? 'bg-white/10 group-hover:bg-white/20' : 'bg-slate-100 dark:bg-white/5 group-hover:bg-blue-50 dark:group-hover:bg-white/10'}
                        `}>
                            <ChevronRightIcon className={`w-5 h-5 ${monet ? 'text-white' : 'text-slate-400 group-hover:text-blue-500 dark:text-slate-400'}`} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => prev.unit.id === next.unit.id && prev.unit.title === next.unit.title && prev.isReordering === next.isReordering && prev.index === next.index && prev.monet === next.monet);


// --- SORTABLE CONTENT (LESSON) ROW ---
const SortableContentItem = memo(({ item, isReordering, onAction, exportingLessonId, isAiGenerating, monet, styles, isPdfDisabled }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id, data: { type: item.type, unitId: item.unitId }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    const isLesson = item.type === 'lesson';
    const Icon = isLesson ? DocumentTextIcon : ClipboardDocumentListIcon;

    const defaultTheme = isLesson 
        ? {
            iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-500/30',
            hoverBorder: 'hover:border-blue-400/30',
            activeRing: 'active:ring-blue-500/20',
            textTitle: 'group-hover:text-blue-600 dark:group-hover:text-blue-300'
          }
        : {
            iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-purple-500/30',
            hoverBorder: 'hover:border-purple-400/30',
            activeRing: 'active:ring-purple-500/20',
            textTitle: 'group-hover:text-purple-600 dark:group-hover:text-purple-300'
          };

    const monetIconBg = monet ? (isLesson ? monet.buttonPrimary : monet.buttonSecondary) : '';
    const monetHoverBorder = monet ? 'hover:border-white/30' : '';
    const monetTextTitle = monet ? 'text-white' : '';

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="mb-3 md:mb-4"> 
            <div 
                onClick={() => !isReordering && onAction('view', item)}
                className={`
                    relative group w-full flex items-center 
                    p-3 md:p-4 
                    rounded-[1.5rem] md:rounded-[2rem] 
                    transition-all duration-300 ease-out
                    md:hover:-translate-y-1 active:scale-[0.98]
                    ${styles.contentItem} 
                    ${monet ? monetHoverBorder : defaultTheme.hoverBorder} 
                    ${isReordering ? 'ring-2 ring-blue-500/50 bg-blue-50/50' : ''}
                `}
            >
                {isReordering && (
                    <button {...listeners} className="p-2 mr-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-grab active:cursor-grabbing">
                        <Bars3Icon className="w-5 h-5" />
                    </button>
                )}

                <div className={`
                    h-12 w-12 md:h-16 md:w-16 flex-shrink-0 
                    rounded-[1rem] md:rounded-[1.2rem] 
                    flex items-center justify-center 
                    mr-3 md:mr-5 
                    shadow-lg ring-2 md:ring-4 ring-white/50 dark:ring-white/5
                    ${monet ? monetIconBg : defaultTheme.iconBg}
                `}>
                    <Icon className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow-md stroke-[2]" />
                </div>

                <div className="flex-grow min-w-0 pr-2 md:pr-4">
                    <h4 className={`
                        font-bold text-[16px] md:text-[19px] 
                        tracking-tight leading-snug
                        transition-colors duration-300 
                        ${monet ? monetTextTitle : 'text-slate-800 dark:text-slate-100'}
                        ${!isReordering && !monet ? `cursor-pointer ${defaultTheme.textTitle}` : ''}
                    `}>
                        {item.title || 'Untitled'}
                    </h4>
                    {item.subtitle && (
                        <p className={`text-[12px] md:text-[14px] font-medium mt-0.5 line-clamp-1 ${monet ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
                            {item.subtitle}
                        </p>
                    )}
                </div>

                <div className={`
                    flex items-center gap-1 transition-all duration-300
                    ${isReordering ? 'opacity-0' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:translate-x-4 md:group-hover:translate-x-0'}
                `}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu monet={monet} styles={styles}>
                            <MenuItem icon={PencilIcon} text="Edit" onClick={() => onAction('edit', item)} monet={monet} />
                            {isLesson && (
                                <>
                                    {!isPdfDisabled && (
                                        <MenuItem 
                                            icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} 
                                            text={exportingLessonId === item.id ? "Exporting..." : "Export as PDF"} 
                                            onClick={() => onAction('exportPdf', item)} 
                                            loading={exportingLessonId === item.id} 
                                            monet={monet} 
                                        />
                                    )}
                                    <MenuItem 
                                        icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} 
                                        text={exportingLessonId === item.id ? "Exporting..." : "Export as .docx"} 
                                        onClick={() => onAction('exportDocx', item)} 
                                        loading={exportingLessonId === item.id} 
                                        monet={monet} 
                                    />
                                </>
                            )}
                            {isLesson && <MenuItem icon={SparklesIcon} text="AI Quiz" onClick={() => onAction('generateQuiz', item)} disabled={isAiGenerating} monet={monet} /> }
                            <MenuItem icon={TrashIcon} text="Delete" onClick={() => onAction('delete', item)} monet={monet} />
                        </ActionMenu>
                    </div>
                    <div className={`hidden md:flex h-10 w-10 rounded-full items-center justify-center ml-2 ${monet ? 'bg-white/10 text-white/50 group-hover:text-white' : 'bg-slate-100/50 dark:bg-white/5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                        <ChevronRightIcon className="w-5 h-5 stroke-[2.5]" />
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => 
    prev.item.id === next.item.id && 
    prev.item.title === next.item.title &&
    prev.item.subtitle === next.item.subtitle &&
    prev.isReordering === next.isReordering && 
    prev.exportingLessonId === next.exportingLessonId && 
    prev.monet === next.monet &&
    prev.isPdfDisabled === next.isPdfDisabled
);

// --- MAIN COMPONENT ---
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole, monet }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    
    // --- NEW STATE FOR TUTORIAL ---
    const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
    const [itemToExport, setItemToExport] = useState(null);
    // ----------------------------

    const styles = getStyles(monet);
    const { activeOverlay } = useTheme();
    const isExportingRef = useRef(false);

    // Modals
    const [addLessonModalOpen, setAddLessonModalOpen] = useState(false);
    const [addQuizModalOpen, setAddQuizModalOpen] = useState(false);
    const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
    const [viewLessonModalOpen, setViewLessonModalOpen] = useState(false);
    const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
    const [editQuizModalOpen, setEditQuizModalOpen] = useState(false);
    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);
    const [aiQuizModalOpen, setAiQuizModalOpen] = useState(false);
    const [isAiHubOpen, setIsAiHubOpen] = useState(false);

    // Context
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [unitForAi, setUnitForAi] = useState(null);
    const [lessonForAiQuiz, setLessonForAiQuiz] = useState(null);
    
    const { showToast } = useToast();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- CHECK FOR MATH 7-10 RESTRICTION ---
    const isPdfRestricted = useMemo(() => {
        if (!subject?.title) return false;
        
        const title = subject.title.toLowerCase();
        
        // 1. Check if it is a Mathematics subject
        const isMath = title.includes('math'); 
        
        // 2. Check if it is Grade 7, 8, 9, or 10
        // Matches "7", "8", "9", "10" as whole words (e.g., "Math 7", "Mathematics 10")
        const isTargetGrade = /\b(7|8|9|10)\b/.test(title) || 
                              (subject.gradeLevel && ['7','8','9','10'].includes(String(subject.gradeLevel)));

        return isMath && isTargetGrade;
    }, [subject]);
    // ---------------------------------------

    useEffect(() => {
        if (!subject?.id) { setUnits([]); return; }
        if (onSetActiveUnit) { onSetActiveUnit(null); }
        const q = query(collection(db, 'units'), where('subjectId', '==', subject.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetched.sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
            setUnits(fetched);
        });
        return () => unsubscribe();
    }, [subject?.id, onSetActiveUnit]);

    useEffect(() => {
        if (!subject?.id) { setAllLessons([]); setAllQuizzes([]); return; }
        const lq = query(collection(db, 'lessons'), where('subjectId', '==', subject.id));
        const qq = query(collection(db, 'quizzes'), where('subjectId', '==', subject.id));
        const unL = onSnapshot(lq, s => setAllLessons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unQ = onSnapshot(qq, s => setAllQuizzes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unL(); unQ(); };
    }, [subject?.id]);

	const handleExportDocx = async (lesson) => {
	        if (isExportingRef.current) return;
	        isExportingRef.current = true;
	        setExportingLessonId(lesson.id);

	        const isULP = lesson.contentType === 'teacherGuide';
	        const isATG = lesson.contentType === 'teacherAtg';
	        const isSpecialDoc = isULP || isATG;
	        const docLabel = isULP ? "ULP" : (isATG ? "ATG" : "Lesson");
	        const suffix = isULP ? "_ULP" : (isATG ? "_ATG" : "");
	        const pageSize = isSpecialDoc ? { width: 12240, height: 15840 } : 'A4';

	        showToast(`Generating ${docLabel} .docx...`, "info");

	        try {
	            const lessonTitle = lesson.lessonTitle || lesson.title || 'document';
	            const subjectTitle = subject?.title || "SRCS Learning Portal";
	            const sanitizedFileName = (lessonTitle.replace(/[\\/:"*?<>|]+/g, '_') || 'document') + suffix + '.docx';

	            const headerBase64 = await fetchImageAsBase64("/header-port.png").catch(() => null);
	            const footerBase64 = await fetchImageAsBase64("/Footer.png").catch(() => null);

	            // -------------------------------------------------------------
	            // ULP EXPORT LOGIC
	            // -------------------------------------------------------------
	            if (isULP || isATG) {
	                const headerBlock = headerBase64 ? `
	                    <div id="page-header" style="mso-element:header">
	                        <p class=MsoHeader align=center style='text-align:center'>
	                            <img width=650 height=100 src="${headerBase64}" align=center>
	                        </p>
	                    </div>` : '';

	                const footerBlock = footerBase64 ? `
	                    <div id="page-footer" style="mso-element:footer">
	                        <p class=MsoFooter align=center style='text-align:center'>
	                            <img width=650 height=50 src="${footerBase64}" align=center>
	                        </p>
	                    </div>` : '';

	                const pages = Array.isArray(lesson.pages) && lesson.pages.length ? lesson.pages : [{ title: lesson.title || '', content: lesson.content || lesson.html || '' }];
	                let mainContent = `
	                    <div class="doc-meta" style="text-align: center; margin-bottom: 20px; font-family: 'Arial', sans-serif;">
	                        <h1 style="font-size: 24pt; font-weight: bold; margin: 0; color: #000;">${lessonTitle}</h1>
	                        <p style="font-size: 14pt; font-style: italic; color: #666; margin: 10px 0;">${subjectTitle}</p>
	                        <p style="font-size: 10pt; color: #888;">${docLabel.toUpperCase()} DOCUMENT</p>
	                    </div>
	                    <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;" />
	                `;

	                for (const page of pages) {
	                    const cleanTitle = (page.title || '').replace(/^page\s*\d+\s*[:-]?\s*/i, '');
                    
	                    // 1. Process LaTeX
	                    const rawContent = processLatex(page.content || '');
                    
	                    // 2. Pre-process HTML
	                    const processedContent = preProcessHtmlForExport(rawContent, 'docx');

	// 3. FIX: SCALE MATH IMAGES DOWN & FIX INLINE DISPLAY
	                    const mathImages = processedContent.querySelectorAll('img.math-img');
	                    if (mathImages.length > 0) {
	                        await Promise.all(Array.from(mathImages).map(async (img) => {
	                            if (img.src && img.src.startsWith('http')) {
	                                try {
	                                    // 1. Force a lower DPI fetch to ensure Word doesn't see a huge bitmap
	                                    // Replace 1080 dpi with 200 dpi in the URL
	                                    let fetchUrl = img.src.replace(/dpi%7B1080%7D/g, 'dpi%7B200%7D')
	                                                          .replace(/dpi\{1080\}/g, 'dpi{200}');
                                    
	                                    const base64 = await fetchImageAsBase64(fetchUrl);
	                                    const { w, h } = await getImageDimensions(base64);

	                                    // 2. CRITICAL: Wipe the styles added by preProcessHtmlForExport
	                                    // This removes 'display: block', 'margin: 10px', and 'height: auto'
	                                    img.removeAttribute('style');
                                    
	                                    // 3. Scale Factor (Since we fetched at 200 DPI, we only need small scaling)
	                                    // 200 DPI / 96 DPI ≈ 2.1.  We use 2.5 to ensure it fits inline text.
	                                    const scaleFactor = 2.5; 

	                                    const scaledWidth = Math.max(1, Math.round(w / scaleFactor));
	                                    const scaledHeight = Math.max(1, Math.round(h / scaleFactor));

	                                    img.src = base64;
                                    
	                                    // 4. Set attributes AND inline styles for maximum compatibility
	                                    img.setAttribute('width', scaledWidth);
	                                    img.setAttribute('height', scaledHeight);
                                    
	                                    // Use 'vertical-align: middle' to keep math inline with text
	                                    img.style.cssText = `width: ${scaledWidth}px; height: ${scaledHeight}px; vertical-align: -10%; display: inline-block;`;

	                                } catch (err) { console.warn("Failed to download math image", err); }
	                            }
	                        }));
	                    }

	                    // 4. Handle SVGs
	                    const svgElements = processedContent.querySelectorAll('svg');
	                    if (svgElements.length > 0) {
	                        await Promise.all(Array.from(svgElements).map(async (svg) => {
	                            try {
	                                const { dataUrl, width, height } = await convertSvgStringToPngDataUrl(svg.outerHTML);
	                                const img = document.createElement('img');
	                                img.src = dataUrl;
	                                img.setAttribute('width', width);
	                                img.setAttribute('height', height);
	                                svg.parentNode.replaceChild(img, svg);
	                            } catch (err) { }
	                        }));
	                    }

	                    if (cleanTitle && !cleanTitle.includes('Unit Learning Plan') && !cleanTitle.includes('Adaptive Teaching Guide')) {
	                        mainContent += `<h2 style="color: #2563EB; font-size: 16pt; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px;">${cleanTitle}</h2>`;
	                    }
	                    mainContent += `<div class="content-section" style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;">${processedContent.innerHTML}</div><br/><br/>`;
	                }

	                const fullHtml = `
	                    <html xmlns:v="urn:schemas-microsoft-com:vml"
	                    xmlns:o="urn:schemas-microsoft-com:office:office"
	                    xmlns:w="urn:schemas-microsoft-com:office:word"
	                    xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
	                    xmlns="http://www.w3.org/TR/REC-html40">
	                    <head>
	                        <meta charset="utf-8">
	                        <title>${lessonTitle}</title>
	                        <style>
	                            @page Section1 { size: 8.5in 13in; margin: 1.0in 0.5in 0.5in 0.5in; mso-header-margin: 0.5in; mso-footer-margin: 0.5in; }
	                            div.Section1 { page: Section1; }
	                            body { font-family: 'Arial', sans-serif; }
	                            table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
	                            td, th { border: 1px solid black; padding: 8px; vertical-align: top; }
	                            th { background-color: #f0f0f0; font-weight: bold; }
	                            thead { display: table-header-group; }
	                            img { max-width: 100%; } /* General safeguard */
	                        </style>
	                    </head>
	                    <body>
	                        <div style="display:none;">${headerBlock}${footerBlock}</div>
	                        <div class="Section1">${mainContent}</div>
	                    </body>
	                    </html>
	                `;

	                const blob = await asBlob(fullHtml, {
	                    orientation: 'portrait',
	                    margins: { top: 1440, right: 720, bottom: 720, left: 720 }
	                });

	                if (isNativePlatform()) {
	                    await nativeSave(blob, sanitizedFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', showToast);
	                } else {
	                    saveAs(blob, sanitizedFileName);
	                }

	            } else {
	                // -------------------------------------------------------------
	                // REGULAR LESSON EXPORT (html-to-docx-ts)
	                // -------------------------------------------------------------
	                const headerHtml = headerBase64 
	                    ? `<p align="center" style="text-align: center; margin-bottom: 0;"><img src="${headerBase64}" width="650" style="width: 100%; max-width: 650px; height: auto;" /></p>` 
	                    : '';
	                const footerHtml = footerBase64 
	                    ? `<p align="center" style="text-align: center; margin-top: 0;"><img src="${footerBase64}" width="650" style="width: 100%; max-width: 650px; height: auto;" /></p>` 
	                    : '';

	                let legacyHtml = `
	                    <div style="font-family: 'DejaVu Sans', sans-serif; color: #333333;">
	                        <div style="min-height: 900px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
	                             <div>
	                                <h1 style="font-size: 32pt; font-weight: bold; margin-bottom: 20px; color: #000000;">${lessonTitle}</h1>
	                                <p style="font-size: 18pt; font-style: italic; color: #666666;">${subjectTitle}</p>
	                                <p style="font-size: 12pt; margin-top: 10px; color: #888;">${docLabel.toUpperCase()} DOCUMENT</p>
	                             </div>
	                        </div>
	                        <div style="page-break-after: always;"></div>
	                `;

	                const pages = Array.isArray(lesson.pages) && lesson.pages.length ? lesson.pages : [{ title: lesson.title || '', content: lesson.content || lesson.html || '' }];

	                for (const page of pages) {
	                    const cleanTitle = (page.title || '').replace(/^page\s*\d+\s*[:-]?\s*/i, '');
	                    const processedContent = processLatex(page.content || '');
	                    const rawHtml = marked.parse(processedContent);

	                    if (cleanTitle && !cleanTitle.includes('Unit Learning Plan') && !cleanTitle.includes('Adaptive Teaching Guide')) {
	                        legacyHtml += `<h2 style="color: #2563EB; font-size: 18pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; text-align: left;">${cleanTitle}</h2>`;
	                    }
	                    legacyHtml += `<div style="font-size: 11pt; line-height: 1.5; text-align: justify;">${rawHtml}</div><br />`;
	                }
	                legacyHtml += '</div>';

	                const processedDiv = preProcessHtmlForExport(legacyHtml, 'docx');

	// FIX: SCALE MATH IMAGES DOWN (REGULAR EXPORT)
	                const mathImages = processedDiv.querySelectorAll('img.math-img');
	                if (mathImages.length > 0) {
	                    await Promise.all(Array.from(mathImages).map(async (img) => {
	                        if (img.src && img.src.startsWith('http')) {
	                            try {
	                                // 1. Force Lower DPI (200 instead of 1080)
	                                let fetchUrl = img.src.replace(/dpi%7B1080%7D/g, 'dpi%7B200%7D')
	                                                      .replace(/dpi\{1080\}/g, 'dpi{200}');

	                                const base64 = await fetchImageAsBase64(fetchUrl);
	                                const { w, h } = await getImageDimensions(base64);
                                
	                                // 2. CRITICAL: Wipe conflicting styles
	                                img.removeAttribute('style');

	                                // 3. Scale Factor for 200 DPI
	                                const scaleFactor = 2.5; 
	                                const scaledWidth = Math.max(1, Math.round(w / scaleFactor));
	                                const scaledHeight = Math.max(1, Math.round(h / scaleFactor));

	                                img.src = base64;
	                                img.setAttribute('width', scaledWidth);
	                                img.setAttribute('height', scaledHeight);
                                
	                                // 4. Inline display styles
	                                img.style.cssText = `width: ${scaledWidth}px; height: ${scaledHeight}px; vertical-align: -10%; display: inline-block;`;
                                
	                            } catch (err) { console.warn("Failed to download math image", err); }
	                        }
	                    }));
	                }

	                // Handle SVGs
	                const svgElements = processedDiv.querySelectorAll('svg');
	                if (svgElements.length > 0) {
	                    await Promise.all(Array.from(svgElements).map(async (svg) => {
	                        try {
	                            const { dataUrl, width, height } = await convertSvgStringToPngDataUrl(svg.outerHTML);
	                            const img = document.createElement('img');
	                            img.src = dataUrl;
	                            img.setAttribute('width', width);
	                            img.setAttribute('height', height);
	                            svg.parentNode.replaceChild(img, svg);
	                        } catch (err) { }
	                    }));
	                }

	                const fileBlob = await htmlToDocx(
	                    processedDiv.innerHTML,
	                    headerHtml,
	                    {
	                        table: { row: { cantSplit: false } },
	                        header: true,
	                        footer: true,
	                        pageNumber: true,
	                        page: {
	                            size: pageSize,
	                            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
	                        }
	                    },
	                    footerHtml
	                );

	                if (isNativePlatform()) {
	                    await nativeSave(fileBlob, sanitizedFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', showToast);
	                } else {
	                    saveAs(fileBlob, sanitizedFileName);
	                }
	            }

	        } catch (error) {
	            console.error("Export Error:", error);
	            showToast("Failed to create Word document.", "error");
	        } finally {
	            isExportingRef.current = false;
	            setExportingLessonId(null);
	        }
	    };

// --- SMART EXPORT: PDF ---
    const handleExportLessonPdf = async (lesson) => {
        if (exportingLessonId) return;
        setExportingLessonId(lesson.id);

        const isULP = lesson.contentType === 'teacherGuide';
        const isATG = lesson.contentType === 'teacherAtg';
        const isSpecialDoc = isULP || isATG;
    
        const docLabel = isULP ? "ULP" : (isATG ? "ATG" : "Lesson");
        const suffix = isULP ? "_ULP" : (isATG ? "_ATG" : "");

        const pageSize = isSpecialDoc ? { width: 612, height: 936 } : 'A4';
        
        // [Left, Top, Right, Bottom]
        const pageMargins = isSpecialDoc ? [36, 80, 36, 60] : [40, 80, 40, 60]; 

		showToast(`Preparing ${docLabel} PDF...`, "info");
		    try {
		        await registerDejaVuFonts();
		        const headerBase64 = await fetchImageAsBase64("/header-port.png").catch(()=>null);
		        const footerBase64 = await fetchImageAsBase64("/Footer.png").catch(()=>null);
    
		        const pages = Array.isArray(lesson.pages) && lesson.pages.length ? lesson.pages : [{ title: lesson.title || '', content: lesson.content || lesson.html || '' }];

		        let lessonContent = [];
		        let collectedImages = {}; // 1. Initialize image container

		        for (const page of pages) {
		            const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");
        
		            if (cleanTitle && !cleanTitle.includes('Unit Learning Plan') && !cleanTitle.includes('Adaptive Teaching Guide')) {
		                lessonContent.push({ text: cleanTitle, fontSize: 16, bold: true, color: '#005a9c', margin: [0, 10, 0, 5] });
		            }
        
		            // Ensure you use the UPDATED processLatex from Step 1 here
		            let rawHtml;
		            if (isSpecialDoc) {
		                rawHtml = page.content || '';
		            } else {
		                rawHtml = marked.parse(processLatex(page.content || ''));
		            }

		            const processedDiv = preProcessHtmlForExport(rawHtml, isULP ? 'ulp' : (isATG ? 'atg' : 'pdf'));
        
		            // --- IMAGE PRE-FETCHING (Keep your Step 2 logic here if added) ---
		            const mathImages = processedDiv.querySelectorAll('img');
		            if (mathImages.length > 0) {
		                await Promise.all(Array.from(mathImages).map(async (img) => {
		                    if (img.src && img.src.startsWith('http')) {
		                        try {
		                            const base64 = await fetchImageAsBase64(img.src);
		                            img.src = base64; 
		                        } catch (err) { console.warn("Failed to load image:", img.src); }
		                    }
		                }));
		            }
		            // ---------------------------------------------------------------
        
		            const finalHtml = processedDiv.innerHTML;
        
		            // 2. Capture the full result object from htmlToPdfmake
					const pdfResult = htmlToPdfmake(finalHtml, { 
					    defaultStyles: { 
					        fontSize: 9, 
					        lineHeight: 1.1, 
					        alignment: 'justify',
					        margin: [0, 0, 0, 0] 
					    },
					    // NEW: Define the custom class style for pdfmake
					    customStyles: {
					        'math-img': {
					            // This ensures pdfmake treats it as an inline element if possible
					            margin: [0, 0, 0, 0] 
					        }
					    },
					    tableAutoSize: true, 
					    imagesByReference: true
					});

		            // 3. Extract content AND images
		            let pageBody = pdfResult.content || pdfResult;
		            if (pdfResult.images) {
		                Object.assign(collectedImages, pdfResult.images); // Merge new images
		            }

		            if (!Array.isArray(pageBody)) {
		                pageBody = [pageBody];
		            }

		            cleanUpPdfContent(pageBody, false, 0);

		            if (pageBody.length > 0) {
		                lessonContent.push(...pageBody);
		            }
		        }

		        const docDef = {
		            pageSize: pageSize,
		            pageMargins: pageMargins,
		            header: headerBase64 ? { margin: [0, 10, 0, 0], stack: [{ image: "headerImg", width: 450, alignment: "center" }] } : undefined,
		            footer: footerBase64 ? { margin: [0, 0, 0, 20], stack: [{ image: "footerImg", width: 450, alignment: "center" }] } : undefined,
		            content: [
		                { text: lesson.title || '', fontSize: 24, bold: true, alignment: "center", margin: [0, 0, 0, 5] },
		                { text: subject?.title || "", fontSize: 12, italics: true, alignment: "center", color: '#555555', margin: [0, 0, 0, 10], pageBreak: "after" },
		                ...lessonContent
		            ],
		            // 4. Pass the collected images to pdfMake
		            images: {
		                ...collectedImages, 
		                ...(headerBase64 ? { headerImg: headerBase64 } : {}),
		                ...(footerBase64 ? { footerImg: footerBase64 } : {})
		            },
		            defaultStyle: { font: 'DejaVu', fontSize: 12 }
		        };

		        const pdfDoc = pdfMake.createPdf(docDef);
		        if (isNativePlatform()) {
		            pdfDoc.getBlob(b => nativeSave(b, `${(lesson.title || 'export').replace(/[^a-z0-9]/gi, '_')}${suffix}.pdf`, 'application/pdf', showToast));
		        } else {
		            pdfDoc.download(`${(lesson.title || 'export').replace(/[^a-z0-9]/gi, '_')}${suffix}.pdf`);
		        }
        
		    } catch (e) { 
		        console.error("PDF Export Error:", e);
		        showToast("PDF Error: " + (e.message || e), "error"); 
		    }
		    setExportingLessonId(null);
		};
	
    // --- CONFIRM EXPORT AFTER TUTORIAL ---
    const handleConfirmExport = () => {
        setTutorialModalOpen(false);
        if (itemToExport) {
            handleExportDocx(itemToExport);
            setItemToExport(null);
        }
    };

    const handleAction = useCallback((type, item) => {
        switch(type) {
            case 'select': onSetActiveUnit(item); break;
            case 'edit': if(item.type) { 
                item.type === 'lesson' ? (setSelectedLesson(item), setEditLessonModalOpen(true)) : (setSelectedQuiz(item), setEditQuizModalOpen(true));
            } else { setSelectedUnit(item); setEditUnitModalOpen(true); } break;
            case 'delete': if(item.type) onInitiateDelete(item.type, item.id, item.title, item.subjectId); 
                           else onInitiateDelete('unit', item.id, item.title, item.subjectId); break;
            case 'view': item.type === 'lesson' ? (setSelectedLesson(item), setViewLessonModalOpen(true)) : (setSelectedQuiz(item), setViewQuizModalOpen(true)); break;
            case 'ai': setUnitForAi(item); setIsAiHubOpen(true); break;
            case 'reorder': setIsReordering(true); break;
            case 'generateQuiz': setLessonForAiQuiz(item); setAiQuizModalOpen(true); break;
            case 'exportPdf': handleExportLessonPdf(item); break;
            
            // --- MODIFIED CASE: Check for ULP/ATG before exporting ---
            case 'exportDocx': 
                const isSpecialDoc = item.contentType === 'teacherGuide' || item.contentType === 'teacherAtg';
                if (isSpecialDoc) {
                    setItemToExport(item);
                    setTutorialModalOpen(true);
                } else {
                    handleExportDocx(item); 
                }
                break;
            // --------------------------------------------------------
        }
    }, [onSetActiveUnit, onInitiateDelete]);

    const unifiedContent = useMemo(() => {
        if (!activeUnit) return [];
        return [
            ...allLessons.filter(l => l.unitId === activeUnit.id).map(l => ({...l, type: 'lesson'})),
            ...allQuizzes.filter(q => q.unitId === activeUnit.id).map(q => ({...q, type: 'quiz'}))
        ].sort((a,b) => (a.order??0) - (b.order??0));
    }, [activeUnit, allLessons, allQuizzes]);

    const handleDragEnd = async (e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        if (active.data.current.type === 'unit') {
            const oldIdx = units.findIndex(u => u.id === active.id);
            const newIdx = units.findIndex(u => u.id === over.id);
            const reordered = arrayMove(units, oldIdx, newIdx);
            setUnits(reordered);
            const batch = writeBatch(db);
            reordered.forEach((u, i) => batch.update(doc(db, 'units', u.id), { order: i }));
            await batch.commit();
        } else {
            const oldIdx = unifiedContent.findIndex(i => i.id === active.id);
            const newIdx = unifiedContent.findIndex(i => i.id === over.id);
            const reordered = arrayMove(unifiedContent, oldIdx, newIdx);
            
            setAllLessons(prev => [...prev.filter(l => l.unitId !== activeUnit.id), ...reordered.filter(i => i.type === 'lesson')]);
            setAllQuizzes(prev => [...prev.filter(q => q.unitId !== activeUnit.id), ...reordered.filter(i => i.type === 'quiz')]);

            const batch = writeBatch(db);
            reordered.forEach((item, index) => {
                 batch.update(doc(db, item.type === 'lesson' ? 'lessons' : 'quizzes', item.id), { order: index });
            });
            await batch.commit();
        }
    };

    const getMonetHeaderBg = () => {
        switch (activeOverlay) {
            case 'christmas': return 'bg-[#0f172a]/95';
            case 'valentines': return 'bg-[#2c0b0e]/95';
            case 'graduation': return 'bg-[#1a1400]/95';
            case 'rainy': return 'bg-[#061816]/95';
            case 'cyberpunk': return 'bg-[#180a20]/95';
            case 'spring': return 'bg-[#1f0f15]/95';
            case 'space': return 'bg-[#020617]/95';
            default: return 'bg-[#1A1D24]/95';
        }
    };

    const headerBg = monet 
        ? `${getMonetHeaderBg()} backdrop-blur-xl border-b border-white/10 shadow-sm z-40`
        : 'bg-slate-50/90 dark:bg-[#0F1115]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/5 z-40';

    const headerText = monet ? 'text-white' : 'text-slate-800 dark:text-white';
    const headerSubText = monet ? 'text-white/60' : 'text-slate-500';

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    <div className="relative">
                        <div className={`sticky top-0 -mx-4 px-4 md:px-6 pt-3 pb-3 mb-6 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 ${headerBg}`}>
                            <div className="min-w-0 flex-1">
                                <h2 className={`text-lg md:text-xl font-black tracking-tight leading-tight truncate ${headerText}`}>
                                    {activeUnit.title}
                                </h2>
                                <p className={`text-xs md:text-xs font-medium truncate ${headerSubText}`}>Manage Lessons & Quizzes</p>
                            </div>
                            
                            <div className="flex-shrink-0 flex items-center gap-2">
                                {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                <button onClick={() => setIsReordering(!isReordering)} className={`${styles.secondaryButton} !px-3 !py-1.5 text-xs md:text-sm`}>
                                    {isReordering ? 'Done' : 'Reorder'}
                                </button>
                                <AddContentButton 
                                    onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                    onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                    monet={monet}
                                    styles={styles}
                                    className="!px-3 !py-1.5 text-xs md:text-sm"
                                />
                            </div>
                        </div>

                        <div className="pb-20 px-1 md:px-2">
                            {unifiedContent.length > 0 ? (
                                <SortableContext items={unifiedContent.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    {unifiedContent.map(item => (
                                        <SortableContentItem 
                                            key={item.id} 
                                            item={item} 
                                            isReordering={isReordering} 
                                            onAction={handleAction} 
                                            exportingLessonId={exportingLessonId} 
                                            isAiGenerating={isAiGenerating} 
                                            monet={monet} 
                                            styles={styles}
                                            isPdfDisabled={isPdfRestricted}
                                        />
                                    ))}
                                </SortableContext>
                            ) : (
                                <div className={`flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[2.5rem] backdrop-blur-md mx-2 ${monet ? 'bg-black/20 border-white/10' : 'border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5'}`}>
                                    <div className={`h-24 w-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl ring-1 ring-black/5 ${monet ? 'bg-white/10' : 'bg-white dark:bg-white/10'}`}>
                                        <RectangleStackIcon className={`h-12 w-12 ${monet ? 'text-white/60' : 'text-slate-300 dark:text-slate-500'}`} />
                                    </div>
                                    <h3 className={`text-xl font-bold ${monet ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Empty Unit</h3>
                                    <p className={`mb-6 font-medium text-center px-4 ${monet ? 'text-white/60' : 'text-slate-500'}`}>Add your first lesson or quiz to get started.</p>
                                    <AddContentButton 
                                        onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                        onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                        monet={monet}
                                        styles={styles}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        {units.length > 0 && (
                            <div className="flex justify-end mb-4">
                                <button 
                                    onClick={() => setIsReordering(!isReordering)} 
                                    className={`${styles.secondaryButton} !px-4 !py-2 text-sm`}
                                >
                                    {isReordering ? (<>Done</>) : (<><ArrowsUpDownIcon className="w-4 h-4" /> Reorder Units</>)}
                                </button>
                            </div>
                        )}

                        {isReordering && (
                            <div className={`sticky top-0 z-30 mb-6 p-4 backdrop-blur-xl rounded-2xl border flex justify-between items-center animate-in slide-in-from-top-2 ${monet ? 'bg-black/20 border-white/10' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                <span className={`font-bold flex items-center gap-2 text-sm md:text-base ${monet ? 'text-white' : 'text-blue-600 dark:text-blue-300'}`}>
                                    <ArrowsUpDownIcon className="w-5 h-5" /> Reordering Mode
                                </span>
                                <button onClick={() => setIsReordering(false)} className={`${styles.primaryButton} !py-1 !px-4 text-sm`}>Done</button>
                            </div>
                        )}

                        {units.length > 0 ? (
                            <div className="flex flex-col gap-3 md:gap-4 pb-20">
                                <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                                    {units.map((unit, idx) => (
                                        <SortableUnitListRow key={unit.id} unit={unit} index={idx} onSelect={onSetActiveUnit} onAction={handleAction} isReordering={isReordering} monet={monet} styles={styles} />
                                    ))}
                                </SortableContext>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-60">
                                <QueueListIcon className={`w-20 h-20 mb-4 ${monet ? 'text-white/30' : 'text-slate-300 dark:text-slate-600'}`} />
                                <h3 className={`text-2xl font-bold ${monet ? 'text-white/60' : 'text-slate-900 dark:text-white'}`}>No Units Yet</h3>
                            </div>
                        )}
                    </div>
                )}
            </DndContext>

            {/* --- NEW MODAL INSERTION --- */}
            <ExportTutorialModal 
                isOpen={tutorialModalOpen} 
                onClose={() => { setTutorialModalOpen(false); setItemToExport(null); }}
                onConfirm={handleConfirmExport}
                monet={monet}
            />
            {/* --------------------------- */}

            {/* Modals */}
            <Suspense fallback={<ContentListSkeleton />}>
                {isAiHubOpen && <AiGenerationHub isOpen={isAiHubOpen} onClose={() => setIsAiHubOpen(false)} unitId={unitForAi?.id} subjectId={subject?.id} />}
                {editUnitModalOpen && <EditUnitModal isOpen={editUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={selectedUnit} />}
                {addLessonModalOpen && <AddLessonModal isOpen={addLessonModalOpen} onClose={() => setAddLessonModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject?.id} setIsAiGenerating={setIsAiGenerating} />}
                {addQuizModalOpen && <AddQuizModal isOpen={addQuizModalOpen} onClose={() => setAddQuizModalOpen(false)} unitId={selectedUnit?.id} subjectId={subject?.id} />}
                {editLessonModalOpen && <EditLessonModal isOpen={editLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} lesson={selectedLesson} />}
                {viewLessonModalOpen && <ViewLessonModal isOpen={viewLessonModalOpen} onClose={() => setViewLessonModalOpen(false)} lesson={selectedLesson} onUpdate={onUpdateLesson} userRole={currentUserRole} />}
                {editQuizModalOpen && selectedQuiz && (<EditQuizModal isOpen={editQuizModalOpen} onClose={() => setEditQuizModalOpen(false)} quiz={selectedQuiz} onEditQuiz={() => { setEditQuizModalOpen(false); }} />)}
                {viewQuizModalOpen && <ViewQuizModal isOpen={viewQuizModalOpen} onClose={() => setViewQuizModalOpen(false)} quiz={selectedQuiz} userProfile={userProfile} isTeacherView={true} />}
                {aiQuizModalOpen && <AiQuizModal isOpen={aiQuizModalOpen} onClose={() => setAiQuizModalOpen(false)} unitId={lessonForAiQuiz?.id} subjectId={lessonForAiQuiz?.subjectId} lesson={lessonForAiQuiz} />}
            </Suspense>
        </>
    );
}