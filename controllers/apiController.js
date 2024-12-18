import { sendTokenUser , sendTokenOwner } from '../utils/jwtToken.js';
import connection from '../config.js';
import axios from 'axios';
import {hashPassword, comparePassword} from '../middleware/helper.js'
import {encrypt64, sendSinglePushNotification, sendPushNotifications} from "../middleware/apihelper.js"
import moment from 'moment-timezone';
moment.tz.setDefault('Asia/Kolkata');
import paypal from '@paypal/checkout-server-sdk';
import dotenv from 'dotenv'
import { getPaypalClient } from '../middleware/paypal.js';
dotenv.config({path:"./config.env"});

const secretKey = process.env.ENCRYPTION_SECRET_KEY;

const cancellationPolicy = async (req, res, next) => {
  const con = await connection();
  const type = req.query.user_type;
  ////console.log(type);
  try {  
    const [result] = await con.query('SELECT * FROM tbl_cancellation_policy where policy_type = ?', [type]);
    if (result.length > 0) {
      const policyContent = result[0].policy;
        // Wrap the policy content in a container with 250% zoom level
        const zoomedContent = `<div style="zoom: 350%;">${policyContent}</div>`;
      
        // Return the HTML content with zoom applied as a response
        res.send(zoomedContent);
     // res.send(termsContent);
    } else { 
      res.status(200).send('Cancellation policy not found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};
//======================   Terms & Condition  Webview ================== 

const tandc = async (req, res, next) => {
  const con = await connection();
  const type = req.query.user_type;
  ////console.log(type);
  try {  
    const [result] = await con.query('SELECT * FROM tbl_tandc where tandc_type = ?', [type]);
    if (result.length > 0) {
      const termsContent = result[0].terms;


        // Wrap the terms content in a container with 250% zoom level
        const zoomedContent = `<div style="zoom: 350%;">${termsContent}</div>`;
      
        // Return the HTML content with zoom applied as a response
        res.send(zoomedContent);
     // res.send(termsContent);
    } else { 
      res.status(200).send('Terms and conditions not found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }


};

//========================== UserPrivacy and policy webview ============== 

const pandp = async (req, res, next) => {
  const con = await connection();
  const type = req.query.user_type;
  try {
    // Fetch the terms and conditions from the database
    const [result] = await con.query('SELECT * FROM tbl_pandp where policy_type = ?', [type]);

    if (result.length > 0) {
      const policyContent = result[0].policy;


      const zoomedContent = `<div style="zoom: 350%;">${policyContent}</div>`;
      
      // Return the HTML content with zoom applied as a response
      res.send(zoomedContent);

      // Return the HTML content as a response
      //res.send(policyContent);
    } else {
      // If terms and conditions not found, you can send an appropriate response
      res.status(200).send('User Privacy not found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};


//=======================  FAQ webview ========================= 
const faqs = async (req, res, next) => {
  const con = await connection();
  const type = req.body.user_type;
  try {
    // Fetch FAQs from the database
    const [results] = await con.query('SELECT * FROM tbl_faq WHERE faq_type=?',[type]);

    if (results.length > 0) {
      // Map through the results and return only 'quess' and 'answers'
      const formattedFaq = results.map(faq => ({
        quess: faq.faq,
        answers: faq.answer
      }));

      res.status(200).json(formattedFaq);
    } else {
      // If no FAQs found, send an appropriate response
      res.status(200).json({result:'No FAQs found'});
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({result:'Internal Server Error'});
  } finally {
    con.release();
  }
};

//=======================About Us=============
const aboutUs = async (req, res, next) => {
  const con = await connection();
  try {
    // Fetch the terms and conditions from the database
    const [result] = await con.query('SELECT * FROM tbl_aboutus');

    if (result.length > 0) {
      const aboutContent = result[0].about_us;


      const zoomedContent = `<div style="zoom: 350%;">${aboutContent}</div>`;
      
      // Return the HTML content with zoom applied as a response
      res.send(zoomedContent);

      // Return the HTML content as a response
      //res.send(aboutContent);
    } else {
      // If terms and conditions not found, you can send an appropriate response
      res.status(200).send('User Privacy not found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};


const sendOTP = async (req, res, next) => {
    //console.log("password Request for -> ", req.body);

    // Ensure you have a connection object properly set up before using it
    const con = await connection(); 
    const contact = req.body.contact;
    const country_code = req.body.country_code;
    const email = req.body.email;

    // Validate input
    if (!contact || !country_code) {
        return res.status(400).json({ result: "Contact and country code are required" });
    }

    try {
        await con.beginTransaction();

        // Check if the user exists
        const [isUser] = await con.query(
            'SELECT * FROM tbl_user WHERE contact = ? AND country_code = ?', [contact, country_code] );

        if (isUser.length > 0) {
            return res.status(200).json({ result: "Mobile Number Already Exist" });
        }

         // Check if the user Exists
         const [isUser1] = await con.query('SELECT * FROM tbl_user WHERE email = ?', [email] );

        if (isUser1.length > 0) {
            return res.status(200).json({ result: "Email Already Exist" });
        }

        // Generate a random 6-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);
        //console.log("Generated OTP:", otp);

        // Check if the user's contact already exists in tbl_otp
        const [results] = await con.query(
            'SELECT * FROM tbl_otp WHERE country_code = ? AND contact = ?', 
            [country_code, contact]
        );

        const currentTime = new Date();
        const expiryTime = new Date(currentTime.getTime() + 2 * 60000); // Expiry time is set to 10 minutes from the current time

        const trimmedCountryCode = country_code.trim();
        const trimmedContact = contact.trim();


          // Check if the record exists
        if (results.length === 0) {
          // Insert a new record in tbl_otp
          await con.query(
              'INSERT INTO tbl_otp (country_code, contact, otp_code, expire_at) VALUES (TRIM(?), TRIM(?), ?, ?)', 
              [trimmedCountryCode, trimmedContact, otp, expiryTime]
          );
        } else {
          // Update the existing record in tbl_otp
          await con.query(
              'UPDATE tbl_otp SET otp_code = ?, expire_at = ? WHERE TRIM(country_code) = TRIM(?) AND TRIM(contact) = TRIM(?)', 
              [otp, expiryTime, trimmedCountryCode, trimmedContact]
          );
        }

        await con.commit();
        return res.status(200).json({ result: "success", otp: otp });
    } catch (error) {
        await con.rollback();
        console.error('Error in Send Otp API:', error);
        return res.status(500).json({ result: 'Internal Server Error' });
    } finally {
        con.release();
    }
};


const verifyOTP1 = async (req, res, next) => {

    const con = await connection();
    const userOTP = req.body.otp;
    const contact = req.body.contact.trim();
    const country_code = req.body.country_code.trim();
    try {
   ////console.log("data-->",req.body);

     // const [results] = await con.query('SELECT * FROM tbl_otp WHERE contact = ? AND country_code = ?',  [contact,country_code]);

    const query = 'SELECT * FROM tbl_otp WHERE TRIM(contact) = ? AND TRIM(country_code) = ?';
    const values = [contact, country_code];

    const [results] = await con.execute(query, values);


    // Accessing the executed query
    ////console.log("Executed Query -->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>:", con.format(query, values)); // Properly formatted query

      ////console.log("results",results)
      ////console.log("results.length",results.length)

      ////console.log("resultt ->>>>>>>>>, ",results)
      if(results.length==0)
      {
        return res.status(200).json({result :"Invalid contact and country_code"});
      }

      // ////console.log("challllllll gya sucess")
      // return

      const storedOTP = results[0].otp_code;
      ////console.log('storedOTP',storedOTP)
      const expiryTime = new Date(results[0].expire_at);
      ////console.log('expiryTime',expiryTime)
      const currentTime = new Date();
      
      ////console.log('userOTP',userOTP)
   
      // Verify the OTP
      if (userOTP == storedOTP && new Date() < expiryTime) { 
        ////console.log("correct OTP");
         // Update the existing record in tbl_otp
         await con.query(
          'UPDATE tbl_otp SET expire_at = ? WHERE country_code = ? AND contact = ?', 
          [currentTime,country_code, contact]
      );
        res.status(200).json({result :"success"});
      } else
      { 
        ////console.log("Incorrect OTP")
        res.json({result :"Invalid or expired OTP. Please try again"});
      }
    } catch (error) 
    {
        await con.rollback();
        console.error('Error in Verify OTP API:', error);
        return res.status(500).json({ result: 'Internal Server Error' });
    } finally {
        con.release();
    }

};

const verifyOTP = async (req, res, next) => {
  const con = await connection();
  const userOTP = req.body.otp;
  const contact = req.body.contact.trim();
  const country_code = req.body.country_code.trim();
  
  try {
      await con.beginTransaction();
      //console.log("data-->", req.body);

      const query = 'SELECT * FROM tbl_otp WHERE contact = ? AND country_code = ?';
      const values = [contact,country_code];

      const [results] = await con.query(query, values);

      // Accessing the executed query
      //console.log("Executed Query contact -->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>:", con.format(query, values)); // Properly formatted query

      //console.log("results by contact only", results);
      //console.log("results.length", results.length);
      //console.log("resultt ->>>>>>>>>, ", results);
      
      const query1 = 'SELECT * FROM tbl_otp WHERE country_code = ?';
      const values1 = [country_code];
      const [results1] = await con.query(query1, values1);

      //console.log("results1 by country code only ", results1);
      //console.log("results.length1", results1.length);
      //console.log("resultt1 ->>>>>>>>>, ", results1);

      // Accessing the executed query
      //console.log("Executed Query country code -->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>:", con.format(query1, values1)); // Properly formatted query
      
      if (results.length == 0) {
        await con.rollback();
          return res.status(200).json({ result: "Invalid contact and country_code" });
      }
      
      const storedOTP = results[0].otp_code;
      //console.log('storedOTP', storedOTP);
      
      //console.log("Database expire_at:", results[0].expire_at);
      const expiryTime = new Date(results[0].expire_at);
      //console.log('expiryTime', expiryTime);
      
      const currentTime = new Date();
      //console.log('userOTP', userOTP);
      //console.log("currentTime:", currentTime);
      //console.log("Comparison result:", currentTime < expiryTime);


      // Verify the OTP and check expiry time
      if (userOTP == storedOTP && currentTime < expiryTime) {
           //console.log("correct OTP");

          // Update the existing record in tbl_otp
          await con.query( 'UPDATE tbl_otp SET expire_at = ? WHERE country_code = ? AND contact = ?', [currentTime, country_code, contact] );
          await con.commit();
          
          res.status(200).json({ result: "success" });
      } else {
        await con.rollback();
          //console.log("Incorrect OTP");
          res.json({ result: "Invalid or expired OTP. Please try again" });
      }
  } catch (error) {
    await con.rollback();
      console.error('Error in Verify OTP API:', error);
      return res.status(500).json({ result: 'Internal Server Error' });
  } finally {
      // Release connection properly
      con.release();
  }
};

//-------------------- Register API Start  ------------------------------ 
const userSignup = async (req, res, next) => {
    const con = await connection();
    try {
        ////console.log(req.body);
        const time = new Date().toLocaleTimeString();
        const date = new Date().toISOString().split('T')[0];  // Format the date properly

        ////console.log("---------------> ",typeof req.body.password);

        // Hash the user's password 
        req.body.password = hashPassword(req.body.password);
        const user_type = req.body.user_type;
        let filenames = '';
        if (req.files) {
            // If images are uploaded, join filenames with commas
            filenames = req.files.map(file => file.filename).join(',');
        }
        let user_document_images ,owner_document_images , status ,owner_doc_expiry_date ,user_doc_expiry_date;

        if(user_type == 'Owner')
        {
           user_document_images = '';
           owner_document_images = filenames;
           user_doc_expiry_date = "";
           owner_doc_expiry_date = req.body.doc_expiry_date;
           status = 'Pending';
        }
        else
        {
           owner_document_images  = '';
           user_document_images = filenames;
           user_doc_expiry_date = req.body.doc_expiry_date;
           owner_doc_expiry_date = "";
           status = 'Approve';
        }
  
        
        const image_type = req.body.image_type == "" ? "Document" : req.body.image_type;

        // filenames = JSON.stringify(filenames);
        const invite_code = Math.floor(1000 + Math.random() * 9000);
        const affiliation_code = Math.floor(1000 + Math.random() * 9000);

        await con.beginTransaction();

        // Check if the user already exists with the provided email
        const checkUserSql = 'SELECT COUNT(*) as count FROM `tbl_user` WHERE email = ?';
        const checkUserValues = [req.body.email];

        const checkUserSql2 = 'SELECT COUNT(*) as count FROM `tbl_user` WHERE country_code = ? AND contact = ?';
        const checkUserValues2 = [req.body.country_code, req.body.contact];

        const [userResult] = await con.query(checkUserSql, checkUserValues);
        const [userResult2] = await con.query(checkUserSql2, checkUserValues2);

        ////console.log(userResult);

        // Check if email or mobile already exists
        if (userResult[0].count > 0) {
            await con.rollback();
            return res.status(404).json({ result: 'Email already exists' });
        } else if (userResult2[0].count > 0) {
            await con.rollback();
            return res.status(404).json({ result: 'Mobile Number already exists' });
        } else {
            const sql = 
                'INSERT INTO `tbl_user` (`first_name`, `last_name`, `email`, `password`, `signup_type`, `country_code`, `country_flag`, `country_name`, `contact`, `image_type`, `user_document_images`, `user_doc_expiry_date`, `owner_document_images`, `owner_doc_expiry_date`,`business_name`,`status`,`used_invite_code`, `used_affiliation_code`, `invite_code`, `affiliation_code`, `user_type`, `date`, `time`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?,?)';
            
            const values = [
                req.body.firstname,           
                req.body.lastname,             
                req.body.email,           
                req.body.password,        
                'Normal',                        
                req.body.country_code,          
                req.body.country_flag,
                req.body.country_name,          
                req.body.contact,               
                image_type,     
                user_document_images,
                user_doc_expiry_date,
                owner_document_images, 
                owner_doc_expiry_date,
                req.body.business_name,
                status,
                req.body.used_invite_code,
                req.body.used_affiliation_code,               
                invite_code,                   
                affiliation_code,            
                user_type,                        
                date,                            
                time                            
            ];
            
            const [results] = await con.query(sql, values);

            await con.commit();

            const selectUserSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
            const [[userDetails]] = await con.query(selectUserSql, [results.insertId]);
            const user = userDetails;  
            sendTokenUser(user, user_type, 200, res);
            await con.commit();

            // Return the newly created user details
            //res.json({ result: 'success', ...userDetails });
        }
    } catch (error) {
        await con.rollback();
        console.error('Error in register API:', error);
        res.status(500).json({ result: 'Internal Server Error' });
    } finally {
        con.release(); // Close the database connection
    }
};


const ownerSignup =  async(req,res,next) => {
    const con = await connection();
    try {
        ////console.log(req.body);
        const time = new Date().toLocaleTimeString();
        const date = new Date().toISOString().split('T')[0];  // Format the date properly
        const status = 'Approve';

        // Hash the user's password
        req.body.password = hashPassword(req.body.password);

        let filenames = '';
        if (req.files) {
            // If images are uploaded, join filenames with commas
            filenames = req.files.map(file => file.filename).join(',');
        }
        // filenames = JSON.stringify(filenames);
        const invite_code = Math.floor(1000 + Math.random() * 9000);
        const affiliation_code = Math.floor(1000 + Math.random() * 9000);

        await con.beginTransaction();

        // Check if the user already exists with the provided email
        const checkUserSql = 'SELECT COUNT(*) as count FROM `tbl_owner` WHERE email = ?';
        const checkUserValues = [req.body.email];

        const checkUserSql2 = 'SELECT COUNT(*) as count FROM `tbl_owner` WHERE country_code = ? AND contact = ?';
        const checkUserValues2 = [req.body.country_code, req.body.contact];

        const [userResult] = await con.query(checkUserSql, checkUserValues);
        const [userResult2] = await con.query(checkUserSql2, checkUserValues2);

        ////console.log(userResult);

        // Check if email or mobile already exists
        if (userResult[0].count > 0) {
            await con.rollback();
            return res.status(404).json({ result: 'Email already exists' });
        } else if (userResult2[0].count > 0) {
            await con.rollback();
            return res.status(404).json({ result: 'Mobile Number already exists' });
        } else {
            const sql = 
              'INSERT INTO `tbl_owner`(`first_name`, `last_name`, `email`, `password`, `country_code`, `country_flag`, `contact`,`device_id`, `android_key`, `ios_key`, `business_name`, `business_id`, `profile_image`, `owner_wallet`, `used_invite_code`, `used_affiliation_code`, `invite_code`, `affiliation_code`, `status`, `date`, `time`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            const values = [
                req.body.firstname,
                req.body.lastname,
                req.body.email,
                req.body.password,
                req.body.country_code,
                req.body.country_flag,
                req.body.contact,
                '',
                '',
                '',
                req.body.business_name,
                filenames,
                '',
                '0',
                req.body.used_invite_code,
                req.body.used_affiliation_code,
                invite_code,
                affiliation_code,
                status,
                date,
                time
            ];

            const [results] = await con.query(sql, values);

            await con.commit();

            const selectUserSql = 'SELECT * FROM `tbl_owner` WHERE owner_id = ?';
            const [[userDetails]] = await con.query(selectUserSql, [results.insertId]);

            // Return the newly created user details
            res.json({ result: 'success', ...userDetails });
        }
    } catch (error) {
        await con.rollback();
        console.error('Error in register API:', error);
        res.status(500).json({ result: 'Internal Server Error' });
    } finally {
        con.release(); // Close the database connection
    }
}

//----------------  Register API End --------------------------=
const forgotPassword = async (req, res, next) => {
    ////console.log("Password request for ->", req.body);

    const con = await connection();
    const { contact, country_code , type} = req.body;

    // Validate input
    if (!contact || !country_code) {
        return res.status(400).json({ result: "Contact and country code are required" });
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    ////console.log("Generated OTP:", otp);

    try {
        // Check if the user's contact already exists in tbl_otp
        const [results] = await con.query(
            'SELECT * FROM tbl_otp WHERE country_code = ? AND contact = ? ', 
            [country_code, contact]
        );

        const currentTime = new Date();
        const expiryTime = new Date(currentTime.getTime() + 10 * 60000); // Expiry time set to 10 minutes from now

        await con.beginTransaction();
        // Check if the user exists
        const [[isUser]] = await con.query(
            'SELECT user_id FROM tbl_user WHERE contact = ? AND country_code = ? AND user_type=?', 
            [contact, country_code,type]
        );

        if (!isUser) {
            await con.rollback();
            return res.status(404).json({ result: "Mobile number not registered" });
        } else {
            if (results.length === 0) {
                // Insert a new record in tbl_otp
                await con.query(
                    'INSERT INTO tbl_otp (country_code, contact, otp_code, expire_at) VALUES (?, ?, ?, ?)', 
                    [country_code, contact, otp, expiryTime]
                );
            } else {
                // Update the existing record in tbl_otp
                await con.query(
                    'UPDATE tbl_otp SET otp_code = ?, expire_at = ? WHERE country_code = ? AND contact = ?', 
                    [otp, expiryTime, country_code, contact]
                );
            }

            await con.commit();
            return res.status(200).json({ result: "success", otp: otp, user_id: isUser.user_id });
        } 

    } catch (error) {
        await con.rollback();
        console.error('Error in ForgotPassword API:', error);
        return res.status(500).json({ result: 'Internal Server Error' });
    } finally {
        con.release();
    }
};

const updateDeviceToken = async(req,res,next) => {

  const con = await connection();
  const userID = req.user.user_id;
  ////console.log("user_id--- ".userID)
  const type = req.user.user_type;
  const { device_id , device_type } = req.body;

  try {
    await con.beginTransaction();
    // Fetch the existing user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);

    if (!existingUser) {
      await con.rollback();
      res.status(200).json({ result: "User not found" });
      return;
    }

    // Update the device token in the user table
    await con.query('UPDATE tbl_user SET device_type =? , device_token = ? WHERE user_id = ?', [device_type, device_id, userID]);
    await con.commit();
    return res.status(200).json({ result: "success" });
    
  } catch (error) {
    await con.rollback();
     console.error('Error:',error);
     return res.status(500).json({result : 'Internal Server Error'});
  }  finally {
    con.release();
  }
}

const resetpassword = async (req,res,next) => {
  ////console.log("reset body ", req.body)
  const con = await connection();
  try 
  {
    await con.beginTransaction();
    const userID = req.body.user_id;

    const newPassword = hashPassword(req.body.confirmPass);
    ////console.log(newPassword);
    const [results] = await con.query("UPDATE tbl_user SET password = ? WHERE user_id = ?", [newPassword, userID]); 
    await con.commit();
    res.json({result :"success"});
    
  } catch (error) {
    await con.rollback();
    console.error('Error in resetpassword API:', error);
    res.status(500).json({ result: 'failed' });
  } finally {
    con.release();
  }
}

const guestLogin = async(req,res,next) => {
  ////console.log("login body", req.body);
  const con = await connection();
  try {
    await con.beginTransaction();
    const type = 'Guest';
    await con.commit();  
    res.json({ result: "success",type:type}); 
  } catch (error) {
    await con.rollback();
    console.error('Error in Login API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
}

const loginRecheck = async(req,res,next) => {
// ////console.log("login body", req.body);
  const con = await connection();
  const userID = req.user.user_id;
  ////console.log("user_id--- ", userID);
  try {
    await con.beginTransaction();
    const {login_device_key , access_token} = req.body;
    // Regular user login logic
    if (!login_device_key || !access_token) {
      res.status(200).json({ result: "Incomplete Parameters" });
      return;
    }

    var results;
    [[results]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    const user = results;  // Here, the user or owner can be set
    // ////console.log("user--> ", user);

    if (!user) {
      res.status(200).json({ result: "Account does not exist!" });
      return;
    }

    if(user.login_device_key != login_device_key && user.access_token != access_token)
    {
      res.status(200).json({ result: "You Are Already Logged-in In Other Device" });
    } else{
      res.status(200).json({ result: "Success" });
    } 
  } catch (error) {
    await con.rollback();
    console.error('Error in API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
}

const userLogin = async (req, res, next) => {
  //////console.log("login body", req.body);
  const con = await connection();
  try {
    await con.beginTransaction();
    const { contact, country_code, type, password ,login_device_key , access_token} = req.body;

    // Check if the request is for guest login
    if (type === 'Guest') {
      // Directly allow guest login without password verification
      sendTokenUser({ user_id: 'Guest' }, type, 200, res); // Send a minimal token for guest mode
      return;
    }

    // Regular user login logic
    if (!country_code || !contact || !password || !type || !login_device_key || !access_token) {
      res.status(200).json({ result: "Incomplete Parameters" });
      return;
    }

    var results;
    [[results]] = await con.query('SELECT * FROM tbl_user WHERE contact = ? AND country_code = ? AND user_type = ? AND deleted= ?', [contact, country_code, type, 'No']);
    const user = results;  // Here, the user or owner can be set
    //////console.log("user--> ", user);

    if (!user) {
      res.status(200).json({ result: "Account does not exist!" });
      return;
    }

    let isValid = comparePassword(password, user.password);
    ////console.log("isValid--> ", isValid);

    if (!isValid) {
      res.status(200).json({ result: "Incorrect Password" });
      return;
    }

    if (user.status === "Approve") {
      const updateData=await con.query("UPDATE tbl_user SET login_device_key=?,access_token=? WHERE contact = ? AND country_code = ? AND user_type = ? AND deleted= ?", [login_device_key,access_token,contact, country_code, type, 'No']);
          
      sendTokenUser(user, type, 200, res);
      await con.commit();
    } else if (user.status === "Disapprove") {
      res.status(200).json({ result: "Your Account Has Been Deactivated!" });
    } 
    else {
      res.status(200).json({ result: "Your account is pending approval. Please wait for 24 hours for admin approval. If you do not receive an update within 24 hours, kindly contact support." });
    }
  } catch (error) {
    await con.rollback();
    console.error('Error in Login API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};
  
  const Logout = async (req, res, next) => {
    ////console.log("logout body", req.body);
    const con = await connection();
    const userID = req.user.user_id;
    ////console.log("user_id--- ", userID);
    
    try {
      await con.beginTransaction();

      // Update query to clear device key and access token
      const updateData = await con.query("UPDATE tbl_user SET login_device_key='', access_token='' WHERE user_id = ?", [userID]);
  
      // Set token cookie to null for logging out
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true
      });
  
      await con.commit();  // Commit the transaction after successful query execution
      res.status(200).json({ result: "logout success" });
    } catch (error) {
      await con.rollback();
      console.error('Error in Logout API:', error);
      res.status(500).json({ result: 'Internal Server Error' });
    } finally {
      con.release();
    }
  };
  
//---------------------- Login /Logout API end -------------------------------

//------------------- Profile Section start 

const profile = async (req, res, next) => {
  const con = await connection();
  var profileBaseUrl = `http://${process.env.Host}/images/profiles/`;
  var docBaseUrl = `http://${process.env.Host}/images/docUploads/`;
  try {  
    const userID = req.user.user_id;
    ////console.log("user_id--- ".userID)
    const type = req.user.user_type;
    var users;
    [[users]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    // if( user.status != 'active'){
    //   return res.status(200).json({ result: "User is Deactivated" });
    // }
      
    if(users.profile_image){
      users.profile_image = `${profileBaseUrl}${users.profile_image}`;
    }else{
      users.profile_image = '';
    }

    if(type === "Owner") {
      // Business name will be included only if the user type is 'Owner'
      users.business_name = users.business_name; 
      if (users.owner_document_images) {
        const images1 = users.owner_document_images.split(',');      
        var owner_document_images = images1.map(image => ({ image: `${docBaseUrl}${image}` }));
      } else {
        var owner_document_images = [];
      }

      users.document_images = owner_document_images;
      delete users.user_document_images
      delete users.license_images;
      delete users.user_doc_expiry_date;
    } else {
      delete users.business_name; // Ensure 'business_name' is not shown for non-Owners
      delete users.owner_document_images;
      delete users.owner_doc_expiry_date;
      
      if (users.user_document_images) {
        const images = users.user_document_images.split(',');      
        var user_document_images = images.map(image => ({ image: `${docBaseUrl}${image}` }));
      } else {
        var user_document_images = [];
      }
      users.document_images = user_document_images;

      if (users.license_images) {
        const images2 = users.license_images.split(',');      
        users.license_images = images2.map(image => ({ image: `${docBaseUrl}${image}` }));
      } else {
          users.license_images = [];
      }
    }

    res.json(users);
  } catch (error) {
    console.error('Error in profile API:', error);
    ////console.log("Error for Profile -> ", req.body.user_id )
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {  
      con.release();
  }
};

const updateprofile = async (req, res, next) => {
  const con = await connection();
  try {
    await con.beginTransaction();

    const userID = req.user.user_id;
    const type = req.user.user_type;

    ////console.log("user_id--- ", userID);
    ////console.log("user_type--- ", type);

    // Fetch the existing user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);

    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    if (existingUser.status !== 'Approve') {
      return res.status(200).json({ result: "User is Deactivated" });
    }

    const filedata = req.body.existingFiles || "";
    const baseUrl = "http://82.112.238.22:3000/images/docUploads/";
    const fileNamesFromData = filedata.split(',').map(url => url.replace(baseUrl, ''));

    // Combine filenames
    let combinedFilenames = fileNamesFromData.join(',');

    if (req.files) {
      const uploadedFileNames = req.files.map(file => file.filename).join(',');
      combinedFilenames = `${combinedFilenames},${uploadedFileNames}`.replace(/^,|,$/g, '');
    }

    const business_name = req.body.business_name || existingUser.business_name;

    const updatedUser = {
      first_name: req.body.first_name || existingUser.first_name,
      last_name: req.body.last_name || existingUser.last_name,
      email: req.body.email || existingUser.email,
      business_name: business_name,
      filenamesUser: combinedFilenames || existingUser.user_document_images,
      filenamesOwner: combinedFilenames || existingUser.owner_document_images,
    };

    ////console.log(updatedUser);

    let updateSql;
    let updateValues;

    if (type === 'User') {
      updateSql = 'UPDATE tbl_user SET first_name=?, last_name=?, email=?, user_document_images=? WHERE user_id=?';
      updateValues = [updatedUser.first_name, updatedUser.last_name, updatedUser.email, updatedUser.filenamesUser, userID];
    } else if (type === 'Owner') {
      updateSql = 'UPDATE tbl_user SET first_name=?, last_name=?, email=?, owner_document_images=?, business_name=? WHERE user_id=?';
      updateValues = [
        updatedUser.first_name,
        updatedUser.last_name,
        updatedUser.email,
        updatedUser.filenamesOwner,
        updatedUser.business_name,
        userID,
      ];
    }

    await con.query(updateSql, updateValues);
    await con.commit();

    // Call sendPushNotification and wait for it to complete
    // await sendSinglePushNotification(userID);
    await sendSinglePushNotification(userID);

    res.json({ result: "success" });
  } catch (error) {
    await con.rollback();
    console.error('Error in updateProfile API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};

const updateProfileRequest = async (req, res, next) => {
  const con = await connection();
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0];  // Format the date properly
  try {
    await con.beginTransaction();
    const userID = req.user.user_id;
    let filenames = '';
    if (req.files) {
        filenames = req.files.map(file => file.filename).join(',');
    }
    
    // Fetch the existing user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);

    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    if (existingUser.status !== 'Approve') {
      return res.status(200).json({ result: "User is Deactivated" });
    }

    const updatedUser = {
      first_name: req.body.first_name || existingUser.first_name,
      last_name: req.body.last_name || existingUser.last_name,
      email: req.body.email || existingUser.email,
      business_name: req.body.business_name || existingUser.business_name,
      filenamesOwner: filenames || existingUser.owner_document_images,
      owner_doc_expiry_date: req.body.owner_doc_expiry_date || existingUser.owner_doc_expiry_date
    };
    
    const userName = updatedUser.first_name + ' ' + updatedUser.last_name;
    ////console.log(updatedUser);
    let  updateSql = 'UPDATE tbl_user SET first_name=?, last_name=?, email=?, owner_document_images=?,owner_doc_expiry_date=?, business_name=? WHERE user_id=?';
    let  updateValues = [updatedUser.first_name, updatedUser.last_name, updatedUser.email, updatedUser.filenamesOwner,updatedUser.owner_doc_expiry_date, updatedUser.business_name, userID ];

    await con.query(updateSql, updateValues);
   
    const title1 = "Owner Role Switch Request!";
    const body1 = "Your request has been sent to the admin for approval. You will be notified once it is reviewed.";

    const title2 = "Owner Role Switch Request!";
    const body2 = `You have received a new document verification request from ${userName}. Please review the document and take the necessary action.`;

    const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Switch_Request', ?, ?, ?, ?, ?, ?, ?),('Switch_Request', ?, ?, ?, ?, ?, ?, ?) `;
  
    await con.query(sql_notify, [
      0, userID, 'User', title1, body1, date, time, // User notification
      0, '1', 'Admin', title2, body2, date, time // Owner notification
    ]);

    sendSinglePushNotification({ user_id: userID, title: title1, body: body1, }); 

    await con.commit();
    res.json({ result: "success" });
  } catch (error) {
    await con.rollback();
    console.error('Error in updateProfile API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};

const updateProfilePic = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  try {
    await con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id =?',[userID])
    if (!existingUser) {
      await con.rollback();
      res.status(200).json({ result: "User not found" });
      return;
    }

    if( existingUser.status != 'Approve'){
      return res.status(200).json({ result: "User is Deactivated" });
    }

    
    var image =  existingUser.profile_image
    if(req.file) {
      ////console.log(" new image found ...")
      image =  req.file.filename ;
    }

    // Update user details
    const updatedUser = {
      image: image,
    };

    ////console.log(updatedUser)

    await con.query('UPDATE tbl_user SET profile_image=? WHERE user_id=?', [updatedUser.image, userID ]);
    await con.commit();  
    await sendSinglePushNotification(userID);
    res.json({ result: "success" });
  } catch (error) {
    await con.rollback();
    console.error('Error in update API :', error);
    res.status(500).json({result: 'Internal Server Error'});

  } finally {
    con.release();
  }
}

const deleteAccount = async (req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const password = req.body.password;
  ////console.log("user_id---", userID);
  try {
    await con.beginTransaction();
    
    const [[users]] = await con.query("SELECT * FROM tbl_user WHERE user_id = ?", [userID]);
    if(users.status == "Disapprove") {
      return res.status(404).json({result:"failed", message: "Deactivated Profile Cannot be deleted"});
    }

    let isValid = comparePassword(password, users.password);
    ////console.log("isValid--> ", isValid);

    if (!isValid) {
      return res.status(200).json({ result: "Incorrect Password" });
    }

    // await con.query('DELETE FROM tbl_prop WHERE user_id = ?', [userID]);
    await con.query('UPDATE `tbl_user` SET `deleted`=? WHERE user_id = ?', ['Yes',userID]);

    await con.commit();
    res.status(200).json({ result: "success" });
  } catch (error) {
    await con.rollback();
    console.error("Error:", error);
    res.status(500).json({ result: "failed", message:" Unable to delete Your Account  !" });
  } finally {
    con.release();
  }
}

const changePassword = async(req, res, next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const oldPassword = req.body.oldpassword;

  try {
    await con.beginTransaction();
    const newPassword = hashPassword(req.body.confirmPassword);
    var userdata;
    [[userdata]]= await con.query('SELECT * FROM tbl_user WHERE user_id = ?',[userID]);
    
    let isValid = comparePassword(oldPassword, userdata.password);

    ////console.log("isValid--> ",isValid)

    if (!isValid) {
      res.status(200).json({ result: "Incorrect Old Password" });
      return;
    }
    const [results] = await con.query("UPDATE tbl_user SET password = ? WHERE user_id = ?", [newPassword, userID]); 
    await con.commit();
    res.json({result :"success"});
  } catch (error) {
    await con.rollback();
    console.error('Error:',error);
    res.status(500).json({result: 'Internal Server Error'} )
  } finally {
    con.release();
  }
}
//------------------- Profile End ----------------------//

const addUserDocument = async (req, res, next) => {
  const con = await connection();
  const user = req.user;  // Extract user details
  ////console.log("user_details---", user);
  const userID = user.user_id;
  ////console.log("user_id---", userID);

  try {
    ////console.log(req.body);

    let filenames = '';
    if (req.files && req.files.length > 0) {
      // If files are uploaded, join filenames with commas
      filenames = req.files.map(file => file.filename).join(',');
    }
    ////console.log("user_images---", filenames);

    const status = 'Pending';

    await con.beginTransaction();  // Start the transaction
    const sql = 
      'UPDATE `tbl_user` SET `license_number`=?,`expiry_date`=?,`license_images`=?,`license_status`=?  WHERE user_id=?';
    const values = [
      req.body.license_number,
      req.body.expiry_date,
      filenames,
      status,
      userID,
    ];

    const [results] = await con.query(sql, values);
    await con.commit();  // Commit the transaction

    res.status(200).json({ result: 'Your documents approval is pending. Please wait for 24 hours for admin approval. If you do not receive an update within 24 hours, kindly contact support.' });
  } catch (error) {
    console.error('Error:', error);
    await con.rollback();  // Rollback the transaction in case of an error
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();  // Release the connection
  }
};

const  addCard = async(req,res,next) => {
  const con = await connection();
  const user = req.user;  // Extract user details
  ////console.log("user_details---", user);
  const userID = user.user_id;
  ////console.log("user_id---", userID);
  const type = req.user.user_type;

  try {
    ////console.log(req.body);

    const time = new Date().toLocaleTimeString();
    const date = new Date().toISOString().split('T')[0];  // Format the date properly
    // Encrypt the sensitive information before sending it in the response
    const card_number = encrypt64(req.body.card_number, secretKey);
    const expiry_date = encrypt64(req.body.expiry_date, secretKey);
    const cvv = encrypt64(req.body.cvv, secretKey);

    ////console.log(card_number);
    ////console.log(expiry_date);
    ////console.log(cvv);

    await con.beginTransaction();  // Start the transaction
    const sql = 'INSERT INTO `tbl_user_card`(`user_id`, `card_holder_name`, `card_number`, `expiry_date`, `cvv`,`date`, `time`) VALUES (?,?,?,?,?,?,?)';
    const values = [ userID,req.body.card_holder_name, card_number, expiry_date, cvv,date, time ];

    const [results] = await con.query(sql, values);
    await con.commit();  // Commit the transaction

    res.status(200).json({ result: 'success' });

  } catch (error) {
   await con.rollback();
   console.error('Error:',error);
   res.status(500).json({result:"Internal Server Error"});
  } finally {
    con.release();
  }
}

const fetchCard = async(req,res,next) => {
  const con = await connection();
  const user = req.user;  // Extract user details
  ////console.log("user_details---", user);
  const userID = user.user_id;
  ////console.log("user_id---", userID);
  const type = req.user.user_type;
  try {
    
    const [results] = await con.query('SELECT * FROM `tbl_user_card` WHERE user_id=?', [userID] );
    // if (results.length > 0) 
    // {
      // const formattedCard = [];
      // results.forEach(skill => {
      //   formattedCard.push(skill);
      // });     

       // Format the result using map to return specific fields
       const formattedCard = results.map(card => ({
        card_id: card.card_id,
        card_number: card.card_number,  // or masked if needed
        expiry_date: card.expiry_date,
        card_holder_name: card.card_holder_name,
        cvv: card.cvv,
        user_type: card.user_type,
        decryption_secret_key : secretKey,
      }));
      
      res.status(200).json(formattedCard);

    // } else {
    //   // If no FAQs found, you can send an appropriate response
    //   res.status(200).json({result:'No card found'});
    // }

  } catch (error) {
   await con.rollback();
   console.error('Error:',error);
   res.status(500).json({result:"Internal Server Error"});
  } finally {
    con.release();
  }
}

const updateCard = async(req,res,next) => {
    const con = await connection();
    const user = req.user;  // Extract user details
    ////console.log("user_details---", user);
    const userID = user.user_id;
    ////console.log("user_id---", userID);
    const type = req.user.user_type;

    try {
      ////console.log(req.body);
      const card_id = req.body.card_id;
      await con.beginTransaction();  // Start the transaction

      // Encrypt the sensitive information before sending it in the response
      const card_number = encrypt64(req.body.card_number, secretKey);
      const expiry_date = encrypt64(req.body.expiry_date, secretKey);
      const cvv = encrypt64(req.body.cvv, secretKey);

      ////console.log(card_number);
      ////console.log(expiry_date);
      ////console.log(cvv);

      // Fetch the existing user details
      const [[existingCard]] = await con.query('SELECT * FROM tbl_user_card WHERE user_id = ? AND card_id=? ', [userID,card_id]);

      if (!existingCard) {
        await con.rollback();
        res.status(200).json({ result: "Data not found" });
        return;
      }
      // Update user details
      const updatedCard = {
        card_holder_name: req.body.card_holder_name || existingCard.card_holder_name,
        card_number: card_number || existingCard.card_number,
        expiry_date: expiry_date || existingCard.expiry_date,
        cvv: cvv || existingCard.cvv
      };

      const sql = 'UPDATE `tbl_user_card` SET `card_holder_name`=?,`card_number`=?,`expiry_date`=?,`cvv`=? WHERE `card_id`=? AND `user_id`=?';
      const values = [ 
        updatedCard.card_holder_name, 
        updatedCard.card_number,
        updatedCard.expiry_date,
        updatedCard.cvv,
        card_id,
        userID
      ];

      const [results] = await con.query(sql, values);
      await con.commit();  // Commit the transaction

      res.status(200).json({ result: 'success' });

    } catch (error) {
    await con.rollback();
    console.error('Error:',error);
    res.status(500).json({result:"Internal Server Error"});
    } finally {
      con.release();
    }
}

const deleteCard = async(req,res,next) => {
  const con = await connection();
  const user = req.user;  // Extract user details
  ////console.log("user_details---", user);
  const userID = user.user_id;
  ////console.log("user_id---", userID);
  try {
    ////console.log(req.body);
      const card_id = req.body.card_id;
      await con.beginTransaction();  // Start the transaction
      const sql = await con.query('DELETE FROM `tbl_user_card` WHERE `card_id`=? AND `user_id`=?',[card_id,userID]);
      await con.commit();
      res.status(200).json({ result: "success" });

  } catch (error) {
    await con.rollback();
    console.error('Error:',error);
    res.status(500).json({result:"Internal Server Error"});
  } finally {
    con.release();
  }
}

const userVarifyStatus = async (req, res, next) => {
  const con = await connection();
  const user = req.user;  // Extract user details
  ////console.log("user_details---", user);
  const userID = user.user_id;
  ////console.log("user_id---", userID);
  const type = req.user.user_type;

  try {
    await con.beginTransaction();  // Start the transaction
    // Fetch user verification status
    const [User_count] = await con.query('SELECT * FROM `tbl_user` WHERE user_id=? AND status=?', [userID, 'Approve']);
    const user_status = User_count.length > 0 ? 'verified' : 'Pending';

    // Fetch document verification status
    // const [document_count] = await con.query('SELECT * FROM `tbl_user` WHERE user_id=? AND license_status=?', [userID, 'Verified']);
    // const document_status = document_count.length > 0 ? 'verified' : 'Pending';

    const [[documentCount]] = await con.query('SELECT license_status FROM `tbl_user` WHERE user_id = ?',[userID]);
   // ////console.log('documentCount-->',documentCount)
    ////console.log('license_status-->',documentCount.license_status)
    let document_status;
    if (documentCount.license_status == '' || documentCount.license_status == 'Unverified') {
      ////console.log('license_status-->if')
      document_status = ""; // Default to an empty string if no record is found or `license_status` is null/undefined.
    } else if (documentCount.license_status != '') {
      ////console.log('license_status-->else',documentCount.license_status)
      document_status = documentCount.license_status === 'Verified' ? 'verified' : 'Pending';
    }
    // Fetch card verification status
    const [card_count] = await con.query('SELECT * FROM `tbl_user_card` WHERE user_id=?', [userID]);
    const card_status = card_count.length > 0 ? 'verified' : 'Pending';

    // Determine overall verification status
    const final_status = user_status === 'verified' && document_status === 'verified' && card_status === 'verified' ? 'verified' : 'Pending';

    // Return the statuses in JSON response
    res.status(200).json({
      user_status,
      document_status,
      card_status,
      final_status
    });
    await con.commit();  // Commit the transaction
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const addBankDetails = async(req,res,next) => {
    const con = await connection();
    const user = req.user;  // Extract user details
    ////console.log("user_details---", user);
    const userID = user.user_id;
    ////console.log("user_id---", userID);
    const type = req.user.user_type;

    try {
      ////console.log(req.body);

      const time = new Date().toLocaleTimeString();
      const date = new Date().toISOString().split('T')[0];  // Format the date properly

      await con.beginTransaction();  // Start the transaction
      const sql = 'INSERT INTO `tbl_user_bank_details`(`user_id`, `country_name`, `account_holder_name`, `account_number`, `ifsc_code`, `postal_code`, `date`, `time`) VALUES (?,?,?,?,?,?,?,?)';
      const values = [ 
        userID,
        req.body.country_name,
        req.body.account_holder_name,
        req.body.account_number,
        req.body.ifsc_code,
        req.body.postal_code,
        date,
        time
     ];

      const [results] = await con.query(sql, values);
      await con.commit();  // Commit the transaction

      res.status(200).json({ result: 'success' });

    } catch (error) {
    await con.rollback();
    console.error('Error:',error);
    res.status(500).json({result:"Internal Server Error"});
    } finally {
      con.release();
    }
}

const fetchBankDetails = async(req,res,next) => {
  const con = await connection();
  const user = req.user;  // Extract user details
  ////console.log("user_details---", user);
  const userID = user.user_id;
  ////console.log("user_id---", userID);
  const type = req.user.user_type;
  try {
    
      const [[results]] = await con.query('SELECT * FROM `tbl_user_bank_details` WHERE user_id=?', [userID] );
       // Format the result using map to return specific fields
      // const formattedCard = results.map(card => ({
      //   bank_id: card.bank_id,
      //   country_name: card.country_name,  // or masked if needed
      //   account_holder_name: card.account_holder_name,
      //   account_number: card.account_number,
      //   ifsc_code: card.ifsc_code,
      //   postal_code: card.postal_code,
      //   user_type: card.user_type,
      // }));
      
      // res.status(200).json(formattedCard);

      res.status(200).json(results)

  } catch (error) {
   await con.rollback();
   console.error('Error:',error);
   res.status(500).json({result:"Internal Server Error"});
  } finally {
    con.release();
  }
}

const updateBankDetails = async(req,res,next) => {

    const con = await connection();
    const user = req.user;  // Extract user details
    ////console.log("user_details---", user);
    const userID = user.user_id;
    ////console.log("user_id---", userID);
    const type = req.user.user_type;

    try {
      ////console.log(req.body);
      const bank_id = req.body.bank_id;
      await con.beginTransaction();  // Start the transaction

      // Fetch the existing user details
      const [[existingCard]] = await con.query('SELECT * FROM tbl_user_bank_details WHERE user_id = ? AND bank_id=? ', [userID,bank_id]);

      if (!existingCard) {
        await con.rollback();
        res.status(200).json({ result: "Data not found" });
        return;
      }
      // Update user details
      const updatedCard = {
        country_name: req.body.country_name || existingCard.country_name,
        account_holder_name: req.body.account_holder_name || existingCard.account_holder_name,
        account_number: req.body.account_number || existingCard.account_number,
        ifsc_code: req.body.ifsc_code || existingCard.ifsc_code,
        postal_code: req.body.postal_code || existingCard.postal_code 
      };

      const sql = 'UPDATE `tbl_user_bank_details` SET `country_name`=?,`account_holder_name`=?,`account_number`=?,`ifsc_code`=?,postal_code=? WHERE `bank_id`=? AND `user_id`=?';
      const values = [ 
        updatedCard.country_name, 
        updatedCard.account_holder_name,
        updatedCard.account_number,
        updatedCard.ifsc_code,
        updatedCard.postal_code,
        bank_id,
        userID
      ];

      const [results] = await con.query(sql, values);
      await con.commit();  // Commit the transaction

      res.status(200).json({ result: 'success' });

    } catch (error) {
    await con.rollback();
    console.error('Error:',error);
    res.status(500).json({result:"Internal Server Error"});
    } finally {
      con.release();
    }
}

  const fetchWalletDetails = async (req, res, next) => {
    const con = await connection();
    const user = req.user;  // Extract user details
    ////console.log("user_details---", user);
    const userID = user.user_id;
    const type = req.user.user_type;

    try {
      await con.beginTransaction();  // Start the transaction

      // Fetch user details to get wallet balance
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID , type]);

      if (!existingUser) {
        await con.rollback();
        res.status(200).json({ result: "User not found" });
        return;
      }
     
      const walletAmount = (type === "Owner") ? existingUser.owner_wallet : existingUser.user_wallet;

      // Fetch bank details
      const [[existingCard]] = await con.query('SELECT * FROM tbl_user_bank_details WHERE user_id = ?', [userID]);

      let BankStatus, bankDetails;

      // If bank details exist, set BankStatus to 'true' and include bank details in the response
      if (existingCard) {
        BankStatus = 'true';
        bankDetails = existingCard;  // Store the bank details
      } else {
        BankStatus = 'false';
        // dataBank = null;  // No bank details found
      }

      await con.commit();  // Commit the transaction


          // Construct the final response
        const response = {
          walletAmount,
          BankStatus
        };

        // If bank details exist, append them directly to the response
        if (BankStatus === 'true') {
          response.bank_id = bankDetails.bank_id;
          response.user_id = bankDetails.user_id;
          response.user_type = bankDetails.user_type;
          response.country_name = bankDetails.country_name;
          response.account_holder_name = bankDetails.account_holder_name;
          response.account_number = bankDetails.account_number;
          response.ifsc_code = bankDetails.ifsc_code;
          response.postal_code = bankDetails.postal_code;
        res.status(200).json(response);
      } else {
        res.status(200).json({
          walletAmount,
          BankStatus  // Only return walletAmount and BankStatus when bank details are not found
        });
      }

    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
  };

  const fetchCurrency = async(req,res,next) => {
    const con = await connection();

    try {
      const [fetchCurrency] = await con.query('SELECT * FROM tbl_locations WHERE status=? AND deleted=?',['Active', 'No']);

      await con.commit();
          // Format the result using map to return specific fields
    const formattedCurrency = fetchCurrency.map(card => ({
      currency_id : card.id ,
      currency_name: card.currency_name,  // or masked if needed
      currency_symbol: card.currency_symbol,
      currency_country: card.currency_country,
    }));
    
    res.status(200).json(formattedCurrency);

    }  catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
    
  }

  
  const currencyRate = async (req, res, next) => {
    const con = await connection();
    try {
      // Fetch active currencies from the database
      const [rows] = await con.query(
        "SELECT DISTINCT currency_name FROM tbl_locations WHERE status = ? AND deleted = ?",
        ['Active', 'No']
      );
  
      // Extract dynamic currency pairs from the active rows
      const currencyPairs = rows.map(row => row.currency_name);
  
      for (const base of currencyPairs) {
        const req_url = `https://v6.exchangerate-api.com/v6/11d84f91860d02139e906d0b/latest/${base}`;
        const response = await axios.get(req_url);
        const data = response.data;
        const conversion_rates = data.conversion_rates;
  
        const date = new Date().toISOString().slice(0, 10); // Current date
        const time = new Date().toISOString().slice(11, 19); // Current time
  
        // Fetch the list of new currencies from the conversion rates
        // const newCurrencies = Object.keys(conversion_rates);
        // for (const currency of newCurrencies) {
        for (const currency of currencyPairs) {
          const rate = conversion_rates[currency].toFixed(2);
  
          // Check if the currency pair exists in the table
          const [existingPair] = await con.query(
            "SELECT * FROM add_currency_exchange_rate WHERE base_currency = ? AND new_currency = ?",
            [base, currency]
          );
  
          if (existingPair.length > 0) {
            // If the currency pair exists, update it
            await con.query(
              "UPDATE add_currency_exchange_rate SET rate = ?, date = ?, time = ? WHERE base_currency = ? AND new_currency = ?",
              [rate, date, time, base, currency]
            );
          } else {
            // If the currency pair does not exist, insert it
            await con.query(
              "INSERT INTO add_currency_exchange_rate (base_currency, new_currency, rate, date, time) VALUES (?, ?, ?, ?, ?)",
              [base, currency, rate, date, time]
            );
          }
        }
      }
  
      res.status(200).send('Currency rates updated successfully');
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      con.release();
    }
  }
  

  const importantData = async(req,res,next) => {
    const con = await connection();
    const user = req.user;  // Extract user details
    ////console.log("user_details---", user);
    const userID = user.user_id;
    const type = req.user.user_type;

    try {
      await con.beginTransaction();  // Start the transaction

      // Fetch user details to get wallet balance
      const [[existingUser]] = await con.query('SELECT * FROM tbl_important_credentials');

      // Fetch bank details
      const [[existingCard]] = await con.query('SELECT * FROM tbl_deposit_rate');

         // Fetch bank details
      const [[existingContact]] = await con.query('SELECT * FROM tbl_support');

      await con.commit();  // Commit the transaction
      ////console.log(secretKey);
      //  // Encrypt the sensitive information before sending it in the response
      // const encryptedStripeSecretKey = encrypt(existingUser.stripe_secret_key, secretKey);
      // const encryptedStripePublishKey = encrypt(existingUser.stripe_publish_key, secretKey);
      // const encryptedPaypalClientId = encrypt(existingUser.paypal_client_id, secretKey);
      // const encryptedPaypalSecretKey = encrypt(existingUser.paypal_secret_key, secretKey);

      //   // Construct the final response and ensure it's properly initialized
      // let response = {
      //   stripe_secret_key: encryptedStripeSecretKey,
      //   stripe_publish_key: encryptedStripePublishKey,
      //   paypal_client_id: encryptedPaypalClientId,
      //   paypal_secret_key: encryptedPaypalSecretKey,
      //   deposit_rate_percentage: existingCard.deposit_rate_per,
      //   decryption_secret_key : secretKey,
      //   vat_tax_rate : existingUser.vat_tax_rate
      // };

        // Encrypt the sensitive information before sending it in the response
        const encryptedStripeSecretKey = existingUser.stripe_secret_key;
        const encryptedStripePublishKey = existingUser.stripe_publish_key;
        const encryptedPaypalClientId = existingUser.paypal_client_id;
        const encryptedPaypalSecretKey = existingUser.paypal_secret_key;
  
          // Construct the final response and ensure it's properly initialized
        let response = {
          stripe_secret_key: encryptedStripeSecretKey,
          stripe_publish_key: encryptedStripePublishKey,
          paypal_client_id: encryptedPaypalClientId,
          paypal_secret_key: encryptedPaypalSecretKey,
          deposit_rate_percentage: existingCard.deposit_rate_per,
          decryption_secret_key : secretKey,
          vat_tax_rate : existingUser.vat_tax_rate,
          support_email : existingContact.support_email,
          country_code : existingContact.country_code,
          support_contact : existingContact.support_contact
        };
      res.status(200).json(response);

    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
  }

  const withdrawRequest = async(req,res,next) => {
    const con = await connection();
    const user = req.user;  // Extract user details
    ////console.log("user_details---", user);
    const userID = user.user_id;
    const type = req.user.user_type;
    const transaction_number = 'pay_' + [...Array(14)].map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.random() * 62)).join('');

    try {
      await con.beginTransaction();
    
      // Fetch user details to get wallet balance
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
    
      if (!existingUser) {
        await con.rollback();
        res.status(200).json({ result: "User not found" });
        return;
      }
    
      const current_wallet_amount = parseFloat((type === "Owner") ? existingUser.owner_wallet : existingUser.user_wallet);
      const withdrawal_amount = parseFloat(req.body.withdrawal_amount);
      const new_wallet_amount = current_wallet_amount - withdrawal_amount;
    
      if (current_wallet_amount < withdrawal_amount) {
        await con.rollback();
        res.status(200).json({ result: "Insufficient amount" });
        return;
      }

      if(withdrawal_amount < '10') {
        await con.rollback();
        res.status(200).json({ result: "The withdrawal amount must be at least 10" });
        return;
      }
    
      const card_id = 0;
      const bank_id = req.body.bank_id;
    
      const sql = 'INSERT INTO `tbl_transactions`(`transaction_number`, `user_id`, `wallet_type`, `transaction_type`, `withdrawal_amount`, `current_wallet_amount`, `transaction_mode`, `card_id`, `bank_id`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const values = [
        transaction_number, // Generate the transaction number before using it
        userID,
        type,
        'Withdrawal',
        req.body.withdrawal_amount,
        new_wallet_amount,
        req.body.transaction_mode,
        card_id,
        bank_id,
        'Pending'
      ];
    
      const [result] = await con.query(sql, values);
    
      if (result) {
        const walletField = type === "Owner" ? "owner_wallet" : "user_wallet";
        await con.query(`UPDATE tbl_user SET ${walletField} = ? WHERE user_id = ?`, [new_wallet_amount, userID]);
      }
    
      await con.commit();
      res.status(200).json({ result: 'Your Withdraw Request Has Submitted Successfully. Please Wait For Admin Confirmation' });
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
  }

  const depositAmount = async (req, res, next) => {
    const con = await connection();
    const user = req.user;
    const userID = user.user_id;
    const type = req.user.user_type;
  
    try {
      con.beginTransaction();
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
  
      if (!existingUser) {
        await con.rollback();
        return res.status(200).json({ result: "User not found" });
      }
  
      const bank_id = 0;
      const card_id = (req.body.card_id === "") ? 0 : req.body.card_id;

      const current_wallet_amount = parseFloat((type === "Owner") ? existingUser.owner_wallet : existingUser.user_wallet);
      const transaction_amount = parseFloat(req.body.transaction_amount);
      const new_wallet_amount = current_wallet_amount + transaction_amount;
  
      const sql = 'INSERT INTO `tbl_transactions`(`transaction_number`, `user_id`, `wallet_type`, `transaction_type`, `transaction_amount`, `deposit_amount`, `current_wallet_amount`, `transaction_mode`, `card_id`, `bank_id`,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
      const values = [
        req.body.transaction_number,
        userID,
        type,
        'Deposite',
        transaction_amount,
        req.body.deposite_amount,
        new_wallet_amount,
        req.body.transaction_mode,
        card_id,
        bank_id,
        'Completed'
      ];
  
      const [result] = await con.query(sql, values);
  
      if (result) {
        if (type === "Owner") {
          await con.query('UPDATE `tbl_user` SET owner_wallet=? WHERE user_id=?', [new_wallet_amount, userID]);
        } else {
          await con.query('UPDATE `tbl_user` SET user_wallet=? WHERE user_id=?', [new_wallet_amount, userID]);
        }
      }
  
      await con.commit();
      res.status(200).json({ result: 'Success' });
      
    } catch (error) {
      await con.rollback();
      ////console.log('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
  };
  

  const withdrawHistory = async(req,res,next) => {
    const con = await connection();
    const user = req.user;
    const userID = user.user_id;
    const type = req.user.user_type;
    
    try {

       // Fetch user details to get wallet balance
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID , type]);
      
      const userName = existingUser.first_name + ' ' + existingUser.last_name || "";

      const [fetchData] = await con.query('SELECT * FROM tbl_transactions WHERE user_id = ? AND wallet_type= ? AND transaction_type=? ORDER BY `transaction_id` DESC ', [userID, type ,'Withdrawal']);

      if (!fetchData) {
        await con.rollback();
        res.status(200).json({ result: "Data not found" });
        return;
      }

      await con.commit();

      // Format the result using map to return specific fields
      const formattedData = fetchData.map(withdrawData => {
        const dateObj = new Date(withdrawData.created_at);
        
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
  
        const formattedTime = dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true // Ensures time is formatted in AM/PM
        });
  
        return {
          transaction_id  : withdrawData.transaction_id  ,
          withdrawal_amount: withdrawData.withdrawal_amount,  // or masked if needed
          transaction_number: withdrawData.transaction_number,
          current_wallet_amount: withdrawData.current_wallet_amount, 
          userName:userName,
          status: withdrawData.status,
          date: `${formattedDate}, ${formattedTime}`
        };
      });
    
    res.status(200).json(formattedData);

    }  catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
  }

  const dipositeHistory = async (req, res, next) => {
    const con = await connection();
    const user = req.user;
    const userID = user.user_id;
    const type = req.user.user_type;
  
    try {
      // Fetch user details to get wallet balance
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
  
      const userName = existingUser.first_name + ' ' + existingUser.last_name || "";
  
      const [fetchData] = await con.query('SELECT * FROM tbl_transactions WHERE user_id = ? AND wallet_type= ? AND transaction_type=? ORDER BY `transaction_id` DESC ', [userID, type, 'Deposite']);
  
      if (!fetchData) {
        await con.rollback();
        res.status(200).json({ result: "Data not found" });
        return;
      }
  
      await con.commit();
  
      // Format the result using map to return specific fields
      const formattedData = fetchData.map(withdrawData => {
        const dateObj = new Date(withdrawData.created_at);
        
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
  
        const formattedTime = dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          //hour12: false
          hour12: true // Ensures time is formatted in AM/PM
        });
  
        return {
          transaction_id: withdrawData.transaction_id,
          transaction_amount: withdrawData.transaction_amount,
          deposite_amount: withdrawData.deposit_amount,  // or masked if needed
          transaction_number: withdrawData.transaction_number,
          current_wallet_amount: withdrawData.current_wallet_amount, 
          userName: userName,
          status: withdrawData.status,
          date: `${formattedDate}, ${formattedTime}`
        };
      });
  
      res.status(200).json(formattedData);
  
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
  };

  
  const transactionHistory = async (req, res, next) => {
    const con = await connection();
    const user = req.user;
    const userID = user.user_id;
    const type = req.user.user_type;
  
    try {
      // Fetch user details to get wallet balance
      const [[existingUser]] = await con.query(
        "SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?",
        [userID, type]
      );
  
      if (!existingUser) {
        return res.status(404).json({ result: "User not found" });
      }
  
      const userName = `${existingUser.first_name || ""} ${existingUser.last_name || ""}`.trim();
  
      // Fetch transaction data
      const [fetchData] = await con.query(
        "SELECT * FROM tbl_transactions WHERE user_id = ? AND wallet_type = ? ORDER BY `transaction_id` DESC",
        [userID, type]
      );
  
      // if (!fetchData || fetchData.length === 0) {
      //   return res.status(200).json({ result: "Data not found" });
      // }
  
      // Format the result using map to return specific fields
      const formattedData = fetchData.map((transaction) => {
        const dateObj = new Date(transaction.created_at);
  
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  
        const formattedTime = dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true, // Ensures time is formatted in AM/PM
        });
  
        return {
          transaction_id: transaction.transaction_id,
          card_id: transaction.card_id,
          booking_id: transaction.booking_id,
          transaction_amount: transaction.transaction_amount,
          deposit_amount: transaction.deposit_amount, // or masked if needed
          transaction_number: transaction.transaction_number,
          transaction_type: transaction.transaction_type,
          withdrawal_amount: transaction.withdrawal_amount,
          current_wallet_amount: transaction.current_wallet_amount,
          transaction_mode: transaction.transaction_mode,
          userName: userName,
          status: transaction.status,
          date: `${formattedDate}, ${formattedTime}`,
        };
      });
  
      // Respond with the formatted data
      return res.status(200).json(formattedData );
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
  };
  

const addRating = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');

  //for seprate date & time 
  const currentTime = moment().tz("Asia/Kolkata");
  const date = currentTime.format('YYYY-MM-DD');
  const time = currentTime.format('hh:mm A');
  try {
    con.beginTransaction();
    const booking_id = req.body.booking_id;
    // Fetch user details (to get wallet balance, if necessary)
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    
    if (!existingUser) {
      return res.status(404).json({ result: "User not found" });
    }
   
    const [[existingBooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ?', [booking_id]);

    if (!existingBooking) {
      await con.rollback();
      return res.status(200).json({ result: "Booking not found" });
    }

    let  owner_id , user_id
    if(type === "User")
    {
     owner_id = existingBooking.owner_id;
     user_id = userID;
    } else {
     owner_id = userID;
     user_id = existingBooking.user_id;
    }
    const vehicle_id = existingBooking.vehicle_id;

    // Fetch user details (to get wallet balance, if necessary)
    const [existingRating] = await con.query('SELECT * FROM tbl_rating WHERE booking_id  = ? AND user_type = ?', [booking_id,type]);
    
    if (existingRating.length > 0) {
      return res.status(200).json({ result: "Already Rated" });
    }
    
    const sql = 'INSERT INTO `tbl_rating`(`user_type`, `user_id`, `owner_id`, `booking_id`, `vehicle_id`, `cleanliness`, `convenience`, `communication`, `overall_rating`, `review`,ratingdate,time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
    const values = [
      type,
      user_id,
      owner_id,
      booking_id,
      vehicle_id,
      req.body.cleanliness,
      req.body.convenience,
      req.body.communication,
      req.body.overall_rating,
      req.body.review,
      date,
      time
    ];

    const [result] = await con.query(sql, values);
    await con.commit();
    res.status(200).json({ result: 'Success' });
    
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const fetchRating = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = user.user_type;
  const BASEURL = `http://${process.env.Host}/images/profiles/`;

  try {
    // Fetch user details (to get wallet balance, if necessary)
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    
    if (!existingUser) {
      return res.status(404).json({ result: "User not found" });
    }

    // Determine query based on user type
    let fetchDataQuery;
    if (type === 'User') {
      fetchDataQuery = `
        SELECT r.*, o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
               o.profile_image AS owner_image, v.vehicle_name
        FROM tbl_rating r
        JOIN tbl_user o ON r.owner_id = o.user_id
        LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.user_id = ? AND r.user_type = 'Owner' ORDER BY r.rating_id  DESC
      `;
    } else {
      fetchDataQuery = `
        SELECT r.*, u.first_name AS user_first_name, u.last_name AS user_last_name, 
               u.profile_image AS user_image, v.vehicle_name
        FROM tbl_rating r
        JOIN tbl_user u ON r.user_id = u.user_id
        LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.owner_id = ? AND r.user_type = 'User' ORDER BY r.rating_id  DESC
      `;
    }

    // Fetch ratings and related user/vehicle data in one query
    const [fetchData] = await con.query(fetchDataQuery, [userID]);

    // if (fetchData.length === 0) {
    //   return res.status(404).json({ result: "Data not found" });
    // }

    // Format the result using the map function
    const formattedData = fetchData.map(ratingData => {
      // Handle user/owner info based on the type
      let userName, userImage;
      if (type === 'User') {
        userName = ratingData.owner_first_name + ' ' + ratingData.owner_last_name;
        userImage = ratingData.owner_image ? `${BASEURL}${ratingData.owner_image}` : '';
      } else {
        userName = ratingData.user_first_name + ' ' + ratingData.user_last_name;
        userImage = ratingData.user_image ? `${BASEURL}${ratingData.user_image}` : '';
      }

      // Format the response
      return {
        rating_id: ratingData.rating_id,
        booking_id: ratingData.booking_id,
        cleanliness: ratingData.cleanliness,
        convenience: ratingData.convenience,
        communication: ratingData.communication,
        overall_rating: ratingData.overall_rating,
        review: ratingData.review,
        userName: userName,
        userImage: userImage,
        vehicle_name: ratingData.vehicle_name || '',
        date:ratingData.ratingdate,
        time:ratingData.time
      };
    });

    await con.commit();
    res.status(200).json(formattedData);

  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const contactSupportRequest = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  var userTimezone = moment.tz.guess();
  const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
  const currentTime = moment().tz(userTimezone);
  const date = currentTime.format('YYYY-MM-DD');
  const time = currentTime.format('hh:mm A');  

  try {
    const message =  req.body.message;
    const complain_number = Math.floor(1000 + Math.random() * 9000);
    con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }


    const userName = `${existingUser.first_name || ""} ${existingUser.last_name || ""}`.trim();

    if (message == "") {
      await con.rollback();
      return res.status(200).json({ result: "Message cannot be empty!" });
    }

    const sql = 'INSERT INTO `tbl_contact_support`(`user_type`, `user_id`, `booking_id`, `subject`, `email`, `message`, `complain_number`, `status`, `date`, `time`) VALUES (?,?,?,?,?,?,?,?,?,?)';
    const values = [
      type,
      userID,
      req.body.booking_id,
      req.body.subject,
      req.body.email,
      message,
      complain_number,
      'opened',
      date,
      time,
    ];

    const [result] = await con.query(sql, values);

    if (result) {
      const updateSql = 'INSERT INTO `tbl_contact_support_threads_list`(`complain_number`, `user_id`, `role`, `message`,`date`, `time`) VALUES (?,?,?,?,?,?)'
      const sqlvalues = [
        complain_number,
        userID,
        'customer',
        message,
        date,
        time,
      ];
  
      const [result] = await con.query(updateSql, sqlvalues);
      
      let title1 ,body1;
      title1 = `User ${userName} requested for contact support with complain ticket ${complain_number}`;
      body1 =  message;

      const sql_notify = `INSERT INTO tbl_notification_list (notification_type, booking_id, user_id, user_type, title, message, date, time)  VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `;

      await con.query(sql_notify, ['Help&Support','0', userID, 'Admin', title1, body1, date, time]);

      // Send push notification
      sendSinglePushNotification({ user_id: userID, title: title1, body: body1, });
    }

    await con.commit();

    res.status(200).json({ result: 'Success' });
    
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchSupportComplainList = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  ////console.log(userID);
  ////console.log(type);
  try {

      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

      if (!existingUser) {
        await con.rollback();
        return res.status(200).json({ result: "User not found" });
      }
      
     const [fetchSupport] = await con.query('SELECT * FROM tbl_contact_support WHERE user_type=? AND user_id=?',[ type,userID]);

      if (!fetchSupport) {
        await con.rollback();
        res.status(200).json({ result: "Data not found" });
        return;
      }

      await con.commit();
          // Format the result using map to return specific fields
     const formattedSupport = fetchSupport.map(support => ({
      subject : support.subject ,
      email: support.email,  // or masked if needed
      message: support.message,
      complain_number: support.complain_number,
      status: support.status,
      date: support.date,
      time: support.time,
      timestamp: support.timestamp
    }));
    
    res.status(200).json(formattedSupport);
    
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const fetchSingleComplain  = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  try {
      const complain_number = req.body.complain_number;
      ////console.log(complain_number)
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

      if (!existingUser) {
        await con.rollback();
        return res.status(200).json({ result: "User not found" });
      }
      
     const [fetchSupport] = await con.query('SELECT * FROM tbl_contact_support_threads_list WHERE complain_number = ?',[complain_number]);

      if (!fetchSupport) {
        await con.rollback();
        res.status(200).json({ result: "Data not found" });
        return;
      }

      await con.commit();
          // Format the result using map to return specific fields
     const formattedSupport = fetchSupport.map(support => ({
      user_id: support.user_id,  // or masked if needed
      message: support.message,
      complain_number: support.complain_number,
      role: support.role,
      date: support.date,
      time: support.time,
      timestamp: support.timestamp
    }));
    
    res.status(200).json(formattedSupport);
    
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const replyComplainTicket = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;

  //for seprate date & time 
  var userTimezone = moment.tz.guess();
  const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
  const currentTime = moment().tz(userTimezone);
  const date = currentTime.format('YYYY-MM-DD');
  const time = currentTime.format('hh:mm A');  

  try {
    const message =  req.body.message;
    const complain_number = req.body.complain_number;
    ////console.log(complain_number);
    con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    const userName = `${existingUser.first_name || ""} ${existingUser.last_name || ""}`.trim();

    if (message == "") {
      await con.rollback();
      return res.status(200).json({ result: "Message cannot be empty!" });
    }
      // Sanitize the input
    const [results] = await con.query('SELECT * FROM tbl_contact_support WHERE complain_number=?',[complain_number]);

    if (results.length == 0){
      await con.rollback();
      return res.status(200).json({ result: "Invalid Compain Id" });
    }
    const updateSql = 'INSERT INTO `tbl_contact_support_threads_list`(`complain_number`, `user_id`, `role`, `message`,`date`, `time`) VALUES (?,?,?,?,?,?)'
    const sqlvalues = [
        complain_number,
        userID,
        'customer',
        message,
        date,
        time,
      ];
  
    await con.query(updateSql, sqlvalues);

    let title1 ,body1;
      title1 = `User ${userName} response for complain ticket ${complain_number}`;
      body1 =  message;

      const sql_notify = `INSERT INTO tbl_notification_list (notification_type, booking_id, user_id, user_type, title, message, date, time)  VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `;

      await con.query(sql_notify, ['Help&Support','0', userID, 'Admin', title1, body1, date, time]);

      // Send push notification
      sendSinglePushNotification({ user_id: userID, title: title1, body: body1, });


    await con.commit();
    res.status(200).json({ result: 'Success' });
    
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const closeComplainTicket = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  try {

    const complain_number = req.body.complain_number;
    con.beginTransaction();

    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    const [result] = await con.query('SELECT * FROM tbl_contact_support WHERE complain_number=?',[complain_number]);
    if (result.length == 0) {
      await con.rollback();
      return res.status(200).json({ result: "Invalid Compain Id" });
    }

    await con.query('UPDATE `tbl_contact_support` SET `status`=?,`closed_by`=? WHERE user_id=? AND complain_number=?',['closed','User',userID,complain_number]);
    
    await con.commit();

    res.status(200).json({result : "Success"})
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }

}

const fetchMakeList = async (req, res, next) => {
  const con = await connection();
  const BaseUrl = `http://${process.env.Host}/images/vehicleUploads/`;
  const make_name = req.body.make_name || ""; // Default to empty string if not provided

  try {
    await con.beginTransaction();

    let fetchSupport;

    // Check if 'make_name' is empty
    if (make_name === "") {
      // Fetch all active make models if no make_name is provided
      [fetchSupport] = await con.query('SELECT * FROM tbl_make_models WHERE status = ? AND deleted = ?', ['Active', 'No']);
    } else {
      // Fetch make models that match the provided 'make_name'
      [fetchSupport] = await con.query('SELECT * FROM tbl_make_models WHERE make_name LIKE ? AND status = ? AND deleted = ?', [`%${make_name}%`, 'Active' , 'No']);
    }

    await con.commit();

    // Format the response
    const formattedSupport = fetchSupport.map(support => ({
      id: support.id,
      make_name: support.make_name,
      make_image: support.make_image === "" ? "" : `${BaseUrl}${support.make_image}`,  // Corrected image assignment
    }));

    // Send the formatted response
    res.status(200).json(formattedSupport);

  } catch (error) {
    await con.rollback();
    console.error('error', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchModelList = async (req, res, next) => {
  const con = await connection();
  const make_name = req.body.make_name; // Ensure 'make_name' is passed in the request body
  try {
    await con.beginTransaction();

    // Correct SQL query with LIKE and parameterized input for partial matching
    const [fetchSupport] = await con.query('SELECT * FROM tbl_make_models WHERE deleted = "No" AND make_name LIKE ?', [`%${make_name}%`]);
    
    await con.commit();
    ////console.log(fetchSupport.length);
    if(fetchSupport.length> '0')
    {
      const [[fetchSupports]] = await con.query('SELECT * FROM tbl_make_models WHERE deleted = "No" AND make_name LIKE ?', [`%${make_name}%`]);
      const modelsArray = JSON.parse(fetchSupports.models_name); 
      const formattedModels = modelsArray.map(model => ({ model_name: model }));
      res.status(200).json(formattedModels);
    } 
    else
    {
      const FDAta =[];
      res.status(200).json(FDAta);
    }
  } catch (error) {
    await con.rollback();
    console.error('error', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchFeatureList = async(req,res,next) => {
  const con = await connection();
  const BaseUrl = `http://${process.env.Host}/images/vehicleUploads/`;
  try {
    await con.beginTransaction();
    const [fetchSupport] = await con.query('SELECT * FROM tbl_vehicle_features WHERE status = ?', ['Active']);

    await con.commit();

    const formattedSupport = fetchSupport.map(support => ({
      feature_id  :support.feature_id  ,
      feature_name : support.feature_name ,
      feature_image: support.feature_image === "" ? "" : `${BaseUrl}${support.feature_image}`,  // Corrected image assignment
    }));

    // Send the formatted response
    res.status(200).json(formattedSupport);
    
  } catch (error) {
    await con.rollback();
    console.error('error',error);
    res.error(500).json({result:"Internal Server Error"})
  } finally {
    con.release();
  }
}

const fetchCarTypeList = async(req,res,next) => {
  const con = await connection();
  const BaseUrl = `http://${process.env.Host}/images/vehicleUploads/`;
   // Print the entire req.body to debug
   ////console.log("Full body -->", req.body);
  const user_type = req.body.user_type
  ////console.log(user_type);
  try {
    await con.beginTransaction();
 
    const [fetchSupport] = await con.query('SELECT * FROM tbl_vehicle_types WHERE status = ?', ['Active']);

    await con.commit();

    const formattedSupport = fetchSupport.map(support => ({
      type_id  :support.type_id  ,
      type_name: support.type_name,
      type_image: support.type_image === "" ? "" : `${BaseUrl}${support.type_image}`,  // Corrected image assignment
      type_insurance_price: support.type_insurance_price,
      type_security_deposits: support.type_security_deposits,
      currency :support.currency,
    }));

    // Send the formatted response
    res.status(200).json(formattedSupport);
    
  } catch (error) {
    await con.rollback();
    console.error('error',error);
    res.error(500).json({result:"Internal Server Error"})
  } finally {
    con.release();
  }
}

const switchUserOwner = async (req, res, next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;

  //console.log(userID);
  //console.log(type);

  const user_type = (type === 'Owner') ? 'User' : 'Owner';
  //console.log(user_type);

  try {
    await con.beginTransaction();

    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?', [userID, type]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    if(user_type === 'Owner' && existingUser.owner_doc_status === 'Pending' && ( existingUser.owner_document_images=== "" || existingUser.owner_doc_expiry_date=== "" || existingUser.business_name=== "")) 
    {
      await con.rollback();
      return res.status(200).json({ result: "Fill owner data" });
    }

    if(user_type === 'Owner' &&  existingUser.owner_doc_status === 'Unverified' && ( existingUser.owner_document_images!= "" || existingUser.owner_doc_expiry_date!= "" || existingUser.business_name!= ""))
    {
      await con.rollback();
      return res.status(200).json({ result: "Fill owner data" });
    }

    if ( user_type === 'Owner' && existingUser.owner_doc_status === 'Pending' && existingUser.owner_document_images != "" &&  existingUser.owner_doc_expiry_date != "" && existingUser.business_name != "" ) {
       await con.rollback();
      return res.status(200).json({ result: "Already request submitted!!!" });
    } 

    await con.query('UPDATE `tbl_user` SET `user_type` = ? WHERE user_id = ?', [user_type, userID]);
    await con.commit();
    res.status(200).json({ result: "Success" });

  } catch (error) {
    await con.rollback();
    console.error('Error in switching:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};


const fetchvehicleSeatList = async(req,res,next) => {
  const con = await connection();
  try {
    await con.beginTransaction();
    const [fetchSupport] = await con.query('SELECT * FROM tbl_vehicle_seats WHERE status = ?', ['Active']);

    await con.commit();

    const formattedSupport = fetchSupport.map(support => ({
      seat_id   :support.seat_id   ,
      seat_number : support.seat_number 
    }));

    // Send the formatted response
    res.status(200).json(formattedSupport);
    
  } catch (error) {
    await con.rollback();
    console.error('error',error);
    res.error(500).json({result:"Internal Server Error"})
  } finally {
    con.release();
  }
}

const fetchCountryList = async (req, res, next) => {
 const con = await connection();
 ////console.log('Connection:', con);
  try {
    // Ensure connection is established
    const user_type = req.body.user_type;
   // //console.log('User Type:', user_type);
    const BaseUrl = `http://${process.env.Host}/images/icons/`;
    
    await con.beginTransaction();
    let fetchDataQuery;

    // Validate user_type and build query
    if (user_type === 'User' || user_type === 'Guest' || user_type === 'Owner') {
      fetchDataQuery = `SELECT * FROM tbl_locations WHERE deleted='No' AND status='Active' ORDER BY country_name ASC`;
    } else {
      throw new Error("Invalid user_type provided.");
    }
   // //console.log('Query:', fetchDataQuery);
    // Ensure fetchDataQuery is defined
    if (!fetchDataQuery) {
      throw new Error("No query to execute.");
    }

    // Execute query
    const [fetchCurrency] = await con.query(fetchDataQuery);

    // Format the result using map
    const formattedCurrency = fetchCurrency.map(card => ({
      country_name: card.country_name,
      country_image: card.country_image === "" ? "" : `${BaseUrl}${card.country_image}`, // Corrected image assignment
    }));

    await con.commit();
    res.status(200).json(formattedCurrency);

  } catch (error) {
    // Rollback and log error
    if (con) await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error", error: error.message });
  } finally {
    // Release connection safely
    if (con) con.release();
  }
};


const FetchAllData =  async(req,res,next) => {
  const con = await connection();
  const user_type = req.body.user_type;
  const BaseUrl = `http://${process.env.Host}/images/vehicleUploads/`;
  try {
    await con.beginTransaction();
    const [fetchSupport] = await con.query('SELECT * FROM tbl_vehicle_features WHERE status = ?', ['Active']);
    const featureList = fetchSupport.map(support => ({
      feature_id  :support.feature_id  ,
      feature_name : support.feature_name ,
      feature_image: support.feature_image === "" ? "" : `${BaseUrl}${support.feature_image}`,  // Corrected image assignment
    }));

    const [fetchFuelData] = await con.query('SELECT * FROM tbl_fuel_type WHERE status = ?', ['Active']);
    const fuelList = fetchFuelData.map(fueldata => ({
      fuel_id   :fueldata.fuel_id   ,
      fuel_name: fueldata.fuel_name == "" ? "" : fueldata.fuel_name,  // Corrected image assignment
    }));

    const [fetchtypes] = await con.query('SELECT * FROM tbl_vehicle_types WHERE status = ?', ['Active']);
    const carTypeList = fetchtypes.map(types => ({
      type_id  :types.type_id  ,
      type_name: types.type_name,
      type_image: types.type_image === "" ? "" : `${BaseUrl}${types.type_image}`,  // Corrected image assignment
      type_insurance_price: types.type_insurance_price,
      type_security_deposits: types.type_security_deposits,
      currency :types.currency,
    }));

    const [fetchSeat] = await con.query('SELECT * FROM tbl_vehicle_seats WHERE status = ?', ['Active']);
    const carSeatList = fetchSeat.map(Seat => ({
      seat_id   :Seat.seat_id   ,
      seat_number : Seat.seat_number 
    }));

    const [fetchCurrency] = await con.query('SELECT * FROM tbl_locations WHERE status=? AND deleted=?',['Active', 'No']);
    const currencyList = fetchCurrency.map(card => ({
      currency_id : card.id ,
      currency_name: card.currency_name,  // or masked if needed
      currency_symbol: card.currency_symbol,
      currency_country: card.currency_country,
    }));

    let fetchDataQuery;
    if (user_type === 'User' || user_type === 'Guest' ) {
      fetchDataQuery = `SELECT * FROM tbl_locations WHERE status='Active' ORDER BY country_name ASC`;
    } else (user_type === 'Owner' ) 
    {
      fetchDataQuery = `SELECT * FROM tbl_locations WHERE status='Active' ORDER BY country_name ASC`;
    }
    const [fetchLocation] = await con.query(fetchDataQuery);
    await con.commit();
    const locationList = fetchLocation.map(card => ({
      country_name: card.country_name
    }));

    await con.commit();
       // Construct the final response
       const response = {
        featureList,
        carTypeList,
        carSeatList,
        currencyList,
        locationList,
        fuelList,
      };
    // Send the formatted response
    res.status(200).json(response);
  } catch (error) {
    await con.rollback();
    console.error('error',error);
    res.error(500).json({result:"Internal Server Error"})
  } finally {
    con.release();
  }
}

const addVehicle = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  try {

    console.log(req.body);
    const vehicle_make = req.body.vehicle_make;
    const vehicle_model = req.body.vehicle_model;
    const country_name =  req.body.country_name;
    const make_image = "make.png"

    con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
    if (!existingUser) {
      await con.rollback();
      return  res.status(200).json({ result: "User not found" });
    }
    
    const [result_make] = await con.query('SELECT COUNT(*) AS count FROM tbl_make_models WHERE make_name = ?', [vehicle_make]);

    // If the make doesn't exist in the database, insert a new entry
    if (result_make[0].count === 0) {
      await con.query(
        "INSERT INTO tbl_make_models (make_name, make_image, models_name) VALUES (?, ?, ?)",
        [vehicle_make, make_image, JSON.stringify([vehicle_model])] // Ensure the model is stored as an array
      );
      console.log(`Inserted new make: ${vehicle_make} with model: ${vehicle_model}`);
      //return res.status(200).json({ result: "Make and model inserted successfully" });
    } else {
      // Check if the model already exists for the make
      const [[make]] = await con.query('SELECT models_name FROM tbl_make_models WHERE make_name = ?', [vehicle_make]);

      // Parse the existing models JSON, or start with an empty array
      let existingModels = make.models_name ? JSON.parse(make.models_name) : [];
      console.log('Existing models:', existingModels);

      // Clean and prepare the new model
      const cleanedModel = vehicle_model.trim();

      // Check if the new model already exists
      if (!existingModels.includes(cleanedModel)) {
        // Add the new model to the array
        existingModels.push(cleanedModel);

        // Update the database with the updated models array
        await con.query(
          "UPDATE tbl_make_models SET models_name = ? WHERE make_name = ?",
          [JSON.stringify(existingModels), vehicle_make]
        );

       //console.log(`Updated make: ${vehicle_make} with new model: ${cleanedModel}`);
       // await con.commit();
      //  return res.status(200).json({ result: "Model added to the existing make" });
      }
    }

    const currency = 'USD';

    let vehicle_insurance_images = '';
    let vehicle_images = '';
    let mot_certificate_images = '';

    const time = new Date().toLocaleTimeString();
    const date = new Date().toISOString().split('T')[0];  // Format the date properly

    if (req.files.vehicle_insurance_images) {
        vehicle_insurance_images = req.files.vehicle_insurance_images.map(file => file.filename).join(',');
    }
    if (req.files.vehicle_images) {
        vehicle_images = req.files.vehicle_images.map(file => file.filename).join(',');
    }

    if (req.files.mot_certificate_images) {
      mot_certificate_images = req.files.mot_certificate_images.map(file => file.filename).join(',');
    }
    console.log("vehicle_insurance_images-->",vehicle_insurance_images);
    console.log("vehicle_images-->",vehicle_images)
    console.log("mot_certificate_images-->",mot_certificate_images)

    const sql = 'INSERT INTO `tbl_vehicles`( `owner_id`, `vehicle_name`, `vehicle_make`, `vehicle_model`, `speed`, `fuel_type`, `availability`, `start_time`, `end_time`, `currency`, `price_per_day`,`perday_price_array`, `price_per_week`, `price_per_month`, `location_price`, `daily_distance`, `distance_price`, `pickup_location`,`dropoff_location`, `current_location`, `location_lat`, `location_lng`, `country_name`, `vehicle_type`, `features`, `no_of_seats`, `description`,`transmission`, `pets`, `smoking`, `extras`, `vehicle_insurance_images`, `vehicle_images`, `mot_certificate_images`,`date`, `time`)VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    
    const values = [
        userID,
        req.body.vehicle_name,           
        vehicle_make,   
        vehicle_model,          
        req.body.speed,           
        req.body.fuel_type,                       
        req.body.availability, 
        req.body.start_time,
        req.body.end_time,
        currency,         
        req.body.price_per_day,
        req.body.perday_price_array,
        req.body.price_per_week,          
        req.body.price_per_month,  
        req.body.location_price,
        req.body.daily_distance, 
        req.body.distance_price,
        req.body.pickup_location,
        req.body.dropoff_location,               
        req.body.current_location,                   
        req.body.location_lat,            
        req.body.location_lng,  
        country_name,
        req.body.vehicle_type,          
        req.body.features,  
        req.body.no_of_seats,
        req.body.description, 
        req.body.transmission,
        req.body.pets,
        req.body.smoking,               
        req.body.extras,
        vehicle_insurance_images, 
        vehicle_images,
        mot_certificate_images, 
        date,                            
        time                            
    ];
    console.log("sql-->",sql);
    console.log("values-->",values)
    const [results] = await con.query(sql, values);

    await con.commit();

    res.status(200).json({result : "Success"})
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }

}


const fetchUserVehicleList = async (req, res, next) => {
  const con = await connection();
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');
  const user_type = req.body.user_type;

  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [totalVehiclesData] = await con.query(`
      SELECT COUNT(*) AS total FROM tbl_vehicles WHERE status = 'Active' AND deleted='NO';
    `);
    const totalVehicles = totalVehiclesData[0].total;
    const totalPages = Math.ceil(totalVehicles / limit);

    let fetchData;

    if (user_type === 'User') {
      const user = req.user;
      const user_id = user.user_id;

      [fetchData] = await con.query(
        `SELECT 
          v.*, 
          AVG(r.overall_rating) AS rating,
          CASE 
            WHEN v.plan_id != '0' AND ? <= v.plan_expiry_date THEN 1 
            ELSE 0 
          END AS is_sponsored 
        FROM tbl_vehicles v 
        LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = 'User' 
        WHERE v.status = 'Active' AND v.deleted = 'NO' AND v.owner_id != ? 
        GROUP BY v.vehicle_id 
        ORDER BY is_sponsored DESC, rating DESC 
        LIMIT ? OFFSET ?`,
        [currentDateTime, user_id, limit, offset]
      );
    } else if (user_type === 'Guest') {
      [fetchData] = await con.query(
        `SELECT 
          v.*, 
          AVG(r.overall_rating) AS rating,
          CASE 
            WHEN v.plan_id != '0' AND ? <= v.plan_expiry_date THEN 1 
            ELSE 0 
          END AS is_sponsored 
        FROM tbl_vehicles v 
        LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = 'User' 
        WHERE v.status = 'Active' AND v.deleted = 'NO' 
        GROUP BY v.vehicle_id 
        ORDER BY is_sponsored DESC, rating DESC 
        LIMIT ? OFFSET ?`,
        [currentDateTime, limit, offset]
      );
    }

    const formattedData = await Promise.all(
      fetchData.map(async (vehicleData) => {
        // Fetch the owner details
        const ownerID = vehicleData.owner_id;
        const [[existingOwner]] = await con.query(
          `SELECT * FROM tbl_user WHERE user_id = ? AND deleted = "No" AND status = "Approve"`,
          [ownerID]
        );
    
        // Skip this vehicle if the owner is not valid
        if (!existingOwner) {
          return null;
        }
    
        // Prepare vehicle details
        const vehicleName = vehicleData.vehicle_name || '';
        const pricePerDay =
          vehicleData.price_per_day !== '0.00'
            ? `${vehicleData.price_per_day} / day`
            : vehicleData.price_per_week !== '0.00'
            ? `${vehicleData.price_per_week} / week`
            : `${vehicleData.price_per_month} / month`;
    
        const plan_id = vehicleData.plan_id;
    
        const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
        const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';
    
        const sponsored = vehicleData.is_sponsored === 1 ? 'Yes' : 'No';
    
        let favoriteStatus = 'Dislike';
        if (user_type === 'User') {
          const userID = req.user.user_id;
          const [favoriteData] = await con.query(
            `SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?`,
            [vehicleData.vehicle_id, userID]
          );
    
          if (favoriteData.length > 0) {
            favoriteStatus = favoriteData[0].status || 'Dislike';
          }
        }

        const [bookingData] = await con.query(
          `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
          [vehicleData.vehicle_id] );

       //console.log("bookingData.booking_count--->",bookingData[0].booking_count)
       const bookingCount = bookingData[0].booking_count
        return {
          rating: vehicleData.rating ? parseFloat(vehicleData.rating.toFixed(1)) : 0, // Limit rating to 1 decimal place
          vehicle_id: vehicleData.vehicle_id,
          favorite_status: favoriteStatus,
          speed: vehicleData.speed,
          transmission: vehicleData.transmission,
          no_of_seats: vehicleData.no_of_seats,
          pricePerDay: pricePerDay,
          vehicleName: vehicleName,
          sponsored: sponsored,
          vehicleImage: vehicleImage,
          bookingCount : bookingData[0].booking_count,
        };
      })
    );
    
    // Filter out null results (vehicles without valid owners)
    const filteredData = formattedData.filter(data => data !== null);
    
    res.status(200).json(filteredData);
    
  } catch (error) {
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchOwnerVehicleList = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = user.user_type;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');

   // Get page and limit from request (default values: page = 1, limit = 10)
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;

  try {
     // Count total vehicles (for pagination info)
     const [totalVehiclesData] = await con.query(`
      SELECT COUNT(*) AS total FROM tbl_vehicles WHERE status = 'Active' AND deleted='NO';
    `);
    const totalVehicles = totalVehiclesData[0].total;

    // Calculate total number of pages
    const totalPages = Math.ceil(totalVehicles / limit);

    let fetchDataQuery = `
    SELECT v.*, AVG(r.overall_rating) AS rating,
    ( SELECT COUNT(*)   FROM tbl_bookings b  WHERE b.vehicle_id = v.vehicle_id AND b.booking_status = 'Completed' ) AS booking_count
    FROM  tbl_vehicles v
    LEFT JOIN  tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = 'User'
    WHERE  v.deleted = 'NO' AND v.owner_id = ? GROUP BY  v.vehicle_id  ORDER BY   v.vehicle_id DESC LIMIT ? OFFSET ?;
  `;
    const [fetchData] = await con.query(fetchDataQuery, [userID, limit, offset]);

   //const [fetchData] = await con.query('SELECT v.*, AVG(r.overall_rating) AS rating FROM tbl_vehicles v LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = ? WHERE v.owner_id = ? AND deleted=? GROUP BY v.vehicle_id ORDER BY v.vehicle_id DESC;',['User',userID,'NO']);
    // Format the data
    const formattedData = fetchData.map(vehicleData => {
      //const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`;
      const vehicleName = vehicleData.vehicle_name || '';
     // const pricePerDay = vehicleData.price_per_day > 0 ? vehicleData.price_per_day : vehicleData.price_per_week;

     const pricePerDay = 
      vehicleData.price_per_day !='0.00'  ? `${vehicleData.price_per_day} / day` : vehicleData.price_per_week != '0.00'? `${vehicleData.price_per_week} / week` : `${vehicleData.price_per_month} / month`;
      
      const plan_id = vehicleData.plan_id;
      // Handle vehicle images (split and select first one)
      const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
      const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

      // Determine sponsorship status
      const sponsored = (plan_id !='0' && currentDateTime <= vehicleData.plan_expiry_date) ? 'Yes' : 'No';

      return {
        rating: vehicleData.rating ? parseFloat(vehicleData.rating.toFixed(1)) : 0, // Limit rating to 1 decimal place
        vehicle_id: vehicleData.vehicle_id,
        speed: vehicleData.speed,
        transmission: vehicleData.transmission,
        no_of_seats: vehicleData.no_of_seats,
        pricePerDay: pricePerDay,
        vehicleName: vehicleName.trim(),
        sponsored: sponsored,
        vehicleImage: vehicleImage,
        vehicleStatus : vehicleData.status,
        bookingCount : vehicleData.booking_count,
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchUserSideOwnerVehicleList = async (req, res, next) => {
  const con = await connection();
  const user_type = req.body.user_type;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');

   // Get page and limit from request (default values: page = 1, limit = 10)
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;

  try {
     // Count total vehicles (for pagination info)
     const [totalVehiclesData] = await con.query(`
      SELECT COUNT(*) AS total FROM tbl_vehicles WHERE status = 'Active' AND deleted='NO';
    `);
    const totalVehicles = totalVehiclesData[0].total;

    // Calculate total number of pages
    const totalPages = Math.ceil(totalVehicles / limit);

    // Prepare the query with pagination (LIMIT and OFFSET)
  //  let fetchDataQuery = `SELECT v.*, AVG(r.overall_rating) AS rating FROM tbl_vehicles v LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = 'User' WHERE v.status = 'Active' AND deleted='NO' AND v.owner_id = ?  GROUP BY v.vehicle_id ORDER BY v.vehicle_id DESC LIMIT ? OFFSET ?;`;

    let fetchData ; 

    if (user_type === 'User') {
      ////console.log('User');
      const user = req.user;
      const user_id = user.user_id;
      [fetchData] = await con.query("SELECT v.*, AVG(r.overall_rating) AS rating FROM tbl_vehicles v LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = 'User' WHERE v.status = 'Active' AND deleted='NO' AND  v.owner_id != ? GROUP BY v.vehicle_id ORDER BY v.vehicle_id DESC LIMIT ? OFFSET ?", [user_id, limit, offset]);
    }
    else if(user_type === 'Guest' ) 
    {
      ////console.log('Guest');
      [fetchData] = await con.query("SELECT v.*, AVG(r.overall_rating) AS rating FROM tbl_vehicles v LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = 'User' WHERE v.status = 'Active' AND deleted='NO' GROUP BY v.vehicle_id ORDER BY v.vehicle_id DESC LIMIT ? OFFSET ?", [limit, offset]);
    }
    
   // const [fetchData] = await con.query(fetchDataQuery, [OwnerID, limit, offset]);
    ////console.log(fetchData);
   //const [fetchData] = await con.query('SELECT v.*, AVG(r.overall_rating) AS rating FROM tbl_vehicles v LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = ? WHERE v.owner_id = ? AND deleted=? GROUP BY v.vehicle_id ORDER BY v.vehicle_id DESC;',['User',userID,'NO']);
    // Format the data
    const formattedData = await Promise.all(fetchData.map(async (vehicleData) => {
      //const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`;
      const vehicleName = vehicleData.vehicle_name || '';
      // const pricePerDay = vehicleData.price_per_day > 0 ? vehicleData.price_per_day : vehicleData.price_per_week;

     const pricePerDay = 
      vehicleData.price_per_day !='0.00'  ? `${vehicleData.price_per_day} / day` : vehicleData.price_per_week != '0.00'? `${vehicleData.price_per_week} / week` : `${vehicleData.price_per_month} / month`;
      
      const plan_id = vehicleData.plan_id;
      // Handle vehicle images (split and select first one)
      const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
      const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

      // Determine sponsorship status
      const sponsored = (plan_id !='0' && currentDateTime <= vehicleData.plan_expiry_date) ? 'Yes' : 'No';
      
       // Fetch favorite status for the current vehicle (if user is logged in)
       let favoriteStatus = 'Dislike'; // Default if not a favorite
       if (user_type === 'User') {
         const userID = req.user.user_id;
         const [favoriteData] = await con.query(`
           SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?
         `, [vehicleData.vehicle_id, userID]);
 
         if (favoriteData.length > 0) {
           favoriteStatus = favoriteData[0].status || 'Dislike';
         }
       }

       const [bookingData] = await con.query(
        `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
        [vehicleData.vehicle_id] );

      return {
        rating: vehicleData.rating ? parseFloat(vehicleData.rating.toFixed(1)) : 0, // Limit rating to 1 decimal place
        vehicle_id: vehicleData.vehicle_id,
        favorite_status: favoriteStatus,
        speed: vehicleData.speed,
        transmission: vehicleData.transmission,
        no_of_seats: vehicleData.no_of_seats,
        pricePerDay: pricePerDay,
        vehicleName: vehicleName.trim(),
        sponsored: sponsored,
        vehicleImage: vehicleImage,
        bookingCount : bookingData[0].booking_count,
      };
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchOwnerVehicleDetails = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const vehicle_id = req.body.vehicle_id;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  var profileBaseUrl = `http://${process.env.Host}/images/profiles/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');
  
  try {
    // Fetch vehicle details along with average rating
    const [[fetchData]] = await con.query(
      `SELECT v.*, AVG(r.overall_rating) AS rating 
      FROM tbl_vehicles v 
      LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = ? 
      WHERE v.vehicle_id = ? AND v.owner_id = ? AND deleted=?`,
      ['User', vehicle_id, userID,'NO']
    );

    if (!fetchData) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const resultData={};

    // Use nullish coalescing (??) to handle potential null or undefined values
    resultData.vehicle_id = fetchData.vehicle_id ?? '';
    resultData.owner_id = fetchData.owner_id ?? '';
    resultData.vehicle_name = fetchData.vehicle_name ?? '';
    resultData.vehicle_make = fetchData.vehicle_make ?? '';
    resultData.vehicle_model = fetchData.vehicle_model ?? '';
    //resultData.availability = fetchData.availability ?? '';

    const availability = fetchData.availability ? fetchData.availability.replace(/[\[\]"]/g, '').split(',') : [];
    if (availability.length > 0) {
      availability.sort((a, b) => new Date(a) - new Date(b)); 
      const firstDate = availability[0];
      const lastDate = availability[availability.length - 1];
      resultData.first_date = firstDate ?? '';
      resultData.last_date = lastDate ?? '';
    } else {
      resultData.first_date = '';
      resultData.last_date = '';
    }

    resultData.start_time = fetchData.start_time ?? '';
    resultData.end_time = fetchData.end_time ?? '';
    resultData.currency = fetchData.currency ?? '';
   
    let resultArrayData = {};
    let totalPrice = 0;
    
    // Ensure perday_price_array is not null or undefined and handle blank values
    fetchData.perday_price_array = fetchData.perday_price_array || ''; // Default to empty string
    fetchData.perday_price_array = fetchData.perday_price_array.replace(/^"|"$/g, ''); // Remove any quotes
    
    resultArrayData.perday_price_array = fetchData.perday_price_array;
    
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    let pricesArray = fetchData.perday_price_array 
      ? fetchData.perday_price_array.split(',')
      : Array(daysOfWeek.length).fill('0'); // Default to an array of '0's if blank
    
    let array_price = daysOfWeek.map((day, index) => {
      let price = parseFloat(pricesArray[index] || '0').toFixed(2); // Default to '0' if missing
      totalPrice += parseFloat(price); // Accumulate the total price
      return {
        [day]: price
      };
    });
    
    // Calculate the average price
    let averagePrice = (totalPrice / daysOfWeek.length).toFixed(0);
    
    resultData.array_price = array_price;
    resultData.week_price_list = fetchData.perday_price_array;
    resultData.location_price = fetchData.location_price ?? '';
    resultData.daily_distance = fetchData.daily_distance ?? '';
    resultData.distance_price = fetchData.distance_price ?? '';

    ////console.log(fetchData.pickup_location);
      try {
        resultData.pickup_location = JSON.parse(fetchData.pickup_location);
      } catch (error) {
        console.error("Error parsing pickup_location:", error);
        resultData.pickup_location = [];
      }

    try {
      resultData.dropoff_location = JSON.parse(fetchData.dropoff_location);
    } catch (error) {
      console.error("Error parsing dropoff_location:", error);
      resultData.dropoff_location = [];
    }


    let formattedExtras = [];
    if (fetchData.extras) {
      let validJsonString = fetchData.extras
        .replace(/(\w+):/g, '"$1":')
        .replace(/:\s*(\w+)/g, ': "$1"'); 
      validJsonString = `[${validJsonString}]`;
      ////console.log("Valid JSON String:", validJsonString);
      try {
        formattedExtras = JSON.parse(validJsonString);
      } catch (error) {
        console.error("Error parsing extras:", error);
        formattedExtras = []; 
      }
    }
    resultData.extras = formattedExtras;
    ////console.log("Result Data Extras:", resultData.extras);

    // resultData.pickup_location = fetchData.pickup_location ?? []
    // resultData.dropoff_location = fetchData.dropoff_location ??[];
    resultData.current_location = fetchData.current_location ?? '';
    resultData.location_lat = fetchData.location_lat ?? '';
    resultData.location_lng = fetchData.location_lng ?? '';
    resultData.country_name = fetchData.country_name ?? '';
    resultData.vehicle_type = fetchData.vehicle_type ?? '';
    resultData.description = fetchData.description ?? '';
    resultData.plan_id = fetchData.plan_id ?? '0';  // Default to '0' if null
    resultData.plane_name = fetchData.plane_name ?? '';
    resultData.plan_expiry_date = fetchData.plan_expiry_date ?? '';
    resultData.status = fetchData.status ?? '';
    resultData.date = fetchData.date ?? '';
    resultData.time = fetchData.time ?? '';

    // Handle vehicle images (split and map them into URLs)
    const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
    resultData.vehicle_images = formatImages(fetchData.vehicle_images);
    resultData.vehicle_insurance_images = formatImages(fetchData.vehicle_insurance_images);
    resultData.mot_certificate_images = formatImages(fetchData.mot_certificate_images);

    // Determine sponsorship status based on plan and expiry date
    const sponsored = (fetchData.plan_id !== "0" && currentDateTime <= fetchData.plan_expiry_date) ? 'Yes' : 'No';
    resultData.sponsored = sponsored;

    // Set default rating if null
    resultData.rating = fetchData.rating ? parseFloat(fetchData.rating.toFixed(1)) : 0; // Limit rating to 1 decimal place

    resultData.review = fetchData.review ?? '0';

    // Handle price per day, week, and month
    const priceList = {
      "Per Day": fetchData.price_per_day || '',
      "Weekly": fetchData.price_per_week || '',
      "Monthly": fetchData.price_per_month || '',
      "AverageDailyPrice":averagePrice || ''
    };
    resultData.priceList = priceList;

    // Handling features asynchronously using `Promise.all`
    let formattedModel = [];
    if (fetchData.features) {
      const featureArray = fetchData.features.split(','); // Assuming features are comma-separated

      formattedModel = await Promise.all(
        featureArray.map(async (featureName) => {
          const [[fetchFeatureData]] = await con.query(
            `SELECT * FROM tbl_vehicle_features WHERE feature_name LIKE ?`,
            [`%${featureName.trim()}%`] // Using trim to avoid issues with extra spaces
          );

          // Check if valid feature data is found and return only valid results
          if (fetchFeatureData) {
            return {
              feature_id: fetchFeatureData.feature_id || '',
              feature_name: fetchFeatureData.feature_name || '',
              feature_image: fetchFeatureData.feature_image ? `${BASEURL}${fetchFeatureData.feature_image}` : '',
            };
          }
          return null; // Return null if the feature is not found
        })
      );

      // Filter out any null or undefined values from the results
      formattedModel = formattedModel.filter(feature => feature !== null);
    }


    const features = {
      speed: fetchData.speed ?? '',
      fuel_type: fetchData.fuel_type.replace(/^"|"$/g,'') ?? '',
      no_of_seats: fetchData.no_of_seats ?? '',
      transmission: fetchData.transmission ?? '',
      pets: fetchData.pets ?? '',
      smoking: fetchData.smoking ?? '',
      features: formattedModel
    };
    resultData.featuresList = features;

     // Determine query based on user type
     let fetchDataQuery = `SELECT r.*, u.first_name AS user_first_name, u.last_name AS user_last_name, u.profile_image AS user_image, v.vehicle_name FROM tbl_rating r JOIN tbl_user u ON r.user_id = u.user_id LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id WHERE r.vehicle_id = ? AND r.user_type = 'User' `;
     const [fetchRatingData] = await con.query(fetchDataQuery, [vehicle_id]);
     // Format the result using the map function
     const ratingsData = fetchRatingData.map(ratingData => {
       return {
         rating_id: ratingData.rating_id,
         overall_rating: ratingData.overall_rating,
         review: ratingData.review,
         userName: ratingData.user_first_name + ' ' + ratingData.user_last_name,
         userImage:ratingData.user_image ? `${profileBaseUrl}${ratingData.user_image}` : '',
         date:ratingData.date,
         time:ratingData.time
       };
     });

    const vehicle_type = fetchData.vehicle_type ?? '';
    const [[fetchTypeData]] = await con.query(`SELECT * FROM tbl_vehicle_types WHERE type_name LIKE ?`, [`%${vehicle_type.trim()}%`]  );

    // Check if valid feature data is found and return only valid results
    if (fetchTypeData) {
      resultData.type_insurance_price= fetchTypeData.type_insurance_price || '';
      resultData.type_security_deposits= fetchTypeData.type_security_deposits || '';
    }

    resultData.ratingsData = ratingsData;
    const [bookingData] = await con.query(
      `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
      [fetchData.vehicle_id] );

      resultData.bookingCount = bookingData[0].booking_count;


    const [[existingU]] = await con.query('SELECT * FROM tbl_important_credentials');
    resultData.vat_tax_rate = existingU.vat_tax_rate || '';

    await con.commit();
    res.status(200).json(resultData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchUserVehicleDetails = async (req, res, next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;
  const user_type = req.body.user_type;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  var profileBaseUrl = `http://${process.env.Host}/images/profiles/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');
  
  try {
    // Fetch vehicle details along with average rating
    const [[fetchData]] = await con.query(
      `SELECT v.*, AVG(r.overall_rating) AS rating ,COUNT(r.rating_id ) AS review 
       FROM tbl_vehicles v 
       LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = ? 
       WHERE v.vehicle_id = ? AND deleted=?`,
      ['User', vehicle_id,'NO']
    );

    if (!fetchData) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const resultData={};

    // Use nullish coalescing (??) to handle potential null or undefined values
    resultData.vehicle_id = fetchData.vehicle_id ?? '';
    const owner_id = fetchData.owner_id ?? '0';
    resultData.owner_id = fetchData.owner_id ?? '';
    resultData.vehicle_name = fetchData.vehicle_name ?? '';
    resultData.vehicle_make = fetchData.vehicle_make ?? '';
    resultData.vehicle_model = fetchData.vehicle_model ?? '';
    //resultData.availability = fetchData.availability ?? '';

    const availability = fetchData.availability ? fetchData.availability.replace(/[\[\]"]/g, '').split(',') : [];
    if (availability.length > 0) {
      availability.sort((a, b) => new Date(a) - new Date(b)); 
      const firstDate = availability[0];
      const lastDate = availability[availability.length - 1];
      resultData.first_date = firstDate ?? '';
      resultData.last_date = lastDate ?? '';
    } else {
      resultData.first_date = '';
      resultData.last_date = '';
    }

    resultData.start_time = fetchData.start_time ?? '';
    resultData.end_time = fetchData.end_time ?? '';
    resultData.currency = fetchData.currency ?? '';

    let resultArrayData = {};
    let totalPrice = 0;
    
    // Ensure perday_price_array is not null or undefined and handle blank values
    fetchData.perday_price_array = fetchData.perday_price_array || ''; // Default to empty string
    fetchData.perday_price_array = fetchData.perday_price_array.replace(/^"|"$/g, ''); // Remove any quotes
    
    resultArrayData.perday_price_array = fetchData.perday_price_array;
    
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    let pricesArray = fetchData.perday_price_array 
      ? fetchData.perday_price_array.split(',')
      : Array(daysOfWeek.length).fill('0'); // Default to an array of '0's if blank
    
    let array_price = daysOfWeek.map((day, index) => {
      let price = parseFloat(pricesArray[index] || '0').toFixed(2); // Default to '0' if missing
      totalPrice += parseFloat(price); // Accumulate the total price
      return {
        [day]: price
      };
    });
    
    // Calculate the average price
    let averagePrice = (totalPrice / daysOfWeek.length).toFixed(0);
    
    resultData.array_price = array_price;
    resultData.week_price_list = fetchData.perday_price_array;

    resultData.location_price = fetchData.location_price ?? '';
    resultData.daily_distance = fetchData.daily_distance ?? '';
    resultData.distance_price = fetchData.distance_price ?? '';

    ////console.log(fetchData.pickup_location);
      try {
        resultData.pickup_location = JSON.parse(fetchData.pickup_location);
      } catch (error) {
        console.error("Error parsing pickup_location:", error);
        resultData.pickup_location = [];
      }

    try {
      resultData.dropoff_location = JSON.parse(fetchData.dropoff_location);
    } catch (error) {
      console.error("Error parsing dropoff_location:", error);
      resultData.dropoff_location = [];
    }


    let formattedExtras = [];
    if (fetchData.extras) {
      let validJsonString = fetchData.extras
        .replace(/(\w+):/g, '"$1":')
        .replace(/:\s*(\w+)/g, ': "$1"'); 
      validJsonString = `[${validJsonString}]`;
      ////console.log("Valid JSON String:", validJsonString);
      try {
        formattedExtras = JSON.parse(validJsonString);
      } catch (error) {
        console.error("Error parsing extras:", error);
        formattedExtras = []; 
      }
    }
    resultData.extras = formattedExtras;
    ////console.log("Result Data Extras:", resultData.extras);

    // resultData.pickup_location = fetchData.pickup_location ?? []
    // resultData.dropoff_location = fetchData.dropoff_location ??[];
    resultData.current_location = fetchData.current_location ?? '';
    resultData.location_lat = fetchData.location_lat ?? '';
    resultData.location_lng = fetchData.location_lng ?? '';
    resultData.country_name = fetchData.country_name ?? '';
    resultData.vehicle_type = fetchData.vehicle_type ?? '';
    resultData.description = fetchData.description ?? '';
    resultData.plan_id = fetchData.plan_id ?? '0';  // Default to '0' if null
    resultData.plane_name = fetchData.plane_name ?? '';
    resultData.plan_expiry_date = fetchData.plan_expiry_date ?? '';
    resultData.status = fetchData.status ?? '';
    resultData.date = fetchData.date ?? '';
    resultData.time = fetchData.time ?? '';

    // Handle vehicle images (split and map them into URLs)
    const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
    resultData.vehicle_images = formatImages(fetchData.vehicle_images);
    resultData.vehicle_insurance_images = formatImages(fetchData.vehicle_insurance_images);
    resultData.mot_certificate_images = formatImages(fetchData.mot_certificate_images);

    // Determine sponsorship status based on plan and expiry date
    const sponsored = (fetchData.plan_id !== "0" && currentDateTime <= fetchData.plan_expiry_date) ? 'Yes' : 'No';
    resultData.sponsored = sponsored;

    // Set default rating if null
   // resultData.rating = fetchData.rating ?? '0';
    resultData.rating = fetchData.rating ? parseFloat(fetchData.rating.toFixed(1)) : 0; // Limit rating to 1 decimal place

    resultData.review = fetchData.review ?? '0';
  
    // Fetch favorite status for the current vehicle (if user is logged in)
    let favoriteStatus = 'Dislike'; // Default if not a favorite
    if (user_type === 'User') {
      const userID = req.user.user_id;
      const [favoriteData] = await con.query(
        `SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?`,
        [fetchData.vehicle_id, userID]
      );

      if (favoriteData.length > 0) {
        favoriteStatus = favoriteData[0].status || 'Dislike';
      }
    }
    resultData.favorite_status = favoriteStatus;

    // Handle price per day, week, and month
    const priceList = {
      "Per Day": fetchData.price_per_day || '',
      "Weekly": fetchData.price_per_week || '',
      "Monthly": fetchData.price_per_month || '',
      "AverageDailyPrice":averagePrice || ''
    };
    resultData.priceList = priceList;

    // Handling features asynchronously using `Promise.all`
    let formattedModel = [];
    if (fetchData.features) {
      const featureArray = fetchData.features.split(','); // Assuming features are comma-separated

      formattedModel = await Promise.all(
        featureArray.map(async (featureName) => {
          const [[fetchFeatureData]] = await con.query(
            `SELECT * FROM tbl_vehicle_features WHERE feature_name LIKE ?`,
            [`%${featureName.trim()}%`] // Using trim to avoid issues with extra spaces
          );

          // Check if valid feature data is found and return only valid results
          if (fetchFeatureData) {
            return {
              feature_id: fetchFeatureData.feature_id || '',
              feature_name: fetchFeatureData.feature_name || '',
              feature_image: fetchFeatureData.feature_image ? `${BASEURL}${fetchFeatureData.feature_image}` : '',
            };
          }
          return null; // Return null if the feature is not found
        })
      );

      // Filter out any null or undefined values from the results
      formattedModel = formattedModel.filter(feature => feature !== null);
    }

    const features = {
      speed: fetchData.speed ?? '',
      fuel_type: fetchData.fuel_type.replace(/^"|"$/g,'') ?? '',
      no_of_seats: fetchData.no_of_seats ?? '',
      transmission: fetchData.transmission ?? '',
      pets: fetchData.pets ?? '',
      smoking: fetchData.smoking ?? '',
      features: formattedModel
    };
    resultData.featuresList = features;

     // Determine query based on user type
     let fetchDataQuery = `SELECT r.*, u.first_name AS user_first_name, u.last_name AS user_last_name, u.profile_image AS user_image, v.vehicle_name FROM tbl_rating r JOIN tbl_user u ON r.user_id = u.user_id LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id WHERE r.vehicle_id = ? AND r.user_type = 'User' `;
     const [fetchRatingData] = await con.query(fetchDataQuery, [vehicle_id]);
     // Format the result using the map function
     const ratingsData = fetchRatingData.map(ratingData => {
       return {
         rating_id: ratingData.rating_id,
         overall_rating: ratingData.overall_rating,
         cleanliness: ratingData.cleanliness,
         convenience: ratingData.convenience,
         communication: ratingData.communication,
         review: ratingData.review,
         userName: ratingData.user_first_name + ' ' + ratingData.user_last_name,
         userImage:ratingData.user_image ? `${profileBaseUrl}${ratingData.user_image}` : '',
         date:ratingData.date,
         time:ratingData.time
       };
     });

    const vehicle_type = fetchData.vehicle_type ?? '';
    const [[fetchTypeData]] = await con.query(`SELECT * FROM tbl_vehicle_types WHERE type_name LIKE ?`, [`%${vehicle_type.trim()}%`]  );

    // Check if valid feature data is found and return only valid results
    if (fetchTypeData) {
      resultData.type_insurance_price= fetchTypeData.type_insurance_price || '';
      resultData.type_security_deposits= fetchTypeData.type_security_deposits || '';
    }

    resultData.ratingsData = ratingsData;

    const [[existingU]] = await con.query('SELECT * FROM tbl_important_credentials');
    resultData.vat_tax_rate = existingU.vat_tax_rate || '';

    var results;
    [[results]] = await con.query('SELECT * FROM tbl_user WHERE user_id =?', [owner_id]);
   // resultData.owner_id = results.user_id;
    resultData.owner_name = results.first_name + ' ' + results.last_name;
    resultData.owner_contact = results.contact;
    resultData.owner_country_code = results.country_code;
    resultData.owner_image =  results.profile_image ? `${profileBaseUrl}${results.profile_image}` : '';
    resultData.verified_status = results.license_status=='Verified'?'Verified':'Unverified';
    let couponid = 0;
    // Check if user has already applied a coupon today
    if (user_type === 'User') {
      const userID = req.user.user_id;
      const [[coupon]] = await con.query(
        'SELECT coupon_id FROM tbl_coupon_applied WHERE apply_status = ? AND user_id = ?',
        ['applied', userID]
      );

      couponid = coupon ? coupon.coupon_id : couponid;
    }
    resultData.coupon_id = couponid;
    const [bookingData] = await con.query(
      `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
      [fetchData.vehicle_id] );

      resultData.bookingCount = bookingData[0].booking_count;

    await con.commit();
    res.status(200).json(resultData);
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const likeDislike = async (req, res, next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;
  const status = req.body.status;
  const userID = req.user.user_id;
  const type = req.user.user_type;
  try {
    con.beginTransaction();

    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    const [[existingData]] = await con.query('SELECT * FROM tbl_favorite_vehicle WHERE user_id = ? AND vehicle_id= ?', [userID, vehicle_id]);
    if (!existingData) 
    { ////console.log(userID , type)
      await con.query('INSERT INTO `tbl_favorite_vehicle`(`user_id`, `vehicle_id`, `status`) VALUES (?, ?, ?)',[userID,vehicle_id,status]);
    } 
    else 
    {
      await con.query('UPDATE `tbl_favorite_vehicle` SET `status`=? WHERE `vehicle_id`=? AND user_id=?',[status,vehicle_id, userID]);
    }
    await con.commit();
    res.status(200).json({result : "Success"})
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchWishlist = async (req,res, next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');
  try {

    // Check if there is any recently viewed vehicle for the user
    const [existingData] = await con.query('SELECT * FROM tbl_favorite_vehicle WHERE user_id = ? AND status=?', [userID,'Like']);
    if (!existingData) {
      return res.status(404).json({ result: "Data not found" });
    }
    ////console.log(existingData.length);
    // Format the data
    const formattedData = await Promise.all(existingData.map(async (existData) => {

      const vehicle_id = existData.vehicle_id;

      // Fetch vehicle details along with average rating
      const [[vehicleData]] = await con.query(
        `SELECT v.*, AVG(r.overall_rating) AS rating 
         FROM tbl_vehicles v 
         LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = ? 
         WHERE v.vehicle_id = ? AND deleted=?`,
        ['User', vehicle_id,'NO']
      );
      
    const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`.trim();
    //const pricePerDay = vehicleData.price_per_day || vehicleData.price_per_week;
    const pricePerDay = 
    vehicleData.price_per_day  ? `${vehicleData.price_per_day} / day` : vehicleData.price_per_week ? `${vehicleData.price_per_week} / week` : `${vehicleData.price_per_month} / month`;
    const plan_id = vehicleData.plan_id;

    // Handle vehicle images (split and select first one)
    const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
    const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

    // Determine sponsorship status
    const sponsored = (plan_id !='0' && currentDateTime <= vehicleData.plan_expiry_date) ? 'Yes' : 'No';

    // Fetch favorite status for the current vehicle (if user is logged in)
    let favoriteStatus = 'Dislike'; // Default if not a favorite
      const [favoriteData] = await con.query(`
        SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?
      `, [vehicleData.vehicle_id, userID]);

      if (favoriteData.length > 0) {
        favoriteStatus = favoriteData[0].status || 'Dislike';
      }

      const [bookingData] = await con.query(
        `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
        [vehicleData.vehicle_id] );

    ////console.log(favoriteStatus)

    return {
      rating: vehicleData.rating || 0,  // Default rating to 0 if null
      vehicle_id: vehicleData.vehicle_id,
      favorite_status: favoriteStatus,
      speed: vehicleData.speed,
      transmission: vehicleData.transmission,
      no_of_seats: vehicleData.no_of_seats,
      pricePerDay: pricePerDay,
      vehicleName: vehicleName,
      sponsored: sponsored,
      vehicleImage: vehicleImage,
      bookingCount : bookingData[0].booking_count,
    };
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
} 

const addRecentViewVehicle = async (req,res,next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;
  const userID = req.user.user_id;
  const type = req.user.user_type;
  try {
    con.beginTransaction();

    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    const [[existingData]] = await con.query('SELECT * FROM tbl_recently_viewed_vehicle WHERE user_id = ? AND user_type= ?', [userID , type]);
    if (!existingData) 
    {
      ////console.log('IF')
      await con.query('INSERT INTO `tbl_recently_viewed_vehicle`(`user_id`, `vehicle_id`) VALUES (?, ?)',[userID,vehicle_id]);
    } 
    else 
    {
      ////console.log('else')
      await con.query('UPDATE `tbl_recently_viewed_vehicle` SET `vehicle_id`=?  WHERE  user_id=?',[vehicle_id, userID]);
    }
    await con.commit();
    res.status(200).json({result : "Success"})

  } catch (error) {
    await con.rollback();
    console.error('Error-->',error);
    res.status(500).json({result:"Internal Server Error"});
  } finally {
    con.release();
  }
}

const fetchRecentViewVehicle = async (req,res, next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  ////console.log(type);
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');
  try {

    // Check if there is any recently viewed vehicle for the user
    const [existingData] = await con.query('SELECT * FROM tbl_recently_viewed_vehicle WHERE user_id = ? AND user_type= ?', [userID, type]);
    // if (!existingData) {
    //   return res.status(404).json({ result: "Data not found" });
    // }
    ////console.log(existingData.length);
    if(existingData.length > 0){
      // Format the data
      const formattedData = await Promise.all(existingData.map(async (existData) => {

        const vehicle_id = existData.vehicle_id;

        // Fetch vehicle details along with average rating
        const [[vehicleData]] = await con.query(
          `SELECT v.*, AVG(r.overall_rating) AS rating 
          FROM tbl_vehicles v 
          LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = ? 
          WHERE v.vehicle_id = ? AND deleted=?`,
          ['User', vehicle_id,'NO']
        );
        
      const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`.trim();
    // const pricePerDay = vehicleData.price_per_day || vehicleData.price_per_week;

      const pricePerDay = 
      vehicleData.price_per_day !='0.00'  ? `${vehicleData.price_per_day} / day` : vehicleData.price_per_week != '0.00'? `${vehicleData.price_per_week} / week` : `${vehicleData.price_per_month} / month`;
      const plan_id = vehicleData.plan_id;
  ////console.log(pricePerDay);
      // Handle vehicle images (split and select first one)
      const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
      const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

      // Determine sponsorship status
      const sponsored = (plan_id !='0' && currentDateTime <= vehicleData.plan_expiry_date) ? 'Yes' : 'No';

      // Fetch favorite status for the current vehicle (if user is logged in)
      let favoriteStatus = 'Dislike'; // Default if not a favorite
        const [favoriteData] = await con.query(`
          SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?
        `, [vehicleData.vehicle_id, userID]);

        if (favoriteData.length > 0) {
          favoriteStatus = favoriteData[0].status || 'Dislike';
        }

        const [bookingData] = await con.query(
          `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
          [vehicleData.vehicle_id] );

      ////console.log(favoriteStatus)
     // resultData.rating = fetchData.rating ? parseFloat(fetchData.rating.toFixed(1)) : 0, // Limit rating to 1 decimal place

      return {
        rating: vehicleData.rating ? parseFloat(vehicleData.rating.toFixed(1)) : 0,// Default rating to 0 if null
        vehicle_id: vehicleData.vehicle_id,
        favorite_status: favoriteStatus,
        speed: vehicleData.speed,
        transmission: vehicleData.transmission,
        no_of_seats: vehicleData.no_of_seats,
        pricePerDay: pricePerDay,
        vehicleName: vehicleName,
        sponsored: sponsored,
        vehicleImage: vehicleImage,
        bookingCount : bookingData[0].booking_count,
      };
      }));
      res.status(200).json(formattedData);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
} 

const addGuestRecentViewVehicle = async (req,res,next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;
  const guest_id = req.body.guest_id;; // Get or set the guest ID
  try {
    con.beginTransaction();

    const [[existingData]] = await con.query('SELECT * FROM tbl_guest_recently_viewed_vehicles WHERE guest_id = ?', [guest_id]);
    if (!existingData) 
    {
      await con.query(`INSERT INTO tbl_guest_recently_viewed_vehicles (guest_id, vehicle_id, viewed_at) VALUES (?, ?, NOW())`,[guest_id, vehicle_id]);
    } 
    else 
    {
      await con.query('UPDATE `tbl_guest_recently_viewed_vehicles` SET `vehicle_id`=?  WHERE  guest_id=?',[vehicle_id, guest_id]);
    }
    await con.commit();
    res.status(200).json({result : "Success"})

  } catch (error) {
    await con.rollback();
    console.error('Error-->',error);
    res.status(500).json({result:"Internal Server Error"});
  } finally {
    con.release();
  }
}

const fetchGuestRecentViewVehicle = async (req,res, next) => {
  const con = await connection();
  const guest_id = req.body.guest_id;; // Get or set the guest ID
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');
  try {

    // Check if there is any recently viewed vehicle for the user
    const [existingData] = await con.query('SELECT * FROM tbl_guest_recently_viewed_vehicles WHERE guest_id = ?', [guest_id]);
    // if (!existingData) {
    //   return res.status(404).json({ result: "Data not found" });
    // }
    ////console.log(existingData.length);
    // Format the data
    const formattedData = await Promise.all(existingData.map(async (existData) => {

      const vehicle_id = existData.vehicle_id;

      // Fetch vehicle details along with average rating
      const [[vehicleData]] = await con.query(
        `SELECT v.*, AVG(r.overall_rating) AS rating 
         FROM tbl_vehicles v 
         LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id AND r.user_type = ? 
         WHERE v.vehicle_id = ? AND deleted=?`,
        ['User', vehicle_id, 'NO']
      );
      
    const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`.trim();
   // const pricePerDay = vehicleData.price_per_day || vehicleData.price_per_week;
   const pricePerDay = 
   vehicleData.price_per_day !='0.00'  ? `${vehicleData.price_per_day} / day` : vehicleData.price_per_week != '0.00'? `${vehicleData.price_per_week} / week` : `${vehicleData.price_per_month} / month`;
    const plan_id = vehicleData.plan_id;

    // Handle vehicle images (split and select first one)
    const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
    const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

    // Determine sponsorship status
    const sponsored = (plan_id !='0' && currentDateTime <= vehicleData.plan_expiry_date) ? 'Yes' : 'No';

    // Fetch favorite status for the current vehicle (if user is logged in)
    let favoriteStatus = 'Dislike'; // Default if not a favorite

    ////console.log(favoriteStatus)\
    const [bookingData] = await con.query(
      `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
      [vehicleData.vehicle_id] );

    return {
      rating: vehicleData.rating ? parseFloat(vehicleData.rating.toFixed(1)) : 0,// Default rating to 0 if null
      vehicle_id: vehicleData.vehicle_id,
      favorite_status: favoriteStatus,
      speed: vehicleData.speed,
      transmission: vehicleData.transmission,
      no_of_seats: vehicleData.no_of_seats,
      pricePerDay: pricePerDay,
      vehicleName: vehicleName,
      sponsored: sponsored,
      vehicleImage: vehicleImage,
      bookingCount : bookingData[0].booking_count,
    };
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
} 

const fetchCouponList = async (req, res, next) => {
  const con = await connection();
  const user_type = req.body.user_type; 
   ////console.log(req.body);
   const time = new Date().toLocaleTimeString();
   const date = new Date().toISOString().split('T')[0];  // Format the date properly
  
  try {
      const userID = (user_type === 'User' || user_type === 'Guest') ? req.user.user_id : null;

      if (!userID) {
          return res.status(400).json({ result: "Invalid user type or missing user ID" });
      }

      const [fetchCoupon] = await con.query(
          `
          SELECT 
              c.coupon_id,
              c.coupon_title,
              c.coupon_code,
              c.coupon_max_amount,
              c.discount_rate,
              c.start_date,
              c.end_date,
              c.status,
              c.use_limit,
              COALESCE(a.apply_status, '') AS apply_status
          FROM 
              tbl_coupons c
          LEFT JOIN 
              tbl_coupon_applied a 
          ON 
              a.coupon_id = c.coupon_id AND a.user_id = ? AND a.apply_date >= ? 
          WHERE 
              c.status = ? 
              AND c.end_date >= ? 
              AND c.deleted = ? 
          ORDER BY 
              c.coupon_id ASC
          `,
          [userID, date, 'Active', date, 'No']
      );

      const formattedCoupon = fetchCoupon.map(card => ({
          coupon_id: card.coupon_id,
          coupon_title: card.coupon_title,
          coupon_code: card.coupon_code,
          coupon_max_amount: card.coupon_max_amount,
          discount_rate: card.discount_rate,
          start_date: card.start_date,
          end_date: card.end_date,
          status: card.status,
          use_limit: card.use_limit,
          apply_status: card.apply_status, // Now properly reflects "applied" or "not applied"
      }));

      res.status(200).json(formattedCoupon);

  } catch (error) {
      console.error('Error fetching coupon list:', error);
      res.status(500).json({ result: "Internal Server Error" });
  } finally {
      con.release();
  }
};

const applyCoupon = async (req, res, next) => {
  ////console.log(req.body);
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0];  // Format the date properly
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;

  try {
      await con.beginTransaction(); // Start the transaction

      const { coupon_id, total_amount } = req.body;
      ////console.log(" req.body-->", req.body)
      // Fetch coupon details
      const [fetchCoupon] = await con.query(
          'SELECT * FROM tbl_coupons WHERE coupon_id = ? AND status = ? AND end_date >= ? AND deleted = ?',
          [coupon_id, 'Active', date, 'No']
      );

      if (fetchCoupon.length === 0) {
          return res.status(404).json({ result: "Coupon not found or expired" });
      }

      const coupon = fetchCoupon[0];
      const { coupon_max_amount, use_limit } = coupon;
       /////console.log("coupon_max_amount-->", coupon_max_amount)
      // Check if user already exceeded use limit
      const [fetchBooking] = await con.query('SELECT * FROM tbl_bookings WHERE applied_coupon = ? AND user_id = ?', [coupon_id, userID] );

      if (fetchBooking.length >= use_limit) {
          return res.status(400).json({ result: "You have already used this coupon the maximum allowed times" });
      }

      // Parse total_amount and coupon_max_amount as numbers
      const totalAmountNumeric = parseFloat(total_amount);
      const couponMaxAmountNumeric = parseFloat(coupon_max_amount);
      // //console.log("totalAmountNumeric-->", totalAmountNumeric)
      // //console.log("couponMaxAmountNumeric-->", couponMaxAmountNumeric)
      // Check if total amount exceeds coupon maximum amount
      if(totalAmountNumeric <= couponMaxAmountNumeric) {
          ////console.log("Total amount exceeds the coupon limit-->")
          return res.status(400).json({ result: "Total amount exceeds the coupon limit" });
      }
      // Check if user has already applied a coupon today
      const [[fetchAppliedCoupon]] = await con.query( 'SELECT * FROM tbl_coupon_applied WHERE apply_status = ? AND user_id = ?',  ['applied', userID]);

      let sql, values;
      if (fetchAppliedCoupon) {
          // Update coupon if already applied
          sql = 'UPDATE tbl_coupon_applied SET coupon_id = ?, apply_date = ? WHERE  user_id = ?';
          values = [coupon_id, date, userID];
      } else {
          // Insert a new coupon application
          sql = 'INSERT INTO tbl_coupon_applied (user_id, coupon_id, apply_status, apply_date) VALUES (?, ?, ?, ?)';
          values = [userID, coupon_id, 'applied', date];
      }

      await con.query(sql, values);
      await con.commit(); // Commit the transaction

      res.status(200).json({ result: 'Coupon applied successfully' });

  } catch (error) {
      await con.rollback();
      console.error('Error applying coupon:', error);
      res.status(500).json({ result: "Internal Server Error" });
  } finally {
      con.release();
  }
};

const removeAppliedCoupon = async (req, res, next) => {
  const date = new Date().toISOString().split('T')[0];  // Format the date properly
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  try {
      await con.beginTransaction(); // Start the transaction
      const { coupon_id} = req.body;
      ////console.log(" req.body-->", req.body)
      // Fetch coupon details
      const [fetchCoupon] = await con.query(
          'SELECT * FROM tbl_coupons WHERE coupon_id = ? AND status = ? AND end_date >= ? AND deleted = ?',
          [coupon_id, 'Active', date, 'No']
      );

      if (fetchCoupon.length === 0) {
          return res.status(404).json({ result: "Coupon not found or expired" });
      }

      await con.query('DELETE FROM tbl_coupon_applied WHERE user_id = ? AND coupon_id =?', [userID,coupon_id]);
      await con.commit(); // Commit the transaction
      res.status(200).json({ result: 'success' });

  } catch (error) {
      await con.rollback();
      console.error('Error deleting coupon:', error);
      res.status(500).json({ result: "Internal Server Error" });
  } finally {
      con.release();
  }
};

const checkVehicleAvailability = async (req, res, next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;
  var date_array = req.body.date_array; // This should already be an array of requested dates
  const userID = req.user.user_id;
  const type = req.user.user_type;

  try {
    await con.beginTransaction();

    const [existingData] = await con.query(
      `SELECT booking_dates 
      FROM tbl_bookings 
      WHERE vehicle_id = ? 
      AND booking_status NOT IN ("Completed", "Cancelled")`, 
      [vehicle_id]
    );

    date_array = JSON.parse(req.body.date_array);
    let unavailableCount = 0;
    for (const booking of existingData) {
      const bookedDates = booking.booking_dates;
      ////console.log('Booked Dates:', bookedDates);

      for (const requestedDate of date_array) {
        if (bookedDates.includes(requestedDate)) {
          unavailableCount++; 
        }
      }
    }
    ////console.log(unavailableCount);
    if (unavailableCount > 0) {
      await con.rollback();
      return res.status(200).json({ result: "Unsuccess"}); 
    } else {
      await con.commit(); 
      return res.status(200).json({ result: "Success" }); 
    }
  } catch (error) {
    await con.rollback();
    console.error('Error -->', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const availabilityCalender1 = async (req, res, next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;

  try {
    await con.beginTransaction();

    // Fetch vehicle availability
    const [existingVehicleData] = await con.query(
      `SELECT availability FROM tbl_vehicles WHERE vehicle_id = ?`,
      [vehicle_id]
    );

    if (existingVehicleData.length === 0) {
      await con.rollback();
      return res.status(200).json({ result: "Vehicle not found" });
    }

    // Parse the availability data
    var date_array = existingVehicleData[0].availability; 
    date_array = JSON.parse(date_array); 
    
    ////console.log('date_array original:', date_array);

    // Fetch bookings for the vehicle that are not 'Completed' or 'Cancelled'
    const [existingBookingData] = await con.query(
      `SELECT booking_dates FROM tbl_bookings WHERE vehicle_id = ? AND booking_status NOT IN ("Completed", "Cancelled")`,
      [vehicle_id]
    );

    // If no booking data exists for the vehicle, set unavailableDates to the full date_array
    let unavailableDates;
    if (existingBookingData.length === 0) {
      unavailableDates = new Set(date_array);
    } else {
      // Initialize a set for the unavailable dates
      unavailableDates = new Set(date_array);
      ////console.log('date_array:', date_array);
      ////console.log('unavailableDates:', unavailableDates);

      // Initialize unavailable count
      let unavailableCount = 0;

      // Iterate through the bookings to check for overlaps
      for (const booking of existingBookingData) {
        // Parse JSON string to get the dates array
        const bookedDates = JSON.parse(booking.booking_dates); // Parse booked dates if stored as JSON string
        ////console.log('Booked Dates:', bookedDates);

        // Check if any of the booked dates overlap with available dates
        for (const requestedDate of bookedDates) { // Loop through booked dates instead
          if (unavailableDates.has(requestedDate)) {
            unavailableCount++; // Increment unavailable count
            unavailableDates.delete(requestedDate); // Remove unavailable dates from the set
          }
        }
      }

      // Calculate available dates from the remaining dates in the set
      const availableDates = date_array
        .filter(date => unavailableDates.has(date)) // Get the dates that are still available
        .map(date => {
          const [year, month, day] = date.split('-'); // Assuming the date format is 'YYYY-MM-DD'
          return {
            Day: day,
            Month: month,
            Year: year,
            Status: "Available"
          };
        });

      // If there are any unavailable dates
      if (unavailableCount > 0) {
        await con.rollback(); // Rollback transaction if needed
        return res.status(200).json(availableDates); // Return available dates
      }
    }

    // If there were no bookings, return all available dates
    const availableDates = date_array.map(date => {
      const [year, month, day] = date.split('-');
      return {
        Day: day,
        Month: month,
        Year: year,
        Status: "Available"
      };
    });

    await con.commit();
    //return res.status(200).json({ result: "Success", availableDates });
    return res.status(200).json(availableDates );

  } catch (error) {
    await con.rollback();
    console.error('Error -->', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const availabilityCalender = async (req, res, next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;

  try {
    await con.beginTransaction();

    // Fetch vehicle availability
    const [existingVehicleData] = await con.query(
      `SELECT availability FROM tbl_vehicles WHERE vehicle_id = ?`,
      [vehicle_id]
    );

    if (existingVehicleData.length === 0) {
      await con.rollback();
      return res.status(200).json({ result: "Vehicle not found" });
    }

    // Parse the availability data
    var date_array = existingVehicleData[0].availability; 
    date_array = JSON.parse(date_array); 
    
    // Fetch bookings for the vehicle that are not 'Completed' or 'Cancelled'
    const [existingBookingData] = await con.query(
      `SELECT booking_dates FROM tbl_bookings WHERE vehicle_id = ? AND booking_status NOT IN ("Completed", "Cancelled")`,
      [vehicle_id]
    );

    // Initialize a Set for unavailable dates
    let unavailableDates = new Set();
    // Initialize an array to store booked dates with "Booked" status
    let bookedDates = [];

    if (existingBookingData.length > 0) {
      // Iterate through the bookings to check for overlaps
      for (const booking of existingBookingData) {
        // Parse JSON string to get the booked dates array
        const bookedDatesArray = JSON.parse(booking.booking_dates);
        
        // Iterate through the booked dates and mark them as unavailable
        for (const bookedDate of bookedDatesArray) {
          unavailableDates.add(bookedDate); // Add to unavailable set
          bookedDates.push(bookedDate); // Track booked dates
        }
      }
    }
    console.log("unavailableDatess",unavailableDates)
    console.log("bookedDates-->",bookedDates)

    // Prepare final available and booked dates
    const finalDates = date_array.map(date => {
      const [year, month, day] = date.split('-'); // Assuming 'YYYY-MM-DD' format
      let status = "Available";
      
      // If the date is in the unavailable (booked) set, mark it as "Booked"
      if (unavailableDates.has(date)) {
        status = "Booked";
      }

      return {
        Day: day,
        Month: month,
        Year: year,
        Status: status
      };
    });

    await con.commit();

    // Return the final array with both booked and available dates
    return res.status(200).json(finalDates);

  } catch (error) {
    await con.rollback();
    console.error('Error -->', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};


 const userBooking = async(req,res,next) => {

  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0];  // Format the date properly

  try {
    const owner_id = req.body.owner_id
    const vehicle_id =  req.body.vehicle_id
    // Fetch user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    const userName = existingUser.first_name + ' ' + existingUser.last_name;

    // Fetch user details
    const [[existingVehicle]] = await con.query('SELECT * FROM tbl_vehicles WHERE owner_id = ? AND vehicle_id = ?', [owner_id,vehicle_id ]);
    const vehicleName = existingVehicle.vehicle_name;

    const booking_dates1 = req.body.booking_dates
    const booking_dates = req.body.booking_dates ? req.body.booking_dates.replace(/[\[\]"]/g, '').split(',') : [];
    let firstDate, lastDate, totalDays;
    
    if (booking_dates.length > 0) {
      booking_dates.sort((a, b) => new Date(a) - new Date(b)); 
      firstDate = booking_dates[0];
      lastDate = booking_dates[booking_dates.length - 1];
      const start = new Date(firstDate);
      const end = new Date(lastDate);
      totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // Adding 1 to include both start and end dates
    } else {
      firstDate = '';
      lastDate = '';
      totalDays = '0';
    }
    const start_date = firstDate ?? '';
    const end_date = lastDate ?? '';
    const total_days = req.body.total_days??totalDays ;
    const payment_mode = req.body.payment_mode;
    const payment_status = 'Pending';
    const transaction_number = req.body.payment_id || "";
    const bank_id = 0;
    const card_id = (req.body.card_id === "") ? 0 : req.body.card_id;


    const sql =
    'INSERT INTO `tbl_bookings`(`user_id`, `owner_id`, `vehicle_id`, `booking_dates`, `start_date`, `end_date`, `start_time`, `end_time`, `total_days`, `pickup_address`, `dropoff_address`, `currency`, `extras_details`, `payment_mode`, `payment_status`, `applied_coupon`, `applied_reward_points`, `rent`, `pickup_location_charge`, `dropoff_location_charge`, `extra_charges`, `insurance_charge`, `vat_charge`, `applied_reward_price`, `applied_coupon_charge`, `total_charge`, `refundable_charge`, `grand_total`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [
        userID,
        owner_id,           
        vehicle_id,            
        booking_dates1,   
        start_date,  
        end_date,      
        req.body.start_time,                              
        req.body.end_time,  
        total_days,        
        req.body.pickup_address,
        req.body.dropoff_address, 
        'USD',         
        req.body.extras_details,  
        payment_mode,
        payment_status,
        req.body.applied_coupon,
        req.body.applied_reward_points,
        req.body.rent,
        req.body.pickup_location_charge,
        req.body.dropoff_location_charge,               
        req.body.extra_charges,   
        req.body.insurance_charge,   
        req.body.vat_charge,   
        req.body.applied_reward_price,   
        req.body.applied_coupon_charge,   
        req.body.total_charge,   
        req.body.refundable,   
        req.body.grand_total,                                
    ];
    const [results] = await con.query(sql, values);

    const booking_id = results.insertId;

    const sql1 = 'INSERT INTO `tbl_transactions`(`transaction_number`, `user_id`, `wallet_type`, `transaction_type`, `transaction_amount`, `deposit_amount`, `current_wallet_amount`, `transaction_mode`, `card_id`, `bank_id`,booking_id,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
    const values1 = [
        req.body.transaction_number,
        userID,
        type,
        'Booking Charge',
        req.body.grand_total,
        '0',
        '0',
        payment_mode,
        card_id,
        bank_id,
        booking_id,
        'Completed'
      ];

    const [results1] = await con.query(sql1, values1);
    await con.commit();

    
    const title1 = "Car Booking Requested!";
    const body1 = "Your car booking request has been sent to the owner. Await confirmation.";

    const title2 = "New Booking Request!";
    const body2 = ` ${userName} has requested to book your car ${vehicleName}. Review the details in the app.`;

    const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
    await con.query(sql_notify, [
      results.insertId, userID, 'User', title1, body1, date, time, // User notification
      results.insertId, owner_id, 'Owner', title2, body2, date, time // Owner notification
    ]);
    // Send notifications in the background
    sendPushNotifications([
      { user_id: userID, title: title1, body: body1 },
      { user_id: owner_id, title: title2, body: body2 },
    ]);

    // Immediately return the response
    res.json({ result: 'success', Booking_id: results.insertId });

    
  } catch (error) {
    console.error('Error--->',error);
    res.status(500).json({result:"Internal Server Error"})
  } finally {
    con.release();
  }
 }
 
const bookingPayment = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const booking_id = req.body.booking_id;
  const payment_id = req.body.payment_id;
  try {
    await con.beginTransaction();
    const [[existingBookingData]] = await con.query('SELECT * FROM tbl_bookings WHERE user_id = ? AND booking_id = ?', [userID, booking_id]);
    if (!existingBookingData) {
      await con.rollback();
      return res.status(200).json({ result: "Booking not found" });
    }
    // await con.query('DELETE FROM tbl_prop WHERE user_id = ?', [userID]);
    await con.query('UPDATE `tbl_bookings` SET `payment_id`=? , payment_status=? WHERE user_id = ? AND booking_id  = ?', [payment_id,'Completed',userID,booking_id]);
    await con.commit();
    res.status(200).json({ result: "Success" });
  } catch (error) {
    await con.rollback();
    console.error("Error:", error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const deleteVehicle = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const vehicle_id = req.body.vehicle_id;
  ////console.log("user_id---", userID);
  try {
    await con.beginTransaction();
    // await con.query('DELETE FROM tbl_prop WHERE user_id = ?', [userID]);
    await con.query('UPDATE `tbl_vehicles` SET `deleted`=? WHERE owner_id = ? AND vehicle_id = ?', ['Yes',userID,vehicle_id]);
    await con.commit();
    res.status(200).json({ result: "success" });
  } catch (error) {
    await con.rollback();
    console.error("Error:", error);
    res.status(500).json({ result: "failed", message:" Unable to delete vehicle!" });
  } finally {
    con.release();
  }
 }

const fetchVehicleRent = async (req, res, next) => {
  const con = await connection();
  const vehicle_id = req.body.vehicle_id;
  //console.log("7 vehicle_id--->",vehicle_id);
  try {

      // Fetch vehicle details including perday_price_array and week price
      const [[fetchData]] = await con.query(`SELECT * FROM tbl_vehicles WHERE vehicle_id = ? AND deleted=?`, [vehicle_id, 'NO']);

      if (!fetchData) {
          return res.status(404).json({ message: 'Vehicle not found' });
      }

      // booking_dates is an array of date strings
      const booking_dates = req.body.booking_dates ? req.body.booking_dates.replace(/[\[\]"]/g, '').split(',') : [];
      const start_time = req.body.start_time; // e.g. "10:00 AM"
      const end_time = req.body.end_time; // e.g. "2:00 PM"
      
      if (booking_dates.length === 0) {
          return res.status(400).json({ message: 'Booking dates required' });
      }
      let firstDate, lastDate
      // Convert the first and last booking dates to Date objects with time
      const firstDate1 = new Date(`${booking_dates[0]} ${start_time}`);
      const lastDate1 = new Date(`${booking_dates[booking_dates.length - 1]} ${end_time}`);
      firstDate = booking_dates[0];
      lastDate = booking_dates[booking_dates.length - 1];
      // Calculate the total difference in milliseconds
      const timeDifference = lastDate1 - firstDate1;
      
      // Convert milliseconds to days, considering partial days as full days
      const totalDays = Math.ceil((timeDifference / (1000 * 60 * 60 * 24))+1); // Convert ms to days

      const start_date = firstDate ?? '';
      const end_date = lastDate ?? '';
      const total_days = totalDays ?? '0';
      
     // //console.log("7 days--->",total_days);

      // Check if total_days is less than 7
      if (total_days < 7) {
          const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          const perday_price_array = fetchData.perday_price_array.split(','); // Assuming prices are stored as "10,20,30,40,50,60,70"
       // //console.log(perday_price_array);
          let totalRent = 0;
          booking_dates.forEach(dateStr => {
              const date = new Date(dateStr);
              let dayOfWeek = date.getDay();
              if (dayOfWeek === 0) { dayOfWeek = 6;  } else { dayOfWeek -= 1; }
           // //console.log(dayOfWeek);
              const dayPrice = parseFloat(perday_price_array[dayOfWeek] || '0');
            // //console.log(dayPrice);
              totalRent += dayPrice;
          });
          
          return res.status(200).json({
              start_date,
              end_date,
              start_time,
              end_time,
              total_days,
              rent: totalRent.toFixed(2) 
          });
      } else if (total_days >= 7 && total_days < 30) {
          const week_price = parseFloat(fetchData.price_per_week || '0'); 
          const fullWeeks = Math.floor(total_days / 7); 
         // //console.log("fullWeeks-->",fullWeeks)
          const remainingDays = total_days % 7; 
         // //console.log("remainingDays",remainingDays)
          let totalRent = fullWeeks * week_price;
         // //console.log("totalRent--->",totalRent)
          if (remainingDays > 0) {
              const pricePerDayForRemaining = week_price / 7;
              const remainingRent = remainingDays * pricePerDayForRemaining;
             // //console.log("remainingRent--->",remainingRent)
              totalRent += remainingRent; 
          }
          return res.status(200).json({
              start_date,
              end_date,
              start_time,
              end_time,
              total_days,
              rent: totalRent.toFixed(2) 
          });
      } else if (total_days >= 30) {
          const month_price = parseFloat(fetchData.price_per_month || '0'); 
          const fullmonths = Math.floor(total_days / 30); 
          ////console.log(fullmonths)
          const remainingDays = total_days % 30; 
          ////console.log(remainingDays)
          let totalRent = fullmonths * month_price;
          ////console.log(totalRent)
          if (remainingDays > 0) {
              const pricePerDayForRemaining = month_price / 30;
              const remainingRent = remainingDays * pricePerDayForRemaining;
              ////console.log(remainingRent)
              totalRent += remainingRent; 
          }
          return res.status(200).json({
              start_date,
              end_date,
              start_time,
              end_time,
              total_days,
              rent: totalRent.toFixed(2) 
          });
      }
  } catch (error) {
      await con.rollback();
      console.error("Error:", error);
      res.status(500).json({ result: "failed", message: "Unable to calculate rent!" });
  } finally {
      con.release();
  }
};

const fetchUserBookingList = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const BASEURL1 = `http://${process.env.Host}/images/profiles/`;
  try {
      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
      
      if (!existingUser) {
        return res.status(404).json({ result: "User not found" });
      }

      // Determine query based on user type
      let fetchDataQuery;
      fetchDataQuery = `
        SELECT b.*,
               u.first_name, u.last_name, u.country_code, u.contact, u.profile_image AS profile_image,
               v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
               v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.owner_id = u.user_id
        WHERE b.user_id = ? AND b.booking_status NOT IN ('Cancelled','Completed') ORDER BY b.booking_id DESC
      `;
      // Fetch bookings
      const [fetchData] = await con.query(fetchDataQuery, [userID]);
     ////console.log(fetchData.length);
      const formattedData = await Promise.all(fetchData.map(async (bookingData) => {
      // Format the result
      //const formattedData = fetchData.map(bookingData => {
        let userName, userImage , userContact , userCountryCode ;
        if (type === 'User') {
            userName = bookingData.first_name + ' ' + bookingData.last_name;
            userImage = bookingData.profile_image ? `${BASEURL1}${bookingData.profile_image}` : '';
           // userContact = `${bookingData.country_code} ${bookingData.contact}`;
            userContact = bookingData.contact;
            userCountryCode = bookingData.country_code;
        } else {
            userName = bookingData.first_name + ' ' + bookingData.last_name;
            userImage = bookingData.profile_image ? `${BASEURL1}${bookingData.profile_image}` : '';
           // userContact = `${bookingData.country_code} ${bookingData.contact}`;
            userContact = bookingData.contact;
            userCountryCode = bookingData.country_code;
        }
     
        const vehicleName = `${bookingData.vehicle_name} ${bookingData.vehicle_make} ${bookingData.vehicle_model}`;
        const vehicleImagesArray = (bookingData.vehicle_images || '').split(',');
        const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

        // Handle vehicle images (split and map them into URLs)
        const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
        const vehicle_insurance_images = formatImages(bookingData.vehicle_insurance_images);
        const mot_certificate_images = formatImages(bookingData.mot_certificate_images);

        const start_dateObj = new Date(bookingData.start_date);
        const start_date = start_dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short',  day: 'numeric'});

        const end_dateObj = new Date(bookingData.end_date);
        const end_date = end_dateObj.toLocaleDateString('en-US', { year: 'numeric',month: 'short', day: 'numeric' });

        const [dateData] = await con.query(`SELECT * FROM tbl_change_booking_date WHERE booking_id = ?`, [bookingData.booking_id]);
        // Check if dateData exists and format `requested_dates`
        const changeRequest = dateData.length > 0 ? dateData.map(date => ({
          booking_id: date.booking_id,
          requested_dates: JSON.parse(date.requested_dates), // Parse the JSON string into an array
          status: date.status
        })) : [];
          
      ////console.log(dateData)
     // ////console.log(requested_dates);

        // Format the response
        return {
          booking_id: bookingData.booking_id,
          vehicle_id: bookingData.vehicle_id,
          grand_total: bookingData.grand_total,
          vehicleName: vehicleName,
          vehicleImage: vehicleImage,
          vehicle_insurance_images : vehicle_insurance_images,
          mot_certificate_images : mot_certificate_images,
          start_date: start_date,
          end_date: end_date,
          booking_status: bookingData.booking_status,
          payment_mode: bookingData.payment_mode,
          payment_status: bookingData.payment_status,
          owner_id: bookingData.owner_id,
          ownerName: userName,
          ownerImage: userImage,
          ownerContact : userContact,
          owner_country_code : userCountryCode,
          change_request:changeRequest  
        };
      }));

      res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ result: "failed", message: "Unable to fetch bookings!" });
  } finally {
    con.release();
  }
}

const fetchOwnerBookingList = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const status_type = req.body.status_type;
  ////console.log(status_type);
  const BASEURL = `http://${process.env.Host}/images/docUploads/`;
  const BASEURL1 = `http://${process.env.Host}/images/profiles/`;
  const BASEURL2 = `http://${process.env.Host}/images/vehicleUploads/`;
  try {
      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
      
      if (!existingUser) {
        return res.status(404).json({ result: "User not found" });
      }

      // Determine query based on user type
      let fetchDataQuery;
      if(status_type == "Pending")
      {
        fetchDataQuery = `
          SELECT b.*,
                v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
                u.user_document_images, u.license_images,  u.first_name, u.last_name, u.country_code,
                u.contact, u.profile_image AS profile_image
          FROM tbl_bookings b
          LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
          LEFT JOIN tbl_user u ON b.user_id = u.user_id
          WHERE b.owner_id = ? AND b.booking_status IN ('Pending') ORDER BY b.booking_id DESC
          `;
      } else if(status_type == "Booked")
      {
        ////console.log("status_type",status_type);
        fetchDataQuery = `
        SELECT b.*,
            v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
            u.first_name, u.last_name, u.country_code, u.contact, u.profile_image AS profile_image,
            u.user_document_images, u.license_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        WHERE b.owner_id = ? AND b.booking_status IN ('Confirmed','On_Going','UserCheck_In','UserCheck_Out','OwnerCheck_In','OwnerCheck_Out')
        ORDER BY b.booking_id DESC
        `;
      }
      // Fetch bookings
      const [fetchData] = await con.query(fetchDataQuery, [userID]);
      ////console.log("fetchData",fetchData);
      // Format the result
      const formattedData = await Promise.all(fetchData.map(async (bookingData) => {
      //const formattedData = fetchData.map(bookingData => {
        const userName = bookingData.first_name + ' ' + bookingData.last_name;
        const userImage = bookingData.profile_image ? `${BASEURL1}${bookingData.profile_image}` : '';
        const userContact = bookingData.contact;
        const userCountryCode = bookingData.country_code;
        const vehicleName = `${bookingData.vehicle_name} ${bookingData.vehicle_make} ${bookingData.vehicle_model}`;
        const vehicleImagesArray = (bookingData.vehicle_images || '').split(',');
        const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL2}${vehicleImagesArray[0]}` : '';

        // Handle vehicle images (split and map them into URLs)
        const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
        const user_document_images = formatImages(bookingData.user_document_images);
        const license_images = formatImages(bookingData.license_images);

        const start_dateObj = new Date(bookingData.start_date);
        const start_date = start_dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short',  day: 'numeric'});

        const end_dateObj = new Date(bookingData.end_date);
        const end_date = end_dateObj.toLocaleDateString('en-US', { year: 'numeric',month: 'short', day: 'numeric' });

        const [dateData] = await con.query(`SELECT * FROM tbl_change_booking_date WHERE booking_id = ?`, [bookingData.booking_id]);
        // Check if dateData exists and format `requested_dates`
        const changeRequest = dateData.length > 0 ? dateData.map(date => ({
          booking_id: date.booking_id,
          requested_dates: JSON.parse(date.requested_dates), // Parse the JSON string into an array
          status: date.status
        })) : [];
          
      ////console.log(dateData)

        // Format the response
        return {
          booking_id: bookingData.booking_id,
          vehicle_id: bookingData.vehicle_id,
          grand_total: bookingData.grand_total,
          vehicleName: vehicleName,
          vehicleImage: vehicleImage,
          user_document_images : user_document_images,
          license_images : license_images,
          start_date: start_date,
          end_date: end_date,
          booking_status: bookingData.booking_status,
          payment_mode: bookingData.payment_mode,
          payment_status: bookingData.payment_status,
          user_id: bookingData.user_id,
          userName: userName,
          userImage: userImage,
          userContact : userContact,
          user_country_code : userCountryCode,
          change_request:changeRequest  
        };
      }));

      res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ result: "failed", message: "Unable to fetch bookings!" });
  } finally {
    con.release();
  }
}

const fetchBookingDetails = async(req, res, next) => {
  
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const booking_id = req.body.booking_id;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  try {
    await con.beginTransaction();

    // Fetch booking and vehicle details along with the rating
    const [[bookingData]] = await con.query(
      `SELECT v.*, b.*, AVG(r.overall_rating) AS rating ,COUNT(r.rating_id ) AS review 
       FROM tbl_bookings b
       LEFT JOIN tbl_vehicles v ON v.vehicle_id = b.vehicle_id 
       LEFT JOIN tbl_rating r ON r.vehicle_id = b.vehicle_id 
       WHERE b.booking_id = ?`, [booking_id]
    );

    if (!bookingData) {
      await con.rollback();
      return res.status(404).json({ result: "failed", message: "Booking not found" });
    }

    // Build the vehicle name
    const vehicleName = `${bookingData.vehicle_name || ''} ${bookingData.vehicle_make || ''} ${bookingData.vehicle_model || ''}`.trim();

     // Handle vehicle images (split and map them into URLs)
     const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
     const vehicleImage = formatImages(bookingData.vehicle_images);

    // Check sponsorship status
    const planExpiryDate = bookingData.plan_expiry_date || null;
    const sponsored = (bookingData.plan_id != '0' && new Date() <= new Date(planExpiryDate)) ? 'Yes' : 'No';

    // Fetch favorite status
    let favoriteStatus = 'Dislike'; // Default if not a favorite
    const [favoriteData] = await con.query(`SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?`, [bookingData.vehicle_id, userID]);
    if (favoriteData.length > 0) { 
      favoriteStatus = favoriteData[0].status || 'Dislike'; 
    }

    
    let formattedExtras = [];
    if (bookingData.extras_details) {
      let validJsonString = bookingData.extras_details
        .replace(/(\w+):/g, '"$1":')
        .replace(/:\s*(\w+)/g, ': "$1"'); 
      validJsonString = `[${validJsonString}]`;
      ////console.log("Valid JSON String:", validJsonString);
      try {
        formattedExtras = JSON.parse(validJsonString);
      } catch (error) {
        console.error("Error parsing extras:", error);
        formattedExtras = []; 
      }
    }
    const extras = formattedExtras;
    
    // Construct the response data
    const bookingDetails = {
      rating: bookingData.rating ? parseFloat(bookingData.rating.toFixed(1)) : 0,// Default rating to 0 if null
      
     // rating: bookingData.rating || 0,  // Default rating to 0 if null
      booking_id: bookingData.booking_id,
      vehicle_id: bookingData.vehicle_id,
      favorite_status: favoriteStatus,
      start_date: bookingData.start_date,
      end_date: bookingData.end_date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      pickup_address: bookingData.pickup_address,
      dropoff_address: bookingData.dropoff_address,
      pickup_location_charge: bookingData.pickup_location_charge,
      dropoff_location_charge: bookingData.dropoff_location_charge,
      extra_charges: bookingData.extra_charges,
      insurance_charge: bookingData.insurance_charge,
      vat_charge: bookingData.vat_charge,
      applied_reward_price: bookingData.applied_reward_price,
      applied_coupon_charge: bookingData.applied_coupon_charge,
      total_charge: bookingData.total_charge,
      refundable_charge: bookingData.refundable_charge,
      grand_total: bookingData.grand_total,
      booking_status: bookingData.booking_status,
      vehicleName: vehicleName,
      sponsored: sponsored,
      vehicleImage: vehicleImage,
      extras_details: extras,
      review  : bookingData.review,
      cancel_by : bookingData.cancel_by,
      cancel_reason : bookingData.cancel_reason,
      
    };

    // Commit transaction
    await con.commit();

    // Send response with booking details
    res.status(200).json(bookingDetails);

  } catch (error) {
    // Rollback in case of error
    await con.rollback();
    console.error("Error:", error);
    res.status(500).json({ result: "failed", message: "Unable to fetch booking details!" });
  } finally {
    // Release the connection
    con.release();
  }
};

const fetchReasons = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  try {
      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type=?', [userID,type]);
      
      if (!existingUser) {
        return res.status(404).json({ result: "User not found" });
      }

      const [results] = await con.query('SELECT * FROM `tbl_reasons` WHERE user_type=? AND reason_type="Cancel" AND deleted="No" AND status="Active"', [type] );
       // Format the result using map to return specific fields
       const formattedData = results.map(canceldata => ({
        reason_id: canceldata.reason_id,
        reason_type: canceldata.reason_type,  // or masked if needed
        reason: canceldata.reason,
        status: canceldata.status,
        user_type: canceldata.user_type,
      }));
      
      res.status(200).json(formattedData);

    } catch (error) {
      ////console.log('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
}

const fetchHelpReasons = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  try {
      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type=?', [userID,type]);
      
      if (!existingUser) {
        return res.status(404).json({ result: "User not found" });
      }

      const [results] = await con.query('SELECT * FROM `tbl_reasons` WHERE user_type=? AND reason_type="Complain" AND deleted="No" AND status="Active"', [type] );
       // Format the result using map to return specific fields
       const formattedData = results.map(canceldata => ({
        reason_id: canceldata.reason_id,
        reason_type: canceldata.reason_type,  // or masked if needed
        reason: canceldata.reason,
       // reason_subcat1: JSON.parse(canceldata.reason_subcat),
        reason_subcat :JSON.parse(canceldata.reason_subcat).map(model => ({ subcat_name: model })),
        status: canceldata.status,
        user_type: canceldata.user_type,
      }));
      
      res.status(200).json(formattedData);

    } catch (error) {
      ////console.log('Error:', error);
      res.status(500).json({ result: "Internal Server Error" });
    } finally {
      con.release();
    }
}

const cancelBooking = async(req, res, next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const { booking_id, cancel_reason } = req.body;
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0];  // Format the date properly

  try {
    await con.beginTransaction();

    // Fetch user details
    const [[existingUser1]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?', [userID, type]);
    
    if (!existingUser1) {
      return res.status(404).json({ result: "User not found" });
    }
    let existingbooking , owner_id , existingOwner , ownerName , userName , existingUser;
    if(type === "User")
    {
       // Fetch user details
      [[existingbooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND user_id = ?', [booking_id, userID]);
      owner_id = existingbooking.owner_id;

      // Fetch user details
      [[existingOwner]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? ', [owner_id] );
      ownerName = existingOwner.first_name + ' ' + existingOwner.last_name;

      [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
      userName = existingUser.first_name + ' ' + existingUser.last_name;
    }
    else if(type === "Owner")
    {
      // Fetch user details
      [[existingbooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND owner_id = ?', [booking_id, userID]);
      owner_id = existingbooking.user_id;

    // Fetch user details
      [[existingOwner]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID] );
      ownerName = existingOwner.first_name + ' ' + existingOwner.last_name;

      [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [owner_id]);
      userName = existingUser.first_name + ' ' + existingUser.last_name;
    }

    // Determine query based on user type
    let fetchDataQuery;
    if (type === "User") {
      fetchDataQuery = `UPDATE tbl_bookings SET booking_status = ?, cancel_by = ?, cancel_reason = ? WHERE booking_id = ? AND user_id = ?`;
    } else if (type === "Owner") {
      fetchDataQuery = `UPDATE tbl_bookings SET booking_status = ?, cancel_by = ?, cancel_reason = ? WHERE booking_id = ? AND owner_id = ?`;
    }

    const [result] = await con.query(fetchDataQuery, ['Cancelled', type, cancel_reason, booking_id, userID]);

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ result: "Booking not found or unauthorized" });
    }
    await con.commit();
    if (type === "User") {

        const title1 = "Booking Cancelled!"
        const body1 = "You have successfully cancelled your booking. We hope to see you again soon!"
        const title2 = "Booking Cancelled!"
        const body2 = `The ${userName} has cancelled their booking for your car. The booking is now closed.`

        const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
        await con.query(sql_notify, [
         booking_id, userID, 'User', title1, body1, date, time, // User notification
         booking_id, owner_id, 'Owner', title2, body2, date, time // Owner notification
        ]);


        await sendPushNotifications([
          { user_id: userID, title: title1, body: body1 },
          { user_id: owner_id, title: title2, body: body2 },
        ]);

    } else if (type === "Owner") {

      const title1 = "Booking Cancelled!"
      const body1 = `The Owner ${ownerName} has cancelled their booking for your car. The booking is now closed.`
      
      const title2 = "Booking Cancelled!"
      const body2 = "You have successfully cancelled your booking. We hope to see you again soon!"

      const sql_notify1 = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
        await con.query(sql_notify1, [
         booking_id, owner_id, 'User', title1, body1, date, time, // User notification
         booking_id, userID, 'Owner', title2, body2, date, time // Owner notification
        ]);

      await sendPushNotifications([
        { user_id: owner_id, title: title1, body: body1 },
        { user_id: userID, title: title2, body: body2 },
      ]);
     
    }
    // If update was successful, respond with a success message
    return res.status(200).json({ result: "Booking canceled successfully" });

  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    return res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const cancelBooking1 = async(req, res, next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const { booking_id, cancel_reason } = req.body;

  try {
    // Fetch user details
    const [[existingUser]] = await con.query(
      'SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?', 
      [userID, type]
    );
    
    if (!existingUser) {
      return res.status(404).json({ result: "User not found" });
    }

    // Fetch booking details to get the payment authorization_id or capture_id
    const [[booking]] = await con.query(
      'SELECT * FROM tbl_bookings WHERE booking_id = ? AND user_id = ? OR owner_id = ?',
      [booking_id, userID, userID]
    );
    
    if (!booking) {
      return res.status(404).json({ result: "Booking not found" });
    }

    const authorizationId = booking.authorization_id;  // Assuming you stored authorization_id in the booking


    // Determine query based on user type
    let fetchDataQuery;
    if (type === "User") {
      fetchDataQuery = `UPDATE tbl_bookings SET booking_status = ?, cancel_by = ?, cancel_reason = ? WHERE booking_id = ? AND user_id = ?`;
    } else if (type === "Owner") {
      fetchDataQuery = `UPDATE tbl_bookings SET booking_status = ?, cancel_by = ?, cancel_reason = ? WHERE booking_id = ? AND owner_id = ?`;
    }

    const [result] = await con.query(fetchDataQuery, ['Cancelled', type, cancel_reason, booking_id, userID]);

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ result: "Booking not found or unauthorized" });
    }

    // Void the payment if there's an authorization_id
    if (authorizationId) {
      try {

        const paypalClient = await getPayPalClient();
        const voidPaymentRequest = new paypal.orders.OrdersVoidRequest(authorizationId);
        voidPaymentRequest.prefer('return=representation');
        const voidResponse = await paypalClient.execute(voidPaymentRequest);

        const voidId = voidResponse.result.id;
        ////console.log("Payment voided, voidId:", voidId);

      } catch (paymentError) {
        console.error('Error voiding payment:', paymentError.message);
        return res.status(500).json({ result: "Failed to void payment" });
      }
    }

    // If update was successful, respond with a success message
    return res.status(200).json({ result: "Booking canceled successfully" });

  } catch (error) {
    ////console.log('Error:', error);
    return res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const acceptBooking = async(req, res, next) => {
  const con = await connection();
  const owner_id = req.user.user_id;
  const type = req.user.user_type;
  const booking_id = req.body.booking_id;
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0];  // Format the date properly

  try {
    // Fetch user details
    const [[existingOwner]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?', [owner_id, type] );
    const ownerName = existingOwner.first_name + ' ' + existingOwner.last_name;

    if (!existingOwner) {
      return res.status(404).json({ result: "User not found" });
    }

    // Fetch user details
    const [[existingbooking]] = await con.query(
      'SELECT * FROM tbl_bookings WHERE booking_id = ? AND owner_id = ?', 
      [booking_id, owner_id]
    );
    const userID = existingbooking.user_id;
    
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    const userName = existingUser.first_name + ' ' + existingUser.last_name;

    // Determine query based on user type
    let fetchDataQuery = `UPDATE tbl_bookings SET booking_status = ? WHERE booking_id = ? AND owner_id = ?`;

    const [result] = await con.query(fetchDataQuery, ['Confirmed', booking_id, owner_id]);

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ result: "Booking not found or unauthorized" });
    }

    const title1 = "Your Booking is Confirmed!"
    const body1 = `The car owner ${ownerName} has accepted your booking. Check the details in the app.`

    const title2 = "Booking Accepted Successfully!"
    const body2 = `You have confirmed the user's ${userName} booking. Details are updated in the app`
    
    const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
    await con.query(sql_notify, [
     booking_id, userID, 'User', title1, body1, date, time, // User notification
     booking_id, owner_id, 'Owner', title2, body2, date, time // Owner notification
    ]);

   await sendPushNotifications([
      { user_id: userID, title: title1, body: body1 },
      { user_id: owner_id, title: title2, body: body2 },
    ]);

    // If update was successful, respond with a success message
    return res.status(200).json({ result: "Booking accepted successfully" });

  } catch (error) {
    ////console.log('Error:', error);
    return res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const acceptBooking1 = async (req, res) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const booking_id = req.body.booking_id;
  const authorizationId = req.body.authorization_id; // Authorization ID is expected in request body

  try {
    
    // Fetch user details
    const [[existingUser]] = await con.query(
      'SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?', 
      [userID, type]
    );

    if (!existingUser) {
      return res.status(404).json({ result: "User not found" });
    }

     // Step 1: Check if the authorizationToken exists
     if (!authorizationId) {
      return res.status(400).json({result: 'Authorization token is required.' });
    }


    // // Initialize PayPal client and check payment authorization
    // const paypalClient = await getPayPalClient();
    // const request = new paypal.payments.AuthorizationsGetRequest(authorizationId);
    // const response = await paypalClient.execute(request);

    // // Check if the authorization is approved
    // if (response.result.status !== 'AUTHORIZED') {
    //   return res.status(400).json({ result: "Payment authorization failed" });
    // }

    // // Update booking status if payment is authorized
    // const fetchDataQuery = `UPDATE tbl_bookings SET booking_status = ? WHERE booking_id = ? AND owner_id = ?`;
    // const [result] = await con.query(fetchDataQuery, ['Confirmed', booking_id, userID]);

    // if (result.affectedRows === 0) {
    //   return res.status(404).json({ result: "Booking not found or unauthorized" });
    // }
  //  return res.status(200).json({ result: "Booking accepted successfully" });

     // Step 2: Capture the authorized payment using the authorization token
     const paypalClient = await getPayPalClient();
     const capturePaymentRequest = new paypal.orders.OrdersCaptureRequest(authorizationId);
     capturePaymentRequest.prefer('return=representation');
     const capture = await paypalClient.execute(capturePaymentRequest);
     const captureId = capture.result.purchase_units[0].payments.captures[0].id;
 
     // Step 3: Store the captureId in the database (optional)
     const query = 'UPDATE tbl_bookings SET booking_status = ? WHERE booking_id = ? AND owner_id = ?';
     await con.query(query,['Confirmed', booking_id, userID], (err) => {
       if (err) throw err;
       return res.status(200).json({ result: "Booking accepted successfully" });
     });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ result: "Internal Server Error" });
  } finally {
    if (con) con.release();
  }
};

const checkInStatus1 = async (req, res, next) => {
  const con = await connection();
  const { miles, fuel_level, booking_id } = req.body;

  try {
    await con.beginTransaction();

    const userID = req.user.user_id;
    ////console.log("user_id--- ", userID);
    const type = req.user.user_type;
    ////console.log("user_type--- ", type);

    if (!miles || !fuel_level || !booking_id) {
      res.status(200).json({ result: "Incomplete Parameters" });
      return;
    }

    let carImages = '';
    let signatureImage = '';

    if (req.files && req.files.carImages) {
      carImages = req.files.carImages.map(file => file.filename).join(',');
    }
     // Handle single signature image
     if (req.files && req.files.signatureImage && req.files.signatureImage.length > 0) {
      signatureImage = req.files.signatureImage[0].filename; // It's an array with one file
    }

    // Fetch the existing user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    var Checkin_miles ,Checkin_fuel_level

    const [ownerCheckinData] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND owner_Checkin_miles != ""', [booking_id]);
    Checkin_miles = ownerCheckinData.owner_Checkin_miles;
    Checkin_fuel_level = ownerCheckinData.owner_Checkin_fuel_level;

    const [userCheckinData] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND user_Checkin_miles != ""', [booking_id]);
    Checkin_miles = ownerCheckinData.owner_Checkin_miles;
    Checkin_fuel_level = ownerCheckinData.owner_Checkin_fuel_level;

    if (ownerCheckinData.length > 0  && type === 'User' && Checkin_miles !=miles && Checkin_fuel_level !=fuel_level ) {
       await con.rollback();
      return res.status(200).json({ result: "CheckIn miles and fuel level should be same for user and owner side" });
    }

    if (userCheckinData.length > 0 && type === 'Owner' && Checkin_miles !=miles && Checkin_fuel_level !=fuel_level ) {
      await con.rollback();
      return res.status(200).json({ result: "CheckIn miles and fuel level should be same for user and owner side" });
    }


    let updateSql = '';
    let updateValues = [];

    if (type === 'User') {
      updateSql = 'UPDATE tbl_bookings SET booking_status=? , user_Checkin_miles=?, user_Checkin_fuel_level=?, user_Checkin_carImages=?, user_Checkin_signatureImage=? WHERE user_id=? AND booking_id=?';
      updateValues = ['UserCheck_In',miles, fuel_level, carImages, signatureImage, userID, booking_id];
    } else if (type === 'Owner') {
      updateSql = 'UPDATE tbl_bookings SET booking_status=? , owner_Checkin_miles=?, owner_Checkin_fuel_level=?, owner_Checkin_carImages=?, owner_Checkin_signatureImage=? WHERE owner_id=? AND booking_id=?';
      updateValues = ['OwnerCheck_In',miles, fuel_level, carImages, signatureImage, userID, booking_id];
    }

    await con.query(updateSql, updateValues);

    let checkInStatusSql = '';
    let checkInStatusValues = [];

    if (type === 'User') {
      const [[existingData]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND owner_Checkin_miles != ""', [booking_id]);
      if (existingData) {
        checkInStatusSql = 'UPDATE tbl_bookings SET booking_status="On_Going" WHERE user_id=? AND booking_id=?';
        checkInStatusValues = [userID, booking_id];
      }
    } else if (type === 'Owner') {
      const [[existingData]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND user_Checkin_miles != ""', [booking_id]);
      if (existingData) {
        checkInStatusSql = 'UPDATE tbl_bookings SET booking_status="On_Going" WHERE owner_id=? AND booking_id=?';
        checkInStatusValues = [userID, booking_id];
      }
    }

    if (checkInStatusSql && checkInStatusValues.length) {
      await con.query(checkInStatusSql, checkInStatusValues);
    }

    await con.commit();
    res.json({ result: "success" });

  } catch (error) {
    await con.rollback();
    console.error('Error in checkInStatus API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};

const checkInStatus = async (req, res, next) => {
  const con = await connection();
  const { miles, fuel_level, booking_id } = req.body;
  try {
    await con.beginTransaction();
    //for seprate date & time 
    const currentTime = moment().tz("Asia/Hong_Kong");
    const date = currentTime.format('YYYY-MM-DD');
    const time = new Date().toLocaleTimeString();
    console.log("date-->",date)
    const userID = req.user.user_id;
    const type = req.user.user_type;

    if (!miles || !fuel_level || !booking_id) {
      return res.status(200).json({ result: "Incomplete Parameters" });
    }

    let carImages = '';
    let signatureImage = '';

    // Handle multiple car images if uploaded
    if (req.files && req.files.carImages) {
      carImages = req.files.carImages.map(file => file.filename).join(',');
    }

    // Handle single signature image
    if (req.files && req.files.signatureImage && req.files.signatureImage.length > 0) {
      signatureImage = req.files.signatureImage[0].filename;
    }

    // Fetch user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    // Fetch booking check-in data for both user and owner
    const [[bookingData]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ?', [booking_id]);
    if (!bookingData) {
      await con.rollback();
      return res.status(200).json({ result: "Booking not found" });
    }
    const owner_id = bookingData.owner_id;
    const user_id = bookingData.user_id;
    let start_date = bookingData.start_date;
    
    console.log("start_date-->",start_date)
  
    // let responseData ;
    // if(type == "User")
    // {
    //   responseData = `Your booking start date is on ${start_date}. Please check in on the correct day to begin your rental.`
    // }
    // else if(type == "Owner")
    // {
    //   responseData = `The booking start date for the user is on ${start_date}. Please wait until the correct day to confirm check-in.`
    // }

    // const normalized_start_date =  moment(start_date).format('YYYY-MM-DD');
    // const normalized_date = moment(date).format('YYYY-MM-DD');
    // console.log("normalized_date type:", normalized_date);
    // console.log("date normalized_start_date:",normalized_start_date);
    // console.log("type-->",type)
    // if (normalized_start_date === normalized_date) {
    //   await con.rollback();
    //   return res.status(200).json({ result: responseData });
    // }


    // Extract existing check-in miles and fuel level for both user and owner
    const ownerCheckinMiles = bookingData.owner_Checkin_miles || "";
    const ownerCheckinFuelLevel = bookingData.owner_Checkin_fuel_level || "";
    const userCheckinMiles = bookingData.user_Checkin_miles || "";
    const userCheckinFuelLevel = bookingData.user_Checkin_fuel_level || "";

    // Validate miles and fuel level between user and owner
    if (type === 'User' && ownerCheckinMiles && (ownerCheckinMiles !== miles || ownerCheckinFuelLevel !== fuel_level)) {
      await con.rollback();
      return res.status(200).json({ result: "CheckIn miles and fuel level should be the same for user and owner side" });
    }

    if (type === 'Owner' && userCheckinMiles && (userCheckinMiles !== miles || userCheckinFuelLevel !== fuel_level)) {
      await con.rollback();
      return res.status(200).json({ result: "CheckIn miles and fuel level should be the same for user and owner side" });
    }

    // Update check-in details based on user type
    let updateSql = '';
    let updateValues = [];

    if (type === 'User') {
      updateSql = 'UPDATE tbl_bookings SET booking_status = ?, user_Checkin_miles = ?, user_Checkin_fuel_level = ?, user_Checkin_carImages = ?, user_Checkin_signatureImage = ? WHERE user_id = ? AND booking_id = ?';
      updateValues = ['UserCheck_In', miles, fuel_level, carImages, signatureImage, userID, booking_id];
    } else if (type === 'Owner') {
      updateSql = 'UPDATE tbl_bookings SET booking_status = ?, owner_Checkin_miles = ?, owner_Checkin_fuel_level = ?, owner_Checkin_carImages = ?, owner_Checkin_signatureImage = ? WHERE owner_id = ? AND booking_id = ?';
      updateValues = ['OwnerCheck_In', miles, fuel_level, carImages, signatureImage, userID, booking_id];
    }

    await con.query(updateSql, updateValues);

    // Update booking status to "On_Going" if both sides have checked in
    if (type === 'User' && ownerCheckinMiles) {
      await con.query('UPDATE tbl_bookings SET booking_status = "On_Going" WHERE booking_id = ?', [booking_id]);
    } else if (type === 'Owner' && userCheckinMiles) {
      await con.query('UPDATE tbl_bookings SET booking_status = "On_Going" WHERE booking_id = ?', [booking_id]);
    }
  
    await con.commit();
    if (type === "User") {

      const title1 = "Check-In Successful!"
      const body1 = "You’ve successfully checked in for your car rental. Enjoy your trip!"
      const title2 = "User Checked In!"
      const body2 = "The user has successfully checked in for their rental. The trip has started."
     
      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, user_id, 'User', title1, body1, date, time, // User notification
       booking_id, owner_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: user_id, title: title1, body: body1 },
        { user_id: owner_id, title: title2, body: body2 },
      ]);

    } else if (type === "Owner") {

      const title1 = "Check-In Successful!"
      const body1 = "You’ve successfully checked in for the booking. The user has been notified."
      
      const title2 = "Owner Checked In!"
      const body2 = "The car owner has confirmed the check-in for your rental. You’re ready to go!"

      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, owner_id, 'User', title1, body1, date, time, // User notification
       booking_id, user_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: owner_id, title: title1, body: body1 },
        { user_id: user_id, title: title2, body: body2 },
      ]);
    
    }

    if (type === "User" && ownerCheckinMiles) {

      const title1 = "Your Rental is Ongoing!"
      const body1 = "Your car rental is currently ongoing. Enjoy your trip and drive safely!"
      const title2 = "User Rental is Ongoing!"
      const body2 = "The user has started the rental. The trip is ongoing. Check the app for any updates."

      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, user_id, 'User', title1, body1, date, time, // User notification
       booking_id, owner_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: user_id, title: title1, body: body1 },
        { user_id: owner_id, title: title2, body: body2 },
      ]);

    } else if (type === "Owner" && userCheckinMiles) {

      const title1 = "Rental Ongoing!"
      const body1 =  "Your car rental is now ongoing. The user has checked in and the trip has begun."
      
      const title2 = "Your Rental is Ongoing!"
      const body2 = "The car owner has confirmed the start of your rental. Enjoy your drive!"

      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, owner_id, 'User', title1, body1, date, time, // User notification
       booking_id, user_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: owner_id, title: title1, body: body1 },
        { user_id: user_id, title: title2, body: body2 },
      ]);
    
    }

    return res.json({ result: "success" });

  } catch (error) {
    await con.rollback();
    console.error('Error in checkInStatus API:', error);
    return res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};

const checkOutStatus1 = async (req, res, next) => {
  const con = await connection();
  const { miles, fuel_level, booking_id } = req.body;
  const currentTime = moment().tz("Asia/Kolkata");
  const date = currentTime.format('YYYY-MM-DD');
  try {
    await con.beginTransaction();

    const userID = req.user.user_id;
    ////console.log("user_id--- ", userID);
    const type = req.user.user_type;
    ////console.log("user_type--- ", type);

    if (!miles || !fuel_level || !booking_id) {
      res.status(200).json({ result: "Incomplete Parameters" });
      return;
    }

    let carImages = '';
    let signatureImage = '';

    if (req.files && req.files.carImages) {
      carImages = req.files.carImages.map(file => file.filename).join(',');
    }
     // Handle single signature image
     if (req.files && req.files.signatureImage && req.files.signatureImage.length > 0) {
      signatureImage = req.files.signatureImage[0].filename; // It's an array with one file
    }

    // Fetch the existing user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    let updateSql = '';
    let updateValues = [];

    if (type === 'User') {
      updateSql = 'UPDATE tbl_bookings SET booking_status=? , user_CheckOut_miles=?, user_CheckOut_fuel_level=?, user_CheckOut_carImages=?, user_CheckOut_signatureImage=? WHERE user_id=? AND booking_id=?';
      updateValues = ['UserCheck_Out',miles, fuel_level, carImages, signatureImage, userID, booking_id];
    } else if (type === 'Owner') {
      updateSql = 'UPDATE tbl_bookings SET booking_status=? , owner_CheckOut_miles=?, owner_CheckOut_fuel_level=?, owner_CheckOut_carImages=?, owner_CheckOut_signatureImage=? WHERE owner_id=? AND booking_id=?';
      updateValues = ['OwnerCheck_Out',miles, fuel_level, carImages, signatureImage, userID, booking_id];
    }

    await con.query(updateSql, updateValues);

    let CheckOutStatusSql = '';
    let CheckOutStatusValues = [];

    if (type === 'User') {
      const [[existingData]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND owner_CheckOut_miles != ""', [booking_id]);
      if (existingData) {
        CheckOutStatusSql = 'UPDATE tbl_bookings SET booking_status="Completed" WHERE user_id=? AND booking_id=?';
        CheckOutStatusValues = [userID, booking_id];
      }
    } else if (type === 'Owner') {
      const [[existingData]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND user_CheckOut_miles != ""', [booking_id]);
      if (existingData) {
        CheckOutStatusSql = 'UPDATE tbl_bookings SET booking_status="Completed" WHERE owner_id=? AND booking_id=?';
        CheckOutStatusValues = [userID, booking_id];
      }
    }

    if (CheckOutStatusSql && CheckOutStatusValues.length) {
      await con.query(CheckOutStatusSql, CheckOutStatusValues);
    }

    await con.commit();
    res.json({ result: "success" });

  } catch (error) {
    await con.rollback();
    console.error('Error in CheckOutStatus API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};

const checkOutStatus = async (req, res, next) => {
  const con = await connection();
  const { miles, fuel_level, booking_id } = req.body;
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0];  // Format the date properly


  try {
    await con.beginTransaction();

    const userID = req.user.user_id;
    const type = req.user.user_type;

    if (!miles || !fuel_level || !booking_id) {
      return res.status(200).json({ result: "Incomplete Parameters" });
    }

    let carImages = '';
    let signatureImage = '';

    // Handle multiple car images if uploaded
    if (req.files && req.files.carImages) {
      carImages = req.files.carImages.map(file => file.filename).join(',');
    }

    // Handle single signature image
    if (req.files && req.files.signatureImage && req.files.signatureImage.length > 0) {
      signatureImage = req.files.signatureImage[0].filename;
    }

    // Fetch user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    // Fetch booking check-out data for both user and owner
    const [[bookingData]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ?', [booking_id]);
    if (!bookingData) {
      await con.rollback();
      return res.status(200).json({ result: "Booking not found" });
    }
    const owner_id = bookingData.owner_id;
    const user_id = bookingData.user_id;

    // Extract existing check-out miles and fuel level for both user and owner
    const ownerCheckOutMiles = bookingData.owner_Checkout_miles || "";
    const ownerCheckOutFuelLevel = bookingData.owner_Checkout_fuel_level || "";
    const userCheckOutMiles = bookingData.user_Checkout_miles || "";
    const userCheckOutFuelLevel = bookingData.user_Checkout_fuel_level || "";

    // Validate check-out miles and fuel level consistency between user and owner
    if (type === 'User' && ownerCheckOutMiles && (ownerCheckOutMiles !== miles || ownerCheckOutFuelLevel !== fuel_level)) {
      await con.rollback();
      return res.status(200).json({ result: "CheckOut miles and fuel level should be the same for user and owner side" });
    }

    if (type === 'Owner' && userCheckOutMiles && (userCheckOutMiles !== miles || userCheckOutFuelLevel !== fuel_level)) {
      await con.rollback();
      return res.status(200).json({ result: "CheckOut miles and fuel level should be the same for user and owner side" });
    }

    // Update check-out details based on user type
    let updateSql = '';
    let updateValues = [];

    if (type === 'User') {
      updateSql = 'UPDATE tbl_bookings SET booking_status=?, user_Checkout_miles=?, user_Checkout_fuel_level=?, user_Checkout_carImages=?, user_Checkout_signatureImage=? WHERE user_id=? AND booking_id=?';
      updateValues = ['UserCheck_Out', miles, fuel_level, carImages, signatureImage, userID, booking_id];
    } else if (type === 'Owner') {
      updateSql = 'UPDATE tbl_bookings SET booking_status=?, owner_Checkout_miles=?, owner_Checkout_fuel_level=?, owner_Checkout_carImages=?, owner_Checkout_signatureImage=? WHERE owner_id=? AND booking_id=?';
      updateValues = ['OwnerCheck_Out', miles, fuel_level, carImages, signatureImage, userID, booking_id];
    }

    await con.query(updateSql, updateValues);

    // Update booking status to "Completed" if both user and owner have checked out
    let checkOutStatusSql = '';
    let checkOutStatusValues = [];

    if (type === 'User' && ownerCheckOutMiles) {
      checkOutStatusSql = 'UPDATE tbl_bookings SET booking_status="Completed" WHERE booking_id=?';
      checkOutStatusValues = [booking_id];
    } else if (type === 'Owner' && userCheckOutMiles) {
      checkOutStatusSql = 'UPDATE tbl_bookings SET booking_status="Completed" WHERE booking_id=?';
      checkOutStatusValues = [booking_id];
    }

    if (checkOutStatusSql && checkOutStatusValues.length) {
      await con.query(checkOutStatusSql, checkOutStatusValues);
    }

    await con.commit();

    if (type === "User") {

      const title1 = "Check-Out Completed!"
      const body1 = "You’ve successfully checked out the car. Thank you for using our service!"
      const title2 = "User Has Checked Out!"
      const body2 = "The user has successfully checked out. Please review the car condition and complete the process."

      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, user_id, 'User', title1, body1, date, time, // User notification
       booking_id, owner_id, 'Owner', title2, body2, date, time // Owner notification
      ]);
    
      await sendPushNotifications([
        { user_id: user_id, title: title1, body: body1 },
        { user_id: owner_id, title: title2, body: body2 },
      ]);

    } else if (type === "Owner") {

      const title1 = "Car Check-Out Confirmed!"
      const body1 = "You’ve successfully confirmed the check-out. The rental is now complete."
      
      const title2 = "Owner Has Confirmed Check-Out!"
      const body2 = "The car owner has completed the check-out process. Your rental has ended."

      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, owner_id, 'User', title1, body1, date, time, // User notification
       booking_id, user_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: owner_id, title: title1, body: body1 },
        { user_id: user_id, title: title2, body: body2 },
      ]);    
    }


    if (type === "User" && ownerCheckOutMiles) {
      
      const title1 = "Booking Completed!"
      const body1 ="Your booking has been successfully completed. Thank you for using our service!"
      const title2 ="User Completed Booking!"
      const body2 = "The user has successfully completed the booking process. The rental is now closed."

      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, user_id, 'User', title1, body1, date, time, // User notification
       booking_id, owner_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: user_id, title: title1, body: body1 },
        { user_id: owner_id, title: title2, body: body2 },
      ]);

    } else if (type === "Owner" && userCheckOutMiles) {

      const title1 = "Owner Completed Booking!"
      const body1 =   "The car owner has confirmed the completion of your booking. Your rental has ended."
      
      const title2 = "Booking Completed!"
      const body2 = "You have successfully completed the booking process. The rental is now concluded."

      const sql_notify = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify, [
       booking_id, owner_id, 'User', title1, body1, date, time, // User notification
       booking_id, user_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: owner_id, title: title1, body: body1 },
        { user_id: user_id, title: title2, body: body2 },
      ]);
    }

    return res.json({ result: "success" });

  } catch (error) {
    await con.rollback();
    console.error('Error in checkOutStatus API:', error);
    return res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};

const fetchUserBookingHistory = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  const type = req.user.user_type;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const BASEURL1 = `http://${process.env.Host}/images/profiles/`;
  try {
      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
      
      if (!existingUser) {
        return res.status(404).json({ result: "User not found" });
      }

      // Determine query based on user type
      let fetchDataQuery;
      fetchDataQuery = `
        SELECT b.*,r.rating_id ,
               u.first_name, u.last_name, u.country_code, u.contact, u.profile_image AS profile_image,
               v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
               v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON v.vehicle_id =b.vehicle_id 
        LEFT JOIN tbl_user u ON u.user_id = b.owner_id
        LEFT JOIN tbl_rating r ON r.user_id = b.user_id  AND r.booking_id = b.booking_id AND r.user_type='User' 
        WHERE b.user_id = ? AND b.booking_status IN ('Cancelled','Completed') ORDER BY  b.booking_id DESC
      `;
      // Fetch bookings
      const [fetchData] = await con.query(fetchDataQuery, [userID]);

      // Format the result
      const formattedData = fetchData.map(bookingData => {
          let userName, userImage , userContact,userCountryCode;
          userName = bookingData.first_name + ' ' + bookingData.last_name;
          userImage = bookingData.profile_image ? `${BASEURL1}${bookingData.profile_image}` : '';
          userContact = bookingData.contact;
          userCountryCode  = bookingData.country_code;
      
     
        const vehicleName = `${bookingData.vehicle_name} ${bookingData.vehicle_make} ${bookingData.vehicle_model}`;
        const vehicleImagesArray = (bookingData.vehicle_images || '').split(',');
        const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

        // Handle vehicle images (split and map them into URLs)
        const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
        const vehicle_insurance_images = formatImages(bookingData.vehicle_insurance_images);
        const mot_certificate_images = formatImages(bookingData.mot_certificate_images);

        const start_dateObj = new Date(bookingData.start_date);
        const start_date = start_dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short',  day: 'numeric'});

        const end_dateObj = new Date(bookingData.end_date);
        const end_date = end_dateObj.toLocaleDateString('en-US', { year: 'numeric',month: 'short', day: 'numeric' });

        const rating_status = bookingData.rating_id ? 'Rated' : '';

        // Format the response
        return {
          booking_id: bookingData.booking_id,
          grand_total: bookingData.grand_total,
          vehicleName: vehicleName,
          vehicleImage: vehicleImage,
          vehicle_insurance_images : vehicle_insurance_images,
          mot_certificate_images : mot_certificate_images,
          start_date: start_date,
          end_date: end_date,
          booking_status: bookingData.booking_status,
          payment_mode: bookingData.payment_mode,
          payment_status: bookingData.payment_status,
          ownerId: bookingData.owner_id,
          ownerName: userName,
          ownerImage: userImage,
          ownerContact : userContact,
          ownerCountryCode : userCountryCode,
          ratingStatus : rating_status,
          cancel_by : bookingData.cancel_by,
          cancel_reason : bookingData.cancel_reason,
        };
      });

      res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ result: "failed", message: "Unable to fetch bookings!" });
  } finally {
    con.release();
  }
}

const fetchOwnerBookingHistory = async(req,res,next) => {
  const con = await connection();
  const userID = req.user.user_id;
  ////console.log(userID)
  const type = req.user.user_type;
  const BASEURL = `http://${process.env.Host}/images/docUploads/`;
  const BASEURL1 = `http://${process.env.Host}/images/profiles/`;
  const BASEURL2 = `http://${process.env.Host}/images/vehicleUploads/`;
  try {
      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
      
      if (!existingUser) {
        return res.status(404).json({ result: "User not found" });
      }

      // Determine query based on user type
      let  fetchDataQuery = `
        SELECT b.*,r.rating_id ,
              u.first_name, u.last_name, u.country_code, u.contact, u.profile_image AS profile_image,
              u.user_document_images, u.license_images, v.vehicle_images AS vehicle_images, v.vehicle_model,
              v.vehicle_make, v.vehicle_name
        FROM tbl_bookings b
        LEFT JOIN tbl_user u ON  u.user_id = b.user_id 
        LEFT JOIN tbl_vehicles v ON v.vehicle_id =  b.vehicle_id 
        LEFT JOIN tbl_rating r ON r.owner_id = b.owner_id AND r.booking_id = b.booking_id AND r.user_type='Owner' 
        WHERE b.owner_id = ? AND b.booking_status IN ('Cancelled','Completed') ORDER BY  b.booking_id DESC
        `;

      // Fetch bookings
      const [fetchData] = await con.query(fetchDataQuery, [userID]);

      // Format the result
      const formattedData = fetchData.map(bookingData => {
        const userName = bookingData.first_name + ' ' + bookingData.last_name;
        const userImage = bookingData.profile_image ? `${BASEURL1}${bookingData.profile_image}` : '';
        const userContact =bookingData.contact;
        const userCountryCode = bookingData.country_code;
        const vehicleName = `${bookingData.vehicle_name} ${bookingData.vehicle_make} ${bookingData.vehicle_model}`;
        const vehicleImagesArray = (bookingData.vehicle_images || '').split(',');
        const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL2}${vehicleImagesArray[0]}` : '';

        // Handle vehicle images (split and map them into URLs)
        const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
        const user_document_images = formatImages(bookingData.user_document_images);
        const license_images = formatImages(bookingData.license_images);

        const start_dateObj = new Date(bookingData.start_date);
        const start_date = start_dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short',  day: 'numeric'});

        const end_dateObj = new Date(bookingData.end_date);
        const end_date = end_dateObj.toLocaleDateString('en-US', { year: 'numeric',month: 'short', day: 'numeric' });
        const rating_status = bookingData.rating_id ? 'Rated' : '';
        // Format the response
        return {
          booking_id: bookingData.booking_id,
          grand_total: bookingData.grand_total,
          vehicleName: vehicleName,
          vehicleImage: vehicleImage,
          user_document_images : user_document_images,
          license_images : license_images,
          start_date: start_date,
          end_date: end_date,
          booking_status: bookingData.booking_status,
          payment_mode: bookingData.payment_mode,
          payment_status: bookingData.payment_status,
          userId: bookingData.user_id,
          userName: userName,
          userImage: userImage,
          userContact : userContact,
          userCountryCode : userCountryCode,
          ratingStatus : rating_status,
          cancel_by : bookingData.cancel_by,
          cancel_reason : bookingData.cancel_reason,
        };
      });

      res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ result: "failed", message: "Unable to fetch bookings!" });
  } finally {
    con.release();
  }
}

const completedReward = async(req,res,next) => {
  const con = await connection();
  const { booking_id } = req.body;
  const currentTime = moment().tz("Asia/Kolkata");
  const date = currentTime.format('YYYY-MM-DD');
  try {
    await con.beginTransaction();

    const userID = req.user.user_id;
    console.log("user_id--- ", userID);
    const type = req.user.user_type;
    console.log("user_type--- ", type);

    if (!booking_id) {
      res.status(200).json({ result: "Incomplete Parameters" });
      return;
    }
    // Fetch the existing user details
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }
    const user_wallet = parseFloat((type === "Owner") ? existingUser.owner_wallet : existingUser.user_wallet);
    const used_affiliation_code = existingUser.used_affiliation_code ?existingUser.used_affiliation_code: '';
    const used_invite_code = existingUser.used_invite_code ?existingUser.used_invite_code: '';
    console.log('user_wallet--->',user_wallet);

    // const [[existingtblaffiliationReward]] = await con.query('SELECT * FROM tbl_affiliation_reward WHERE expiry_date >= ?',[date]);
    // const reward_percentage =  parseFloat(existingtblaffiliationReward.reward_percentage?existingtblaffiliationReward.reward_percentage: 0);
    // const reward_limit = existingtblaffiliationReward.reward_limit?existingtblaffiliationReward.reward_limit: 0;
    // //console.log('reward_percentage--->',reward_percentage);

    const [rows] = await con.query('SELECT * FROM tbl_affiliation_reward WHERE expiry_date >= ?',[date] );
    const existingtblaffiliationReward = rows.length > 0 ? rows[0] : null;
    let reward_percentage , reward_limit
    if (existingtblaffiliationReward) {
        reward_percentage = parseFloat(existingtblaffiliationReward.reward_percentage || 0);
        reward_limit = existingtblaffiliationReward.reward_limit || 0;
        ////console.log('reward_percentage--->', reward_percentage);
    } else {
        ////console.log('No affiliation reward found for the given date.');
        reward_percentage =0;
        reward_limit =0;
    }

    ////console.log('reward_limit--->',reward_limit);

    // const [[existingReferral]] = await con.query('SELECT * FROM tbl_referral_amount WHERE expiry_date >= ?',[date]);
    // const inviter_amount = parseFloat(existingReferral.inviter_amount ? existingReferral.inviter_amount : 0);
    // const signup_amount = parseFloat(existingReferral.signup_amount ?existingReferral.signup_amount: 0);
 
    const [rowss] = await con.query('SELECT * FROM tbl_referral_amount WHERE expiry_date >= ?', [date] );
    const existingReferral = rowss.length > 0 ? rows[0] : null;
    let inviter_amount,signup_amount
    if (existingReferral) {
       inviter_amount = parseFloat(existingReferral.inviter_amount || 0);
       signup_amount = parseFloat(existingReferral.signup_amount || 0);
      // //console.log('inviter_amount--->', inviter_amount);
      // //console.log('signup_amount--->', signup_amount);
    } else {
      // //console.log('No referral data found for the given date.');
      // Handle the case where no referral data is found, e.g., set default values or return an error.
       inviter_amount = 0;
       signup_amount = 0;
    }


    const [[existingbooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ?',[booking_id]);
    const booking_amount = parseFloat(existingbooking.grand_total ? existingbooking.grand_total : 0);
    const refundable_charge = parseFloat(existingbooking.refundable_charge ? existingbooking.refundable_charge : 0);
    const bookingUser_id = existingbooking.user_id;
    ////console.log('booking_amount--->',booking_amount);

    const [completebookings] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND booking_status=?',[booking_id,'Completed']);
      ////console.log("existingbookings.length----->",existingbookings.length);
      if(completebookings.length == '1' && type === "User")
      {
        const [[existingBUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?',[bookingUser_id]);
        const existingBUsere_wallet =parseFloat(existingBUser.user_wallet);
      
        const newbUserWallet = existingBUsere_wallet + refundable_charge;

        console.log('newbUserWallet--->',newbUserWallet);
        console.log('existingBUsere_wallet--->',existingBUsere_wallet);

        await con.query('UPDATE tbl_user SET user_wallet=? WHERE user_id=?', [newbUserWallet,bookingUser_id]);
        await con.query('INSERT INTO tbl_transactions(user_id, wallet_type, transaction_type, transaction_amount, current_wallet_amount, transaction_mode,booking_id,status) VALUES (?,?,?,?,?,?,?,?)',[bookingUser_id, 'User','Security Amount', refundable_charge ,newbUserWallet,'Admin',booking_id,'Completed' ]);
      }


    if(used_invite_code != "")
    {
      const [existingbookings] = await con.query('SELECT * FROM tbl_bookings WHERE user_id = ? AND booking_status=?',[userID,'Completed']);
      ////console.log("existingbookings.length----->",existingbookings.length);
      if(existingbookings.length == '1')
      {
        const [[existingInvite]] = await con.query('SELECT * FROM tbl_user WHERE invite_code = ?',[used_invite_code]);
        const existingInviteuser_wallet =parseFloat((type === "Owner") ? existingInvite.owner_wallet : existingInvite.user_wallet);
        const existingInviteuser_id = existingInvite.user_id ? existingInvite.user_id : 0;
        ////console.log('affiliationuser_wallet--->',affiliationuser_wallet);
        ////console.log('existingInviteuser_wallet--->',existingInviteuser_wallet);

        const newUserWallet = user_wallet + signup_amount;
        ////console.log('newUserWallet--->',newUserWallet);
        const newInviterWallet= existingInviteuser_wallet + inviter_amount;
        ////console.log('newInviterWallet--->',newInviterWallet);

        let updateSql , updateSql1;
        if (type === 'User') {
          updateSql = await con.query('UPDATE tbl_user SET user_wallet=? WHERE user_id=?', [newUserWallet,userID]);
          updateSql1 = await con.query('UPDATE tbl_user SET user_wallet=? WHERE user_id=?', [newInviterWallet,existingInviteuser_id]);
        } else if (type === 'Owner') {
          updateSql = await con.query('UPDATE tbl_user SET owner_wallet=? WHERE user_id=?', [newUserWallet,userID]);
          updateSql1 = await con.query('UPDATE tbl_user SET owner_wallet=? WHERE user_id=?', [newInviterWallet,existingInviteuser_id]);
        }
        // const sql = 'INSERT INTO tbl_transactions(user_id, wallet_type, transaction_type, deposit_amount, current_wallet_amount, transaction_mode,reward_by_user,status) VALUES (?,?,?,?,?,?,?,?)';
        // const values = [userID, type, 'Deposite', signup_amount ,newUserWallet,'Signup_Amount',existingInviteuser_id,'Completed' ];
        await con.query('INSERT INTO tbl_transactions(user_id, wallet_type, transaction_type, deposit_amount, current_wallet_amount, transaction_mode,reward_by_user,booking_id,status) VALUES (?,?,?,?,?,?,?,?,?)',[userID, type, 'Referral Amount', signup_amount ,newUserWallet,'Signup_Amount',existingInviteuser_id,booking_id,'Completed' ]);
        await con.query('INSERT INTO tbl_transactions(user_id, wallet_type, transaction_type, deposit_amount, current_wallet_amount, transaction_mode,reward_by_user,booking_id,status) VALUES (?,?,?,?,?,?,?,?,?)',[existingInviteuser_id, type, 'Referral Amount', signup_amount ,newInviterWallet,'Referral_Amount',userID,booking_id,'Completed' ]);
      }
    }

    if(used_affiliation_code != "")
    {
      const [[existingaffiliation]] = await con.query('SELECT * FROM tbl_user WHERE affiliation_code = ?',[used_affiliation_code]);
      const affiliationuser_wallet =parseFloat((type === "Owner") ? existingaffiliation.owner_wallet : existingaffiliation.user_wallet);
      const affiliationuser_id = existingaffiliation.user_id ? existingaffiliation.user_id : 0;

      const [existingaffi] = await con.query('SELECT * FROM tbl_transactions WHERE user_id = ? AND transaction_mode=? AND reward_by_user=?',[affiliationuser_id,'Affiliation_Amount',userID]);
      ////console.log("existingaffi.length----->",existingaffi.length);

      if(existingaffi.length <= reward_limit)
      {
          const affiamount = (booking_amount*reward_percentage)/100;
          ////console.log('affiamount--->',affiamount);
          const newReferallWallet = affiliationuser_wallet + affiamount;
          ////console.log('newReferallWallet--->',newReferallWallet);

          let updateSql2;
          if (type === 'User') {
            updateSql2 = await con.query('UPDATE tbl_user SET user_wallet=? WHERE user_id=?', [newReferallWallet,affiliationuser_id]);
          } else if (type === 'Owner') {
            updateSql2 = await con.query('UPDATE tbl_user SET owner_wallet=? WHERE user_id=?', [newReferallWallet,affiliationuser_id]);
          }
          await con.query('INSERT INTO tbl_transactions(user_id, wallet_type, transaction_type, deposit_amount, current_wallet_amount, transaction_mode,reward_by_user,booking_id,status) VALUES (?,?,?,?,?,?,?,?,?)',[affiliationuser_id, type, 'Affiliation Amount',affiliationuser_wallet,newReferallWallet,'Affiliation_Amount',userID,booking_id,'Completed' ]);
      }
    }

    await con.commit();
    res.json({ result: "success" });

  } catch (error) {
    await con.rollback();
    console.error('Error in Completed Reward API:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
}

const fetchPromotionalPlans = async(req,res,next) => {
  const con = await connection();
  const user = req.user;  // Extract user details
  ////console.log("user_details---", user);
  const userID = user.user_id;
  ////console.log("user_id---", userID);
  const type = req.user.user_type;
  try {
    const [results] = await con.query('SELECT * FROM `tbl_promotional_plans` WHERE status=? AND deleted=?', ['Active','No'] );
    
    const formattedplan = results.map(plan => ({
        plan_id : plan.plan_id ,
        plan_name: plan.plan_name,  // or masked if needed
        plan_days: plan.plan_days,
        plan_price: plan.plan_price
    }));
    res.status(200).json(formattedplan);
  } catch (error) {
   await con.rollback();
   console.error('Error:',error);
   res.status(500).json({result:"Internal Server Error"});
  } finally {
    con.release();
  }
}

const addPromotionalPlan = async (req, res, next) => {
  const con = await connection();
  const { vehicle_id, plan_id} = req.body;
  const userID = req.user.user_id;
  const type = req.user.user_type;

  const currentTime = moment().tz("Asia/Kolkata");
  const date = currentTime.format('YYYY-MM-DD');

  try {
      con.beginTransaction();
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
  
      if (!existingUser) {
        await con.rollback();
        return res.status(200).json({ result: "User not found" });
      }
  
      const bank_id = 0;
      const card_id = (req.body.card_id === "") ? 0 : req.body.card_id;
      const transaction_amount = parseFloat(req.body.transaction_amount);
    // Fetch the promotional plan details
    const [[plan]] = await con.query('SELECT * FROM tbl_promotional_plans WHERE status=? AND deleted=? AND plan_id=?', ['Active', 'No', plan_id]);
    if (!plan) {
      await con.rollback();
      return res.status(200).json({ result: "Plan not found or inactive" });
    }
    ////console.log(plan);
    const { plan_name, plan_days } = plan; // Extract the necessary fields

    // Calculate the expiry date
    // let plan_expiry_date = moment(date).add(plan_days, 'days').format('YYYY-MM-DD');

    let plan_expiry_date = moment(date).add(plan_days - 1, 'days').format('YYYY-MM-DD');

    // Check if there's an existing favorite vehicle with a plan
    const [existingData]= await con.query('SELECT * FROM tbl_vehicles WHERE owner_id = ? AND vehicle_id= ? AND plan_id != 0', [userID, vehicle_id]);
    ////console.log(existingData.length);
    if (existingData.length>0) {
      // If the user already has a plan, extend the expiry date
      plan_expiry_date = moment(existingData.plan_expiry_date).add(plan_days, 'days').format('YYYY-MM-DD');
    }
   ////console.log(plan_expiry_date);
    // Update the favorite vehicle with the new plan details
   const [results] =  await con.query('UPDATE tbl_vehicles SET plan_id=?, plan_name=?, plan_expiry_date=? WHERE vehicle_id=?',[plan_id, plan_name, plan_expiry_date, vehicle_id]);
    ////console.log(results);
    const sql = 'INSERT INTO `tbl_transactions`(`transaction_number`, `user_id`, `wallet_type`, `transaction_type`, `transaction_amount`, `deposit_amount`, `current_wallet_amount`, `transaction_mode`, `card_id`, `bank_id`,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
    const values = [
      req.body.transaction_number,
      userID,
      type,
      'Deposite',
      transaction_amount,
      '0',
      '0',
      req.body.transaction_mode,
      card_id,
      bank_id,
      'Completed'
    ];
    await con.commit();
    res.status(200).json({ result: "Success" });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchSlider = async (req, res, next) => {
  const con = await connection();
  const BASEURL = `http://${process.env.Host}/images/sliders/`;
  
  try {
    // Fetch data from the database
    const [results] = await con.query('SELECT slider_image FROM tbl_slider');
    
    if (results.length > 0) {
      // Function to format images into the required structure
      const formatImages = (images) => {
        return images ? images.split(',').map(image => ({ image: `${BASEURL}${image.trim()}` })) : [];
      };

      // Since we only need the images, map and format the slider_image field
      const sliderImages = results.flatMap(row => formatImages(row.slider_image));

      res.status(200).json(sliderImages);
    } else {
      // If no images are found
      res.status(200).json({ result: 'No images found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ result: 'Internal Server Error' });
  } finally {
    con.release();
  }
};

const userSupportRequest = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  const email =req.user.email;
   //for seprate date & time 
   const currentTime = moment().tz("Asia/Kolkata");
   const date = currentTime.format('YYYY-MM-DD');
   const time = currentTime.format('hh:mm A');

  try {
    const message =  req.body.message;
    let filenames = '';
    if (req.files && req.files.length > 0) {
      // If files are uploaded, join filenames with commas
      filenames = req.files.map(file => file.filename).join(',');
    }
    ////console.log("user_images---", filenames);

    const complain_number = Math.floor(1000 + Math.random() * 9000);
    con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    if (message == "") {
      await con.rollback();
      return res.status(200).json({ result: "Message cannot be empty!" });
    }

    const sql = 'INSERT INTO `tbl_user_support`(`user_type`, `user_id`, `owner_id`, `booking_id`, `subject`,`sub_issue_list`, `email`, `message`, `complain_number`, `images`, `driving_location`, `latitude`, `longitude`, `status`,`date`, `time`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    const values = [
      type,
      userID,
      req.body.owner_id,
      req.body.booking_id,
      req.body.issue,
      req.body.sub_issue_list,
      email,
      message,
      complain_number,
      filenames,
      req.body.driving_location,
      req.body.latitude,
      req.body.longitude,
      'opened',
      date,
      time,
    ];

    const [result] = await con.query(sql, values);

    if (result) {
      const updateSql = 'INSERT INTO `tbl_user_threads`(`complain_number`, `user_id`, `role`, `message`,`date`, `time`) VALUES (?,?,?,?,?,?)'
      const sqlvalues = [
        complain_number,
        userID,
        'customer',
        message,
        date,
        time,
      ];
  
      const [result] = await con.query(updateSql, sqlvalues);
    }

    await con.commit();
    res.status(200).json({ result: 'Success' });
    
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchUserComplainList = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  const BASEURL = `http://${process.env.Host}/images/complains/`;
  
  try {
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

    if (!existingUser) {
      return res.status(200).json({ result: "User not found" });
    }

    let fetchSupport;
    if (type === 'User') {
      [fetchSupport] = await con.query('SELECT * FROM tbl_user_support WHERE user_id = ?', [userID]);
    } else {
      [fetchSupport] = await con.query('SELECT * FROM tbl_user_support WHERE owner_id = ?', [userID]);
    }

    if (!fetchSupport || fetchSupport.length === 0) {
      return res.status(200).json({ result: "Data not found" });
    }

    // Format the result using map to return specific fields
    const formattedSupport = fetchSupport.map(support => {
      // Handle images (split and construct URLs)
      const subjectArray = (support.subject || '').split(',');
      const subject = subjectArray.length > 0 && subjectArray[0] !== '' ? subjectArray[0] : '';

      const issue_listArray = (support.sub_issue_list || '').split(',');
      const issue_list = issue_listArray.length > 0 && issue_listArray[0] !== '' ? issue_listArray[0] : '';

      // Handle vehicle images (split and map them into URLs)
      const formatImages = (images) => images ? images.split(',').map(image => ({ image: `${BASEURL}${image}` })) : [];
      const imagess = formatImages(support.images);
      return {
        issue: subject,
        sub_issue_list: issue_list,
        user_id: support.user_id,
        owner_id: support.owner_id,
        email: support.email, // or masked if needed
        message: support.message,
        driving_location: support.driving_location,
        latitude: support.latitude,
        longitude: support.longitude,
        complain_number: support.complain_number,
        status: support.status,
        date: support.date,
        time: support.time,
        timestamp: support.timestamp,
        images: imagess
      };
    });

    res.status(200).json(formattedSupport);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const fetchSingleUserComplain  = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;
  try {
      const complain_number = req.body.complain_number;
      ////console.log(complain_number)
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

      if (!existingUser) {
        await con.rollback();
        return res.status(200).json({ result: "User not found" });
      }
      
     const [fetchSupport] = await con.query('SELECT * FROM tbl_user_threads WHERE complain_number = ?',[complain_number]);

      if (!fetchSupport) {
        await con.rollback();
        res.status(200).json({ result: "Data not found" });
        return;
      }

      await con.commit();
          // Format the result using map to return specific fields
     const formattedSupport = fetchSupport.map(support => ({
      user_id: support.user_id,  // or masked if needed
      message: support.message,
      complain_number: support.complain_number,
      role: support.role,
      date: support.date,
      time: support.time,
      timestamp: support.timestamp
    }));
    
    res.status(200).json(formattedSupport);
    
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const replyUserComplainTicket = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;

   //for seprate date & time 
   const currentTime = moment().tz("Asia/Kolkata");
   const date = currentTime.format('YYYY-MM-DD');
   const time = currentTime.format('hh:mm A');

  try {
    const message =  req.body.message;
    const complain_number = req.body.complain_number;
    ////console.log(complain_number);
    con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);

    if (!existingUser) {
      await con.rollback();
      return res.status(200).json({ result: "User not found" });
    }

    if (message == "") {
      await con.rollback();
      return res.status(200).json({ result: "Message cannot be empty!" });
    }
      // Sanitize the input
    const [results] = await con.query('SELECT * FROM tbl_user_support WHERE complain_number=?',[complain_number]);

    if (results.length == 0){
      await con.rollback();
      return res.status(200).json({ result: "Invalid Compain Id" });
    }
    const role = (type === 'User')?'customer' : 'support_executive';

    const updateSql = 'INSERT INTO `tbl_user_threads`(`complain_number`, `user_id`, `role`, `message`,`date`, `time`) VALUES (?,?,?,?,?,?)'
    const sqlvalues = [
        complain_number,
        userID,
        role,
        message,
        date,
        time,
      ];
  
    await con.query(updateSql, sqlvalues);

    await con.commit();
    res.status(200).json({ result: 'Success' });
    
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const closeUserComplainTicket = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;

  try {
    const { complain_number } = req.body;
    ////console.log(userID);
    ////console.log(type);
    ////console.log(complain_number);

    // Validate if complain_number exists in the request body
    if (!complain_number) {
      return res.status(400).json({ result: "Complain number is required" });
    }

    // Start transaction
    await con.beginTransaction();

    // Check if the user exists
    const [[existingUser]] = await con.query(
      'SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?',
      [userID, type]
    );
    if (!existingUser) {
      return res.status(404).json({ result: "User not found" });
    }

    // Check if the complain ticket exists
    const [result] = await con.query(
      'SELECT * FROM tbl_user_support WHERE complain_number = ?',
      [complain_number]
    );
    if (result.length === 0) {
      return res.status(404).json({ result: "Invalid Complain ID" });
    }

    // Update the complain status based on the user type
    if (type === 'User') {
      await con.query(
        'UPDATE `tbl_user_support` SET `status` = ?, `closed_by` = ? WHERE user_id = ? AND complain_number = ?',
        ['closed', 'User', userID, complain_number]
      );
    } else {
      await con.query(
        'UPDATE `tbl_user_support` SET `status` = ?, `closed_by` = ? WHERE owner_id = ? AND complain_number = ?',
        ['closed', 'Owner', userID, complain_number]
      );
    }

    // Commit the transaction
    await con.commit();

    res.status(200).json({ result: "Success" });

  } catch (error) {
    // Rollback in case of error
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    // Release the connection
    con.release();
  }
};

const dateChangeStatus = async(req,res,next) => {
    const con = await connection();
    const owner_id = req.user.user_id;
    const type = req.user.user_type;
    const {booking_id , status} = req.body;
    const booking_dates1 = req.body.booking_dates;
    const booking_dates = req.body.booking_dates ? req.body.booking_dates.replace(/[\[\]"]/g,'').split(',') : [];
    ////console.log(booking_dates1);
    try {
      await con.beginTransaction();
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id =?',[owner_id])
      if (!existingUser) {
        await con.rollback();
        res.status(200).json({ result: "User not found" });
        return;
      }

      // Fetch user details
      const [[existingbooking]] = await con.query(
        'SELECT * FROM tbl_bookings WHERE booking_id = ? AND owner_id = ?', 
        [booking_id, owner_id]
      );
      const userID = existingbooking.user_id;


      let firstDate, lastDate, totalDays;
      
      if (booking_dates.length > 0) {
        booking_dates.sort((a, b) => new Date(a) - new Date(b)); 
        firstDate = booking_dates[0];
        lastDate = booking_dates[booking_dates.length - 1];
        const start = new Date(firstDate);
        const end = new Date(lastDate);
        totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // Adding 1 to include both start and end dates
      } else {
        firstDate = '';
        lastDate = '';
        totalDays = '0';
      }
      const start_date =req.body.start_date?? firstDate;
      const end_date = req.body.end_date??lastDate;
      const total_days = totalDays?? '0';

      await con.query('UPDATE tbl_change_booking_date SET status=? WHERE booking_id =?', [status, booking_id]);
     // const [result] = await con.query('UPDATE tbl_bookings SET booking_dates=? WHERE booking_id =?', [booking_dates, booking_id]);
      if(status === 'Accepted')
      {
        await con.query('UPDATE tbl_bookings SET `booking_dates`=?,`start_date`=?,`end_date`=?,`total_days`=? WHERE booking_id =?', [booking_dates1,start_date,end_date,total_days, booking_id]);
      }
      await con.commit();  
      
      const title1 = "Booking Date Changed!"
      const body1 = "The car owner has accepted your requested booking date change. Check the updated details."

      const title2 = "Booking Date Change Confirmed!"
      const body2 = "You’ve successfully updated the user's booking date. Details are updated in the app."
    
      await sendPushNotifications([
        { user_id: userID, title: title1, body: body1 },
        { user_id: owner_id, title: title2, body: body2 },
      ]);

      res.json({ result: "success" });
    } catch (error) {
      await con.rollback();
      console.error('Error in update API :', error);
      res.status(500).json({result: 'Internal Server Error'});
  
    } finally {
      con.release();
    }
}

const dateChangeRequest = async(req,res,next) => {
    const con = await connection();
    const userID = req.user.user_id;
    const type = req.user.user_type;
    const {booking_id , booking_dates} = req.body;
    //console.log("req.body--->",req.body)
    try {
      await con.beginTransaction();
       // Parse booking_dates if it is a JSON string
      const parsedBookingDates = typeof booking_dates === 'string' ? JSON.parse(booking_dates) : booking_dates;

      // Ensure parsedBookingDates is an array
      if (!Array.isArray(parsedBookingDates) || parsedBookingDates.length === 0) {
        throw new Error('Invalid booking_dates format');
      }
       // Convert the first and last booking dates to Date objects with time
       const firstDate1 = new Date(parsedBookingDates[0]);
       const lastDate1 = new Date(parsedBookingDates[parsedBookingDates.length - 1]);
       const timeDifference = lastDate1 - firstDate1;
       const totalDays = Math.ceil((timeDifference / (1000 * 60 * 60 * 24))+1); // Convert ms to days
       //console.log("firstDate1--->",firstDate1)
       //console.log("lastDate1--->",lastDate1)
       //console.log("totalDays--->",totalDays)
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id =?',[userID])
      if (!existingUser) {
        await con.rollback();
        return res.status(200).json({ result: "User not found" });
      }

      const userName = existingUser.first_name + ' ' + existingUser.last_name;
      // Fetch user details
      const [[existingbooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ? AND user_id = ?', [booking_id, userID] );
      const owner_id = existingbooking.owner_id;
      const day_count = existingbooking.total_days;
      //console.log("day_count--->",day_count)
      if(totalDays != day_count)
      {
        await con.rollback();
        return res.status(200).json({ result: "New bokking date range is not equal to existing booking date range" });
      }

      await con.query('INSERT INTO `tbl_change_booking_date`(`booking_id`, `requested_dates`) VALUES (?,?)', [booking_id,booking_dates]);
      await con.commit();  

      const title1 = "Change Booking Date Requested!"
      const body1 = "You’ve requested a new booking date. Await confirmation from the car owner."

      const title2 = "Booking Date Change Request!"
      const body2 = `The user ${userName} has requested to change the booking date. Review the request in the app.`
    
      await sendPushNotifications([
        { user_id: userID, title: title1, body: body1 },
        { user_id: owner_id, title: title2, body: body2 },
      ]);

      res.json({result: "success" });
    } catch (error) {
      await con.rollback();
      console.error('Error in update API :', error);
      res.status(500).json({result: 'Internal Server Error'});
  
    } finally {
      con.release();
    }
}

const updateVehicle = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  console.log("req.body",req.body);
  const type = req.user.user_type;
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  try {

    ////console.log(req.body);
    const country_name =  req.body.country_name;
    const extras = req.body.extras;
    const features = req.body.features;
    const vehicle_id = req.body.vehicle_id;
    const vehicle_make = req.body.vehicle_make;
    const vehicle_model = req.body.vehicle_model;
    const make_image = "make.png"
    const vehicle_status = req.body.vehicle_status;


    con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ? AND user_type= ?', [userID, type]);
    if (!existingUser) {
      await con.rollback();
      return  res.status(200).json({ result: "User not found" });
    }
    
    const [result_make] = await con.query('SELECT COUNT(*) AS count FROM tbl_make_models WHERE make_name = ?', [vehicle_make]);

    // If the make doesn't exist in the database, insert a new entry
    if (result_make[0].count === 0) {
      await con.query(
        "INSERT INTO tbl_make_models (make_name, make_image, models_name) VALUES (?, ?, ?)",
        [vehicle_make, make_image, JSON.stringify([vehicle_model])] // Ensure the model is stored as an array
      );
    } else {
      // Check if the model already exists for the make
      const [[make]] = await con.query('SELECT models_name FROM tbl_make_models WHERE make_name = ?', [vehicle_make]);

      // Parse the existing models JSON, or start with an empty array
      let existingModels = make.models_name ? JSON.parse(make.models_name) : [];
   //   ////console.log('Existing models:', existingModels);

      // Clean and prepare the new model
      const cleanedModel = vehicle_model.trim();

      // Check if the new model already exists
      if (!existingModels.includes(cleanedModel)) {
        // Add the new model to the array
        existingModels.push(cleanedModel);

        // Update the database with the updated models array
        await con.query(
          "UPDATE tbl_make_models SET models_name = ? WHERE make_name = ?",
          [JSON.stringify(existingModels), vehicle_make]
        );

        ////console.log(`Updated make: ${vehicle_make} with new model: ${cleanedModel}`);
       // await con.commit();
      //  return res.status(200).json({ result: "Model added to the existing make" });
      }
    }

    const [[existingData]] = await con.query('SELECT * FROM tbl_vehicles WHERE vehicle_id = ?' , [vehicle_id]);
    if (!existingData) {
      await con.rollback();
      return  res.status(200).json({ result: "vehicle not found" });
    }
    
    const [result] = await con.query('SELECT * FROM tbl_locations WHERE currency_country=?',[country_name]);
    const currency = 'USD';

    // Process existing vehicle images
    const filedata = req.body.existingFiles || '';
    const fileNamesFromData = filedata.split(',').map(url => url.replace(BASEURL, '')).filter(Boolean);
    let vehicle_imagess = fileNamesFromData.join(',');
    // Append newly uploaded vehicle images
    if (req.files && req.files.vehicle_images) {
        const vehicle_images = req.files.vehicle_images.map(file => file.filename);
        vehicle_imagess = [...fileNamesFromData, ...vehicle_images].join(',');
    }
    // Remove leading or trailing commas
    vehicle_imagess = vehicle_imagess.replace(/^,|,$/g, '');


    // Process existing insurance images
    const insurancedata = req.body.existingInsuranceImages || '';
    const insuranceNamesFromData = insurancedata.split(',').map(url => url.replace(BASEURL, '')).filter(Boolean);
    let vehicle_insurance_imagess = insuranceNamesFromData.join(',');
    // Append newly uploaded insurance images
    if (req.files && req.files.vehicle_insurance_images) {
        const vehicle_insurance_images = req.files.vehicle_insurance_images.map(file => file.filename);
        vehicle_insurance_imagess = [...insuranceNamesFromData, ...vehicle_insurance_images].join(',');
    }
    // Remove leading or trailing commas
    vehicle_insurance_imagess = vehicle_insurance_imagess.replace(/^,|,$/g, '');


    // Process existing MOT certificate images
    const motdata = req.body.existingMotImages || '';
    const motNamesFromData = motdata.split(',').map(url => url.replace(BASEURL, '')).filter(Boolean);
    let mot_certificate_imagess = motNamesFromData.join(',');
    // Append newly uploaded MOT certificate images
    if (req.files && req.files.mot_certificate_images) {
        const mot_certificate_images = req.files.mot_certificate_images.map(file => file.filename);
        mot_certificate_imagess = [...motNamesFromData, ...mot_certificate_images].join(',');
    }
    // Remove leading or trailing commas
    mot_certificate_imagess = mot_certificate_imagess.replace(/^,|,$/g, '');

    // Update user details
    const updatedVehicle = {
      vehicle_name:req.body.vehicle_name|| existingData.vehicle_name,         
      vehicle_make:vehicle_make|| existingData.vehicle_make,
      vehicle_model:vehicle_model|| existingData.vehicle_model,
      speed: req.body.speed || existingData.speed,
      fuel_type: req.body.fuel_type || existingData.fuel_type,
      currency: currency || existingData.currency,
      
      start_time: req.body.start_time || existingData.start_time,
      end_time: req.body.end_time || existingData.end_time,

      price_per_day: req.body.price_per_day || existingData.price_per_day,
      perday_price_array: req.body.perday_price_array || existingData.perday_price_array,
      price_per_week: req.body.price_per_week || existingData.price_per_week,
      price_per_month: req.body.price_per_month || existingData.price_per_month,
      location_price: req.body.location_price || existingData.location_price,
      daily_distance: req.body.daily_distance || existingData.daily_distance,
      distance_price: req.body.distance_price || existingData.distance_price,
      pickup_location: req.body.pickup_location || existingData.pickup_location,
      dropoff_location: req.body.dropoff_location || existingData.dropoff_location,
      current_location: req.body.current_location || existingData.current_location,
      location_lat: req.body.location_lat || existingData.location_lat,
      location_lng: req.body.location_lng || existingData.location_lng,
      country_name: country_name || existingData.country_name,
      vehicle_type: req.body.vehicle_type || existingData.vehicle_type,
      features: features || existingData.features,
      no_of_seats: req.body.no_of_seats || existingData.no_of_seats,
      description: req.body.description || existingData.description,
      transmission: req.body.transmission || existingData.transmission,
      pets: req.body.pets || existingData.pets,
      smoking: req.body.smoking || existingData.smoking,
      extras: extras || existingData.extras,
      vehicle_insurance_imagess: vehicle_insurance_imagess || existingData.vehicle_insurance_images,
      vehicle_imagess: vehicle_imagess || existingData.vehicle_images,
      mot_certificate_imagess: mot_certificate_imagess || existingData.mot_certificate_images,
      vehicle_status : vehicle_status || existingData.status,
    };

    console.log(updatedVehicle)

    const updateSql = 'UPDATE `tbl_vehicles` SET  `vehicle_name`=?, `vehicle_make`=?, `vehicle_model`=?,`speed`=?,`fuel_type`=?,`start_time`=?,`end_time`=?,`currency`=?,`price_per_day`=?,`perday_price_array`=?,`price_per_week`=?,`price_per_month`=?,`location_price`=?,`daily_distance`=?,`distance_price`=?,`pickup_location`=?,`dropoff_location`=?,`current_location`=?,`location_lat`=?,`location_lng`=?,`country_name`=?,`vehicle_type`=?,`features`=?,`no_of_seats`=?,`description`=?,`transmission`=?,`pets`=?,`smoking`=?,`extras`=?,`vehicle_insurance_images`=?,`vehicle_images`=?,`mot_certificate_images`=?,status=? WHERE vehicle_id=?';
    const updateValues = [   
        updatedVehicle.vehicle_name, 
        updatedVehicle.vehicle_make, 
        updatedVehicle.vehicle_model,   
        updatedVehicle.speed,           
        updatedVehicle.fuel_type, 
        updatedVehicle.start_time,
        updatedVehicle.end_time,
        updatedVehicle.currency,         
        updatedVehicle.price_per_day,
        updatedVehicle.perday_price_array,
        updatedVehicle.price_per_week,          
        updatedVehicle.price_per_month,  
        updatedVehicle.location_price,
        updatedVehicle.daily_distance, 
        updatedVehicle.distance_price,
        updatedVehicle.pickup_location,
        updatedVehicle.dropoff_location,               
        updatedVehicle.current_location,                   
        updatedVehicle.location_lat,            
        updatedVehicle.location_lng,  
        updatedVehicle.country_name,
        updatedVehicle.vehicle_type,          
        updatedVehicle.features,  
        updatedVehicle.no_of_seats,
        updatedVehicle.description, 
        updatedVehicle.transmission,
        updatedVehicle.pets,
        updatedVehicle.smoking,               
        updatedVehicle.extras,
        updatedVehicle.vehicle_insurance_imagess, 
        updatedVehicle.vehicle_imagess,
        updatedVehicle.mot_certificate_imagess,  
        updatedVehicle.vehicle_status,
        vehicle_id         
    ];
    console.log("updateSql==",updateSql)
    console.log("updateValues==",updateValues)
    const [results] = await con.query(updateSql, updateValues);

    await con.commit();

    res.status(200).json({result : "Success"})
  } catch (error) {
    await con.rollback();
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const vehicleSerchFilter1 = async(req,res,next) => {
  const con = await connection();
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD hh:mm A');
  const user_type = req.body.user_type;
  // Get page and limit from request (default values: page = 1, limit = 10)
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;
  const lat = req.body.lat;  // Requested latitude
  const lng = req.body.lng;  // Requested longitude
  let datedataa = req.body.datedataa; // Requested start time
  const start_time = req.body.start_time; // Requested start time
  const end_time = req.body.end_time; 
  const radiusKm ='200';
  //====================== 

  ////console.log('Request Body:', req.body);

  if (typeof datedataa === 'string') {
    try {
      datedataa = JSON.parse(datedataa);
    } catch (err) {
      return res.status(400).send({ error: 'Invalid datedataa format. Should be a JSON array.' });
    }
  }

  if (!datedataa || !Array.isArray(datedataa)) {
    return res.status(400).send({ error: 'Invalid datedataa input' });
  }

  try {
      // Generate the date conditions for JSON_CONTAINS
      const dateConditions = datedataa.map(date => `JSON_CONTAINS(availability, '"${date}"')`).join(' AND ');
      ////console.log(dateConditions);

      // Generate the time conditions
      const timeCondition = `
        TIME(STR_TO_DATE('${start_time}', '%h:%i %p')) <= TIME(STR_TO_DATE(end_time, '%h:%i %p'))
        AND TIME(STR_TO_DATE('${end_time}', '%h:%i %p')) >= TIME(STR_TO_DATE(start_time, '%h:%i %p'))
      `;
      ////console.log(timeCondition);

      // Generate the distance condition
      const distanceCondition = `
        (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}'))
        + sin(radians('${lat}')) * sin(radians(location_lat)))) < '${radiusKm}'
      `;
      ////console.log(distanceCondition);

      // Other conditions
      const otherCondition = `status = 'Active' AND deleted = 'NO'`;
      ////console.log(otherCondition);

      const query = `SELECT * FROM tbl_vehicles
      WHERE (${distanceCondition})  AND (${timeCondition}) AND ${dateConditions}  AND (${otherCondition}) 
      ORDER BY vehicle_id DESC LIMIT ${limit} OFFSET ${offset} ;`;
      ////console.log(query);

      const [fetchData] = await con.query(query);
      ////console.log("Number of results: ", fetchData.length);  // Debug to check number of rows
      //res.json(fetchData);
    
      const formattedData = await Promise.all(fetchData.map(async (vehicleData) => {
      const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`.trim();
      const pricePerDay =vehicleData.price_per_day !='0.00'  ? `${vehicleData.price_per_day} / day` : vehicleData.price_per_week != '0.00'? `${vehicleData.price_per_week} / week` : `${vehicleData.price_per_month} / month`;
      const plan_id = vehicleData.plan_id;

      // Handle vehicle images (split and select first one)
      const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
      const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

      // Determine sponsorship status
      const sponsored = (plan_id !='0' && currentDateTime <= vehicleData.plan_expiry_date) ? 'Yes' : 'No';

      // Fetch favorite status for the current vehicle (if user is logged in)
      let favoriteStatus = 'Dislike'; // Default if not a favorite
      if (user_type === 'User') {
        const userID = req.user.user_id;
        const [favoriteData] = await con.query(`
          SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?
        `, [vehicleData.vehicle_id, userID]);

        if (favoriteData.length > 0) {
          favoriteStatus = favoriteData[0].status || 'Dislike';
        }
      }
      ////console.log(favoriteStatus)

      return {
        rating: vehicleData.rating || 0,  // Default rating to 0 if null
        vehicle_id: vehicleData.vehicle_id,
        favorite_status: favoriteStatus,
        speed: vehicleData.speed,
        transmission: vehicleData.transmission,
        no_of_seats: vehicleData.no_of_seats,
        pricePerDay: pricePerDay,
        vehicleName: vehicleName,
        sponsored: sponsored,
        vehicleImage: vehicleImage,
      };
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const vehicleSerchFilter = async(req,res,next) => {
  const con = await connection();
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD');
  const user_type = req.body.user_type;
  //console.log(" req.body-->", req.body)
  const [[existingData] = [{}]] = await con.query('SELECT radius FROM tbl_important_credentials');
  const radius_data = existingData?.radius ?? '200';
  //console.log("radius_data-->",radius_data)
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;
  const lat = req.body.lat;  // Requested latitude
  const lng = req.body.lng;  // Requested longitude
  let datedataa = req.body.datedataa; // Requested start time
  const start_time = req.body.start_time; // Requested start time
  const end_time = req.body.end_time; 
  const distance = req.body.distance || radius_data;
  //console.log("distance-->",distance)
  const filter_type = req.body.filter_type;  // WithFilter WithoutFilter
  const make = req.body.make || ''; // Initialize as empty string if not provided
  const model = req.body.model || ''; 
  const features = req.body.features || ''; // Initialize as empty string if not provided
  const car_type = req.body.car_type || ''; 
  const transmission = req.body.transmission || ''; // Initialize as empty string if not provided
  const seat_no = req.body.seat_no || ''; 
  const pets = req.body.pets || ''; // Initialize as empty string if not provided
  const smocking = req.body.smocking || ''; 
  const startPrice = req.body.start_price;
  const endPrice = req.body.end_price;
  const distance_type = req.body.distance_type;  // high_to_low   low_to_high
  const rating = req.body.rating;
  // Add distance calculation to the SELECT clause
  let distanceOrder = 'ASC'; // Default order can be set to ASC or DESC based on your requirement
  if (distance_type) {
      distanceOrder = distance_type === 'high_to_low' ? 'DESC' : 'ASC'; // Change order based on request
  }  

  //====================== 
  ////console.log('distanceOrder:', distanceOrder);
  ////console.log('Request Body:', req.body);

  if (typeof datedataa === 'string') {
    try {
      datedataa = JSON.parse(datedataa);
    } catch (err) {
      return res.status(400).send({ error: 'Invalid datedataa format. Should be a JSON array.' });
    }
  }

  if (!datedataa || !Array.isArray(datedataa)) {
    return res.status(400).send({ error: 'Invalid datedataa input' });
  }

  try {
      // Generate the date conditions for JSON_CONTAINS
      const dateConditions = datedataa.map(date => `JSON_CONTAINS(availability, '"${date}"')`).join(' AND ');
      //console.log(dateConditions);

      // Generate the time conditions
      const timeCondition = `
        TIME(STR_TO_DATE('${start_time}', '%h:%i %p')) <= TIME(STR_TO_DATE(end_time, '%h:%i %p'))
        AND TIME(STR_TO_DATE('${end_time}', '%h:%i %p')) >= TIME(STR_TO_DATE(start_time, '%h:%i %p'))
      `;
      //console.log(timeCondition);

      const distanceCondition = `
        (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}'))
        + sin(radians('${lat}')) * sin(radians(location_lat)))) < '${distance}'`;
        //console.log(distanceCondition);

       // Initialize conditions array
       const conditions = [];

        // Make conditions
        if (make && make.trim()!== '') {
          conditions.push(`vehicle_make LIKE '${make}'`);
          //console.log(`Make condition: vehicle_make LIKE '${make}'`);
        }

        
        // Car Type conditions
        if (car_type && car_type.trim() !== '')  {
            conditions.push(`vehicle_type LIKE '${car_type}'`);
            //console.log(`Car type condition: vehicle_type LIKE '${car_type}'`);
        }

        // Transmission conditions
        if (transmission && transmission.trim() !== '') {
            conditions.push(`transmission LIKE '${transmission}'`);
            //console.log(`Transmission condition: transmission LIKE '${transmission}'`);
        }

        // Seat No conditions
        if (seat_no && seat_no.trim() !== '') {
            conditions.push(`no_of_seats LIKE '${seat_no}'`);
            //console.log(`Seat number condition: no_of_seats LIKE '${seat_no}'`);
        }

        if (pets && pets.trim() !== '') {
        conditions.push(`pets LIKE '${pets}'`);
      } 
      
      if (smocking && smocking.trim() !== '') {
          conditions.push(`smoking LIKE '${smocking}'`);
      } 

        // Model conditions
        if (model && model.trim() !== '') {
            conditions.push(`vehicle_model LIKE '${model}'`);
            //console.log(`Model condition: vehicle_model LIKE '${model}'`);
        }

       // Features conditions
       if (features) {
           const requestedFeatures = features.split(',').map(feature => feature.trim()); // Split and trim
           if (requestedFeatures.length === 1) {
               conditions.push(`features LIKE '%${requestedFeatures[0]}%'`);
           } else if (requestedFeatures.length > 1) {
               const featureConditions = requestedFeatures.map(feature => `features LIKE '%${feature}%'`);
               conditions.push(featureConditions.join(' AND ')); // Use AND to ensure all features are matched
           }
           //console.log(`Features condition: ${conditions[conditions.length - 1]}`);
       }

       // Price conditions
       if (startPrice && endPrice) {
           const priceCondition = `
           CASE 
               WHEN price_per_day != '0.00' THEN price_per_day 
               WHEN price_per_week != '0.00' THEN price_per_week 
               ELSE price_per_month 
           END BETWEEN CAST(${startPrice} AS DECIMAL(10,2)) AND CAST(${endPrice} AS DECIMAL(10,2))`;
           conditions.push(priceCondition);
           //console.log(priceCondition);
       }

      // This avoids issues when no conditions are passed.
      const whereClause = `(${distanceCondition}) AND (${timeCondition}) AND ${dateConditions}`;

      let query
      if (filter_type == 'WithoutFilter') {
        if (user_type === 'User') {
            ////console.log('User');
            const user = req.user;
            const user_id = user.user_id;
            query = `
            SELECT v.*, 
                (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}')) 
                + sin(radians('${lat}')) * sin(radians(location_lat)))) AS calculated_distance,
                AVG(r.overall_rating) AS rating,
                CASE WHEN v.plan_id != '0' AND '${currentDateTime}' <= v.plan_expiry_date THEN 1 ELSE 0 END AS is_sponsored
            FROM tbl_vehicles v
            LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id
            WHERE ${whereClause} AND v.status = 'Active' AND v.deleted = 'NO' AND v.owner_id != ${user_id}
            GROUP BY v.vehicle_id
            ORDER BY is_sponsored DESC, rating DESC,calculated_distance ASC
            LIMIT ${limit} OFFSET ${offset};
            `;
        } else if (user_type === 'Guest') {
            ////console.log('Guest');
            query = `
            SELECT v.*, 
                (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}')) 
                + sin(radians('${lat}')) * sin(radians(location_lat)))) AS calculated_distance,
                AVG(r.overall_rating) AS rating,
                CASE WHEN v.plan_id != '0' AND '${currentDateTime}' <= v.plan_expiry_date THEN 1 ELSE 0 END AS is_sponsored
            FROM tbl_vehicles v
            LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id
            WHERE ${whereClause}  AND v.status = 'Active' AND v.deleted = 'NO'
            GROUP BY v.vehicle_id
            ORDER BY is_sponsored DESC, rating DESC,calculated_distance ASC
            LIMIT ${limit} OFFSET ${offset};
            `;
        }
        ////console.log(query);
      } else if (filter_type == 'WithFilter') {
          const conditionsString = conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';
         // //console.log("conditionsString-->",conditionsString)
          if (user_type === 'User') {
            ////console.log('User');
            const user = req.user;
            const user_id = user.user_id;
            query = `
            SELECT v.*, 
                (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}')) 
                + sin(radians('${lat}')) * sin(radians(location_lat)))) AS calculated_distance,
                AVG(r.overall_rating) AS rating,
                CASE WHEN v.plan_id != '0' AND '${currentDateTime}' <= v.plan_expiry_date THEN 1 ELSE 0 END AS is_sponsored
            FROM tbl_vehicles v
            LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id
            WHERE ${whereClause} AND v.status = 'Active' AND v.deleted = 'NO' AND v.owner_id != ${user_id} AND ${conditionsString}
            GROUP BY v.vehicle_id
            ORDER BY is_sponsored DESC, rating DESC,calculated_distance ASC
            LIMIT ${limit} OFFSET ${offset};
            `;
        } else if (user_type === 'Guest') {
            ////console.log('Guest');
            query = `
            SELECT v.*, 
                (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}')) 
                + sin(radians('${lat}')) * sin(radians(location_lat)))) AS calculated_distance,
                AVG(r.overall_rating) AS rating,
                CASE WHEN v.plan_id != '0' AND '${currentDateTime}' <= v.plan_expiry_date THEN 1 ELSE 0 END AS is_sponsored
            FROM tbl_vehicles v
            LEFT JOIN tbl_rating r ON r.vehicle_id = v.vehicle_id
            WHERE ${whereClause} AND v.status = 'Active' AND v.deleted = 'NO' AND ${conditionsString}
            GROUP BY v.vehicle_id
            ORDER BY is_sponsored DESC, rating DESC,calculated_distance ASC
            LIMIT ${limit} OFFSET ${offset};
            `;
        }
       // //console.log(query);
      }
      // Execute the query
      const [fetchData] = await con.query(query);
      ////console.log("Number of results: ", fetchData.length);  // Debug to check number of rows
      //res.json(fetchData);
    
      const formattedData = await Promise.all(
        fetchData.map(async (vehicleData) => {
          const ownerID = vehicleData.owner_id;
      
          // Check if the owner exists and meets conditions
          const [[existingOwner]] = await con.query(
            'SELECT * FROM tbl_user WHERE user_id = ? AND deleted = "No" AND status = "Approve"',
            [ownerID]
          );
      
          if (!existingOwner) {
            // Skip this vehicle if the owner is not valid
            return null;
          }
      
          // Construct vehicle name
          const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`.trim();
      
          // Determine price details
          const pricePerDay = vehicleData.price_per_day != '0.00'
            ? `${vehicleData.price_per_day} / day`
            : vehicleData.price_per_week != '0.00'
            ? `${vehicleData.price_per_week} / week`
            : `${vehicleData.price_per_month} / month`;
      
          const plan_id = vehicleData.plan_id;
      
          // Handle vehicle images (split and select first one)
          const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
          const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';
      
          // Determine sponsorship status
          const sponsored = plan_id != '0' && currentDateTime <= vehicleData.plan_expiry_date ? 'Yes' : 'No';
      
          // Fetch favorite status for the current vehicle (if user is logged in)
          let favoriteStatus = 'Dislike'; // Default if not a favorite
          if (user_type === 'User') {
            const userID = req.user.user_id;
            const [favoriteData] = await con.query(
              `SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ?`,
              [vehicleData.vehicle_id, userID]
            );
            if (favoriteData.length > 0) {
              favoriteStatus = favoriteData[0].status || 'Dislike';
            }
          }
      
          // Fetch vehicle details along with average rating
          const [ratingData] = await con.query(
            `SELECT AVG(overall_rating) AS rating FROM tbl_rating WHERE vehicle_id = ?`,
            [vehicleData.vehicle_id]
          );
          const averageRating = ratingData[0].rating || 0.0;
      
          // Check rating if filter is applied
          if (filter_type === 'WithFilter') {
            if (rating != "0.0" && averageRating < rating) {
              return null; // Skip vehicles that don't meet the rating condition
            }
          }
      
          const [bookingData] = await con.query(
            `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
            [vehicleData.vehicle_id] );

          // Return formatted vehicle data
          return {
            rating: averageRating,
            vehicle_id: vehicleData.vehicle_id,
            favorite_status: favoriteStatus,
            speed: vehicleData.speed,
            transmission: vehicleData.transmission,
            no_of_seats: vehicleData.no_of_seats,
            pricePerDay: pricePerDay,
            vehicleName: vehicleName,
            sponsored: sponsored,
            vehicleImage: vehicleImage,
            current_location: vehicleData.current_location,
            location_lat: vehicleData.location_lat,
            location_lng: vehicleData.location_lng,
            bookingCount : bookingData[0].booking_count,
          };
        })
      );
      
      // Filter out null results
      const filteredData = formattedData.filter(data => data !== null);
      
      // Send response based on filter type
      if (filter_type === 'WithoutFilter' || (filter_type === 'WithFilter' && rating == "0.0")) {
        res.status(200).json(filteredData);
      } else if (filter_type === 'WithFilter' && rating != "0.0") {
        res.status(200).json(filteredData.filter(data => data !== null));
      }
      
  } catch (error) {
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const countrySerchFilter = async(req,res,next) => {
  const con = await connection();
  const BASEURL = `http://${process.env.Host}/images/vehicleUploads/`;
  const currentDateTime = moment().tz("Asia/Kolkata").format('YYYY-MM-DD');
  const user_type = req.body.user_type;

  
  const [[existingData] = [{}]] = await con.query('SELECT radius FROM tbl_important_credentials');
  const radius_data = existingData?.radius ?? '200';

  // Get page and limit from request (default values: page = 1, limit = 10)
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;
  const country_name = req.body.country_name; // Initialize as empty string if not provided
  const filter_type = req.body.filter_type;  // WithFilter WithoutFilter
  const lat = req.body.lat;  // Requested latitude
  const lng = req.body.lng;  // Requested longitude
  const startPrice = req.body.start_price;
  const endPrice = req.body.end_price;
  const distance_type = req.body.distance_type;  // high_to_low   low_to_high
  const distance = req.body.distance|| radius_data; // Requested distance
  const rating = req.body.rating;
  const make = req.body.make || ''; // Initialize as empty string if not provided
  const model = req.body.model || ''; 
  const features = req.body.features || ''; // Initialize as empty string if not provided
  const car_type = req.body.car_type || ''; 
  const transmission = req.body.transmission || ''; // Initialize as empty string if not provided
  const seat_no = req.body.seat_no || ''; 
  const pets = req.body.pets || ''; // Initialize as empty string if not provided
  const smocking = req.body.smocking || ''; 
  // Add distance calculation to the SELECT clause
  let distanceOrder = 'ASC'; // Default order can be set to ASC or DESC based on your requirement
  if (distance_type) {
      distanceOrder = distance_type === 'high_to_low' ? 'DESC' : 'ASC'; // Change order based on request
  }  
  //====================== 
  //console.log('Request Body:', req.body);

  try {
        // Initialize conditions array
        const conditions = [];

        // Country conditions
        if (country_name) {
            conditions.push(`country_name LIKE '${country_name}'`);
            ////console.log(`Country condition: country_name LIKE '${country_name}'`);
        }

        // Distance condition
        if (lat && lng && distance) {
            const distanceCondition = `
            (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}'))
            + sin(radians('${lat}')) * sin(radians(location_lat)))) < '${distance}'`;
            conditions.push(distanceCondition);
            ////console.log(distanceCondition);
        }

       // Make conditions
       if (make && make.trim()!== '') {
           conditions.push(`vehicle_make LIKE '${make}'`);
           //console.log(`Make condition: vehicle_make LIKE '${make}'`);
       }

       // Car Type conditions
       if (car_type && car_type.trim() !== '')  {
           conditions.push(`vehicle_type LIKE '${car_type}'`);
           //console.log(`Car type condition: vehicle_type LIKE '${car_type}'`);
       }

       // Transmission conditions
       if (transmission && transmission.trim() !== '') {
           conditions.push(`transmission LIKE '${transmission}'`);
           //console.log(`Transmission condition: transmission LIKE '${transmission}'`);
       }

       // Seat No conditions
       if (seat_no && seat_no.trim() !== '') {
           conditions.push(`no_of_seats LIKE '${seat_no}'`);
           //console.log(`Seat number condition: no_of_seats LIKE '${seat_no}'`);
       }

       if (pets && pets.trim() !== '') {
        conditions.push(`pets LIKE '${pets}'`);
      } 
      
      if (smocking && smocking.trim() !== '') {
          conditions.push(`smoking LIKE '${smocking}'`);
      } 

       // Model conditions
       if (model && model.trim() !== '') {
           conditions.push(`vehicle_model LIKE '${model}'`);
           //console.log(`Model condition: vehicle_model LIKE '${model}'`);
       }

       // Features conditions
       if (features !== '') {
           const requestedFeatures = features.split(',').map(feature => feature.trim()); // Split and trim
           if (requestedFeatures.length === 1) {
               conditions.push(`features LIKE '%${requestedFeatures[0]}%'`);
           } else if (requestedFeatures.length > 1) {
               const featureConditions = requestedFeatures.map(feature => `features LIKE '%${feature}%'`);
               conditions.push(featureConditions.join(' AND ')); // Use AND to ensure all features are matched
           }
           //console.log(`Features condition: ${conditions[conditions.length - 1]}`);
       }

       // Price conditions
       if (startPrice && endPrice) {
           const priceCondition = `
           CASE 
               WHEN price_per_day != '0.00' THEN price_per_day 
               WHEN price_per_week != '0.00' THEN price_per_week 
               ELSE price_per_month 
           END BETWEEN CAST(${startPrice} AS DECIMAL(10,2)) AND CAST(${endPrice} AS DECIMAL(10,2))`;
           conditions.push(priceCondition);
           //console.log(priceCondition);
       }
         // Other conditions
        let otherCondition ; 

        if (user_type === 'User') 
        {
          ////console.log('User');
          const user = req.user;
          const user_id = user.user_id;
          otherCondition = `status = 'Active' AND deleted = 'NO' AND owner_id != ${user_id}`; 
        }
        else if(user_type === 'Guest' ) 
        {
          ////console.log('Guest');
          otherCondition = `status = 'Active' AND deleted = 'NO'`;
        }
        conditions.push(otherCondition);
        ////console.log(otherCondition);

        // Build final query
        let query;
        if (filter_type === 'WithoutFilter') {
          if (user_type === 'User') {
              console.log('User');
              const user = req.user;
              const user_id = user.user_id;
              query = `
              SELECT *, 
                  (CASE WHEN plan_id != '0' AND ${currentDateTime} <= plan_expiry_date THEN 1 ELSE 0 END) AS is_sponsored,
                  (SELECT AVG(overall_rating) FROM tbl_rating WHERE vehicle_id = tbl_vehicles.vehicle_id) AS average_rating
              FROM tbl_vehicles 
              WHERE country_name LIKE '${country_name}' AND status = 'Active' AND deleted = 'NO' AND owner_id != ${user_id}
              ORDER BY is_sponsored DESC, average_rating DESC, vehicle_id DESC 
              LIMIT ${limit} OFFSET ${offset}`;
          } else if (user_type === 'Guest') {
              console.log('Guest');
              query = `
              SELECT *, 
                  (CASE WHEN plan_id != '0' AND ${currentDateTime} <= plan_expiry_date THEN 1 ELSE 0 END) AS is_sponsored,
                  (SELECT AVG(overall_rating) FROM tbl_rating WHERE vehicle_id = tbl_vehicles.vehicle_id) AS average_rating
              FROM tbl_vehicles 
              WHERE country_name LIKE '${country_name}' AND status = 'Active' AND deleted = 'NO'
              ORDER BY is_sponsored DESC, average_rating DESC, vehicle_id DESC 
              LIMIT ${limit} OFFSET ${offset}`;
          }
          console.log(query);
      } else if (filter_type === 'WithFilter') {
          const conditionsString = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
          query = `
          SELECT *, 
              (6371 * acos(cos(radians('${lat}')) * cos(radians(location_lat)) * cos(radians(location_lng) - radians('${lng}')) + 
              sin(radians('${lat}')) * sin(radians(location_lat)))) AS calculated_distance,
              (CASE WHEN plan_id != '0' AND ${currentDateTime} <= plan_expiry_date THEN 1 ELSE 0 END) AS is_sponsored,
              (SELECT AVG(overall_rating) FROM tbl_rating WHERE vehicle_id = tbl_vehicles.vehicle_id) AS average_rating
          FROM tbl_vehicles 
          ${conditionsString}
          ORDER BY is_sponsored DESC, average_rating DESC, calculated_distance ASC 
          LIMIT ${limit} OFFSET ${offset};`;
          console.log(query);
      }
        
        // Execute the query
        const [fetchData] = await con.query(query);
        console.log("Number of results: ", fetchData.length);  // Debug to check number of rows
      const formattedData = await Promise.all(fetchData.map(async (vehicleData) => {
        const ownerID = vehicleData.owner_id;
      
        // Check if the owner exists and meets conditions
        const [[existingOwner]] = await con.query(
          'SELECT * FROM tbl_user WHERE user_id = ? AND deleted = "No" AND status = "Approve"',
          [ownerID]
        );
    
        if (!existingOwner) {
          // Skip this vehicle if the owner is not valid
          return null;
        }
      const vehicleName = `${vehicleData.vehicle_name || ''} ${vehicleData.vehicle_make || ''} ${vehicleData.vehicle_model || ''}`.trim();
      const pricePerDay =vehicleData.price_per_day !='0.00'  ? `${vehicleData.price_per_day} / day` : vehicleData.price_per_week != '0.00'? `${vehicleData.price_per_week} / week` : `${vehicleData.price_per_month} / month`;
      const plan_id = vehicleData.plan_id;

      // Handle vehicle images (split and select first one)
      const vehicleImagesArray = (vehicleData.vehicle_images || '').split(',');
      const vehicleImage = vehicleImagesArray.length > 0 ? `${BASEURL}${vehicleImagesArray[0]}` : '';

      // Determine sponsorship status
      const sponsored = (plan_id !='0' && currentDateTime <= vehicleData.plan_expiry_date) ? 'Yes' : 'No';

      // Fetch favorite status for the current vehicle (if user is logged in)
      let favoriteStatus = 'Dislike'; // Default if not a favorite
      if (user_type === 'User') {
        const userID = req.user.user_id;
        const [favoriteData] = await con.query(`SELECT status FROM tbl_favorite_vehicle WHERE vehicle_id = ? AND user_id = ? `, [vehicleData.vehicle_id, userID]);
        if (favoriteData.length > 0) { favoriteStatus = favoriteData[0].status || 'Dislike';}
      }
      ////console.log(favoriteStatus)

      // Fetch vehicle details along with average rating
      const [ratingData] = await con.query(`SELECT AVG(overall_rating) AS rating FROM tbl_rating WHERE vehicle_id = ?`,[vehicleData.vehicle_id]);
      const averageRating = ratingData[0].rating || 0.0;
      ////console.log('averageRating',averageRating);
      // Check if the vehicle's rating meets the requested rating
      // if(filter_type === 'WithFilter')
      // {
      //   if(rating != "0.0")
      //   {
      //     if (rating && averageRating >= rating ) {
      //       return {
      //           rating: averageRating,
      //           vehicle_id: vehicleData.vehicle_id,
      //           favorite_status: favoriteStatus,
      //           speed: vehicleData.speed,
      //           transmission: vehicleData.transmission,
      //           no_of_seats: vehicleData.no_of_seats,
      //           pricePerDay: pricePerDay,
      //           vehicleName: vehicleName,
      //           sponsored: sponsored,
      //           vehicleImage: vehicleImage,
      //           current_location :vehicleData.current_location,
      //           location_lat : vehicleData.location_lat,
      //           location_lng : vehicleData.location_lng
      //           };
      //       }
      //       return null; // Return null for vehicles that don't meet the rating condition
      //   }
      //   else
      //   {
      //     return {
      //       rating: averageRating,
      //       vehicle_id: vehicleData.vehicle_id,
      //       favorite_status: favoriteStatus,
      //       speed: vehicleData.speed,
      //       transmission: vehicleData.transmission,
      //       no_of_seats: vehicleData.no_of_seats,
      //       pricePerDay: pricePerDay,
      //       vehicleName: vehicleName,
      //       sponsored: sponsored,
      //       vehicleImage: vehicleImage,
      //       current_location :vehicleData.current_location,
      //       location_lat : vehicleData.location_lat,
      //       location_lng : vehicleData.location_lng
      //       };
      //   }

      // } 
      // else 
      // {
      //     return {
      //       rating: averageRating,
      //       vehicle_id: vehicleData.vehicle_id,
      //       favorite_status: favoriteStatus,
      //       speed: vehicleData.speed,
      //       transmission: vehicleData.transmission,
      //       no_of_seats: vehicleData.no_of_seats,
      //       pricePerDay: pricePerDay,
      //       vehicleName: vehicleName,
      //       sponsored: sponsored,
      //       vehicleImage: vehicleImage,
      //       current_location :vehicleData.current_location,
      //       location_lat : vehicleData.location_lat,
      //       location_lng : vehicleData.location_lng
      //       };
      // }
       // Check rating if filter is applied
       if (filter_type === 'WithFilter') {
        if (rating != "0.0" && averageRating < rating) {
          return null; // Skip vehicles that don't meet the rating condition
        }
      }

      const [bookingData] = await con.query(
        `SELECT Count(*) AS booking_count FROM tbl_bookings WHERE vehicle_id = ? AND booking_status = 'Completed'`,
        [vehicleData.vehicle_id] );
  
      // Return formatted vehicle data
      return {
        rating: averageRating,
        vehicle_id: vehicleData.vehicle_id,
        favorite_status: favoriteStatus,
        speed: vehicleData.speed,
        transmission: vehicleData.transmission,
        no_of_seats: vehicleData.no_of_seats,
        pricePerDay: pricePerDay,
        vehicleName: vehicleName,
        sponsored: sponsored,
        vehicleImage: vehicleImage,
        current_location: vehicleData.current_location,
        location_lat: vehicleData.location_lat,
        location_lng: vehicleData.location_lng,
        bookingCount : bookingData[0].booking_count,
      };
    }));
     // Filter out null results
     const filteredData = formattedData.filter(data => data !== null);
      
     // Send response based on filter type
     if (filter_type === 'WithoutFilter' || (filter_type === 'WithFilter' && rating == "0.0")) {
       res.status(200).json(filteredData);
     } else if (filter_type === 'WithFilter' && rating != "0.0") {
       res.status(200).json(filteredData.filter(data => data !== null));
     }

  } catch (error) {
    ////console.log('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
}

const updateVehicleAvailibility = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;

  try {
    const { availability, vehicle_id } = req.body;
    console.log("availability--->",availability,typeof availability)

    // Convert string to array
    const availabilityArray = JSON.parse(availability);

    console.log(availabilityArray); // ["2024-12-12", "2024-12-13", "2024-12-14", "2024-12-25", "2024-12-26", "2024-12-27"]

    // Confirm it is an array
    console.log(Array.isArray(availabilityArray)); // true
    // Ensure availability is an array of strings (dates)
    if (!Array.isArray(availabilityArray)) {
      return res.status(400).json({ result: "Availability must be an array of dates." });
    }

    // Begin transaction
    await con.beginTransaction();

    // Check if user exists
    const [[existingUser]] = await con.query(
      "SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?",
      [userID, type]
    );
    if (!existingUser) {
      await con.rollback();
      return res.status(404).json({ result: "User not found" });
    }

    // Check if vehicle exists
    const [[existingData]] = await con.query(
      "SELECT * FROM tbl_vehicles WHERE vehicle_id = ?",
      [vehicle_id]
    );
    if (!existingData) {
      await con.rollback();
      return res.status(404).json({ result: "Vehicle not found" });
    }

    // Fetch bookings for the vehicle that are not 'Completed' or 'Cancelled'
    const [existingBookingData] = await con.query(
      `SELECT booking_dates FROM tbl_bookings WHERE vehicle_id = ? AND booking_status NOT IN ("Completed", "Cancelled")`,
      [vehicle_id]
    );

    // Initialize an array to store booked dates
    let bookedDates = [];

    if (existingBookingData.length > 0) {
      // Iterate through the bookings to check for overlaps
      for (const booking of existingBookingData) {
        // Parse JSON string to get the booked dates array
        const bookedDatesArray = JSON.parse(booking.booking_dates);
        
        // Add the booked dates to the bookedDates array
        bookedDates.push(...bookedDatesArray); // Concatenate all booked dates
      }
    }

    console.log("bookedDates-->", bookedDates); // Correct format: ["2024-12-11", "2024-12-12", ...]

    // The final result is just the bookedDates array since it represents unavailable dates
    const finalUnavailableDates = [...new Set(bookedDates)]; // Remove duplicates
    console.log("finalUnavailableDates-->", finalUnavailableDates); // Correct format: ["2024-12-11", ...]

    // Merge the availability and bookedDates arrays, and mark statuses
    // Ensure both are arrays before merging
    const mergedDates = [...new Set([...availabilityArray, ...finalUnavailableDates])]; // Merge and remove duplicates
    console.log("mergedDates-->", mergedDates); // Correct format: ["2024-12-11", "2024-12-12", ...]

    // Prepare update
    const updateSql =
      "UPDATE `tbl_vehicles` SET `availability` = ? WHERE `vehicle_id` = ?";
    const updateValues = [JSON.stringify(mergedDates), vehicle_id]; // Make sure availability is stored as JSON string

    const [results] = await con.query(updateSql, updateValues);
    if (results.affectedRows === 0) {
      throw new Error("Update failed.");
    }

    // Commit transaction
    await con.commit();

    return res.status(200).json({ result: "Success" });
  } catch (error) {
    // Rollback on error
    await con.rollback();
    console.error("Error during vehicle update:", error.message);
    return res.status(500).json({ result: "Internal Server Error" });
  } finally {
    // Release connection
    await con.release();
  }
};



const fetchVehicleList = async(req,res,next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  try {
    let fetchDataQuery = `SELECT * FROM tbl_vehicles WHERE owner_id = ? ORDER BY vehicle_id DESC`;
    const [fetchData] = await con.query(fetchDataQuery, [userID]);
////console.log(fetchData);
    await con.commit();
        // Format the result using map to return specific fields
    const formattedData = fetchData.map(vehicle => ({
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.vehicle_name,
    }));
  
    res.status(200).json(formattedData);

  }  catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  } 
}

const fetchEarnings = async(req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;

  try {
    const vehicle_id = req.body.vehicle_id;
    const start_date = req.body.start_date;
    const end_date = req.body.end_date;
    ////console.log(req.body);
    let fetchDataQuery ,fetchSum ,fetchData;
    // Add SELECT at the beginning of the query

    if(start_date ==="" && end_date ==="")
    {
      ////console.log("if");
        [fetchSum] = await con.query( 'SELECT SUM(total_charge) AS total_charge FROM tbl_bookings WHERE owner_id = ? AND vehicle_id = ? AND booking_status = "Completed"', 
                                    [userID,vehicle_id, start_date, end_date]);
    
        fetchDataQuery = `SELECT b.*, u.first_name, u.last_name FROM tbl_bookings b LEFT JOIN tbl_user u ON b.user_id = u.user_id
        WHERE b.owner_id = ? AND b.vehicle_id = ? AND b.booking_status = 'Completed' ORDER BY b.booking_id DESC`;
         [fetchData] = await con.query(fetchDataQuery, [userID,vehicle_id, start_date, end_date]);
    }
    else
    { 
      ////console.log("else");
        [fetchSum] = await con.query(
          'SELECT SUM(total_charge) AS total_charge FROM tbl_bookings WHERE owner_id = ? AND vehicle_id = ? AND TRIM(start_date) >= ?  AND TRIM(end_date) <= ?  AND booking_status = "Completed"',
          [userID,vehicle_id, start_date, end_date]
        );
    
        fetchDataQuery = `SELECT b.*, u.first_name, u.last_name FROM tbl_bookings b LEFT JOIN tbl_user u ON b.user_id = u.user_id
        WHERE b.owner_id = ? AND b.vehicle_id = ? AND TRIM(b.start_date) >= ? AND TRIM(b.end_date) <= ?  AND b.booking_status = 'Completed' ORDER BY b.booking_id DESC`;
       [fetchData] = await con.query(fetchDataQuery, [userID,vehicle_id, start_date, end_date]);
    }
   
   ////console.log(fetchData);
    
   ////console.log(fetchSum);
    // If fetchSum is null, set the total_charge to 0
    const totalCharge = fetchSum[0].total_charge === null ? 0 : fetchSum[0].total_charge;

    ////console.log("Total Charge:", totalCharge); // Log the total charge to check if it's correct

    const formattedData = fetchData.map(vehicle => ({
      booking_id: vehicle.booking_id,
      booking_charge: vehicle.total_charge,
      booking_date: vehicle.start_date,
      userName: vehicle.first_name + ' ' + vehicle.last_name
    }));

    // Add formatted data to response
    fetchSum[0].formattedData = formattedData;
    ////console.log(fetchSum);

    // Return the response with totalCharge and formatted data
    res.status(200).json({
      total_charge: totalCharge, // This will be 0 if the sum is null, or the actual value
      formattedData: fetchSum[0].formattedData });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};


const getInvoiceData = async (req, res, next) => {
  const con = await connection();
  const { booking_id } = req.body;
  const user = req.user;
  const userID = user.user_id;

  try {
    await con.beginTransaction();

    // Check if the user exists
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    if (!existingUser) {
      await con.rollback();
      return res.status(404).json({ result: "User not found" });
    }

    // Check if the booking exists
    const [[existingBooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ?', [booking_id]);
    ////console.log("existingBooking--->",existingBooking);
    if (!existingBooking) {
      await con.rollback();
      return res.status(404).json({ result: "Booking not found" });
    }

    // Fetch vehicle data
    const [[vehicleData]] = await con.query('SELECT * FROM tbl_vehicles WHERE vehicle_id = ?', [existingBooking.vehicle_id]);

    let formattedExtras = [];
    if (existingBooking.extras_details) {
      let validJsonString = existingBooking.extras_details
        .replace(/(\w+):/g, '"$1":')
        .replace(/:\s*(\w+)/g, ': "$1"'); 
      validJsonString = `[${validJsonString}]`;
      ////console.log("Valid JSON String:", validJsonString);
      try {
        formattedExtras = JSON.parse(validJsonString);
      } catch (error) {
        console.error("Error parsing extras:", error);
        formattedExtras = []; 
      }
    }
    const extras = formattedExtras;
    ////console.log("Result Data Extras:", extras);

    const total_days = existingBooking.total_days;
    const daily_distance = vehicleData ? vehicleData.daily_distance : 0;
    ////console.log("daily_distance--",daily_distance)
    const distance_price = vehicleData ? vehicleData.distance_price : 0;
    ////console.log("distance_price--",distance_price)
    // Calculate distance and extra charges
    const total_distance = total_days * daily_distance;
    ////console.log("total_distance--",total_distance)
    const user_Checkin_miles = existingBooking.user_Checkin_miles || 0;
    ////console.log("user_Checkin_miles--",user_Checkin_miles)
    const user_Checkout_miles = existingBooking.user_Checkout_miles || 0;
    ////console.log("user_Checkout_miles--",user_Checkout_miles)
    const remaining_distance = user_Checkout_miles - user_Checkin_miles;
    ////console.log("remaining_distance--",remaining_distance)

    const rent_discount1 =  parseFloat(existingBooking.applied_reward_price) +  parseFloat(existingBooking.applied_coupon_charge);

    let extra_miles = 0;
    let extra_collect = 0;

    if (remaining_distance > total_distance) {
      extra_miles = remaining_distance - total_distance;
      ////console.log("extra_miles--",extra_miles)
      extra_collect = extra_miles * distance_price;
      ////console.log("extra_collect--",extra_collect)
    }

    // Format the response
    const formattedData = {
      rent: existingBooking.rent,
      rent_discount: rent_discount1.toString(),
      insurance_charge: existingBooking.insurance_charge,
      pickup_location_charge: existingBooking.pickup_location_charge,
      dropoff_location_charge: existingBooking.dropoff_location_charge,
      extra_charges: extras,
      operating_fee: existingBooking.refundable_charge,
      vat: existingBooking.vat_charge,
      total: existingBooking.grand_total,
      extra_miles,
      extra_collect
    };

    await con.commit();
    res.status(200).json(formattedData);

  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ result: "Internal server error" });
  } finally {
    con.release();
  }
};


const fetchNotification = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = user.user_type;
  // Get page and limit from request (default values: page = 1, limit = 10)
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;
  const offset = (page - 1) * limit;
  try {
     // Check if the user exists
     const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
     if (!existingUser) {
       await con.rollback();
       return res.status(404).json({ result: "User not found" });
     }

    // Fetch FAQs from the database
    const [results] = await con.query('SELECT * FROM tbl_notification_list WHERE user_id=? AND user_type=? ORDER BY `tbl_notification_list`.`notification_id` DESC LIMIT ? OFFSET ?', [userID,type,limit, offset]);
    await con.query('UPDATE tbl_notification_list SET read_status = "YES" WHERE user_id=? AND user_type=?',[userID,type]);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({result:'Internal Server Error'});
  } finally {
    con.release();
  }
};

const fetchNotificationCount = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = user.user_type;
  try {
     // Check if the user exists
     const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
     if (!existingUser) {
       await con.rollback();
       return res.status(404).json({ result: "User not found" });
     }
    // Fetch FAQs from the database
    const [results] = await con.query('SELECT COUNT(*) as totalCount FROM tbl_notification_list WHERE user_id=? AND user_type=? AND read_status = "No" ',[userID,type]);
    res.status(200).json({ totalCount: results[0].totalCount });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({result:'Internal Server Error'});
  } finally {
    con.release();
  }
};

const deleteNotification = async (req , res, next) =>{
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = user.user_type;
  const notification_id = req.body.notification_id;
  try {
    // Check if the user exists
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
    if (!existingUser) {
      await con.rollback();
      return res.status(404).json({ result: "User not found" });
    }

    const [results] = await con.query('DELETE FROM tbl_notification_list WHERE user_id=? AND notification_id=? AND user_type=?  ',[userID,notification_id,type]);
    res.status(200).json({result:'success'});
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({result:'Internal Server Error'});
  } finally {
    con.release();
  }
}


const rewardHistory = async (req, res, next) => {
  const con = await connection();
  const user = req.user;
  const userID = user.user_id;
  const type = req.user.user_type;

  try {
    // Fetch user details to get wallet balance
    const [[existingUser]] = await con.query(
      "SELECT * FROM tbl_user WHERE user_id = ? AND user_type = ?",
      [userID, type]
    );

    if (!existingUser) {
      return res.status(404).json({ result: "User not found" });
    }
    const userName = `${existingUser.first_name || ""} ${existingUser.last_name || ""}`.trim();

    let sql_query1
    if(type == "User")
    {
       sql_query1 =  "SELECT SUM(transaction_amount) AS total_reward FROM tbl_transactions WHERE user_id = ? AND wallet_type = ? AND  transaction_type IN ('Affiliation Amount','Referral Amount')  ORDER BY `transaction_id` DESC";
    }
    else 
    {
       sql_query1 =  "SELECT SUM(transaction_amount) AS total_reward FROM tbl_transactions WHERE user_id = ? AND wallet_type = ? AND transaction_type IN ('Affiliation Amount', 'Referral Amount') ORDER BY transaction_id DESC";
    }
   
    // Fetch transaction data
    const [fetchData1] = await con.query(sql_query1,[userID, type]);

     // Extract total reward from the first row
     const total_reward = fetchData1[0]?.total_reward || 0;
     console.log("total_reward-->",total_reward)
    let sql_query
    if(type == "User")
    {
       sql_query =  "SELECT * FROM tbl_transactions WHERE user_id = ? AND wallet_type = ? AND  transaction_type IN ('Affiliation Amount','Referral Amount')  ORDER BY `transaction_id` DESC";
    }
    else 
    {
       sql_query =  "SELECT * FROM tbl_transactions WHERE user_id = ? AND wallet_type = ? AND transaction_type IN ('Affiliation Amount', 'Referral Amount') ORDER BY transaction_id DESC";
    }
   
    // Fetch transaction data
    const [fetchData] = await con.query(sql_query,[userID, type]);

    // if (!fetchData || fetchData.length === 0) {
    //   return res.status(200).json({ result: "Data not found" });
    // }

    // Format the result using map to return specific fields
    const formattedData = fetchData.map((transaction) => {
      const dateObj = new Date(transaction.created_at);

      const formattedDate = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const formattedTime = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // Ensures time is formatted in AM/PM
      });

      return {
        transaction_id: transaction.transaction_id,
        card_id: transaction.card_id,
        booking_id: transaction.booking_id,
        transaction_amount: transaction.transaction_amount,
        deposit_amount: transaction.deposit_amount, // or masked if needed
        transaction_number: transaction.transaction_number,
        transaction_type: transaction.transaction_type,
        withdrawal_amount: transaction.withdrawal_amount,
        current_wallet_amount: transaction.current_wallet_amount,
        transaction_mode: transaction.transaction_mode,
        userName: userName,
        status: transaction.status,
        date: `${formattedDate}, ${formattedTime}`,
      };
    });
    // Respond with the formatted data
    return res.status(200).json({ total_reward, formattedData });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ result: "Internal Server Error" });
  } finally {
    con.release();
  }
};

const addInvoice = async(req,res,next) => {
  const con = await connection();
 // Declare the `image` variable
 let image = "";

 // Check if a file was uploaded and assign the filename to `image`
 if (req.file) {
   image = req.file.filename;
 }

 const user = req.user;
 const userID = user.user_id;
 const type = req.user.user_type;
 const booking_id = req.body.booking_id;
 console.log("booking_id--->",booking_id);
 console.log("image--->",image);
  try {
    await con.beginTransaction();
    const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id =?',[userID])
    if (!existingUser) {
      await con.rollback();
      res.status(200).json({ result: "User not found" });
      return;
    }

    const [[existingBooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id =?',[booking_id])
    if (!existingBooking) {
      await con.rollback();
      res.status(200).json({ result: "booking not found" });
      return;
    }

    await con.query('UPDATE tbl_bookings SET booking_invoice=? WHERE booking_id =?', [image, booking_id ]);
    await con.commit();  
    res.json({ result: "success" });
  } catch (error) {
    await con.rollback();
    console.error('Error in update API :', error);
    res.status(500).json({result: 'Internal Server Error'});

  } finally {
    con.release();
  }
}


export { sendOTP, verifyOTP, userSignup, ownerSignup, forgotPassword, resetpassword,guestLogin, userLogin, profile, updateprofile, changePassword, Logout,
  deleteAccount, tandc, pandp, faqs, addUserDocument, addCard, fetchCard, updateCard, deleteCard, userVarifyStatus, addBankDetails,fetchBankDetails , 
  updateBankDetails , fetchWalletDetails , fetchCurrency , currencyRate , importantData , withdrawRequest , depositAmount,withdrawHistory, 
  dipositeHistory , transactionHistory , addRating ,fetchRating , contactSupportRequest, fetchSupportComplainList,fetchSingleComplain,
  replyComplainTicket , closeComplainTicket , updateProfilePic , switchUserOwner , fetchMakeList , fetchModelList , fetchFeatureList,
  fetchCarTypeList , fetchvehicleSeatList,addVehicle , fetchUserVehicleList,fetchOwnerVehicleList, FetchAllData,fetchCountryList ,
  fetchOwnerVehicleDetails , fetchUserVehicleDetails , likeDislike , fetchWishlist , addRecentViewVehicle , fetchRecentViewVehicle , 
  addGuestRecentViewVehicle , fetchGuestRecentViewVehicle,  fetchCouponList, checkVehicleAvailability , availabilityCalender , userBooking ,
  deleteVehicle , fetchBookingDetails , fetchUserBookingList , fetchOwnerBookingList , fetchVehicleRent, vehicleSerchFilter , bookingPayment , 
  fetchReasons, cancelBooking , acceptBooking , fetchHelpReasons , cancellationPolicy ,checkInStatus , checkOutStatus , fetchUserBookingHistory ,
  fetchOwnerBookingHistory, completedReward , fetchPromotionalPlans , addPromotionalPlan , aboutUs , fetchSlider , 
  userSupportRequest, fetchUserComplainList , fetchSingleUserComplain , replyUserComplainTicket , closeUserComplainTicket , dateChangeStatus, 
  dateChangeRequest, updateVehicle , countrySerchFilter ,updateVehicleAvailibility , loginRecheck,fetchVehicleList,fetchEarnings, getInvoiceData,
  fetchUserSideOwnerVehicleList, updateDeviceToken ,fetchNotification ,fetchNotificationCount,deleteNotification , updateProfileRequest,
  applyCoupon,removeAppliedCoupon,rewardHistory,addInvoice
};


