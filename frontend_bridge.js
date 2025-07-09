// File: frontend_bridge.js

// Listen for messages from the frontend page (app.js)
window.addEventListener('message', (event) => {
    if (event.source === window && event.origin === window.location.origin && event.data.type === 'TO_EXTENSION_REQUEST') {
        console.log("Frontend bridge received message from webpage:", event.data);

        chrome.runtime.sendMessage(event.data, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Frontend bridge: Error sending message to background:", chrome.runtime.lastError.message);
                window.postMessage({
                    type: "FROM_EXTENSION_STATUS_RELAY",
                    message: `Error from extension: ${chrome.runtime.lastError.message}`,
                    success: false
                }, window.location.origin);
            } else {
                console.log("Frontend bridge: Message relayed to background, response:", response);
                window.postMessage({
                    type: "FROM_EXTENSION_STATUS_RELAY",
                    message: response.message,
                    success: response.success
                }, window.location.origin);
            }
        });
    }
});

// Listen for messages from the background script (relayed status)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FROM_BACKGROUND_STATUS") {
        console.log("Frontend bridge received status from background:", message);
        window.postMessage({
            type: "FROM_EXTENSION_STATUS_RELAY",
            message: message.message,
            success: message.success
        }, window.location.origin);
        sendResponse({success: true});
        return false;
    }
    return false;
});