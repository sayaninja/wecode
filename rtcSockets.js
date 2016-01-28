var io = require('socket.io');
var sio;

/**
 * This module is responsible for setting up the socket listener.
 *
 * It will perform the following actions
 *   1. Create a socket listener
 *   2. Handle sending messages from the client side
 *   3. Handle room joining/creating from the client side
 */
function rtcSockets(server) {
    sio = io(server);

    sio.on('connection', function (socket){

        socket.on('chat message', function(message, room){
            sio.sockets.in(room).emit('chat message', message);
        });

        socket.on('print username', function(data, room){
            sio.sockets.in(room).emit('print username', data);
        });

        socket.on('message', function (message, room, receiverId) {
            messageHandler(message, room, receiverId, socket);
        });

        /**
         *  gotUserMedia sends a signal that the userMedia has been activated
         */
        socket.on('gotUserMedia', function(message) {
            socket.emit('gotUserMedia', true);
        });

        /**
         *  Deals with clients joining the room for video chat
         */
        socket.on('create or join', function(roomId) {
            joinHandler(roomId, socket);
        });
    });
}

/**
 * Listens to a message from a client to handle peer connections, the different steps
 * it performs are:
 * 1. Listens to a offer and delivers it to the remote client with id remoteId
 * 2. Listens to a answer and delivers it to the remote client with id remoteId
 * 3. Listens to a message type of candidate and deliverse it to the remote client with id remoteId
 * 4. Listens to a message bye and delivers it to all the clients connected to the room
 */
function messageHandler(message, room, receiverId, socket) {
    var senderId = socket.id;

    if(message.type === 'offer') {
        sendMessageToReceiver(message, receiverId, senderId);
    }
    else if(message.type === 'answer') {
        sendMessageToReceiver(message, receiverId, senderId);
    }
    else if(message.type === 'candidate') {
        sendMessageToReceiver(message, receiverId, senderId);
    }
    else if(message === 'bye') {
        sio.to(room).emit('message', message, senderId);
    }
}

function sendMessageToReceiver(message, receiverId, senderId) {
    sio.sockets.connected[receiverId].emit('message', message, senderId);
}

function joinHandler(roomID, socket) {

    var room = sio.sockets.adapter.rooms[roomID];

    if (!room || Object.keys(room).length < 5) {
        socket.join(roomID);
        room = sio.sockets.adapter.rooms[roomID].sockets;
        socket.emit('joined', clientsInRoom(room));
    }
    else {
        socket.emit('full', roomID);
    }
}

function clientsInRoom(room) {
    var currentlyConnected = [];
    for (var client in room) {
        if (!room.hasOwnProperty(client)) continue;
        currentlyConnected.push(client);
    }
    return currentlyConnected;
}

module.exports = rtcSockets;
