/**
 * Tweet Preference Controls
 * 
 * This script implements UI elements for Tweet preference selection,
 * allowing users to mark content they want to enforce or diminish.
 */

// Global variables
let selectionTooltip = null;
let currentSelection = null;
let currentTweet = null;
let tweetPreferences = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initTweetPreferences);

/**
 * Initialize the tweet preference functionality
 */
function initTweetPreferences() {
  // Create the tooltip element (initially hidden)
  createSelectionTooltip();
  
  // Load existing preferences from Chrome storage
  loadTweetPreferences();
  
  // Add event listeners for text selection
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keydown', handleKeyPress);
  
  // Apply CSS for the tweet preference UI
  applyTweetPreferenceStyles();
  
  // Add observer for dynamic tweet loading
  setupTweetObserver();
}

/**
 * Create the selection tooltip with tick/cross buttons
 */
function createSelectionTooltip() {
  // Create the tooltip container
  selectionTooltip = document.createElement('div');
  selectionTooltip.className = 'detoxify-selection-tooltip';
  selectionTooltip.style.display = 'none';
  
  // Add text label
  const tooltipText = document.createElement('span');
  tooltipText.className = 'detoxify-tooltip-text';
  tooltipText.textContent = 'Set preference:';
  selectionTooltip.appendChild(tooltipText);
  
  // Create tick button
  const tickButton = document.createElement('button');
  tickButton.className = 'detoxify-preference-btn detoxify-tick-btn';
  tickButton.title = 'Enforce this content';
  tickButton.innerHTML = `
    <svg class="detoxify-preference-icon" viewBox="0 0 24 24">
      <path d="M9.64 18.952l-5.55-4.861 1.317-1.504 3.951 3.459 8.459-10.948 1.599 1.234-9.776 12.62z"/>
    </svg>
  `;
  tickButton.addEventListener('click', () => saveTweetPreference('enforce'));
  selectionTooltip.appendChild(tickButton);
  
  // Create cross button
  const crossButton = document.createElement('button');
  crossButton.className = 'detoxify-preference-btn detoxify-cross-btn';
  crossButton.title = 'Diminish this content';
  crossButton.innerHTML = `
    <svg class="detoxify-preference-icon" viewBox="0 0 24 24">
      <path d="M13.414 12l5.293-5.293a1 1 0 10-1.414-1.414L12 10.586 6.707 5.293a1 1 0 00-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 101.414 1.414L12 13.414l5.293 5.293a1 1 0 001.414-1.414L13.414 12z"/>
    </svg>
  `;
  crossButton.addEventListener('click', () => saveTweetPreference('diminish'));
  selectionTooltip.appendChild(crossButton);
  
  // Add tooltip to document
  document.body.appendChild(selectionTooltip);
  
  // Create feedback notification element
  const feedbackEl = document.createElement('div');
  feedbackEl.className = 'detoxify-preference-feedback';
  document.body.appendChild(feedbackEl);
}

/**
 * Apply the CSS styles for tweet preference UI elements
 */
function applyTweetPreferenceStyles() {
  // Check if styles already exist
  if (document.getElementById('detoxify-preference-styles')) return;
  
  // Create link to our CSS file
  const styleLink = document.createElement('link');
  styleLink.id = 'detoxify-preference-styles';
  styleLink.rel = 'stylesheet';
  styleLink.type = 'text/css';
  styleLink.href = chrome.runtime.getURL('tweetPreference.css');
  document.head.appendChild(styleLink);
}

/**
 * Handle user text selection on tweets
 */
function handleTextSelection(event) {
  const selection = window.getSelection();
  
  // Hide tooltip if no text is selected
  if (selection.isCollapsed || selection.toString().trim() === '') {
    hideSelectionTooltip();
    return;
  }
  
  // Find the parent tweet of the selection
  const tweetElement = findParentTweet(selection.anchorNode);
  if (!tweetElement) {
    hideSelectionTooltip();
    return;
  }
  
  // Store current selection and tweet info
  currentSelection = selection.toString().trim();
  currentTweet = {
    element: tweetElement,
    text: getTweetText(tweetElement),
    id: getTweetId(tweetElement)
  };
  
  // Show the tooltip near the selection
  const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
  positionTooltip(selectionRect);
}

/**
 * Find the parent tweet element from a DOM node
 */
function findParentTweet(node) {
  // Traverse up the DOM to find the tweet container
  let element = node;
  while (element && element !== document.body) {
    // Check if this is a tweet element (article or elements with data-testid="tweet")
    if (element.tagName === 'ARTICLE' || 
        (element.dataset && element.dataset.testid === 'tweet') ||
        (element.dataset && element.dataset.testid === 'cellInnerDiv')) {
      return element;
    }
    element = element.parentNode;
  }
  return null;
}

