const { createFileError } = require('../utils/errorHelpers');

// Graceful dependency loading
let pdfParse;
let mammoth;

try {
  pdfParse = require('pdf-parse');
  console.log('✅ pdf-parse loaded successfully');
} catch (error) {
  console.warn('⚠️  pdf-parse not available:', error.message);
  pdfParse = null;
}

try {
  mammoth = require('mammoth');
  console.log('✅ mammoth loaded successfully');
} catch (error) {
  console.warn('⚠️  mammoth not available:', error.message);
  mammoth = null;
}

/**
 * Document Parser Service
 * Handles text extraction from various file formats
 */

/**
 * Extract text from PDF buffer
 */
const extractPDFText = async (buffer, filename) => {
  if (!pdfParse) {
    console.error(`❌ pdf-parse not available for ${filename}`);
    return {
      text: `[PDF Parser Not Available] - ${filename}\n\nThe pdf-parse library is not installed. Please install it to enable PDF text extraction.\n\nFile size: ${buffer.length} bytes`,
      metadata: {
        pageCount: 0,
        title: filename,
        extractionError: 'pdf-parse dependency not available',
        extractionMethod: 'pdf-parse-unavailable'
      }
    };
  }

  try {
    console.log(`📄 Extracting text from PDF: ${filename}`);
    
    const data = await pdfParse(buffer);
    
    const extractedText = data.text.trim();
    const pageCount = data.numpages;
    const info = data.info || {};
    
    console.log(`✅ PDF extraction completed: ${extractedText.length} characters, ${pageCount} pages`);
    
    // Check if PDF might be scanned (very little text relative to file size)
    const textDensity = extractedText.length / buffer.length;
    const isLikelyScanned = textDensity < 0.001 && extractedText.length < 100;
    
    if (isLikelyScanned) {
      console.warn(`⚠️  PDF might be scanned - low text density: ${filename}`);
    }
    
    return {
      text: extractedText,
      metadata: {
        pageCount,
        title: info.Title || filename,
        author: info.Author || null,
        creator: info.Creator || null,
        producer: info.Producer || null,
        creationDate: info.CreationDate || null,
        textDensity: Math.round(textDensity * 1000000) / 1000000,
        isLikelyScanned,
        extractionMethod: 'pdf-parse'
      }
    };
    
  } catch (error) {
    console.error(`❌ PDF extraction failed for ${filename}:`, error.message);
    
    // Return fallback content for corrupted PDFs
    return {
      text: `[PDF Extraction Failed] - ${filename}\nError: ${error.message}\nFile size: ${buffer.length} bytes`,
      metadata: {
        pageCount: 0,
        title: filename,
        extractionError: error.message,
        extractionMethod: 'pdf-parse-failed'
      }
    };
  }
};

/**
 * Extract text from DOCX buffer
 */
const extractDOCXText = async (buffer, filename) => {
  if (!mammoth) {
    console.error(`❌ mammoth not available for ${filename}`);
    return {
      text: `[DOCX Parser Not Available] - ${filename}\n\nThe mammoth library is not installed. Please install it to enable DOCX text extraction.\n\nFile size: ${buffer.length} bytes`,
      metadata: {
        title: filename,
        extractionError: 'mammoth dependency not available',
        extractionMethod: 'mammoth-unavailable'
      }
    };
  }

  try {
    console.log(`📝 Extracting text from DOCX: ${filename}`);
    
    const result = await mammoth.extractRawText({ buffer });
    
    const extractedText = result.value.trim();
    const messages = result.messages || [];
    
    console.log(`✅ DOCX extraction completed: ${extractedText.length} characters`);
    
    // Log any conversion warnings
    if (messages.length > 0) {
      console.warn(`⚠️  DOCX conversion warnings for ${filename}:`, messages.map(m => m.message));
    }
    
    return {
      text: extractedText,
      metadata: {
        title: filename,
        conversionWarnings: messages.map(m => ({
          type: m.type,
          message: m.message
        })),
        extractionMethod: 'mammoth'
      }
    };
    
  } catch (error) {
    console.error(`❌ DOCX extraction failed for ${filename}:`, error.message);
    
    // Return fallback content for corrupted DOCX files
    return {
      text: `[DOCX Extraction Failed] - ${filename}\nError: ${error.message}\nFile size: ${buffer.length} bytes`,
      metadata: {
        title: filename,
        extractionError: error.message,
        extractionMethod: 'mammoth-failed'
      }
    };
  }
};

/**
 * Extract text from DOC buffer (legacy Word format)
 */
const extractDOCText = async (buffer, filename) => {
  if (!mammoth) {
    console.error(`❌ mammoth not available for ${filename}`);
    return {
      text: `[DOC Parser Not Available] - ${filename}\n\nThe mammoth library is not installed. Please install it to enable DOC text extraction.\n\nLegacy .doc files require mammoth for processing.\n\nFile size: ${buffer.length} bytes`,
      metadata: {
        title: filename,
        extractionError: 'mammoth dependency not available',
        extractionMethod: 'mammoth-unavailable'
      }
    };
  }

  try {
    console.log(`📝 Extracting text from DOC: ${filename}`);
    
    // For legacy DOC files, mammoth can sometimes handle them
    // but it's primarily designed for DOCX
    const result = await mammoth.extractRawText({ buffer });
    
    const extractedText = result.value.trim();
    
    if (extractedText.length < 10) {
      // Likely failed to parse legacy DOC format
      throw new Error('DOC format not fully supported - please convert to DOCX');
    }
    
    console.log(`✅ DOC extraction completed: ${extractedText.length} characters`);
    
    return {
      text: extractedText,
      metadata: {
        title: filename,
        warning: 'Legacy DOC format - DOCX recommended for better compatibility',
        extractionMethod: 'mammoth-legacy'
      }
    };
    
  } catch (error) {
    console.error(`❌ DOC extraction failed for ${filename}:`, error.message);
    
    // Return helpful error message for unsupported DOC files
    return {
      text: `[DOC Format Not Supported] - ${filename}\n\nLegacy .doc files are not fully supported. Please convert to .docx format for better compatibility.\n\nError: ${error.message}`,
      metadata: {
        title: filename,
        extractionError: error.message,
        recommendation: 'Convert to DOCX format',
        extractionMethod: 'doc-unsupported'
      }
    };
  }
};

