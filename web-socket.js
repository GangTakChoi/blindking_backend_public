const mongoose = require('mongoose');
const { Server } = require("socket.io");
const userFriendsModel = require('./model/user_friends_model')
const chattingRoomModel = require('./model/chatting_room')
const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;


exports.createSocket = (server) => {
  
  const io = new Server(server);

  io.of('/chatting-alim').on('connection', async (socket) => {
    console.log('[chatting-alim] 연결 성공 (id:' + socket.id + ')');

    socket.on('disconnect', () => {
      console.log('[chatting-alim] 연결 종료 (id:' + socket.id + ')');
    });
    socket.on('alimRoomOpen', (clientToken) => {
      const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);
      
      if (!decoded) {
        socket.disconnect()
        return
      }

      socket.join(decoded.objectId)
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

    socket.on('sendMessage', async (requestInfo) => {
      try {
        if (myObjectId === null || friendObjectId === null || myNickname === null) {
          socket.disconnect()
          return
        }

        if (roomId === null) socket.disconnect()
        
        let filter = {
          _id: roomId
        }

        let chattingRoomInfo = await chattingRoomModel.findOne(filter)

        if (chattingRoomInfo.isClose) {
          socket.disconnect()
          return
        }

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

        io.of('/chatting').to(roomId).emit('brodcastMessage', requestInfo); // 그룹 전체

        let alimInfo = {
          nickname: myNickname,
          message: requestInfo.msg,
          friendObjectId: myObjectId,
        }

        io.of('/chatting-alim').to(friendObjectId).emit('messageAlim', alimInfo); // 그룹 전체
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
        let chattingRoomInfo = await chattingRoomModel.findOne(filter).sort({ 'messageRecords.created': 1 })
        
        // 이전 대화내용 없는 경우 종료
        if (chattingRoomInfo === null || chattingRoomInfo.messageRecords.length < 0) return

        // 읽은 메세지 카운트
        await chattingRoomInfo.readedMessageCountInfos.forEach((readedMessageCountInfo) => {
          if (String(readedMessageCountInfo.userObjectId) === myObjectId) {
            readedMessageCountInfo.readedMessageCount = chattingRoomInfo.messageRecords.length
          }
        })
        

        // 읽은 메세지 수 저장
        await chattingRoomModel.create(chattingRoomInfo)
        
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
    
  });
}