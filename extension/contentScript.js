/*
 * TODO : reduce the complexity of removing all (n) elements from (n^2) to (n) : n -> batchsize : preserving indices before preprocessing elements and operating on it
 */

document
    .requestStorageAccess()
    .then(() => {
        // console.log("Access granted");
    })
    .catch(() => {
        console.error("Storage access denied");
    });

var search_removing_counts = 0;

// Add this near your observer setup
let lastUrl = window.location.href;

function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        // console.log('[contentscript.js]: URL switched from', lastUrl, 'to', currentUrl);
        lastUrl = currentUrl;
        window.URL = currentUrl;
        observer_assigner(currentUrl); // Re-run your logic
    }
}

setInterval(checkUrlChange, 1000); // Check every second

var tags = {
    Home: ["article", "div[data-testid='cellInnerDiv']"],
    Watch: ["article", "div[data-testid='tweet']"],
    Search: [
        ["article", "div[data-testid='cellInnerDiv']", "div[data-testid='tweet']"],
        ["section[aria-labelledby]"]
    ],
};

function determineUrlType(url) {
    console.log(" url received : " , url );
    const regex = /^x\.com\/[^/]+\/status\$/; // for search url 
    // console.log(" url : ", url);
    if(!url) return "Home";
    if (regex.test(url)) {
        return "Watch";
    } else if (url.indexOf("x.com/search?q=") !== -1) {
        return "Search";
    } else if (url === "https://x.com/home") {
        return "Home";
    } 
}

//assigns oberserver , takes url in the args
function observer_assigner(url) {
    var urlType = determineUrlType(url);
    // console.log("User is on:", urlType);
    // console.log("is filter enabled : ", window.filterEnabled);
    if (!window.filterEnabled) return;
    if (determineUrlType(url) === "Watch") {
        // console.log("handle  watching");
        watching_tweeet();
        return;
    }
    // console.log("filter enabled");
    if (determineUrlType(url) === "Search") {
        // console.log("setting up an isrelevant alert");
        isrelevantpage(url);
    }
    window.observerRunning = true;


    //
    if (window.userCategory && !(determineUrlType(url) === "Watch")) {
        // console.log("intialising with saved category");
        initializeWithSavedCategory(tags[determineUrlType(url)]);
    } else if (!(determineUrlType(url) === "Watch")) {
        // console.log("intialising without  saved category");
        setupObserver(tags[determineUrlType(url)]);
    }
}
function dialoguebox_adding() {
    // console.log("search removing counts : ", search_removing_counts);
    if(document.querySelector("#detoxify-confirmation-dialog")) return;

    // Create the dialog box
    const dialog = document.createElement("div");
    dialog.id = "detoxify-confirmation-dialog";
    dialog.style.position = "fixed";
    dialog.style.top = "50%";
    dialog.style.left = "50%";
    dialog.style.transform = "translate(-50%, -50%)";
    dialog.style.backgroundColor = "#ffffff"; // White background
    dialog.style.padding = "24px"; // Slightly increased for balance
    dialog.style.borderRadius = "12px"; // Softer, modern rounding
    dialog.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)"; // Deeper shadow for techy depth
    dialog.style.width = "320px"; // Slightly wider for better text fit
    dialog.style.fontFamily = "'Inter', 'Helvetica Neue', sans-serif"; // Techy font
    dialog.style.zIndex = "9999";

    // Create and style the message
    const message = document.createElement("p");
    message.innerHTML = "<span style='color: #000000;'>[Detoxify]</span> Are you sure you want to stay on this page?";
    message.style.fontSize = "16px";
    message.style.fontWeight = "500"; // Medium weight for emphasis
    message.style.color = "#333333"; // Dark gray for readability
    message.style.textAlign = "center"; // Centered for minimalism
    message.style.marginBottom = "24px"; // Increased spacing
    dialog.appendChild(message);

    // Create a container for buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between"; // Evenly spaced buttons
    buttonContainer.style.gap = "12px"; // Consistent spacing

    // Create and style the Yes button
    const yesButton = document.createElement("button");
    yesButton.textContent = "Yes";
    yesButton.style.padding = "10px 0"; // Vertical padding only, width handled by flex
    yesButton.style.width = "100%"; // Full width within container
    yesButton.style.border = "1px solid #000000"; // Black border
    yesButton.style.borderRadius = "6px"; // Slightly larger rounding
    yesButton.style.cursor = "pointer";
    yesButton.style.backgroundColor = "#000000"; // Black background
    yesButton.style.color = "#ffffff"; // White text
    yesButton.style.fontSize = "14px";
    yesButton.style.fontWeight = "500";
    yesButton.style.transition = "background-color 0.2s ease"; // Smooth hover effect
    yesButton.onmouseover = () => (yesButton.style.backgroundColor = "#333333"); // Dark gray on hover
    yesButton.onmouseout = () => (yesButton.style.backgroundColor = "#000000"); // Back to black
    yesButton.onclick = () => {
        window.filterEnabled = false;
        chrome.storage.sync.set({ FILTER_ENABLED: false });
        document.body.removeChild(dialog);
    };

    // Create and style the No button
    const noButton = document.createElement("button");
    noButton.textContent = "No";
    noButton.style.padding = "10px 0";
    noButton.style.width = "100%"; // Full width within container
    noButton.style.border = "1px solid #000000"; // Black border
    noButton.style.borderRadius = "6px";
    noButton.style.cursor = "pointer";
    noButton.style.backgroundColor = "#ffffff"; // White background
    noButton.style.color = "#000000"; // Black text
    noButton.style.fontSize = "14px";
    noButton.style.fontWeight = "500";
    noButton.style.transition = "background-color 0.2s ease"; // Smooth hover effect
    noButton.onmouseover = () => (noButton.style.backgroundColor = "#f5f5f5"); // Light gray on hover
    noButton.onmouseout = () => (noButton.style.backgroundColor = "#ffffff"); // Back to white
    noButton.onclick = () => {
        window.location.href = "https://www.youtube.com";
    };

    // Append buttons to the container, then container to dialog
    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    dialog.appendChild(buttonContainer);

    // Append dialog to the body
    document.body.appendChild(dialog);
}

