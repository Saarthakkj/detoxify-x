Implementing Tweet Preference Controls for Timeline Customization


Data Structure Design

Create a structured preference store:

Store tweet preferences as key-value pairs
Key: Generate a unique identifier for each tweet (content hash or combination of tweet ID + text snippet)
Value: Store preference data (enforce/diminish) with metadata
Example structure:

tweetPreferences: {
  [tweetIdentifier1]: {
    preference: "enforce",
    timestamp: 1712245689,
    sampleContent: "First 50 chars of tweet for reference..."
  },
  [tweetIdentifier2]: {
    preference: "diminish",
    timestamp: 1712245690,
    sampleContent: "First 50 chars of tweet for reference..."
  }
}

Feature Implementation : 

UI Elements:

Add tick/cross icons when user selects content from the tweet
Make them visually consistent with Twitter's design

Event Handling:

show tick/cross buttons after user selects the text from tweet
Store the user's preference in chrome.sync.storage -> if the user choses crosss , delete the tweet from the page
Provide visual feedback when preference is saved (close the tick/cross)

Integration with Filtering System:

Modify sendPostRequest to include preference context
Add additional field to the request data object with user preferences
Update system prompt to consider these preferences

AI Integration:

Include preference information in the context sent to Nebius AI
Have AI model consider similar content to enforced/diminished tweets
Balance user category preferences with tweet-specific preferences

Processing Flow
When rendering tweets, check if each has existing preferences
When user marks a tweet, save preference to storage
During tweet filtering operations, include preferences in API requests
Update system prompt to tell AI to consider enforced/diminished content patterns
Have AI weight content similarity against user's explicit preferences

Technical Considerations
Performance: Implement a caching mechanism to avoid repeated storage lookups (sync storage)
Storage limits: Implement cleanup for old preferences (e.g., keep only last 100)
Privacy: Only store minimal identifying information about tweets
