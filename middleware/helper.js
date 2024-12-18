import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import connection from '../config.js';
import jsPDF from 'jspdf';

import crypto from 'crypto';
const con = await connection();

import admin from 'firebase-admin';







//======================================================




//import serviceAccount from '../assets/myhwfirebase.json';

// import serviceAccount from '../public/assets/myhwfirebase.json' assert { type: 'json' };

// admin.initializeApp({
//    credential: admin.credential.cert(serviceAccount),
//    databaseURL: 'https://myhwcollection-3ac70.firebaseio.com', // Replace with your Firebase project URL
//  });
 


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



  

//------------------ Hash Password end ...............................


//-----------------------  send Welcome Msg ---------------------------  

const sendWelcomeMsg = function (email) {
  //process.env.NODE_TLS_REJECT_UNAUTHORIZED='0'

var transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
   user: 'vasubirla@gmail.com',
   pass: 'phjwptaxdnaunqol'
 }
});

var mailOptions = {
  from: 'vasubirla@gmail.com',
  to: email,
  subject: 'Welcome to Credx Invoice Management System',
  html: `
      <html>
      <head>
          <style>
              /* Add your CSS styles here */
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f5f5f5;
              }
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #ffffff;
                  border: 1px solid #e0e0e0;
                  border-radius: 5px;
              }
              h1 {
                  color: #333;
              }
              p {
                  font-size: 16px;
                  line-height: 1.5;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>Welcome to Credx Invoice Management System</h1>
              <p>Dear User,</p>
              <p>We are excited to welcome you to our Invoice Management System. You are now part of a community that simplifies invoice management.</p>
              <p>With our system, you can easily create, manage, and track your invoices, ensuring smooth financial transactions.</p>
              <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
              <p>Thank you for choosing Credx!</p>
              <p>Best regards,</p>
              <p>Your Credx Team</p>
              <p>Kilvish Birla</p>
          </div>
      </body>
      </html>
  `
};

transporter.sendMail(mailOptions, function(error, info){  //console.log("emailllll sent...............")

 if (error) {
  //console.log("error in sending mail")
  //res.json({ result: "failed"});     
 } else {
  //console.log("emailllll sent...............")
  //res.json({ result: "success","user_id":user.id,otp:otp}); 
 }
}); 

}








//----------------------- send OTP Helper start ------------------------------- 
const sendMailOTP = function (email,otp,user) {
    //process.env.NODE_TLS_REJECT_UNAUTHORIZED='0'
 
 var transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
     user: 'vasubirla@gmail.com',
     pass: 'phjwptaxdnaunqol'
   }
 });
 
 var mailOptions = {
  from: 'vasubirla@gmail.com',
  to: email,
  subject: 'OTP to Reset Password - Car Rental',
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <h2 style="color: #333333;">Car Rental - Password Reset OTP</h2>
      <p style="color: #555555;">Dear User,</p>
      <p style="color: #555555;">You have requested to reset your password on Car Rental. Please use the following OTP to complete the process:</p>
      <div style="background-color: #ffffff; padding: 10px; border: 1px solid #dddddd; border-radius: 5px; margin-top: 15px;">
        <h3 style="color: #333333;">Your One Time Password (OTP): <span style="color: #007BFF;">${otp}</span></h3>
      </div>
      <p style="color: #555555; margin-top: 15px;">If you did not request a password reset, please ignore this email. The OTP is valid for a short period of time.</p>
      <p style="color: #555555;">Best Regards,<br/>Car Rental Team</p>
    </div>
  `
};

 
 transporter.sendMail(mailOptions, function(error, info){  
  
   if (error) {
    //console.log("error in sending mail")
    //res.json({ result: "failed"});     
   } else {
    //console.log("emailllll sent...............")
    //res.json({ result: "success","user_id":user.id,otp:otp}); 
   }
 }); 
 
 }




 //----------------------- send OTP Helper start ------------------------------- 


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
   


 //------------------- response to query ------------------ 

 
 const responsetoQuery = function (email, message, subject) {
  const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: 'vasubirla@gmail.com',
          pass: 'phjwptaxdnaunqol'
      }
  });

  const mailOptions = {
      from: 'vasubirla@gmail.com',
      to: email,
      subject: subject,
      html: `
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
                      <h2>Car Rental Customer Support</h2>
                  </div>
                  <div class="content">
                      <h3>Hello Sir/Madam,</h3>
                      <p>We have reviewed your query:</p>
                      <p>${message}</p>
                      <p>Our team is working to resolve your concerns. Thank you for reaching out to us.</p>
                      <p>Best regards,</p>
                      <p>The Car Rental Support Team</p>
                  </div>
              </div>
          </body>
          </html>
      `
  };

  transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
          console.error(error);
          return false;
      } else {
          //console.log("Email sent successfully");
          return true;
      }
  });
};


 //------------------- response to query ------------------ 

 
//  const sendNotification = function (email, message, subject) {
//   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//   return new Promise((resolve, reject) => {
//     var transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: 'vasubirla@gmail.com',
//         pass: 'phjwptaxdnaunqol'
//       }
//     });

//     const mailOptions = {
//       from: 'vasubirla@gmail.com',
//       to: email,
//       subject: subject,
//       html: "<h3>Notification From MYHW App :</h1>" + "<h3>" + message + "</h1>"
//     };

//     transporter.sendMail(mailOptions, function (error, info) {
//       if (error) {
//         //console.log(error);
//         reject(error); // Email sending failed, reject the Promise
//       } else {
//         //console.log("Email sent successfully.");
//         resolve(email); // Email sent successfully, resolve the Promise
//       }
//     });
//   });
// };


const sendNotification = async function (recipients, message, subject) {  //console.log("in helper->> ",recipients)
 // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vasubirla@gmail.com',
      pass: 'phjwptaxdnaunqol'
    }
  });

  const mailOptions = {
    from: 'vasubirla@gmail.com',
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
`
  };

  try {
    await transporter.sendMail(mailOptions);
    //console.log("Email sent successfully.");
    return true; // Email sent successfully
  } catch (error) {
    console.error(error);
    return false; // Email sending failed
  }
};


