import connection from '../config.js';
import moment from 'moment-timezone';
import { sendSinglePushNotification } from '../middleware/apihelper.js';
moment.tz.setDefault('Asia/Hong_Kong');

// Save message to the database
const saveMessageToDB = async (fromUserId, toUserId, message, mimetype, role, filename, filePath) => {
    const con = await connection();
    try {
        await con.beginTransaction();

        // Determine owner_id and user_id based on role
        let owner_id, user_id;
        if (role === 'Owner') {
            owner_id = fromUserId;
            user_id = toUserId;
        } else {
            owner_id = toUserId;
            user_id = fromUserId;
        }
        console.log("owner_id-->",owner_id)
        console.log("user_id-->",user_id)
        let deleted_status = user_id + "," + owner_id; // Concatenating user_id and owner_id with a comma
        console.log("deleted_status -->", deleted_status); //

        // Insert message into messages table
        const query = `
        INSERT INTO messages (user_from, user_to, message,filename, filePath, mimetype, role,deleted_status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?,?, NOW());
        `;

        await con.query(query, [fromUserId, toUserId, message, filename, filePath, mimetype,role,deleted_status]);
        
        // Fetch user details
        const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [user_id]);
        const userName = existingUser.first_name + ' ' + existingUser.last_name;
        // Fetch user details
        const [[existingOwner]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [owner_id]);
        const ownerName = existingOwner.first_name + ' ' + existingOwner.last_name;

        await con.commit();

        if (role === 'Owner') {
           sendSinglePushNotification({user_id: user_id,title: `Message from ${ownerName}`, body: message,});
        } else {
           sendSinglePushNotification({ user_id: owner_id, title: `Message from ${userName}`, body: message, }); 
        }
        
    } catch (error) {
        await con.rollback();
        // console.log("Failed to send message --> ", error);
        throw error;
    } finally {
        con.release();
    }
};

// Get chat history based on role (User or Owner)
const getChatHistory = async (userId, role, receiverId) => {
    var profileBaseUrl = `http://${process.env.Host}/images/profiles/`;
    var BaseUrl = `http://${process.env.Host}/images/chat_img_vid/`;
    const con = await connection();
   const reverse_role = (role === 'User')? 'Owner':'User';
  // // console.log("reverse_role--->",reverse_role);
    try {
        await con.beginTransaction();
  
        const query = `
            SELECT m.*, u1.profile_image AS sender_image, u2.profile_image AS receiver_image
            FROM messages m
            LEFT JOIN tbl_user u1 ON m.user_from = u1.user_id
            LEFT JOIN tbl_user u2 ON m.user_to = u2.user_id
            WHERE FIND_IN_SET(?, m.deleted_status) AND ((m.user_from = ? AND m.user_to = ?) OR (m.user_from = ? AND m.user_to = ?))
            ORDER BY m.timestamp ASC`;

        // const query = `
        // SELECT m.*, u1.profile_image AS sender_image, u2.profile_image AS receiver_image
        // FROM messages m
        // LEFT JOIN tbl_user u1 ON m.user_from = u1.user_id
        // LEFT JOIN tbl_user u2 ON m.user_to = u2.user_id
        // WHERE ((m.user_from = ? AND m.user_to = ?) OR (m.user_from = ? AND m.user_to = ?))
        // AND ((m.user_from = ? AND m.role = ?) OR (m.user_to = ? AND m.role = ?))
        // ORDER BY m.timestamp ASC`;

        const [rows] = await con.query(query, [userId,userId, receiverId, receiverId, userId]);
        console.log("Executed Query -->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>:", con.format(query, [userId, receiverId, receiverId, userId])); // Properly formatted query

        console.log("chat History-->", rows);
        // Update read status
        await con.query('UPDATE messages SET readStatus = ? WHERE user_from =? AND user_to = ?', ['true', receiverId, userId]);
        // Loop through each message and append URLs
        rows.forEach(row => {
            row.sender_image = row.sender_image ? `${profileBaseUrl}${row.sender_image}` : '';
            row.receiver_image = row.receiver_image ? `${profileBaseUrl}${row.receiver_image}` : '';
            row.filename = row.filename ? `${BaseUrl}${row.filename}` : '';
        });

        await con.commit();
        console.log("chat History-->", rows);
        return rows;

    } catch (error) {
        await con.rollback();
        // console.log("Failed to fetch chat history:", error);
        throw error;
    } finally {
        con.release();
    }
};

