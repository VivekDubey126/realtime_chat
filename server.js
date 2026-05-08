const express = require('express')
const app = express()
const http = require('http').createServer(app)

const PORT = process.env.PORT || 3000

http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})

app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

// Socket 
const io = require('socket.io')(http, {
    maxHttpBufferSize: 1e8 // 100 MB
})

const users = {};
let isLocked = false;

io.on('connection', (socket) => {
    console.log('Connected...')
    
    // Send initial count of active chatters and lock status
    socket.emit('online-count-update', Object.keys(users).length || 1);
    socket.emit('room-lock-status', isLocked);
    socket.emit('user-list-update', Object.values(users));

    socket.on('new-user-joined', name => {
        if (isLocked) {
            socket.emit('join-error', 'Room is locked. No new participants can join.');
            return;
        }
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
        // Broadcast updated count and list to everyone
        io.emit('online-count-update', Object.keys(users).length);
        io.emit('user-list-update', Object.values(users));
    });

    socket.on('toggle-lock', () => {
        isLocked = !isLocked;
        io.emit('room-lock-status', isLocked);
    });

    socket.on('message', (msg) => {
        socket.broadcast.emit('message', msg)
    })

    socket.on('message-reaction', (data) => {
        socket.broadcast.emit('message-reaction', data)
    })

    socket.on('typing', (name) => {
        socket.broadcast.emit('typing', name)
    })

    socket.on('disconnect', () => {
        const name = users[socket.id];
        if (name) {
            socket.broadcast.emit('user-left', name);
            delete users[socket.id];
        }
        // Broadcast updated count and list to everyone
        io.emit('online-count-update', Object.keys(users).length);
        io.emit('user-list-update', Object.values(users));
    })
})