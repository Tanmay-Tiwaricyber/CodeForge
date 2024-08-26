const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 3000;

// Middleware for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));

// Store file access codes and invitations
const fileAccessCodes = {}; // { filename: { code: string, invites: Set<string> } }

// Serve uploaded files with authentication
app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const accessCode = req.query.code; // Access code from query parameter

    // Check access code
    if (!fileAccessCodes[filename] || fileAccessCodes[filename].code !== accessCode) {
        return res.status(403).send('Forbidden: Invalid access code');
    }

    res.sendFile(path.join(__dirname, 'uploads', filename));
});

// WebSocket connection handling
const clients = new Map(); // Store client connections with user info

wss.on('connection', (ws) => {
    clients.set(ws, { user: `User-${Math.floor(Math.random() * 1000)}`, color: `#${Math.floor(Math.random()*16777215).toString(16)}` });

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'code') {
            // Broadcast code changes with user info
            clients.forEach((info, client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'code',
                        html: data.html,
                        css: data.css,
                        js: data.js,
                        user: info.user,
                        color: info.color
                    }));
                }
            });
        } else if (data.type === 'user') {
            // Broadcast user list updates to all clients
            const userList = Array.from(clients.values());
            clients.forEach((info, client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'user-list', users: userList }));
                }
            });
        } else if (data.type === 'invite') {
            // Handle file invitations
            const { fileName, invitee } = data;
            if (fileAccessCodes[fileName]) {
                fileAccessCodes[fileName].invites.add(invitee);
                ws.send(JSON.stringify({ type: 'invite', fileName, invitee }));
            }
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        // Broadcast user list update
        const userList = Array.from(clients.values());
        clients.forEach((info, client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'user-list', users: userList }));
            }
        });
    });

    // Send default user info
    const clientInfo = clients.get(ws);
    ws.send(JSON.stringify({ type: 'user-list', users: Array.from(clients.values()) }));
});

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    const ext = path.extname(file.originalname);
    const newName = Date.now() + ext;

    fs.renameSync(file.path, path.join('uploads', newName));

    // Generate a random access code for the uploaded file
    const accessCode = crypto.randomBytes(4).toString('hex');
    fileAccessCodes[newName] = { code: accessCode, invites: new Set() };

    res.json({ fileName: newName, accessCode });
});

// Endpoint to render HTML/CSS/JS
app.post('/render-web', express.json(), (req, res) => {
    const { html, css, js } = req.body;
    const fileName = 'temp.html';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Web Preview</title>
        <style>${css}</style>
    </head>
    <body>
        ${html}
        <script>${js}</script>
    </body>
    </html>`;

    fs.writeFileSync(`public/${fileName}`, htmlContent);
    res.send(`<iframe src="${fileName}" style="width:100%; height:100vh;"></iframe>`);
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
