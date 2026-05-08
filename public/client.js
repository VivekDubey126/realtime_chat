const socket = io()
let name;
let textarea = document.querySelector('#textarea')
let messageArea = document.querySelector('.message__area')
let onlineCount = document.querySelector('#online-count')
let typingIndicator = document.querySelector('#typing-indicator')
let fileInput = document.querySelector('#file-input')
let fileBtn = document.querySelector('#file-btn')
let emojiBtn = document.querySelector('#emoji-btn')
let emojiPicker = document.querySelector('#emoji-picker')
let clearBtn = document.querySelector('#clear-btn')

const notifySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')

do {
    name = prompt('Please enter your name: ')
} while(!name)

socket.emit('new-user-joined', name)

// --- Event Listeners ---

textarea.addEventListener('keyup', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        sendMessage(e.target.value)
    }
})

// Typing
let typingTimer;
textarea.addEventListener('input', () => {
    socket.emit('typing', name)
    clearTimeout(typingTimer)
    typingTimer = setTimeout(() => {
        socket.emit('typing', null)
    }, 1000)
})

// Emojis
emojiBtn.addEventListener('click', () => {
    emojiPicker.classList.toggle('hidden')
})

document.querySelectorAll('.emoji').forEach(el => {
    el.addEventListener('click', () => {
        textarea.value += el.innerText
        emojiPicker.classList.add('hidden')
        textarea.focus()
    })
})

// File Sharing
fileBtn.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
            sendImage(event.target.result)
        }
        reader.readAsDataURL(file)
    }
})

// Clear Chat
clearBtn.addEventListener('click', () => {
    if(confirm('Are you sure you want to clear your chat screen?')) {
        messageArea.innerHTML = ''
        appendSystemMessage('Chat screen cleared')
    }
})

// --- Functions ---

function sendMessage(message) {
    if (!message.trim()) return
    let msg = {
        user: name,
        message: message.trim(),
        time: getTime()
    }
    appendMessage(msg, 'outgoing')
    textarea.value = ''
    scrollToBottom()
    socket.emit('message', msg)
}

function sendImage(base64) {
    let msg = {
        user: name,
        image: base64,
        time: getTime()
    }
    appendMessage(msg, 'outgoing')
    scrollToBottom()
    socket.emit('message', msg)
}

function appendMessage(msg, type) {
    let mainDiv = document.createElement('div')
    mainDiv.classList.add(type, 'message')

    // Avatar for incoming
    let avatarHtml = ''
    if (type === 'incoming') {
        const color = stringToColor(msg.user)
        const initials = msg.user.charAt(0).toUpperCase()
        avatarHtml = `<div class="avatar" style="background: ${color}">${initials}</div>`
    }

    let contentHtml = ''
    let actionsHtml = ''

    if (msg.image) {
        contentHtml = `<img src="${msg.image}" alt="shared pic">`
        actionsHtml = `<button class="action-btn" onclick="downloadImage('${msg.image}')">Download</button>`
    } else {
        contentHtml = `<p>${msg.message}</p>`
        actionsHtml = `<button class="action-btn" onclick="copyMessage(this)">Copy</button>`
    }

    let markup = `
        ${avatarHtml}
        <h4>${msg.user}</h4>
        ${contentHtml}
        <div class="message__actions">
            ${actionsHtml}
            <span class="timestamp">${msg.time}</span>
        </div>
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

// Global functions for buttons
window.copyMessage = (btn) => {
    const text = btn.closest('.message').querySelector('p').innerText
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText
        btn.innerText = 'Copied!'
        setTimeout(() => btn.innerText = originalText, 2000)
    })
}

window.downloadImage = (base64) => {
    const link = document.createElement('a')
    link.href = base64
    link.download = `wassup_image_${Date.now()}.png`
    link.click()
}

function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function stringToColor(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    let color = '#'
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF
        color += ('00' + value.toString(16)).substr(-2)
    }
    return color
}

function scrollToBottom() {
    messageArea.scrollTop = messageArea.scrollHeight
}

// --- Socket Handlers ---

socket.on('message', (msg) => {
    appendMessage(msg, 'incoming')
    notifySound.play().catch(() => {})
    scrollToBottom()
})

socket.on('online-count-update', (count) => {
    onlineCount.innerText = `Online: ${count}`
})

socket.on('user-joined', (userName) => {
    appendSystemMessage(`${userName} joined the chat`)
})

socket.on('user-left', (userName) => {
    appendSystemMessage(`${userName} left the chat`)
})

socket.on('typing', (userName) => {
    if (userName) {
        typingIndicator.innerText = `${userName} is typing...`
    } else {
        typingIndicator.innerText = ''
    }
})
