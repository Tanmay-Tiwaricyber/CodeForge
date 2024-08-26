const ws = new WebSocket('ws://localhost:3000');

// Handle WebSocket open event
ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

// Handle incoming WebSocket messages
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'code') {
        // Update code editors with the latest content
        const textareas = {
            html: document.getElementById('html-code'),
            css: document.getElementById('css-code'),
            js: document.getElementById('js-code')
        };

        if (data.html) {
            textareas.html.value = data.html;
            highlightText(textareas.html, data.user, data.color);
        }
        if (data.css) {
            textareas.css.value = data.css;
            highlightText(textareas.css, data.user, data.color);
        }
        if (data.js) {
            textareas.js.value = data.js;
            highlightText(textareas.js, data.user, data.color);
        }
    } else if (data.type === 'user-list') {
        // Update user list
        const userList = document.getElementById('user-list');
        userList.innerHTML = '<h3>Active Users:</h3>' + data.users.map(user => `<p style="color:${user.color}">${user.user}</p>`).join('');
    } else if (data.type === 'invite') {
        // Handle file invitations
        const { fileName, invitee } = data;
        const inviteList = document.getElementById('invitation-list');
        inviteList.innerHTML += `<p>${invitee} has been invited to edit ${fileName}</p>`;
    }
};

// Handle code editor input events and send updates via WebSocket
document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('input', () => {
        const html = document.getElementById('html-code').value;
        const css = document.getElementById('css-code').value;
        const js = document.getElementById('js-code').value;

        // Send code updates to WebSocket server
        ws.send(JSON.stringify({ type: 'code', html, css, js }));
    });
});

// Switch between tabs
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        document.getElementById(button.getAttribute('data-target')).style.display = 'block';
    });
});

// Show the first tab by default
document.querySelector('.tab-button').click();

// Handle Run Web button click
document.getElementById('run-web').addEventListener('click', () => {
    const html = document.getElementById('html-code').value;
    const css = document.getElementById('css-code').value;
    const js = document.getElementById('js-code').value;

    fetch('/render-web', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ html, css, js })
    })
    .then(response => response.text())
    .then(data => {
        document.getElementById('output').innerHTML = data;
    })
    .catch(error => {
        document.getElementById('output').innerHTML = `Error: ${error.message}`;
    });
});

// Handle file upload
document.getElementById('file-upload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const fileName = data.fileName;
        const accessCode = data.accessCode; // Get the access code

        // Prompt user for access code
        const enteredCode = prompt('Enter the access code to access this file:');
        if (enteredCode === accessCode) {
            alert(`File uploaded successfully! Access it <a href="/uploads/${fileName}?code=${accessCode}" target="_blank">here</a>.`);
        } else {
            alert('Invalid access code.');
        }
    })
    .catch(error => {
        console.error('Error uploading file:', error);
    });
});

// Handle invite button click
document.getElementById('send-invite').addEventListener('click', () => {
    const email = document.getElementById('invite-email').value;
    const fileName = prompt('Enter the file name to invite others to:');

    // Send invite to WebSocket server
    ws.send(JSON.stringify({ type: 'invite', fileName, invitee: email }));
});

// Notify WebSocket server about user activity
ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'user', user: `User-${Math.floor(Math.random() * 1000)}` }));
};

// Function to highlight text for a specific user
function highlightText(textarea, user, color) {
    const lines = textarea.value.split('\n');
    const highlightedLines = lines.map((line, index) => {
        // Here you can add more sophisticated logic for highlighting
        return `<span style="background-color:${color}">${line}</span>`;
    });
    textarea.innerHTML = highlightedLines.join('\n');
}
