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

io.on('connection', (socket) => {
    console.log('Connected...')
    
    // Send current count to the newly connected user
    io.emit('online-count-update', io.engine.clientsCount);

    socket.on('new-user-joined', name => {
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
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
        // Update count for everyone on disconnect
        io.emit('online-count-update', io.engine.clientsCount);
    })
})