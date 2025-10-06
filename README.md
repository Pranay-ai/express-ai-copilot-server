# AI-Powered Form Assistant 🤖

This project is a Node.js-based backend service that uses the Google Gemini API to power an AI-driven conversational form assistant. It allows a user to fill out a form by having a natural conversation with an AI. The service uses Socket.IO for real-time communication and is designed to be a standalone backend that can be easily integrated with any frontend application.

## 🚀 Key Features

  * **Real-Time Conversation:** Uses **Socket.IO** for low-latency, real-time communication between the client and the server.
  * **AI-Driven Data Extraction:** Leverages **Google Gemini** to extract and validate form data from natural language messages.
  * **Session Management:** Creates and manages unique chat sessions for each user, ensuring conversations remain separate.
  * **Structured Output:** The AI is instructed to always return a predictable JSON object containing the conversational response and the extracted form data.
  * **Extensible Schema:** Easily adaptable to any form by simply providing a schema (a JSON object defining the fields and their types).
  * **Robust & Scalable:** Designed with a singleton pattern for services and includes basic health checks for monitoring.

-----

## ⚙️ Setup and Installation

### Prerequisites

  * Node.js (version 18 or higher)
  * A Google AI Studio API Key. You can get one from the [Google AI for Developers website](https://aistudio.google.com/app/apikey).

### Step-by-Step Instructions

1.  **Clone the repository** (if you haven't already):

    ```bash
    git clone <repository_url>
    cd ai-chat-service
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create a `.env` file:**
    Create a file named `.env` in the root directory and add your Google Gemini API key:

    ```
    GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```

    Replace `YOUR_API_KEY_HERE` with the key you obtained from Google AI Studio.

4.  **Start the server:**

    ```bash
    npm run dev
    ```

    The server will start on `http://localhost:3001` by default. You should see a message in your terminal indicating that the services are initialized and the server is running.

-----

## 🔧 API Reference

The service primarily uses **WebSockets** for communication, but it also exposes a few REST endpoints for status checks.

### WebSocket Events

  * `create-session`:

      * **Description:** Starts a new chat session.
      * **Payload:** `{ "schema": { ... } }` where `schema` is a JSON object of the form fields (e.g., `{ "name": "string", "email": "email" }`).
      * **Emits:** `session-created` with `{ "sessionId": "...", "initialMessage": "...", "formData": {} }` on success, or `error` on failure.

  * `send-message`:

      * **Description:** Sends a user's message to an active chat session.
      * **Payload:** `{ "sessionId": "...", "message": "..." }`
      * **Emits:** `message-response` with `{ "response": "...", "formData": { ... } }` on success, or `error` on failure.

  * `end-session`:

      * **Description:** Ends a specific chat session.
      * **Payload:** `{ "sessionId": "..." }`
      * **Emits:** `session-ended` on success, or `error` if the session is not found.

### REST Endpoints

  * `GET /health`

      * **Description:** A general health check for the server.
      * **Response:** `{ "status": "OK", "message": "...", "sessions": 0, "timestamp": "..." }`

  * `GET /api/health/ai`

      * **Description:** A health check specifically for the AI service by sending a test message.
      * **Response:** `{ "status": "OK", "service": "AI Service", "timestamp": "..." }` or an `ERROR` status if it fails.

-----

## 🧩 Project Structure

  * `index.js`: The main server file. It sets up Express and Socket.IO and handles all WebSocket events and REST API routes.
  * `services/ai.service.js`: Contains the `AIService` class, which handles all interactions with the Google Gemini API. It defines the system instructions for the AI and the expected response schema.
  * `services/session.service.js`: Contains the `SessionService` class. It manages the creation, deletion, and state of individual chat sessions, including accumulating form data.
  * `services/singleton.service.js`: Implements the singleton pattern to ensure that only a single instance of `AIService` and `SessionService` is created and used throughout the application.
  * `package.json`: Manages project dependencies and scripts.
