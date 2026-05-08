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
let lockBtn = document.querySelector('#lock-btn')
let membersBtn = document.querySelector('#members-btn')
let userListModal = document.querySelector('#user-list-modal')
let userList = document.querySelector('#user-list')
let joinCallBtn = document.querySelector('#join-call-btn')
let videoCallOverlay = document.querySelector('#video-call-overlay')
let videoGrid = document.querySelector('#video-grid')
let muteBtn = document.querySelector('#mute-btn')
let cameraBtn = document.querySelector('#camera-btn')
let leaveCallBtn = document.querySelector('#leave-call-btn')

let localStream;
let peers = {}; // { socketId: RTCPeerConnection }
const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const notifySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')

do {
    name = prompt('Please enter your name: ')
} while (!name)

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

// --- Lock Logic ---
const unlockIcon = lockBtn.querySelector('.unlock-icon')
const lockIcon = lockBtn.querySelector('.lock-icon')

function updateLockUI(isLocked) {
    if (isLocked) {
        lockBtn.classList.add('locked')
        lockBtn.title = 'Unlock Room'
        unlockIcon.classList.add('hidden')
        lockIcon.classList.remove('hidden')
        appendSystemMessage('Room has been locked')
    } else {
        lockBtn.classList.remove('locked')
        lockBtn.title = 'Lock Room'
        unlockIcon.classList.remove('hidden')
        lockIcon.classList.add('hidden')
        appendSystemMessage('Room has been unlocked')
    }
}

lockBtn.addEventListener('click', () => {
    socket.emit('toggle-lock')
})

// --- Members Logic ---
membersBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    userListModal.classList.toggle('hidden')
})

document.addEventListener('click', (e) => {
    if (!userListModal.contains(e.target) && e.target !== membersBtn) {
        userListModal.classList.add('hidden')
    }
})

// --- Video Call Logic ---
joinCallBtn.addEventListener('click', async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        videoCallOverlay.classList.remove('hidden')
        addVideoStream('local', localStream, true)
        socket.emit('join-call')
    } catch (err) {
        alert('Could not access camera/microphone')
    }
})

leaveCallBtn.addEventListener('click', () => {
    leaveCall()
})

muteBtn.addEventListener('click', () => {
    const enabled = localStream.getAudioTracks()[0].enabled
    localStream.getAudioTracks()[0].enabled = !enabled
    muteBtn.classList.toggle('off', enabled)
})

cameraBtn.addEventListener('click', () => {
    const enabled = localStream.getVideoTracks()[0].enabled
    localStream.getVideoTracks()[0].enabled = !enabled
    cameraBtn.classList.toggle('off', enabled)
})

async function callUser(userId) {
    const pc = createPeerConnection(userId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('signal', { to: userId, signal: offer })
}

function createPeerConnection(userId) {
    const pc = new RTCPeerConnection(iceServers)
    peers[userId] = pc

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream))

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { to: userId, signal: event.candidate })
        }
    }

    pc.ontrack = (event) => {
        addVideoStream(userId, event.streams[0], false)
    }

    return pc
}

function addVideoStream(userId, stream, isLocal) {
    let videoWrap = document.getElementById(`wrap-${userId}`)
    if (!videoWrap) {
        videoWrap = document.createElement('div')
        videoWrap.id = `wrap-${userId}`
        videoWrap.classList.add('video-wrap')
        const video = document.createElement('video')
        video.id = `video-${userId}`
        video.autoplay = true
        video.playsInline = true
        if (isLocal) video.muted = true
        video.srcObject = stream
        videoWrap.appendChild(video)
        
        // Add name tag
        const nameTag = document.createElement('div')
        nameTag.classList.add('name-tag')
        nameTag.innerText = isLocal ? 'You' : (getNameBySocketId(userId) || 'Peer')
        videoWrap.appendChild(nameTag)
        
        videoGrid.appendChild(videoWrap)
    }
}

function leaveCall() {
    socket.emit('leave-call')
    videoCallOverlay.classList.add('hidden')
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
    }
    Object.keys(peers).forEach(userId => {
        peers[userId].close()
        removeVideo(userId)
    })
    peers = {}
    videoGrid.innerHTML = ''
}

function removeVideo(userId) {
    const wrap = document.getElementById(`wrap-${userId}`)
    if (wrap) wrap.remove()
}

function getNameBySocketId(id) {
    // This is tricky because the client doesn't have the socketId mapping usually.
    // For now, we'll just use "Peer". In a real app, we'd sync this.
    return 'User'
}

// --- Event Listeners ---
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(e.target.value)
    }
    if (e.key === 'Escape') {
        emojiPicker.classList.add('hidden')
        searchBar.classList.add('hidden')
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
    if (confirm('Clear conversation?')) {
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
    notifySound.play().catch(() => { })
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

socket.on('room-lock-status', (isLocked) => updateLockUI(isLocked))
socket.on('join-error', (error) => {
    alert(error)
    window.location.reload()
})

socket.on('user-list-update', (users) => {
    userList.innerHTML = ''
    users.forEach(u => {
        let li = document.createElement('li')
        li.innerHTML = `<div class="status-dot"></div><span>${u}</span>`
        userList.appendChild(li)
    })
})

socket.on('user-joined-call', (userId) => {
    callUser(userId)
})

socket.on('user-left-call', (userId) => {
    if (peers[userId]) {
        peers[userId].close()
        delete peers[userId]
        removeVideo(userId)
    }
})

socket.on('signal', async (data) => {
    const { from, signal } = data
    let pc = peers[from]

    if (!pc) pc = createPeerConnection(from)

    if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('signal', { to: from, signal: answer })
    } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal))
    } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal))
    }
})
