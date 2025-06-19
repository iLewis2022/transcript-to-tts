const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const textract = require('textract');
const logger = require('./logger');

class FileConverter {
    constructor() {
        this.converters = {
            '.txt': this.readTextFile,
            '.md': this.readTextFile,
            '.docx': this.convertDocx,
            '.doc': this.convertDoc
        };
    }

    async convertToText(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const converter = this.converters[ext];
        
        if (!converter) {
            throw new Error(`Unsupported file type: ${ext}`);
        }
        
        try {
            logger.info(`Converting file: ${path.basename(filePath)} (${ext})`);
            const text = await converter.call(this, filePath);
            logger.success(`File converted successfully: ${text.length} characters`);
            return text;
        } catch (error) {
            logger.error(`File conversion failed: ${error.message}`);
            throw error;
        }
    }

    async readTextFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        return this.normalizeText(content);
    }

    async convertDocx(filePath) {
        const result = await mammoth.extractRawText({ path: filePath });
        
        if (result.messages && result.messages.length > 0) {
            logger.warn('DOCX conversion warnings:', result.messages);
        }
        
        return this.normalizeText(result.value);
    }

    async convertDoc(filePath) {
        return new Promise((resolve, reject) => {
            textract.fromFileWithPath(filePath, (error, text) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(this.normalizeText(text));
                }
            });
        });
    }

    normalizeText(text) {
        // Normalize line endings and clean up whitespace
        return text
            .replace(/\r\n/g, '\n')     // Windows to Unix line endings
            .replace(/\r/g, '\n')        // Old Mac to Unix line endings
            .replace(/\n{3,}/g, '\n\n')  // Multiple blank lines to double
            .replace(/[ \t]+$/gm, '')    // Trailing whitespace
            .trim();
    }
}

module.exports = new FileConverter(); 