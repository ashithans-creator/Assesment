# QA AI Assistant 🤖

An advanced, AI-powered Quality Assurance Assistant that integrates directly with Jira and multiple Large Language Models (LLMs) to streamline QA workflows. This application allows QA engineers and developers to instantly generate comprehensive test cases from Jira user stories and automatically log structured defects back into Jira.

## 🌟 Key Features

- **Jira Integration**: Fetch Jira tickets (User Stories, Epics, Tasks) directly into the application.
- **AI Test Case Generation**: Automatically generate Functional, Negative, and Boundary test cases based on Jira ticket requirements.
- **Direct Jira Bug Creation**: Submit newly generated defects directly back to your Jira board without leaving the app.
- **Excel Export**: Download generated test cases into an easily shareable `.xlsx` Excel format.
- **Multi-Model Support**: Support for local LLMs (Ollama) and cloud providers (OpenAI, Google Gemini, Groq) to power the generations.
- **Secure Credential Management**: Store API keys and Jira tokens securely in the browser's local storage.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Vanilla CSS
- **Backend**: Node.js, Express.js
- **APIs**: Atlassian Jira REST API (v3)
- **Utilities**: SheetJS (`xlsx`) for Excel exports

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Jira Account and an [Atlassian API Token](https://id.atlassian.com/manage-profile/security/api-tokens)
- (Optional) API Keys for OpenAI, Gemini, or Groq, OR Ollama installed locally for offline AI generation.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <repository-directory>
   ```

2. **Setup the Backend:**
   ```bash
   cd backend
   npm install
   
   # Start the backend server (runs on port 4000)
   npm run dev
   ```

3. **Setup the Frontend:**
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   
   # Start the Vite development server (runs on port 5173)
   npm run dev
   ```

4. **Open the Application:**
   Navigate to `http://localhost:5173` in your browser.

## ⚙️ Configuration & Usage

1. **Settings Panel**: Click on the "Settings" button in the top right corner of the app.
2. **Jira Credentials**: Provide your Jira Domain (e.g., `yourcompany.atlassian.net`), Jira Account Email, and Jira API Token.
3. **AI Models**: Input your preferred API key (e.g., Groq, OpenAI) and select the active provider from the dropdown.
4. **Fetching Tickets**: Switch the main dropdown to "Jira", enter a valid Jira Ticket ID (e.g., `PROJ-123`), and click "Fetch Jira Ticket".
5. **Generating Test Cases**: Once fetched, click "Generate Test Cases". You can then download them using the "Download Excel" button.
6. **Creating Defects**: Switch to the "Create Defect" tab, input the project key and bug context, generate the defect using AI, and hit "Create Defect in Jira" to push it live!

## 🔒 Security Note

All API keys and tokens are stored securely in your browser's `localStorage` and are sent directly to your local backend. Ensure you do not commit `settings` files or hardcoded keys to version control.

---
*Built with React, Express, and Agentic AI.*
