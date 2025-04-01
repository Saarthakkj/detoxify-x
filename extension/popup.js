// This ensures the script runs after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Load saved API key, category, filter state, and hide diminished tweets setting
        const result = await chrome.storage.sync.get(['GEMINI_API_KEY', 'USER_CATEGORY', 'FILTER_ENABLED', 'HIDE_DIMINISHED_TWEETS']);
        
        // Handle API key visibility
        const apiKeyContainer = document.querySelector('.api-key-container');
        if (result.GEMINI_API_KEY) {
            apiKeyContainer.style.display = 'none';
        } else {
            apiKeyContainer.style.display = 'block';
        }

        // Restore saved category
        if (result.USER_CATEGORY) {
            // Set the value in the text input field
            const categoryInput = document.getElementById('userCategory');
            if (categoryInput) {
                categoryInput.value = result.USER_CATEGORY;
                // Update button text to indicate category can be changed
                const searchButton = document.getElementById("searchButton");
                searchButton.textContent = "Apply Filter";
            }
        }

        // Restore saved filter toggle state
        const filterToggle = document.getElementById('filterToggle');
        // Default to enabled if not set
        filterToggle.checked = result.FILTER_ENABLED !== false;
        
        // Update toggle label based on state
        updateToggleLabel(filterToggle.checked);
        
        // Restore saved hide diminished tweets toggle state
        const hideDiminishedToggle = document.getElementById('hideDiminishedToggle');
        // Default to enabled if not set
        hideDiminishedToggle.checked = result.HIDE_DIMINISHED_TWEETS !== false;
        
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

    // Hide Diminished Tweets toggle change handler
    const hideDiminishedToggle = document.getElementById('hideDiminishedToggle');
    hideDiminishedToggle.addEventListener('change', async () => {
        const isEnabled = hideDiminishedToggle.checked;
        
        // Save the toggle state
        try {
            await chrome.storage.sync.set({ HIDE_DIMINISHED_TWEETS: isEnabled });
            console.log('[popup.js] Hide diminished tweets state updated to:', isEnabled);
            
            // Send message to content script to update hide diminished tweets state
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateHideDiminishedState",
                    hideDiminishedTweets: isEnabled
                });
                console.log("[popup.js]: Hide diminished tweets state message sent:", isEnabled);
            });
        } catch (error) {
            console.error('[popup.js] Error saving hide diminished tweets state:', error);
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
        const hideDiminishedTweets = document.getElementById('hideDiminishedToggle').checked;
        
        // Save the selected category and filter state
        try {
            await chrome.storage.sync.set({ 
                USER_CATEGORY: category,
                FILTER_ENABLED: isFilterEnabled,
                HIDE_DIMINISHED_TWEETS: hideDiminishedTweets,
                BATCH_SIZE: 5 // Set fixed batch size
            });
            console.log('[popup.js] Category updated to:', category);
            console.log('[popup.js] Filter state updated to:', isFilterEnabled);
            console.log('[popup.js] Hide diminished tweets state updated to:', hideDiminishedTweets);
        } catch (error) {
            console.error('[popup.js] Error saving settings:', error);
        }

        // Query for active tab and execute content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['contentScript.js']
            }, () => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "filter", 
                    searchString: category,
                    filterEnabled: isFilterEnabled,
                    hideDiminishedTweets: hideDiminishedTweets,
                    reinitializeObserver: true, // Add flag to reinitialize observer
                    batchSize: 5 // Use fixed batch size
                });
                console.log("[popup.js]: Content script injected and message sent with reinitialize flag");
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

