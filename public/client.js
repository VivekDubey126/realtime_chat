const socket = io()
let name;
let textarea = document.querySelector('#textarea')
let messageArea = document.querySelector('.message__area')
let onlineCount = document.querySelector('#online-count')
let typingIndicator = document.querySelector('#typing-indicator')

do {
    name = prompt('Please enter your name: ')
} while(!name)

// Tell server we joined
socket.emit('new-user-joined', name)

textarea.addEventListener('keyup', (e) => {
    if(e.key === 'Enter') {
        sendMessage(e.target.value)
    }
})

// Typing indicator logic
let typingTimer;
textarea.addEventListener('input', () => {
    socket.emit('typing', name)
    clearTimeout(typingTimer)
    typingTimer = setTimeout(() => {
        socket.emit('typing', null)
    }, 1000)
})

function sendMessage(message) {
    if (!message.trim()) return
    let msg = {
        user: name,
        message: message.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    // Append 
    appendMessage(msg, 'outgoing')
    textarea.value = ''
    scrollToBottom()

    // Send to server 
    socket.emit('message', msg)
}

function appendMessage(msg, type) {
    let mainDiv = document.createElement('div')
    let className = type
    mainDiv.classList.add(className, 'message')

    let markup = `
        <h4>${msg.user}</h4>
        <p>${msg.message}</p>
        <span class="timestamp">${msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    `
    mainDiv.innerHTML = markup
    messageArea.appendChild(mainDiv)
}

function appendSystemMessage(message) {
    let div = document.createElement('div')
    div.classList.add('system-message')
    div.innerText = message
    messageArea.appendChild(div)
    scrollToBottom()
}

// Receive messages 
socket.on('message', (msg) => {
    appendMessage(msg, 'incoming')
    scrollToBottom()
})

// Receive online count updates
socket.on('online-count-update', (count) => {
    onlineCount.innerText = `Online: ${count}`
})

// Receive user join/leave notifications
socket.on('user-joined', (userName) => {
    appendSystemMessage(`${userName} joined the chat`)
})

socket.on('user-left', (userName) => {
    appendSystemMessage(`${userName} left the chat`)
})

// Receive typing status
socket.on('typing', (userName) => {
    if (userName) {
        typingIndicator.innerText = `${userName} is typing...`
    } else {
        typingIndicator.innerText = ''
    }
})

function scrollToBottom() {
    messageArea.scrollTop = messageArea.scrollHeight
}
