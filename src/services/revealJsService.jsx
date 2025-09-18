/**
 * Generates a complete HTML document for a Reveal.js presentation.
 * @param {Array<Object>} slidesData - An array of slide objects from the AI.
 * @returns {string} A full HTML string for the presentation.
 */
export const generateRevealJsHtml = (slidesData) => {
    const slidesHtml = slidesData.map((slide) => {
        const notesContent = (slide.notes && typeof slide.notes === 'object') 
            ? Object.entries(slide.notes).map(([key, value]) => `${key}:\n${value}`).join('\n\n')
            : 'No notes available.';
        const notesHtml = `<aside class="notes">${notesContent}</aside>`;
        
        const bodyHtml = slide.body.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => `<li>${line.replace(/^- /, '').trim()}</li>`)
            .join('');

        return `
            <section>
                <h2>${slide.title}</h2>
                ${bodyHtml ? `<ul>${bodyHtml}</ul>` : ''}
                ${notesHtml}
            </section>
        `;
    }).join('\n');

    return `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lesson Presentation</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.css">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/theme/black.min.css">
          <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-image: url("https://images.unsplash.com/photo-1502790671504-542ad42d5189?auto=format&fit=crop&w=1950&q=80");
                background-size: cover;
                background-position: center;
                background-attachment: fixed;
            }
            .reveal .slides section {
                background: rgba(255, 255, 255, 0.25);
                border-radius: 20px;
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.5);
                color: #1c1e21;
                padding: 2rem;
            }
            .reveal .slides section h2, .reveal .slides section p, .reveal .slides section li {
                color: #1c1e21;
                text-shadow: none;
            }
             .reveal .slides section ul {
                list-style-type: disc;
                margin-left: 1.5em;
            }
          </style>
        </head>
        <body>
          <div class="reveal">
            <div class="slides">
              ${slidesHtml}
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.js"></script>
          <script>
            Reveal.initialize({
              // Disable history updates to prevent iframe security errors
              history: false,
              hash: false
            });
          </script>
        </body>
        </html>
    `;
};