//!make this for "search query" , don't use DOM manipulation here. please. i beg you brother.
async function isrelevantpage(url) {
    try {
        // URL format: https://x.com/search?q=hellooooooooo&src=recent_search_click
        const search_query = url.split("q=")[1]?.split("&")[0];
        if (!search_query) return;
        
        const response = await sendPostRequest([search_query], window.userCategory);
        
        if (response && response.length > 0 && response[0].predicted_label !== "true") {
            dialoguebox_adding();
        }
    } catch (error) {
        console.error("Error in isrelevantpage:", error);
    }
}

async function watching_tweeet() {
    try {
        // Get the tweet content from the page title or tweet text
        const tweetTitle = document.querySelector("title")?.textContent;
        
        // Get the actual tweet text content if available
        const tweetContent = document.querySelector('[data-testid="tweetText"]')?.textContent || tweetTitle;
        
        if (!tweetContent) return;
        
        const response = await sendPostRequest([tweetContent], window.userCategory);

        if (response && response.length > 0 && response[0].predicted_label !== "true") {
            dialoguebox_adding();
        }
    } catch (error) {
        console.error("Error in watching_tweeet:", error);
    }
}
// Add to your script
function ensureObserverHealthy() {
    if (!observer || !window.observerRunning) {
        // console.log(`[Detoxify Observer not running, restarting`);
        window.observerRunning = true;
        setupObserver();
    }

    // console.log("contents container : " , document.querySelector('#contents'));
    // console.log("content container : " , document.querySelector('#content'));
}
async function initializeWithSavedCategory(tagData) {
    // Handle case when tagData is undefined or not iterable
    if (!tagData || typeof tagData[Symbol.iterator] !== 'function') {
        console.warn("[contentscript.js]: Invalid or undefined tag data received for initialization. Using default 'Home' tags.", tagData);
        // Use default Home tags as fallback or handle appropriately
        tagData = tags["Home"]; 
        if (!tagData) {
             console.error("[contentscript.js]: Default 'Home' tags are also missing.");
             return; // Cannot proceed without tags
        }
    }

    // Now safely destructure or use tagData
    const [filtertweetstag] = Array.isArray(tagData[0]) ? tagData : [tagData]; // Ensure filtertweetstag gets the correct array structure

    // console.log("[inside initializeWithSavedCategory]: tags are:", filtertweetstag);
    try {
        const result = await chrome.storage.sync.get([
            "USER_CATEGORY",
            "GEMINI_API_KEY",
            "FILTER_ENABLED",
            "BATCH_SIZE",
        ]);
        // Set default batch size if not set
        window.batchSize = 12;
        if (result.USER_CATEGORY && result.GEMINI_API_KEY) {
            // console.log(
            //     "[contentscript.js]: Found saved category:",
            //     result.USER_CATEGORY
            // );
            window.userCategory = result.USER_CATEGORY;

            // Set filter enabled state (default to enabled if not set)
            window.filterEnabled = result.FILTER_ENABLED !== false;
            // console.log(
            //     "[contentscript.js]: Filter enabled state:",
            //     window.filterEnabled
            // );

            // Only start observer and process elements if filtering is enabled
            if (window.filterEnabled) {
                try {
                   
                    // Use the correctly assigned filtertweetstag
                    let videoTagsToUse = filtertweetstag;

                    // Flattening logic might need adjustment based on the structure now
                    // This assumes filtertweetstag is now always an array of strings or an array containing an array of strings
                    if (Array.isArray(videoTagsToUse) && videoTagsToUse.length > 0 && Array.isArray(videoTagsToUse[0])) {
                         videoTagsToUse = videoTagsToUse.flat();
                    }

                    const allInitialElements = await waitForElements(videoTagsToUse);
                    if (allInitialElements && allInitialElements.length > 0) {
                        // console.log(
                        //     "[contentscript.js]: Processing initial elements:",
                        //     allInitialElements.length
                        // );
                        await filtertweets(allInitialElements, videoTagsToUse);
                    }
                } catch (error) {
                    console.error(
                        "[contentscript.js]: Error processing initial elements:",
                        error
                    );
                }

                //after dealing with initial elements, call the setupObserver:
                // console.log("calling setupObserver");
                setupObserver(tagData); // Pass the original validated tagData
            } else {
                // console.log(
                //     "[contentscript.js]: Filtering is disabled, not starting observer"
                // );
            }
        }
    } catch (error) {
        console.error(
            "[contentscript.js]: Error initializing with saved category:",
            error
        );
    }
}

