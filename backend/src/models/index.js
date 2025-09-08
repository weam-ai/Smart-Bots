// Export all models from a single file for easy importing
const {
  Agent,
  File,
  ChatSession,
  ChatMessage,
  ApiUsage,
  ScriptTag,
  Visitor
} = require('../schema/mongodb-schema');

module.exports = {
  Agent,
  File,
  ChatSession,
  ChatMessage,
  ApiUsage,
  ScriptTag,
  Visitor
};