/**
 * Get the text content of a tweet element
 */
function getTweetText(tweetElement) {
  // Try to get the tweet text content
  const tweetTextEl = tweetElement.querySelector('[data-testid="tweetText"]');
  if (tweetTextEl) {
    return tweetTextEl.textContent.trim();
  }
  
  // Fallback to other text content in the tweet
  return tweetElement.textContent.trim().substring(0, 200);
}

/**
 * Generate a unique identifier for a tweet
 */
function getTweetId(tweetElement) {
  // Try to find the tweet's actual ID
  const linkEl = tweetElement.querySelector('a[href*="/status/"]');
  if (linkEl) {
    const matches = linkEl.href.match(/\/status\/(\d+)/);
    if (matches && matches[1]) {
      return matches[1];
    }
  }
  
  // Otherwise generate a hash from the tweet text
  const text = getTweetText(tweetElement);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `tweet_${hash}`;
}

/**
 * Position the tooltip near the selected text
 */
function positionTooltip(selectionRect) {
  if (!selectionTooltip) return;
  
  // Position above the selection
  const tooltipHeight = 48; // Approximate height
  selectionTooltip.style.left = `${window.scrollX + selectionRect.left + (selectionRect.width / 2) - 75}px`;
  selectionTooltip.style.top = `${window.scrollY + selectionRect.top - tooltipHeight - 10}px`;
  selectionTooltip.style.display = 'flex';
}

/**
 * Hide the selection tooltip
 */
function hideSelectionTooltip() {
  if (selectionTooltip) {
    selectionTooltip.style.display = 'none';
  }
  currentSelection = null;
}

/**
 * Handle keyboard events (escape to cancel selection)
 */
function handleKeyPress(event) {
  if (event.key === 'Escape') {
    hideSelectionTooltip();
  }
}

/**
 * Save the user's preference for the selected tweet content
 */
function saveTweetPreference(preference) {
  if (!currentTweet || !currentSelection) return;
  
  const tweetId = currentTweet.id;
  const timestamp = Date.now();
  
  // Create the preference object
  const preferenceData = {
    preference,
    timestamp,
    selectedText: currentSelection,
    sampleContent: currentTweet.text.substring(0, 50)
  };
  
  // Save to our local cache
  tweetPreferences[tweetId] = preferenceData;
  
  // Save to Chrome sync storage
  chrome.storage.sync.get(['tweetPreferences'], (result) => {
    const savedPrefs = result.tweetPreferences || {};
    savedPrefs[tweetId] = preferenceData;
    
    // Limit to latest 100 preferences by checking timestamps
    const prefEntries = Object.entries(savedPrefs);
    if (prefEntries.length > 100) {
      // Sort by timestamp (oldest first)
      prefEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      // Remove oldest preferences
      const entriesToKeep = prefEntries.slice(prefEntries.length - 100);
      const limitedPrefs = Object.fromEntries(entriesToKeep);
      
      chrome.storage.sync.set({ tweetPreferences: limitedPrefs });
    } else {
      chrome.storage.sync.set({ tweetPreferences: savedPrefs });
    }
  });
  
  // Apply visual styling to tweet based on preference
  applyTweetStyling(currentTweet.element, preference);
  
  // If preference is 'diminish', check if we should hide the tweet
  if (preference === 'diminish') {
    chrome.storage.sync.get(['HIDE_DIMINISHED_TWEETS'], (result) => {
      if (result.HIDE_DIMINISHED_TWEETS !== false) {
        // Properly hide the tweet and its container
        hideTweet(currentTweet.element);
        console.log('[tweetPreference] Hiding diminished tweet:', currentTweet.id);
      }
    });
  }
  
  // Show feedback notification
  showFeedbackNotification(preference);
  
  // Hide the tooltip
  hideSelectionTooltip();
}

/**
 * Helper function to properly hide a tweet
 */
function hideTweet(tweetElement) {
  // First, hide the tweet itself
  tweetElement.style.display = 'none';
  
  // Then find and hide its container
  const cellInnerDiv = tweetElement.closest('[data-testid="cellInnerDiv"]');
  if (cellInnerDiv) {
    cellInnerDiv.style.display = 'none';
  }
  
  // Also hide any parent article
  const article = tweetElement.closest('article');
  if (article && article !== tweetElement) {
    article.style.display = 'none';
  }
}

/**
 * Load saved tweet preferences from Chrome storage
 */