// Initialize counters
var removeShortsCount = 0;
var filtertweetsCount = 0;

var contentContainer = null;

// Initialize observer at the top level
let observer = null;

// Add at the top of your file, after your other global variables
window.URL = null; // Initialize the URL variable

// Function to setup observer
function setupObserver(tagData) { // Changed parameter name for clarity
    // Handle case when tagData is undefined or not iterable
    if (!tagData || typeof tagData[Symbol.iterator] !== 'function') {
        console.warn("[contentscript.js]: Invalid or undefined tag data received for setupObserver. Using default 'Home' tags.", tagData);
        tagData = tags["Home"];
        if (!tagData) {
            console.error("[contentscript.js]: Default 'Home' tags are also missing in setupObserver.");
            return; // Cannot proceed without tags
        }
    }

    // Determine the correct tags to observe based on the structure
    const filtertweetstag = Array.isArray(tagData[0]) ? tagData[0] : tagData;

    // console.log("reached inside setup observer with tags:", filtertweetstag);

    observer = new MutationObserver(async (mutations) => {
        try {
            let addedNodesForBatch = [];
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    // Check if the node itself matches or contains matching elements
                    if (node.nodeType === Node.ELEMENT_NODE) { // Ensure it's an element node
                        // Check if the node itself is one of the target tags/selectors
                        let isTargetNode = false;
                        if (Array.isArray(filtertweetstag)) {
                            isTargetNode = filtertweetstag.some(selector => node.matches(selector));
                        } else {
                            isTargetNode = node.matches(filtertweetstag);
                        }

                        if (isTargetNode) {
                            console.log("[Observer] Detected target node:", node);
                            addedNodesForBatch.push(node);
                        } else {
                            // If the node itself doesn't match, check if it contains target elements
                            if (Array.isArray(filtertweetstag)) {
                                filtertweetstag.forEach(selector => {
                                    const containedElements = node.querySelectorAll(selector);
                                    if (containedElements.length > 0) {
                                        console.log(`[Observer] Detected node containing target elements ('${selector}'):`, node, containedElements);
                                        addedNodesForBatch.push(...Array.from(containedElements));
                                    }
                                });
                            } else {
                                const containedElements = node.querySelectorAll(filtertweetstag);
                                if (containedElements.length > 0) {
                                    console.log(`[Observer] Detected node containing target elements ('${filtertweetstag}'):`, node, containedElements);
                                    addedNodesForBatch.push(...Array.from(containedElements));
                                }
                            }
                        }
                    }
                }
            }

            // Process collected nodes if any
            if (addedNodesForBatch.length > 0) {
                 // Deduplicate nodes before adding to the main collection
                 const uniqueNodes = addedNodesForBatch.filter((node, index, self) => 
                    index === self.findIndex((n) => n === node)
                 );
                 
                 observer.collectedItemNodes.push(...uniqueNodes);
                 console.log(`[Observer] Added ${uniqueNodes.length} unique nodes. Total collected: ${observer.collectedItemNodes.length}`);

                // Process batches
                while (observer.collectedItemNodes.length >= window.batchSize) {
                    const batchToProcess = observer.collectedItemNodes.splice(
                        0,
                        window.batchSize
                    );
                    console.log(
                        `[Observer] Processing batch of ${batchToProcess.length} elements. Remaining: ${observer.collectedItemNodes.length}`
                    );
                    await filtertweets(batchToProcess, filtertweetstag); // Pass the correct tags
                }
            }
        } catch (error) {
            console.error("Error in MutationObserver callback:", error);
        }
    });

    // Add collections to observer instance
    observer.collectedItemNodes = [];

    // Start observing the main content area of X/Twitter
    // Common potential containers: main timeline, search results area
    const targetNode = document.querySelector('main[role="main"]') || document.body; 
    console.log("[Observer] Starting observer on target node:", targetNode);
    if (targetNode) {
        observer.observe(targetNode, {
            childList: true,
            subtree: true,
        });
    } else {
        console.error("[Observer] Could not find target node to observe.");
    }
    
    // console.log("observer connected ? : ", observer);
    setInterval(ensureObserverHealthy, 1000);

    function scanEntirePage(tags) {
        // Process existing shorts
        const [filtertweetsTags] = tags;
        // const existingShorts = document.querySelectorAll(
        //     Array.isArray(removeShortsTags)
        //         ? removeShortsTags.map((tag) => tag).join(",")
        //         : removeShortsTags
        // );

        // if (existingShorts.length > 0) {
        //     // console.log(`Found ${existingShorts.length} existing shorts to remove`);
        //     removeShorts(Array.from(existingShorts), removeShortsTags);
        // }
    }

    // Call this after observer setup, using window.url instead of message.url
    if (window.URL) {
        scanEntirePage(tags[determineUrlType(window.URL)]);
    } else {
        // console.log("[contentscript.js]: No URL available for scanEntirePage");
    }
}

