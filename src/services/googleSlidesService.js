// googleSlidesService.js
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

// --- CONFIGURATION ---
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const TEMPLATE_FOLDER_ID = import.meta.env.VITE_GOOGLE_TEMPLATE_FOLDER_ID; // Optional: Locks picker to this folder

const DISCOVERY_DOCS = [
  "https://slides.googleapis.com/$discovery/rest?version=v1",
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];

// STRICT SCOPE: Only drive.file (Passes Google Verification)
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// --- STATE MANAGEMENT ---
let gapiInited = false;
let gisInited = false;
let pickerInited = false; 
let tokenClient;

// --- HELPER: WAIT FOR SCRIPTS TO LOAD ---
const waitForGlobal = (key, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        if (window[key]) return resolve(window[key]);
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window[key]) {
                clearInterval(interval);
                resolve(window[key]);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error(`${key} script failed to load within ${timeout}ms.`));
            }
        }, 100);
    });
};

// --- 1. INITIALIZE GAPI & PICKER ---
const initializeGapiClient = async () => {
    await waitForGlobal('gapi');
    return new Promise((resolve, reject) => {
        // LOAD BOTH 'client' AND 'picker' libraries
        window.gapi.load('client:picker', () => {
            window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS })
                .then(() => { 
                    gapiInited = true; 
                    pickerInited = true;
                    resolve(window.gapi); 
                })
                .catch(error => reject(new Error('Failed to initialize GAPI client: ' + JSON.stringify(error))));
        });
    });
};

// --- 2. INITIALIZE AUTH ---
const initializeAuth = async () => {
    if (Capacitor.isNativePlatform()) {
        await SocialLogin.initialize({
            google: {
                webClientId: CLIENT_ID,
                mode: 'online', 
                scopes: ['email', 'profile', 'https://www.googleapis.com/auth/drive.file']
            }
        });
        return; 
    }

    await waitForGlobal('google');
    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) return reject(new Error("GIS script not loaded."));
        if (gisInited) return resolve();
        
        tokenClient = window.google.accounts.oauth2.initTokenClient({ 
            client_id: CLIENT_ID, 
            scope: SCOPES, 
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    window.gapi.client.setToken(tokenResponse);
                }
            } 
        });
        
        gisInited = true;
        resolve();
    });
};

// --- 3. GET VALID TOKEN ---
const ensureValidToken = async () => {
    const currentToken = window.gapi.client.getToken();
    if (currentToken && currentToken.access_token) return currentToken.access_token;

    if (Capacitor.isNativePlatform()) {
        try {
            const res = await SocialLogin.login({ provider: 'google' });
            if (res.result && res.result.accessToken && res.result.accessToken.token) {
                window.gapi.client.setToken({ access_token: res.result.accessToken.token });
                return res.result.accessToken.token;
            } else {
                throw new Error("Native login succeeded but returned no token.");
            }
        } catch (error) {
            throw new Error("User cancelled sign-in or native auth failed.");
        }
    } else {
        // Trigger generic Auth flow (caller handles redirect/popup)
        if (tokenClient) {
             tokenClient.requestAccessToken({ prompt: '' });
             throw new Error("REDIRECTING_FOR_AUTH");
        }
    }
};

