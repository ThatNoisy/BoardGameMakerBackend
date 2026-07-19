const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = 'lhopkins03411@outlook.com';
const DATA_FILE = path.join(__dirname, 'submissions.json');

// Middlewares
app.use(cors());
app.use(express.json());

// Helper functions to manage the JSON storage file
function readData() {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        const raw = fs.readFileSync(DATA_FILE);
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ================= API ENDPOINTS =================

// 1. Ingest new level configurations from the game canvas
app.post('/api/submit-level', (req, res) => {
    const { creatorName, boardData, levelTitle } = req.body;

    if (!creatorName || !boardData || !levelTitle) {
        return res.status(400).json({ success: false, message: "Missing required level configuration data." });
    }

    // Moderate text inputs for basic school safety compliance
    const bannedWords = ['inappropriateword1', 'inappropriateword2']; // Expand this list as needed
    const textToCheck = `${levelTitle} ${creatorName}`.toLowerCase();
    const isFlagged = bannedWords.some(word => textToCheck.includes(word));

    if (isFlagged) {
        return res.status(400).json({ success: false, message: "Submission failed safety compliance filtering check." });
    }

    const submissions = readData();
    const newSubmission = {
        id: Date.now().toString(),
        creator: creatorName,
        title: levelTitle,
        grid: boardData,
        approved: false,
        timestamp: new Date()
    };

    submissions.push(newSubmission);
    writeData(submissions);

    console.log(`[ALERT] Map review request logged for ${ADMIN_EMAIL}. Level ID: ${newSubmission.id}`);

    res.json({ 
        success: true, 
        message: "Level submitted to Liam Hopkins (Creator of Unblocked Games BGC) for verification review." 
    });
});

// 2. Query data logs (Admin dashboard reads from here)
app.get('/api/levels', (req, res) => {
    const submissions = readData();
    // Return only levels that are still waiting for your approval check
    const pending = submissions.filter(item => item.approved === false);
    res.json(pending);
});

// 3. Update level verification flag state from the Admin section
app.post('/api/approve-level/:id', (req, res) => {
    const levelId = req.params.id;
    const submissions = readData();
    const level = submissions.find(item => item.id === levelId);

    if (!level) {
        return res.status(404).json({ success: false, message: "Target configuration grid index not found." });
    }

    level.approved = true;
    writeData(submissions);

    res.json({ success: true, message: `Configuration blueprint "${level.title}" successfully authorized!` });
});

// Start the server network listener
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` BGC BACKEND ONLINE // TARGET PORT: ${PORT}`);
    console.log(` Admin Notification Routing Target: ${ADMIN_EMAIL}`);
    console.log(`====================================================`);
});