/**
 * @message : An object containing data sent from the sender. Attributes may include:
 *              - message.searchString: A string used for filtering content.
 *              - message.action: A string indicating the action to perform (e.g., "filter").
 *              - message.filterEnabled: A boolean indicating whether filtering is enabled.
 *              - message.reinitializeObserver: A boolean indicating whether the observer should be reinitialized.
 * @sender : An object containing information about the sender of the message.
 * @sendResponse : A function to call with a response to the message, to assure that addListener received the data accurately {compulsory ?}
 **/

// Add a cache to store processed tweet texts and their responses
// This will be at the top level of the content script
const processedTweets = new Map(); // Map to store tweet text -> response
const processedElements = new WeakSet(); // WeakSet to track elements we've already processed

// Modify the message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.searchString) {
        window.userCategory = message.searchString;
    }

    // console.log("[contentscript.js]: Message received:", message);

    if (message.action === "filter") {
        // console.log("[contentscript.js]: Filter action received with string:",window.userCategory);

        // Store filter enabled state
        window.filterEnabled = message.filterEnabled !== false;
        // Store URL
        window.URL = message.url;
        // console.log(
        //     "[contentscript.js]: Filter enabled state:",
        //     window.filterEnabled
        // );

        // Check if we need to reinitialize the observer (category changed)
        if (message.reinitializeObserver) {
            // console.log(
            //     "[contentscript.js]: Reinitializing observer due to category change"
            // );
            // // Reset tracking sets for processed content
            // processedElements = new WeakSet();
            // processedSections = new WeakSet();
        }

        // Only setup observer and filter if filtering is enabled
        if (window.filterEnabled) {
            if (!window.observerRunning) {
                // console.log("connecting observer");
                window.observerRunning = true;
                observer_assigner(message.url);
            }
            // removeShorts({}, 'YTD-RICH-SECTION-RENDERER');
            // filtertweets({}, 'YTD-RICH-ITEM-RENDERER');
        } else {
            // If filtering is disabled, disconnect observer
            if (observer) {
                // console.log(
                //     "[contentscript.js]: Disconnecting observer as filtering is disabled"
                // );
                observer.disconnect();
                observer = null;
            }
            window.observerRunning = false;

            //!  tags[determineUrlType(message.url)] -> is an important value that gives tags for any page
            // Show any hidden elements when filter is disabled
            restoreHiddenElements(tags[determineUrlType(message.url)]);
        }

        sendResponse({ status: "received" });
    } else if (message.action === "updateFilterState") {
        // Handle filter state updates without changing category
        window.filterEnabled = message.filterEnabled;
        if (message.url) window.URL = message.url;
        // console.log(
        //     "[contentscript.js]: Filter state updated to:",
        //     window.filterEnabled
        // );

        if (window.filterEnabled) {
            // Re-enable filtering
            if (!window.observerRunning) {
                window.observerRunning = true;
                observer_assigner(message.url);
            }
            // removeShorts({}, 'YTD-RICH-SECTION-RENDERER');
            // filtertweets({}, 'YTD-RICH-ITEM-RENDERER');
        } else {
            // Disable filtering
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            window.observerRunning = false;
            restoreHiddenElements(tags[determineUrlType(message.url)]);
        }

        sendResponse({ status: "received" });
    } else if (message.action === "updateBatchSize") {
        // Handle batch size updates
        window.batchSize = message.batchSize;
        // console.log("[contentscript.js]: Batch size updated to:", window.batchSize);
        sendResponse({ status: "received" });
    } else if (message.action === "tabUpdated") {
        // added to handle tab updates
        // console.log(
        //     "[contentscript.js]: Tab updated message received with url:",
        //     message.url
        // );

        // Store URL
        window.URL = message.url;

        // Update userCategory if available
        if (message.userCategory) {
            window.userCategory = message.userCategory;
            // console.log(
            //     "[contentscript.js]: User category from tabUpdated:",
            //     window.userCategory
            // );
        }

        // Update batchSize if available
        if (message.batchSize) {
            window.batchSize = message.batchSize;
            // console.log(
            //     "[contentscript.js]: Batch size from tabUpdated:",
            //     window.batchSize
            // );
        }

        // Make sure we have the filter state
        if (message.filterEnabled !== undefined) {
            window.filterEnabled = message.filterEnabled;
            // console.log(
            //     "[contentscript.js]: Filter state from tabUpdated:",
            //     window.filterEnabled
            // );
        } else {
            // If not provided, get it from storage as a fallback
            chrome.storage.sync.get(
                ["FILTER_ENABLED", "USER_CATEGORY", "BATCH_SIZE"],
                (result) => {
                    window.filterEnabled = result.FILTER_ENABLED !== false;
                    // console.log(
                    //     "[contentscript.js]: Filter state from storage:",
                    //     window.filterEnabled
                    // );

                    // Also set category and batch size if they weren't in the message
                    if (!window.userCategory && result.USER_CATEGORY) {
                        window.userCategory = result.USER_CATEGORY;
                        // console.log(
                        //     "[contentscript.js]: User category from storage:",
                        //     window.userCategory
                        // );
                    }

                    if (!window.batchSize) {
                        window.batchSize =15;
                        // console.log(
                        //     "[contentscript.js]: Batch size from storage:",
                        //     window.batchSize
                        // );
                    }

                    observer_assigner(message.url);
                }
            );
            return true; // Keep message channel open for async operation
        }

        // Only call observer_assigner if we got settings directly from message
        observer_assigner(message.url);
    }
    return true;
});