// Upload file handler
const uploadFile = async (req, res) => {
    const con = await connection();

    try {
        if (req.file) {
            const { filename, path: filePath, mimetype } = req.file;
          //  // console.log("uploadinchat-->",req.file)
            res.json({ result: "success", filename, filePath, mimetype });
        } else {
            res.json({ result: "unsuccess"});
        }
    } catch (error) {
        res.json({result: "unsuccess" });
    } finally {
        con.release();
    }
};

const chatList = async (userId, role) => {
    const con = await connection();
    const BASEURL = `http://${process.env.Host}/images/profiles/`;
    
    try {
        await con.beginTransaction();

        // Determine the opposite role
        const receiverRole = role === 'User' ? 'Owner' : 'User';
        console.log("userId-->",userId)
        console.log("role-->",role)
        console.log("receiverRole-->",receiverRole)

        // Unified query for both roles with role-based filtering
        // const query = `
        //     SELECT 
        //         CASE 
        //             WHEN m.user_from = ? THEN m.user_to 
        //             ELSE m.user_from 
        //         END AS receiver_id,
        //         MAX(m.timeorder) AS timeorder,
        //         u.first_name AS first_name,
        //         u.last_name AS last_name,
        //         u.country_code AS country_code,
        //         u.contact AS contact,
        //         u.profile_image AS receiver_image,
        //         ? AS receiver_role,
        //         MAX(m.timestamp) AS timestamp
        //     FROM messages m
        //     LEFT JOIN tbl_user u ON u.user_id = CASE 
        //         WHEN m.user_from = ? THEN m.user_to 
        //         ELSE m.user_from 
        //     END
        //     WHERE 
        //         (m.user_from = ? OR m.user_to = ?) 
        //         AND (
        //             (m.user_from NOT IN (SELECT user_id FROM tbl_user WHERE deleted = 'Yes'))
        //             AND (m.user_to NOT IN (SELECT user_id FROM tbl_user WHERE deleted = 'Yes'))
        //         )
        //         AND u.role = ? 
        //     GROUP BY receiver_id, u.first_name, u.last_name, u.country_code, u.contact, u.profile_image
        //     ORDER BY timestamp DESC`;
        const query = `
        SELECT 
            CASE 
                WHEN m.user_from = ? THEN m.user_to 
                ELSE m.user_from 
            END AS receiver_id,
            MAX(m.timeorder) AS timeorder,
            u.first_name AS first_name,
            u.last_name AS last_name,
            u.country_code AS country_code,
            u.contact AS contact,
            u.profile_image AS receiver_image,
            ? AS receiver_role,
            MAX(m.timestamp) AS timestamp
        FROM messages m
        LEFT JOIN tbl_user u ON u.user_id = CASE 
            WHEN m.user_from = ? THEN m.user_to 
            ELSE m.user_from 
        END
        WHERE FIND_IN_SET(?, m.deleted_status)
            AND (m.user_from = ? OR m.user_to = ?)
            AND (
                (m.user_from NOT IN (SELECT user_id FROM tbl_user WHERE deleted = 'Yes'))
                AND (m.user_to NOT IN (SELECT user_id FROM tbl_user WHERE deleted = 'Yes'))
            )
        GROUP BY receiver_id, u.first_name, u.last_name, u.country_code, u.contact, u.profile_image
        ORDER BY timestamp DESC`;
    
        const [rows] = await con.query(query, [userId, receiverRole, userId, userId, userId, userId]);
        console.log("Executed Query:", con.format(query, [userId, receiverRole, userId, userId, userId, userId]));
        console.log("Chat History:", rows);
        // Process chat list and fetch unread count
        const chatList = await Promise.all(rows.map(async (chat) => {
            // Query for unread messages count
            const unreadCountQuery = `
                SELECT COUNT(*) AS unreadCount 
                FROM messages 
                WHERE user_from = ? AND user_to = ? AND readStatus = 'false'`;

            const [unreadCountResult] = await con.query(unreadCountQuery, [chat.receiver_id, userId]);

            return {
                receiver_id: chat.receiver_id,
                receiver_name: `${chat.first_name} ${chat.last_name}`,
                receiver_image: chat.receiver_image ? BASEURL + chat.receiver_image : "",
                receiver_role: chat.receiver_role,
                country_code: chat.country_code,
                contact: chat.contact,
                timestamp: chat.timestamp,
                timeorder: chat.timeorder,
                unreadCount: unreadCountResult[0].unreadCount || 0, // Default to 0 if no unread messages
            };
        }));
       console.log("chatList--->",chatList)
        await con.commit();
        return chatList;
    } catch (error) {
        await con.rollback();
        throw error;
    } finally {
        con.release();
    }
};