//----------------------- Send Push Notification ------------------------- 



const sendPushNotification = async (ownerID, deviceToken, fromUser_id) => {
  const con = await connection();

  try {
    // Retrieve FCM tokens associated with the owner from tbl_fcm
    const [ownerFCMTokens] = await con.query('SELECT device_token FROM tbl_fcm WHERE user_id = ?', [ownerID]);

    if (!ownerFCMTokens || ownerFCMTokens.length === 0) {
      //console.log("Owner FCM tokens not found");
      return;
    }

    // Sending push notifications to ownerFCMTokens
    const title = 'New Property Interest';
    const body = `User with ID ${fromUser_id} is interested in your property!`;

    // Simulate sending push notifications to ownerFCMTokens
    //console.log("Sending push notifications to ownerFCMTokens:", ownerFCMTokens);

    // Replace the following with your actual push notification logic using Firebase Admin SDK
    const notificationPayload = {
      notification: {
        title: title,
        body: body,
      },
    };

    const tokens = ownerFCMTokens.map(token => token.device_token);
    const response = await admin.messaging().sendToDevice(tokens, notificationPayload);

    //console.log('Successfully sent push notification:', response);

  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  } finally {
    if (con) {
      con.release();
    }
  }
};

//------------------------------------------------------------------------------------------


const sendInvoice1 = async function (email, pdfData) {


  
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vasubirla@gmail.com',
    pass: 'phjwptaxdnaunqol'
  }
 });
 
 var mailOptions = {
   from: 'vasubirla@gmail.com',
   to: email,
   subject: 'Welcome to Credx Invoice Management System',
   html: `
       <html>
       <head>
           <style>
               /* Add your CSS styles here */
               body {
                   font-family: Arial, sans-serif;
                   background-color: #f5f5f5;
               }
               .container {
                   max-width: 600px;
                   margin: 0 auto;
                   padding: 20px;
                   background-color: #ffffff;
                   border: 1px solid #e0e0e0;
                   border-radius: 5px;
               }
               h1 {
                   color: #333;
               }
               p {
                   font-size: 16px;
                   line-height: 1.5;
                   color: #666;
               }
           </style>
       </head>
       <body>
           <div class="container">
               <h1> invoice From Credx Invoice Management System</h1>
               <p>Dear User,</p>
               <p>We Have sent the Invoice Regarding your purchase .</p>
               <p>With our system, you can easily create, manage, and track your invoices, ensuring smooth financial transactions.</p>
               <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
               <p>Thank you for choosing Credx!</p>
               <p>Best regards,</p>
               <p>Your Credx Team</p>
               <p>Kilvish Birla</p>
           </div>
       </body>
       </html>
   `,
   attachments: [
    {
        filename: 'invoice.pdf',
        content: pdfData,
        encoding: 'base64'
    }
]
 };
 
 transporter.sendMail(mailOptions, function(error, info){  //console.log("emailllll sent...............")
 
  if (error) {
      //console.log("error in sending mail")
   //res.json({ result: "failed"});     
  } else {
    
   //console.log("emailllll sent...............")
   //res.json({ result: "success","user_id":user.id,otp:otp}); 
  }
 }); 

};