/**
 * Extract text from plain text files
 */
const extractTextFile = async (buffer, filename, mimetype) => {
  try {
    console.log(`📄 Extracting text from ${mimetype}: ${filename}`);
    
    const extractedText = buffer.toString('utf-8');
    
    console.log(`✅ Text extraction completed: ${extractedText.length} characters`);
    
    return {
      text: extractedText,
      metadata: {
        title: filename,
        encoding: 'utf-8',
        extractionMethod: 'buffer-to-string'
      }
    };
    
  } catch (error) {
    console.error(`❌ Text extraction failed for ${filename}:`, error.message);
    
    // Try different encodings
    try {
      const extractedText = buffer.toString('latin1');
      return {
        text: extractedText,
        metadata: {
          title: filename,
          encoding: 'latin1',
          extractionMethod: 'buffer-to-string-fallback'
        }
      };
    } catch (fallbackError) {
      throw createFileError(`Text extraction failed: ${error.message}`);
    }
  }
};

/**
 * Extract text from JSON files
 */
const extractJSONText = async (buffer, filename) => {
  try {
    console.log(`📊 Extracting text from JSON: ${filename}`);
    
    const jsonData = JSON.parse(buffer.toString('utf-8'));
    const extractedText = JSON.stringify(jsonData, null, 2);
    
    console.log(`✅ JSON extraction completed: ${extractedText.length} characters`);
    
    return {
      text: extractedText,
      metadata: {
        title: filename,
        dataType: 'JSON',
        extractionMethod: 'json-parse'
      }
    };
    
  } catch (error) {
    console.error(`❌ JSON parsing failed for ${filename}:`, error.message);
    
    // Fall back to raw text
    const extractedText = buffer.toString('utf-8');
    return {
      text: extractedText,
      metadata: {
        title: filename,
        parseError: error.message,
        extractionMethod: 'json-parse-failed'
      }
    };
  }
};

/**
 * Main text extraction function
 * Routes to appropriate parser based on MIME type
 */
const extractTextFromBuffer = async (buffer, mimetype, filename) => {
  try {
    console.log(`🔍 Document parser processing: ${filename} (${mimetype})`);
    
    let result;
    
    switch (mimetype) {
      case 'application/pdf':
        result = await extractPDFText(buffer, filename);
        break;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        result = await extractDOCXText(buffer, filename);
        break;
        
      case 'application/msword':
        result = await extractDOCText(buffer, filename);
        break;
        
      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
      case 'text/html':
      case 'text/xml':
        result = await extractTextFile(buffer, filename, mimetype);
        break;
        
      case 'application/json':
        result = await extractJSONText(buffer, filename);
        break;
        
      default:
        console.warn(`⚠️  Unsupported MIME type: ${mimetype} for ${filename}`);
        result = {
          text: `[Unsupported Format] - ${filename}\nMIME Type: ${mimetype}\nFile size: ${buffer.length} bytes\n\nThis file format is not currently supported for text extraction.`,
          metadata: {
            title: filename,
            mimetype,
            extractionMethod: 'unsupported-format'
          }
        };
    }
    
    // Add common metadata
    result.metadata = {
      ...result.metadata,
      filename,
      mimetype,
      fileSize: buffer.length,
      extractedAt: new Date().toISOString(),
      textLength: result.text.length
    };
    
    console.log(`✅ Document parsing completed for ${filename}: ${result.text.length} characters extracted`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Document parsing failed for ${filename}:`, error);
    throw createFileError(`Document parsing failed: ${error.message}`);
  }
};

/**
 * Get supported file types and their capabilities
 */
const getSupportedTypes = () => {
  return {
    'application/pdf': {
      name: 'PDF',
      extensions: ['.pdf'],
      parser: 'pdf-parse',
      features: ['text-extraction', 'metadata', 'scanned-detection']
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      name: 'Word Document (DOCX)',
      extensions: ['.docx'],
      parser: 'mammoth',
      features: ['text-extraction', 'formatting-preservation']
    },
    'application/msword': {
      name: 'Word Document (DOC)',
      extensions: ['.doc'],
      parser: 'mammoth',
      features: ['limited-support'],
      notes: 'Legacy format - DOCX recommended'
    },
    'text/plain': {
      name: 'Text File',
      extensions: ['.txt'],
      parser: 'native',
      features: ['text-extraction', 'encoding-detection']
    },
    'text/markdown': {
      name: 'Markdown',
      extensions: ['.md', '.markdown'],
      parser: 'native',
      features: ['text-extraction']
    },
    'text/csv': {
      name: 'CSV',
      extensions: ['.csv'],
      parser: 'native',
      features: ['text-extraction']
    },
    'application/json': {
      name: 'JSON',
      extensions: ['.json'],
      parser: 'native',
      features: ['text-extraction', 'structure-preservation']
    }
  };
};

module.exports = {
  extractTextFromBuffer,
  extractPDFText,
  extractDOCXText,
  extractDOCText,
  extractTextFile,
  extractJSONText,
  getSupportedTypes
};
