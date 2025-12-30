// src/components/teacher/UnitAccordion.jsx
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
import { asBlob } from 'html-docx-js-typescript'; 
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
    PlayCircleIcon,
    AcademicCapIcon,
    BookOpenIcon,
    ClockIcon
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
    touchAction: 'pan-y', 
    backfaceVisibility: 'hidden', 
};

// --- ONE UI 8.0 BUTTON STYLES ---
const oneUiBtnBase = `
    relative font-bold rounded-full transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 
    active:scale-95 tracking-wide text-xs
`;

const getStyles = (monet) => {
    if (monet) {
        const btnPrimaryClass = monet.btnPrimary || monet.buttonPrimary || 'bg-blue-600 text-white';
        const btnTonalClass = monet.btnTonal || monet.buttonSecondary || 'bg-slate-100 text-slate-900';
        
        return {
            primaryButton: `${oneUiBtnBase} ${btnPrimaryClass} px-4 py-2 shadow-sm border border-transparent`,
            secondaryButton: `${oneUiBtnBase} ${btnTonalClass} px-3 py-2 border border-transparent`, 
            iconButton: `p-2 rounded-full aspect-square ${btnTonalClass} bg-transparent hover:bg-black/5 dark:hover:bg-white/10 transition-colors`,
            contentItem: `bg-white dark:bg-[#1E212B] border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.02)]`, 
            iconBox: monet.iconBg
        };
    }
    return {
        primaryButton: `${oneUiBtnBase} bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2 shadow-sm`,
        secondaryButton: `${oneUiBtnBase} bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#3A3A3C] px-3 py-2`,
        iconButton: `p-2 rounded-full aspect-square text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors`,
        contentItem: `bg-white dark:bg-[#1E212B] border border-slate-100 dark:border-[#2C2C2E] shadow-sm`,
        iconBox: `bg-slate-100 text-slate-600 dark:bg-[#2C2C2E] dark:text-slate-300`
    };
};

// --- HELPER FUNCTIONS ---
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

let dejaVuLoaded = false;
async function registerDejaVuFonts() {
  if (dejaVuLoaded) return true;
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
    return true;
  } catch (e) { 
      console.error("Font load error", e); 
      return false;
  }
}

const processLatex = (text) => {
    if (!text || typeof text !== 'string') return ''; 
    let processed = text
        .replace(/\\degree/g, '°')
        .replace(/\\angle/g, '∠')
        .replace(/\\vec\{(.*?)\}/g, (_, c) => c.split('').map(x => x + '\u20D7').join(''));

    const latexToImg = (match, code) => {
        const cleanCode = code.trim();
        const url = `https://latex.codecogs.com/png.latex?\\dpi{1080}\\bg_white\\color{black} ${encodeURIComponent(cleanCode)}`;
        return `<img src="${url}" class="math-img" />`;
    };

    return processed
        .replace(/\$\$(.*?)\$\$/g, latexToImg) 
        .replace(/\$(.*?)\$/g, latexToImg);    
};

const getImageDimensions = (base64) => {
    return new Promise((resolve) => {
        const i = new Image();
        i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
        i.src = base64;
    });
};

