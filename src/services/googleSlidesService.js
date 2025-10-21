const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const TEMPLATE_ID = import.meta.env.VITE_GOOGLE_SLIDES_TEMPLATE_ID;

const DISCOVERY_DOCS = [
  "https://slides.googleapis.com/$discovery/rest?version=v1",
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];

const SCOPES =
  "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive";


let gapiInited = false;
let gisInited = false;
let tokenClient;

const initializeGapiClient = () => {
    return new Promise((resolve, reject) => {
        if (!window.gapi) return reject(new Error("Google API script (gapi) not loaded."));
        window.gapi.load('client', () => {
            window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS })
                .then(() => { gapiInited = true; resolve(window.gapi); })
                .catch(error => reject(new Error('Failed to initialize GAPI client: ' + JSON.stringify(error))));
        });
    });
};

const initializeGisClient = () => {
    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) return reject(new Error("Google Identity Services (GIS) script not loaded."));
        if (gisInited) return resolve();
        tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: () => {} });
        gisInited = true;
        resolve();
    });
};

export const redirectToGoogleAuth = (slideData, presentationTitle, subjectName, unitName) => {
    sessionStorage.setItem('googleSlidesData', JSON.stringify({ slideData, presentationTitle, subjectName, unitName }));
    tokenClient.requestAccessToken({ prompt: '' });
};

export const handleAuthRedirect = async () => {
    if (!gapiInited) {
        try { await initializeGapiClient(); } 
        catch (error) { console.error("Failed to initialize GAPI client during auth redirect handling:", error); return false; }
    }
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
        window.gapi.client.setToken({ access_token: accessToken });
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        return true;
    }
    return false;
};

const findOrCreateFolder = async (folderName, parentFolderId = 'root') => {
    const response = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
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

const formatNotesToString = (notesObject) => {
    if (!notesObject || typeof notesObject !== 'object') return typeof notesObject === 'string' ? notesObject : '';
    const { essentialQuestions, talkingPoints, interactiveElement, slideTiming } = notesObject;
    const sections = [];
    if (essentialQuestions) sections.push(`🔵 ESSENTIAL QUESTIONS:\n${essentialQuestions}`);
    if (talkingPoints) sections.push(`🎙️ TALKING POINTS:\n${talkingPoints}`);
    if (interactiveElement) sections.push(`🤝 INTERACTIVE ELEMENT:\n${interactiveElement}`);
    if (slideTiming) sections.push(`⏱️ SUGGESTED TIMING: ${slideTiming}`);
    return sections.join('\n\n- - -\n\n').trim();
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

const findSpeakerNotesObjectId = async (presentationId, slideObjectId) => {
    try {
        const response = await window.gapi.client.slides.presentations.pages.get({
            presentationId,
            pageObjectId: slideObjectId,
            fields: 'notesPage(notesProperties(speakerNotesObjectId))',
        });
        return response.result?.notesPage?.notesProperties?.speakerNotesObjectId || null;
    } catch (error) {
        console.error("Error fetching notes page for slide:", slideObjectId, error);
        return null;
    }
};

export const createPresentationFromData = async (slideData, presentationTitle, subjectName, unitName) => {
    try {
        if (!TEMPLATE_ID) throw new Error("Google Slides Template ID is not defined.");
        if (!gapiInited) await initializeGapiClient();
        if (!gisInited) await initializeGisClient();
        if (!window.gapi.client.getToken()) {
            redirectToGoogleAuth(slideData, presentationTitle, subjectName, unitName);
            throw new Error("REDIRECTING_FOR_AUTH");
        }
        
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

            if (bodyShape) {
                const cleanedBodyText = cleanText(data.body).replace(/\n{2,}/g, '\n');
                populateRequests.push({ deleteText: { objectId: bodyShape.objectId, textRange: { type: 'ALL' } } });
                populateRequests.push({ insertText: { objectId: bodyShape.objectId, text: cleanedBodyText } });

                if (cleanedBodyText.length > 0) {
                    const bulletLines = cleanedBodyText.split('\n').map(line => line.trim());
                    const shouldApplyBullets = bulletLines.length >= 2 && bulletLines.every(l => l.startsWith('- '));
                    if (shouldApplyBullets) {
                        populateRequests.push({ createParagraphBullets: { objectId: bodyShape.objectId, textRange: { type: 'ALL' }, bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE' } });
                    }
                    let fontSize = 20;
                    if (cleanedBodyText.length > 800) fontSize = 14;
                    else if (cleanedBodyText.length > 600) fontSize = 16;
                    else if (cleanedBodyText.length > 400) fontSize = 18;
                    populateRequests.push({ updateTextStyle: { objectId: bodyShape.objectId, textRange: { type: 'ALL' }, style: { fontSize: { magnitude: fontSize, unit: 'PT' } }, fields: 'fontSize' } });
                }
            }
            
            const formattedNotes = formatNotesToString(data.notes);
            const speakerNotesObjectId = await findSpeakerNotesObjectId(presentationId, slide.objectId);
            if (speakerNotesObjectId) {
                populateRequests.push({
                    deleteText: {
                        objectId: speakerNotesObjectId,
                        textRange: { type: 'ALL' }
                    }
                });
                if (formattedNotes) {
                    populateRequests.push({
                        insertText: {
                            objectId: speakerNotesObjectId,
                            text: formattedNotes,
                            insertionIndex: 0
                        }
                    });
                }
            }
        }

        if (populateRequests.length > 0) {
            const batchSize = 500;
            for (let i = 0; i < populateRequests.length; i += batchSize) {
                const batch = populateRequests.slice(i, i + batchSize);
                await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: batch });
            }
        }

        sessionStorage.removeItem('googleSlidesData');
        return `https://docs.google.com/presentation/d/${presentationId}/edit`;

    } catch (error) {
        if (error.message === "REDIRECTING_FOR_AUTH") {
            console.log("Redirecting to Google for authentication...");
            return;
        }
        console.error("Error creating Google Slides presentation:", error);
        let message = "Failed to create Google Slides presentation.";
        if (error?.result?.error?.message) message = `Google API Error: ${error.result.error.message}`;
        else if (error?.message) message = error.message;
        throw new Error(message);
    }
};