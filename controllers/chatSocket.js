import { Server as SocketIO } from 'socket.io';
import { saveMessageToDB , getChatHistory ,chatList,deleteChatMessagesFromDB,deleteChatFromDB } from './chatController.js';

export default function initializeChatService(server) { 
  const io = new SocketIO(server);   //without cors 

  const onlineUsers = new Map();  // To keep track of online users

  io.on('connection',  (socket) => {  
    //console.log("Chat Socket connected ");


//--------------  waki talki  end ===================

  // socket.on('joinRoom', ({ roomId, role }) => {
  //   socket.join(roomId);
  //   onlineUsers.set(socket.id, { roomId, role });
  //   //console.log(`${role} joined room: ${roomId}`);
  // });




  //   // Handle incoming audio stream from Host
  //   socket.on('audioStream', (data) => {
  //     const userInfo = onlineUsers.get(socket.id);
  //     if (userInfo && userInfo.role === 'Host') {
  //       // Broadcast audio only if the sender is a Host
  //       //console.log("Audio data received from Host:", data);
  //       socket.to(data.roomId).emit('audioStream', { audioData: data.audioData, roomId: data.roomId });
  //     } else {
  //       //console.log("User attempted to stream audio without permission.");
  //     }
  //   });


    
    


    // socket.on('audioStream11', (data) => {
    //   const userInfo = onlineUsers.get(socket.id);
    //   if (userInfo && userInfo.role === 'Host') {
    
    //     //console.log("received audio -> ", data)
    
    //     const audioBuffer = data.audioData; // This should be a Buffer
    //     const audioArray = Array.from(new Uint8Array(audioBuffer)); // Convert Buffer to Uint8Array
    //     socket.to(data.roomId).emit('audioStream', { roomId: data.roomId, audioData: audioArray });
    
    //   } else {
    //     //console.log("User attempted to stream audio without permission.");
    //   }
    // });



    


          // // Handle offer (sent by Host)
          // socket.on('offer', (data) => {
          //   socket.to(data.roomId).emit('offer', data);
          // });
        
          // // Handle answer (sent by User)
          // socket.on('answer', (data) => {
          //   socket.to(data.roomId).emit('answer', data);
          // });
        
          // // Handle ICE candidate
          // socket.on('ice-candidate', (data) => {
          //   socket.to(data.roomId).emit('ice-candidate', data);
          // });
        
  //--------------  waki talki end==============================
    socket.on('joinChat', async ({ userId, role }) => {
      // Map the user using a combination of userId and role as the key
    //   onlineUsers.set(`${userId}-${role}`, socket.id); 
    //        // Join a room specific to the combination of userId and role
    //  socket.join(`${userId}-${role}`);


    onlineUsers.set(`${userId}`, socket.id); 
           // Join a room specific to the combination of userId and role
     socket.join(`${userId}`);
    
      socket.userId = userId;
      socket.role = role;     



      socket.broadcast.emit('userStatusUpdate', { userId, role, status: 'online' });
      // socket.emit('userStatusUpdate', { userId, role, status: 'online' });


      const onlineUserList = Array.from(onlineUsers.entries()).map(([key, socketId]) => {
        const [onlineUserId, onlineUserRole] = key.split('-');
        return { userId: onlineUserId, role: onlineUserRole, status: 'online' };
      });

      //console.log("OnlineList ", onlineUserList)

      // Emit the status of all currently online users to the newly joined user
        socket.emit('onlineUsers', onlineUserList);
    
      //console.log(`User ${userId} with role ${role} connected`);
    
 
    });

    socket.on('userStatusUpdate', (data) => {
      //console.log('Received user status update:', data);
  });

  // Handle sending a message
    socket.on('sendMessage', async (data) => {   
      var BaseUrl = `http://${process.env.Host}/images/chat_img_vid/`;
      // //console.log("data sending ",data )

      var { fromUserId, toUserId, message , mimetype, role , sender_image , sender_name, filename, filePath  } = data;

    
      try {
          // Save message to the database
          await saveMessageToDB(fromUserId, toUserId, message, mimetype, role, filename, filePath);    

          // Look up the sender and recipient using both userId and role
          // const senderSocketId = onlineUsers.get(`${fromUserId}-${role}`);
          // const recipientSocketId = onlineUsers.get(`${toUserId}-${role}`);

          const senderSocketId = onlineUsers.get(`${fromUserId}`);
          const recipientSocketId = onlineUsers.get(`${toUserId}`);

          //console.log("data->>>>>>>>>>>>>>>",data)
        
          //console.log("onlineUsers",onlineUsers)
          //console.log("senderSocketId",senderSocketId)
          //console.log("recipientSocketId",recipientSocketId)

         // const recipientSocketId = onlineUsers.get(`${toUserId}-${role === 'Owner' ? 'User' : 'Owner'}`);
  

          if(mimetype != 'txt'){
            filename = `${BaseUrl}${filename}`
          }
        
       // Emit the message to the recipient
        if (recipientSocketId) {
          //console.log("before emit recipientSocketId",recipientSocketId)
          io.to(recipientSocketId).emit('receiveMessage', { fromUserId, message, timestamp: new Date() , sender_image , sender_name, role ,filename , mimetype  });

          //console.log("receiver  ko kiya ",recipientSocketId)
        }


        // Emit the message to the sender (so they can see it immediately)
    
        if (senderSocketId) {
          //console.log("before emit senderSocketId",senderSocketId)
          io.to(senderSocketId).emit('receiveMessage', {fromUserId, message, timestamp:new Date(), sender_image, sender_name, role,filename , mimetype });


          //console.log("sendeer ko kiya ", senderSocketId)
        }

       

        // Notify the sender about the success
        socket.emit('messageStatus', { success: true });

      } catch (error) {
        //console.log("Error sending message:", error);
         // Notify the sender about the failure
         socket.emit('messageStatus', { success: false, error: error.message });
      }


    });
 

    socket.on('chatHistory', async ({ receiverId }) => {
      try {

        //console.log("------------------------------------------------------------------------ Chat history")

        //console.log("socket userid", socket.userId)
        //console.log("socket role", socket.role)
        //console.log(" receiverId", receiverId)
        const chatHistory = await getChatHistory(socket.userId, socket.role, receiverId); // Fetch chat history from DB
      
       //console.log("chatHistory--->",chatHistory)
        socket.emit('chatHistory', chatHistory);
      } catch (error) {
        //console.log('Error loading chat history:', error);
      }
    });

    // Handle profile chats
    socket.on('chatList', async ({ userId }) => {
        try {
        //  //console.log("ListListListList------------------------------------------------------------------------ Chat List")
         // //console.log("socket userid", socket.userId)
         // //console.log("socket role", socket.role)
          const profileChats = await chatList( socket.userId, socket.role );
          socket.emit('chatList', profileChats );
        } catch (error) {
          //console.log('Error loading Socket chatlist:', error);
          socket.emit('chatListError', { error: error.message });
        }
      });

    socket.on('leaveChat', async ({ userId, role }) => { 
      if (userId && role) {
        try {
      
          // Remove user from the onlineUsers map
          onlineUsers.delete(`${userId}-${role}`);
          
          // Broadcast user status update to all clients
          io.emit('userStatusUpdate', { userId, role, status: 'offline' });

          const onlineUserList = Array.from(onlineUsers.entries()).map(([key, socketId]) => {
            const [onlineUserId, onlineUserRole] = key.split('-');
            return { userId: onlineUserId, role: onlineUserRole, status: 'online' };
          });

          //console.log("onlineUserList--->",onlineUserList)
   
          socket.emit('onlineUsers', onlineUserList);
          
          //console.log(`User ${userId} with role ${role} left the chat`);
          
          // Leave the room
          socket.leave(`${userId}-${role}`);
        } catch (error) {
          //console.error(`Error setting user status to offline: ${error.message}`);
        }
      }
    });
    
    // Inside your io.on('connection', socket => { }) block

    // Handle typing event
    socket.on('typing', ({ fromUserId, toUserId, sender_name, role }) => {
      // Get the recipient's socket id
      const recipientSocketId = onlineUsers.get(`${toUserId}-${role === 'Owner' ? 'User' : 'Owner'}`);

      if (recipientSocketId) {
        // Emit the typing event to the recipient
        io.to(recipientSocketId).emit('userTyping', { fromUserId, sender_name });
      }
    });

    // Handle stopTyping event
    socket.on('stopTyping', ({ fromUserId, toUserId, role }) => {
      const recipientSocketId = onlineUsers.get(`${toUserId}-${role === 'Owner' ? 'User' : 'Owner'}`);

      if (recipientSocketId) {
        // Emit the stopTyping event to the recipient
        io.to(recipientSocketId).emit('userStoppedTyping', { fromUserId });
      }
    });



  // Handle user disconnecting
  socket.on('disconnect', () => {
    // Check if the user is in the onlineUsers map
    const userIdRoleKey = Array.from(onlineUsers.entries())
      .find(([key, id]) => id === socket.id)?.[0];

    if (userIdRoleKey) {
      const [userId, role] = userIdRoleKey.split('-');
      onlineUsers.delete(userIdRoleKey);
      
      // Broadcast user status update to all clients
      io.emit('userStatusUpdate', { userId, role, status: 'offline' });

      //console.log(`User ${userId} with role ${role} disconnected from socket`);
    }
  })

  // Delete Chat
  // socket.on('deleteChat', async ({ userId, receiverId }) => {
  //   try {
  //     const chatDeleted = await deleteChatFromDB(userId, receiverId); // Function to delete chat messages from the database
  //     //console.log(`Chat history between User ${userId} and Receiver ${receiverId} deleted.`);
  //     // Notify the sender about successful deletion
  //     socket.emit('chatDeleted', chatDeleted);
     
  //     // Optionally notify the other user
  //     const recipientSocketId = onlineUsers.get(`${receiverId}-${socket.role === 'Owner' ? 'User' : 'Owner'}`);
  //     if (recipientSocketId) {
  //       io.to(recipientSocketId).emit('chatDeletedNotification', { userId });
  //     }
  //   } catch (error) {
  //     //console.log('Error deleting chat history:', error);
  //     socket.emit('chatDeleted', { success: false, error: error.message });
  //   }
  // });

  // Delete Chat
  socket.on('deleteChat', async ({ userId, receiverIdS }) => {
   // Convert comma-separated receiver IDs to an array
   const receiverIds = receiverIdS.split(',').map(id => id.trim()).filter(Boolean);

   console.log("receiverIds---->", receiverIds);
  if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
    socket.emit('chatDeleted', { success: false, error: 'Invalid receiverIds format. Must be a non-empty array.' });
    return;
  }
  
  try {
    const chatDeleted = await deleteChatFromDB(userId, receiverIds); // Updated to handle multiple receivers
    //console.log(`Chat history for User ${userId} with Receivers [${receiverIds.join(', ')}] deleted.`);
    socket.emit('chatDeleted', { receivers: receiverIds });
  } catch (error) {
    //console.log('Error deleting chat history:', error);
    socket.emit('chatDeleted', {error: error.message });
  }
});


  // Delete specific chats or entire chat history
socket.on('deleteChatMessages', async ({ userId, receiverId, messageIds }) => {
  try {
      // Pass the messageIds to the database function
      const chatDeleted = await deleteChatMessagesFromDB(userId, receiverId, messageIds);
      
      ////console.log( messageIds  ? `Selected messages deleted between User ${userId} and Receiver ${receiverId}.` : `Chat history between User ${userId} and Receiver ${receiverId} deleted.` );

      // Notify the sender about successful deletion
      socket.emit('chatMessagesDeleted', chatDeleted);

      // Optionally notify the other user
      const recipientSocketId = onlineUsers.get(`${receiverId}-${socket.role === 'Owner' ? 'User' : 'Owner'}`);
      if (recipientSocketId) {
          io.to(recipientSocketId).emit('chatMessagesDeletedNotification', { userId, messageIds });
      }
  } catch (error) {
      ////console.log('Error deleting chat history:', error);
      socket.emit('chatMessagesDeleted', { success: false, error: error.message });
  }
});




  });
}
