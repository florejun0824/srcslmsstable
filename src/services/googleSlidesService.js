const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const TEMPLATE_ID = process.env.REACT_APP_GOOGLE_SLIDES_TEMPLATE_ID;
const DISCOVERY_DOCS = ["https://slides.googleapis.com/$discovery/rest?version=v1", "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive";

let gapiInited = false;
let gisInited = false;
let tokenClient;

/**
 * Initializes the GAPI client. This is used for making requests to the Google Slides and Drive APIs.
 */
const initializeGapiClient = () => {
    return new Promise((resolve, reject) => {
        if (!window.gapi) return reject(new Error("Google API script (gapi) not loaded."));

        window.gapi.load('client', () => {
            window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
            })
            .then(() => {
                gapiInited = true;
                resolve(window.gapi);
            })
            .catch(error => reject(new Error('Failed to initialize GAPI client: ' + JSON.stringify(error))));
        });
    });
};

/**
 * Initializes the Google Identity Services (GIS) client.
 */
const initializeGisClient = () => {
    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
            return reject(new Error("Google Identity Services (GIS) script not loaded."));
        }
        if (gisInited) return resolve();

        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: () => {},
        });
        gisInited = true;
        resolve();
    });
};


/**
 * Redirects the user to Google's authentication page.
 * @param {object} slideData - The data needed to create the presentation.
 * @param {string} presentationTitle - The title for the new presentation.
 * @param {string} subjectName - The subject name for the folder structure.
 * @param {string} unitName - The unit name for the folder structure.
 */
export const redirectToGoogleAuth = (slideData, presentationTitle, subjectName, unitName) => {
    sessionStorage.setItem('googleSlidesData', JSON.stringify({
        slideData,
        presentationTitle,
        subjectName,
        unitName
    }));
    tokenClient.requestAccessToken({prompt: ''});
};

/**
 * Checks if the user is returning from the Google Auth redirect and handles the token.
 * This function should be called when your application loads.
 * It now ensures the GAPI client is ready before processing the token.
 */
export const handleAuthRedirect = async () => {
    // Ensure the GAPI client is initialized before we try to use it.
    if (!gapiInited) {
        try {
            await initializeGapiClient();
        } catch (error) {
            console.error("Failed to initialize GAPI client during auth redirect handling:", error);
            return false;
        }
    }

    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        // If we have a token, set it in the GAPI client.
        window.gapi.client.setToken({ access_token: accessToken });
        // Remove the token from the URL so it's not visible to the user.
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        return true; // Indicate that auth was successful.
    }
    
    return false; // No auth token found.
};


const findOrCreateFolder = async (folderName, parentFolderId = 'root') => {
    const response = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
    });

    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
        };
        const folder = await window.gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        return folder.result.id;
    }
};

/**
 * The main function to create the presentation. It now checks for authentication first.
 * If not authenticated, it will trigger the redirect flow.
 */
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

        const copiedFile = await window.gapi.client.drive.files.copy({
            fileId: TEMPLATE_ID,
            resource: { name: presentationTitle, parents: [unitFolderId] }
        });
        const presentationId = copiedFile.result.id;

        const presentation = await window.gapi.client.slides.presentations.get({ presentationId });
        const masterSlideId = presentation.result.slides[0].objectId;

        if (presentation.result.slides.length > 1) {
            const deleteRequests = presentation.result.slides.slice(1).map(slide => ({
                deleteObject: { objectId: slide.objectId }
            }));
            await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: deleteRequests });
        }

        if (slideData.length > 1) {
            const duplicateRequests = Array.from({ length: slideData.length - 1 }, () => ({
                duplicateObject: { objectId: masterSlideId }
            }));
            await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: duplicateRequests });
        }

        const finalPresentation = await window.gapi.client.slides.presentations.get({ presentationId });
        const allSlides = finalPresentation.result.slides;

        const populateRequests = [];
        
        const findShapeByTextTag = (pageElements, tag) => {
            if (!pageElements) return null;
            const lowerCaseTag = tag.toLowerCase();
            for (const el of pageElements) {
                if (el.shape && el.shape.text && el.shape.text.textElements) {
                    let fullText = "";
                    el.shape.text.textElements.forEach(textEl => {
                        fullText += textEl.textRun?.content || "";
                    });
                    if (fullText.toLowerCase().includes(lowerCaseTag)) {
                        return el;
                    }
                }
            }
            return null;
        };

        allSlides.forEach((slide, index) => {
            const data = slideData[index];
            if (!data) return;

            const titleShape = findShapeByTextTag(slide.pageElements, '{{title}}');
            const bodyShape = findShapeByTextTag(slide.pageElements, '{{body}}');
            const notesShape = findShapeByTextTag(slide.notesPage?.pageElements, '{{notes}}');
            
            const cleanText = (text) => (text || '').replace(/(\*\*|\*)/g, '').trim();

            if (titleShape) {
                populateRequests.push({ deleteText: { objectId: titleShape.objectId, textRange: { type: 'ALL' } } });
                populateRequests.push({ insertText: { objectId: titleShape.objectId, text: cleanText(data.title) } });
            }

            if (bodyShape) {
                let bodyText = cleanText(data.body);
                bodyText = bodyText.replace(/\n{2,}/g, '\n');
                const bulletLines = bodyText.split('\n').map(line => line.trim().startsWith('- ') ? line.trim().substring(2) : line.trim()).filter(line => line !== '');
                const shouldApplyBullets = bulletLines.length >= 2 && bulletLines.every(l => !l.includes('\n'));
                const cleanedBodyText = bulletLines.join('\n');

                populateRequests.push({ deleteText: { objectId: bodyShape.objectId, textRange: { type: 'ALL' } } });
                populateRequests.push({ insertText: { objectId: bodyShape.objectId, text: cleanedBodyText } });

                if (shouldApplyBullets) {
                    populateRequests.push({
                        createParagraphBullets: {
                            objectId: bodyShape.objectId,
                            textRange: { type: 'ALL' },
                            bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
                        }
                    });
                }

                const bodyTextLength = cleanedBodyText.length;
                let fontSize = 20;
                if (bodyTextLength > 800) fontSize = 14;
                else if (bodyTextLength > 600) fontSize = 16;
                else if (bodyTextLength > 400) fontSize = 18;

                populateRequests.push({
                    updateTextStyle: {
                        objectId: bodyShape.objectId,
                        textRange: { type: 'ALL' },
                        style: { fontSize: { magnitude: fontSize, unit: 'PT' } },
                        fields: 'fontSize'
                    }
                });
            }

            if (notesShape && data.notes) {
                populateRequests.push({ deleteText: { objectId: notesShape.objectId, textRange: { type: 'ALL' } } });
                populateRequests.push({ insertText: { objectId: notesShape.objectId, text: cleanText(data.notes) } });
            }
        });

        if (populateRequests.length > 0) {
            await window.gapi.client.slides.presentations.batchUpdate({ presentationId, requests: populateRequests });
        }

        sessionStorage.removeItem('googleSlidesData');

        const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
        return presentationUrl;

    } catch (error) {
        if (error.message === "REDIRECTING_FOR_AUTH") {
            console.log("Redirecting to Google for authentication...");
            return;
        }
        
        console.error("Error creating Google Slides presentation:", error);
        let message = "Failed to create Google Slides presentation. Please check console for details.";
        if (error?.result?.error?.message) {
            message = `Google API Error: ${error.result.error.message}`;
        } else if (error?.message) {
            message = error.message;
        }
        throw new Error(message);
    }
};