async function fetchImageAsBase64(url) {
  if (!url) return null;
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

const preProcessHtmlForExport = (rawHtml, mode = 'pdf') => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

    const style = document.createElement('style');
    style.innerHTML = `
        table { width: 100% !important; table-layout: fixed; word-wrap: break-word; }
        td, th { word-wrap: break-word; word-break: break-all; white-space: normal; }
        img { max-width: 100%; height: auto; }
    `;
    tempDiv.insertBefore(style, tempDiv.firstChild);

    const quotes = tempDiv.querySelectorAll('blockquote');
    quotes.forEach(quote => {
        const headers = quote.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headers.forEach(header => {
            const span = document.createElement('span');
            span.innerHTML = `<strong>${header.innerHTML}</strong><br/>`;
            header.parentNode.replaceChild(span, header);
        });
        const paragraphs = quote.querySelectorAll('p');
        if (paragraphs.length > 0) {
            paragraphs.forEach(p => { p.innerHTML = p.innerHTML.replace(/\n/g, '<br/>'); });
        } else {
            quote.innerHTML = quote.innerHTML.replace(/\n/g, '<br/>');
        }
    });

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
        if (el.tagName === 'TD' || el.tagName === 'TH') {
            style += '; word-break: break-all; word-wrap: break-word;';
        }
        el.setAttribute('style', style);
    });

    tempDiv.querySelectorAll('td:not([style]), th:not([style])').forEach(el => {
        el.setAttribute('style', 'word-break: break-all; word-wrap: break-word;');
    });

    tempDiv.querySelectorAll('[width]').forEach(el => el.removeAttribute('width'));
    
    tempDiv.querySelectorAll('img').forEach(img => {
        img.removeAttribute('width');
        img.removeAttribute('height');
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
                remainingRows.forEach(row => { if (row !== firstRow) tbody.appendChild(row); });
                table.appendChild(tbody);
            }
            table.insertBefore(thead, table.firstChild);
        }
        
        table.querySelectorAll("thead").forEach(thead => { thead.style.display = "table-header-group"; });
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
                'DEEPEN', 'TRANSFER', 'MEANING-MAKING', 
                'APPLICATION', 'FIRM-UP', 'EXPLORE'
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
                cleanUpPdfContent(stack, inTable, depth, tableCols);
            }
            delete content.margin;
        }

        if (content.image) {
            const isMath = content.style && (
                content.style === 'math-img' || (Array.isArray(content.style) && content.style.includes('math-img'))
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
        } else if (content.columns) {
            if (Array.isArray(content.columns)) {
                content.columns = content.columns.filter(col => col);
                content.columns.forEach(col => {
                    col.width = '*';
                    cleanUpPdfContent(col, inTable, depth, tableCols);
                });
            } else {
                delete content.columns;
            }
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

        if (content.ul) {
            cleanUpPdfContent(content.ul, inTable, depth, tableCols);
            content.margin = [0, 2, 0, 5];
        }
        if (content.ol) {
            cleanUpPdfContent(content.ol, inTable, depth, tableCols);
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

// --- LAZY LOADED MODALS ---
const AddLessonModal = lazyWithRetry(() => import('./AddLessonModal'));
const AddQuizModal = lazyWithRetry(() => import('./AddQuizModal'));
const EditLessonModal = lazyWithRetry(() => import('./EditLessonModal'));
const ViewLessonModal = lazyWithRetry(() => import('./ViewLessonModal'));
const EditUnitModal = lazyWithRetry(() => import('./EditUnitModal'));
const EditQuizModal = lazyWithRetry(() => import('./EditQuizModal.jsx'));
const ViewQuizModal = lazyWithRetry(() => import('./ViewQuizModal'));
const AiQuizModal = lazyWithRetry(() => import('./AiQuizModal'));
const AiGenerationHub = lazyWithRetry(() => import('./AiGenerationHub'));

// --- COMPONENTS ---
const ContentListSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        {[1,2,3,4].map(i => (
            <div key={i} className="h-28 rounded-[22px] bg-slate-100 dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2C2C2E]" />
        ))}
    </div>
);

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
        ? `fixed z-[9999] bg-white dark:bg-[#252525] rounded-[24px] shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 min-w-[200px]` 
        : `fixed z-[9999] bg-white dark:bg-[#252525] rounded-[24px] shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1 min-w-[200px] border border-slate-100 dark:border-[#2C2C2E]`;

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
        if (isOpen) {
            setIsOpen(false);
            return;
        }
        const rect = iconRef.current.getBoundingClientRect();
        const screenHeight = window.innerHeight;
        const spaceBelow = screenHeight - rect.bottom;
        const shouldFlip = spaceBelow < 220;

        let newStyle = {
            right: `${window.innerWidth - rect.right}px`,
            position: 'fixed',
            zIndex: 9999
        };

        if (shouldFlip) {
            newStyle.bottom = `${screenHeight - rect.top + 5}px`;
            newStyle.transformOrigin = 'bottom right';
        } else {
            newStyle.top = `${rect.bottom + 5}px`;
            newStyle.transformOrigin = 'top right';
        }
        setMenuStyle(newStyle);
        setIsOpen(true);
    };

    const closeMenu = () => setIsOpen(false);

    return (
        <>
            <div ref={iconRef} onClick={handleToggle} className={`${styles.iconButton} relative z-20 cursor-pointer rounded-full`}>
                <EllipsisVerticalIcon className="h-5 w-5" />
            </div>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={closeMenu} monet={monet}>
                    <MenuContext.Provider value={closeMenu}>{children}</MenuContext.Provider>
                </MenuPortal>
            )}
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
    
    const activeClass = monet 
        ? `hover:${monet.btnTonal || 'bg-slate-100'}` 
        : `hover:bg-slate-100 dark:hover:bg-[#3A3A3C]`;

    return (
        <button 
            onClick={handleClick} 
            disabled={disabled || loading} 
            className={`flex items-center w-full px-4 py-3 text-sm font-bold rounded-[18px] transition-colors text-slate-700 dark:text-slate-200 ${activeClass}`}
        >
            <Icon className={`h-5 w-5 mr-3 ${loading ? 'animate-spin text-blue-500' : (monet ? '' : 'text-slate-400')}`} />
            {text}
        </button>
    );
};

