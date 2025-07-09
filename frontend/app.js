// File: app.js

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('leetcodeLoginButton');
    const usernameInput = document.getElementById('leetcodeUsername');
    const statusMessage = document.getElementById('statusMessage');
    const extensionIdSpan = document.getElementById('extensionId');

    extensionIdSpan.textContent = "N/A (handled by extension internally)";

    window.addEventListener('message', (event) => {
        if (event.source === window && event.origin === window.location.origin && event.data.type === 'FROM_EXTENSION_STATUS_RELAY') {
            console.log('Frontend received message from extension:', event.data.message);
            statusMessage.textContent = event.data.message;
            if (event.data.success) {
                statusMessage.style.color = 'green';
            } else if (event.data.message.includes('timeout') || event.data.message.includes('failed') || event.data.message.includes('Error')) {
                statusMessage.style.color = 'red';
            } else {
                statusMessage.style.color = 'blue';
            }
        }
    });

    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();

        if (!username) {
            statusMessage.textContent = "Please enter your LeetCode username.";
            statusMessage.style.color = 'orange';
            return;
        }

        statusMessage.textContent = "Initiating LeetCode login process...";
        statusMessage.style.color = 'blue';

        const loginAttemptId = Date.now().toString();

        try {
            window.postMessage({
                type: "TO_EXTENSION_REQUEST",
                action: "startLeetCodeMonitor",
                loginAttemptId: loginAttemptId,
                leetCodeUsername: username
            }, window.location.origin);

            console.log("Frontend sent message to window.postMessage with username:", username);
            statusMessage.textContent = "Request sent to extension. Redirecting to LeetCode. Please log in if not already.";
            window.open('https://leetcode.com/accounts/login/', '_blank');

        } catch (error) {
            statusMessage.textContent = `Error initiating process: ${error.message}.`;
            statusMessage.style.color = 'red';
            console.error("Error sending message via window.postMessage:", error);
        }
    });
});