function loadTweetPreferences() {
  chrome.storage.sync.get(['tweetPreferences', 'HIDE_DIMINISHED_TWEETS'], (result) => {
    if (result.tweetPreferences) {
      tweetPreferences = result.tweetPreferences;
      
      // Apply styling to any visible tweets that have preferences
      applyPreferencesToVisibleTweets(result.HIDE_DIMINISHED_TWEETS !== false);
    }
  });
}

/**
 * Apply styling to tweets based on saved preferences
 */
function applyPreferencesToVisibleTweets(hideDiminished = true) {
  // Find all tweet elements on the page
  const tweetElements = document.querySelectorAll('article, [data-testid="tweet"], [data-testid="cellInnerDiv"]');
  
  tweetElements.forEach(element => {
    const tweetId = getTweetId(element);
    if (tweetPreferences[tweetId]) {
      const preference = tweetPreferences[tweetId].preference;
      
      applyTweetStyling(element, preference);
      
      // Hide diminished tweets if configured
      if (preference === 'diminish' && hideDiminished) {
        hideTweet(element);
        console.log('[tweetPreference] Hiding previously diminished tweet:', tweetId);
      }
    }
  });
}

/**
 * Apply styling to a tweet based on preference
 */
function applyTweetStyling(element, preference) {
  // Remove any existing preference classes
  element.classList.remove('detoxify-enforced-tweet', 'detoxify-diminished-tweet');
  
  // Add appropriate class
  if (preference === 'enforce') {
    element.classList.add('detoxify-enforced-tweet');
  } else if (preference === 'diminish') {
    element.classList.add('detoxify-diminished-tweet');
  }
}

/**
 * Show a feedback notification for a brief period
 */
function showFeedbackNotification(preference) {
  const feedbackEl = document.querySelector('.detoxify-preference-feedback');
  if (!feedbackEl) return;
  
  // Set message based on preference
  const message = preference === 'enforce' 
    ? 'Content preference saved! You will see more like this.' 
    : 'Content preference saved! You will see less like this.';
  
  feedbackEl.textContent = message;
  feedbackEl.classList.add('visible');
  
  // Hide after 3 seconds
  setTimeout(() => {
    feedbackEl.classList.remove('visible');
  }, 3000);
}

/**
 * Setup observer for watching for new tweets being added
 */
function setupTweetObserver() {
  // Create observer to watch for new tweets being added
  const tweetObserver = new MutationObserver((mutations) => {
    let newTweetsFound = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          // Check if the added node is a tweet or contains tweets
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (
              node.tagName === 'ARTICLE' || 
              (node.dataset && node.dataset.testid === 'tweet') ||
              (node.dataset && node.dataset.testid === 'cellInnerDiv') ||
              node.querySelector('article, [data-testid="tweet"], [data-testid="cellInnerDiv"]')
            ) {
              newTweetsFound = true;
            }
          }
        });
      }
    });
    
    // Apply preferences to newly loaded tweets
    if (newTweetsFound) {
      chrome.storage.sync.get(['HIDE_DIMINISHED_TWEETS'], (result) => {
        applyPreferencesToVisibleTweets(result.HIDE_DIMINISHED_TWEETS !== false);
      });
    }
  });
  
  // Start observing the main timeline
  const timeline = document.querySelector('main[role="main"]') || document.body;
  tweetObserver.observe(timeline, { childList: true, subtree: true });
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Update hide diminished tweets setting if received
  if (message.action === 'updateHideDiminishedState') {
    const hideDiminished = message.hideDiminishedTweets;
    console.log('[tweetPreference] Updating hide diminished tweets state:', hideDiminished);
    
    // Apply to visible tweets
    if (hideDiminished) {
      // Find and hide all diminished tweets
      const diminishedTweets = document.querySelectorAll('.detoxify-diminished-tweet');
      diminishedTweets.forEach(tweet => {
        hideTweet(tweet);
      });
    } else {
      // Find all hidden diminished tweets and show them
      const diminishedTweets = document.querySelectorAll('.detoxify-diminished-tweet');
      diminishedTweets.forEach(tweet => {
        tweet.style.display = ''; // Restore default display
        
        // Also restore containers
        const cellInnerDiv = tweet.closest('[data-testid="cellInnerDiv"]');
        if (cellInnerDiv) {
          cellInnerDiv.style.display = '';
        }
        
        const article = tweet.closest('article');
        if (article && article !== tweet) {
          article.style.display = '';
        }
      });
    }
    
    sendResponse({ status: 'preferences updated' });
  }
  
  return true; // Keep the message channel open for async responses
});

// Initialize when the page has loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTweetPreferences);
} else {
  initTweetPreferences();
}