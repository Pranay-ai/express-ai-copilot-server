// services/ai.service.js
const { Chat, GoogleGenAI, Type } = require("@google/genai");

class AIService {
  constructor(apiKey) {
    if (!apiKey || apiKey === "YOUR_API_KEY") {
      throw new Error("Valid Google AI API key is required");
    }
    this.genAI = new GoogleGenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Create a new chat instance with the given schema
   */
  createChat(schema) {
    const schemaFields = Object.keys(schema);
    const fieldDescriptions = schemaFields.map(field => `- ${field}: ${schema[field]} type`).join('\n');
    
    const systemInstruction = `You are a helpful AI form assistant. Your task is to help users fill out a form through natural conversation.

FORM SCHEMA: ${JSON.stringify(schema)}

FORM FIELDS TO COLLECT:
${fieldDescriptions}

INSTRUCTIONS:
1. Have a natural, friendly conversation to collect information for the form
2. Extract information from user messages into the correct form fields
3. Only extract information that is clearly provided in the current message
4. Ask for missing information one field at a time
5. Validate information format based on field type
6. Be encouraging and helpful throughout the process

FIELD EXTRACTION RULES:
- Extract each piece of information into its correct field
- Do NOT concatenate multiple values into one field
- Only include fields that have clear data from the current message
- Leave fields empty if no relevant data is provided

FIELD TYPES:
- email: Valid email format (user@domain.com)
- url: Valid URL (add https:// if missing)
- phone: Valid phone number
- string: Any text value
- number: Numeric value

RESPONSE FORMAT:
Always respond with a JSON object containing:
- ai_message: Your conversational response
- form_data: Array of extracted field objects with key and value

EXAMPLES:
User: "My name is John Smith"
Response: {"ai_message": "Nice to meet you, John! What's your email address?", "form_data": [{"key": "name", "value": "John Smith"}]}

User: "john@example.com"  
Response: {"ai_message": "Thanks! What's your LinkedIn profile URL?", "form_data": [{"key": "email", "value": "john@example.com"}]}

User: "Just saying hello"
Response: {"ai_message": "Hello! Let's start with your name - what should I call you?", "form_data": []}

Remember: Only extract clear, relevant information. Don't guess or make assumptions.`;

    // Create a simple, flexible response schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        ai_message: {
          type: Type.STRING,
          description: "The conversational response to the user"
        },
        form_data: {
          type: Type.ARRAY,
          description: "Extracted form fields from the current message",
          items: {
            type: Type.OBJECT,
            properties: {
              key: {
                type: Type.STRING,
                description: "The name of the form field extracted"
              },
              value: {
                type: Type.STRING,
                description: "The value of the form field extracted"
              }
            },
            required: ["key", "value"],
            additionalProperties: false
          }
        }
      },
      required: ["ai_message", "form_data"],
      additionalProperties: false
    };

    return this.genAI.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
      history: [
        {
          role: "user",
          parts: [{ text: "Hello" }],
        },
        {
          role: "model",
          parts: [{ 
            text: JSON.stringify({
              ai_message: "Hello! I'm here to help you fill out this form. Let's get started!",
              form_data: []
            })
          }],
        },
      ],
    });
  }

  /**
   * Send a message to the chat and get response
   */
  async sendMessage(chat, message) {
    try {
      if (!chat || !message) {
        throw new Error("Chat instance and message are required");
      }

      const response = await chat.sendMessage({
        message: message.trim(),
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response received from AI");
      }

      try {
        const parsedResponse = JSON.parse(responseText);
        
        // Auto-format URLs for array format
        if (parsedResponse.form_data && Array.isArray(parsedResponse.form_data)) {
          parsedResponse.form_data.forEach(field => {
            if (field.key && field.value) {
              const fieldLower = field.key.toLowerCase();
              
              if (fieldLower.includes('url') || fieldLower.includes('profile') || fieldLower.includes('link') || fieldLower.includes('website')) {
                if (!field.value.startsWith('http')) {
                  field.value = `https://${field.value}`;
                }
              }
            }
          });
        }
        
        return parsedResponse;
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", responseText);
        return {
          ai_message: responseText || "I'm sorry, I couldn't generate a response. Please try again.",
          form_data: []
        };
      }
    } catch (error) {
      console.error("AI Service Error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("quota")) {
          throw new Error("AI service quota exceeded. Please try again later.");
        } else if (error.message.includes("safety")) {
          throw new Error("Message flagged by safety filters. Please rephrase your message.");
        }
      }
      
      throw new Error("Failed to get AI response. Please try again.");
    }
  }

  /**
   * Validate if the schema is properly formatted
   */
  validateSchema(schema) {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      return false;
    }

    const fields = Object.keys(schema);
    if (fields.length === 0) {
      return false;
    }

    const validTypes = [
      "string", "number", "boolean", "date", "email", "phone", "url"
    ];

    return fields.every((field) => {
      const type = schema[field];
      return typeof type === "string" && validTypes.includes(type.toLowerCase());
    });
  }

  /**
   * Get the initial greeting message
   */
  getInitialMessage() {
    return {
      ai_message: "Hello! I'm here to help you fill out this form. Let's get started!",
      form_data: []
    };
  }

  /**
   * Check if AI service is healthy
   */
  async healthCheck() {
    try {
      const testChat = this.createChat({ test: "string" });
      await this.sendMessage(testChat, "test");
      return true;
    } catch (error) {
      console.error("AI Service health check failed:", error);
      return false;
    }
  }
}

module.exports = AIService;