// Function to restore hidden elements when filter is disabled
function restoreHiddenElements([filtertweetstag]) {
    // console.log("[contentscript.js]: Restoring hidden elements");

    // Handle shorts sections
    // if (Array.isArray(removeShootstag)) {
    //     removeShootstag.forEach((tag) => {
    //         const shortsSections = document.getElementsByTagName(tag);
    //         for (let i = 0; i < shortsSections.length; i++) {
    //             shortsSections[i].style.display = "";
    //         }
    //     });
    // } else if (removeShootstag) {
    //     const shortsSections = document.getElementsByTagName(removeShootstag);
    //     for (let i = 0; i < shortsSections.length; i++) {
    //         shortsSections[i].style.display = "";
    //     }
    // }

    // Handle video items
    if (Array.isArray(filtertweetstag)) {
        filtertweetstag.forEach((tag) => {
            const videoItems = document.getElementsByTagName(tag);
            for (let i = 0; i < videoItems.length; i++) {
                videoItems[i].style.display = "";
            }
        });
    } else if (filtertweetstag) {
        const videoItems = document.getElementsByTagName(filtertweetstag);
        for (let i = 0; i < videoItems.length; i++) {
            videoItems[i].style.display = "";
        }
    }
}

// setInterval(() => {
//     const timestamp = new Date().toISOString().substr(11, 8);
//     if (observer) {
//         console.log(`[${timestamp}] Observer is connected (${Math.random().toString(36).substr(2, 5)})`);
//     } else {
//         console.log(`[${timestamp}] Observer is NOT connected (${Math.random().toString(36).substr(2, 5)})`);
//     }
// }, 1000);