// const deleteChatFromDB = async(userId, receiverId) => {
//     const con = await connection();
//     try {
//       await con.beginTransaction();
//       // Replace with your actual query logic
//       await con.query('DELETE FROM messages WHERE (user_from = ? AND user_to = ?) OR (user_from = ? AND user_to = ?)', [userId, receiverId, receiverId, userId]);
//       await con.commit();
//     } catch (error) {
//       await con.rollback();
//       throw new Error('Failed to delete chat messages');
//     } finally {
//         con.release();
//     }
//   }

// const deleteChatFromDB = async (userId, receiverIds) => {
//     if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
//       throw new Error('Invalid receiverIds input. Must be a non-empty array.');
//     }
  
//     const con = await connection();
//     try {
//       console.log("userId---->", userId);
//       console.log("receiverIds---->", receiverIds);
  
//       await con.beginTransaction();
  
//       const placeholders = receiverIds
//         .map(() => '(user_from = ? AND user_to = ?) OR (user_from = ? AND user_to = ?)')
//         .join(' OR ');
  
//       const values = receiverIds.flatMap(receiverId => [userId, receiverId, receiverId, userId]);
  
//       console.log("placeholders---->", placeholders);
//       console.log("values---->", values);
  
//       const query = `DELETE FROM messages WHERE ${placeholders}`;
//       const update = await con.query(query, values);
  
//       console.log("update---->", update);
  
//       await con.commit();
//       return { success: true, deletedReceivers: receiverIds };
//     } catch (error) {
//       await con.rollback();
//       console.error('Error deleting chat messages:', error);
//       throw new Error('Failed to delete chat messages');
//     } finally {
//       con.release();
//     }
//   };
  
const deleteChatFromDB = async (userId, receiverIds) => {
    if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
        throw new Error('Invalid receiverIds input. Must be a non-empty array.');
    }

    const con = await connection();
    try {
        console.log("userId---->", userId);
        console.log("receiverIds---->", receiverIds);

        await con.beginTransaction();

        const placeholders = receiverIds
            .map(() => '(user_from = ? AND user_to = ?) OR (user_from = ? AND user_to = ?)')
            .join(' OR ');

        const values = receiverIds.flatMap(receiverId => [userId, receiverId, receiverId, userId]);

        // console.log("placeholders---->", placeholders);
        // console.log("values---->", values);

        const query = `
            UPDATE messages 
            SET deleted_status = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', deleted_status, ','), CONCAT(',', ?, ','), ','))
            WHERE ${placeholders}`;

        // Add `userId` as the first parameter to handle the `REPLACE` function
        const update = await con.query(query, [userId, ...values]);

        console.log("update---->", update);

        await con.commit();
        return { success: true, deletedReceivers: receiverIds };
    } catch (error) {
        await con.rollback();
        console.error('Error deleting chat messages:', error);
        throw new Error('Failed to delete chat messages');
    } finally {
        con.release();
    }
};


  const deleteChatMessagesFromDB = async (userId, receiverId, messageIds = null) => {
    const con = await connection();
    try {
        await con.beginTransaction();

        if (messageIds && messageIds.length > 0) {
            // Delete specific messages by their IDs
            const placeholders = messageIds.map(() => '?').join(',');
            await con.query(
                `DELETE FROM messages WHERE id IN (${placeholders}) AND ((user_from = ? AND user_to = ?) OR (user_from = ? AND user_to = ?))`,
                [...messageIds, userId, receiverId, receiverId, userId]
            );
        } else {
            // Delete the entire chat history
            await con.query(
                `DELETE FROM messages WHERE (user_from = ? AND user_to = ?) OR (user_from = ? AND user_to = ?)`,
                [userId, receiverId, receiverId, userId]
            );
        }

        await con.commit();
        return { success: true, message: messageIds ? 'Selected messages deleted' : 'Chat history deleted' };
    } catch (error) {
        await con.rollback();
        throw new Error('Failed to delete chat messages');
    } finally {
        con.release();
    }
};



export { saveMessageToDB, getChatHistory, uploadFile, chatList ,deleteChatMessagesFromDB,deleteChatFromDB};