const AddContentButton = ({ onAddLesson, onAddQuiz, monet, styles, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const buttonRef = useRef(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuStyle({
            top: `${rect.bottom + 8}px`,
            right: `${window.innerWidth - rect.right}px`
        });
        setIsOpen(!isOpen);
    };

    const handleAddLesson = () => { onAddLesson(); setIsOpen(false); };
    const handleAddQuiz = () => { onAddQuiz(); setIsOpen(false); };

    return (
        <>
            <button ref={buttonRef} onClick={handleToggle} className={`${styles.primaryButton} ${className || ''}`}>
                <PlusIcon className="w-4 h-4" />
                <span className="hidden md:inline">Add Content</span>
                <span className="md:hidden">Add</span>
            </button>
            {isOpen && (
                <MenuPortal menuStyle={menuStyle} onClose={() => setIsOpen(false)} monet={monet}>
                    <MenuItem icon={DocumentTextIcon} text="Add Lesson" onClick={handleAddLesson} monet={monet} />
                    <MenuItem icon={ClipboardDocumentListIcon} text="Add Quiz" onClick={handleAddQuiz} monet={monet} />
                </MenuPortal>
            )}
        </>
    );
};

const ExportTutorialModal = ({ isOpen, onClose, onConfirm, monet }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={` w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col ${monet ? 'bg-[#1E212B] border border-white/10' : 'bg-white dark:bg-[#1E212B]'} `}>
                <div className="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                    <h3 className={`text-xl font-black flex items-center gap-3 ${monet ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        <PlayCircleIcon className="w-7 h-7 text-blue-500" />
                        Fixing Table Layouts
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <XMarkIcon className={`w-6 h-6 ${monet ? 'text-white/60' : 'text-gray-500'}`} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="mb-4">
                        <p className={`text-sm mb-4 font-medium leading-relaxed ${monet ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'}`}>
                            Large tables in ULP/ATG documents may look cut off in Microsoft Word. <br/>
                            <strong>Please watch this quick fix (10s)</strong> to enable "Repeat Header Rows".
                        </p>
                        <div className="relative w-full rounded-[20px] overflow-hidden bg-black aspect-video shadow-lg mb-6 ring-1 ring-white/10">
                            <video src="/table tutorial.mp4" className="w-full h-full object-contain" controls autoPlay muted loop >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        <div className={`text-xs p-4 rounded-[18px] border ${monet ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'}`}>
                            <strong>Tip:</strong> In Word, Select Table Row → Layout → Properties → Row → Check "Repeat as header row at the top of each page".
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/5">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className={` px-6 py-3 text-sm font-bold rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all ${monet ? monet.buttonPrimary : 'bg-blue-600 text-white hover:bg-blue-500'} `}>
                        I Understand, Download
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const SortableUnitListRow = memo(({ unit, onSelect, onAction, isReordering, index, monet, styles }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: unit.id, data: { type: 'unit' }, disabled: !isReordering });
    const style = { transform: CSS.Translate.toString(transform), transition };
    const rowClasses = isReordering ? "opacity-60 grayscale scale-[0.98] border-dashed border-2 border-slate-300 dark:border-slate-600 bg-transparent" : `bg-white dark:bg-[#1E212B] shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-transparent`;
    const iconBoxStyle = monet ? `${monet.iconBg} rounded-[18px]` : `bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[18px]`;

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="mb-2">
            <div onClick={() => !isReordering && onSelect(unit)} className={`relative w-full rounded-[22px] p-1.5 ${rowClasses} ${!isReordering ? 'cursor-pointer' : ''}`}>
                <div className="relative flex items-center p-2.5 gap-3.5">
                    {isReordering && ( <div {...listeners} className="p-2 cursor-grab active:cursor-grabbing hover:bg-black/5 rounded-lg touch-none"> <ArrowsUpDownIcon className="h-5 w-5 text-slate-400" /> </div> )}
                    <div className={`relative h-12 w-12 flex-shrink-0 flex items-center justify-center ${iconBoxStyle}`}>
                        <FolderIcon className="h-6 w-6" />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#2C2C2E] text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-slate-100 dark:border-[#3A3A3C] text-slate-600 dark:text-slate-300">#{index + 1}</div>
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5"> <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#2C2C2E] text-slate-500 dark:text-slate-400`}> Unit </span> </div>
                        <h3 className={`text-base font-bold tracking-tight leading-tight truncate text-slate-900 dark:text-white`}> {unit.title} </h3>
                    </div>
                    {!isReordering && ( <div className="flex items-center gap-1 z-10 pr-1"> <div onClick={(e) => e.stopPropagation()}> <ActionMenu monet={monet} styles={styles}> <MenuItem icon={PencilIcon} text="Edit Unit" onClick={(e) => { e.stopPropagation(); onAction('edit', unit); }} monet={monet} /> <MenuItem icon={ArrowsUpDownIcon} text="Reorder" onClick={(e) => { e.stopPropagation(); onAction('reorder', unit); }} monet={monet} /> <MenuItem icon={TrashIcon} text="Delete Unit" onClick={(e) => { e.stopPropagation(); onAction('delete', unit); }} monet={monet} /> </ActionMenu> </div> <div className="hidden md:flex h-8 w-8 rounded-full items-center justify-center hover:bg-slate-100 dark:hover:bg-[#2C2C2E] text-slate-400 transition-colors"> <ChevronRightIcon className="w-4 h-4 stroke-2" /> </div> </div> )}
                </div>
            </div>
        </div>
    );
}, (prev, next) => prev.unit.id === next.unit.id && prev.unit.title === next.unit.title && prev.isReordering === next.isReordering && prev.index === next.index && prev.monet === next.monet);