// --- 4. OPEN GOOGLE PICKER (Multi-Select Supported) ---
export const openTemplatePicker = async (multiSelect = false) => {
    try {
        await initializeGapiClient();
        await initializeAuth();
        const accessToken = await ensureValidToken();

        if (!pickerInited) throw new Error("Google Picker API not loaded.");

        return new Promise((resolve, reject) => {
            const view = new window.google.picker.DocsView(window.google.picker.ViewId.PRESENTATIONS);
            
            // 1. Theme Store Logic: Show Grid for visuals
            view.setMode(window.google.picker.DocsViewMode.GRID);
            
            // SAFEGUARD: Ensure method exists before calling
            if (typeof view.setIncludeFolders === 'function') {
                view.setIncludeFolders(true); 
            }

            // 2. Folder Lock: If .env has a folder ID, force the picker to open there
            if (TEMPLATE_FOLDER_ID) {
                view.setParent(TEMPLATE_FOLDER_ID);
            }

            const builder = new window.google.picker.PickerBuilder()
                .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
                .setAppId(CLIENT_ID)
                .setOAuthToken(accessToken) // Grants access to the picked file(s)!
                .addView(view)
                .setDeveloperKey(API_KEY)
                .setCallback((data) => {
                    if (data.action === window.google.picker.Action.PICKED) {
                        if (multiSelect) {
                            // Return ARRAY of templates for your "Theme Store" import
                            const templates = data.docs.map(doc => ({
                                id: doc.id,
                                name: doc.name,
                                iconUrl: doc.iconUrl,
                                lastEditedUtc: doc.lastEditedUtc
                            }));
                            resolve(templates);
                        } else {
                            // Return SINGLE ID for direct generation
                            const fileId = data.docs[0].id;
                            resolve(fileId);
                        }
                    } else if (data.action === window.google.picker.Action.CANCEL) {
                        resolve(null);
                    }
                });

            // 3. Enable Multi-Select if requested
            if (multiSelect) {
                builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
                builder.setTitle("Select All Templates to Import (Ctrl+A)");
            } else {
                builder.setTitle("Select a Slide Template");
            }

            const picker = builder.build();
            picker.setVisible(true);
        });
    } catch (error) {
        if (error.message === "REDIRECTING_FOR_AUTH") return;
        console.error("Picker Error:", error);
        throw error;
    }
};

