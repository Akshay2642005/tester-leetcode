const LEETCODE_DOMAIN = "leetcode.com";
const BACKEND_URL = "http://localhost:3001/submit-tokens";
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

let activeMonitoringTimeoutId = null;
let currentLoginAttemptId = null; // Store the ID for the current login flow
let currentLeetCodeUsername = null; // Store the username from the frontend for the current login flow

chrome.runtime.onInstalled.addListener(() => {
  console.log("🟢 LeetCode Token Auto Sender Extension Installed");
});

// --- Helper to send status back to frontend (via frontend_bridge.js) ---
function sendFrontendStatus(message, success = false) {
    console.log(`Background sending status to frontend (via bridge): ${message}`);
    chrome.tabs.query({ url: "http://127.0.0.1:5500/*" }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "FROM_BACKGROUND_STATUS",
                message: message,
                success: success
            }).catch(e => console.warn("Could not send status to frontend bridge:", e));
        } else {
            console.warn("Frontend tab not found for status update. Status not sent to UI.");
        }
    });
}

// --- Function to attempt sending tokens ---
async function sendTokensToBackend(username, loginId) {
  if (loginId && loginId !== currentLoginAttemptId) {
    console.log(`Skipping token send for old login attempt ID: ${loginId}`);
    return; // Do not send if this is for an outdated login attempt
  }

  // Use the username directly passed from the frontend
  const usernameToSend = username || currentLeetCodeUsername; // Fallback to current if function called without it

  if (!usernameToSend) {
      console.error("❌ Cannot send tokens: LeetCode username is missing.");
      sendFrontendStatus("❌ LeetCode username not provided. Cannot send tokens.");
      clearLoginMonitor();
      return;
  }

  chrome.cookies.getAll({ domain: LEETCODE_DOMAIN }, async (cookies) => {
    const session = cookies.find(c => c.name === "LEETCODE_SESSION");
    const csrf = cookies.find(c => c.name === "csrftoken");

    if (session && csrf) {
      console.log(`Found session and CSRF for ${usernameToSend}. Preparing to send...`);
      const payload = {
        username: usernameToSend, // Use the user-provided username
        sessionToken: session.value,
        csrfToken: csrf.value
      };

      try {
        const res = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          console.log("✅ Tokens sent successfully to backend.");
          sendFrontendStatus(`✅ Successfully logged in and tokens sent for ${usernameToSend}!`, true);
          clearLoginMonitor(); // Clear any pending timeouts
        } else {
          const errorText = await res.text();
          console.error("❌ Failed to send tokens to backend.", errorText);
          sendFrontendStatus(`❌ Failed to send tokens for ${usernameToSend}: ${errorText}`);
        }
      } catch (err) {
        console.error("❌ Error sending tokens to backend:", err);
        sendFrontendStatus(`❌ Error sending tokens for ${usernameToSend}: ${err.message}`);
      }
    } else {
      console.warn("⚠️ Tokens not found in LeetCode cookies yet.");
      sendFrontendStatus("Waiting for LeetCode login...");
    }
  });
}

// --- Monitor Login Status ---
let loginMonitorInterval = null;

// Modified startLoginMonitor to accept the username directly
async function startLoginMonitor(tabId, loginId, usernameFromFrontend) {
  if (activeMonitoringTimeoutId) {
    clearTimeout(activeMonitoringTimeoutId);
  }
  if (loginMonitorInterval) {
    clearInterval(loginMonitorInterval);
  }

  currentLoginAttemptId = loginId;
  currentLeetCodeUsername = usernameFromFrontend; // Store the username from the frontend
  console.log(`Starting login monitor for attempt ID: ${loginId} with username: ${usernameFromFrontend}`);
  sendFrontendStatus("Monitoring LeetCode login status...");

  // Set up polling to check login status
  loginMonitorInterval = setInterval(() => checkLeetCodeLoginStatus(tabId), 5000); // Check every 5 seconds

  // Set a timeout for the entire login process
  activeMonitoringTimeoutId = setTimeout(() => {
    console.warn("⚠️ LeetCode login timeout reached (5 minutes).");
    sendFrontendStatus("❌ LeetCode login timed out. Please try again.", false);
    clearLoginMonitor();
  }, LOGIN_TIMEOUT_MS);
}

