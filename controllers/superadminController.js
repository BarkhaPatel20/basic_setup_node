import connection from "../config.js";
import * as path from 'path';
import * as url from 'url';
import ejs from "ejs";
import {sendTokenAdmin} from "../utils/jwtToken.js";
import {hashPassword, comparePassword , senddocNotificationUser,sendPushNotifications,sendOTPFornewPass, encrypt,decrypt , encrypt64 ,decrypt64, sendSinglePushNotification } from '../middleware/helper.js'

import moment from 'moment-timezone';
import { contains } from "cheerio";
// moment.tz.setDefault('Asia/Hong_Kong');

const __dirname = url.fileURLToPath(new URL('.',import.meta.url));


//=========================== Start Web  Services =============================



const home = async (req, res, next) => {
  const con = await connection();
  const output = req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      // Queries for different counts and earnings
      const [[{ user_ids }]] = await con.query("SELECT COUNT(*) AS user_ids FROM tbl_user WHERE user_type='User'");
      const [[{ Owner_ids }]] = await con.query("SELECT COUNT(*) AS Owner_ids FROM tbl_user WHERE user_type='Owner'");
      const [[{ Vehicle_ids }]] = await con.query("SELECT COUNT(*) AS Vehicle_ids FROM tbl_vehicles");
      const [[{ Pendings }]] = await con.query("SELECT COUNT(*) AS Pendings FROM tbl_bookings WHERE booking_status='Pending'");
      const [[{ On_Goings }]] = await con.query("SELECT COUNT(*) AS On_Goings FROM tbl_bookings WHERE booking_status IN ('On_Going','UserCheck_In','UserCheck_Out','OwnerCheck_In','OwnerCheck_Out')");
      const [[{ Cancelleds }]] = await con.query("SELECT COUNT(*) AS Cancelleds FROM tbl_bookings WHERE booking_status='Cancelled'");
      const [[{ Completeds }]] = await con.query("SELECT COUNT(*) AS Completeds FROM tbl_bookings WHERE booking_status='Completed'");
      const [[{ booking_ids }]] = await con.query("SELECT COUNT(*) AS booking_ids FROM tbl_bookings");
      const [[{ total_charge }]] = await con.query("SELECT SUM(total_charge) AS total_charge FROM tbl_bookings WHERE booking_status='Completed'");
      const [[{ admin_com }]] = await con.query("SELECT SUM(vat_charge) AS admin_com FROM tbl_bookings WHERE booking_status='Completed'");
      const [[{ Confirms }]] = await con.query("SELECT COUNT(*) AS Confirms FROM tbl_bookings WHERE booking_status IN ('Confirmed')");
      
      
      // Create indexDetails object
      const indexDetails = {
          user_ids,
          Owner_ids,
          Vehicle_ids,
          Pendings,
          On_Goings,
          Confirms,
          Cancelleds,
          Completeds,
          booking_ids,
          total_charge: total_charge || 0, // Handle null in case no completed bookings
          admin_com: admin_com || 0       // Handle null in case no completed bookings
      };

      // Render the view
      res.render('superadmin/index', { output, indexDetails });
      await con.commit();
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  } finally {
      // Release or close the connection
      if (con.release) {
          con.release();
      } else {
          con.end();
      }
  }
};




  const kilstream = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {

      await con.beginTransaction();
      res.render('superadmin/kilstream',{output:output}) 
      await con.commit();

    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      con.release();
    }
  };




  
