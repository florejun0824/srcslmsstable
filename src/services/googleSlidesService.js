import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

// --- CONFIGURATION ---
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const TEMPLATE_ID = import.meta.env.VITE_GOOGLE_SLIDES_TEMPLATE_ID;

const DISCOVERY_DOCS = [
  "https://slides.googleapis.com/$discovery/rest?version=v1",
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];

const SCOPES = "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive";

// --- STATE MANAGEMENT ---
let gapiInited = false;
let gisInited = false;
let tokenClient;

// --- HELPER: WAIT FOR SCRIPTS TO LOAD ---
// This fixes the "gapi not loaded" race condition by polling for the object
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

// --- 1. INITIALIZE GAPI (Required for BOTH Web and Android) ---
const initializeGapiClient = async () => {
    // FIX: Wait for 'gapi' to exist before trying to use it
    await waitForGlobal('gapi');

    return new Promise((resolve, reject) => {
        window.gapi.load('client', () => {
            window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS })
                .then(() => { 
                    gapiInited = true; 
                    resolve(window.gapi); 
                })
                .catch(error => reject(new Error('Failed to initialize GAPI client: ' + JSON.stringify(error))));
        });
    });
};

// --- 2. INITIALIZE AUTH (The Hybrid Fix) ---
const initializeAuth = async () => {
    // A. NATIVE ANDROID: Initialize the Plugin
    if (Capacitor.isNativePlatform()) {
        await SocialLogin.initialize({
            google: {
                webClientId: CLIENT_ID, // Use your Web Client ID here
                mode: 'online', // <--- IMPORTANT: Must be 'online'
                scopes: [       // <--- MOVED SCOPES HERE (Fixes the "Main Activity" error)
                    'email',
                    'profile',
                    'https://www.googleapis.com/auth/presentations',
                    'https://www.googleapis.com/auth/drive'
                ]
            }
        });
        return; 
    }

    // B. WEB BROWSER: Initialize Standard GIS
    // FIX: Wait for 'google' global to exist
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

// --- 3. GET VALID TOKEN (The "Magic" Function) ---
const ensureValidToken = async (slideData, presentationTitle, subjectName, unitName) => {
    const currentToken = window.gapi.client.getToken();
    if (currentToken && currentToken.access_token) return true;

    if (Capacitor.isNativePlatform()) {
        try {
            console.log("📱 Native Platform detected. Triggering Native Login...");
            
            // --- FIX APPLIED HERE: Removed 'options' block ---
            // The scopes are now handled during initialize(), so we just call login() simply.
            const res = await SocialLogin.login({
                provider: 'google'
            });

            // CRITICAL: We take the token from the Native Plugin and give it to the Web GAPI
            if (res.result && res.result.accessToken && res.result.accessToken.token) {
                window.gapi.client.setToken({
                    access_token: res.result.accessToken.token
                });
                return true;
            } else {
                throw new Error("Native login succeeded but returned no token.");
            }
        } catch (error) {
            console.error("Native Sign-In Failed:", error);
            throw new Error("User cancelled sign-in or native auth failed.");
        }
    } else {
        // WEB FALLBACK
        console.log("💻 Web Platform detected. Using Popup...");
        redirectToGoogleAuth(slideData, presentationTitle, subjectName, unitName);
        throw new Error("REDIRECTING_FOR_AUTH"); 
    }
};

// --- HELPERS (Kept exactly as you had them) ---
export const redirectToGoogleAuth = (slideData, presentationTitle, subjectName, unitName) => {
    sessionStorage.setItem('googleSlidesData', JSON.stringify({ slideData, presentationTitle, subjectName, unitName }));
    if (tokenClient) tokenClient.requestAccessToken({ prompt: '' });
};

export const handleAuthRedirect = async () => {
    if (Capacitor.isNativePlatform()) return true; // Native doesn't use redirects
    
    // FIX: Don't check gapiInited immediately, allow the init function to handle the wait
    try { 
        await initializeGapiClient(); 
        return true;
    } catch (error) { 
        console.error("GAPI Init Error:", error); 
        return false; 
    }
};

const findOrCreateFolder = async (folderName, parentFolderId = 'root') => {
    const escapedFolderName = folderName.replace(/'/g, "\\'");
    const response = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${escapedFolderName}' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
    });
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const fileMetadata = { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] };
        const folder = await window.gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id' });
        return folder.result.id;
    }
};

const findShapeByTextTag = (pageElements, tag) => {
    if (!pageElements) return null;
    const lowerCaseTag = tag.toLowerCase();
    for (const el of pageElements) {
        if (el.shape?.text?.textElements) {
            let fullText = el.shape.text.textElements.map(textEl => textEl.textRun?.content || "").join("");
            if (fullText.toLowerCase().includes(lowerCaseTag)) return el;
        }
    }
    return null;
};

const generateUniqueId = () => 'gen_' + Math.random().toString(36).substr(2, 9);


// --- 4. MAIN FUNCTION (Updated to use Hybrid Auth) ---
export const createPresentationFromData = async (slideData, presentationTitle, subjectName, unitName) => {
    try {
        if (!TEMPLATE_ID) throw new Error("Google Slides Template ID is not defined.");
        
        // Initialize everything
        // Note: These functions now have internal waiting logic, so they won't fail if called early
        await initializeGapiClient();
        await initializeAuth(); 
        
        // GET TOKEN (Native or Web)
        await ensureValidToken(slideData, presentationTitle, subjectName, unitName);
        
        // --- YOUR ORIGINAL LOGIC STARTS HERE (Unchanged) ---
        const subjectFolderId = await findOrCreateFolder(subjectName);
        const unitFolderId = await findOrCreateFolder(unitName, subjectFolderId);

        const copiedFile = await window.gapi.client.drive.files.copy({ fileId: TEMPLATE_ID, resource: { name: presentationTitle, parents: [unitFolderId] } });
        const presentationId = copiedFile.result.id;

        const presentation = await window.gapi.client.slides.presentations.get({ presentationId });
        const masterSlideId = presentation.result.slides[0].objectId;

        if (presentation.result.slides.length > 1) {
            const deleteRequests = presentation.result.slides.slice(1).map(slide => ({ deleteObject: { objectId: slide.objectId } }));
            await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: deleteRequests });
        }
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

            // --- TABLE LOGIC (Restored from your file) ---
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
        
        // 5. SUCCESS: Return the link
        return `https://docs.google.com/presentation/d/${presentationId}/edit`;

    } catch (error) {
        // --- 6. ERROR HANDLING (Updated for Hybrid) ---
        // Retry for native token expiry
        const isTokenError = error.result?.error?.code === 401 || error.result?.error?.code === 403 || error.status === 401;
        if (isTokenError && Capacitor.isNativePlatform()) {
             console.log("Token expired. Retrying native sign-in...");
             await ensureValidToken(slideData, presentationTitle, subjectName, unitName);
             return;
        }

        if (error.message === "REDIRECTING_FOR_AUTH") return;

        console.error("Error creating Google Slides:", error);
        let message = "Failed to create Google Slides presentation.";
        if (error?.result?.error?.message) message = `Google API Error: ${error.result.error.message}`;
        else if (error?.message) message = error.message;
        throw new Error(message);
    }
};