// File: content.js
// This script would run in the context of the LeetCode page.
// Its primary function (getting username) is now bypassed if username is provided by frontend.
// Keep it if you have other LeetCode-specific DOM manipulations or data extractions planned.

console.log("Content script content.js loaded on LeetCode page.");

// No more getLeetCodeUsername function if background.js isn't asking for it.
// No more chrome.runtime.onMessage.addListener for "getUsername" if background.js isn't sending it.

// If you need it for any other LeetCode specific UI interactions, add them here.
// For example, if you wanted to click a button or check for a specific element's presence.