async function sendPostRequest(contentItems, input) {
    try {
        // Check if we've already processed these exact tweets with this preference
        // Generate a cache key by combining tweet texts with the user preference
        const tweetTexts = contentItems.map(item => item.text || item).join('||');
        const cacheKey = `${tweetTexts}::${input}`;
        
        // Look up in cache first
        if (processedTweets.has(cacheKey)) {
            console.log("[contentScript] Cache hit! Using cached response for:", 
                contentItems.map(item => item.text || item).slice(0, 3));
            return processedTweets.get(cacheKey);
        }
        
        // No cache hit, make the API call
        let data = {
            content: contentItems,
            input: input,
        };
        console.log("[contentScript] Cache miss. Sending data to background.js:", data);
        
        const t_dash_vector = await chrome.runtime.sendMessage({
            type: "fetchInference",
            data: data,
        });
        
        console.log("[contentScript] Received response from background.js:", t_dash_vector);
        
        // Store the result in cache for future use
        if (t_dash_vector && Array.isArray(t_dash_vector)) {
            processedTweets.set(cacheKey, t_dash_vector);
            console.log("[contentScript] Cached response for future use");
        }
        
        return t_dash_vector;
    } catch (error) {
        console.error("Error in sendPostRequest:", error);
        throw error;
    }
}

// Function to scrape tweet content and image URL from the page
var scrapperTitleVector = async (elements) => {
    let contentVector = elements.map((el) => {
        let tweetText = null;
        let imageUrl = null;

        // Try to find tweet text content
        let tweetTextElement = el.querySelector('[data-testid="tweetText"]');
        if (tweetTextElement) {
            tweetText = tweetTextElement.textContent.trim();
        } else {
            // Fallback for different structures or missing text
             let usernameElement = el.querySelector('[data-testid="User-Name"]');
             if (usernameElement) {
                 let username = usernameElement.textContent.trim();
                 let langDivText = el.querySelector('div[lang]')?.textContent.trim();
                 if (langDivText) tweetText = username + ": " + langDivText;
                 else tweetText = username; // Use username if text is missing
             } else {
                 // Final fallback: grab article text, limit length
                 let articleText = el.textContent.trim();
                 if (articleText && articleText.length > 10) {
                     tweetText = articleText.substring(0, 200); 
                 }
             }
        }

        // Try to find image URL
        // Common selector for tweet images/photos
        let imageElement = el.querySelector('div[data-testid="tweetPhoto"] img'); 
        if (imageElement && imageElement.src) {
            // Check if src is a valid http/https URL (ignore potential base64 placeholders)
            if (imageElement.src.startsWith('http')) {
                 imageUrl = imageElement.src;
            }
        }
        
        // Only return if we have at least text content
        if (tweetText) {
             return { text: tweetText, imageUrl: imageUrl };
        }
        
        return null;
    });

    // Filter out null values (elements where no text could be scraped)
    let filteredArray = contentVector.filter((value) => value !== null);
    return filteredArray;
};

// Modify waitForElements to handle array of selectors and CSS queries
var waitForElements = (selector, timeout = 5000) => {
    if (!selector || selector === "") return [];

    try {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkElements = () => {
                let elements = [];

                // Handle array of selectors
                if (Array.isArray(selector)) {
                    selector.forEach((singleSelector) => {
                        // Check if it's a CSS selector (contains special characters)
                        if (singleSelector.includes('[') || singleSelector.includes('.') || singleSelector.includes('#')) {
                            const foundElements = document.querySelectorAll(singleSelector);
                            if (foundElements.length > 0) {
                                elements = elements.concat(Array.from(foundElements));
                            }
                        } else {
                            // Tag name selector
                            const foundElements = document.getElementsByTagName(singleSelector);
                            if (foundElements.length > 0) {
                                elements = elements.concat(Array.from(foundElements));
                            }
                        }
                    });
                } else {
                    // Single selector - check if CSS or tag
                    if (selector.includes('[') || selector.includes('.') || selector.includes('#')) {
                        const foundElements = document.querySelectorAll(selector);
                        if (foundElements.length > 0) {
                            elements = Array.from(foundElements);
                        }
                    } else {
                        // Tag name selector
                        const foundElements = document.getElementsByTagName(selector);
                        if (foundElements.length > 0) {
                            elements = Array.from(foundElements);
                        }
                    }
                }

                if (elements.length > 0) {
                    resolve(elements);
                } else if (Date.now() - startTime >= timeout) {
                    // console.log(
                    //     `timeout waiting for: ${Array.isArray(selector) ? selector.join(", ") : selector
                    //     }`
                    // );
                    resolve([]);
                } else {
                    setTimeout(checkElements, 1000); // Check more frequently
                }
            };
            checkElements();
        });
    } catch (error) {
        console.error("Error in waitForElements:", error);
        return [];
    }
};

