// src/services/exportService.js
import { saveAs } from "file-saver";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { marked } from 'marked';

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

// UPDATED: Added reject handler to prevent infinite Promise hangs if image parsing fails
const getImageDimensions = (base64) => {
    return new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
        i.onerror = () => reject(new Error("Failed to load image to calculate dimensions."));
        i.src = base64;
    });
};

// UPDATED: Added HTTP status check and reader.onerror to prevent infinite Promise hangs
const fetchImageAsBase64 = async (url) => {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image blob."));
    reader.readAsDataURL(blob);
  });
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
};

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
                        // MODIFIED: Changed from 30%/70% to 25%/75% to match PDF requirements
                        colGroup.innerHTML = '<col style="width:25%"><col style="width:75%">';
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

            // MODIFIED: Apply 25/75 width for 2-column tables (ULP style) to save pages
            if (safeMaxCols === 2) {
                content.table.widths = ['25%', '*'];
            } else {
                const colWidth = 100 / safeMaxCols;
                content.table.widths = Array(safeMaxCols).fill(colWidth + '%');
            }

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

async function loadFontToVfs(name, url, pdfMake) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  pdfMake.vfs[name] = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
}

let dejaVuLoaded = false;
async function registerDejaVuFonts(pdfMake) {
  if (dejaVuLoaded) return true;
  try {
    // Note: Ensure these fonts exist in your public/fonts folder!
    await loadFontToVfs("DejaVuSans.ttf", "/fonts/DejaVuSans.ttf", pdfMake);
    await loadFontToVfs("DejaVuSans-Bold.ttf", "/fonts/DejaVuSans-Bold.ttf", pdfMake);
    await loadFontToVfs("DejaVuSans-Oblique.ttf", "/fonts/DejaVuSans-Oblique.ttf", pdfMake);
    await loadFontToVfs("DejaVuSans-BoldOblique.ttf", "/fonts/DejaVuSans-BoldOblique.ttf", pdfMake);

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

// --- EXPORT FUNCTIONS ---

export const generateDocx = async (lesson, subject, showToast) => {
    // Dynamic Imports
    const [
        { default: htmlToDocx },
        { asBlob }
    ] = await Promise.all([
        import('html-to-docx-ts'),
        import('html-docx-js-typescript')
    ]);

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
                
                // Process content
                const rawContent = processLatex(page.content || '');
                const processedContent = preProcessHtmlForExport(rawContent, 'docx');

                // Fix math images
                const mathImages = processedContent.querySelectorAll('img.math-img');
                if (mathImages.length > 0) {
                    await Promise.all(Array.from(mathImages).map(async (img) => {
                        if (img.src && img.src.startsWith('http')) {
                            try {
                                let fetchUrl = img.src.replace(/dpi%7B1080%7D/g, 'dpi%7B200%7D').replace(/dpi\{1080\}/g, 'dpi{200}');
                                const base64 = await fetchImageAsBase64(fetchUrl);
                                const { w, h } = await getImageDimensions(base64);
                                img.removeAttribute('style');
                                const scaleFactor = 2.5; 
                                const scaledWidth = Math.max(1, Math.round(w / scaleFactor));
                                const scaledHeight = Math.max(1, Math.round(h / scaleFactor));
                                img.src = base64;
                                img.setAttribute('width', scaledWidth);
                                img.setAttribute('height', scaledHeight);
                                img.style.cssText = `width: ${scaledWidth}px; height: ${scaledHeight}px; vertical-align: -10%; display: inline-block;`;
                            } catch (err) { console.warn("Failed to download math image", err); }
                        }
                    }));
                }

                // Handle SVGs
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
                        @page Section1 { size: 8.5in 13in; margin: 1.0in 0.5in 1.0in 0.5in; mso-header-margin: 0.5in; mso-footer-margin: 0.5in; }
                        div.Section1 { page: Section1; }
                        body { font-family: 'Arial', sans-serif; }
                        
                        /* MODIFIED: Fixed table layout to prevent destruction */
                        table { 
                            border-collapse: collapse; 
                            width: 100%; 
                            table-layout: fixed; 
                            margin-bottom: 10px; 
                        }
                        
                        td, th { border: 1px solid black; padding: 8px; vertical-align: top; word-wrap: break-word; }
                        th { background-color: #f0f0f0; font-weight: bold; }
                        thead { display: table-header-group; }
                        img { max-width: 100%; }
                    </style>
                </head>
                <body>
                    <div style="display:none;">${headerBlock}${footerBlock}</div>
                    <div class="Section1">${mainContent}</div>
                </body>
                </html>
            `;

            // MODIFIED: Updated margins (1440 = 1 inch, 720 = 0.5 inch)
            const blob = await asBlob(fullHtml, {
                orientation: 'portrait',
                margins: { 
                    top: 1440,     // 1 inch
                    right: 720,    // 0.5 inch
                    bottom: 1440,  // 1 inch
                    left: 720      // 0.5 inch
                }
            });

            if (isNativePlatform()) {
                await nativeSave(blob, sanitizedFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', showToast);
            } else {
                saveAs(blob, sanitizedFileName);
            }

        } else {
            // Regular Lesson Export
            const headerHtml = headerBase64 ? `<p align="center" style="text-align: center; margin-bottom: 0;"><img src="${headerBase64}" width="650" style="width: 100%; max-width: 650px; height: auto;" /></p>` : '';
            const footerHtml = footerBase64 ? `<p align="center" style="text-align: center; margin-top: 0;"><img src="${footerBase64}" width="650" style="width: 100%; max-width: 650px; height: auto;" /></p>` : '';

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

            // Math Image Scaling (Regular Export)
            const mathImages = processedDiv.querySelectorAll('img.math-img');
            if (mathImages.length > 0) {
                await Promise.all(Array.from(mathImages).map(async (img) => {
                    if (img.src && img.src.startsWith('http')) {
                        try {
                            let fetchUrl = img.src.replace(/dpi%7B1080%7D/g, 'dpi%7B200%7D').replace(/dpi\{1080\}/g, 'dpi{200}');
                            const base64 = await fetchImageAsBase64(fetchUrl);
                            const { w, h } = await getImageDimensions(base64);
                            img.removeAttribute('style');
                            const scaleFactor = 2.5; 
                            const scaledWidth = Math.max(1, Math.round(w / scaleFactor));
                            const scaledHeight = Math.max(1, Math.round(h / scaleFactor));
                            img.src = base64;
                            img.setAttribute('width', scaledWidth);
                            img.setAttribute('height', scaledHeight);
                            img.style.cssText = `width: ${scaledWidth}px; height: ${scaledHeight}px; vertical-align: -10%; display: inline-block;`;
                        } catch (err) { console.warn("Failed to download math image", err); }
                    }
                }));
            }

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
        throw error;
    }
};

export const generatePdf = async (lesson, subject, showToast) => {
    // Dynamic Imports
    const [
        { default: pdfMake },
        { default: pdfFonts },
        { default: htmlToPdfmake }
    ] = await Promise.all([
        import("pdfmake/build/pdfmake"),
        import("pdfmake/build/vfs_fonts"),
        import("html-to-pdfmake")
    ]);
    
    // Assign vfs correctly
    pdfMake.vfs = pdfFonts && pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

    const isULP = lesson.contentType === 'teacherGuide';
    const isATG = lesson.contentType === 'teacherAtg';
    const isSpecialDoc = isULP || isATG;

    const docLabel = isULP ? "ULP" : (isATG ? "ATG" : "Lesson");
    const suffix = isULP ? "_ULP" : (isATG ? "_ATG" : "");

    const pageSize = isSpecialDoc ? { width: 612, height: 936 } : 'A4';
    const pageMargins = isSpecialDoc ? [36, 80, 36, 60] : [40, 80, 40, 60];

    showToast(`Preparing ${docLabel} PDF...`, "info");

    try {
        const fontsLoaded = await registerDejaVuFonts(pdfMake);
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

                const pdfResult = htmlToPdfmake(finalHtml, {
                    defaultStyles: {
                        fontSize: 9,
                        lineHeight: 1.2,
                        alignment: 'justify',
                        margin: [0, 0, 0, 5]
                    },
                    tagStyles: {
                        blockquote: {
                            background: '#f5f7fa',
                            margin: [20, 5, 20, 10],
                            color: '#334155',
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
        throw e;
    }
};