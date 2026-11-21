
const express = require("express");
require("dotenv").config();
const app = express();


app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Dengue Prediction API is running"
    });
});


// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
