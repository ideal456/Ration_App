const express = require('express');
const cors = require('cors');
const parseRationData = require('./parseData');
const initDatabase = require('./database/db_init');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({
        status: "success",
        message: "Backend server is up and running!"
    });
});

app.get('/api/ration-cards', (req, res) => {
    const cards = parseRationData();
    res.json(cards);
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });