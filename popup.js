document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('sendTokensButton');
    const usernameInput = document.getElementById('usernameInput');
    const statusDiv = document.getElementById('status');

    sendButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (!username) {
            statusDiv.textContent = "Please enter a username.";
            statusDiv.style.color = "orange";
            return;
        }

        statusDiv.textContent = "Sending tokens...";
        statusDiv.style.color = "blue";

        // Send a message to the background script
        chrome.runtime.sendMessage({ action: "sendTokens", username: username }, (response) => {
            if (response && response.success) {
                statusDiv.textContent = "✅ Tokens sent successfully!";
                statusDiv.style.color = "green";
            } else {
                statusDiv.textContent = "❌ Failed to send tokens. Check console for details.";
                statusDiv.style.color = "red";
            }
        });
    });
});