// --- 5. MAIN GENERATION FUNCTION ---
export const createPresentationFromData = async (slideData, presentationTitle, subjectName, unitName, templateId) => {
    try {
        if (!templateId) throw new Error("No Template ID provided. Please select a template.");
        
        await initializeGapiClient();
        await initializeAuth(); 
        await ensureValidToken();
        
        // --- SAFEGUARD INPUTS ---
        const safeSubjectName = (typeof subjectName === 'object' ? (subjectName?.title || subjectName?.name) : subjectName) || 'General Subject';
        const safeUnitName = (typeof unitName === 'object' ? (unitName?.title || unitName?.name) : unitName) || 'General Unit';
        const safeTitle = presentationTitle || 'New Presentation';

        // --- LOGIC STARTS HERE ---
        const subjectFolderId = await findOrCreateFolder(safeSubjectName);
        const unitFolderId = await findOrCreateFolder(safeUnitName, subjectFolderId);

        // The picker has granted us permission to this SPECIFIC templateId
        const copiedFile = await window.gapi.client.drive.files.copy({ 
            fileId: templateId, 
            resource: { name: safeTitle, parents: [unitFolderId] } 
        });
        
        const presentationId = copiedFile.result.id;
        
        // ... (Slide Population Logic) ...
        const presentation = await window.gapi.client.slides.presentations.get({ presentationId });
        const masterSlideId = presentation.result.slides[0].objectId;

        // Delete placeholder slides if they exist (except the first one)
        if (presentation.result.slides.length > 1) {
            const deleteRequests = presentation.result.slides.slice(1).map(slide => ({ deleteObject: { objectId: slide.objectId } }));
            await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: deleteRequests });
        }
        
        // Duplicate master slide to match data length
        if (slideData.length > 1) {
            const duplicateRequests = Array.from({ length: slideData.length - 1 }, () => ({ duplicateObject: { objectId: masterSlideId } }));
            await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: duplicateRequests });
        }

        const finalPresentation = await window.gapi.client.slides.presentations.get({ presentationId });
        const allSlides = finalPresentation.result.slides;
        const populateRequests = [];
        
        // Loop through slides and fill content
        for (const [index, slide] of allSlides.entries()) {
            const data = slideData[index];
            if (!data) continue;

            const titleShape = findShapeByTextTag(slide.pageElements, '{{title}}');
            const bodyShape = findShapeByTextTag(slide.pageElements, '{{body}}');
            const cleanText = (text) => (text || '').replace(/(\*\*|\*)/g, '').trim();

            if (titleShape) {
                populateRequests.push({ deleteText: { objectId: titleShape.objectId, textRange: { type: 'ALL' } } });
                populateRequests.push({ insertText: { objectId: titleShape.objectId, text: cleanText(data.title) } });
            }

            // --- TABLE LOGIC ---
            const hasTableRows = data.tableData && Array.isArray(data.tableData.rows) && data.tableData.rows.length > 0;
            const hasHeaders = data.tableData && Array.isArray(data.tableData.headers) && data.tableData.headers.length > 0;
            const hasTableData = hasTableRows;

            if (hasTableData && bodyShape) {
                populateRequests.push({ deleteObject: { objectId: bodyShape.objectId } });

                const headers = hasHeaders ? data.tableData.headers : [];
                const rowsCount = data.tableData.rows.length + (hasHeaders ? 1 : 0);
                const colsCount = hasHeaders ? headers.length : (data.tableData.rows[0]?.length || 1);
                
                const tableId = generateUniqueId();
                const SAFE_WIDTH = { magnitude: 600, unit: 'PT' };
                const SAFE_HEIGHT = { magnitude: 300, unit: 'PT' };
                const SAFE_X = 50; 
                const SAFE_Y = 100; 

                populateRequests.push({
                    createTable: {
                        objectId: tableId,
                        elementProperties: {
                            pageObjectId: slide.objectId,
                            transform: { scaleX: 1, scaleY: 1, translateX: SAFE_X, translateY: SAFE_Y, unit: 'PT' },        
                            size: { width: SAFE_WIDTH, height: SAFE_HEIGHT }
                        },
                        rows: rowsCount,
                        columns: colsCount
                    }
                });

                const addCellText = (rIndex, cIndex, text, isHeader = false) => {
                    const textStr = String(text || "").trim();
                    if (textStr.length === 0) return;

                    populateRequests.push({ insertText: { objectId: tableId, cellLocation: { rowIndex: rIndex, columnIndex: cIndex }, text: textStr, insertionIndex: 0 } });
                    
                    if (isHeader) {
                        populateRequests.push({ updateTextStyle: { objectId: tableId, cellLocation: { rowIndex: rIndex, columnIndex: cIndex }, style: { bold: true }, textRange: { type: 'ALL' }, fields: 'bold' } });
                        populateRequests.push({ updateTableCellProperties: { objectId: tableId, tableRange: { location: { rowIndex: rIndex, columnIndex: cIndex }, rowSpan: 1, columnSpan: 1 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.9, green: 0.9, blue: 0.9 } } } } }, fields: 'tableCellBackgroundFill.solidFill.color' } });
                    }
                };

                if (hasHeaders) {
                    headers.forEach((header, colIndex) => { if (colIndex < colsCount) addCellText(0, colIndex, header, true); });
                }
                const rowOffset = hasHeaders ? 1 : 0;
                data.tableData.rows.forEach((row, rowIndex) => {
                    if (Array.isArray(row)) {
                         row.forEach((cellText, colIndex) => { if (colIndex < colsCount) addCellText(rowIndex + rowOffset, colIndex, cellText); });
                    }
                });

            } else if (bodyShape) {
                // --- BODY TEXT LOGIC ---
                const cleanedBodyText = cleanText(data.body).replace(/\n{2,}/g, '\n');
                populateRequests.push({ deleteText: { objectId: bodyShape.objectId, textRange: { type: 'ALL' } } });
                populateRequests.push({ insertText: { objectId: bodyShape.objectId, text: cleanedBodyText } });

                if (cleanedBodyText.length > 0) {
                    const bulletLines = cleanedBodyText.split('\n').map(line => line.trim());
                    if (bulletLines.length >= 2 && bulletLines.every(l => l.startsWith('- '))) {
                        populateRequests.push({ createParagraphBullets: { objectId: bodyShape.objectId, textRange: { type: 'ALL' }, bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE' } });
                    }
                    let fontSize = 20;
                    if (cleanedBodyText.length > 800) fontSize = 14;
                    else if (cleanedBodyText.length > 600) fontSize = 16;
                    else if (cleanedBodyText.length > 400) fontSize = 18;
                    populateRequests.push({ updateTextStyle: { objectId: bodyShape.objectId, textRange: { type: 'ALL' }, style: { fontSize: { magnitude: fontSize, unit: 'PT' } }, fields: 'fontSize' } });
                }
            }
            
            // --- SPEAKER NOTES LOGIC ---
            const formattedNotes = data.notes;
            const notesPageId = slide.slideProperties?.notesPage?.objectId;
            let speakerNotesObjectId = slide.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId;
            
            if (formattedNotes && notesPageId) {
                if (!speakerNotesObjectId) {
                    speakerNotesObjectId = `notes_${generateUniqueId()}`;
                    populateRequests.push({ createShape: { objectId: speakerNotesObjectId, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: notesPageId, size: { height: { magnitude: 400, unit: 'PT' }, width: { magnitude: 550, unit: 'PT' } }, transform: { scaleX: 1, scaleY: 1, translateX: 35, translateY: 60, unit: 'PT' } } } });
                    populateRequests.push({ updateShapeProperties: { objectId: speakerNotesObjectId, shapeProperties: { placeholder: { type: 'BODY' } }, fields: 'placeholder.type' } });
                }
                populateRequests.push({ deleteText: { objectId: speakerNotesObjectId, textRange: { type: 'ALL' } } });
                populateRequests.push({ insertText: { objectId: speakerNotesObjectId, text: formattedNotes, insertionIndex: 0 } });
            }
        }

        if (populateRequests.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < populateRequests.length; i += batchSize) {
                const batch = populateRequests.slice(i, i + batchSize);
                await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: batch });
            }
        }

        sessionStorage.removeItem('googleSlidesData');
        return `https://docs.google.com/presentation/d/${presentationId}/edit`;

    } catch (error) {
        if (error.message === "REDIRECTING_FOR_AUTH") return;
        
        // Native Retry Logic
        const isTokenError = error.result?.error?.code === 401 || error.result?.error?.code === 403 || error.status === 401;
        if (isTokenError && Capacitor.isNativePlatform()) {
             console.log("Token expired. Retrying native sign-in...");
             await ensureValidToken(); 
             // Retry generation (recursive call)
             return createPresentationFromData(slideData, presentationTitle, subjectName, unitName, templateId);
        }

        console.error("Error creating Google Slides:", error);
        throw error;
    }
};

