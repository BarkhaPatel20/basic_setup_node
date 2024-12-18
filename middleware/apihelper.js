import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import connection from '../config.js';
import jsPDF from 'jspdf';

import crypto from 'crypto';
const con = await connection();
 
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
// Read the service account key JSON file
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve('public/assets/carrentalfirebase.json'), 'utf8'));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
 // databaseURL: 'https://carrental-419d5-default-rtdb.firebaseio.com', // Your Firebase Realtime Database URL
});
////console.log(admin);

//------------------ hash password and comapare again  ------------------
const hashPassword = function (password) {    

    const salt = bcrypt.genSaltSync(); 
	return bcrypt.hashSync(password, salt); 
}

const comparePassword = function (raw,hash) {    
 
    return bcrypt.compareSync(raw, hash)
}

function encrypt(text) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'kilvishSecureKey12345678901234si';
    
    // Check if the key length is valid
    if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
        throw new Error('Encryption key must be 32 bytes long.');
    }

    const IV_LENGTH = 16; // For AES, this is always 16
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Returning IV and encrypted text
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt Function
function decrypt(text) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'kilvishSecureKey12345678901234si';
  const IV_LENGTH = 16; // For AES, this is always 16

  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function encrypt64(text) {
  const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_SECRET_KEY, 'hex');

  // Check if the key length is valid
  if (ENCRYPTION_KEY.length !== 32) {
      throw new Error('Encryption key must be 32 bytes long.');
  }

  const IV_LENGTH = 16; // For AES, this is always 16
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Returning IV and encrypted text
  return iv.toString('hex') + ':' + encrypted;
}


function decrypt64(text) {
  const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_SECRET_KEY, 'hex');
  const IV_LENGTH = 16; // For AES, this is always 16

  const parts = text.split(':');
  if (parts.length !== 2) {
      throw new Error('Invalid input format for decryption');
  }

  const [iv, encrypted] = parts;
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
  
  let decrypted;
  try {
      decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
  } catch (err) {
      throw new Error('Decryption failed: ' + err.message);
  }

  return decrypted;
}

 //----------------------- send Doc Notification start ------------------------------- 


 const senddocNotificationUser = async function (recipients, message, subject,attachments) { 
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


    const con = await connection();
    const [rows] = await con.query('SELECT * FROM tbl_important_credentials');
  
    const AppEmail = rows[0].email_app_email;
    const AppPassword = rows[0].email_app_password;
    const emailHost = rows[0].email_smtp_host
   
     var transporter = nodemailer.createTransport({
       service: emailHost,
       auth: {
         user: AppEmail,
         pass: AppPassword
       }
     });
   
     const mailOptions = {
       from: AppEmail,
       to: recipients.join(', '), // Join all recipients with a comma
       subject: subject,
       html:  `
       <html>
       <head>
           <style>
               body {
                   font-family: 'Arial', sans-serif;
               }
               .container {
                   max-width: 600px;
                   margin: 0 auto;
                   padding: 20px;
                   border: 1px solid #ddd;
                   border-radius: 5px;
               }
               .header {
                   text-align: center;
                   background-color: #f5f5f5;
                   padding: 10px;
                   border-radius: 5px 5px 0 0;
               }
               .content {
                   padding: 20px;
               }
           </style>
       </head>
       <body>
           <div class="container">
               <div class="header">
                   <h2>Car Rental Notification  </h2>
               </div>
               <div class="content">
                   <h3>Hello Sir/Madam,</h3>
                 
                   <p>${message}</p>
                 
                   <p>Best regards,</p>
                   <p>The Car Rental Support Team</p>
               </div>
           </div>
       </body>
       </html>
   `,
   attachments: attachments
     };
   
     try {
       await transporter.sendMail(mailOptions);
       //console.log("Email sent successfully.");
       return true; // Email sent successfully
     } catch (error) {
       console.error(error);
       throw error;
       //return false; // Email sending failed
     }
   };
  
//----------------------- Send Push Notification ------------------------- 

const sendSinglePushNotification1 = async (userID) => {
  const con = await connection();

  try {
    // Retrieve FCM token for the user
    const [ownerFCMTokens] = await con.query('SELECT device_token FROM tbl_user WHERE user_id = ?', [userID]);

    if (!ownerFCMTokens || ownerFCMTokens.length === 0) {
      //console.log("Owner FCM token not found");
      return;
    }

    // Extract the first token from the array
    const token = ownerFCMTokens[0].device_token;
    //console.log("Sending push notification to token:", token);

    // Construct the notification message
    const message = {
      notification: {
        title: 'Hello, User!',
        body: 'You have updated your profile details.',
      },
      token: token, // Single FCM registration token
    };

    // Send the notification
    const response = await admin.messaging().send(message);

    // Log success response
    //console.log('Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  } finally {
    if (con) {
      con.release();
    }
  }
};

const sendSinglePushNotification = async ({ user_id, title, body }) => {
  const con = await connection();

  try {
    // Retrieve FCM token for the user
    const [userFCMTokens] = await con.query(
      'SELECT device_token FROM tbl_user WHERE user_id = ?',
      [user_id]
    );

    if (!userFCMTokens || userFCMTokens.length === 0 || !userFCMTokens[0].device_token) {
      console.log("FCM token not found for user ID:", user_id);
      return;
    }

    const token = userFCMTokens[0].device_token;

    // Construct the notification message
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token, // Single FCM registration token
    };

    // Send the notification
    const response = await admin.messaging().send(message);

    console.log('Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  } finally {
    if (con) {
      con.release();
    }
  }
};

const sendPushNotifications = async (notifications) => {
  const con = await connection();
//console.log('notifications',notifications);
  try {
    const promises = notifications.map(async ({ user_id, title, body }) => {
      try {
        const [ownerFCMTokens] = await con.query('SELECT device_token FROM tbl_user WHERE user_id = ?', [user_id]);

        if (!ownerFCMTokens || ownerFCMTokens.length === 0) {
          console.log(`No FCM token found for userID: ${user_id}`);
          return;
        }

        const token = ownerFCMTokens[0].device_token;

        const message = {
          notification: {
            title: title,
            body: body,
          },
          token: token,
        };

        const response = await admin.messaging().send(message);
        console.log(`Notification sent successfully to userID: ${user_id}`, response);
      } catch (error) {
        console.error(`Error sending notification to userID: ${user_id}`, error);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error processing notifications:', error);
  } finally {
    if (con) {
      con.release();
    }
  }
};


//------------------------------------------------------------------------------------------

export { hashPassword , comparePassword ,encrypt,decrypt, sendSinglePushNotification,sendPushNotifications, senddocNotificationUser ,encrypt64 ,decrypt64 };

