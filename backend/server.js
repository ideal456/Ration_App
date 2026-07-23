const express = require('express');
const cors = require('cors');
// Import our brand new parsing function
const parseRationData = require('./parseData');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// A simple test route to make sure our backend is alive
app.get('/api/status', (req, res) => {
    res.json({ 
        status: "success", 
        message: "Backend server is up and running!" 
    });
});

// Update this endpoint to read the dynamically parsed card list
app.get('/api/ration-cards', (req, res) => {
    // Call the parser to get the fresh array of 212 cards from your HTML file
    const cards = parseRationData();
    res.json(cards);
});

// Start the server
app.listen(PORT, () => {
 console.log(`Server is running on http://localhost:${PORT}`);
});