const index = async (req, res, next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {

    await con.beginTransaction();
    res.render('superadmin/index1',{output:output}) 
    await con.commit();

  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



  const login = async(req,res,next) => {

    const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD HH:mm:ss');

    //for seprate date & time 
    const currentTime = moment().tz("Asia/Hong_Kong");
    const date = currentTime.format('YYYY-MM-DD');
    const time = currentTime.format('hh:mm A');
  
    // console.log("currentDateTime ->> " , currentDateTime)
  
    // console.log("date ->> " , date)
  
    // console.log("time ->> " , time)
    const con = await connection();

    try {
        await con.beginTransaction();
        res.render('superadmin/login',{'output':''})
        await con.commit();
    } catch (error) {
        console.error('Error:',error);
        res.status(500).send('Internal Server Error');
    } finally{
        con.release();
    }
  };


  const loginAdmin = async (req, res, next) => { 
    try {
      // console.log(req.body);
      const con = await connection();
      const { username, password } = req.body;
      console.log("req.body--->",req.body);
      // If the user doesn't enter username or password
      if (!username || !password) {
        return res.render('superadmin/login', { 'output': 'Please Enter Username and Password' });
      }
    
      const [results] = await con.query('SELECT * FROM tbl_admin WHERE username = ?', [username]);
      const admin = results[0];
  
      // If admin not found
      if (!admin) {
        return res.render('superadmin/login', { 'output': 'Invalid Username' });
      }
  
      // Compare password
      const isValid = comparePassword(password, admin.password);
      // console.log("isValid--> ", isValid);
  
      if (!isValid) {
        return res.render('superadmin/login', { 'output': 'Incorrect Password' });
      }
  
      // If login successful
      sendTokenAdmin(admin, 200, res);
  
    } catch (error) {
      console.error('Error during login:', error);
      // Handle errors like database connection failure, unexpected errors, etc.
      res.render('superadmin/login', { 'output': 'An error occurred. Please try again later.' });
    }
  };


  const logout1 = async (req, res) => {
    const con = await connection();
    try {
        //const admin = req.admin; // Assuming you have middleware to verify and fetch admin info from JWT
  
        // Clear all active sessions for this admin
        await con.query('DELETE FROM active_sessions WHERE user_id = ?', [1]);
  
        // Clear the Admin_token cookie from the response
        res.clearCookie('Admin_token').redirect('/superadmin/login'); // Redirect to login page after logout
    } catch (error) {
        console.error('Error logging out admin:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  const logout = async (req, res) => {

          try {
            res.cookie("Admin_token",null,{
              expires : new Date(Date.now()),
              httpOnly:true
          })
          
          res.redirect('/superadmin/login')
    } catch (error) {
        console.error('Error logging out admin:', error);
        // res.cookie('rental_msg', 'Error logging out admin: : '+ error);
       res.render('superadmin/kil500', { output: `${error}` });
        // res.render('kil404', { output: `Requested Page or URL Not Found` });

        // res.redirect('/superadmin')
    }
  };









  
    //----------------------- Profile Forgot Password Section Start ------------------------------------- 


    const ForgotPassword = async(req,res,next)=>{  

          
      try {
       res.render('superadmin/ForgotPassword', { 
         showForgotPasswordForm: true,
         showVerifyOTPPrompt: false,
         showResetPasswordForm: false,
         "output":"Enter Your Email"
       
       });
   
       
      } catch (error) {
     

         res.render('superadmin/kil500', { output: `${error}`,loggeduser:{} });
      }
 
 }


 

 const sendOTP = async (req, res, next) => {
  const con = await connection();
  const email = req.body.email; 
   try {
     
     await con.beginTransaction();

    var [isUser] =  await con.query('SELECT * FROM tbl_admin WHERE email = ?', [email]);

   if(isUser.length == 0){
  return  res.render('superadmin/ForgotPassword', {
      showForgotPasswordForm: true,
      showVerifyOTPPrompt: false,
      showResetPasswordForm: false,
      output: 'Invalid Email.',

    });
   }


     const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit OTP

     // console.log("Otpppppppp ---> ",otp)

 
 
     // Check if the user's email already exists in tbl_otp
     const [results] = await con.query('SELECT * FROM tbl_otp WHERE email = ?', [email]);
 
     if (results.length === 0) {
       // Insert a new record in tbl_otp
       const currentTime = new Date();
       const expiryTime = new Date(currentTime.getTime() + 10 * 60000); // Expiry time is set to 10 minutes from the current time
       await con.query('INSERT INTO tbl_otp (email, otp_code, expire_at) VALUES (?, ?, ?)', [email, otp, expiryTime]);
     } else {
       // Update the existing record in tbl_otp
       const currentTime = new Date();
       const expiryTime = new Date(currentTime.getTime() + 10 * 60000); // Expiry time is set to 10 minutes from the current time
       await con.query('UPDATE tbl_otp SET otp_code = ?, expire_at = ? WHERE email = ?', [otp, expiryTime, email]);
     }
 
     await con.commit();
     // Call the function to send the OTP through the appropriate channel (e.g., email, SMS)
     await sendOTPFornewPass(email, otp);
 
     res.render('superadmin/ForgotPassword', {
       showForgotPasswordForm: false,
       showVerifyOTPPrompt: true,
       showResetPasswordForm: false,
       output: 'OTP sent successfully !!',
       email: email

     });
   } catch (error) {
     // console.log(error);
     await con.rollback();
     res.render('superadmin/ForgotPassword', {
       showForgotPasswordForm: true,
       showVerifyOTPPrompt: false,
       showResetPasswordForm: false,
       output: 'Failed to send OTP. Internal server error.'
       
     });
   }
 };
 


const verifyOTP = async (req, res, next) => {

 const con = await connection();
 const userOTP = req.body.otp;
 const email = req.body.verifyEmail; 
 try {
 
   const [results] = await con.query('SELECT * FROM tbl_otp WHERE email = ?', [email]);
   const storedOTP = results[0].otp_code;
   const expiryTime = new Date(results[0].expire_at);

   // console.log('storedOTP',storedOTP)
   
   // console.log('userOTP',userOTP)

   // Verify the OTP
   if (userOTP == storedOTP && new Date() < expiryTime) {  // console.log("correct OTP")
     res.render('superadmin/ForgotPassword', {
       showForgotPasswordForm: false,
       showVerifyOTPPrompt: false,
       showResetPasswordForm: true,
       output: '',
       email: email
     
     });
   } else { // console.log(" Incorrect OTP")
     res.render('superadmin/ForgotPassword', {  
       showForgotPasswordForm: false,
       showVerifyOTPPrompt: true,
       showResetPasswordForm: false,
       output: 'Invalid or expired OTP. Please try again',
       email: email
    
     });
   }
 } catch (error) {
   console.error(error);
   res.json('Error in verifying OTP');
 }
};




const resetpassword = async(req,res,next)=>{ 
 const con = await connection();  
  
 const { resetemail, npass, cpass } = req.body;

 
try {

  await con.beginTransaction();

  var [[admin]] =  await con.query('SELECT * FROM tbl_admin WHERE email = ?', [resetemail]);

  let isValid = comparePassword( cpass, admin.password ); 

  if(isValid){
  
    await con.rollback();
    return res.render('superadmin/ForgotPassword', {
      showForgotPasswordForm: false,
      showVerifyOTPPrompt: false,
      showResetPasswordForm: true,
      "output":"New password cannot be the same as the old password",
      "email":resetemail
     
    });    
   }


 if (npass !== cpass) {
  await con.rollback();

  return res.render('superadmin/ForgotPassword', {
     showForgotPasswordForm: false,
     showVerifyOTPPrompt: false,
     showResetPasswordForm: true,
     "output":"New password and confirm password do not match",
     "email":resetemail
  
   });  

  }

  var hashedPass = hashPassword(cpass);


 await con.query('UPDATE tbl_admin SET password = ? WHERE email = ?', [hashedPass, resetemail ])

 const currentTime = new Date();
 await con.query('UPDATE tbl_otp SET otp_code = ?, expire_at = ? WHERE email = ?', ['0000', currentTime, resetemail]);

  //passwordNotify(resetemail)

  await con.commit();
 res.render('superadmin/login',{"output":"Password Reset successfully !"})


 
} catch (error) {
  // console.log(error)
  await con.rollback();
 res.render('superadmin/ForgotPassword', { 
   showForgotPasswordForm: true,
   showVerifyOTPPrompt: false,
   showResetPasswordForm: false,
   "output":"Failed to Reset Password , Please Try Again "
  
 });
 
}
     

}

 
//------------------------------- Forgot Password End ---------------------------- 





  
  
  

 const error404 = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();
     res.render('superadmin/error404',{'output':''})
     await con.commit(); 
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

const error500 = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();
     res.render('superadmin/error500',{'output':''})
     await con.commit(); 
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}




const profile = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

     await con.commit(); 

     res.render('superadmin/profile',{output:output})

  } catch (error) {
     console.error('Error:',error);
     await con.rollback(); 
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const updateUserPic = async (req, res, next) => {

  const con = await connection();
  console.log("sala ",req.body)

  try {
    await con.beginTransaction();

    var image = req.admin.image

    if (req.file) {
      image = req.file.filename;
    }
    await con.query('UPDATE tbl_admin SET image = ? WHERE admin_id  = ?', [image, req.admin.admin_id]);

    await con.commit();
    res.json({ msg: "success" })
  } catch (error) {
    await con.rollback();
    // console.log("failed to update profile pic --> ", error)
    res.json({ msg: "failed" })
  } finally {
    con.release();
  }


}



const profilePost = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();
      cost
     await con.commit(); 

     res.render('superadmin/profile',{output:''})

  } catch (error) {
     console.error('Error:',error);
     await con.rollback(); 
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}





const updateAdmin = async (req, res, next) => {
  const con = await connection();

  
  // Extract form data
  const { admin_id, first_name,last_name,email,country_code,contact , username } = req.body;
  
  // Handle uploaded image (if any)
  const image = req.file ? req.file.filename : null;  // Multer attaches 'file' if image is uploaded



  try {
    await con.beginTransaction();

    // Prepare the SQL query to update the vehicle type
    let updateQuery = `
      UPDATE tbl_admin 
      SET first_name = ?, last_name = ?, email = ? , username=?, country_code=? ,contact=?
    `;
    
    const queryValues = [first_name,last_name,email,username,country_code,contact];

    // Only update the image if a new one is provided
    if (image) {
      updateQuery += `, image = ?`;
      queryValues.push(image);
    }

    updateQuery += ` WHERE admin_id = ?`;
    queryValues.push(admin_id); 

    // Execute the query
    await con.query(updateQuery, queryValues);

    await con.commit(); // Commit the transaction

    res.cookie('rental_msg', 'Admin updated successfully!');
    res.redirect('/superadmin/profile')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release(); // Release the database connection
  }

};


const changepass = async (req, res, next) => {
  const con = await connection();

  try {
    await con.beginTransaction();
    const existingPass = req.admin.password;

    const email = req.admin.email;
  
    const { opass, npass, cpass } = req.body;

   

    let isValid = comparePassword( opass, existingPass );          

    if (!isValid) {    
     // return res.render('superadmin/profile',{"output":"Old password is incorrect"})

      res.cookie('rental_msg', 'Old password is incorrect');
     return res.redirect('/superadmin/profile')
    }

    if(opass == cpass ){
      //return res.render('superadmin/profile',{"output":"New password cannot be the same as the old password."})

      res.cookie('rental_msg', 'New password cannot be the same as the old password.');
      return res.redirect('/superadmin/profile')
    }


    if (npass !== cpass) {
     // return res.render('superadmin/profile',{"output":"New password and confirm password do not match"})

      res.cookie('rental_msg', 'New password and confirm password do not match');
      return res.redirect('/superadmin/profile')
     
    }


    // if (opass !== existingPass) {    
    //   return res.render('superadmin/profile',{"output":"Old password is incorrect"})
    // }
    // if (npass !== cpass) {
    //  return res.render('superadmin/profile',{"output":"New password and confirm password do not match"})
     
    // }
   
    var hashedPass = hashPassword(cpass);
   
    await con.query('UPDATE tbl_admin SET password = ? WHERE admin_id = ?', [hashedPass,req.admin.admin_id]);

        res.cookie("Admin_token",null,{
          expires : new Date(Date.now()),
          httpOnly:true
      })

    // passwordNotify(email)

    await con.commit();

    res.render('superadmin/login',{"output":"Password changed successfully" })
   
   
  } catch (error) {
    console.error('Error:', error);
    await con.rollback();
    res.cookie('rental_msg', `failed to Update Password ${error}`);
    return res.redirect('/superadmin/profile')
 
  }finally {
    con.release(); 
  }
};





//=========================  User Section Start ==========================================





const addUser = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

     await con.commit(); 

     res.render('superadmin/addUser',{output:output})

  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const addUserPost = async (req, res, next) => {
  // console.log(req.body);
  // console.log(req.files);
  const con = await connection();

  try {
      await con.beginTransaction();

      const selectedCountryFlag = req.body.location;

      const selectedLocation = req.locations.find(loc => loc.country_code === selectedCountryFlag);
   
      req.body.country_flag = selectedLocation ? selectedLocation.country_code : '';
      req.body.country_name = selectedLocation ? selectedLocation.country_name : '';
      req.body.password = hashPassword(req.body.password);

      let user_document_images = '';
      let front_image;
      let back_image;
      const time = new Date().toLocaleTimeString();
      const date = new Date().toISOString().split('T')[0];  // Format the date properly

      if (req.files.front_image) {
          front_image = req.files.front_image.map(file => file.filename).join(',');
      }
      if (req.files.back_image) {
          back_image = req.files.back_image.map(file => file.filename).join(',');
      }
      user_document_images = [front_image, back_image].filter(Boolean).join(','); // Combine images

      const image_type = req.body.image_type === "" ? "Document" : req.body.image_type;
      const invite_code = Math.floor(1000 + Math.random() * 9000);
      const affiliation_code = Math.floor(1000 + Math.random() * 9000);

      // Check if the user already exists with the provided email
      const checkUserSql = 'SELECT COUNT(*) as count FROM `tbl_user` WHERE email = ?';
      const checkUserValues = [req.body.email];

      const checkUserSql2 = 'SELECT COUNT(*) as count FROM `tbl_user` WHERE country_code = ? AND contact = ?';
      const checkUserValues2 = [req.body.country_code, req.body.contact];

      const [userResult] = await con.query(checkUserSql, checkUserValues);
      const [userResult2] = await con.query(checkUserSql2, checkUserValues2);

      // Check if email or mobile already exists
      if (userResult[0].count > 0) {
          await con.rollback();
      
         // return res.render('superadmin/addUser', { output: 'Email already exists' });
          res.cookie('rental_msg', 'Email already exists');
          res.redirect('/superadmin/addUser')
      } else if (userResult2[0].count > 0) {
          await con.rollback();      
         // return res.render('superadmin/addUser', { output: 'Mobile Number already exists' });
          res.cookie('rental_msg', 'Mobile Number already exists');
          res.redirect('/superadmin/addUser')
      } else {
        const sql = 
        'INSERT INTO `tbl_user` (`first_name`, `last_name`, `email`, `password`, `signup_type`, `country_code`, `country_flag`, `country_name`, `contact`, `image_type`, `user_document_images`, `invite_code`, `affiliation_code`, `user_type`, `date`, `time`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    
    const values = [
        req.body.first_name,           
        req.body.last_name,             
        req.body.email,           
        req.body.password,        
        'Normal',                        
        req.body.country_code,          
        req.body.country_flag,
        req.body.country_name,          
        req.body.contact,               
        image_type,                    
        user_document_images,                
        invite_code,                   
        affiliation_code,            
        'User',                         
        date,                            
        time                            
    ];
    

          const [results] = await con.query(sql, values);

          await con.commit();

          const selectUserSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
          const [[userDetails]] = await con.query(selectUserSql, [results.insertId]);

          // console.log("User added successfully");
        //  return res.render('superadmin/addUser', { output: 'User Added successfully !!' });
          res.cookie('rental_msg', 'User Added successfully !!');
          res.redirect('/superadmin/addUser')
      }
  } catch (error) {
      console.error('Error:', error);
      await con.rollback(); // Ensure rollback on error
      res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

const checkemail = async (req, res, next) => { 

   
  const con = await connection();
  const { email } = req.body;

  try {
    await con.beginTransaction();

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_user WHERE email = ?', [email]);
      
    const userExists = result[0].count > 0; // Check if the count is greater than 0

    res.json({ exists: userExists }); // Return whether the user exists or not


    await con.commit();
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



const checkphonenumber = async (req, res, next) => { 

 
  const con = await connection();
  const { phoneNumber } = req.body;

  try {
    await con.beginTransaction();    

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_user WHERE contact = ?', [phoneNumber]);
    
    const userExists = result[0].count > 0;

    res.json({ exists: userExists });


    await con.commit();
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};


const viewUsers = async(req,res,next) => {
  const con = await connection();

  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();


      // const [users] = await con.query("SELECT * FROM tbl_user ORDER BY user_id DESC");

      const [users] = await con.query("SELECT * FROM tbl_user where user_type='User' And deleted='No' ORDER BY user_id DESC");



     await con.commit();    
     res.render('superadmin/viewUsers',{output:output,users})

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const updateUser = async (req, res, next) => {
  const con = await connection();

  
  // Extract form data
  const { user_id, first_name,last_name,email,country_code,contact } = req.body;
  
  // Handle uploaded image (if any)
  const profile_image = req.file ? req.file.filename : null;  // Multer attaches 'file' if image is uploaded



  try {
    await con.beginTransaction();

    // Prepare the SQL query to update the vehicle type
    let updateQuery = `
      UPDATE tbl_user 
      SET first_name = ?, last_name = ?, email = ? , country_code=? ,contact=?
    `;
    
    const queryValues = [first_name,last_name,email,country_code,contact];

    // Only update the image if a new one is provided
    if (profile_image) {
      updateQuery += `, profile_image = ?`;
      queryValues.push(profile_image);
    }

    updateQuery += ` WHERE user_id = ?`;
    queryValues.push(user_id); 

    // Execute the query
    await con.query(updateQuery, queryValues);

    await con.commit(); // Commit the transaction

    res.cookie('rental_msg', 'User updated successfully!');
    res.redirect('/superadmin/viewUsers')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release(); // Release the database connection
  }
};





const changeUserStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_user SET status=? WHERE user_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Approve' ? 'Approving' : 'Disapproving'} User ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };




  
const deleteUser = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  
      
      const [[userDetails]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [id]);
  
      if(userDetails.email == 'kilvishbirla@gmail.com' || userDetails.email == 'andhera@gmail.com' ){
  
        return res.status(200).json({ success: false, msg: "Can't Delete: This User ( Under Testing purpose )"});
      }
  
  
        // const deleteSql = `DELETE FROM tbl_user WHERE user_id = ?`;
        // await con.query(deleteSql, [id]);

        const softDeleteSql = `UPDATE tbl_user SET deleted = 'Yes' WHERE user_id = ?`;
        await con.query(softDeleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'User deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };
  

  const deleteNotification = async (req, res, next) => {  
    const con = await connection();
    const { id } = req.body;
    // console.log("req.body-->",req.body);
    try {
        await con.beginTransaction();
        const softDeleteSql = `DELETE FROM tbl_notification_list  WHERE notification_id  = ?`;
        // console.log("softDeleteSql-->",softDeleteSql);
       const update =  await con.query(softDeleteSql, [id]);
        // console.log("update-->",update);
        await con.commit();
  
        res.json({ success: true, msg: 'Notification deleted successfully !!' });
    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    
        // Handle error, render error message, or redirect to appropriate page
    } finally {
        con.release();
    }
};


const user_withdrawal_report = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('superadmin/user_withdrawal_report',{output:''})

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const user_document_management = async(req,res,next) => {
  const con = await connection();

  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      const [users] = await con.query("SELECT * FROM tbl_user where user_type='User' ORDER BY user_id DESC");


    const currentDate = moment();
    users.forEach(user => {
        const userDocExpiry = moment(user.user_doc_expiry_date);
        const licenseExpiry = moment(user.expiry_date);

        // Calculate days until expiration
        user.daysUntilDocExpiry = userDocExpiry.diff(currentDate, 'days');
        user.daysUntilLicenseExpiry = licenseExpiry.diff(currentDate, 'days');
    });



     await con.commit();    
     res.render('superadmin/user_document_management',{output:output,users})

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}




const changeLicenseStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_user SET license_status=? WHERE user_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Verified' ? 'Verifying' : 'unverifying'} License ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };


  
  const senddocNotificationworking = async (req, res, next) => {
    const con = await connection();
    const { userId, expiredDocs } = req.body;

    // console.log("ecpired docs ", expiredDocs)



    try {
        await con.beginTransaction();
        const [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userId]);
        const userInfo = user[0];

        let attachments = [];
        let expiredMessage = [];

        // Attach user document if expired
        if (expiredDocs.includes('User Document') && userInfo.user_document_images) {
            const docPaths = userInfo.user_document_images.split(',');
            docPaths.forEach((doc) => {
                attachments.push({
                    filename: path.basename(doc),
                    path: path.join(__dirname, '../public/images/docUploads', doc)
                });
            });
            expiredMessage.push(`User Document (Expired on: ${userInfo.user_doc_expiry_date})`);
        }

        // Attach license document if expired
        if (expiredDocs.includes('License') && userInfo.license_images) {
            const licensePaths = userInfo.license_images.split(',');
            licensePaths.forEach((license) => {
                attachments.push({
                    filename: path.basename(license),
                    path: path.join(__dirname, '../public/images/docUploads', license)
                });
            });
            expiredMessage.push(`License (Expired on: ${userInfo.expiry_date})`);
        }

        // Construct the message
        const message = expiredMessage.length > 0 
            ? expiredMessage.join('<br>') 
            : 'No documents have expired.';


            
        // Send Email notification via email using helper function
        await senddocNotificationUser([userInfo.email], message, 'Document Expiry Notification', attachments);

        await con.commit();
        res.status(200).send({ message: 'Notification sent successfully.' });

    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).send({ message: `Failed to send notification. ${error.message}` });
    }


};


const senddocNotification = async (req, res, next) => {
  const con = await connection();
  const { userId, expiredDocs, sendEmail, sendInApp, userTimezone } = req.body;

  // console.log(req.body)

  try {
      await con.beginTransaction();



    //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    // console.log("currentDateTime ->> " , currentDateTime)  
    // console.log("date ->> " , kildate)  
    // console.log("time ->> " , kiltime)
    //=================  Timzezone according to Client Location =========================


      const [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userId]);
      const userInfo = user[0];

      let attachments = [];
      let expiredMessage = [];

      

      // Attach user document if it has expired or is expiring within 30 days
      if (expiredDocs.includes('User Document (Expiring in next 30 days)') || expiredDocs.includes('User Document (Already Expired)')) {
        if (userInfo.user_document_images) {
            const docPaths = userInfo.user_document_images.split(',');
            docPaths.forEach((doc) => {
                attachments.push({
                    filename: path.basename(doc),
                    path: path.join(__dirname, '../public/images/docUploads', doc)
                });
            });
        }
        expiredMessage.push(`User Document ${expiredDocs.includes('User Document (Already Expired)') ? '(Expired)' : '(Expiring in next 30 days)'}`);
    }

    // Attach license document if it has expired or is expiring within 30 days
    if (expiredDocs.includes('License (Expiring in next 30 days)') || expiredDocs.includes('License (Already Expired)')) {
        if (userInfo.license_images) {
            const licensePaths = userInfo.license_images.split(',');
            licensePaths.forEach((license) => {
                attachments.push({
                    filename: path.basename(license),
                    path: path.join(__dirname, '../public/images/docUploads', license)
                });
            });
        }
        expiredMessage.push(`License ${expiredDocs.includes('License (Already Expired)') ? '(Expired)' : '(Expiring in next 30 days)'}`);
    }

      // Construct the message
      const message = expiredMessage.length > 0 
          ? expiredMessage.join('<br>') 
          : 'No documents have expired.';

      // If email notification is selected, send Email notification
      if (sendEmail) {
        // console.log("email app notification ")
          await senddocNotificationUser([userInfo.email], message, 'Document Expiry Notification', attachments);
      }

      // If in-app notification is selected, insert into tbl_notification_list
      if (sendInApp) {
        // console.log("in app notification ")
          const notificationMessage = `Document expiry notification: ${message}`;
          await con.query(
              'INSERT INTO tbl_notification_list (notification_type, user_id, user_type, title, message, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
              ['Document_Expiry', userId, userInfo.user_type, 'Your Document is being expired', notificationMessage, kildate, kiltime  ]
          );
      }

      await con.commit();
      res.status(200).send({ message: 'Notification sent successfully.' });

  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send({ message: `Failed to send notification. ${error.message}` });
  }
};




const deposit_to_User = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
    await con.rollback();
      con.release();
  }
}



const withdrawal_to_User = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     
  } catch (error) {
     console.error('Error:',error);
     await con.rollback();
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}





//=========================  User Section End ==========================================


//=====================  Start adduserAmount.ejs =============================


const adduserAmount = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  var user_id = req.cookies.rental_user_id || '';


  try {
      await con.beginTransaction();

      const selectUserSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
      const [[user]] = await con.query(selectUserSql, [user_id]);    


      const selectUserTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
      const [transactions] = await con.query(selectUserTransactionSql, [user_id,'User']); 

     await con.commit(); 

     res.render('superadmin/adduserAmount',{output:'',user:user , transactions})
     
  } catch (error) {
     console.error('Error:',error);
     await con.rollback();
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}


const adduserAmountPost = async(req,res,next) => {
  const con = await connection();

  // console.log(req.body)

  const { new_credit_amount , user_id } = req.body
  const userTimezone = req.cookies.rental_time_zone || '';
  // console.log("timezone of walledt --> ",userTimezone)

  try {
      await con.beginTransaction();

             //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    // console.log("currentDateTime ->> " , currentDateTime)  
    // console.log("date ->> " , kildate)  
    // console.log("time ->> " , kiltime)
    //=================  Timzezone according to Client Location =========================

      const selectUserSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
      const [[userDetails]] = await con.query(selectUserSql, [user_id]);   
     var updated_wallet_amount = parseFloat(new_credit_amount)+ parseFloat(userDetails.user_wallet)  
     
     
     if(userDetails.status == 'Disapprove'){
      const selectUserTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
      const [transactions] = await con.query(selectUserTransactionSql, [user_id,'Owner']);   
     // res.render('superadmin/adduserAmount',{output:"Can't credit to Disapproved Owner",user:userDetails , transactions})
      res.cookie('rental_msg', "Can't credit to Disapproved User");
      res.redirect('/superadmin/adduserAmount')
    }

     
      const updateQuery = `UPDATE tbl_user SET user_wallet = ? WHERE user_id = ?`;   
      const queryValues = [updated_wallet_amount,user_id];
        // Execute the query
        await con.query(updateQuery, queryValues);


        

          // Create transaction number with timestamp and "Admin-" prefix
      const transactionNumber = `Admin-${Date.now()}`; // Generates something like "Admin-163656789..."

      // Insert transaction into `tbl_transactions`
      const insertTransactionSql = `
          INSERT INTO tbl_transactions 
          (transaction_number, wallet_type, transaction_type, deposit_amount, transaction_amount, current_wallet_amount, transaction_mode, user_id,created_at)
          VALUES (?, 'User', 'Deposite', ?, ?, ?, 'Admin', ?,?)`;

      const insertTransactionValues = [
          transactionNumber,
          new_credit_amount,                // deposit amount
          new_credit_amount,                // transaction amount
          updated_wallet_amount,            // updated wallet amount
          user_id,
          currentDateTime                           // user ID
      ];

      await con.query(insertTransactionSql, insertTransactionValues);
     


    
        const [[user]] = await con.query(selectUserSql, [user_id]);   

        const selectUserTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
        const [transactions] = await con.query(selectUserTransactionSql, [user_id,'User']); 

        // console.log("transactions --> ", transactions)

     await con.commit(); 
    const output = `Amount- ( ${parseFloat(new_credit_amount).toFixed(2)} ${req.currency} ) has been credited to ${user.first_name} ${user.last_name}'s Wallet successfully !`
  //   res.render('superadmin/adduserAmount',{output:output,user:user , transactions})
     res.cookie('rental_msg', output);
      res.redirect('/superadmin/adduserAmount')
  } catch (error) {
    await con.rollback();
     console.error('Error:',error);
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}

//=====================  End Walledt Amount  =============================


//=========================  Owner Section Start ==========================================


const addOwner = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('superadmin/addOwner',{output:output})
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const addUserOwner = async (req, res, next) => {
  // console.log(req.body);
  // console.log(req.files);
  const con = await connection();
  try {
      await con.beginTransaction();

      const selectedCountryFlag = req.body.location;

      const selectedLocation = req.locations.find(loc => loc.country_code === selectedCountryFlag);
   
      req.body.country_flag = selectedLocation ? selectedLocation.country_code : '';
      req.body.country_name = selectedLocation ? selectedLocation.country_name : '';
      req.body.password = hashPassword(req.body.password);

    

      const time = new Date().toLocaleTimeString();
      const date = new Date().toISOString().split('T')[0];  // Format the date properly

      if (req.files.front_image) {
          front_image = req.files.front_image.map(file => file.filename).join(',');
      }
      let owner_document_images = '';
    
      if (req.files) {
        // If images are uploaded, join filenames with commas
        owner_document_images = req.files.map(file => file.filename).join(',');
      }   
      
    

      const image_type = 'Document';
     
      const invite_code = Math.floor(1000 + Math.random() * 9000);
      const affiliation_code = Math.floor(1000 + Math.random() * 9000);

      // Check if the user already exists with the provided email
      const checkUserSql = 'SELECT COUNT(*) as count FROM `tbl_user` WHERE email = ?';
      const checkUserValues = [req.body.email];

      const checkUserSql2 = 'SELECT COUNT(*) as count FROM `tbl_user` WHERE country_code = ? AND contact = ?';
      const checkUserValues2 = [req.body.country_code, req.body.contact];

      const [userResult] = await con.query(checkUserSql, checkUserValues);
      const [userResult2] = await con.query(checkUserSql2, checkUserValues2);

      // Check if email or mobile already exists
      if (userResult[0].count > 0) {
          await con.rollback();
          res.cookie('rental_msg', 'Email already exists');
          res.redirect('/superadmin/addOwner')
      } else if (userResult2[0].count > 0) {
          await con.rollback();      

          res.cookie('rental_msg', 'Mobile Number already exists');
          res.redirect('/superadmin/addOwner')
      } else {
        const sql = 
        'INSERT INTO `tbl_user` (`first_name`, `last_name`, `email`, `password`, `signup_type`, `country_code`, `country_flag`, `country_name`, `contact`, `image_type`, `owner_document_images`, `invite_code`, `affiliation_code`, `user_type`, `date`, `time`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    
    const values = [
        req.body.first_name,           
        req.body.last_name,             
        req.body.email,           
        req.body.password,        
        'Normal',                        
        req.body.country_code,          
        req.body.country_flag,
        req.body.country_name,          
        req.body.contact,               
        image_type,                    
        owner_document_images,                
        invite_code,                   
        affiliation_code,            
        'Owner',                         
        date,                            
        time                            
    ];
    

          const [results] = await con.query(sql, values);

          await con.commit();

          const selectUserSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
          const [[userDetails]] = await con.query(selectUserSql, [results.insertId]); 
          res.cookie('rental_msg', 'Owner Added successfully !!'); 
          return res.redirect('/superadmin/addOwner')
      }
  } catch (error) {
      console.error('Error:', error);
      await con.rollback(); // Ensure rollback on error
      res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}




const viewOwners = async(req,res,next) => {
  const con = await connection();

  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();


      // const [users] = await con.query("SELECT * FROM tbl_user ORDER BY user_id DESC");

      const [owners] = await con.query("SELECT * FROM tbl_user where user_type='Owner' And deleted='No' ORDER BY user_id DESC");



     await con.commit();    
     res.render('superadmin/viewOwners',{output:output,owners})

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const updateOwner = async (req, res, next) => {
  const con = await connection();

  
  // Extract form data
  const { user_id, first_name,last_name,email,country_code,contact } = req.body;
  
  // Handle uploaded image (if any)
  const profile_image = req.file ? req.file.filename : null;  // Multer attaches 'file' if image is uploaded



  try {
    await con.beginTransaction();

    // Prepare the SQL query to update the vehicle type
    let updateQuery = `
      UPDATE tbl_user 
      SET first_name = ?, last_name = ?, email = ? , country_code=? ,contact=?
    `;
    
    const queryValues = [first_name,last_name,email,country_code,contact];

    // Only update the image if a new one is provided
    if (profile_image) {
      updateQuery += `, profile_image = ?`;
      queryValues.push(profile_image);
    }

    updateQuery += ` WHERE user_id = ?`;
    queryValues.push(user_id); 

    // Execute the query
    await con.query(updateQuery, queryValues);

    await con.commit(); // Commit the transaction

    res.cookie('rental_msg', 'Owner updated successfully!');
    res.redirect('/superadmin/viewOwners')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release(); // Release the database connection
  }
};





const changeOwnerStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_user SET status=? WHERE user_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Approve' ? 'Approving' : 'Disapproving'} Owner ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };




  
const deleteOwner = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  
      
      const [[userDetails]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [id]);
  
      if(userDetails.email == 'kilvishbirla@gmail.com' || userDetails.email == 'andhera@gmail.com' ){
  
        return res.status(200).json({ success: false, msg: "Can't Delete: This Owner ( Under Testing purpose )"});
      }
  
  
        // const deleteSql = `DELETE FROM tbl_user WHERE user_id = ?`;
        // await con.query(deleteSql, [id]);

        const softDeleteSql = `UPDATE tbl_user SET deleted = 'Yes' WHERE user_id = ?`;
        await con.query(softDeleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Owner deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };


  


  //============================= END owner Section =======================================












const addownerAmount = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  var user_id = req.cookies.rental_user_id || '';
  const userTimezone = req.cookies.rental_time_zone || '';

  try {
      await con.beginTransaction();

      // console.log("Timezone for wallet ",userTimezone )
        

      const selectownerSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
      const [[owner]] = await con.query(selectownerSql, [user_id]);    


      const selectownerTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
      const [transactions] = await con.query(selectownerTransactionSql, [user_id,'Owner']); 

     await con.commit(); 

     res.render('superadmin/addownerAmount',{output:'',owner:owner , transactions})
     
  } catch (error) {
     console.error('Error:',error);
     await con.rollback();
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}




const addownerAmountPost = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  // console.log(req.body)

  const { new_credit_amount , user_id } = req.body
  const userTimezone = req.cookies.rental_time_zone || '';

  // console.log("Timezone for wallet ",userTimezone )

  try {
      await con.beginTransaction();


       //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    // console.log("currentDateTime ->> " , currentDateTime)  
    // console.log("date ->> " , kildate)  
    // console.log("time ->> " , kiltime)
    //=================  Timzezone according to Client Location =========================

    const selectownerTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
 

      const selectownerSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
      const [[ownerDetails]] = await con.query(selectownerSql, [user_id]);   

      if(ownerDetails.status == 'Disapprove'){
        const [transactions] = await con.query(selectownerTransactionSql, [user_id,'Owner']);   
       // res.render('superadmin/addownerAmount',{output:"Can't credit to Disapproved Owner",owner:ownerDetails , transactions})
        res.cookie('rental_msg', "Can't credit to Disapproved Owner");
        res.redirect('/superadmin/addownerAmount')
      }


     var updated_wallet_amount = parseFloat(new_credit_amount)+ parseFloat(ownerDetails.owner_wallet)   
     
      const updateQuery = `UPDATE tbl_user SET owner_wallet = ? WHERE user_id = ?`;   
      const queryValues = [updated_wallet_amount,user_id];
        // Execute the query
        await con.query(updateQuery, queryValues);


        

          // Create transaction number with timestamp and "Admin-" prefix
      const transactionNumber = `Admin-${Date.now()}`; // Generates something like "Admin-163656789..."

      // Insert transaction into `tbl_transactions`
      const insertTransactionSql = `
          INSERT INTO tbl_transactions 
          (transaction_number, wallet_type, transaction_type, deposit_amount, transaction_amount, current_wallet_amount, transaction_mode, user_id ,created_at)
          VALUES (?, 'Owner', 'Deposite', ?, ?, ?, 'Admin', ?,?)`;

      const insertTransactionValues = [
          transactionNumber,
          new_credit_amount,                // deposit amount
          new_credit_amount,                // transaction amount
          updated_wallet_amount,            // updated wallet amount
          user_id,
          currentDateTime
      ];

      await con.query(insertTransactionSql, insertTransactionValues);
     


    
        const [[owner]] = await con.query(selectownerSql, [user_id]);   

      
        const [transactions] = await con.query(selectownerTransactionSql, [user_id,'Owner']);     

     await con.commit(); 
    const output = `Amount- ( ${parseFloat(new_credit_amount).toFixed(2)} ${req.currency} ) has been credited to ${owner.first_name} ${owner.last_name}'s Wallet successfully !`
    // res.render('superadmin/addownerAmount',{output:output,owner:owner , transactions})
     res.cookie('rental_msg', output);
     res.redirect('/superadmin/addownerAmount') 
  } catch (error) {
    await con.rollback();
     console.error('Error:',error);
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}



const senddocNotificationOwner = async (req, res, next) => {
  const con = await connection();
  const { userId, expiredDocs, sendEmail, sendInApp, userTimezone } = req.body;

  // console.log(req.body)

  try {
      await con.beginTransaction();



    //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    // console.log("currentDateTime ->> " , currentDateTime)  
    // console.log("date ->> " , kildate)  
    // console.log("time ->> " , kiltime)
    //=================  Timzezone according to Client Location =========================


      const [user] = await con.query("SELECT * FROM tbl_user WHERE user_id = ? AND user_type='Owner' ", [userId]);
      const userInfo = user[0];

      let attachments = [];
      let expiredMessage = [];

       // Attach user document if it has expired or is expiring within 30 days
       if (expiredDocs.includes('Owner Document (Expiring in next 30 days)') || expiredDocs.includes('Owner Document (Already Expired)')) {
        if (userInfo.user_document_images) {
            const docPaths = userInfo.user_document_images.split(',');
            docPaths.forEach((doc) => {
                attachments.push({
                    filename: path.basename(doc),
                    path: path.join(__dirname, '../public/images/docUploads', doc)
                });
            });
        }
        expiredMessage.push(`Owner Document ${expiredDocs.includes('Owner Document (Already Expired)') ? '(Expired)' : '(Expiring in next 30 days)'}`);
    }


      // Construct the message
      const message = expiredMessage.length > 0 
          ? expiredMessage.join('<br>') 
          : 'No documents have expired.';

      // If email notification is selected, send Email notification
      if (sendEmail) {
        // console.log("email app notification ")
          await senddocNotificationUser([userInfo.email], message, 'Document Expiry Notification', attachments);
      }

      // If in-app notification is selected, insert into tbl_notification_list
      if (sendInApp) {
        // console.log("in app notification ")
          const notificationMessage = `Document expiry notification: ${message}`;
          await con.query(
              'INSERT INTO tbl_notification_list (notification_type, user_id, user_type, title, message, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
              ['Document_Expiry', userId, userInfo.user_type, 'Your Document is being Expired', notificationMessage, kildate, kiltime  ]
          );
      }

      await con.commit();
      res.status(200).send({ message: 'Notification sent successfully.' });

  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send({ message: `Failed to send notification. ${error.message}` });
  }
};









const Owner_withdrawal_report = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('superadmin/Owner_withdrawal_report',{output:''})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}





const Owner_document_management = async(req,res,next) => {
  const con = await connection();

  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

     // const [owners] = await con.query("SELECT * FROM tbl_user where user_type='Owner' ORDER BY user_id DESC");
      const [owners] = await con.query("SELECT * FROM tbl_user ORDER BY user_id DESC");


    const currentDate = moment();
    owners.forEach(owner => {
        const userDocExpiry = moment(owner.owner_doc_expiry_date);
      

        // Calculate days until expiration
        owner.daysUntilDocExpiry = userDocExpiry.diff(currentDate, 'days');
       
    });



     await con.commit();    
     res.render('superadmin/Owner_document_management',{output:output,owners})

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}






const deposit_to_Owner = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const withdrawal_to_Owner = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}





//=========================  Owner Section End ==========================================



//=========================  Reports Section Start ==========================================


const pending_bookings  = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
  try {
     await con.beginTransaction();
     const [pendingBookings] = await con.query(`SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id
        WHERE b.booking_status IN ('Pending') ORDER BY b.booking_id DESC`);
     await con.commit();    
     res.render('superadmin/pending_bookings',
      {output:output,
      pendingBookings,
      start_date:currentDateTime, // Pass the start date back
      end_date: currentDateTime,     // Pass the end date back
      dateType: 'creationDate'      // Pass the selected date type back
     })
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

const post_pending_bookings = async (req, res, next) => {
  const con = await connection();
  // console.log("Filtering report", req.body);
  const output = req.cookies.kwl_msg || '';
  const { start_date, end_date, dateType } = req.body; // Include dateType in the request body

  // console.log("Filter data ->", req.body);

  try {
    await con.beginTransaction();
    // Build the dynamic query based on filters
    let query = `SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id WHERE 1=1`;
    const queryParams = [];

    // Check if startDate and endDate are provided
    if (start_date && end_date) {
      const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
      const formattedEndDate = moment(end_date).format('YYYY-MM-DD');

      // Determine which column to use based on the selected date type
      if (dateType === 'creationDate') {
        query += ` AND DATE(created_at) BETWEEN ? AND ?`;
      } else if (dateType === 'bookingDate') {
        query += ` AND (end_date >= ?) AND (start_date <= ?)`;
      }
      queryParams.push(formattedStartDate, formattedEndDate);
    }
    query += ` AND booking_status = 'Pending'`;
    query += ` ORDER BY b.booking_id DESC`;

    // console.log("Query to execute:", query);
    // console.log("Query Parameters:", queryParams);

    const [rows] = await con.execute(query, queryParams);

    const pendingBookings = rows.map((booking) => {
      return booking;
    });

    // console.log("pendingBookings ", pendingBookings);

    // console.log("normal render")
    await con.commit();
    res.render('superadmin/pending_bookings', {
      output: output,
      pendingBookings: pendingBookings,
      start_date: req.body.start_date, // Pass the start date back
      end_date: req.body.end_date,     // Pass the end date back
      dateType: req.body.dateType      // Pass the selected date type back
    });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    if (con) {
      con.release();
    }
  }
};

const confirmed_bookings  = async(req,res,next) => {
  const con = await connection();
  const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      const [confirmedBookings] = await con.query(`SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id
        WHERE b.booking_status IN ('Confirmed') ORDER BY b.booking_id DESC`);
     
        await con.commit();    
        res.render('superadmin/confirmed_bookings',{output:output,confirmedBookings, start_date:currentDateTime, end_date: currentDateTime, dateType: 'creationDate' })

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

const post_confirm_bookings = async (req, res, next) => {
  const con = await connection();
  // console.log("Filtering report", req.body);
  const output = req.cookies.kwl_msg || '';
  const { start_date, end_date, dateType } = req.body; // Include dateType in the request body

  // console.log("Filter data ->", req.body);

  try {
    await con.beginTransaction();
    // Build the dynamic query based on filters
    let query = `SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id WHERE 1=1`;
    const queryParams = [];

    // Check if startDate and endDate are provided
    if (start_date && end_date) {
      const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
      const formattedEndDate = moment(end_date).format('YYYY-MM-DD');

      // Determine which column to use based on the selected date type
      if (dateType === 'creationDate') {
        query += ` AND DATE(created_at) BETWEEN ? AND ?`;
      } else if (dateType === 'bookingDate') {
        query += ` AND (end_date >= ?) AND (start_date <= ?)`;
      }
      queryParams.push(formattedStartDate, formattedEndDate);
    }
    query += ` AND booking_status = 'Confirmed'`;
    query += ` ORDER BY b.booking_id DESC`;

    // console.log("Query to execute:", query);
    // console.log("Query Parameters:", queryParams);

    const [rows] = await con.execute(query, queryParams);

    const confirmedBookings = rows.map((booking) => {
      return booking;
    });

    // console.log("confirmedBookings ", confirmedBookings);

    // console.log("normal render")
    await con.commit();
    res.render('superadmin/confirmed_bookings', {
      output: output,
      confirmedBookings: confirmedBookings,
      start_date: req.body.start_date, // Pass the start date back
      end_date: req.body.end_date,     // Pass the end date back
      dateType: req.body.dateType      // Pass the selected date type back
    });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    if (con) {
      con.release();
    }
  }
};

const ongoing_bookings  = async(req,res,next) => {
  const con = await connection();
  const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      const [ongoingBookings] = await con.query(`SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id
        WHERE b.booking_status IN ('On_Going','UserCheck_In','UserCheck_Out','OwnerCheck_In','OwnerCheck_Out')
        ORDER BY b.booking_id DESC`);

     await con.commit();    
     res.render('superadmin/ongoing_bookings',{output:output,ongoingBookings, start_date:currentDateTime, end_date: currentDateTime, dateType: 'creationDate'})

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

const post_ongoing_bookings = async (req, res, next) => {
  const con = await connection();
  // console.log("Filtering report", req.body);
  const output = req.cookies.kwl_msg || '';
  const { start_date, end_date, dateType } = req.body; // Include dateType in the request body

  // console.log("Filter data ->", req.body);

  try {
    await con.beginTransaction();
    // Build the dynamic query based on filters
    let query = `SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id WHERE 1=1`;
    const queryParams = [];

    // Check if startDate and endDate are provided
    if (start_date && end_date) {
      const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
      const formattedEndDate = moment(end_date).format('YYYY-MM-DD');

      // Determine which column to use based on the selected date type
      if (dateType === 'creationDate') {
        query += ` AND DATE(created_at) BETWEEN ? AND ?`;
      } else if (dateType === 'bookingDate') {
        query += ` AND (end_date >= ?) AND (start_date <= ?)`;
      }
      queryParams.push(formattedStartDate, formattedEndDate);
    }
    query += ` AND booking_status IN ('On_Going','UserCheck_In','UserCheck_Out','OwnerCheck_In','OwnerCheck_Out')`;
    query += ` ORDER BY b.booking_id DESC`;
    // console.log("Query to execute:", query);
    // console.log("Query Parameters:", queryParams);

    const [rows] = await con.execute(query, queryParams);

    const ongoingBookings = rows.map((booking) => {
      return booking;
    });

    // console.log("ongoingBookings ", ongoingBookings);

    // console.log("normal render")
    await con.commit();
    res.render('superadmin/ongoing_bookings', {
      output: output,
      ongoingBookings: ongoingBookings,
      start_date: req.body.start_date, // Pass the start date back
      end_date: req.body.end_date,     // Pass the end date back
      dateType: req.body.dateType      // Pass the selected date type back
    });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    if (con) {
      con.release();
    }
  }
};

const completed_bookings  = async(req,res,next) => {
  const con = await connection();
  const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      const [completedBookings] = await con.query(`SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id
        WHERE b.booking_status IN ('Completed') ORDER BY b.booking_id DESC`);

     await con.commit();    
     res.render('superadmin/completed_bookings',{output:output,completedBookings, start_date:currentDateTime, end_date: currentDateTime, dateType: 'creationDate'})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

const post_complete_bookings = async (req, res, next) => {
  const con = await connection();
  // console.log("Filtering report", req.body);
  const output = req.cookies.kwl_msg || '';
  const { start_date, end_date, dateType } = req.body; // Include dateType in the request body

  // console.log("Filter data ->", req.body);

  try {
    await con.beginTransaction();
    // Build the dynamic query based on filters
    let query =`SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id WHERE 1=1`;
    const queryParams = [];

    // Check if startDate and endDate are provided
    if (start_date && end_date) {
      const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
      const formattedEndDate = moment(end_date).format('YYYY-MM-DD');

      // Determine which column to use based on the selected date type
      if (dateType === 'creationDate') {
        query += ` AND DATE(created_at) BETWEEN ? AND ?`;
      } else if (dateType === 'bookingDate') {
        query += ` AND (end_date >= ?) AND (start_date <= ?)`;
      }
      queryParams.push(formattedStartDate, formattedEndDate);
    }
    query += ` AND booking_status = 'Completed'`;
    
    query += ` ORDER BY b.booking_id DESC`;

    // console.log("Query to execute:", query);
    // console.log("Query Parameters:", queryParams);

    const [rows] = await con.execute(query, queryParams);

    const completedBookings = rows.map((booking) => {
      return booking;
    });

    // console.log("completedBookings ", completedBookings);

    // console.log("normal render")
    await con.commit();
    res.render('superadmin/completed_bookings', {
      output: output,
      completedBookings: completedBookings,
      start_date: req.body.start_date, // Pass the start date back
      end_date: req.body.end_date,     // Pass the end date back
      dateType: req.body.dateType      // Pass the selected date type back
    });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    if (con) {
      con.release();
    }
  }
};

const cancelled_bookings  = async(req,res,next) => {
  const con = await connection();
  const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();
      const [cancelledBookings] = await con.query(`SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id
        WHERE b.booking_status IN ('Cancelled') ORDER BY b.booking_id DESC`);
     await con.commit();    
     res.render('superadmin/cancelled_bookings',{output:output,cancelledBookings, start_date:currentDateTime, end_date: currentDateTime, dateType: 'creationDate'})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

const post_cancel_bookings = async (req, res, next) => {
  const con = await connection();
  // console.log("Filtering report", req.body);
  const output = req.cookies.kwl_msg || '';
  const { start_date, end_date, dateType } = req.body; // Include dateType in the request body

  // console.log("Filter data ->", req.body);

  try {
    await con.beginTransaction();
    // Build the dynamic query based on filters
    let query = `SELECT b.*,
        u.first_name AS user_first_name, u.last_name AS user_last_name,  
        o.first_name AS owner_first_name, o.last_name AS owner_last_name, 
        v.vehicle_images AS vehicle_images, v.vehicle_model, v.vehicle_make, v.vehicle_name, 
        v.vehicle_insurance_images, v.mot_certificate_images
        FROM tbl_bookings b
        LEFT JOIN tbl_vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN tbl_user u ON b.user_id = u.user_id
        LEFT JOIN tbl_user o ON b.owner_id = o.user_id WHERE 1=1`;
    const queryParams = [];

    // Check if startDate and endDate are provided
    if (start_date && end_date) {
      const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
      const formattedEndDate = moment(end_date).format('YYYY-MM-DD');

      // Determine which column to use based on the selected date type
      if (dateType === 'creationDate') {
        query += ` AND DATE(created_at) BETWEEN ? AND ?`;
      } else if (dateType === 'bookingDate') {
        query += ` AND (end_date >= ?) AND (start_date <= ?)`;
      }
      queryParams.push(formattedStartDate, formattedEndDate);
    }
    query += ` AND booking_status = 'Cancelled'`;
    query += ` ORDER BY b.booking_id DESC`;

    // console.log("Query to execute:", query);
    // console.log("Query Parameters:", queryParams);

    const [rows] = await con.execute(query, queryParams);

    const cancelledBookings = rows.map((booking) => {
      return booking;
    });

    // console.log("cancelledBookings ", cancelledBookings);

    // console.log("normal render")
    await con.commit();
    res.render('superadmin/cancelled_bookings', {
      output: output,
      cancelledBookings: cancelledBookings,
      start_date: req.body.start_date, // Pass the start date back
      end_date: req.body.end_date,     // Pass the end date back
      dateType: req.body.dateType      // Pass the selected date type back
    });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    if (con) {
      con.release();
    }
  }
};

const cancelBookingStatus  = async(req,res,next) => {
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0];  // Format the date properly
  const con = await connection();
  const cancel_reason ="Cancelled by admin"
  const { id } = req.body;
  // console.log(req.body);
  try {
      await con.beginTransaction();
       // Fetch user details
      const [[existingbooking]] = await con.query('SELECT * FROM tbl_bookings WHERE booking_id = ?', [id]);
      const owner_id = existingbooking.owner_id;
      const user_id = existingbooking.user_id;
       
      const softDeleteSql = `UPDATE tbl_bookings SET booking_status = ?, cancel_by = ?, cancel_reason = ? WHERE booking_id = ?`;
      await con.query(softDeleteSql,['Cancelled', 'Admin', cancel_reason, id]);

      const title1 = "Booking Cancelled!"
      const body1 = `The Admin has cancelled booking for your car. The booking is now closed.`
     
      const title2 = "Booking Cancelled!"
      const body2 = `The Admin has cancelled booking for your car. The booking is now closed.`

      const sql_notify1 = `INSERT INTO tbl_notification_list ( notification_type, booking_id, user_id,user_type, title, message,   date,  time) VALUES ('Booking', ?, ?, ?, ?, ?, ?, ?),('Booking', ?, ?, ?, ?, ?, ?, ?) `;
  
      await con.query(sql_notify1, [
        id, user_id, 'User', title1, body1, date, time, // User notification
        id, owner_id, 'Owner', title2, body2, date, time // Owner notification
      ]);

      await sendPushNotifications([
        { user_id: user_id, title: title1, body: body1 },
        { user_id: owner_id, title: title2, body: body2 },
      ]);

      await con.commit(); 
      res.json({ success: true, msg: 'Booking cancelled successfully !!' });
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}

//=========================  Reports Section End ==========================================





//=================================== Start Make Models Section ===========================================

const vehicleCategory  = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('superadmin/vehicleCategory',{output:output})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const vehicleCategoryPost  = async(req,res,next) => {
  const con = await connection();
  const { make_name } = req.body;
  const make_image = req.file ? req.file.filename : null;
  try {
      await con.beginTransaction();

       // Extract vehicle make name and image filename


       if (!make_name || !make_image) {
           throw new Error("Make name or image is missing");
       }

       // Insert into the database (for now, models will be empty)
       await con.query("INSERT INTO tbl_make_models (make_name, make_image, models_name) VALUES (?, ?, ?)", [make_name, make_image, '[]']);


     await con.commit(); 
     res.cookie('rental_msg', 'Vehicle Make added successfully !!');
     res.redirect('/superadmin/vehicleModel')
     //res.render('superadmin/vehicleCategory',{output:'Vehicle Make added successfully !!'})
     
  } catch (error) {
     console.error('Error:',error);
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}










//------- model section 
const vehicleModel  = async(req,res,next) => {
  const con = await connection();

  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      const [makes] = await con.query("SELECT id, make_name, models_name, make_image, status FROM tbl_make_models where deleted='No' ORDER BY id DESC ");




     await con.commit(); 
     res.render('superadmin/vehicleModel',{output:output,makes})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const vehicleModelPostworking = async (req, res, next) => {
  const con = await connection();
  const { vehical_make, model_name, models } = req.body;

  // console.log(req.body)

  try {
      await con.beginTransaction(); 

     

      if (!vehical_make || !model_name) {
          throw new Error('Make and Model are required');
      }

      // Fetch the current models for the selected make
      const [make] = await con.query("SELECT models_name FROM tbl_make_models WHERE id = ?", [vehical_make]);

      let models = make[0].models_name ? JSON.parse(make[0].models_name) : [];

      // Add the new model to the models array
      models.push(model_name);

      // Update the database with the new model list
      await con.query("UPDATE tbl_make_models SET models_name = ? WHERE id = ?", [JSON.stringify(models), vehical_make]);

      const [makes] = await con.query("SELECT id, make_name, models_name, make_image, status FROM tbl_make_models");

      await con.commit();
      res.render('superadmin/vehicleModel', { output: 'Model added successfully !!',makes });
  } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
};



const vehicleModelPost = async (req, res, next) => {
  const con = await connection();
  const { vehical_make, models } = req.body; // Extract models as an array

  try {
      await con.beginTransaction(); 

      if (!vehical_make || !models || models.length === 0) {
          throw new Error('Make and at least one Model are required');
      }

      // Fetch the current models for the selected make
      const [make] = await con.query("SELECT models_name FROM tbl_make_models WHERE id = ?", [vehical_make]);

      // Parse the existing models JSON, or start with an empty array
      let existingModels = make[0].models_name ? JSON.parse(make[0].models_name) : [];

      // Remove spaces from new models
      const cleanedModels = models.map(model => model.trim());

      // Find models that already exist in the current list
      const duplicateModels = cleanedModels.filter(model => existingModels.includes(model));

      if (duplicateModels.length > 0) {
        const [makes] = await con.query("SELECT id, make_name, models_name, make_image, status FROM tbl_make_models where deleted='No' ORDER BY id DESC");
          // If duplicates are found, return an error message with the existing model names
          res.render('superadmin/vehicleModel', { output: `${duplicateModels.join(', ')}- Model already exist !!`, makes: makes });
          return;
      }

      // If no duplicates, proceed to add new models to the existing array
      existingModels.push(...cleanedModels);

      // Update the database with the new model list
      await con.query("UPDATE tbl_make_models SET models_name = ? WHERE id = ?", [JSON.stringify(existingModels), vehical_make]);

      // Fetch the updated list of makes
      const [makes] = await con.query("SELECT id, make_name, models_name, make_image, status FROM tbl_make_models");

      await con.commit();
      //res.render('superadmin/vehicleModel', { output: 'Models added successfully !!', makes });
      res.cookie('rental_msg', 'Models added successfully !!');
      res.redirect('/superadmin/vehicleModel')
  } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
};



const updateModels  = async(req,res,next) => {

  // console.log("update Models --> ", req.body)
  const con = await connection();

  const { models , id} = req.body;
  try {
    await con.beginTransaction();

    // Update the models_name in the database
    await con.query("UPDATE tbl_make_models SET models_name = ? WHERE id = ?", [JSON.stringify(models), id]);

    await con.commit();
    res.status(200).send({ message: 'Models updated successfully' });
     
  } catch (error) {
    console.error('Error:', error);
    await con.rollback();
    res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const deleteMake = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  
      
      const [[makeDetails]] = await con.query('SELECT * FROM tbl_make_models WHERE id = ?', [id]);
  
      // if(userDetails.email == 'kilvishbirla@gmail.com'){
  
      //   return res.status(200).json({ success: false, msg: "Can't Delete: This User ( Under Testing purpose )"});
      // }


      const softDeleteSql = `UPDATE tbl_make_models SET deleted='Yes' WHERE id = ?`;
      await con.query(softDeleteSql, [id]);
  
  
        // const deleteSql = `DELETE FROM tbl_make_models WHERE id = ?`;
        // await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Make deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };


  const changeMakeStatus = async (req, res, next) => {  
    const con = await connection();
    
    const { id, status } = req.body;
    
    try {
        await con.beginTransaction();
    
    
          // Update the status in the database
          const updateSql = `UPDATE tbl_make_models SET status=? WHERE id=?`;
          await con.query(updateSql, [status, id]);
    
          await con.commit();
    
          res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} Make ` });
    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    
        // Handle error, render error message, or redirect to appropriate page
    } finally {
        con.release();
    }
    };
    
  



    const checkModelworkingforSingle = async (req, res, next) => {
      const con = await connection();
      const { model, makeId } = req.body; // Assuming you are also passing the makeId
    
      try {
        await con.beginTransaction();
    
        // Check if the model already exists
        const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_make_models WHERE JSON_CONTAINS(models_name, ?)', [JSON.stringify(model)]);
    
        const modelExists = result[0].count > 0; // Check if the count is greater than 0
    
        if (modelExists) {
          res.json({ exists: modelExists }); // Return whether the user exists or not
    
        } else{
          res.json({ exists: false }); // Return whether the user exists or not
        }      
    
       

      } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
      } finally {
        con.release();
      }
    };


    const checkModel = async (req, res, next) => {
      // console.log(req.body)
      const con = await connection();
      const { models, makeId } = req.body; // Receive models as an array
    
      try {
        await con.beginTransaction();
    
        let existingModels = [];
    
        // Iterate over each model and check if it exists in the database
        for (const model of models) {

          if(makeId>0){
            var [result] = await con.query(
              'SELECT COUNT(*) AS count FROM tbl_make_models WHERE JSON_CONTAINS(models_name, ?) AND id = ?', 
              [JSON.stringify(model), makeId]
            );

          }else{
         var [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_make_models WHERE JSON_CONTAINS(models_name, ?)', [JSON.stringify(model)]);

          }
        
       
    
          if (result[0].count > 0) {
            existingModels.push(model); // If model exists, add it to the list of existing models
          }
        }
    
        res.json({ existingModels }); // Return the list of existing models
    
        await con.commit();
      } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
      } finally {
        con.release();
      }
    };
    
    

    
    

    const checkMake = async (req, res, next) => { 

   
      const con = await connection();
      const { make } = req.body;
    
      try {
        await con.beginTransaction();
    
        const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_make_models WHERE make_name = ?', [make]);
          
        const makeExists = result[0].count > 0; // Check if the count is greater than 0
        await con.commit();
        res.json({ exists: makeExists }); // Return whether the user exists or not
    
    
       
      } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
      } finally {
        con.release();
      }
    };



    
    

//=================================== END Make Models Section ===========================================








//=================================== Start vehicle Type  Section ===========================================


const vehicleTypes  = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();
      const output= req.cookies.rental_msg || '';

    // const [types] = await con.query("SELECT * FROM tbl_vehicle_types WHERE status = 'Active' ORDER BY type_id DESC");

    const [types] = await con.query("SELECT * FROM tbl_vehicle_types ORDER BY type_id DESC");

     await con.commit(); 
     res.render('superadmin/vehicleTypes',{output:output,types:types})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const checkType = async (req, res, next) => { 

  // console.log(req.body)
   
  const con = await connection();
  const { type_name } = req.body;

  try {
    await con.beginTransaction();

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_vehicle_types WHERE type_name = ?', [type_name]);
      
    const isExists = result[0].count > 0; // Check if the count is greater than 0
    await con.commit();
    res.json({ exists: isExists }); // Return whether the user exists or not


   
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};







const vehicleTypesPost  = async(req,res,next) => {
  const con = await connection();
const {type_name, type_insurance_price , type_security_deposits} = req.body;
  const type_image = req.file ? req.file.filename : null;
  try {
      await con.beginTransaction();
      var output= req.cookies.rental_msg || '';

  

    
    if (!type_name || !type_insurance_price   || !type_security_deposits ) {
      throw new Error("Incomplete Parameters in Request Body ");
  }
  

  // Insert into the database (for now, models will be empty)
  await con.query("INSERT INTO tbl_vehicle_types (type_name, type_image, type_insurance_price,type_security_deposits ) VALUES (?, ?, ?, ?)", [type_name, type_image, type_insurance_price,type_security_deposits]);
  // const [types] = await con.query("SELECT * FROM tbl_vehicle_types WHERE status = 'Active' ORDER BY type_id DESC");

  
  const [types] = await con.query("SELECT * FROM tbl_vehicle_types ORDER BY type_id DESC");

     await con.commit(); 

     output = "Vehicle Type Added successfully !"
    // res.render('superadmin/vehicleTypes',{output:output,types:types})
     res.cookie('rental_msg', output);
     res.redirect('/superadmin/vehicleTypes')
     
  } catch (error) {
     console.error('Error:',error);
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}







const UpdatevehicleTypes = async (req, res, next) => {
  const con = await connection();
  
  // Extract form data
  const { type_id,type_name, type_insurance_price, type_security_deposits } = req.body;
  
  // Handle uploaded image (if any)
  const type_image = req.file ? req.file.filename : null;  // Multer attaches 'file' if image is uploaded



  try {
    await con.beginTransaction();

    // Prepare the SQL query to update the vehicle type
    let updateQuery = `
      UPDATE tbl_vehicle_types 
      SET type_name = ?, type_insurance_price = ?, type_security_deposits = ?
    `;
    
    const queryValues = [type_name, type_insurance_price, type_security_deposits];

    // Only update the image if a new one is provided
    if (type_image) {
      updateQuery += `, type_image = ?`;
      queryValues.push(type_image);
    }

    updateQuery += ` WHERE type_id = ?`;
    queryValues.push(type_id); 

    // Execute the query
    await con.query(updateQuery, queryValues);

    await con.commit(); // Commit the transaction

    // // Set success message in response
    // res.status(200).send({ message: 'Vehicle type updated successfully!' });

    res.cookie('rental_msg', 'Vehicle type updated successfully!');
    res.redirect('/superadmin/vehicleTypes')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release(); // Release the database connection
  }
};




const changeTypeStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_vehicle_types SET status=? WHERE type_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} Type ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };
  



  //------- delete type 
  

const deleteVehicleType = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  
      
      const [[typeDetails]] = await con.query('SELECT * FROM tbl_vehicle_types WHERE type_id = ?', [id]);
  
      if(typeDetails.type_name == 'Electronic' || typeDetails.type_name == 'Sonet' ){
  
        return res.status(200).json({ success: false, msg: "Can't Delete: This Type ( Under Testing purpose )"});
      }
  
  
        const deleteSql = `DELETE FROM tbl_vehicle_types WHERE type_id = ?`;
        await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Type deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };




//=================================== END Vehicle TYpe Section -------------------------------------------------

const vehicleFeatures  = async(req,res,next) => {
  const con = await connection();

  try {
    var output= req.cookies.rental_msg || '';
      await con.beginTransaction();

      const [features] = await con.query("SELECT * FROM tbl_vehicle_features ORDER BY feature_id DESC");

     await con.commit(); 
     res.render('superadmin/vehicleFeatures',{output:output, features:features})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }

}


const checkFeature = async (req, res, next) => { 

  // console.log(req.body)
   
  const con = await connection();
  const { feature_name } = req.body;

  try {
    await con.beginTransaction();

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_vehicle_features WHERE feature_name = ?', [feature_name]);
      
    const isExists = result[0].count > 0; // Check if the count is greater than 0
    await con.commit();
    res.json({ exists: isExists }); // Return whether the user exists or not


   
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};




const vehicleFeaturesPost  = async(req,res,next) => {
  const con = await connection();
const {feature_name} = req.body;
  const feature_image = req.file ? req.file.filename : null;
  try {
      await con.beginTransaction();
      var output= req.cookies.rental_msg || '';

  

    
    if (!feature_name || !feature_image  ) {
      throw new Error("Incomplete Parameters in Request Body ");
  }

  // Insert into the database (for now, models will be empty)
  await con.query("INSERT INTO tbl_vehicle_features (feature_name, feature_image ) VALUES (?, ?)", [ feature_name, feature_image ]);

  const [features] = await con.query("SELECT * FROM tbl_vehicle_features ORDER BY feature_id DESC");
     await con.commit(); 
     output = "Vehicle Features Added successfully !"
   //  res.render('superadmin/vehicleFeatures',{output:output,features:features})
     res.cookie('rental_msg',output);
     res.redirect('/superadmin/vehicleFeatures')

     
  } catch (error) {
     console.error('Error:',error);
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}







const UpdateFeature = async (req, res, next) => {
  const con = await connection();
  
  // Extract form data
  const { feature_id ,feature_name } = req.body;
  
  // Handle uploaded image (if any)
  const feature_image = req.file ? req.file.filename : null;  // Multer attaches 'file' if image is uploaded



  try {
    await con.beginTransaction();

    // Prepare the SQL query to update the vehicle type
    let updateQuery = `
      UPDATE tbl_vehicle_features 
      SET feature_name = ?
    `;
    
    const queryValues = [feature_name];

    // console.log("feature_imagefeature_image", feature_image)

    // Only update the image if a new one is provided
    if (feature_image) {
      updateQuery += `, feature_image = ?`;
      queryValues.push(feature_image);
    }

    updateQuery += ` WHERE feature_id = ?`;
    queryValues.push(feature_id); 

    // Execute the query
    await con.query(updateQuery, queryValues);

    await con.commit(); // Commit the transaction

    // // Set success message in response
    // res.status(200).send({ message: 'Vehicle type updated successfully!' });

    res.cookie('rental_msg', 'Feature type updated successfully!');
    res.redirect('/superadmin/vehicleFeatures')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release(); // Release the database connection
  }
};




const changeFeatureStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_vehicle_features SET status=? WHERE feature_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} Feature ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };
  



  //------- delete type 
  

const deleteFeature = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  
      
      const [[fDetails]] = await con.query('SELECT * FROM tbl_vehicle_features WHERE feature_id = ?', [id]);
  
      if(fDetails.feature_name == 'Bluetooth' || fDetails.feature_name == 'Location' ){
  
        return res.status(200).json({ success: false, msg: "Can't Delete: This Feature ( Under Testing purpose )"});
      }
  
  
        const deleteSql = `DELETE FROM tbl_vehicle_features WHERE feature_id = ?`;
        await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Feature deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };




  //============================= End Vehicle Features ==================================




  //====================== Main Vehicles   Start ====================================

const viewVehicles  = async(req,res,next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      const [vehicles] = await con.query("SELECT * FROM tbl_vehicles where deleted='No' ORDER BY vehicle_id DESC");

     


     await con.commit(); 
     res.render('superadmin/viewVehicles',{output:output , vehicles:vehicles})
     
  } catch (error) {
     console.error('Error:',error);
     res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}



const changeVehicleStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_vehicles SET status=? WHERE vehicle_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} Vehicle ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };
  



  //------- delete Plan 
 

const deleteVehicle = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  

      const softDeleteSql = `UPDATE tbl_vehicles SET deleted = 'Yes' WHERE vehicle_id = ?`;
      await con.query(softDeleteSql, [id]);
  
  
        // const deleteSql = `DELETE FROM tbl_vehicles WHERE vehicle_id = ?`;
        // await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Vehicle deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };







//============================== Start Promotions Plans Section ===================================

const promotional_plans  = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();
      const output= req.cookies.rental_msg || '';
      

      const [plans] = await con.query("SELECT * FROM tbl_promotional_plans where deleted='No' ORDER BY plan_id DESC");

     await con.commit(); 
     res.render('superadmin/promotional_plans',{output:output,plans:plans})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const promotional_plansPost = async (req, res, next) => {
  const con = await connection();
  // console.log(req.body);
  try {
    await con.beginTransaction();
    const { plan_name, plan_days, plan_price } = req.body; // Extract data from the request body

    // Insert new promotional plan into the table
    await con.query(
      "INSERT INTO tbl_promotional_plans (plan_name, plan_days, plan_price, deleted) VALUES (?, ?, ?, 'No')",
      [plan_name, plan_days, plan_price]
    );

    // Fetch all active promotional plans after insertion
    const [plans] = await con.query("SELECT * FROM tbl_promotional_plans WHERE deleted='No' ORDER BY plan_id DESC");

    await con.commit();
    const output = 'Plan Details Added successfully !'
   // res.render('superadmin/promotional_plans', { output: output, plans: plans });
    res.cookie('rental_msg',output);
    res.redirect('/superadmin/promotional_plans')
  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); // Rollback the transaction in case of error
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};






const changePlanStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_promotional_plans SET status=? WHERE plan_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} Plan ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };
  



  //------- delete Plan 
 

const deletePlan = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  

      const softDeleteSql = `UPDATE tbl_promotional_plans SET deleted = 'Yes' WHERE plan_id = ?`;
      await con.query(softDeleteSql, [id]);
  
  
        // const deleteSql = `DELETE FROM tbl_promotional_plans WHERE plan_id = ?`;
        // await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Plan deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };




//======================== Promotions Plans  End ===============================================




//============================== Discount &Coupan Section Start ===================================

const discount_coupons = async (req, res, next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
    await con.beginTransaction();

    // Fetch all active promotional plans after insertion
    const [coupons] = await con.query("SELECT * FROM tbl_coupons WHERE deleted='No' ORDER BY coupon_id DESC");

    await con.commit();

    res.render('superadmin/discount_coupons', { output: output, coupons: coupons });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); // Rollback the transaction in case of error
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



const discount_couponsPost = async (req, res, next) => {
  const con = await connection();
  // console.log(req.body);
  try {
    await con.beginTransaction();
    const {coupon_title, coupon_code , coupon_max_amount, discount_rate,start_date ,end_date,use_limit } = req.body; // Extract data from the request body

    // Insert new promotional plan into the table
    await con.query(
      "INSERT INTO tbl_coupons (coupon_title, coupon_code , coupon_max_amount, discount_rate,start_date ,end_date,use_limit) VALUES (?, ?, ?, ? ,?, ?,?)",
      [coupon_title, coupon_code , coupon_max_amount, discount_rate,start_date ,end_date,use_limit]
    );

    // Fetch all active promotional plans after insertion
    const [coupons] = await con.query("SELECT * FROM tbl_coupons WHERE deleted='No' ORDER BY coupon_id DESC");

    await con.commit();
    const output = 'Coupon Details Added successfully !'
    res.render('superadmin/discount_coupons', { output: output, coupons: coupons });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); // Rollback the transaction in case of error
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



const checkCoupanCode = async (req, res, next) => { 

  // console.log(req.body)
   
  const con = await connection();
  const { coupon_code } = req.body;

  try {
    await con.beginTransaction();

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_coupons WHERE coupon_code = ?', [coupon_code]);
      
    const isExists = result[0].count > 0; // Check if the count is greater than 0
    await con.commit();
    res.json({ exists: isExists }); // Return whether the user exists or not


   
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



const changeCouponStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_coupons SET status=? WHERE coupon_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} coupon.. ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };
  



  //------- delete type 
 

const deleteCoupon = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  

      const softDeleteSql = `UPDATE tbl_coupons SET deleted = 'Yes' WHERE coupon_id = ?`;
      await con.query(softDeleteSql, [id]);
  
  
        // const deleteSql = `DELETE FROM tbl_coupons WHERE coupon_id = ?`;
        // await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Coupon deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };







  //======================== Start Subadmin Section =================================



  const addSubadmin = async (req, res, next) => {
    const con = await connection();
    const output = req.cookies.rental_msg || '';

    // console.log("req body", req.body);

    if (req.method === 'POST') {
        const { first_name, last_name, email, username, password, contact, country_code, permissions } = req.body;
        const permissionsString = permissions ? permissions.split(',').join(',') : ''; // Make sure it's a comma-separated string

        var hashedPass = hashPassword(password);

        try {
            await con.beginTransaction();

            // Insert the sub-admin into the tbl_admin table
            const [result] = await con.query(`
                INSERT INTO tbl_admin (first_name, last_name, email, username, password, contact, country_code, admin_type, permissions) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [first_name, last_name, email,username, hashedPass, contact, country_code, 'subadmin', permissionsString]
            );

            await con.commit();
            res.render('superadmin/addSubadmin', { output: 'Subadmin created successfully!' });
        } catch (error) {
            console.error('Error:', error);
            await con.rollback();
            res.render('superadmin/kil500', { output: `${error}` });
        } finally {
            con.release();
        }
    } else {
        res.render('superadmin/addSubadmin', { output });
    }
};





const checksubadminemail = async (req, res, next) => { 

   
  const con = await connection();
  const { email } = req.body;

  try {
    await con.beginTransaction();

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_admin WHERE email = ?', [email]);
      
    const userExists = result[0].count > 0; // Check if the count is greater than 0

    res.json({ exists: userExists }); // Return whether the user exists or not


    await con.commit();
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



const checksubadminusername = async (req, res, next) => { 

   
  const con = await connection();
  const { username } = req.body;

  try {
    await con.beginTransaction();

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_admin WHERE username = ?', [username]);
      
    const userExists = result[0].count > 0; // Check if the count is greater than 0

    // console.log(" username exist -> ",userExists)

    res.json({ exists: userExists }); // Return whether the user exists or not


    await con.commit();
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



const checksubadminphonenumber = async (req, res, next) => { 

 
  const con = await connection();
  const { phoneNumber } = req.body;

  try {
    await con.beginTransaction();    

    const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_admin WHERE contact = ?', [phoneNumber]);
    
    const userExists = result[0].count > 0;

    res.json({ exists: userExists });


    await con.commit();
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};












const viewSubadmins = async(req,res,next) => {
  const con = await connection();

  const output= req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();


      // const [users] = await con.query("SELECT * FROM tbl_admin ORDER BY admin_id DESC");

      const [subadmins] = await con.query("SELECT * FROM tbl_admin where admin_type='subadmin' And deleted='No' ORDER BY admin_id DESC");



     await con.commit();    
     res.render('superadmin/viewSubadmins',{output:output,subadmins})

     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const updateSubadmin = async (req, res, next) => {
  const con = await connection();

  
  // Extract form data
  const { admin_id, first_name,last_name,email,country_code,contact } = req.body;
  
  // Handle uploaded image (if any)
  const image = req.file ? req.file.filename : null;  // Multer attaches 'file' if image is uploaded



  try {
    await con.beginTransaction();

    // Prepare the SQL query to update the vehicle type
    let updateQuery = `
      UPDATE tbl_admin 
      SET first_name = ?, last_name = ?, email = ? , country_code=? ,contact=?
    `;
    
    const queryValues = [first_name,last_name,email,country_code,contact];

    // Only update the image if a new one is provided
    if (image) {
      updateQuery += `, image = ?`;
      queryValues.push(image);
    }

    updateQuery += ` WHERE admin_id = ?`;
    queryValues.push(admin_id); 

    // Execute the query
    await con.query(updateQuery, queryValues);

    await con.commit(); // Commit the transaction

    res.cookie('rental_msg', 'Subadmin updated successfully!');
    res.redirect('/superadmin/viewSubadmins')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release(); // Release the database connection
  }
};





const changeSubadminStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_admin SET status=? WHERE admin_id=?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} Subadmin ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };




  
const deleteSubadmin = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  
      
      const [[userDetails]] = await con.query('SELECT * FROM tbl_admin WHERE admin_id = ?', [id]);
  
      if(userDetails.email == 'subadmin@gmail.com' || userDetails.email == 'andhera@gmail.com' ){
  
        return res.status(200).json({ success: false, msg: "Can't Delete: This Subadmin ( Under Testing purpose )"});
      }
  
  
        // const deleteSql = `DELETE FROM tbl_admin WHERE admin_id = ?`;
        // await con.query(deleteSql, [id]);

        const softDeleteSql = `UPDATE tbl_admin SET deleted = 'Yes' WHERE admin_id = ?`;
        await con.query(softDeleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Subadmin deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };


  








  const loginSubadmin = async (req, res) => {
    const con = await connection();
    const { email, password } = req.body;

    try {
        const [rows] = await con.query('SELECT * FROM subadmins WHERE email = ?', [email]);
        
        if (rows.length > 0) {
            const subadmin = rows[0];

            // Verify password (assuming you have hashed passwords)
            const isMatch = await bcrypt.compare(password, subadmin.password);
            if (isMatch) {
                // Store subadmin info and permissions in session
                req.session.subadminId = subadmin.id;
                req.session.username = subadmin.username;

                // Fetch permissions
                const [permissions] = await con.query('SELECT permission FROM subadmin_permissions WHERE subadmin_id = ?', [subadmin.id]);
                req.session.permissions = permissions.map(p => p.permission);

                return res.redirect('/subadmin/dashboard'); // Redirect to the sub-admin dashboard
            }
        }
        res.render('login', { error: 'Invalid email or password' });
    } catch (error) {
        console.error('Error:', error);
        res.render('login', { error: 'An error occurred during login' });
    } finally {
        con.release();
    }
};
  

  //======================== End Subadmin Section =================================



  //======================  Country Section Start =======================

  

  const addCountry = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [countries] = await con.query(`
        SELECT * FROM tbl_locations 
        WHERE deleted='No' 
        ORDER BY status = 'Active' DESC, location_id DESC
      `);
      
    
      await con.commit();
  
      res.render('superadmin/addCountry', { output: output,countries:countries });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };




  const checkCountry = async (req, res, next) => { 

    // console.log(req.body)
     
    const con = await connection();
    const { country_name } = req.body;
  
    try {
      await con.beginTransaction();
  
      const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_locations WHERE country_name = ?', [country_name]);
        
      const isExists = result[0].count > 0; // Check if the count is greater than 0
      await con.commit();
      res.json({ exists: isExists }); // Return whether the user exists or not
  
  
     
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      con.release();
    }
  };
  


  const checkcountryCode = async (req, res, next) => { 

    // console.log(req.body)
     
    const con = await connection();
    const { country_code } = req.body;
  
    try {
      await con.beginTransaction();
  
      const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_locations WHERE country_code = ?', [country_code]);
        
      const isExists = result[0].count > 0; // Check if the count is greater than 0
      await con.commit();
      res.json({ exists: isExists }); // Return whether the user exists or not
  
  
     
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      con.release();
    }
  };
  


  const checkcurrencyName = async (req, res, next) => { 

    // console.log(req.body)
     
    const con = await connection();
    const { currency_name } = req.body;
  
    try {
      await con.beginTransaction();
  
      const [result] = await con.query('SELECT COUNT(*) AS count FROM tbl_locations WHERE currency_name = ?', [currency_name]);
        
      const isExists = result[0].count > 0; // Check if the count is greater than 0
      await con.commit();
      res.json({ exists: isExists }); // Return whether the user exists or not
  
  
     
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      con.release();
    }
  };

  const addCountryPost = async (req, res, next) => {
    const con = await connection();
    const { country_name, country_code, currency_name, currency_symbol } = req.body;
    const country_image = req.file ? req.file.filename : null;

    // Convert country_code to the flag emoji
    function getFlagEmoji(countryCode) {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt()); // Convert each letter to regional indicator symbol
        return String.fromCodePoint(...codePoints);
    }

    const country_flag = getFlagEmoji(country_code);

    try {
        await con.beginTransaction();

        // Insert the new country details into the table
        await con.query(
            "INSERT INTO tbl_locations (country_flag, country_code, country_name, currency_name, currency_symbol, country_image, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [country_flag, country_code, country_name, currency_name, currency_symbol, country_image, 'Active']
        );

        await con.commit();

        const [countries] = await con.query(`
          SELECT * FROM tbl_locations 
          WHERE deleted='No' 
          ORDER BY status = 'Active' DESC, location_id DESC
        `);
      
        // Render success message
        res.redirect('addCountry');
    
    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('superadmin/kil500', { output: `${error}` });
    } finally {
        con.release();
    }
};


const updateCountryDetails = async (req, res, next) => {

  const con = await connection();
  console.log("req.body-->",req.body)
  const { location_id, country_name, country_code, currency_name, currency_symbol } = req.body;
  const country_image = req.file ? req.file.filename : null;

  // Convert country_code to the flag emoji
  function getFlagEmoji(countryCode) {
      const codePoints = countryCode
          .toUpperCase()
          .split('')
          .map(char => 127397 + char.charCodeAt()); // Convert each letter to regional indicator symbol
      return String.fromCodePoint(...codePoints);
  }

  const country_flag = getFlagEmoji(country_code);

  try {
      await con.beginTransaction();

      // Update query, considering if country_image is provided
      let query = `
          UPDATE tbl_locations 
          SET country_flag = ?, country_code = ?, country_name = ?, 
              currency_name = ?, currency_symbol = ?, status = ?
      `;
      let params = [country_flag, country_code, country_name, currency_name, currency_symbol, 'Active'];

      // If country_image is provided, include it in the query
      if (country_image) {
          query += `, country_image = ?`;
          params.push(country_image);
      }

      query += ` WHERE location_id = ?`;
      params.push(location_id);

      // Execute the update query
      await con.query(query, params);

      await con.commit();

      const [countries] = await con.query(`
        SELECT * FROM tbl_locations 
        WHERE deleted='No' 
        ORDER BY status = 'Active' DESC, location_id DESC
      `);

      // Render success message
     // res.render('superadmin/addCountry', { output: "Country updated successfully!", countries: countries });
      // Render success message
      res.redirect('addCountry');
  } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
};



const changeCountryStatus = async (req, res, next) => {  
  const con = await connection();
  
  const { id, status } = req.body;
  
  try {
      await con.beginTransaction();
  
  
        // Update the status in the database
        const updateSql = `UPDATE tbl_locations SET status=? WHERE location_id =?`;
        await con.query(updateSql, [status, id]);
  
        await con.commit();
  
        res.json({ success: true, msg: `${status === 'Active' ? 'Activating' : 'Deactivating'} Country & Currency ` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };
  



  const deleteCountry = async (req, res, next) => {  
    const con = await connection();
    
    const { id } = req.body;
    
    try {
        await con.beginTransaction();
    
  
        const softDeleteSql = `UPDATE tbl_locations SET deleted = 'Yes' WHERE location_id = ?`;
        await con.query(softDeleteSql, [id]);
    
    
          // const deleteSql = `DELETE FROM tbl_coupons WHERE coupon_id = ?`;
          // await con.query(deleteSql, [id]);
    
          await con.commit();
    
          res.json({ success: true, msg: 'Country & Currency deleted successfully !!' });
    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    
        // Handle error, render error message, or redirect to appropriate page
    } finally {
        con.release();
    }
    };
  








  const multi_currency = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('superadmin/multi_currency', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };


  const general_setting = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [[credentials]] = await con.query("SELECT * FROM tbl_important_credentials");

     // const encryptedMapKey = encrypt64(credentials.map_key); // Encrypt the map key

      if(credentials){

        if (credentials.map_key) {
          credentials.map_key = decrypt64(credentials.map_key); // Decrypt the map key for usage
        }
  
        if (credentials.stripe_secret_key) {
          credentials.stripe_secret_key = decrypt64(credentials.stripe_secret_key); // Decrypt the map key for usage
        }

        // console.log("decyrptied stripe key-> ",credentials.stripe_secret_key)
      
  
        if (credentials.stripe_publish_key) {
          credentials.stripe_publish_key = decrypt64(credentials.stripe_publish_key); // Decrypt the map key for usage
        }
        // console.log("decyrptied stripe_publish_key -> ",credentials.stripe_publish_key)
  
        if (credentials.paypal_client_id) {
          credentials.paypal_client_id = decrypt64(credentials.paypal_client_id); // Decrypt the map key for usage
        }
      
        // console.log("decyrptied paypal_client_id -> ",credentials.paypal_client_id)
  
        if (credentials.paypal_secret_key) {
          credentials.paypal_secret_key = decrypt64(credentials.paypal_secret_key); // Decrypt the map key for usage
        }


        // console.log("decyrptied paypal_secret_key -> ",credentials.paypal_secret_key)
      

      }


    
      

      await con.commit();
  
      res.render('superadmin/general_setting', { output: output,credentials:credentials });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };






const general_settingPost = async (req, res, next) => {
  const con = await connection();
  var output = req.cookies.rental_msg || '';

  // Destructure the form input values from the request body
  const { map_key, stripe_secret_key, stripe_publish_key, email_app_email, email_app_password,
     email_smtp_host, vat_tax_rate ,paypal_client_id,paypal_secret_key,radius } = req.body;

  try {
    await con.beginTransaction();

    // Fetch the existing credentials from the database
    const [[existingCredentials]] = await con.query("SELECT * FROM tbl_important_credentials WHERE id = ?", [1]);

    if (!existingCredentials) {
      await con.query('ALTER TABLE `tbl_important_credentials` AUTO_INCREMENT = 1');

      // If no credentials exist, insert a new record
      const encryptedMapKey = encrypt64(map_key); // Encrypt the map key before storing
      const encryptedstripe_secret_key = encrypt64(stripe_secret_key); // Encrypt the map key before storing
      const encryptedstripe_publish_key = encrypt64(stripe_publish_key); // Encrypt the map key before storing

      const encryptedpaypal_client_id = encrypt64(paypal_client_id); // Encrypt the  key before storing
      const encryptedpaypal_secret_key= encrypt64(paypal_secret_key); // Encrypt the  key before storing

      const insertQuery = `
        INSERT INTO tbl_important_credentials 
        (map_key, stripe_secret_key, stripe_publish_key, email_app_email, email_app_password, email_smtp_host, vat_tax_rate,paypal_client_id,paypal_secret_key,radius) 
        VALUES ( ?, ?, ?, ?, ?, ?, ?,?,?,?)
      `;
      await con.query(insertQuery, [     
        encryptedMapKey,
        encryptedstripe_secret_key,
        encryptedstripe_publish_key,
        email_app_email,
        email_app_password,
        email_smtp_host,
        vat_tax_rate,
        encryptedpaypal_client_id,
        encryptedpaypal_secret_key,
        radius
      ]);

      output = "New credentials added successfully.";

    } else {
      // If credentials exist, update the record
      let updated = false; // To track if any updates are made
      let query = "UPDATE tbl_important_credentials SET ";
      let updateFields = [];
      let updateValues = [];

      // Check and update map key if it has changed
      if (map_key && map_key !== existingCredentials.map_key) {
        const encryptedMapKey = encrypt64(map_key); // Encrypt the map key before storing
        updateFields.push('map_key = ?');
        updateValues.push(encryptedMapKey);
        updated = true;
      }

      // Check and update stripe secret key if it has changed
      if (stripe_secret_key && stripe_secret_key !== existingCredentials.stripe_secret_key) {
        const encryptedstripe_secret_key = encrypt64(stripe_secret_key); // Encrypt the map key before storing
        updateFields.push('stripe_secret_key = ?');
        updateValues.push(encryptedstripe_secret_key);
        updated = true;
      }
     
     
      

      // Check and update stripe publish key if it has changed
      if (stripe_publish_key && stripe_publish_key !== existingCredentials.stripe_publish_key) {
        const encryptedstripe_publish_key = encrypt64(stripe_publish_key); // Encrypt the map key before storing

        updateFields.push('stripe_publish_key = ?');
        updateValues.push(encryptedstripe_publish_key);
        updated = true;
      }



         // Check and update paypal client  key if it has changed
         if (paypal_client_id && paypal_client_id !== existingCredentials.paypal_client_id) {
          const encryptedpaypal_client_id = encrypt64(paypal_client_id); // Encrypt the  key before storing
  
          updateFields.push('paypal_client_id = ?');
          updateValues.push(encryptedpaypal_client_id);
          updated = true;
        }

             // Check and update paypal secret key if it has changed
             if (paypal_secret_key && paypal_secret_key !== existingCredentials.paypal_secret_key) {
              const encryptedpaypal_secret_key= encrypt64(paypal_secret_key); 

              updateFields.push('paypal_secret_key = ?');
              updateValues.push(encryptedpaypal_secret_key);
              updated = true;
            }
    
    





      // Check and update email app email if it has changed
      if (email_app_email && email_app_email !== existingCredentials.email_app_email) {
        updateFields.push('email_app_email = ?');
        updateValues.push(email_app_email);
        updated = true;
      }

      // Check and update email app password if it has changed
      if (email_app_password && email_app_password !== existingCredentials.email_app_password) {
        updateFields.push('email_app_password = ?');
        updateValues.push(email_app_password);
        updated = true;
      }

      // Check and update email SMTP host if it has changed
      if (email_smtp_host && email_smtp_host !== existingCredentials.email_smtp_host) {
        updateFields.push('email_smtp_host = ?');
        updateValues.push(email_smtp_host);
        updated = true;
      }

      // Check and update VAT tax rate if it has changed
      if (vat_tax_rate && vat_tax_rate !== existingCredentials.vat_tax_rate) {
        updateFields.push('vat_tax_rate = ?');
        updateValues.push(vat_tax_rate);
        updated = true;
      }

      if (radius && radius !== existingCredentials.radius) {
        updateFields.push('radius = ?');
        updateValues.push(radius);
        updated = true;
      }

      

      // If there are updates, proceed with the update query
      if (updated) {
        query += updateFields.join(', ') + ' WHERE id = ?';
        updateValues.push(1); // Add the ID to the update values
        await con.query(query, updateValues);

        output = "Credentials updated successfully.";
      } else {
        output = "No changes detected.";
      }
    }

    await con.commit();

    // Send updated data back to the form
    res.render('superadmin/general_setting', { output: output, credentials: req.body });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback();
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
};





  const addAppSlider = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || 'Slider added/updated successfully!';
    try {
      await con.beginTransaction();
    
      await con.commit();

      
      const [sliders] = await con.query(`
        SELECT * FROM tbl_slider ORDER BY id DESC`);
  
      res.render('superadmin/addAppSlider', { output: output ,sliders:sliders});
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };



  const addAppSliderPostformultiple = async (req, res, next) => {
    const con = await connection();
 
    const slider_image = req.file ? req.file.filename : null;


    try {
        await con.beginTransaction();

        // Insert the new country details into the table
        await con.query('ALTER TABLE `tbl_important_credentials` AUTO_INCREMENT = 1');
        await con.query(
            "INSERT INTO tbl_slider (slider_image) VALUES (?)",
            [slider_image]
        );

        await con.commit();

        const [sliders] = await con.query(`
          SELECT * FROM tbl_slider ORDER BY id DESC`);
        

        res.render('superadmin/addAppSlider', { output: "Slider Added succesfully " ,sliders:sliders});

    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('superadmin/kil500', { output: `${error}` });
    } finally {
        con.release();
    }
};


const addAppSliderPost = async (req, res, next) => {
  const output= req.cookies.rental_msg || 'Slider added/updated successfully!';
  const con = await connection();
  // console.log('CSRF Token:', req.body._csrf || req.query._csrf);
  // console.log("addAppSliderPost-->",addAppSliderPost)
  var slider_image ;
  

  // console.log(req.files)
  if (req.files) {
    // If images are uploaded, join filenames with commas
    slider_image = req.files.map(file => file.filename).join(',');
  }  

  try {
      await con.beginTransaction();

      // Step 1: Check if a slider already exists
      const [rows] = await con.query("SELECT id FROM tbl_slider LIMIT 1");

      if (rows.length === 0) {
          // Step 2: No slider exists, perform INSERT
          await con.query(
              "INSERT INTO tbl_slider (slider_image) VALUES (?)",
              [slider_image]
          );
      } else {
          // Step 3: Slider exists, perform UPDATE
          const existingSliderId = rows[0].id;
          await con.query(
              "UPDATE tbl_slider SET slider_image = ? WHERE id = ?",
              [slider_image, existingSliderId]
          );
      }

      await con.commit();

      // Fetch the updated slider(s)
      const [sliders] = await con.query("SELECT * FROM tbl_slider ORDER BY id DESC");

      // res.render('superadmin/addAppSlider', { 
      //     output: "Slider added/updated successfully!", 
      //     sliders: sliders 
      // });

      res.redirect('addAppSlider');

  } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.render('superadmin/kil500', { output: `${error}` });
  } finally {
      con.release();
  }
};


const deleteSlider = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction();
  

      // const softDeleteSql = `UPDATE tbl_slider SET deleted = 'Yes' WHERE id = ?`;
      // await con.query(softDeleteSql, [id]);
  
  
        const deleteSql = `DELETE FROM tbl_slider WHERE id = ?`;
        await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Slider deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };





  //======================== NOtification Start =============================

  const notifications = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [users] = await con.query("SELECT * FROM tbl_user where user_type='User' And deleted='No' ORDER BY user_id DESC");
      const [owners] = await con.query("SELECT * FROM tbl_user where user_type='Owner' And deleted='No' ORDER BY user_id DESC");
    
      await con.commit();
  
      res.render('superadmin/notifications', { output: output,users:users,owners:owners });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };


  const notificationsPost = async (req, res, next) => {
    const con = await connection();
    const { sendEmail, sendInApp, title, message, userSelection, ownerSelection, userTimezone } = req.body;
    const emailAttachment = req.file ? req.file.filename : null; // Handling the file attachment
    // path: path.join(__dirname, '../public/images/docUploads', doc)

    const attachments = emailAttachment ? [{ path: `${__dirname}/../public/uploads/${emailAttachment}` }] : [];
    try {
        await con.beginTransaction();

        // Timezone logic
        const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');
        const currentTime = moment().tz(userTimezone);
        const kildate = currentTime.format('YYYY-MM-DD');
        const kiltime = currentTime.format('hh:mm A');

        // console.log("currentDateTime ->>", currentDateTime);
        // console.log("date ->>", kildate);
        // console.log("time ->>", kiltime);

        // Function to handle sending notifications to users/owners
        const kilsend = async (userIds, userType) => {
            for (let userId of userIds) {
                // Fetch user info for the current userId
                const [userInfo] = await con.query('SELECT email, user_type FROM tbl_user WHERE user_id = ?', [userId]);

                // Sending Email notification if selected
                if (sendEmail && userInfo.length > 0) {
                    // console.log(`Sending email notification to ${userType} (ID: ${userId})...`);
                    await senddocNotificationUser(
                        [userInfo[0].email],
                        message,
                        title,
                        attachments
                    );
                }

                // Sending in-app notification if selected
                if (sendInApp && userInfo.length > 0) {
                    // console.log(`Sending in-app notification to ${userType} (ID: ${userId})...`);
                    const notificationMessage = `Notification: ${message}`;
                    await con.query(
                        'INSERT INTO tbl_notification_list (notification_type, user_id, user_type, title, message, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        ['General', userId, userType, title, notificationMessage, kildate, kiltime]
                    );
                    
                  sendSinglePushNotification({ user_id: userId, title: title, body: notificationMessage, }); 

                }
            }
        };

        // If userSelection is not empty, send notifications to users
        if (userSelection && userSelection.length > 0) {
            await kilsend(userSelection, 'User');
        }

        // If ownerSelection is not empty, send notifications to owners
        if (ownerSelection && ownerSelection.length > 0) {
            await kilsend(ownerSelection, 'Owner');
        }


        
      const [users] = await con.query("SELECT * FROM tbl_user where user_type='User' And deleted='No' ORDER BY user_id DESC");
      const [owners] = await con.query("SELECT * FROM tbl_user where user_type='Owner' And deleted='No' ORDER BY user_id DESC");

        await con.commit();

       // res.render('superadmin/notifications', { output: 'Notification sent successfully.',users:users,owners:owners });
        res.cookie('rental_msg', 'Notification sent successfully.');
        res.redirect('/superadmin/notifications')

    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).send({ message: `Failed to send notification. ${error.message}` });
    }
};

const showNotifications = async (req, res, next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
    await con.beginTransaction();
    await con.query("UPDATE tbl_notification_list SET read_status = 'Yes' where user_type='Admin'");
  
    const [notifications] = await con.query("SELECT * FROM tbl_notification_list where user_type='Admin' ORDER BY notification_id DESC");
    //const [owners] = await con.query("SELECT * FROM tbl_user where user_type='Owner' And deleted='No' ORDER BY user_id DESC");
  
    await con.commit();

    res.render('superadmin/showNotifications', { output: output,notifications:notifications});

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); 
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
};

  const userRatings = async (req, res, next) => {
    const con = await connection();
    const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
      const [users] = await con.query(`
          SELECT r.*, o.first_name AS owner_first_name, o.last_name AS owner_last_name, o.profile_image AS owner_image,
          v.vehicle_name, u.first_name AS user_first_name, u.last_name AS user_last_name, u.profile_image AS user_image
          FROM tbl_rating r JOIN tbl_user o ON r.owner_id = o.user_id  JOIN tbl_user u ON r.user_id = u.user_id
          LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id WHERE r.user_type = 'User' `);

      await con.commit();
  
     // res.render('superadmin/userRatings', { output: output , users});
      res.render('superadmin/userRatings',{output:output,users, start_date:currentDateTime, end_date: currentDateTime})
     
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };

  const postUserRatings = async (req, res, next) => {
    const con = await connection();
    // console.log("Filtering report", req.body);
    const output = req.cookies.kwl_msg || '';
    const { start_date, end_date} = req.body; // Include dateType in the request body
  
    // console.log("Filter data ->", req.body);
  
    try {
      await con.beginTransaction();
      // Build the dynamic query based on filters
      let query = `SELECT r.*, o.first_name AS owner_first_name, o.last_name AS owner_last_name, o.profile_image AS owner_image,
          v.vehicle_name, u.first_name AS user_first_name, u.last_name AS user_last_name, u.profile_image AS user_image
          FROM tbl_rating r JOIN tbl_user o ON r.owner_id = o.user_id  JOIN tbl_user u ON r.user_id = u.user_id
          LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id WHERE r.user_type = 'User'`;
      const queryParams = [];
  
      // Check if startDate and endDate are provided
      if (start_date && end_date) {
        const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
        const formattedEndDate = moment(end_date).format('YYYY-MM-DD');
  
        query += ` AND ratingdate BETWEEN ? AND ?`;
        queryParams.push(formattedStartDate, formattedEndDate);
      }
      // console.log("Query to execute:", query);
      // console.log("Query Parameters:", queryParams);
  
      const [rows] = await con.execute(query, queryParams);
  
      const users = rows.map((booking) => {
        return booking;
      });
  
      // console.log("users ", users);
  
      // console.log("normal render")
      await con.commit();

      res.render('superadmin/userRatings',{output:output,users, start_date:start_date, end_date: end_date})
     
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      if (con) {
        con.release();
      }
    }
  };

  const updateUserRating = async (req,res,next) => {
    const con = await connection();
    // console.log("req.body-->",req.body)
    const { rating_id , cleanliness,convenience,communication,overall_rating,review } = req.body;
    try {
      await con.beginTransaction();
  
      let updateQuery = ` UPDATE tbl_rating  SET cleanliness = ?, convenience= ?, communication= ?, overall_rating= ?, review=? `;
      const queryValues = [cleanliness,convenience,communication,overall_rating,review];
      updateQuery += ` WHERE rating_id  = ?`;
      queryValues.push(rating_id ); 
  
      // Execute the query
      const update = await con.query(updateQuery, queryValues);
      // console.log("update-->",update)
      await con.commit(); // Commit the transaction
  
      res.cookie('rental_msg', 'Rating updated successfully!');
      res.redirect('/superadmin/userRatings')
  
    } catch (error) {
      console.error('Error:', error);   
      await con.rollback(); // Rollback the transaction in case of error
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release(); // Release the database connection
    }
  }

  const ownerRatings = async (req, res, next) => {
    const con = await connection();
    const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
      const [owners] = await con.query(`
        SELECT r.*, o.first_name AS owner_first_name, o.last_name AS owner_last_name, o.profile_image AS owner_image,
        v.vehicle_name, u.first_name AS user_first_name, u.last_name AS user_last_name, u.profile_image AS user_image
        FROM tbl_rating r JOIN tbl_user o ON r.owner_id = o.user_id  JOIN tbl_user u ON r.user_id = u.user_id
        LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id WHERE r.user_type = 'Owner' `);

      await con.commit();
  
     // res.render('superadmin/ownerRatings', { output: output ,owners});
      res.render('superadmin/ownerRatings',{output:output,owners, start_date:currentDateTime, end_date: currentDateTime})
     
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };

  const postOwnerRatings = async (req, res, next) => {
    const con = await connection();
    // console.log("Filtering report", req.body);
    const output = req.cookies.kwl_msg || '';
    const { start_date, end_date} = req.body; // Include dateType in the request body
  
    // console.log("Filter data ->", req.body);
  
    try {
      await con.beginTransaction();
      // Build the dynamic query based on filters
      let query = `
        SELECT r.*, o.first_name AS owner_first_name, o.last_name AS owner_last_name, o.profile_image AS owner_image,
        v.vehicle_name, u.first_name AS user_first_name, u.last_name AS user_last_name, u.profile_image AS user_image
        FROM tbl_rating r JOIN tbl_user o ON r.owner_id = o.user_id  JOIN tbl_user u ON r.user_id = u.user_id
        LEFT JOIN tbl_vehicles v ON r.vehicle_id = v.vehicle_id WHERE r.user_type = 'Owner' `;
      const queryParams = [];
  
      // Check if startDate and endDate are provided
      if (start_date && end_date) {
        const formattedStartDate = moment(start_date).format('YYYY-MM-DD');
        const formattedEndDate = moment(end_date).format('YYYY-MM-DD');
  
        query += ` AND ratingdate BETWEEN ? AND ?`;
        queryParams.push(formattedStartDate, formattedEndDate);
      }
      // console.log("Query to execute:", query);
      // console.log("Query Parameters:", queryParams);
  
      const [rows] = await con.execute(query, queryParams);
  
      const owners = rows.map((booking) => {
        return booking;
      });
  
      // console.log("owners ", owners);
  
      // console.log("normal render")
      await con.commit();

      res.render('superadmin/ownerRatings',{output:output,owners, start_date:start_date, end_date: end_date})
     
    } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      if (con) {
        con.release();
      }
    }
  };

  const updateOwnerRating = async (req,res,next) => {
    const con = await connection();
    // console.log("req.body-->",req.body)
    const { rating_id , cleanliness,convenience,communication,overall_rating,review } = req.body;
    try {
      await con.beginTransaction();
  
      let updateQuery = ` UPDATE tbl_rating  SET cleanliness = ?, convenience= ?, communication= ?, overall_rating= ?, review=? `;
      const queryValues = [cleanliness,convenience,communication,overall_rating,review];
      updateQuery += ` WHERE rating_id  = ?`;
      queryValues.push(rating_id ); 
  
      // Execute the query
      const update = await con.query(updateQuery, queryValues);
      // console.log("update-->",update)
      await con.commit(); // Commit the transaction
  
      res.cookie('rental_msg', 'Rating updated successfully!');
      res.redirect('/superadmin/ownerRatings')
  
    } catch (error) {
      console.error('Error:', error);   
      await con.rollback(); // Rollback the transaction in case of error
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release(); // Release the database connection
    }
  }




//===========================================================================

  const affiliation = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [affiliations] = await con.query(`SELECT * FROM tbl_affiliation_reward ORDER BY affiliation_id DESC`);
    
      await con.commit();
  
      res.render('superadmin/affiliation', { output: output, affiliations:affiliations });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };




  const affiliationPost  = async (req, res, next) => {

  
    const con = await connection();

    const { reward_limit ,reward_percentage, expiry_date} = req.body;
  
    try {
        await con.beginTransaction();
  
        // Step 1: Check if a slider already exists
        const [rows] = await con.query("SELECT affiliation_id FROM tbl_affiliation_reward LIMIT 1");
  
        if (rows.length === 0) {
            // Step 2: No slider exists, perform INSERT
            await con.query(
                "INSERT INTO tbl_affiliation_reward (reward_limit ,reward_percentage,expiry_date) VALUES (?,?,?)",
                [reward_limit ,reward_percentage,expiry_date]
            );
        } else {
          // console.log("second time ")
            // Step 3: Slider exists, perform UPDATE
            const affiliation_id = rows[0].affiliation_id;
            await con.query(
                "UPDATE tbl_affiliation_reward SET reward_limit = ?,reward_percentage=?,expiry_date = ?  WHERE affiliation_id = ?",
                [reward_limit,reward_percentage ,expiry_date, affiliation_id]
            );
        }
  

        const [affiliations] = await con.query(`SELECT * FROM tbl_affiliation_reward ORDER BY affiliation_id DESC`);
        await con.commit();
  
        res.render('superadmin/affiliation', { output: 'Affiliation Reward added successfully !', affiliations:affiliations });
  
    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('superadmin/kil500', { output: `${error}` });
    } finally {
        con.release();
    }
  };
  


  const deleteAcode = async (req, res, next) => {  
    const con = await connection();
    
    const { id } = req.body;
    
    try {
        await con.beginTransaction();
    
  
        // const softDeleteSql = `UPDATE tbl_slider SET deleted = 'Yes' WHERE id = ?`;
        // await con.query(softDeleteSql, [id]);
    
    
          const deleteSql = `DELETE FROM tbl_affiliation_reward WHERE affiliation_id = ?`;
          await con.query(deleteSql, [id]);
    
          await con.commit();
    
          res.json({ success: true, msg: 'Affiliation Reward deleted successfully !!' });
    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    
        // Handle error, render error message, or redirect to appropriate page
    } finally {
        con.release();
    }
    };
  
  
  
  




    //======================= Referral Amout =================



  const referralAmounts = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [referrals] = await con.query(`SELECT * FROM tbl_referral_amount ORDER BY invite_id DESC`);
    
      await con.commit();
  
      res.render('superadmin/referralAmounts', { output: output ,referrals:referrals });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };




  
  const referralAmountsPost  = async (req, res, next) => {

  
    const con = await connection();

    const { inviter_amount ,signup_amount, expiry_date} = req.body;
  
    try {
        await con.beginTransaction();
  
        // Step 1: Check if a slider already exists
        const [rows] = await con.query("SELECT invite_id FROM tbl_referral_amount LIMIT 1");
  
        if (rows.length === 0) {
            // Step 2: No slider exists, perform INSERT
            await con.query(
                "INSERT INTO tbl_referral_amount (inviter_amount ,signup_amount,expiry_date) VALUES (?,?,?)",
                [inviter_amount ,signup_amount,expiry_date]
            );
        } else {
          // console.log("second time ")
            // Step 3: Slider exists, perform UPDATE
            const invite_id = rows[0].invite_id;
            await con.query(
                "UPDATE tbl_referral_amount SET inviter_amount = ?,signup_amount=?,expiry_date = ?  WHERE invite_id = ?",
                [inviter_amount,signup_amount ,expiry_date, invite_id]
            );
        }
  

        const [referrals] = await con.query(`SELECT * FROM tbl_referral_amount ORDER BY invite_id DESC`);
        await con.commit();

        res.render('superadmin/referralAmounts', { output: 'Referral amount added successfully !' ,referrals:referrals });
  
    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('superadmin/kil500', { output: `${error}` });
    } finally {
        con.release();
    }
  };
  




  const deletereferrals = async (req, res, next) => {  
    const con = await connection();
    
    const { id } = req.body;
    
    try {
        await con.beginTransaction();
    
  
        // const softDeleteSql = `UPDATE tbl_slider SET deleted = 'Yes' WHERE id = ?`;
        // await con.query(softDeleteSql, [id]);
    
    
          const deleteSql = `DELETE FROM tbl_referral_amount WHERE invite_id = ?`;
          await con.query(deleteSql, [id]);
    
          await con.commit();
    
          res.json({ success: true, msg: 'Referral Amount deleted successfully !!' });
    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    
        // Handle error, render error message, or redirect to appropriate page
    } finally {
        con.release();
    }
    };
  
  
  




//================================  Deposite Rate start ========================


  const deposits_fee = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [rates] = await con.query(`SELECT * FROM tbl_deposit_rate ORDER BY rate_id DESC`);
    
      await con.commit();
  
      res.render('superadmin/deposits_fee', { output: output, rates:rates });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };






  const deposits_feePost  = async (req, res, next) => {

  
    const con = await connection();

    const { deposit_rate_per ,country_code} = req.body;

    const selectedLocation = req.locations.find(loc => loc.country_code === country_code);
   
  
    req.body.country_name = selectedLocation ? selectedLocation.country_name : '';
  
    try {
        await con.beginTransaction();
  
        // Step 1: Check if a slider already exists
        const [rows] = await con.query("SELECT rate_id FROM tbl_deposit_rate LIMIT 1");
  
        if (rows.length === 0) {
            // Step 2: No slider exists, perform INSERT
            await con.query(
                "INSERT INTO tbl_deposit_rate (deposit_rate_per ,country_name) VALUES (?,?)",
                [deposit_rate_per ,req.body.country_name]
            );
        } else {
          // console.log("second time ")
            // Step 3: Slider exists, perform UPDATE
            const rate_id = rows[0].rate_id;
            await con.query(
                "UPDATE tbl_deposit_rate SET deposit_rate_per = ?,country_name=?  WHERE rate_id = ?",
                [deposit_rate_per ,req.body.country_name, rate_id]
            );
        }
  

        const [rates] = await con.query(`SELECT * FROM tbl_deposit_rate ORDER BY rate_id DESC`);
        await con.commit();
  
        
      res.render('superadmin/deposits_fee', { output: 'Affiliation Reward added successfully !', rates:rates });
  
    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('superadmin/kil500', { output: `${error}` });
    } finally {
        con.release();
    }
  };
  



  const deleteDepositeRate = async (req, res, next) => {  
    const con = await connection();
    
    const { id } = req.body;
    
    try {
        await con.beginTransaction();
    
  
        // const softDeleteSql = `UPDATE tbl_slider SET deleted = 'Yes' WHERE id = ?`;
        // await con.query(softDeleteSql, [id]);
    
    
          const deleteSql = `DELETE FROM tbl_deposit_rate WHERE rate_id = ?`;
          await con.query(deleteSql, [id]);
    
          await con.commit();
    
          res.json({ success: true, msg: 'Deposit rate deleted successfully !!' });
    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    
        // Handle error, render error message, or redirect to appropriate page
    } finally {
        con.release();
    }
    };
  
  





  


    //=========================== FAQ section  ==========================================

  const users_faqs = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [faqs] = await con.query("SELECT * FROM tbl_faq where faq_type='User' ORDER BY created_at DESC"); 
    
      await con.commit();
  
      res.render('superadmin/users_faqs', { output: output, faqs:faqs });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };


  const owners_faqs = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      

      const [faqs] = await con.query("SELECT * FROM tbl_faq where faq_type='Owner' ORDER BY created_at DESC"); 
    
      await con.commit();
  
     res.render('superadmin/owners_faqs', { output: output, faqs:faqs });
      // res.cookie('rental_msg',output);
      // res.redirect('/superadmin/owners_faqs')
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };





  
  //====================  Faq Section ===================================== 

  
  


const addFAQ = async (req, res, next) => {
  const con = await connection();

  // console.log("req body ", req.body)

  try {
    await con.beginTransaction();

    // Extracting data from the request body
    const { faq, answer,faq_type } = req.body;

    // Insert the new FAQ into the tbl_faqs table
    await con.query('INSERT INTO tbl_faq (faq, answer,faq_type) VALUES (?,?,?)', [faq, answer,faq_type]);


    await con.commit();

    // console.log(req.url)

          if(req.url == '/owners_faqs'){
            // console.log("ownerrrrrrrrrrrrrrrrrr")
            const [faqs] = await con.query("SELECT * FROM tbl_faq where faq_type='Owner' ORDER BY created_at DESC"); 
            // res.render('superadmin/owners_faqs', { output: 'Owner FAQ Added successfully', faqs:faqs });
            // res.cookie('rental_msg','Owner FAQ Added successfully');
            res.redirect('/superadmin/owners_faqs')
          }else{

            // console.log("userrrrrrrrrrrrrrrrrrrr")
            const [faqs] = await con.query("SELECT * FROM tbl_faq where faq_type='User' ORDER BY created_at DESC"); 
            // res.cookie('rental_msg',' User FAQ Added successfully');
            // res.redirect('/superadmin/users_faqs')
            res.render('superadmin/users_faqs', { 'faqs': faqs, 'output': ' User FAQ Added successfully' });
          }

   
  } catch (error) {
    await con.rollback();
    console.error('Error in addFAQ API:', error);
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
};





const deleteFAQ = async (req, res, next) => {  
  const con = await connection();
  
  const { id } = req.body;
  
  try {
      await con.beginTransaction(); 
      

  
        const deleteSql = `DELETE FROM tbl_faq WHERE faq_id = ?`;
        await con.query(deleteSql, [id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'FAQ deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };




  

  const editFAQ = async (req, res, next) => {
    const con = await connection();
  
    try {
      await con.beginTransaction();
  
      const { faq_id, faq, answer } = req.body;
  
      // Check if the FAQ with given ID exists
      const [[existingFAQ]] = await con.query('SELECT * FROM tbl_faq WHERE faq_id = ?', [faq_id]);
      if (!existingFAQ) {
        await con.rollback();
        return res.json({ result: 'failed', message: 'FAQ not found' });
      }
  
      // Update the FAQ
      await con.query('UPDATE tbl_faq SET faq = ?, answer = ? WHERE faq_id = ?', [faq, answer, faq_id]);
  
      await con.commit();
      res.json({ result: 'success', message: 'FAQ updated successfully', faq_id:faq_id , faq:faq, answer:answer });
    } catch (error) {
      await con.rollback();
      console.error('Error in editFAQ API:', error);
      res.status(500).json({ result: 'failed', message: 'Internal Server Error' });
    } finally {
      con.release();
    }
  };
  
  

  
//--------------------------- FAQ  End -------------------------- 



  


  //========================== Privacy Policy Section ============================= 

  const users_privacy_policy = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [pandps] = await con.query("SELECT * FROM tbl_pandp WHERE policy_type = 'User' ORDER BY id DESC");
    
    
      await con.commit();
  
      res.render('superadmin/users_privacy_policy', { output: output , pandps:pandps });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 



  



  const owners_privacy_policy = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
      const [pandps] = await con.query("SELECT * FROM tbl_pandp WHERE policy_type = 'Owner' ORDER BY id DESC");
    
      await con.commit();
  
      res.render('superadmin/owners_privacy_policy', { output: output,pandps:pandps });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 




// Insert or Update Privacy Policy for User or Owner
const addPrivacyPolicy = async (req, res, next) => {
  const con = await connection();
  // console.log("req body ", req.body)
  let output;
  try {

     const { privacy_policy ,policy_type ,privacy_id } = req.body
    const policyContent = decodeURIComponent(privacy_policy);
    const policyType = policy_type; 
    var action;

    // Check if a record for this policy_type already exists
    const [result] = await con.query('SELECT * FROM tbl_pandp WHERE policy_type = ?', [policyType]);

    if (result.length > 0) {  
       action = 'Updated'
     await con.query('UPDATE tbl_pandp SET policy = ? WHERE policy_type = ?', [policyContent, policyType]);
   
    } else {    
      action = 'Added'
      const sql = 'INSERT INTO `tbl_pandp` (policy, policy_type) VALUES (?, ?)';
      const values = [policyContent, policyType];
       await con.query(sql, values);
    }
 
    if(policy_type == 'Owner'){

      const [pandps] = await con.query("SELECT * FROM tbl_pandp WHERE policy_type = 'Owner' ORDER BY id DESC");
   //   res.render('superadmin/owners_privacy_policy', { output: `${policyType} Privacy ${action}  successfully !!`,pandps:pandps });
  
      output= `${policyType} Privacy ${action} successfully !!`;   
      res.cookie('rental_msg',output);
      res.redirect('/superadmin/owners_privacy_policy')
    }else{

      const [pandps] = await con.query("SELECT * FROM tbl_pandp WHERE policy_type = 'User' ORDER BY id DESC");
      //res.render('superadmin/users_privacy_policy', { output: `${policyType} Privacy ${action} successfully !!`,pandps:pandps });
      output= `${policyType} Privacy ${action} successfully !!`;   
      res.cookie('rental_msg',output);
      res.redirect('/superadmin/users_privacy_policy')
    }

  } catch (error) {
    await con.rollback(); 
    // console.log(error)
      res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
};






const deletePrivacyPolicy = async (req, res, next) => {  
  const con = await connection();
  
  const { privacy_id } = req.body;
  
  try {
      await con.beginTransaction();  
   
  
        const deleteSql = `DELETE FROM tbl_pandp WHERE id = ?`;
        await con.query(deleteSql, [privacy_id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Privacy Policy deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };





//============================================= Cancellation Policy Start ===========================












//========================== Cancellation Policy Section ============================= 

const users_cancellation_policy = async (req, res, next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
    await con.beginTransaction();

    const [pandps] = await con.query("SELECT * FROM tbl_cancellation_policy WHERE policy_type = 'User' ORDER BY id DESC");
  
  
    await con.commit();

    res.render('superadmin/users_cancellation_policy', { output: output , pandps:pandps });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); 
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
}; 







const owners_cancellation_policy = async (req, res, next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
    await con.beginTransaction();
    const [pandps] = await con.query("SELECT * FROM tbl_cancellation_policy WHERE policy_type = 'Owner' ORDER BY id DESC");
  
    await con.commit();

    res.render('superadmin/owners_cancellation_policy', { output: output,pandps:pandps });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); 
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
}; 




// Insert or Update Cancellation Policy for User or Owner
const addCancellationPolicy = async (req, res, next) => {
const con = await connection();
// console.log("req body ", req.body)
let output;
try {

   const { privacy_policy ,policy_type ,privacy_id } = req.body
  //const policyContent = decodeURIComponent(privacy_policy);

  const policyContent = privacy_policy
  const policyType = policy_type; 
  var action;

  // Check if a record for this policy_type already exists
  const [result] = await con.query('SELECT * FROM tbl_cancellation_policy WHERE policy_type = ?', [policyType]);

  if (result.length > 0) {  
     action = 'Updated'
   await con.query('UPDATE tbl_cancellation_policy SET policy = ? WHERE policy_type = ?', [policyContent, policyType]);
 
  } else {    
    action = 'Added'
    const sql = 'INSERT INTO `tbl_cancellation_policy` (policy, policy_type) VALUES (?, ?)';
    const values = [policyContent, policyType];
     await con.query(sql, values);
  }



  if(policy_type == 'Owner'){

    const [pandps] = await con.query("SELECT * FROM tbl_cancellation_policy WHERE policy_type = 'Owner' ORDER BY id DESC");
   // res.render('superadmin/owners_cancellation_policy', { output: `${policyType} Cancellation ${action}  successfully !!`,pandps:pandps });
    output= `${policyType} Cancellation ${action} successfully !!`;   
    res.cookie('rental_msg',output);
    res.redirect('/superadmin/owners_cancellation_policy')
  }else{

    const [pandps] = await con.query("SELECT * FROM tbl_cancellation_policy WHERE policy_type = 'User' ORDER BY id DESC");
    //res.render('superadmin/users_cancellation_policy', { output: `${policyType} Cancellation ${action} successfully !!`,pandps:pandps });
    output= `${policyType} Cancellation ${action} successfully !!`;   
    res.cookie('rental_msg',output);
    res.redirect('/superadmin/users_cancellation_policy')
  }

} catch (error) {
  await con.rollback(); 
  // console.log(error)
    res.render('superadmin/kil500', { output: `${error}` });
} finally {
  con.release();
}
};






const deleteCancellationPolicy = async (req, res, next) => {  
const con = await connection();

const { privacy_id } = req.body;

try {
    await con.beginTransaction();  
 

      const deleteSql = `DELETE FROM tbl_cancellation_policy WHERE id = ?`;
      await con.query(deleteSql, [privacy_id]);

      await con.commit();

      res.json({ success: true, msg: 'Cancellation Policy deleted successfully !!' });
} catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ success: false, msg: 'Internal Server Error' });

    // Handle error, render error message, or redirect to appropriate page
} finally {
    con.release();
}
};














  //================================= Terms & Condition =========================


  const users_terms_condition = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [tandc] = await con.query("SELECT * FROM tbl_tandc WHERE tandc_type = 'User' ORDER BY id DESC");
    
    
      await con.commit();
  
      res.render('superadmin/users_terms_condition', { output: output , tandc:tandc });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 



  



  const owners_terms_condition = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
      const [tandc] = await con.query("SELECT * FROM tbl_tandc WHERE tandc_type = 'Owner' ORDER BY id DESC");
    
      await con.commit();
  
      res.render('superadmin/owners_terms_condition', { output: output,tandc:tandc });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 




// Insert or Update Terms Condition for User or Owner
const addTermsCondition = async (req, res, next) => {
  const con = await connection();
  // console.log("req body ", req.body)
  let output;
  try {

     const { terms ,tandc_type ,term_id } = req.body
    const termsContent = decodeURIComponent(terms);
    const termType = tandc_type; 
    var action;

    // Check if a record for this tandc_type already exists
    const [result] = await con.query('SELECT * FROM tbl_tandc WHERE tandc_type = ?', [termType]);

    if (result.length > 0) {  
       action = 'Updated'
     await con.query('UPDATE tbl_tandc SET terms= ? WHERE tandc_type = ?', [termsContent, termType]);
   
    } else {    
      action = 'Added'
      const sql = 'INSERT INTO `tbl_tandc` (terms, tandc_type) VALUES (?, ?)';
      const values = [termsContent, termType];
       await con.query(sql, values);
    }


 
    if(tandc_type == 'Owner'){

      const [tandc] = await con.query("SELECT * FROM tbl_tandc WHERE tandc_type = 'Owner' ORDER BY id DESC");
     // res.render('superadmin/owners_terms_condition', { output: `${termType} Terms & Conditons  ${action}  successfully !!`,tandc:tandc });
      output= `${termType} Terms & Conditons ${action} successfully !!`;   
      res.cookie('rental_msg',output);
      res.redirect('/superadmin/owners_terms_condition')
    }else{

      const [tandc] = await con.query("SELECT * FROM tbl_tandc WHERE tandc_type = 'User' ORDER BY id DESC");
      //res.render('superadmin/users_terms_condition', { output: `${termType} Terms & Conditons ${action} successfully !!`,tandc:tandc });
      output= `${termType} Terms & Conditons ${action} successfully !!`;   
      res.cookie('rental_msg',output);
      res.redirect('/superadmin/users_terms_condition')
    }

  } catch (error) {
    await con.rollback(); 
    // console.log(error)
      res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
};






const deleteTerms = async (req, res, next) => {  
  const con = await connection();
  
  const { term_id } = req.body;
  
  try {
      await con.beginTransaction();  
   
  
        const deleteSql = `DELETE FROM tbl_tandc WHERE id = ?`;
        await con.query(deleteSql, [term_id]);
  
        await con.commit();
  
        res.json({ success: true, msg: 'Terms Condition deleted successfully !!' });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  
      // Handle error, render error message, or redirect to appropriate page
  } finally {
      con.release();
  }
  };



//============================================ About Use start ======================= 



const about_us = async (req, res, next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  try {
    await con.beginTransaction();

    const [aboutus] = await con.query("SELECT * FROM tbl_aboutus ORDER BY id DESC");
  
  
    await con.commit();

    res.render('superadmin/about_us', { output: output , aboutus:aboutus });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); 
    res.render('superadmin/kil500', { output: `${error}` });
  } finally {
    con.release();
  }
}; 







// Insert or Update Privacy Policy for User or Owner
const addAboutus = async (req, res, next) => {
const con = await connection();
// console.log("req body ", req.body)
let output;
try {

   const { about_us  ,about_id } = req.body
  const about_us_content = decodeURIComponent(about_us);

  var action;

 
  const [result] = await con.query('SELECT * FROM tbl_aboutus');

  if (result.length > 0) {  
     action = 'Updated'
   await con.query('UPDATE tbl_aboutus SET about_us = ?', [about_us_content]);
 
  } else {    
    action = 'Added'
    const sql = 'INSERT INTO `tbl_aboutus` (about_us) VALUES (?)';
    const values = [about_us_content];
     await con.query(sql, values);
  }


  const [aboutus] = await con.query("SELECT * FROM tbl_aboutus ORDER BY id DESC");
 // res.render('superadmin/about_us', { output: `About us ${action} successfully !!`,aboutus:aboutus });
  output= `About us ${action} successfully !!`;   
  res.cookie('rental_msg',output);
  res.redirect('/superadmin/about_us')

} catch (error) {
  await con.rollback(); 
  // console.log(error)
    res.render('superadmin/kil500', { output: `${error}` });
} finally {
  con.release();
}
};






const deleteAboutus = async (req, res, next) => {  
const con = await connection();
console.log(" req.body-->", req.body)
const { about_id } = req.body;

try {
    await con.beginTransaction();  
 

      const deleteSql = `DELETE FROM tbl_aboutus WHERE id = ?`;
      await con.query(deleteSql, [about_id]);

      await con.commit();

      res.json({ success: true, msg: 'About us deleted successfully !!' });
} catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).json({ success: false, msg: 'Internal Server Error' });

    // Handle error, render error message, or redirect to appropriate page
} finally {
    con.release();
}
};


  




  

  //============================== Help & inqueriy  =======================



  const inquiry_contacts = async(req,res,next)=>{ 

    const con = await connection();   
    const output= req.cookies.rental_msg || '';

    try {
      const [[support]] = await con.query('SELECT * FROM tbl_support');
      res.render('superadmin/inquiry_contacts',{'output':'','support':support});
    } catch (error) {
      res.render('superadmin/kil500', { output: `${error}` });
    }
  }





  const inquiry_contactsPost = async (req, res, next) => {
    const con = await connection();
  
    try {
      await con.beginTransaction();


  
      const [results] = await con.query(
        'INSERT INTO tbl_support (id, support_email,country_code, support_contact) VALUES (?, ?, ?,?) ON DUPLICATE KEY UPDATE support_email = VALUES(support_email), support_contact = VALUES(support_contact)',
        [1, req.body.support_email, req.body.country_code,req.body.contact]
      );
  
      const [[support]] = await con.query('SELECT * FROM tbl_support WHERE id = ?', [1]);
  
      await con.commit();
  
      if (results) {
        res.render('superadmin/inquiry_contacts', { output: 'Support Details Added Successfully !!', support: support });
      } else {
        res.render('superadmin/inquiry_contacts', { output: 'Failed to Add Support !! ', support: support });
      }
    } catch (error) {
      await con.rollback();
      console.error('Error in SupportPost API:', error);
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };
  




  



//================================= HELP Ticket Queris Section ==================================== 






  const queries1 = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('superadmin/queries', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('superadmin/kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 






  
  

  const queries = async (req, res, next) => {
    const con = await connection(); 
    const output= req.cookies.rental_msg || '';
    try {
        const [openedQueries] = await con.query('SELECT * FROM tbl_contact_support WHERE status = ? ORDER BY id DESC', ['opened']);
        const [closedQueries] = await con.query('SELECT * FROM tbl_contact_support WHERE status = ? ORDER BY id DESC', ['closed']);
        
        const allQueries = [...openedQueries, ...closedQueries];

        // Fetch conversation threads for each complain_number
        for (const query of allQueries) {
          const [threads] = await con.query('SELECT * FROM tbl_contact_support_threads_list WHERE complain_number = ? ORDER BY id DESC', [query.complain_number]);
          
          var [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [query.user_id ]); 
       
         
          query.ticket_thread = threads;
          // console.log("queryyyyyyyyyy ",query )
        

          if(user.length>0){
            var customer_name = `${user[0].first_name} ${user[0].last_name}`;
            // console.log(customer_name)
            query.customer_name =  customer_name
          }else{
            query.customer_name =  'Deleted User'
          }          
      }

        res.render('superadmin/queries', { "output": output, "queries": allQueries });
    } catch (error) {
      // console.log("error in fetching queries Admin Panel -> ",error)
      res.render('superadmin/kil500', { output: `${error}` });
    }
}


const QueriesPost = async(req,res,next)=>{

  const con = await connection(); 

  try {
    
      
  var queryID = req.body.id;

  if(req.body.status =='opened')
  {
      var newStatus = "closed"
  }
  else {
      var newStatus = "opened"
  }  

  //const [results] = await con.query('UPDATE tbl_contact_support SET status = ? WHERE id = ?', [newStatus, queryID]);

  const [results] = await con.query('UPDATE tbl_contact_support SET status = ?, closed_by = ? WHERE id = ?', [newStatus, 'support_executive', queryID]);

      if(results){
        let title1 ,body1;
        title1 = `Support Executive closed chat for complain ticket ${complain_number}`;
        body1 =  `complain ticket ${complain_number} chat has closed by Support Executive`;

        const sql_notify = `INSERT INTO tbl_notification_list  (notification_type, booking_id, user_id, user_type, title, message, date, time)  VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `;
    
        await con.query(sql_notify, ['Help&Support','0', user_idd, 'User', title1, body1, kildate, kiltime ]);

        // Send push notification
        sendSinglePushNotification({ user_id: user_idd, title: title1, body: body1, });
          res.json({ msg: 'Action Taken on Query'})
   }
  } catch (error) {
    res.render('superadmin/kil500', { output: `${error}` });
  }

     
  
}



const sendMailtoUser = async (req, res, next) => {
  const con = await connection();

  try {

    var userTimezone = moment.tz.guess();

        //=================  Timzezone according to Client Location =========================
        const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
        // console.log("Timezone on server -> ",userTimezone )
        const currentTime = moment().tz(userTimezone);
        const kildate = currentTime.format('YYYY-MM-DD');
        const kiltime = currentTime.format('hh:mm A');  
        // console.log("currentDateTime ->> " , currentDateTime)  
        // console.log("date ->> " , kildate)  
        // console.log("time ->> " , kiltime)
        //=================  Timzezone according to Client Location =========================


    await con.beginTransaction();

      const email = req.body.recipientEmail;
      const subject = req.body.emailSubject;
      const message = req.body.emailMessage;
      const ticket_number = req.body.ticket_number;

      const complain_number = ticket_number;
      const [userss] = await con.query('SELECT * FROM tbl_contact_support WHERE complain_number = ?', [ticket_number]); 
      const user_id = userss[0];
      const user_idd = userss[0].user_id
      console.log("user_id-->",user_id);

      const [Queries] = await con.query('SELECT * FROM tbl_contact_support WHERE status IN (?, ?) ORDER BY id DESC', ['opened', 'closed']);

      const [queryResult] = await con.query('SELECT status, closed_by FROM tbl_contact_support WHERE complain_number = ?', [ticket_number]);

      if (queryResult.length > 0) {
        const { status, closed_by } = queryResult[0];
  
        if (status === 'closed') {
          const replyMessage = `This ticket is closed by ${closed_by === 'support_executive' ? 'support executive' : 'user'}`;
  
          await con.commit();
          // return res.render('superadmin/queries', { "output": replyMessage, "queries": Queries });

          if (req.method === 'POST') {
            res.cookie('rental_msg', replyMessage);
            res.redirect('/superadmin/queries')
            }

        }
      }
     
      const userID = '0';
      const role = userID == '0' ? 'support_executive' : 'customer';

    //  const [kilresult] =  await con.query(
    //     'INSERT INTO tbl_contact_support_threads_list (complain_number, user_id, role, message) VALUES (?, ?, ?, ?)',
    //     [complain_number, userID, role, message]
    //   );

    if (req.method === 'POST') {

      const [kilresult] = await con.query(
        'INSERT INTO tbl_contact_support_threads_list (complain_number, user_id, role, message, date, time) VALUES (?, ?, ?, ?, ?, ?)',
        [complain_number, userID, role, message, kildate, kiltime]
      );
      // console.log("thread reply by admin --> ", kilresult)
      let title1 ,body1;
        title1 = `Support Executive response for complain ticket ${complain_number}`;
        body1 = message;
    
  
      const sql_notify = `INSERT INTO tbl_notification_list  (notification_type, booking_id, user_id, user_type, title, message, date, time)  VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `;
  
      await con.query(sql_notify, ['Help&Support','0', user_idd, 'User', title1, body1, kildate, kiltime ]);
  
      // Send push notification
      sendSinglePushNotification({ user_id: user_idd, title: title1, body: body1, });


    }
    await con.commit();

      // Call the responsetoQuery function to send an email
      //responsetoQuery(email, message, subject);

      // Fetch queries from the tbl_contact_support table

      const [openedQueries] = await con.query('SELECT * FROM tbl_contact_support WHERE status = ? ORDER BY id DESC', ['opened']);
      const [closedQueries] = await con.query('SELECT * FROM tbl_contact_support WHERE status = ? ORDER BY id DESC', ['closed']);
      
      const allQueries = [...openedQueries, ...closedQueries];

      // Fetch conversation threads for each complain_number
      for (const query of allQueries) {
        const [threads] = await con.query('SELECT * FROM tbl_contact_support_threads_list WHERE complain_number = ? ORDER BY id DESC', [query.complain_number]);
        
        var [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [query.user_id ]); 
     

        query.ticket_thread = threads;

        if(user.length>0){
          
          var customer_name = `${user[0].first_name} ${user[0].last_name}`;
          query.customer_name =  customer_name
        }else{
          query.customer_name =  'Deleted User'
        }          
    }

    res.cookie('rental_msg', "Ticket Response Sent to " + email + " and User's Account Successfully");
    res.redirect('/superadmin/queries')
     

      // if (Queries) {
      //     res.render('superadmin/queries', { "output": "Ticket Response Sent to " + email + " and User's Account Successfully", "queries": allQueries });
      // } else {
      //     res.render('superadmin/queries', { "output": "Failed to send Email", "queries": allQueries });
      // }
  } catch (error) {
      console.error('Error in ThreadReply by Admin & sendMailtoUser API:', error);
      // res.status(500).json({ result: 'Internal Server Error' });
      res.cookie('rental_msg', "Failed to send Email");
      res.redirect('/superadmin/queries')
  } finally {
      con.release();
  }
};




const AftersendemailQuriesReload = async (req, res, next) => {
  const con = await connection(); 
  try {
      const [openedQueries] = await con.query('SELECT * FROM tbl_contact_support WHERE status = ? ORDER BY id DESC', ['opened']);
      const [closedQueries] = await con.query('SELECT * FROM tbl_contact_support WHERE status = ? ORDER BY id DESC', ['closed']);
      
      const allQueries = [...openedQueries, ...closedQueries];

      // Fetch conversation threads for each complain_number
      for (const query of allQueries) {
        const [threads] = await con.query('SELECT * FROM tbl_contact_support_threads_list WHERE complain_number = ? ORDER BY id DESC', [query.complain_number]);
        
        var [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [query.user_id ]); 
     

        query.ticket_thread = threads;

        if(user.length>0){
         
          var customer_name = `${user[0].first_name} ${user[0].last_name}`;
          query.customer_name =  customer_name
        }else{
          query.customer_name =  'Deleted User'
        }          
    }

      res.render('superadmin/queries', { "output": "", "queries": allQueries });
  } catch (error) {
    // console.log("error in fetching queries Admin Panel -> ",error)
      res.render('superadmin/kil500');
  }
}



const OwnerWithdrawRequest = async (req, res, next) => {
  const con = await connection();
  const output = req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      // Modify the query to include a JOIN for fetching owner names
      const [owners] = await con.query(`SELECT t.*, u.first_name AS first_name,u.last_name AS last_name FROM tbl_transactions t JOIN tbl_user u ON t.user_id = u.user_id WHERE t.wallet_type = 'Owner' AND t.transaction_type = 'Withdrawal' AND t.transaction_mode = 'Bank' ORDER BY t.user_id DESC`);

      await con.commit();
       // console.log(owners);
      // Pass both transaction details and owner names to the render function
      res.render('superadmin/OwnerWithdrawRequest', { output: output, owners });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
};



const changeOwnerWithdrawStatus = async (req, res, next) => {
  const con = await connection();
  const { id, status } = req.body; // Destructure ID and status from request body

  try {
      await con.beginTransaction();

      // Fetch transaction details
      const [[transaction]] = await con.query(`SELECT * FROM tbl_transactions WHERE transaction_id = ?`, [id]);
      const userID = transaction.user_id;

      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
      // Calculate new wallet amount if the withdrawal is rejected
      if (status === 'Rejected') {
          const current_wallet_amount = parseFloat(existingUser.owner_wallet);
          const withdrawal_amount = parseFloat(transaction.withdrawal_amount);
          const new_wallet_amount = current_wallet_amount + withdrawal_amount;

          // Update the user's wallet balance
          await con.query(`UPDATE tbl_user SET owner_wallet = ? WHERE user_id = ?`, [new_wallet_amount, userID]);
      }

      // Update the transaction status
      await con.query(`UPDATE tbl_transactions SET status = ? WHERE transaction_id = ?`, [status, id]);

      await con.commit();
      res.json({ success: true, msg: `Transaction ${status} successfully` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  } finally {
      con.release();
  }
};


const UserWithdrawRequest = async (req, res, next) => {
  const con = await connection();
  const output = req.cookies.rental_msg || '';
  try {
      await con.beginTransaction();

      // Modify the query to include a JOIN for fetching user names
      const [users] = await con.query(`SELECT t.*, u.first_name AS first_name,u.last_name AS last_name FROM tbl_transactions t JOIN tbl_user u ON t.user_id = u.user_id WHERE t.wallet_type = 'user' AND t.transaction_type = 'Withdrawal' AND t.transaction_mode = 'Bank' ORDER BY t.user_id DESC`);

      await con.commit();
       // console.log(users);
      // Pass both transaction details and user names to the render function
      res.render('superadmin/UserWithdrawRequest', { output: output, users });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
};

const changeUserWithdrawStatus = async (req, res, next) => {
  const con = await connection();
  const { id, status } = req.body; // Destructure ID and status from request body

  try {
      await con.beginTransaction();

      // Fetch transaction details
      const [[transaction]] = await con.query(`SELECT * FROM tbl_transactions WHERE transaction_id = ?`, [id]);
      const userID = transaction.user_id;

      // Fetch user details
      const [[existingUser]] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [userID]);
      // Calculate new wallet amount if the withdrawal is rejected
      if (status === 'Rejected') {
          const current_wallet_amount = parseFloat(existingUser.user_wallet);
          const withdrawal_amount = parseFloat(transaction.withdrawal_amount);
          const new_wallet_amount = current_wallet_amount + withdrawal_amount;

          // Update the user's wallet balance
          await con.query(`UPDATE tbl_user SET user_wallet = ? WHERE user_id = ?`, [new_wallet_amount, userID]);
      }

      // Update the transaction status
      await con.query(`UPDATE tbl_transactions SET status = ? WHERE transaction_id = ?`, [status, id]);

      await con.commit();
      res.json({ success: true, msg: `Transaction ${status} successfully` });
  } catch (error) {
      await con.rollback();
      console.error('Error:', error);
      res.status(500).json({ success: false, msg: 'Internal Server Error' });
  } finally {
      con.release();
  }
};

const fetchChartData = async (req, res, next) => {
  const con = await connection(); // Ensure you have the connection function ready
  try {
      await con.beginTransaction();

      // Queries for different counts
      const [[{ Pending_count }]] = await con.query(
          "SELECT COUNT(*) AS Pending_count FROM tbl_user WHERE user_type='Owner' AND status='Pending'"
      );
      const [[{ Approve_count }]] = await con.query(
          "SELECT COUNT(*) AS Approve_count FROM tbl_user WHERE user_type='Owner' AND status='Approve'"
      );
      const [[{ Disapprove_count }]] = await con.query(
          "SELECT COUNT(*) AS Disapprove_count FROM tbl_user WHERE user_type='Owner' AND status='Disapprove'"
      );

      // Prepare chart data
      const chartData = {
          labels: ['Disapproved', 'Approved', 'Pending'],
          data: [Disapprove_count, Approve_count, Pending_count],
          backgroundColors: ['#F06292', '#7986CB', '#FFD54F']
      };

      await con.commit(); // Commit transaction
      res.json(chartData); // Send JSON response
  } catch (error) {
      await con.rollback(); // Rollback transaction in case of error
      console.error('Error fetching chart data:', error);
      res.status(500).json({ error: 'Failed to fetch chart data' });
  } finally {
      con.release(); // Release the connection
  }
};

const fetchRideChartData = async (req,res,next) => {
    const con = await connection(); // Ensure you have the connection function ready
    try {
        await con.beginTransaction();

        const [[{ Pendings }]] = await con.query("SELECT COUNT(*) AS Pendings FROM tbl_bookings WHERE booking_status='Pending'");
        const [[{ On_Goings }]] = await con.query("SELECT COUNT(*) AS On_Goings FROM tbl_bookings WHERE booking_status IN ('On_Going','UserCheck_In','UserCheck_Out','OwnerCheck_In','OwnerCheck_Out')");
        const [[{ Cancelleds }]] = await con.query("SELECT COUNT(*) AS Cancelleds FROM tbl_bookings WHERE booking_status='Cancelled'");
        const [[{ Completeds }]] = await con.query("SELECT COUNT(*) AS Completeds FROM tbl_bookings WHERE booking_status='Completed'");
        const [[{ Confirms }]] = await con.query("SELECT COUNT(*) AS Confirms FROM tbl_bookings WHERE booking_status IN ('Confirmed')");

        const chartData = [
          { y: Completeds, label: "Completed" },
          { y: Cancelleds, label: "Cancelled" },
          { y: Confirms, label: "Confirmed" },
          { y: Pendings, label: "Pending" },
          { y: On_Goings, label: "On_Going" }
        ];
        await con.commit(); // Commit transaction
        res.json(chartData); // Send JSON response
    } catch (error) {
        await con.rollback(); // Rollback transaction in case of error
        console.error('Error fetching chart data:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    } finally {
        con.release(); // Release the connection
    }
}


const changeOwnerDocStatus = async (req, res, next) => {
  const con = await connection();

  const { id, status } = req.body;
  const time = new Date().toLocaleTimeString();
  const date = new Date().toISOString().split('T')[0]; // Format the date properly

  try {
    await con.beginTransaction();

    // Update the status in the database
    const updateSql = `UPDATE tbl_user SET owner_doc_status = ? WHERE user_id = ?`;
    await con.query(updateSql, [status, id]);

    let title1, body1;
    if (status === 'Verified') {
      title1 = "Owner Role Switch Request!";
      body1 = "Your request to become an owner has been successfully updated. Please switch to the owner role.";
    } else if (status === 'Unverified') {
      title1 = "Owner Role Switch Request!";
      body1 = "Your document could not be verified. Please review the requirements and resubmit the document for verification.";
    }

    const sql_notify = `INSERT INTO tbl_notification_list  (notification_type, booking_id, user_id, user_type, title, message, date, time)  VALUES ('Switch_Request', ?, ?, ?, ?, ?, ?, ?)  `;

    await con.query(sql_notify, [  0, id, 'User', title1, body1,  date, time, ]);

    // Send push notification
    sendSinglePushNotification({ user_id: id, title: title1, body: body1, });

    await con.commit();

    res.json({
      success: true,
      msg: `${status === 'Verified' ? 'Verifying' : 'Unverifying'} Document`,
    });
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);

    res.status(500).json({
      success: false,
      msg: 'Internal Server Error',
    });
  } finally {
    con.release();
  }
};

const graphUser = async (req, res, next) => {
  const con = await connection();
  const output= req.cookies.rental_msg || '';
  const currentDateTime = moment().tz("Asia/Hong_Kong").format('YYYY-MM-DD');
  
  try {

     await con.beginTransaction();
     
     const [users] = await con.query("SELECT * FROM tbl_user where user_type='User' And deleted='No' ORDER BY user_id DESC");
     // Queries for different counts and earnings
     const [[{ january_complaint }]] = await con.query("SELECT COUNT(*) AS january_complaint FROM tbl_user WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-01-01' AND '2024-01-31'");
     const [[{ february_complaint }]] = await con.query("SELECT COUNT(*) AS february_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-02-01' AND '2024-02-28' ");
     const [[{ march_complaint }]] = await con.query("SELECT COUNT(*) AS march_complaint FROM tbl_user WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-03-01' AND '2024-03-31'");
     const [[{ april_complaint }]] = await con.query("SELECT COUNT(*) AS april_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-04-01' AND '2024-04-31'");
     const [[{ may_complaint }]] = await con.query("SELECT COUNT(*) AS may_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-05-01' AND '2024-05-31' ");
     const [[{ june_complaint }]] = await con.query("SELECT COUNT(*) AS june_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-06-01' AND '2024-06-31'");
     const [[{ july_complaint }]] = await con.query("SELECT COUNT(*) AS july_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-07-01' AND '2024-07-31'");
     const [[{ august_complaint }]] = await con.query("SELECT COUNT(*) AS august_complaint FROM tbl_user WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-08-01' AND '2024-08-31'");
     const [[{ september_complaint }]] = await con.query("SELECT COUNT(*) AS september_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-09-01' AND '2024-09-31'");
     const [[{ october_complaint }]] = await con.query("SELECT COUNT(*) AS october_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-10-01' AND '2024-10-31'");
     const [[{ november_complaint }]] = await con.query("SELECT COUNT(*) AS november_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-11-01' AND '2024-11-31'");
     const [[{ december_complaint }]] = await con.query("SELECT COUNT(*) AS december_complaint FROM tbl_user  WHERE user_type='User' AND deleted='No' AND date BETWEEN '2024-12-01' AND '2024-12-31'");
    
     const [rawUserGraphData] = await con.query(
      "SELECT COUNT(*) AS value, status AS name FROM tbl_user WHERE user_type='User' AND deleted='No' GROUP BY status"
    );
    
    // Transform raw data into the desired format
    const formattedUserGraphData = [rawUserGraphData];
    console.log("dsg-->", formattedUserGraphData);
    console.log("userGraphData--->", JSON.stringify(formattedUserGraphData));
    
     await con.commit();    
     res.render('superadmin/graphUser',
      {output:output,
      users,
      start_date:currentDateTime, // Pass the start date back
      end_date: currentDateTime,     // Pass the end date back
      january_complaint,february_complaint, march_complaint, april_complaint,
      may_complaint,june_complaint,july_complaint,august_complaint,
      september_complaint,october_complaint,november_complaint,december_complaint,
      userGraphData: JSON.stringify(formattedUserGraphData) // Convert to JSON for frontend
     })
     
  } catch (error) {
    await con.rollback();
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};

//================================== END CONTROLLER +++++++++++++++++++++++++++++++++++++++++++++++++++

export {home, fetchChartData,fetchRideChartData, loginAdmin ,login , logout ,error404 , error500,  index,profile,profilePost,
  addUser, addUserPost ,checkemail,checkphonenumber,viewUsers ,changeUserStatus,deleteUser,user_withdrawal_report,
  deposit_to_User, withdrawal_to_User  , 
  addOwner , addUserOwner, viewOwners, changeOwnerStatus, deleteOwner , Owner_withdrawal_report, 
  deposit_to_Owner, withdrawal_to_Owner , OwnerWithdrawRequest, changeOwnerWithdrawStatus,UserWithdrawRequest,
  changeUserWithdrawStatus,changeOwnerDocStatus,

  pending_bookings, confirmed_bookings, ongoing_bookings, completed_bookings, cancelled_bookings,cancelBookingStatus,


  user_document_management,Owner_document_management,vehicleCategory,vehicleCategoryPost,
  vehicleModel,vehicleTypes,vehicleFeatures,viewVehicles,


  vehicleModelPost, updateModels, deleteMake, changeMakeStatus ,checkModel , checkMake , vehicleTypesPost, 
  vehicleFeaturesPost , checkType, UpdatevehicleTypes , changeTypeStatus , deleteVehicleType , 
  UpdateFeature ,changeFeatureStatus, deleteFeature , checkFeature , updateUser ,


  adduserAmount , adduserAmountPost , addownerAmount,addownerAmountPost ,changeLicenseStatus ,
   senddocNotification , updateOwner , senddocNotificationOwner ,promotional_plans ,promotional_plansPost ,
   discount_coupons, discount_couponsPost ,checkCoupanCode ,  changePlanStatus ,deletePlan, 
   changeCouponStatus, deleteCoupon , 
   changeVehicleStatus,deleteVehicle,


   addSubadmin , addCountry ,multi_currency ,general_setting ,addAppSlider ,notifications , 
   userRatings, ownerRatings,updateUserRating ,updateOwnerRating , affiliation , referralAmounts ,deposits_fee, users_faqs , owners_faqs,

   users_privacy_policy, owners_privacy_policy ,   users_terms_condition ,owners_terms_condition,
   inquiry_contacts,about_us,queries ,general_settingPost,addCountryPost , checkCountry,checkcountryCode,
   checkcurrencyName ,changeCountryStatus , deleteCountry ,addAppSliderPost , deleteSlider , 
   updateCountryDetails, notificationsPost ,affiliationPost ,deleteAcode ,   referralAmountsPost,deletereferrals ,
   deposits_feePost,deleteDepositeRate, addFAQ,deleteFAQ,editFAQ ,addPrivacyPolicy,deletePrivacyPolicy,
   deleteTerms,addTermsCondition ,deleteCancellationPolicy ,addCancellationPolicy ,owners_cancellation_policy ,users_cancellation_policy ,
   QueriesPost , sendMailtoUser, AftersendemailQuriesReload ,updateUserPic,updateAdmin ,changepass , 
   addAboutus,deleteAboutus ,showNotifications,

   ForgotPassword,sendOTP,verifyOTP,resetpassword ,inquiry_contactsPost , 
   checksubadminemail,checksubadminphonenumber ,checksubadminusername , 
   viewSubadmins ,updateSubadmin,changeSubadminStatus,deleteSubadmin , kilstream,deleteNotification,
   post_pending_bookings,post_confirm_bookings,post_ongoing_bookings,post_complete_bookings,post_cancel_bookings,
   postOwnerRatings,postUserRatings,

   graphUser,
} 