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
let scrollBottomBtn = document.querySelector('#scroll-bottom-btn')

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

textarea.addEventListener('input', () => {
    socket.emit('typing', name)
    clearTimeout(window.typingTimer)
    window.typingTimer = setTimeout(() => {
        socket.emit('typing', null)
    }, 1000)
})

emojiBtn.addEventListener('click', () => emojiPicker.classList.toggle('hidden'))

document.querySelectorAll('.emoji').forEach(el => {
    el.addEventListener('click', () => {
        textarea.value += el.innerText
        emojiPicker.classList.add('hidden')
        textarea.focus()
    })
})

fileBtn.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = (event) => sendImage(event.target.result)
        reader.readAsDataURL(file)
    }
})

clearBtn.addEventListener('click', () => {
    if(confirm('Clear chat screen?')) {
        messageArea.innerHTML = ''
        appendSystemMessage('Chat screen cleared')
    }
})

messageArea.addEventListener('scroll', () => {
    if (messageArea.scrollHeight - messageArea.scrollTop > 700) {
        scrollBottomBtn.classList.remove('hidden')
    } else {
        scrollBottomBtn.classList.add('hidden')
    }
})

scrollBottomBtn.addEventListener('click', scrollToBottom)

// --- Functions ---

function sendMessage(message) {
    if (!message.trim()) return
    const msgId = 'msg_' + Date.now()
    let msg = { id: msgId, user: name, message: message.trim(), time: getTime() }
    appendMessage(msg, 'outgoing')
    textarea.value = ''
    scrollToBottom()
    socket.emit('message', msg)
}

function sendImage(base64) {
    const msgId = 'img_' + Date.now()
    let msg = { id: msgId, user: name, image: base64, time: getTime() }
    appendMessage(msg, 'outgoing')
    scrollToBottom()
    socket.emit('message', msg)
}

function appendMessage(msg, type) {
    let mainDiv = document.createElement('div')
    mainDiv.classList.add(type, 'message')
    mainDiv.setAttribute('data-id', msg.id)

    let avatarHtml = type === 'incoming' ? `<div class="avatar" style="background: ${stringToColor(msg.user)}">${msg.user.charAt(0).toUpperCase()}</div>` : ''
    
    let contentHtml = ''
    if (msg.image) {
        contentHtml = `<img src="${msg.image}" alt="shared pic">`
    } else {
        const linkedText = detectLinks(msg.message)
        contentHtml = `<p>${linkedText}</p>`
    }

    let actionsHtml = msg.image 
        ? `<button class="action-btn" onclick="downloadImage('${msg.image}')">Download</button>`
        : `<button class="action-btn" onclick="copyMessage(this)">Copy</button>`

    let ticks = type === 'outgoing' ? '<span class="read-status">✓✓</span>' : ''

    let markup = `
        ${avatarHtml}
        <h4>${msg.user}</h4>
        ${contentHtml}
        <div class="reaction-container" id="reactions-${msg.id}"></div>
        <div class="message__actions">
            <button class="action-btn" onclick="reactToMessage('${msg.id}', '❤️')">❤️</button>
            <button class="action-btn" onclick="reactToMessage('${msg.id}', '👍')">👍</button>
            ${actionsHtml}
            <span class="timestamp">${msg.time}${ticks}</span>
        </div>
    `
    mainDiv.innerHTML = markup
    messageArea.appendChild(mainDiv)
}

function detectLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" style="color: #075e54; text-decoration: underline;">${url}</a>`
    })
}

window.reactToMessage = (msgId, emoji) => {
    addReactionUI(msgId, emoji)
    socket.emit('message-reaction', { msgId, emoji })
}

function addReactionUI(msgId, emoji) {
    const container = document.getElementById(`reactions-${msgId}`)
    if (container) {
        let reactionEl = container.querySelector(`[data-emoji="${emoji}"]`)
        if (reactionEl) {
            let count = parseInt(reactionEl.getAttribute('data-count')) + 1
            reactionEl.setAttribute('data-count', count)
            reactionEl.innerText = `${emoji} ${count}`
        } else {
            let el = document.createElement('span')
            el.classList.add('reaction')
            el.setAttribute('data-emoji', emoji)
            el.setAttribute('data-count', 1)
            el.innerText = `${emoji} 1`
            container.appendChild(el)
        }
    }
}

window.copyMessage = (btn) => {
    const text = btn.closest('.message').querySelector('p').innerText
    navigator.clipboard.writeText(text).then(() => {
        btn.innerText = 'Copied!'
        setTimeout(() => btn.innerText = 'Copy', 2000)
    })
}

window.downloadImage = (base64) => {
    const link = document.createElement('a')
    link.href = base64
    link.download = `wassup_${Date.now()}.png`
    link.click()
}

function appendSystemMessage(message) {
    let div = document.createElement('div')
    div.classList.add('system-message')
    div.innerText = message
    messageArea.appendChild(div)
    scrollToBottom()
}

function getTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

function stringToColor(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    let color = '#'
    for (let i = 0; i < 3; i++) color += ('00' + ((hash >> (i * 8)) & 0xFF).toString(16)).substr(-2)
    return color
}

function scrollToBottom() { messageArea.scrollTop = messageArea.scrollHeight }

// --- Socket Handlers ---

socket.on('message', (msg) => {
    appendMessage(msg, 'incoming')
    notifySound.play().catch(() => {})
    scrollToBottom()
})

socket.on('message-reaction', (data) => {
    addReactionUI(data.msgId, data.emoji)
})

socket.on('online-count-update', (count) => onlineCount.innerText = `Online: ${count}`)
socket.on('user-joined', (name) => appendSystemMessage(`${name} joined`))
socket.on('user-left', (name) => appendSystemMessage(`${name} left`))
socket.on('typing', (name) => typingIndicator.innerText = name ? `${name} is typing...` : '')
