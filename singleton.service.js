// services/singleton.service.js
const AIService = require('./ai.service');
const SessionService = require('./session.service');

// Global instances
let aiServiceInstance = null;
let sessionServiceInstance = null;

/**
 * AI Service singleton
 */
function getAIService() {
  if (!aiServiceInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiServiceInstance = new AIService(apiKey);
    console.log("✅ AI Service singleton initialized");
  }
  return aiServiceInstance;
}

/**
 * Session Service singleton
 */
function getSessionService() {
  if (!sessionServiceInstance) {
    const aiService = getAIService();
    sessionServiceInstance = new SessionService(aiService);
    console.log("✅ Session Service singleton initialized");
  }
  return sessionServiceInstance;
}

/**
 * Reset function (useful for testing or hot reload)
 */
function resetServices() {
  aiServiceInstance = null;
  sessionServiceInstance = null;
  console.log("🔄 Services reset");
}

/**
 * Check if services are ready
 */
function areServicesReady() {
  return !!(aiServiceInstance && sessionServiceInstance);
}

/**
 * Initialize all services
 */
function initializeServices() {
  try {
    getAIService();
    getSessionService();
    console.log("🚀 All services initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
    return false;
  }
}

module.exports = {
  getAIService,
  getSessionService,
  resetServices,
  areServicesReady,
  initializeServices
};