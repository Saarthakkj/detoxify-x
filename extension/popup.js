// This ensures the script runs after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Load saved API key, category, filter state, and hide diminished tweets setting
        const result = await chrome.storage.sync.get(['GEMINI_API_KEY', 'USER_CATEGORY', 'FILTER_ENABLED']);
        
        // Handle API key visibility
        const apiKeyContainer = document.querySelector('.api-key-container');
        if (result.GEMINI_API_KEY) {
            apiKeyContainer.style.display = 'none';
        } else {
            apiKeyContainer.style.display = 'block';
        }

        // Reset input field each time the popup opens (FIX)
        const categoryInput = document.getElementById('userCategory');
        if (categoryInput) {
            categoryInput.value = ''; // Set to empty string regardless of stored value
            
            // Set the placeholder text to show the last used category
            if (result.USER_CATEGORY) {
                categoryInput.placeholder = `Last used: ${result.USER_CATEGORY}`;
            } else {
                categoryInput.placeholder = 'Enter category (e.g., tech, sports, art)';
            }
            
            // Update button text
            const searchButton = document.getElementById("searchButton");
            searchButton.textContent = "Apply Filter";
            searchButton.classList.remove('active'); // Reset button state
        }

        // Restore saved filter toggle state
        const filterToggle = document.getElementById('filterToggle');
        // Default to enabled if not set
        filterToggle.checked = result.FILTER_ENABLED !== false;
        
        // Update toggle label based on state
        updateToggleLabel(filterToggle.checked);
        
    } catch (error) {
        console.error('[popup.js] Error loading saved data:', error);
    }

    // Function to update toggle label text
    function updateToggleLabel(isEnabled) {
        const toggleLabel = document.querySelector('.toggle-label');
        toggleLabel.textContent = isEnabled ? 'Filter Enabled' : 'Filter Disabled';
    }

    // Filter toggle change handler
    const filterToggle = document.getElementById('filterToggle');
    filterToggle.addEventListener('change', async () => {
        const isEnabled = filterToggle.checked;
        
        // Update the label
        updateToggleLabel(isEnabled);
        
        // Save the toggle state
        try {
            await chrome.storage.sync.set({ FILTER_ENABLED: isEnabled });
            console.log('[popup.js] Filter state updated to:', isEnabled);
            
            // Send message to content script to update filter state
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateFilterState",
                    filterEnabled: isEnabled
                });
                console.log("[popup.js]: Filter state message sent:", isEnabled);
            });
        } catch (error) {
            console.error('[popup.js] Error saving filter state:', error);
        }
    });

    // Search button click handler
    const searchButton = document.getElementById("searchButton");
    searchButton.addEventListener("click", async () => {
        const categoryInput = document.getElementById('userCategory');
        const category = categoryInput.value.trim();
        
        if (!category) {
            alert('Please enter a category');
            return;
        }

        const isFilterEnabled = document.getElementById('filterToggle').checked;
        
        // Always set hideDiminishedTweets to true
        const hideDiminishedTweets = true;
        
        // Save the selected category and filter state
        try {
            console.log('[popup.js] Attempting to save category:', category);
            
            // Save settings with await to ensure it completes before proceeding
            await chrome.storage.sync.set({ 
                USER_CATEGORY: category,
                FILTER_ENABLED: isFilterEnabled,
                HIDE_DIMINISHED_TWEETS: true, // Always set to true
                BATCH_SIZE: 5 // Set fixed batch size
            });
            
            // Double-check that category was saved correctly
            const result = await chrome.storage.sync.get(['USER_CATEGORY']);
            console.log('[popup.js] Category saved and verified:', result.USER_CATEGORY);
            
            // If verification fails, throw an error
            if (result.USER_CATEGORY !== category) {
                throw new Error('Category verification failed');
            }
            
            console.log('[popup.js] Category updated to:', category);
            console.log('[popup.js] Filter state updated to:', isFilterEnabled);
            console.log('[popup.js] Hide diminished tweets state updated to: true');
        } catch (error) {
            console.error('[popup.js] Error saving settings:', error);
            // Show error to user but continue execution
            alert('There was an issue saving your settings. Please try again.');
        }

        // Query for active tab and execute content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Show visual feedback that filter is being applied
            searchButton.textContent = "Applying...";
            searchButton.disabled = true;
            
            // Make sure we have a valid tab before trying to execute script
            if (!tabs || !tabs[0] || !tabs[0].id) {
                console.error('[popup.js] No valid active tab found');
                searchButton.textContent = "Apply Filter";
                searchButton.disabled = false;
                return;
            }
            
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['contentScript.js']
            }, () => {
                // Check for any errors from executeScript
                if (chrome.runtime.lastError) {
                    console.error('[popup.js] Error executing script:', chrome.runtime.lastError);
                    searchButton.textContent = "Apply Filter";
                    searchButton.disabled = false;
                    return;
                }
                
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "filter", 
                    searchString: category,
                    filterEnabled: isFilterEnabled,
                    hideDiminishedTweets: true, // Always hide diminished tweets
                    reinitializeObserver: true, // Add flag to reinitialize observer
                    batchSize: 5 // Use fixed batch size
                }, (response) => {
                    // Log the response from contentScript.js
                    console.log("[popup.js]: Content script response:", response);
                    
                    // Add a small delay before closing to ensure message is processed
                    setTimeout(() => {
                        try {
                            window.close();
                        } catch (e) {
                            console.error('[popup.js] Error closing popup:', e);
                            // Fallback if window.close() fails
                            searchButton.textContent = "Filter Applied";
                            searchButton.disabled = false;
                        }
                    }, 500); // Increased timeout to ensure storage operations complete
                });
            });
        });
    });

    // Add event listener to category input to enable the Apply Filter button
    const categoryInput = document.getElementById('userCategory');
    categoryInput.addEventListener('input', () => {
        if (categoryInput.value.trim()) {
            searchButton.classList.add('active');
        } else {
            searchButton.classList.remove('active');
        }
    });

    try {
        const result = await chrome.storage.sync.get(['GEMINI_API_KEY']);
        const apiKeyContainer = document.querySelector('.api-key-container');
        
        if (result.GEMINI_API_KEY) {
            // Hide the API key input container if key exists
            apiKeyContainer.style.display = 'none';
        } else {
            // Show the container if no key exists
            apiKeyContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('[popup.js] Error loading API key:', error);
    }
});

// Update the save API key event listener
document.getElementById('saveApiKey').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('Please enter an API key');
        return;
    }

    try {
        await chrome.storage.sync.set({ GEMINI_API_KEY: apiKey });
        
        // Hide the API key container after successful save
        const apiKeyContainer = document.querySelector('.api-key-container');
        apiKeyContainer.style.display = 'none';
        
        // Send message to background script to reinitialize model
        await chrome.runtime.sendMessage({ 
            type: "reinitializeModel",
            apiKey: apiKey 
        });
        
        alert('API key saved successfully!');
    } catch (error) {
        console.error('[popup.js] Error saving API key:', error);
        alert('Error saving API key');
    }
});

