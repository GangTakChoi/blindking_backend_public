const mongoose = require('mongoose');
const { Server } = require("socket.io");
const userFriendsModel = require('./model/user_friends_model')
const chattingRoomModel = require('./model/chatting_room')
const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;


exports.createSocket = (server) => {

  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN_URL,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.of('/chatting-alim').on('connection', async (socket) => {
    console.log('[chatting-alim] 연결 성공 (id:' + socket.id + ')');

    socket.on('disconnect', () => {
      console.log('[chatting-alim] 연결 종료 (id:' + socket.id + ')');
    });

    socket.on('alimRoomOpen', (clientToken) => {
      try {
        if (!clientToken) {
          console.log('client token is null')
          socket.disconnect()
          return
        }

        const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);
      
        if (!decoded) {
          socket.disconnect()
          return
        }

        socket.join(decoded.objectId)
      } catch (error) {
        console.log(error)
        socket.disconnect()
      }
    });
  })

  io.of('/chatting').on('connection', async (socket) => {
    console.log('[chatting] 연결 성공 (id:' + socket.id + ')');
    socket.emit('connectSuccess')

    socket.on('disconnect', () => {
      console.log('[chatting] 연결 종료 (id:' + socket.id + ')');
    });

    let roomId = null // setData 에서 설정
    let myObjectId = null // setData 에서 설정
    let friendObjectId = null // setData 에서 설정
    let myNickname = null // setData 에서 설정

    socket.on('setData', async (data) => {
      try {
        const clientToken = data.myToken
        const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

        myObjectId = decoded.objectId
        myNickname = decoded.nickname
        friendObjectId = data.friendObjectId

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

        socket.emit("completeSetData")
      } catch (e) {
        socket.disconnect()
        console.log(e)
      }
    })

    socket.on('goInChattingRoom', async () => {
      try {
        if (myObjectId === null) {
          socket.disconnect()
          return
        }

        socket.join(roomId)

        filter = {
          _id: roomId
        }

        // 이전 대화내용 로드
        let chattingRoomInfo = await chattingRoomModel.findOne(filter, { messageRecords: 1, isClose: 1 })
        
        // 이전 대화내용 없는 경우 종료
        if (!chattingRoomInfo === null) {
          socket.disconnect()
          return
        }

        await chattingRoomModel.updateOne(
          {
            _id: chattingRoomInfo._id,
            "messageUnReadInfos.userObjectId": myObjectId
          },
          {
            $set: { "messageUnReadInfos.$.isUnReadMessage" : false }
          },
        )
        
        socket.emit(
          "loadMessage", 
          {
            myObjectId: myObjectId,
            messageRecords: chattingRoomInfo.messageRecords,
            isChattingRoomClose: chattingRoomInfo.isClose
          }
        )
      } catch (e) {
        socket.disconnect()
        console.log(e)
      }
      
    });

    socket.on('sendMessage', async (requestInfo) => {
      try {
        if (myObjectId === null || friendObjectId === null || myNickname === null) {
          socket.disconnect()
          return
        }

        if (roomId === null) {
          socket.disconnect()
          return
        }

        if (requestInfo.msg.length > 5000) {
          socket.disconnect()
          return
        }

        let filter = {
          _id: roomId
        }

        let chattingRoomInfo = await chattingRoomModel.findOne(filter, { isClose: 1 })

        if (chattingRoomInfo.isClose) {
          socket.disconnect()
          return
        }

        let messageInfo = {
          userObjectId: myObjectId,
          userNickname: myNickname,
          content: requestInfo.msg,
        }

        let dbReturnData = await chattingRoomModel.updateOne(
          {
            _id: chattingRoomInfo._id,
            "messageUnReadInfos.userObjectId": friendObjectId
          },
          {
            $set: { "messageUnReadInfos.$.isUnReadMessage" : true },
            $push: { messageRecords: messageInfo }
          },
        )

        if (dbReturnData.nModified !== 1) {
          // 메세지 등록 오류
        }

        io.of('/chatting').to(roomId).emit('brodcastMessage', requestInfo);

        let alimInfo = {
          nickname: myNickname,
          message: requestInfo.msg,
          friendObjectId: myObjectId,
        }

        io.of('/chatting-alim').to(friendObjectId).emit('messageAlim', alimInfo);
      } catch (e) {
        socket.disconnect()
        console.log(e)
      }
    })

    socket.on('completeRead', async () => {
      try {
        await chattingRoomModel.updateOne(
          {
            _id: roomId,
            "messageUnReadInfos.userObjectId": myObjectId
          },
          {
            $set: { "messageUnReadInfos.$.isUnReadMessage" : false },
          },
        )
      } catch (error) {
        socket.disconnect()
        console.log(error)
      }
    })
    
  });
}