const sendAgreement = async function (agreementNumber,email, pdfData, agreementDetails) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'vasubirla@gmail.com',
                pass: 'phjwptaxdnaunqol'
            }
        });

        const { agreement, owner, tenant } = agreementDetails;

        const mailOptions = {
            from: 'vasubirla@gmail.com',
            to: email,
            subject: 'Rent Agreement from Car Rental',
            html: `
                <html>
                <head>
                    <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f5f5f5;
                    }
            
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border: 1px solid #e0e0e0;
                        border-radius: 5px;
                    }
            
                    h1 {
                        color: #333;
                    }
            
                    p {
                        font-size: 16px;
                        line-height: 1.5;
                        color: #666;
                    }
            
                    .signature-instructions {
                        margin-top: 20px;
                    }
            
                    .signature-instructions p {
                        color: #333;
                        font-weight: bold;
                    }
            
                    .button-container {
                        margin-top: 20px;
                        display: flex;
                        align-items: center;
                    }
            
                    .green-button {
                        padding: 10px 20px;
                        background-color: #f8bdbd; /* Green color */
                        color: #fff;
                        text-decoration: none;
                        border-radius: 5px;
                        transition: background-color 0.3s ease, color 0.3s ease;
                        font-size: large;
                    }
                    .green-button a {
                        color: #fff !important; 
                        text-decoration: none;
                    }
            
                    .green-button:hover {
                        background-color: #45a049; /* Darker green on hover */
                        color: #fff;
                    }
            
                    .gif-container {
                        margin-left: 10px;
                        cursor: pointer;
                    }
            
                    .sign-gif {
                        max-width: 50px;
                        height: auto;
                        display: block;
                    }
                    </style>
                </head>
                <body>
 <div class="container">
 <h1>Agreement From Car Rental's Property Owner</h1>
 <p>Dear ${tenant},</p>
 <p>${owner} has sent you the following agreement:</p>
 <span> Agreement Number - <span> <h3 style="background-color: yellow; display: inline-block;"> ${agreementNumber} </h3>

 <div class="signature-instructions">
     <p>Please review the agreement and provide your electronic signature:</p>
     <div class="button-container">
         <a class="green-button" href="http://${process.env.Host1}/agreements/${agreementNumber}" target="_blank">Sign Agreement</a>
         <div class="gif-container">
             <a href="http://${process.env.Host1}/agreements/${agreementNumber}" target="_blank">
                 <img class="sign-gif" src="http://${process.env.Host1}/images/sign.gif" alt="Sign GIF">
             </a>
         </div>
     </div>
     <p>Follow the instructions to add your electronic signature.</p>
     <span> Use DigitalPad Pen on singature area or you can use Mouse or finger on Mobile Device </span>
 </div>
 <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
 <p>Thank you for choosing Car Rental!</p>
 <p>Best regards,</p>
 <p>Your Car Rental Team</p>
 <p>Kilvish Birla</p>
              
    </div>
                </body>
                </html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        //console.log("Email sent successfully:", info.response);
        return info;
    } catch (error) {
        //console.log("Error in sending mail:", error);
        throw error;
    }
};




//---------Send Rent Agreement to Owner -> 

const sendAgreementToOwner = async function (ownerEmail, agreementNumber, agreementDetails) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'vasubirla@gmail.com',
                pass: 'phjwptaxdnaunqol'
            }
        });

        const {  owner, tenant } = agreementDetails;

        const mailOptions = {
            from: 'vasubirla@gmail.com',
            to: ownerEmail,
            subject: 'About your Rent Agreement from Car Rental',
            html: `
                <html>
                <head>
                    <!-- Add your styles here -->
                    <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f5f5f5;
                    }
            
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border: 1px solid #e0e0e0;
                        border-radius: 5px;
                    }
            
                    h1 {
                        color: #333;
                    }
            
                    p {
                        font-size: 16px;
                        line-height: 1.5;
                        color: #666;
                    }
            
                    .signature-instructions {
                        margin-top: 20px;
                    }
            
                    .signature-instructions p {
                        color: #333;
                        font-weight: bold;
                    }
            
                    .button-container {
                        margin-top: 20px;
                        display: flex;
                        align-items: center;
                    }
            
                    .green-button {
                        padding: 10px 20px;
                        background-color: #f8bdbd; /* Green color */
                        color: #fff;
                        text-decoration: none;
                        border-radius: 5px;
                        transition: background-color 0.3s ease, color 0.3s ease;
                        font-size: large;
                    }
                    .green-button a {
                        color: #fff !important; 
                        text-decoration: none;
                    }
            
                    .green-button:hover {
                        background-color: #45a049; /* Darker green on hover */
                        color: #fff;
                    }
            
                    .gif-container {
                        margin-left: 10px;
                        cursor: pointer;
                    }
            
                    .sign-gif {
                        max-width: 50px;
                        height: auto;
                        display: block;
                    }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Agreement  Sent to ${owner}</h1>
                        <span> Agreement Number - <span> <h3 style="background-color: yellow; display: inline-block;"> ${agreementNumber} </h3>
                        <p>Dear ${owner},</p>
                        <p>You have sent the following agreement to ${tenant}:</p>
                       
                        <div class="signature-instructions">
                           
                            <div class="button-container">
                                <a class="green-button" href="http://${process.env.Host1}/owneragreements/${agreementNumber}" target="_blank">View Agreement</a>
                            </div>
                            <p>Once ${tenant} has signed, you will be notified.</p>
                        </div>
                        <p>If you have any questions or need assistance, please contact our support team.</p>
                        <p>Thank you for using Car Rental!</p>
                        <p>Best regards,</p>
                        <p>Your Car Rental Team</p>
                        
                    </div>
                </body>
                </html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        //console.log("Email sent successfully:", info.response);
        return info;
    } catch (error) {
        //console.log("Error in sending mail:", error);
        throw error;
    }
};

  