// for removing yt shorts fro the page
// var removeShorts = async (elements, tag) => {
//     if (!elements || elements.length === 0) {
//         // console.log("no elements passed , creating own elements");
//         //tag = tag || 'YTD-RICH-SECTION-RENDERER';
//         elements = await waitForElements(tag);
//         // console.log("elements : ", elements);
//         // const element2 = await waitForElements('YT-LOCKUP-VIEW-MODEL');
//         // elements = element1.concat(element2);
//     }
//     try {
//         // console.log("remove shorts elements : ", elements);
//         removeShortsCount++;
//         // let shortelements = document.getElementsByClassName('ytd-rich-section-renderer');
//         // shortelements = Array.from(shortelements);
//         // shortelements = shortelements.filter(shorties => !processedSections.has(shorties));
//         // console.log("sectionrenderer elements : " , elements);
//         // if (shortelements.length === 0) return;
//         // shortelements.forEach(shorties => processedSections.add(shorties));

//         for (let i = 0; i < elements.length; i++) {
//             // console.log("shorts[i] : ", elements[i]);
//             elements[i].style.display = "none";
//         }
//         // console.log(`removeShorts called ${removeShortsCount} times`); // Log counter
//     } catch (error) {
//         console.error("Error in removeShorts:", error);
//     }
// };

