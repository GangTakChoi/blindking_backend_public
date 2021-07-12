const { Server } = require("socket.io");
const userFriendsModel = require('./model/user_friends_model')
const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;


exports.createSocket = (server) => {
  
  const io = new Server(server);
  io.on('connection', async (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    let roomId = null

    socket.on('sendMessage', (msg) => {
      if (roomId === null) socket.disconnect()
      // console.log(roomId)
      io.to(roomId).emit('brodcastMessage', msg); // 그룹 전체
      // socket.broadcast.to(roomId).emit('brodcastMessage', msg); // 나를 제외한 그룹 전체
    })
    
    socket.on('goInChattingRoom', async (requestInfo) => {
      try {
        let userId
        let userObjectId
        let friendObjectId

        const clientToken = requestInfo.token
        const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);


        if (!decoded) {
          socket.disconnect()
          return
        }

        userId = decoded.id;
        userObjectId = decoded.objectId;
        friendObjectId = requestInfo.friendObjectId;

        let filter = {
          userObjectId: userObjectId,
          friendObjectId: friendObjectId
        }

        let result = await userFriendsModel.findOne(filter)

        if (result === null) {
          socket.disconnect()
          return
        }

        roomId = result.chattingRoomKey
        socket.join(roomId)
      } catch (e) {
        socket.disconnect()
        console.log(e)
      }
      
    });
    
  });
}