// Export all models from a single file for easy importing
const {
  Agent,
  File,
  FileChunk,
  ChatSession,
  ChatMessage,
  ApiUsage,
  ScriptTag,
  Visitor
} = require('../schema/mongodb-schema');

module.exports = {
  Agent,
  File,
  FileChunk,
  ChatSession,
  ChatMessage,
  ApiUsage,
  ScriptTag,
  Visitor
};
