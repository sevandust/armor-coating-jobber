const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const CLIENT_ID     = process.env.JOBBER_CLIENT_ID;
const CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET;
const REDIRECT_URI  = process.env.REDIRECT_URI;

// Step 1 — Send user to Jobber login
app.get('/auth', (req, res) => {
  const url = `https://api.getjobber.com/api/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(url);
});

// Step 2 — Jobber redirects back here with a code, exchange it for a token
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const response = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    });
    const data = await response.json();
    const token = data.access_token;

    // Store token temporarily and redirect back to calculator with it
    res.redirect(`https://sevandust.github.io/armor-coating-jobber/calculator.html?token=${token}`);
  } catch(err) {
    res.status(500).send('Auth failed: ' + err.message);
  }
});

// Step 3 — Calculator calls this to get recent jobs
app.get('/jobs', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const response = await fetch('https://api.getjobber.com/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-JOBBER-GRAPHQL-VERSION': '2025-04-16'
      },
      body: JSON.stringify({ query: `{
        jobs(first: 20) {
          nodes {
            id
            title
            client { name }
            property { address { street city province postalCode } }
            lineItems {
              nodes {
                name
                quantity
                unitPrice
              }
            }
          }
        }
      }`})
    });
    const data = await response.json();
    res.json(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