// removing function for each element (that waits for thumbnails and titlte to load) and then remove every element passed through it
var processElement = async (element) => {
    try {
        //! THE line in code :>
        element.style.display = "none";
        
        // Find and hide any replies/sub-tweets associated with this tweet
        
        // 1. Check if this element is a tweet in a conversation
        const conversationThread = element.closest('[data-testid="cellInnerDiv"]')?.parentElement;
        
        // 2. If it's part of a conversation, look for all related tweets in the same thread
        if (conversationThread) {
            // Look for sibling tweets or child tweets that are replies
            const relatedTweets = conversationThread.querySelectorAll('[data-testid="cellInnerDiv"]');
            
            // Hide all related tweets in the thread
            if (relatedTweets && relatedTweets.length > 0) {
                console.log(`[processElement] Found ${relatedTweets.length} related tweets in thread, hiding them all`);
                relatedTweets.forEach(relatedTweet => {
                    if (relatedTweet !== element.closest('[data-testid="cellInnerDiv"]')) {
                        relatedTweet.style.display = "none";
                        // Add to the WeakSet to avoid processing again
                        if (processedElements && typeof processedElements.add === 'function') {
                            processedElements.add(relatedTweet);
                        }
                    }
                });
            }
            
            // Sometimes replies are in a separate container
            const parentArticle = element.closest('article');
            if (parentArticle) {
                // Look for any replies section that might be associated with this tweet
                const repliesSection = parentArticle.nextElementSibling;
                if (repliesSection) {
                    const replies = repliesSection.querySelectorAll('article, [data-testid="tweet"]');
                    if (replies && replies.length > 0) {
                        console.log(`[processElement] Found ${replies.length} direct replies, hiding them`);
                        replies.forEach(reply => {
                            reply.style.display = "none";
                            // Add to the WeakSet to avoid processing again
                            if (processedElements && typeof processedElements.add === 'function') {
                                processedElements.add(reply);
                            }
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error processing element function:", error);
    }
};

// Function to filter videos based on the search string
var filtertweets = async (elements, tag) => {
    try {
        filtertweetsCount++; // Increment counter
        if (!window.userCategory) {
            console.log("[filtertweets] User category not configured. Skipping filter.");
            return;
        }
        console.log(`[filtertweets #${filtertweetsCount}] Called with ${elements.length} elements for tag/selector:`, tag);

        // Ensure elements is always an array
        if (!elements || !Array.isArray(elements)) {
            console.log("[filtertweets] No elements passed, attempting to find elements with tag:", tag);
            elements = await waitForElements(tag);
            if (!elements || elements.length === 0) {
                console.log("[filtertweets] No elements found for tag:", tag);
                return;
            }
            console.log(`[filtertweets] Found ${elements.length} initial elements.`);
        }

        // Filter out elements that are already processed using the WeakSet
        const unprocessedElements = elements.filter(el => {
            // Skip elements that are already hidden
            if (el.offsetParent === null || el.style.display === 'none') return false;
            // Skip elements we've already processed
            if (processedElements.has(el)) return false;
            // Mark as processed immediately to avoid duplicates in concurrent operations
            processedElements.add(el);
            return true;
        });

        if (unprocessedElements.length !== elements.length) {
            console.log(`[filtertweets] Filtered down to ${unprocessedElements.length} unprocessed elements from ${elements.length} total elements.`);
        }
        
        if (unprocessedElements.length === 0) {
            console.log("[filtertweets] No new elements to process.");
            return;
        }

        try {
            console.log("[filtertweets] Processing elements:", unprocessedElements);
            // Scrapper now returns an array of {text, imageUrl} objects
            let scrapedContent = await scrapperTitleVector(unprocessedElements);
            console.log("[filtertweets] Scraped content (text & image URLs):", scrapedContent);

            if (!scrapedContent || scrapedContent.length === 0) {
                console.log("[filtertweets] No content scraped from elements. Skipping API call.");
                return;
            }

            // Prepare data for the API request (pass the array of objects)
            console.log("[filtertweets] Sending API request for content:", scrapedContent);

            const tries = 8;
            let t_dash_vector = [];
            let n_try = 0;
            let apiresponse = false;
            
            while (n_try++ < tries && !apiresponse) {
                try {
                    // Send the array of {text, imageUrl} objects directly
                    t_dash_vector = await sendPostRequest(
                        scrapedContent, 
                        window.userCategory
                    );
                    // Check if response is valid
                    if (t_dash_vector && Array.isArray(t_dash_vector)) {
                         apiresponse = true;
                         console.log(`[filtertweets] Received API response (attempt ${n_try}):`, t_dash_vector);
                    } else {
                         console.warn(`[filtertweets] Invalid API response (attempt ${n_try}):`, t_dash_vector);
                         await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retrying
                    }
                } catch (error) {
                    console.error(
                        `[filtertweets] Error sending data to background (attempt ${n_try}):`, error
                    );
                     await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retrying
                }
            }

            if (!apiresponse) {
                console.error("[filtertweets] Failed to get valid API response after multiple tries.");
                return;
            }

            // Ensure response length matches scraped content length for accurate mapping
            if (t_dash_vector.length !== scrapedContent.length) {
                console.error(`[filtertweets] Mismatch between scraped content (${scrapedContent.length}) and API response (${t_dash_vector.length}). Cannot reliably process elements.`);
                return; 
            }

            console.log(`[filtertweets] Processing ${unprocessedElements.length} elements based on ${t_dash_vector.length} API results.`);
            
            // Process elements based on API response
            for (let i = 0; i < t_dash_vector.length; i++) {
                const element = unprocessedElements[i]; // Use the corresponding element
                const result = t_dash_vector[i];
                const originalContent = scrapedContent[i]; // Get the original scraped data

                if (!element || !result || !originalContent) {
                    console.warn(`[filtertweets] Skipping index ${i} due to missing element, result, or original content.`);
                    continue;
                }

                // Process the element based on the API response
                if (result.predicted_label !== "true") {
                    search_removing_counts++;
                    console.log(`[filtertweets] Hiding element ${i} (predicted: ${result.predicted_label}):`, element, `Content: "${originalContent.text}", Image: ${originalContent.imageUrl || 'None'}`);
                    try {
                        processElement(element);
                    } catch (error) {
                        console.error("[filtertweets] Error in processElement:", error, element);
                    }
                } else {
                     console.log(`[filtertweets] Keeping element ${i} (predicted: true):`, element, `Content: "${originalContent.text}", Image: ${originalContent.imageUrl || 'None'}`);
                }
            }
            console.log("[filtertweets] Finished processing batch.");

        } catch (error) {
            console.error("[filtertweets] Error during content filtering logic:", error);
        }
    } catch (error) {
        console.error("[filtertweets] Top-level error:", error);
    }
};

// console.log("[contentscript.js]: [contentscript.js.js]: script ended....");
// Updated by new author
