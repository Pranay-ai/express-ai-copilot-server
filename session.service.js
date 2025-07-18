// services/session.service.js
const { v4: uuidv4 } = require('uuid');

class SessionService {
  constructor(aiService) {
    this.aiService = aiService;
    this.sessions = new Map();
  }

  /**
   * Create a new chat session
   */
  createSession(schema) {
    // Validate schema
    if (!this.aiService.validateSchema(schema)) {
      throw new Error("Invalid schema format");
    }

    // Create AI chat instance
    const chat = this.aiService.createChat(schema);

    // Create session
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      id: sessionId,
      schema,
      chat,
      createdAt: new Date(),
      accumulatedFormData: {} // Track accumulated form data
    });

    return sessionId;
  }

  /**
   * Send a message in a session
   */
  async sendMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const response = await this.aiService.sendMessage(session.chat, message);
    
    // Handle both string and object responses
    if (typeof response === 'string') {
      return response;
    }

    // If it's an object with form_data array, process the array
    if (response.form_data && Array.isArray(response.form_data)) {
      // Process each extracted field from array
      response.form_data.forEach(field => {
        if (field.key && field.value) {
          session.accumulatedFormData[field.key] = field.value;
        }
      });
      
      console.log('New form data from AI:', response.form_data);
      console.log('Updated accumulated form data:', session.accumulatedFormData);
      
      // Return response with accumulated data
      return {
        ai_message: response.ai_message,
        form_data: { ...session.accumulatedFormData }
      };
    }

    // Legacy: If it's an object with form_data object, merge with accumulated data
    if (response.form_data && typeof response.form_data === 'object' && !Array.isArray(response.form_data)) {
      // Merge new form data with accumulated data
      Object.assign(session.accumulatedFormData, response.form_data);
      
      console.log('New form data from AI:', response.form_data);
      console.log('Updated accumulated form data:', session.accumulatedFormData);
      
      // Return response with accumulated data
      return {
        ai_message: response.ai_message,
        form_data: { ...session.accumulatedFormData }
      };
    }

    return response;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId) {
    return this.sessions.has(sessionId);
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    return session
      ? {
          id: session.id,
          schema: session.schema,
          createdAt: session.createdAt,
          accumulatedFormData: session.accumulatedFormData
        }
      : null;
  }

  /**
   * Get total number of active sessions
   */
  getSessionCount() {
    return this.sessions.size;
  }

  /**
   * Get all session IDs
   */
  getAllSessionIds() {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clean up expired sessions (optional - you can call this periodically)
   */
  cleanupExpiredSessions(maxAgeMinutes = 60) {
    const now = new Date();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const ageMinutes = (now - session.createdAt) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }

    return expiredSessions.length;
  }
}

module.exports = SessionService;