// --- HELPERS ---
const findOrCreateFolder = async (folderName, parentFolderId = 'root') => {
    // SAFEGUARD: handle undefined folderName or object passed as name
    const safeName = (typeof folderName === 'string' ? folderName : 'Untitled Folder');
    const escapedFolderName = safeName.replace(/'/g, "\\'");
    
    const response = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${escapedFolderName}' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
    });
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const fileMetadata = { name: safeName, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] };
        const folder = await window.gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id' });
        return folder.result.id;
    }
};

const findShapeByTextTag = (pageElements, tag) => {
    if (!pageElements) return null;
    const lowerCaseTag = (tag || "").toLowerCase();
    
    for (const el of pageElements) {
        if (el.shape?.text?.textElements) {
            // SAFEGUARD: Ensure we have a string before checking includes
            let fullText = el.shape.text.textElements
                .map(textEl => textEl.textRun?.content || "")
                .join("");
            
            if (fullText && fullText.toLowerCase().includes(lowerCaseTag)) {
                return el;
            }
        }
    }
    return null;
};

const generateUniqueId = () => 'gen_' + Math.random().toString(36).substr(2, 9);
export const redirectToGoogleAuth = () => { if (tokenClient) tokenClient.requestAccessToken({ prompt: '' }); };
export const handleAuthRedirect = async () => { try { await initializeGapiClient(); return true; } catch (error) { return false; } };