const sendOTPFornewPass = async function (email,otp) {   




    const con = await connection();
    const [rows] = await con.query('SELECT * FROM tbl_important_credentials');
  
    const AppEmail = rows[0].email_app_email;
    const AppPassword = rows[0].email_app_password;
    const emailHost = rows[0].email_smtp_host
  
  
  try {
    var transporter = nodemailer.createTransport({
        service: emailHost,
        auth: {
            user: AppEmail,
            pass: AppPassword
        }
    });

    var mailOptions = {
      from: AppEmail,
      to: email,
      subject: 'Reset Password OTP (Car Rental)',
      html: `
          <html>
          <head>
              <style>
                  /* Add your CSS styles here */
                  body {
                      font-family: Arial, sans-serif;
                      background-color: #f5f5f5;
                  }
                  .container {
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                      background-color: #ffffff;
                      border: 1px solid #e0e0e0;
                      border-radius: 5px;
                  }
                  h1 {
                      color: #333;
                  }
                  p {
                      font-size: 16px;
                      line-height: 1.5;
                      color: #666;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <h1> Forgot Password Request Service </h1>
                  <p>Dear User,</p>
                  <h2>  ${otp} </h2> <p> is Your OTP to reset Password.</p>
                
                  <p>Thank you for choosing Car Rental!</p>
                  <p>Best regards,</p>
                  <p>Your Car Rental Team</p>
                  <p>Kilvish Birla</p>
              </div>
          </body>
          </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    //console.log("Email sent successfully:", info.response);
    return info;
} catch (error) {
    //console.log("Error in sending mail:", error);
    throw error;
}

}


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
            //console.log(`No FCM token found for userID: ${user_id}`);
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
          //console.log(`Notification sent successfully to userID: ${user_id}`, response);
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
  


export { hashPassword , comparePassword ,sendWelcomeMsg, sendMailOTP , 
  responsetoQuery, sendNotification , sendPushNotification, 
  sendAgreement, sendAgreementToOwner , sendOTPFornewPass ,senddocNotificationUser ,encrypt,decrypt ,
  encrypt64 ,decrypt64,sendSinglePushNotification,sendPushNotifications };

