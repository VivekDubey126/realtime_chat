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
let themeToggle = document.querySelector('#theme-toggle')
let searchToggle = document.querySelector('#search-toggle')
let searchBar = document.querySelector('#search-bar')
let searchInput = document.querySelector('#search-input')

const notifySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')

do {
    name = prompt('Please enter your name: ')
} while(!name)

socket.emit('new-user-joined', name)

// --- Theme Logic ---
const sunIcon = themeToggle.querySelector('.sun-icon')
const moonIcon = themeToggle.querySelector('.moon-icon')

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode')
        sunIcon.classList.remove('hidden')
        moonIcon.classList.add('hidden')
    } else {
        document.body.classList.remove('dark-mode')
        sunIcon.classList.add('hidden')
        moonIcon.classList.remove('hidden')
    }
}

const savedTheme = localStorage.getItem('theme') || 'light'
applyTheme(savedTheme)

themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode')
    const newTheme = isDark ? 'light' : 'dark'
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)
})

// --- Search Logic ---
searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('hidden')
    if (!searchBar.classList.contains('hidden')) searchInput.focus()
})

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase()
    document.querySelectorAll('.message').forEach(msg => {
        const text = msg.querySelector('p')?.innerText.toLowerCase() || ''
        msg.style.display = text.includes(term) ? 'block' : 'none'
    })
})

// --- Event Listeners ---
textarea.addEventListener('keyup', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        sendMessage(e.target.value)
    }
})

textarea.addEventListener('input', () => {
    socket.emit('typing', name)
    clearTimeout(window.typingTimer)
    window.typingTimer = setTimeout(() => socket.emit('typing', null), 1000)
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
    if(confirm('Clear conversation?')) {
        messageArea.innerHTML = ''
        appendSystemMessage('Conversation cleared')
    }
})

messageArea.addEventListener('scroll', () => {
    const isScrolledUp = messageArea.scrollHeight - messageArea.scrollTop > 800
    scrollBottomBtn.classList.toggle('hidden', !isScrolledUp)
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
    
    let contentHtml = msg.image ? `<img src="${msg.image}" alt="shared content">` : `<p>${detectLinks(msg.message)}</p>`

    let actionsHtml = msg.image 
        ? `<button class="action-btn" onclick="downloadImage('${msg.image}')" style="background:none; border:none; cursor:pointer; color:inherit; font-size:11px; text-decoration:underline;">Download</button>`
        : `<button class="action-btn" onclick="copyMessage(this)" style="background:none; border:none; cursor:pointer; color:inherit; font-size:11px; text-decoration:underline;">Copy</button>`

    let ticks = type === 'outgoing' ? '<span class="read-status" style="margin-left:5px; font-size:12px;">✓✓</span>' : ''

    mainDiv.innerHTML = `
        ${avatarHtml}
        <h4>${msg.user}</h4>
        ${contentHtml}
        <div class="reaction-container" id="reactions-${msg.id}"></div>
        <div class="message__actions">
            <button class="action-btn" onclick="reactToMessage('${msg.id}', '❤️')" style="background:none; border:none; cursor:pointer;">❤️</button>
            <button class="action-btn" onclick="reactToMessage('${msg.id}', '👍')" style="background:none; border:none; cursor:pointer;">👍</button>
            ${actionsHtml}
            <span class="timestamp">${msg.time}${ticks}</span>
        </div>
    `
    messageArea.appendChild(mainDiv)
}

function detectLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" style="color: #00a884; text-decoration: underline;">${url}</a>`)
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
        const originalText = btn.innerText
        btn.innerText = 'Copied!'
        setTimeout(() => btn.innerText = originalText, 2000)
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

socket.on('message-reaction', (data) => addReactionUI(data.msgId, data.emoji))
socket.on('online-count-update', (count) => onlineCount.innerText = `Online: ${count}`)
socket.on('user-joined', (name) => appendSystemMessage(`${name} joined`))
socket.on('user-left', (name) => appendSystemMessage(`${name} left`))

socket.on('typing', (name) => {
    if (name) {
        typingIndicator.innerHTML = `
            ${name} is typing
            <div class="typing-dots"><span></span><span></span><span></span></div>
        `
    } else {
        typingIndicator.innerHTML = ''
    }
})
