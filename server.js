const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const CLIENT_ID     = process.env.JOBBER_CLIENT_ID;
const CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET;
const REDIRECT_URI  = process.env.REDIRECT_URI;

app.get('/auth', (req, res) => {
  const url = `https://api.getjobber.com/api/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(url);
});

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
    res.redirect(`https://sevandust.github.io/armor-coating-jobber/calculator.html?token=${token}`);
  } catch(err) {
    res.status(500).send('Auth failed: ' + err.message);
  }
});

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
        quotes(first: 20) {
          nodes {
            id
            title
            quoteNumber
            amounts {
              subtotal
              total
            }
            client { name }
            property { address { street city province postalCode } }
          }
        }
      }`})
    });

    const data = await response.json();

    if (data.data && data.data.quotes && data.data.quotes.nodes.length > 0) {
      console.log('Sample quote:', JSON.stringify(data.data.quotes.nodes[0], null, 2));
    }

    if (data.data && data.data.quotes) {
      data.data.jobs = { nodes: data.data.quotes.nodes };
      delete data.data.quotes;
    }

    res.json(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Separate endpoint to get line items for a single selected quote
app.get('/quote/:id', async (req, res) => {
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
        quote(id: "${req.params.id}") {
          lineItems {
            nodes {
              name
              quantity
              unitPrice
              totalPrice
            }
          }
        }
      }`})
    });
    const data = await response.json();
    console.log('Quote detail:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
