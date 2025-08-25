import { FastifyPluginAsync } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import hljs from 'highlight.js';

const GettingStartedDoc: FastifyPluginAsync = async (fastify) => {
  fastify.get('/getting-started', async (_, reply) => {
    const markdownPath = path.resolve(process.cwd(), 'docs/getting-started.md');

    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      const validLang = lang && hljs.getLanguage(lang) ? lang : undefined;
      const highlighted = validLang
        ? hljs.highlight(text, { language: validLang }).value
        : hljs.highlightAuto(text).value;

      return `<pre><code class="hljs ${lang ?? ''}">${highlighted}</code></pre>`;
    };

    marked.setOptions({ renderer });

    try {
      const rawMarkdown = await fs.readFile(markdownPath, 'utf-8');
      const html = marked.parse(rawMarkdown);

      reply.type('text/html').send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Getting Started</title>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
          />
          <style>
            body {
              background-color: #000;
              font-family: system-ui, sans-serif;
              max-width: 800px;
              margin: auto;
              padding: 2rem;
              line-height: 1.6;
              color: #eee;
            }
            code, pre {
              background-color: #161616;
              padding: 0.25em 0.5em;
              border-radius: 4px;
              font-family: monospace;
            }
            h1, h2, h3 {
              color: #fff;
            }
            a {
              color: #2B7FFF;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            #optionBar {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div id="doc-content">
            ${html}
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      reply
        .status(500)
        .send({ message: 'Failed to load documentation.', err: error });
    }
  });
};

export default GettingStartedDoc;