const SortableContentItem = memo(({ item, isReordering, onAction, exportingLessonId, isAiGenerating, monet, styles, isPdfDisabled }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: item.id, data: { type: item.type, unitId: item.unitId }, disabled: !isReordering,
    });
    
    const style = { transform: CSS.Translate.toString(transform), transition };
    const isLesson = item.type === 'lesson';
    const isULP = item.contentType === 'teacherGuide';
    
    const Icon = isLesson ? BookOpenIcon : ClipboardDocumentListIcon;
    const typeLabel = isLesson ? (isULP ? "Unit Plan" : "Module") : "Assessment";
    
    // Aesthetic Logic: Left vs Right Specific styling
    let containerClass = `
        relative group w-full flex flex-row items-center p-4 
        bg-white dark:bg-[#1E212B] 
        rounded-[20px] overflow-hidden 
        border transition-all duration-300 ease-out
    `;
    
    if (!isReordering) {
        containerClass += ` border-gray-100 dark:border-[#2C2C2E] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 cursor-pointer dark:hover:bg-[#252836]`;
    } else {
        containerClass += ` opacity-80 scale-[0.98] border-dashed border-2 border-slate-300 dark:border-slate-600`;
    }

    // Icon Box Styling (Distinct colors for columns)
    let iconBoxClass = "";
    let badgeClass = "";
    let titleClass = "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400";
    
    if (monet) {
        iconBoxClass = `${monet.iconBg} text-white/90`;
        badgeClass = `${monet.iconBg} bg-opacity-10 text-current`;
    } else {
        if (isLesson) {
            // Blue/Indigo Theme for Lessons
            iconBoxClass = "bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-400";
            badgeClass = "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
        } else {
            // Purple/Pink Theme for Quizzes
            iconBoxClass = "bg-gradient-to-br from-fuchsia-50 to-purple-50 text-purple-600 dark:from-fuchsia-900/30 dark:to-purple-900/30 dark:text-purple-400";
            badgeClass = "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300";
            titleClass = "text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400";
        }
    }

    return (
        <div ref={setNodeRef} style={{...style, ...performanceStyles}} {...attributes} className="h-full"> 
            <div onClick={() => !isReordering && onAction('view', item)} className={containerClass}>
				
				{isReordering && (
				    <button {...listeners} className="p-2 mr-2 rounded-xl text-slate-400 hover:bg-black/5 cursor-grab active:cursor-grabbing touch-none">
				        <Bars3Icon className="w-5 h-5" />
				    </button>
				)}

                <div className={`h-12 w-12 flex-shrink-0 rounded-[16px] flex items-center justify-center mr-4 shadow-sm ${iconBoxClass}`}>
                    <Icon className="h-6 w-6" />
                </div>

                <div className="flex-grow min-w-0 pr-2 flex flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${badgeClass}`}>
                            {typeLabel}
                        </span>
                        {/* Optional: Add item count or score indicator here */}
                    </div>
                    <h4 className={`font-bold text-[14px] leading-snug truncate transition-colors ${titleClass}`}>
                        {item.title || 'Untitled'}
                    </h4>
                </div>

                <div className={`flex-shrink-0 pl-2 transition-opacity duration-200 ${isReordering ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu monet={monet} styles={styles}>
                            <MenuItem icon={PencilIcon} text="Edit" onClick={() => onAction('edit', item)} monet={monet} />
                            {isLesson && (
                                <>
                                    {!isPdfDisabled && (
                                        <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as PDF"} onClick={() => onAction('exportPdf', item)} loading={exportingLessonId === item.id} monet={monet} />
                                    )}
                                    <MenuItem icon={exportingLessonId === item.id ? CloudArrowUpIcon : DocumentTextIcon} text={exportingLessonId === item.id ? "Exporting..." : "Export as .docx"} onClick={() => onAction('exportDocx', item)} loading={exportingLessonId === item.id} monet={monet} />
                                </>
                            )}
                            {isLesson && <MenuItem icon={SparklesIcon} text="AI Quiz" onClick={() => onAction('generateQuiz', item)} disabled={isAiGenerating} monet={monet} /> }
                            <MenuItem icon={TrashIcon} text="Delete" onClick={() => onAction('delete', item)} monet={monet} />
                        </ActionMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => prev.item.id === next.item.id && prev.item.title === next.item.title && prev.isReordering === next.isReordering && prev.exportingLessonId === next.exportingLessonId && prev.monet === next.monet);


// --- MAIN COMPONENT ---
export default function UnitAccordion({ subject, onInitiateDelete, userProfile, isAiGenerating, setIsAiGenerating, activeUnit, onSetActiveUnit, selectedLessons, onLessonSelect, renderGeneratePptButton, onUpdateLesson, currentUserRole, monet }) {
    const [units, setUnits] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [exportingLessonId, setExportingLessonId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    
    const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
    const [itemToExport, setItemToExport] = useState(null);

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

    const isPdfRestricted = useMemo(() => {
        if (!subject?.title) return false;
        const title = subject.title.toLowerCase();
        const isMath = title.includes('math'); 
        const isTargetGrade = /\b(7|8|9|10)\b/.test(title) || (subject.gradeLevel && ['7','8','9','10'].includes(String(subject.gradeLevel)));
        return isMath && isTargetGrade;
    }, [subject]);

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
        const pageSize = isSpecialDoc ? { width: 12240, height: 15840 } : 'A4'; // Legal size in twips for ULP/ATG

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

    const handleExportLessonPdf = async (lesson) => {
        if (exportingLessonId) return;
        setExportingLessonId(lesson.id);

        const isULP = lesson.contentType === 'teacherGuide';
        const isATG = lesson.contentType === 'teacherAtg';
        const isSpecialDoc = isULP || isATG;

        const docLabel = isULP ? "ULP" : (isATG ? "ATG" : "Lesson");
        const suffix = isULP ? "_ULP" : (isATG ? "_ATG" : "");

        const pageSize = isSpecialDoc ? { width: 612, height: 936 } : 'A4';
        const pageMargins = isSpecialDoc ? [36, 80, 36, 60] : [40, 80, 40, 60];

        showToast(`Preparing ${docLabel} PDF...`, "info");

        try {
            const fontsLoaded = await registerDejaVuFonts();
            const activeFont = fontsLoaded ? 'DejaVu' : 'Roboto';

            const headerBase64 = await fetchImageAsBase64("/header-port.png").catch(() => null);
            const footerBase64 = await fetchImageAsBase64("/Footer.png").catch(() => null);

            const pages = Array.isArray(lesson.pages) && lesson.pages.length ? lesson.pages : [{ title: lesson.title || '', content: lesson.content || lesson.html || '' }];

            let lessonContent = [];
            let collectedImages = {};

            for (const page of pages) {
                const cleanTitle = (page.title || "").replace(/^page\s*\d+\s*[:-]?\s*/i, "");

                if (cleanTitle && !cleanTitle.includes('Unit Learning Plan') && !cleanTitle.includes('Adaptive Teaching Guide')) {
                    lessonContent.push({ text: cleanTitle, fontSize: 16, bold: true, color: '#005a9c', margin: [0, 10, 0, 5] });
                }

                if (typeof page.content === 'object' && page.content !== null) {
                    const imageUrls = page.content.imageUrls || (page.content.generatedImageUrl ? [page.content.generatedImageUrl] : []);

                    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
                        for (const url of imageUrls) {
                            if (!url) continue;
                            try {
                                const base64 = await fetchImageAsBase64(url);
                                if (base64) {
                                    lessonContent.push({
                                        image: base64,
                                        width: 450,
                                        alignment: 'center',
                                        margin: [0, 10, 0, 5]
                                    });
                                }
                            } catch (e) {
                                console.warn("Failed to load lesson image", url);
                                lessonContent.push({ text: "(Image could not be loaded)", italics: true, fontSize: 10, alignment: 'center', color: 'gray' });
                            }
                        }
                    }

                    if (page.caption) {
                        let captionHtml = marked.parse(processLatex(page.caption));
                        const processedCaption = preProcessHtmlForExport(captionHtml, isULP ? 'ulp' : (isATG ? 'atg' : 'pdf'));
                        const pdfCaption = htmlToPdfmake(processedCaption.innerHTML, {
                            defaultStyles: { fontSize: 10, alignment: 'center', color: '#444' }
                        });

                        let captionBody = pdfCaption.content || pdfCaption;
                        if (Array.isArray(captionBody)) lessonContent.push(...captionBody);
                        else lessonContent.push(captionBody);
                    }

                } else {
                    const contentString = typeof page.content === 'string' ? page.content : '';
                    let rawHtml;
                    if (isSpecialDoc) {
                        rawHtml = contentString;
                    } else {
                        rawHtml = marked.parse(processLatex(contentString));
                    }

                    const processedDiv = preProcessHtmlForExport(rawHtml, isULP ? 'ulp' : (isATG ? 'atg' : 'pdf'));

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

                    const finalHtml = processedDiv.innerHTML;

                    // --- MODIFIED CONFIGURATION FOR JUSTIFY & BLOCKQUOTES ---
                    const pdfResult = htmlToPdfmake(finalHtml, {
                        defaultStyles: {
                            fontSize: 9,
                            lineHeight: 1.2,
                            alignment: 'justify', // Justified text
                            margin: [0, 0, 0, 5]
                        },
                        // Specific styles for HTML tags
                        tagStyles: {
                            blockquote: {
                                background: '#f5f7fa', // Very light blue/gray background
                                margin: [20, 5, 20, 10], // Indent left and right
                                color: '#334155', // Slate color
                                italics: true
                            },
                            code: {
                               background: '#eeeeee',
                               fontSize: 8
                            }
                        },
                        customStyles: {
                            'math-img': {
                                margin: [0, 0, 0, 0],
                                alignment: 'left'
                            }
                        },
                        tableAutoSize: false,
                        imagesByReference: true
                    });

                    let pageBody = pdfResult.content || pdfResult;
                    if (pdfResult.images) {
                        Object.assign(collectedImages, pdfResult.images);
                    }

                    if (!Array.isArray(pageBody)) {
                        pageBody = [pageBody];
                    }

                    cleanUpPdfContent(pageBody, false, 0);

                    if (pageBody.length > 0) {
                        lessonContent.push(...pageBody);
                    }
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
                images: {
                    ...collectedImages,
                    ...(headerBase64 ? { headerImg: headerBase64 } : {}),
                    ...(footerBase64 ? { footerImg: footerBase64 } : {})
                },
                defaultStyle: { font: activeFont, fontSize: 12, alignment: 'justify' }
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
            case 'edit': 
                if(item.type) { 
                    item.type === 'lesson' ? (setSelectedLesson(item), setEditLessonModalOpen(true)) : (setSelectedQuiz(item), setEditQuizModalOpen(true)); 
                } else { 
                    setSelectedUnit(item); 
                    setEditUnitModalOpen(true); 
                } 
                break;
            case 'delete': 
                if(item.type) onInitiateDelete(item.type, item.id, item.title, item.subjectId); 
                else onInitiateDelete('unit', item.id, item.title, item.subjectId); 
                break;
            case 'view': 
                item.type === 'lesson' ? (setSelectedLesson(item), setViewLessonModalOpen(true)) : (setSelectedQuiz(item), setViewQuizModalOpen(true)); 
                break;
            case 'ai': 
                setUnitForAi(item); 
                setIsAiHubOpen(true); 
                break;
            case 'reorder': 
                setIsReordering(true); 
                break;
            case 'generateQuiz': 
                setLessonForAiQuiz(item); 
                setAiQuizModalOpen(true); 
                break;
            case 'exportPdf': 
                handleExportLessonPdf(item); 
                break;
            case 'exportDocx': 
                const isSpecialDoc = item.contentType === 'teacherGuide' || item.contentType === 'teacherAtg'; 
                if (isSpecialDoc) { 
                    setItemToExport(item); 
                    setTutorialModalOpen(true); 
                } else { 
                    handleExportDocx(item); 
                } 
                break;
        }
    }, [onSetActiveUnit, onInitiateDelete]);

    const { lessons, quizzes } = useMemo(() => {
        if (!activeUnit) return { lessons: [], quizzes: [] };
        
        const unitLessons = allLessons
            .filter(l => l.unitId === activeUnit.id)
            .map(l => ({...l, type: 'lesson'}))
            .sort((a,b) => (a.order??0) - (b.order??0));
            
        const unitQuizzes = allQuizzes
            .filter(q => q.unitId === activeUnit.id)
            .map(q => ({...q, type: 'quiz'}))
            .sort((a,b) => (a.order??0) - (b.order??0));
            
        return { lessons: unitLessons, quizzes: unitQuizzes };
    }, [activeUnit, allLessons, allQuizzes]);

    const handleDragEnd = async (e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        // Case 1: Reordering Units
        if (active.data.current.type === 'unit') {
            const oldIdx = units.findIndex(u => u.id === active.id);
            const newIdx = units.findIndex(u => u.id === over.id);
            const reordered = arrayMove(units, oldIdx, newIdx);
            setUnits(reordered);
            const batch = writeBatch(db);
            reordered.forEach((u, i) => batch.update(doc(db, 'units', u.id), { order: i }));
            await batch.commit();
            return;
        }

        // Case 2: Reordering Lessons
        if (active.data.current.type === 'lesson' && over.data.current.type === 'lesson') {
            const oldIdx = lessons.findIndex(i => i.id === active.id);
            const newIdx = lessons.findIndex(i => i.id === over.id);
            const reordered = arrayMove(lessons, oldIdx, newIdx);
            
            // Optimistic Update
            setAllLessons(prev => {
                const others = prev.filter(l => l.unitId !== activeUnit.id);
                return [...others, ...reordered];
            });

            const batch = writeBatch(db);
            reordered.forEach((item, index) => {
                 batch.update(doc(db, 'lessons', item.id), { order: index });
            });
            await batch.commit();
            return;
        }
        
        // Case 3: Reordering Quizzes
        if (active.data.current.type === 'quiz' && over.data.current.type === 'quiz') {
            const oldIdx = quizzes.findIndex(i => i.id === active.id);
            const newIdx = quizzes.findIndex(i => i.id === over.id);
            const reordered = arrayMove(quizzes, oldIdx, newIdx);
            
            // Optimistic Update
            setAllQuizzes(prev => {
                const others = prev.filter(q => q.unitId !== activeUnit.id);
                return [...others, ...reordered];
            });

            const batch = writeBatch(db);
            reordered.forEach((item, index) => {
                 batch.update(doc(db, 'quizzes', item.id), { order: index });
            });
            await batch.commit();
            return;
        }
    };

    const getHeaderClasses = () => {
        if (monet) {
            return `${monet.cardBg || 'bg-white dark:bg-[#1C1C1E]'} border-b border-slate-100 dark:border-[#2C2C2E] z-40`;
        }
        return 'bg-white dark:bg-[#1C1C1E] border-b border-slate-200 dark:border-[#2C2C2E] z-40';
    };

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {activeUnit ? (
                    <div className="relative min-h-[500px]">
                        <div className={`sticky top-0 -mx-4 px-4 md:px-6 py-4 mb-2 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 ${getHeaderClasses()}`}>
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <button onClick={() => onSetActiveUnit(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#3A3A3C]">
                                    <ChevronRightIcon className="w-5 h-5 rotate-180 text-slate-500" />
                                </button>
                                <div className="min-w-0">
                                    <h2 className={`text-xl font-black tracking-tight leading-none truncate text-slate-900 dark:text-white`}>
                                        {activeUnit.title}
                                    </h2>
                                    <p className={`text-xs font-bold truncate mt-1 text-slate-500 dark:text-slate-400`}>
                                        {lessons.length + quizzes.length} Items
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex-shrink-0 flex items-center gap-2">
                                {renderGeneratePptButton && renderGeneratePptButton(activeUnit)}
                                <button onClick={() => setIsReordering(!isReordering)} className={`${styles.secondaryButton} !px-4 !py-2 text-xs`}>
                                    <ArrowsUpDownIcon className="w-4 h-4" />
                                    <span className={isReordering ? "inline" : "hidden md:inline"}>{isReordering ? 'Done' : 'Sort'}</span>
                                </button>
                                <AddContentButton 
                                    onAddLesson={() => { setSelectedUnit(activeUnit); setAddLessonModalOpen(true); }} 
                                    onAddQuiz={() => { setSelectedUnit(activeUnit); setAddQuizModalOpen(true); }}
                                    monet={monet}
                                    styles={styles}
                                    className="!px-4 !py-2 text-xs"
                                />
                            </div>
                        </div>

                        {/* --- SPLIT LAYOUT: LESSONS LEFT | QUIZZES RIGHT --- */}
                        <div className="pb-20 w-full px-4 mx-auto pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* LEFT COLUMN: LESSONS */}
                                <div className="flex flex-col gap-4">
                                    <div className="sticky top-20 z-10 py-2 bg-slate-50/95 dark:bg-[#121212]/95 backdrop-blur-sm -mx-2 px-2 rounded-xl flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <BookOpenIcon className="w-4 h-4" />
                                            Learning Materials
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                            {lessons.length}
                                        </span>
                                    </div>

                                    {lessons.length > 0 ? (
                                        <SortableContext items={lessons.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            <div className="flex flex-col gap-3">
                                                {lessons.map(item => (
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
                                            </div>
                                        </SortableContext>
                                    ) : (
                                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-70">
                                            <BookOpenIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                                            <p className="text-sm font-semibold text-slate-500">No Lessons Yet</p>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: QUIZZES */}
                                <div className="flex flex-col gap-4">
                                    <div className="sticky top-20 z-10 py-2 bg-slate-50/95 dark:bg-[#121212]/95 backdrop-blur-sm -mx-2 px-2 rounded-xl flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <ClipboardDocumentListIcon className="w-4 h-4" />
                                            Assessments
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400">
                                            {quizzes.length}
                                        </span>
                                    </div>

                                    {quizzes.length > 0 ? (
                                        <SortableContext items={quizzes.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            <div className="flex flex-col gap-3">
                                                {quizzes.map(item => (
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
                                            </div>
                                        </SortableContext>
                                    ) : (
                                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-70">
                                            <ClipboardDocumentListIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                                            <p className="text-sm font-semibold text-slate-500">No Quizzes Yet</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative max-w-5xl mx-auto px-4">
                        {units.length > 0 && (
                            <div className="flex justify-end mb-4 px-2">
                                <button 
                                    onClick={() => setIsReordering(!isReordering)} 
                                    className={`${styles.secondaryButton} !px-5 !py-2.5 text-sm`}
                                >
                                    {isReordering ? (<span className="text-blue-600 font-bold">Done Sorting</span>) : (<><ArrowsUpDownIcon className="w-4 h-4" /> Reorder Units</>)}
                                </button>
                            </div>
                        )}

                        {units.length > 0 ? (
                            <div className="flex flex-col gap-4 pb-20">
                                <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                                    {units.map((unit, idx) => (
                                        <SortableUnitListRow key={unit.id} unit={unit} index={idx} onSelect={onSetActiveUnit} onAction={handleAction} isReordering={isReordering} monet={monet} styles={styles} />
                                    ))}
                                </SortableContext>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-60">
                                <QueueListIcon className={`w-24 h-24 mb-6 text-slate-200 dark:text-slate-700`} />
                                <h3 className={`text-2xl font-bold text-slate-400 dark:text-slate-500`}>No Units Created</h3>
                                <p className="text-sm text-slate-400 mt-2">Tap the + button to create your first unit.</p>
                            </div>
                        )}
                    </div>
                )}
            </DndContext>

            <ExportTutorialModal 
                isOpen={tutorialModalOpen} 
                onClose={() => { setTutorialModalOpen(false); setItemToExport(null); }}
                onConfirm={handleConfirmExport}
                monet={monet}
            />

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