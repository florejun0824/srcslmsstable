const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const TEMPLATE_ID = process.env.REACT_APP_GOOGLE_SLIDES_TEMPLATE_ID;
const DISCOVERY_DOCS = ["https://slides.googleapis.com/$discovery/rest?version=v1", "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive";

let gapiInited = false;
let gisInited = false;
let tokenClient;

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

const requestAccessToken = () => {
    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
            return reject(new Error("Google Identity Services (GIS) script not loaded."));
        }

        if (!gisInited) {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        resolve(tokenResponse);
                    } else {
                        reject(new Error('User closed the authentication popup.'));
                    }
                },
                error_callback: (error) => {
                    reject(new Error('GIS Error: ' + JSON.stringify(error)));
                }
            });
            gisInited = true;
        }
        tokenClient.requestAccessToken();
    });
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

export const createPresentationFromData = async (slideData, presentationTitle, subjectName, unitName) => {
    try {
        if (!TEMPLATE_ID) throw new Error("Google Slides Template ID is not defined.");

        const gapi = gapiInited ? window.gapi : await initializeGapiClient();
        if (!gapi.client.getToken()) gapi.client.setToken(await requestAccessToken());

        const subjectFolderId = await findOrCreateFolder(subjectName);
        const unitFolderId = await findOrCreateFolder(unitName, subjectFolderId);

        const copiedFile = await gapi.client.drive.files.copy({
            fileId: TEMPLATE_ID,
            resource: { name: presentationTitle, parents: [unitFolderId] }
        });
        const presentationId = copiedFile.result.id;

        const presentation = await gapi.client.slides.presentations.get({ presentationId });
        const masterSlideId = presentation.result.slides[0].objectId;

        if (presentation.result.slides.length > 1) {
            const deleteRequests = presentation.result.slides.slice(1).map(slide => ({
                deleteObject: { objectId: slide.objectId }
            }));
            await gapi.client.slides.presentations.batchUpdate({ presentationId, requests: deleteRequests });
        }

        if (slideData.length > 1) {
            const duplicateRequests = Array.from({ length: slideData.length - 1 }, () => ({
                duplicateObject: { objectId: masterSlideId }
            }));
            await gapi.client.slides.presentations.batchUpdate({ presentationId, requests: duplicateRequests });
        }

        const finalPresentation = await gapi.client.slides.presentations.get({ presentationId });
        const allSlides = finalPresentation.result.slides;

        const populateRequests = [];

        // ✅ A more robust helper function to find shapes by their text tags
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

            // Find shapes by the placeholder text from your template
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
            await gapi.client.slides.presentations.batchUpdate({ presentationId, requests: populateRequests });
        }

        const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
        return presentationUrl;

    } catch (error) {
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