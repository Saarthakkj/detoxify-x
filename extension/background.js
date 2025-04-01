import {GoogleGenerativeAI , system_prompt} from './dist/geneartive-ai-bundle.js';

let genModel = null;

// Initialize the model
async function initializeModel() {
    try {
        const result = await chrome.storage.sync.get(['GEMINI_API_KEY']);
        const GEMINI_API_KEY = result.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            // Corrected the error throwing syntax
            throw new Error('API key not found'); 
        }
        const genai = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Use a multimodal model like gemini-1.5-flash-latest
        genModel = genai.getGenerativeModel({
            model: "gemini-1.5-flash-8b", // Changed to a multimodal model
            systemInstruction: system_prompt
        });
        console.log("[background.js] Gemini multimodal model initialized successfully");
    } catch (e) {
        console.error("[background.js] Error initializing model:", e); // Changed log to error
        genModel = null; // Ensure model is null if initialization fails
    }
}

// Helper function to fetch image data and convert to base64
async function urlToGenerativePart(url) {
    try {
        console.log(`[background.js] Fetching image: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        }
        const blob = await response.blob();
        
        // Ensure the MIME type is one supported by the Gemini API
        const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/heic', 'image/heif', 'image/webp'];
        const actualMimeType = blob.type;
        
        if (!supportedMimeTypes.includes(actualMimeType)) {
             console.warn(`[background.js] Unsupported image MIME type: ${actualMimeType} for URL: ${url}. Skipping image.`);
             return null; // Skip unsupported types
        }
        
        const arrayBuffer = await blob.arrayBuffer();
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        console.log(`[background.js] Successfully fetched and converted image: ${url}`);
        return {
            inlineData: {
                data: base64Data,
                mimeType: actualMimeType
            },
        };
    } catch (error) {
        console.error(`[background.js] Error fetching or converting image ${url}:`, error);
        return null; // Return null if fetching fails
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "reinitializeModel") {
        // Handle API key update and reinitialize
        console.log("[background.js] Reinitializing model due to API key update.");
        initializeModel(); // Re-initialize with the new key potentially stored
        sendResponse({ status: "Model reinitialization triggered." });
        return false; // No need to keep channel open
    }
    
    if (request.type === "fetchInference") {
        console.log("[background.js] Multimodal inference request received:", request.data);
        
        (async () => {
            try {
                if (!genModel) {
                    console.log("[background.js] Model not initialized. Initializing...");
                    await initializeModel();
                    if (!genModel) {
                         throw new Error("Model initialization failed. Cannot proceed.");
                    }
                }

                const contentItems = request.data.content; // Array of {text, imageUrl}
                const userPreference = request.data.input;

                // --- Start Refactoring promptParts construction ---
                const promptParts = [
                    // Part 1: Initial instructions and user preference
                    { text: `User Preference: "${userPreference}"\n\nAnalyze the following content items (text and optional image) based on the preference. Respond with a JSON array as specified in the system instructions.\n---` }
                ];

                const imageFetchPromises = contentItems.map(item => {
                    if (item.imageUrl) {
                        return urlToGenerativePart(item.imageUrl);
                    } else {
                        return Promise.resolve(null);
                    }
                });

                console.log(`[background.js] Waiting for ${imageFetchPromises.length} image fetches...`);
                const fetchedImageParts = await Promise.all(imageFetchPromises);
                console.log("[background.js] Image fetching complete.");

                // Part 2 onwards: Interleave text and image parts for each item
                for (let i = 0; i < contentItems.length; i++) {
                    const item = contentItems[i];
                    const imagePart = fetchedImageParts[i];

                    // Add text part for the item
                    promptParts.push({ text: `\nItem ${i + 1}:\nText: "${item.text}"` });

                    // Add image part if it exists and was fetched successfully
                    if (imagePart) {
                        promptParts.push({ text: `Image ${i + 1}:` }); // Add text label for the image
                        promptParts.push(imagePart); // Add the actual image data part
                    } else {
                        promptParts.push({ text: `Image ${i + 1}: None` });
                    }
                     promptParts.push({ text: "---" }); // Separator text part
                }
                // --- End Refactoring promptParts construction ---
                
                console.log("[background.js] Constructed multimodal prompt parts:", promptParts);

                // Generate content using the correctly structured promptParts
                const result = await genModel.generateContent({ contents: [{ role: "user", parts: promptParts }] });
                const response = await result.response;
                let text = response.text();

                // Use a more robust regular expression approach to extract JSON content
                const jsonRegex = /```(?:json)?\s*(\[[\s\S]*?\])\s*```/;
                const match = text.match(jsonRegex);
                
                let jsonText;
                if (match && match[1]) {
                    // If we found JSON within code fences, use that
                    jsonText = match[1];
                } else {
                    // Otherwise use the original text (it might not have fences)
                    jsonText = text;
                }
                
                try {
                    // Parse the JSON response
                    const parsedResponse = JSON.parse(jsonText);
                    console.log("[background.js] Parsed response:", parsedResponse);
                    
                    // Validate the response format
                    if (Array.isArray(parsedResponse) && 
                        parsedResponse.every(item => 
                            item.hasOwnProperty('input_text') && 
                            item.hasOwnProperty('predicted_label') &&
                            (item.predicted_label === "true" || item.predicted_label === "false")
                        )) {
                        // Basic length check for sanity
                        if (parsedResponse.length !== contentItems.length) {
                             console.warn(`[background.js] Response length (${parsedResponse.length}) mismatch with input length (${contentItems.length}).`);
                             // Decide how to handle mismatch - sending back might cause issues in contentScript
                             // For now, send it back, but contentScript might fail.
                        }
                        console.log("[background.js] Multimodal inference successful:", parsedResponse);
                        sendResponse(parsedResponse);
                    } else {
                        // Added missing closing parenthesis and fixed error message
                        throw new Error("Invalid response format received from multimodal model"); 
                    }
                } catch (parseError) {
                    console.error("[background.js] Error parsing model response:", parseError);
                    console.error("[background.js] Raw response:", text);
                    sendResponse([]); // Send empty on parse error
                }

            } catch (error) {
                console.error("[background.js] Multimodal inference error:", error);
                sendResponse([]); // Return empty array on error
            }
        })();
        
        return true; // Keep the message channel open for sendResponse
    }
    // Handle other message types if necessary
    return false; // Indicate sync response or no response needed for other types
});

// Initialize on install and startup
chrome.runtime.onStartup.addListener(initializeModel);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log("[background.js]: Tab updated:", tab.url);
    
    // Get the current user settings from storage before sending message
    chrome.storage.sync.get(['FILTER_ENABLED', 'USER_CATEGORY', 'BATCH_SIZE'], (result) => {
      // Default to enabled if not set
      const filterEnabled = result.FILTER_ENABLED !== false;
      // Default batch size to 15 if not set
      const batchSize = result.BATCH_SIZE || 15;
      
      chrome.tabs.sendMessage(tabId, {
        action: "tabUpdated",
        url: tab.url,
        filterEnabled: filterEnabled,
        userCategory: result.USER_CATEGORY,
        batchSize: batchSize
      }).catch(err => {
        // Changed log message for clarity
        console.warn(`[background.js] Error sending message to tab ${tabId}:`, err.message); 
      });
    });
  }
});

//! store your api key running this permanently in your browser:

// chrome.storage.sync.set({ GEMINI_API_KEY: 'your_api_key_here' }, () => {
//     console.log('API key saved to Chrome storage');
// });