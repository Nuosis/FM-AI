
# AI Function Generator and Management System

## Description of Functionality

The proposed web application enables users to define and utilize AI-powered functions through an intuitive workflow. Here’s a detailed description of the process and features:

### 1. Function Creation Workflow:
- Users describe the intended functionality of a new function by answering a prompt like: _“Describe what the function does.”_ For example: “Tells a Dad Joke based on a provided topic.”
- The application merges the user-provided description into a predefined prompt template:
  ```
  Generate a JSON object containing a proposed name, full description, input variables, example input and output for a new function that {{Description}}. Ensure the response is a JSON object.

  Here’s an example for a function that removes all special characters and whitespace from the provided text:
  {
      "name": "Smart trim",
      "description": "removes all leading and trailing whitespace along with carriage returns and tabs from the input text",
      "input_variables": [
          {
              "name": "text",
              "type": "string",
              "description": "text to trim"
          }
      ],
      "example": {
          "input": [
              {
                  "text": " \n\n \tSample text "
              }
          ],
          "output": "Sample text"
      }
  }
  ```
- The prompt is passed to an LLM API, and the response is captured.
- The system validates the response to ensure it contains the required keys: `description`, `input_variables`, `example.input`, and `example.output`.
- If the response is valid, a new AI function record is created on the backend, and the function is optimistically added to the frontend’s state management (e.g., Redux).

### 2. Function Usage Workflow:
- Users select a desired function and provide the required input variables.
- On submission, the function generates a dynamic prompt in the following format:
  ```
  Provide the expected output of a function that generates a dad joke about the specified topic

  // Input variables -----
  topic

  // Example input -----
  topic = "cats"

  // Example output -----
  Why don’t scientists trust atoms? Because they make up everything, including cat-tastrophes!

  // Input -----
  topic = {{topic}}

  // Output -----
  ```
- The prompt is sent to the LLM API, and the response is rendered in the frontend.

### 3. Editing and Customization:
- Users can edit function prompts to add additional examples (multi-shot learning).
- Users can assign functions to different AI providers or models and adjust settings such as temperature, `N`, stop sequences, and max tokens.
- Users can modify function names, descriptions, input variables, and expected output types (e.g., JSON, number, boolean, string).

### 4. Exporting Functions:
- Functions can be exported as cURL commands. When clicked, the function’s details and execution logic are saved to the user’s clipboard as a cURL command for external usage.

## Required Components

### Frontend:
1. **Function Creation Interface:**
   - Input field for the user to describe the function.
   - Display of the AI-generated JSON response, with validation and error handling.
   - Form for users to edit and refine function details (name, description, input variables, examples).
2. **Function Management Interface:**
   - List of created functions with options to view, edit, and delete.
   - Settings panel to adjust AI provider, model, and parameters (e.g., temperature, max tokens).
3. **Function Execution Interface:**
   - Input fields for the user to provide required variables.
   - Display of LLM-generated responses based on the selected function.
4. **Export Interface:**
   - Button to export functions as cURL commands.
5. **State Management:**
   - Use Redux to manage functions and settings.

### Backend:
1. **API Endpoints:**
   - Endpoint to process user descriptions and call the LLM API to generate function definitions.
   - Endpoint to validate and store AI functions in the database.
   - Endpoint to execute functions with user-provided input and return LLM responses.
2. **Database:**
   - Store function records, including name, description, input variables, examples, AI settings, and metadata.
3. **LLM Integration:**
   - Middleware to handle requests to the LLM API, ensuring proper formatting and error handling.
4. **Clipboard Integration:**
   - Service to convert function details into cURL commands and deliver them to the user’s clipboard.

This breakdown provides a clear outline of the functionality and required components for implementing the AI function generation and management system in your web app.