function clearLoginMonitor() {
  if (activeMonitoringTimeoutId) {
    clearTimeout(activeMonitoringTimeoutId);
    activeMonitoringTimeoutId = null;
  }
  if (loginMonitorInterval) {
    clearInterval(loginMonitorInterval);
    loginMonitorInterval = null;
  }
  currentLoginAttemptId = null;
  currentLeetCodeUsername = null; // Clear username too
  console.log("Login monitoring cleared.");
}

// checkLeetCodeLoginStatus now directly calls sendTokensToBackend if cookies are found
// and handles autofill on login page.
async function checkLeetCodeLoginStatus(tabId) {
  console.log("Checking LeetCode login status...");
  chrome.cookies.getAll({ domain: LEETCODE_DOMAIN }, async (cookies) => {
    const session = cookies.find(c => c.name === "LEETCODE_SESSION");
    const csrf = cookies.find(c => c.name === "csrftoken");

    if (session && csrf) {
      console.log("LeetCode session and CSRF tokens found. Preparing to send using user-provided username.");
      // Directly send tokens using the username already provided by the frontend
      sendTokensToBackend(currentLeetCodeUsername, currentLoginAttemptId);
      clearLoginMonitor(); // Stop monitoring once tokens are sent
    } else {
      console.log("LeetCode tokens not yet available.");
      sendFrontendStatus("Waiting for LeetCode login...");

      // --- Autofill Username Logic ---
      if (currentLeetCodeUsername) {
          chrome.tabs.query({ url: "*://leetcode.com/accounts/login/*" }, async (loginTabs) => {
              if (loginTabs.length > 0) {
                  const loginTab = loginTabs[0]; // Assume the first login tab is the one
                  console.log(`On LeetCode login page (${loginTab.url}). Attempting to autofill username.`);
                  try {
                      const results = await chrome.scripting.executeScript({
                          target: { tabId: loginTab.id },
                          function: (username) => {
                              // These are common selectors for LeetCode's username/email field
                              const usernameField = document.querySelector('#username') ||
                                                    document.querySelector('input[name="login"]') ||
                                                    document.querySelector('input[type="email"]'); // Added email type
                              if (usernameField) {
                                  usernameField.value = username;
                                  usernameField.dispatchEvent(new Event('input', { bubbles: true }));
                                  usernameField.dispatchEvent(new Event('change', { bubbles: true }));
                                  console.log("Autofilled username field with:", username);
                                  return true;
                              }
                              console.warn("Could not find username input field to autofill.");
                              return false;
                          },
                          args: [currentLeetCodeUsername]
                      });

                      if (results && results[0] && results[0].result) {
                          sendFrontendStatus("Username autofilled. Please enter password and log in.", false);
                      } else {
                          sendFrontendStatus("Couldn't autofill username. Please enter manually.", false);
                      }
                  } catch (error) {
                      console.error("Error during username autofill script injection:", error);
                      sendFrontendStatus("Error autofilling username.", false);
                  }
              }
          });
      }
    }
  });
}

// --- Listen for messages from Content Scripts (frontend_bridge.js) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startLeetCodeMonitor" && message.loginAttemptId) {
    if (!sender.tab || !sender.tab.url.startsWith("http://127.0.0.1:5500/")) {
         console.warn("Received monitor request from unauthorized tab:", sender.tab?.url);
         sendResponse({ success: false, message: "Unauthorized tab source for monitor request." });
         return false;
    }
    console.log(`Background received request from frontend_bridge: ${message.loginAttemptId} with username: ${message.leetCodeUsername}`);
    startLoginMonitor(sender.tab.id, message.loginAttemptId, message.leetCodeUsername);
    sendResponse({ success: true, message: "Monitoring initiated via bridge." });
    return true;
  }
  // Removed the 'getUsername' action handling as it's no longer needed for this flow.
  return false;
});
