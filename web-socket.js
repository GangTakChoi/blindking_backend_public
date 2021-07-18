const mongoose = require('mongoose');
const { Server } = require("socket.io");
const userFriendsModel = require('./model/user_friends_model')
const chattingRoomModel = require('./model/chatting_room')
const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;


exports.createSocket = (server) => {
  
  const io = new Server(server);
  io.on('connection', async (socket) => {
    console.log('a user connected');
    socket.emit('connectSuccess')

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    let roomId = null
    let myObjectId
    let friendObjectId


    socket.on('sendMessage', async (requestInfo) => {
      try {
        if (roomId === null) socket.disconnect()
        
        let filter = {
          _id: roomId
        }

        let chattingRoomInfo = await chattingRoomModel.findOne(filter)

        let messageInfo = {
          userObjectId: myObjectId,
          content: requestInfo.msg,
        }

        await chattingRoomInfo.messageRecords.push(messageInfo)

        await chattingRoomInfo.readedMessageCountInfos.forEach((readedMessageCountInfo) => {
          if (String(readedMessageCountInfo.userObjectId) === myObjectId) {
            readedMessageCountInfo.readedMessageCount = chattingRoomInfo.messageRecords.length
          }
        })

        await chattingRoomModel.create(chattingRoomInfo)

        io.to(roomId).emit('brodcastMessage', requestInfo); // 그룹 전체
      } catch (e) {
        console.log(e)
      }
    })
    
    socket.on('goInChattingRoom', async (requestInfo) => {
      try {
        const clientToken = requestInfo.token
        const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);


        if (!decoded) {
          socket.disconnect()
          return
        }

        myObjectId = decoded.objectId;
        friendObjectId = requestInfo.friendObjectId;

        let filter = {
          userObjectId: myObjectId,
          friendObjectId: friendObjectId
        }

        let result = await userFriendsModel.findOne(filter)

        if (result === null) {
          socket.disconnect()
          return
        }

        roomId = result.chattingRoomId

        if (roomId === null) {
          socket.disconnect()
          return
        }

        roomId = String(roomId)

        socket.join(roomId)

        filter = {
          _id: roomId
        }
        
        // 이전 대화내용 로드
        let chattingRoomInfo = await chattingRoomModel.findOne(filter).sort({ 'messageRecords.created': 1 })
        
        // 이전 대화내용 없는 경우 종료
        if (chattingRoomInfo === null || chattingRoomInfo.messageRecords.length < 0) return

        await chattingRoomInfo.readedMessageCountInfos.forEach((readedMessageCountInfo) => {
          if (String(readedMessageCountInfo.userObjectId) === myObjectId) {
            readedMessageCountInfo.readedMessageCount = chattingRoomInfo.messageRecords.length
          }
        })

        await chattingRoomModel.create(chattingRoomInfo)

        socket.emit("loadMessage", {myObjectId: myObjectId, messageRecords: chattingRoomInfo.messageRecords})
      } catch (e) {
        socket.disconnect()
        console.log(e)
      }
      
    });
    
  });
}