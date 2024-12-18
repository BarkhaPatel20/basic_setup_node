import connection from "../config.js";
import * as path from 'path';
import * as url from 'url';
import {sendTokenAdmin,sendTokenOwner} from "../utils/jwtToken.js";
import {hashPassword, comparePassword , senddocNotificationUser, encrypt,decrypt , encrypt64 ,decrypt64 } from '../middleware/helper.js'





import moment from 'moment-timezone';
// moment.tz.setDefault('Asia/Hong_Kong');

const __dirname = url.fileURLToPath(new URL('.',import.meta.url));


//=========================== Start Web  Services =============================



const home = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {

      await con.beginTransaction();
      res.render('owner/index',{output:output}) 
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
    res.render('owner/index1',{output:output}) 
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
  
    console.log("currentDateTime ->> " , currentDateTime)
  
    console.log("date ->> " , date)
  
    console.log("time ->> " , time)
    const con = await connection();

    try {
        await con.beginTransaction();
        res.render('owner/login',{'output':''})
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
      console.log(req.body);
      const con = await connection();
    
      const { email, password } = req.body;
    
      // If the user doesn't enter username or password
      if (!email || !password) {
        return res.render('owner/login', { 'output': 'Please Enter email and Password' });
      }
    
      const [results] = await con.query("SELECT * FROM tbl_user WHERE email = ? AND user_type = ?", [email,'Owner']);
      const owner = results[0];
  
      // If admin not found
      if (!owner) {
        return res.render('owner/login', { 'output': 'Account Not found' });
      }
  
      // Compare password
      const isValid = comparePassword(password, owner.password);
      console.log("isValid--> ", isValid);
  
      if (!isValid) {
        return res.render('owner/login', { 'output': 'Incorrect Password' });
      }
  
      // If login successful
      sendTokenOwner(owner, 200, res);
  
    } catch (error) {
      console.error('Error during login:', error);
      // Handle errors like database connection failure, unexpected errors, etc.
      res.render('owner/login', { 'output': 'An error occurred. Please try again later.' });
    }
  };


  const logout1 = async (req, res) => {
    const con = await connection();
    try {
        //const admin = req.admin; // Assuming you have middleware to verify and fetch admin info from JWT
  
        // Clear all active sessions for this admin
        await con.query('DELETE FROM active_sessions WHERE user_id = ?', [1]);
  
        // Clear the Owner_token cookie from the response
        res.clearCookie('Owner_token').redirect('/admin/login'); // Redirect to login page after logout
    } catch (error) {
        console.error('Error logging out admin:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  const logout = async (req, res) => {

          try {
            res.cookie("Owner_token",null,{
              expires : new Date(Date.now()),
              httpOnly:true
          })
          
          res.redirect('/owner/login')
    } catch (error) {
        console.error('Error logging out admin:', error);
        // res.cookie('rental_msg', 'Error logging out admin: : '+ error);
       res.render('owner/kil500', { output: `${error}` });
        // res.render('kil404', { output: `Requested Page or URL Not Found` });

        // res.redirect('/superadmin')
    }
  };
  
  
  

 const error404 = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();
     res.render('owner/error404',{'output':''})
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
     res.render('owner/error500',{'output':''})
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

     res.render('owner/profile',{output:output})

  } catch (error) {
     console.error('Error:',error);
     await con.rollback(); 
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const updateUserPic = async (req, res, next) => {
  console.log("sala ",req.file)
  const con = await connection();


  try {
    await con.beginTransaction();

    var image = req.admin.image

    if (req.file) {
      image = req.file.filename;
    }
    await con.query('UPDATE tbl_user SET image = ? WHERE admin_id  = ?', [image, req.admin.admin_id]);

    await con.commit();
    res.json({ msg: "success" })
  } catch (error) {
    await con.rollback();
    console.log("failed to update profile pic --> ", error)
    res.json({ msg: "failed" })
  } finally {
    con.release();
  }


}



const profilePost = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 

     res.render('owner/profile',{output:''})

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
      UPDATE tbl_user 
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
    res.redirect('/owner/profile')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('kil500', { output: `${error}` });
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
     // return res.render('owner/profile',{"output":"Old password is incorrect"})

      res.cookie('rental_msg', 'Old password is incorrect');
     return res.redirect('/owner/profile')
    }

    if(opass == cpass ){
      //return res.render('owner/profile',{"output":"New password cannot be the same as the old password."})

      res.cookie('rental_msg', 'New password cannot be the same as the old password.');
      return res.redirect('/owner/profile')
    }


    if (npass !== cpass) {
     // return res.render('owner/profile',{"output":"New password and confirm password do not match"})

      res.cookie('rental_msg', 'New password and confirm password do not match');
      return res.redirect('/owner/profile')
     
    }


    // if (opass !== existingPass) {    
    //   return res.render('owner/profile',{"output":"Old password is incorrect"})
    // }
    // if (npass !== cpass) {
    //  return res.render('owner/profile',{"output":"New password and confirm password do not match"})
     
    // }
   
    var hashedPass = hashPassword(cpass);
   
    await con.query('UPDATE tbl_user SET password = ? WHERE admin_id = ?', [hashedPass,req.admin.admin_id]);

        res.cookie("Owner_token",null,{
          expires : new Date(Date.now()),
          httpOnly:true
      })

    // passwordNotify(email)

    await con.commit();

    res.render('owner/login',{"output":"Password changed successfully", csrfToken:'' })
   
   
  } catch (error) {
    console.error('Error:', error);
    await con.rollback();
    res.cookie('rental_msg', `failed to Update Password ${error}`);
    return res.redirect('/owner/profile')
 
  }finally {
    con.release(); 
  }
};





//=========================  User Section Start ==========================================





const addUser = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 

     res.render('owner/addUser',{output:''})

  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const addUserPost = async (req, res, next) => {
  console.log(req.body);
  console.log(req.files);
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
      
          return res.render('owner/addUser', { output: 'Email already exists' });
      } else if (userResult2[0].count > 0) {
          await con.rollback();      
          return res.render('owner/addUser', { output: 'Mobile Number already exists' });
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

          console.log("User added successfully");
          return res.render('owner/addUser', { output: 'User Added successfully !!' });
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
     res.render('owner/viewUsers',{output:output,users})

     
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
    res.redirect('/owner/viewUsers')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('kil500', { output: `${error}` });
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


  





const user_withdrawal_report = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/user_withdrawal_report',{output:''})

     
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
     res.render('owner/user_document_management',{output:output,users})

     
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

    console.log("ecpired docs ", expiredDocs)



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

  console.log(req.body)

  try {
      await con.beginTransaction();



    //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    console.log("currentDateTime ->> " , currentDateTime)  
    console.log("date ->> " , kildate)  
    console.log("time ->> " , kiltime)
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
        console.log("email app notification ")
          await senddocNotificationUser([userInfo.email], message, 'Document Expiry Notification', attachments);
      }

      // If in-app notification is selected, insert into tbl_notification_list
      if (sendInApp) {
        console.log("in app notification ")
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

     res.render('owner/adduserAmount',{output:'',user:user , transactions})
     
  } catch (error) {
     console.error('Error:',error);
     await con.rollback();
     res.render('kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}


const adduserAmountPost = async(req,res,next) => {
  const con = await connection();

  console.log(req.body)

  const { new_credit_amount , user_id } = req.body
  const userTimezone = req.cookies.rental_time_zone || '';
  console.log("timezone of walledt --> ",userTimezone)

  try {
      await con.beginTransaction();

             //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    console.log("currentDateTime ->> " , currentDateTime)  
    console.log("date ->> " , kildate)  
    console.log("time ->> " , kiltime)
    //=================  Timzezone according to Client Location =========================

      const selectUserSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
      const [[userDetails]] = await con.query(selectUserSql, [user_id]);   
     var updated_wallet_amount = parseFloat(new_credit_amount)+ parseFloat(userDetails.user_wallet)  
     
     
     if(userDetails.status == 'Disapprove'){
      const selectUserTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
      const [transactions] = await con.query(selectUserTransactionSql, [user_id,'Owner']);   
      res.render('owner/adduserAmount',{output:"Can't credit to Disapproved Owner",user:userDetails , transactions})
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

        console.log("transactions --> ", transactions)

     await con.commit(); 
    const output = `Amount- ( ${parseFloat(new_credit_amount).toFixed(2)} ${req.currency} ) has been credited to ${user.first_name} ${user.last_name}'s Wallet successfully !`
     res.render('owner/adduserAmount',{output:output,user:user , transactions})
     
  } catch (error) {
    await con.rollback();
     console.error('Error:',error);
     res.render('kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}











//=====================  End Walledt Amount  =============================








//=========================  Owner Section Start ==========================================


const addOwner = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/addOwner',{output:''})
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const addUserOwner = async (req, res, next) => {
  console.log(req.body);
  console.log(req.files);
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
      
          return res.render('owner/addUser', { output: 'Email already exists' });
      } else if (userResult2[0].count > 0) {
          await con.rollback();      
          return res.render('owner/addUser', { output: 'Mobile Number already exists' });
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

          console.log("User added successfully");
          return res.render('owner/addUser', { output: 'Owner Added successfully !!' });
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
     res.render('owner/viewOwners',{output:output,owners})

     
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
    res.redirect('/owner/viewOwners')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('kil500', { output: `${error}` });
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

      console.log("Timezone for wallet ",userTimezone )
        

      const selectownerSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
      const [[owner]] = await con.query(selectownerSql, [user_id]);    


      const selectownerTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
      const [transactions] = await con.query(selectownerTransactionSql, [user_id,'Owner']); 

     await con.commit(); 

     res.render('owner/addownerAmount',{output:'',owner:owner , transactions})
     
  } catch (error) {
     console.error('Error:',error);
     await con.rollback();
     res.render('kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}




const addownerAmountPost = async(req,res,next) => {
  const con = await connection();

  console.log(req.body)

  const { new_credit_amount , user_id } = req.body
  const userTimezone = req.cookies.rental_time_zone || '';

  console.log("Timezone for wallet ",userTimezone )

  try {
      await con.beginTransaction();


       //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    console.log("currentDateTime ->> " , currentDateTime)  
    console.log("date ->> " , kildate)  
    console.log("time ->> " , kiltime)
    //=================  Timzezone according to Client Location =========================

    const selectownerTransactionSql = 'SELECT * FROM `tbl_transactions` WHERE user_id = ? AND  wallet_type =?  ORDER BY transaction_id DESC';
 

      const selectownerSql = 'SELECT * FROM `tbl_user` WHERE user_id = ?';
      const [[ownerDetails]] = await con.query(selectownerSql, [user_id]);   

      if(ownerDetails.status == 'Disapprove'){
        const [transactions] = await con.query(selectownerTransactionSql, [user_id,'Owner']);   
        res.render('owner/addownerAmount',{output:"Can't credit to Disapproved Owner",owner:ownerDetails , transactions})
      }


     var updated_wallet_amount = parseFloat(new_credit_amount)+ parseFloat(ownerDetails.user_wallet)   
     
      const updateQuery = `UPDATE tbl_user SET user_wallet = ? WHERE user_id = ?`;   
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
     res.render('owner/addownerAmount',{output:output,owner:owner , transactions})
     
  } catch (error) {
    await con.rollback();
     console.error('Error:',error);
     res.render('kil500', { output: `${error}` });
  } finally {
      con.release();
  }
}



const senddocNotificationOwner = async (req, res, next) => {
  const con = await connection();
  const { userId, expiredDocs, sendEmail, sendInApp, userTimezone } = req.body;

  console.log(req.body)

  try {
      await con.beginTransaction();



    //=================  Timzezone according to Client Location =========================
    const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
    const currentTime = moment().tz(userTimezone);
    const kildate = currentTime.format('YYYY-MM-DD');
    const kiltime = currentTime.format('hh:mm A');  
    console.log("currentDateTime ->> " , currentDateTime)  
    console.log("date ->> " , kildate)  
    console.log("time ->> " , kiltime)
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
        console.log("email app notification ")
          await senddocNotificationUser([userInfo.email], message, 'Document Expiry Notification', attachments);
      }

      // If in-app notification is selected, insert into tbl_notification_list
      if (sendInApp) {
        console.log("in app notification ")
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
     res.render('owner/Owner_withdrawal_report',{output:''})
     
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

      const [owners] = await con.query("SELECT * FROM tbl_user where user_type='Owner' ORDER BY user_id DESC");


    const currentDate = moment();
    owners.forEach(owner => {
        const userDocExpiry = moment(owner.owner_doc_expiry_date);
      

        // Calculate days until expiration
        owner.daysUntilDocExpiry = userDocExpiry.diff(currentDate, 'days');
       
    });



     await con.commit();    
     res.render('owner/Owner_document_management',{output:output,owners})

     
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
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/pending_bookings',{output:''})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const confirmed_bookings  = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/confirmed_bookings',{output:''})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const ongoing_bookings  = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/ongoing_bookings',{output:''})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const completed_bookings  = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/completed_bookings',{output:''})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const cancelled_bookings  = async(req,res,next) => {
  const con = await connection();
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/cancelled_bookings',{output:''})
     
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
  try {
      await con.beginTransaction();

     await con.commit(); 
     res.render('owner/vehicleCategory',{output:''})
     
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
     res.redirect('/owner/vehicleModel')
     //res.render('owner/vehicleCategory',{output:'Vehicle Make added successfully !!'})
     
  } catch (error) {
     console.error('Error:',error);
     res.render('kil500', { output: `${error}` });
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
     res.render('owner/vehicleModel',{output:output,makes})
     
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

  console.log(req.body)

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
      res.render('owner/vehicleModel', { output: 'Model added successfully !!',makes });
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
          res.render('owner/vehicleModel', { output: `${duplicateModels.join(', ')}- Model already exist !!`, makes: makes });
          return;
      }

      // If no duplicates, proceed to add new models to the existing array
      existingModels.push(...cleanedModels);

      // Update the database with the new model list
      await con.query("UPDATE tbl_make_models SET models_name = ? WHERE id = ?", [JSON.stringify(existingModels), vehical_make]);

      // Fetch the updated list of makes
      const [makes] = await con.query("SELECT id, make_name, models_name, make_image, status FROM tbl_make_models");

      await con.commit();
      res.render('owner/vehicleModel', { output: 'Models added successfully !!', makes });
  } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
};



const updateModels  = async(req,res,next) => {

  console.log("update Models --> ", req.body)
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
      console.log(req.body)
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
     res.render('owner/vehicleTypes',{output:output,types:types})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}


const checkType = async (req, res, next) => { 

  console.log(req.body)
   
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
     res.render('owner/vehicleTypes',{output:output,types:types})
     
  } catch (error) {
     console.error('Error:',error);
     res.render('kil500', { output: `${error}` });
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
    res.redirect('/owner/vehicleTypes')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('kil500', { output: `${error}` });
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
     res.render('owner/vehicleFeatures',{output:output, features:features})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }

}


const checkFeature = async (req, res, next) => { 

  console.log(req.body)
   
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
     res.render('owner/vehicleFeatures',{output:output,features:features})
     
  } catch (error) {
     console.error('Error:',error);
     res.render('kil500', { output: `${error}` });
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

    console.log("feature_imagefeature_image", feature_image)

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
    res.redirect('/owner/vehicleFeatures')


  } catch (error) {
    console.error('Error:', error);   
    await con.rollback(); // Rollback the transaction in case of error
    res.render('kil500', { output: `${error}` });
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
     res.render('owner/viewVehicles',{output:output , vehicles:vehicles})
     
  } catch (error) {
     console.error('Error:',error);
     res.render('kil500', { output: `${error}` });
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
     res.render('owner/promotional_plans',{output:output,plans:plans})
     
  } catch (error) {
     console.error('Error:',error);
     res.status(500).send('Internal Server Error');
  } finally {
      con.release();
  }
}



const promotional_plansPost = async (req, res, next) => {
  const con = await connection();
  console.log(req.body);
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
    res.render('owner/promotional_plans', { output: output, plans: plans });

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

    res.render('owner/discount_coupons', { output: output, coupons: coupons });

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
  console.log(req.body);
  try {
    await con.beginTransaction();
    const {coupon_title, coupon_code , coupon_max_amount, discount_rate,start_date ,end_date } = req.body; // Extract data from the request body

    // Insert new promotional plan into the table
    await con.query(
      "INSERT INTO tbl_coupons (coupon_title, coupon_code , coupon_max_amount, discount_rate,start_date ,end_date) VALUES (?, ?, ?, ? ,?, ?)",
      [coupon_title, coupon_code , coupon_max_amount, discount_rate,start_date ,end_date]
    );

    // Fetch all active promotional plans after insertion
    const [coupons] = await con.query("SELECT * FROM tbl_coupons WHERE deleted='No' ORDER BY coupon_id DESC");

    await con.commit();
    const output = 'Coupon Details Added successfully !'
    res.render('owner/discount_coupons', { output: output, coupons: coupons });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); // Rollback the transaction in case of error
    res.status(500).send('Internal Server Error');
  } finally {
    con.release();
  }
};



const checkCoupanCode = async (req, res, next) => { 

  console.log(req.body)
   
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
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('owner/addSubadmin', { output: '' });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };



  
  const addSubadminPost = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('owner/addSubadmin', { output: output, coupons: coupons });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/addCountry', { output: output,countries:countries });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };




  const checkCountry = async (req, res, next) => { 

    console.log(req.body)
     
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

    console.log(req.body)
     
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

    console.log(req.body)
     
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
        res.render('owner/addCountry', { output: "Country added successfully!", countries: countries });

    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('kil500', { output: `${error}` });
    } finally {
        con.release();
    }
};


const updateCountryDetails = async (req, res, next) => {

  const con = await connection();
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
      res.render('owner/addCountry', { output: "Country updated successfully!", countries: countries });

  } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/multi_currency', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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

        console.log("decyrptied stripe key-> ",credentials.stripe_secret_key)
      
  
        if (credentials.stripe_publish_key) {
          credentials.stripe_publish_key = decrypt64(credentials.stripe_publish_key); // Decrypt the map key for usage
        }
        console.log("decyrptied stripe_publish_key -> ",credentials.stripe_publish_key)
  
        if (credentials.paypal_client_id) {
          credentials.paypal_client_id = decrypt64(credentials.paypal_client_id); // Decrypt the map key for usage
        }
      
        console.log("decyrptied paypal_client_id -> ",credentials.paypal_client_id)
  
        if (credentials.paypal_secret_key) {
          credentials.paypal_secret_key = decrypt64(credentials.paypal_secret_key); // Decrypt the map key for usage
        }


        console.log("decyrptied paypal_secret_key -> ",credentials.paypal_secret_key)
      

      }


    
      

      await con.commit();
  
      res.render('owner/general_setting', { output: output,credentials:credentials });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };






const general_settingPost = async (req, res, next) => {
  const con = await connection();
  var output = req.cookies.rental_msg || '';

  // Destructure the form input values from the request body
  const { map_key, stripe_secret_key, stripe_publish_key, email_app_email, email_app_password,
     email_smtp_host, vat_tax_rate ,paypal_client_id,paypal_secret_key } = req.body;

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
        (map_key, stripe_secret_key, stripe_publish_key, email_app_email, email_app_password, email_smtp_host, vat_tax_rate,paypal_client_id,paypal_secret_key) 
        VALUES ( ?, ?, ?, ?, ?, ?, ?,?,?)
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
        encryptedpaypal_secret_key
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
    res.render('owner/general_setting', { output: output, credentials: req.body });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback();
    res.render('kil500', { output: `${error}` });
  } finally {
    con.release();
  }
};





  const addAppSlider = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();

      
      const [sliders] = await con.query(`
        SELECT * FROM tbl_slider ORDER BY id DESC`);
  
      res.render('owner/addAppSlider', { output: output ,sliders:sliders});
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
        

        res.render('owner/addAppSlider', { output: "Slider Added succesfully " ,sliders:sliders});

    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('kil500', { output: `${error}` });
    } finally {
        con.release();
    }
};


const addAppSliderPost = async (req, res, next) => {
  const con = await connection();
  const slider_image = req.file ? req.file.filename : null;

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

      res.render('owner/addAppSlider', { 
          output: "Slider added/updated successfully!", 
          sliders: sliders 
      });

  } catch (error) {
      console.error('Error:', error);
      await con.rollback();
      res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/notifications', { output: output,users:users,owners:owners });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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

        console.log("currentDateTime ->>", currentDateTime);
        console.log("date ->>", kildate);
        console.log("time ->>", kiltime);

        // Function to handle sending notifications to users/owners
        const kilsend = async (userIds, userType) => {
            for (let userId of userIds) {
                // Fetch user info for the current userId
                const [userInfo] = await con.query('SELECT email, user_type FROM tbl_user WHERE user_id = ?', [userId]);

                // Sending Email notification if selected
                if (sendEmail && userInfo.length > 0) {
                    console.log(`Sending email notification to ${userType} (ID: ${userId})...`);
                    await senddocNotificationUser(
                        [userInfo[0].email],
                        message,
                        title,
                        attachments
                    );
                }

                // Sending in-app notification if selected
                if (sendInApp && userInfo.length > 0) {
                    console.log(`Sending in-app notification to ${userType} (ID: ${userId})...`);
                    const notificationMessage = `Notification: ${message}`;
                    await con.query(
                        'INSERT INTO tbl_notification_list (notification_type, user_id, user_type, title, message, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        ['General_Notification', userId, userType, title, notificationMessage, kildate, kiltime]
                    );
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

        res.render('owner/notifications', { output: 'Notification sent successfully.',users:users,owners:owners });


    } catch (error) {
        await con.rollback();
        console.error('Error:', error);
        res.status(500).send({ message: `Failed to send notification. ${error.message}` });
    }
};






  const userRatings = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('owner/userRatings', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };



  const ownerRatings = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('owner/ownerRatings', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };








//===========================================================================

  const affiliation = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();

      const [affiliations] = await con.query(`SELECT * FROM tbl_affiliation_reward ORDER BY affiliation_id DESC`);
    
      await con.commit();
  
      res.render('owner/affiliation', { output: output, affiliations:affiliations });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
          console.log("second time ")
            // Step 3: Slider exists, perform UPDATE
            const affiliation_id = rows[0].affiliation_id;
            await con.query(
                "UPDATE tbl_affiliation_reward SET reward_limit = ?,reward_percentage=?,expiry_date = ?  WHERE affiliation_id = ?",
                [reward_limit,reward_percentage ,expiry_date, affiliation_id]
            );
        }
  

        const [affiliations] = await con.query(`SELECT * FROM tbl_affiliation_reward ORDER BY affiliation_id DESC`);
        await con.commit();
  
        res.render('owner/affiliation', { output: 'Affiliation Reward added successfully !', affiliations:affiliations });
  
    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/referralAmounts', { output: output ,referrals:referrals });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
          console.log("second time ")
            // Step 3: Slider exists, perform UPDATE
            const invite_id = rows[0].invite_id;
            await con.query(
                "UPDATE tbl_referral_amount SET inviter_amount = ?,signup_amount=?,expiry_date = ?  WHERE invite_id = ?",
                [inviter_amount,signup_amount ,expiry_date, invite_id]
            );
        }
  

        const [referrals] = await con.query(`SELECT * FROM tbl_referral_amount ORDER BY invite_id DESC`);
        await con.commit();

        res.render('owner/referralAmounts', { output: 'Referral amount added successfully !' ,referrals:referrals });
  
    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/deposits_fee', { output: output, rates:rates });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
          console.log("second time ")
            // Step 3: Slider exists, perform UPDATE
            const rate_id = rows[0].rate_id;
            await con.query(
                "UPDATE tbl_deposit_rate SET deposit_rate_per = ?,country_name=?  WHERE rate_id = ?",
                [deposit_rate_per ,req.body.country_name, rate_id]
            );
        }
  

        const [rates] = await con.query(`SELECT * FROM tbl_deposit_rate ORDER BY rate_id DESC`);
        await con.commit();
  
        
      res.render('owner/deposits_fee', { output: 'Affiliation Reward added successfully !', rates:rates });
  
    } catch (error) {
        console.error('Error:', error);
        await con.rollback();
        res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/users_faqs', { output: output, faqs:faqs });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/owners_faqs', { output: output, faqs:faqs });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  };





  
  //====================  Faq Section ===================================== 

  
  


const addFAQ = async (req, res, next) => {
  const con = await connection();

  console.log("req body ", req.body)

  try {
    await con.beginTransaction();

    // Extracting data from the request body
    const { faq, answer,faq_type } = req.body;

    // Insert the new FAQ into the tbl_faqs table
    await con.query('INSERT INTO tbl_faq (faq, answer,faq_type) VALUES (?,?,?)', [faq, answer,faq_type]);


    await con.commit();

    console.log(req.url)

          if(req.url == '/owners_faqs'){
            console.log("ownerrrrrrrrrrrrrrrrrr")
            const [faqs] = await con.query("SELECT * FROM tbl_faq where faq_type='Owner' ORDER BY created_at DESC"); 
            res.render('owner/owners_faqs', { output: 'Owner FAQ Added successfully', faqs:faqs });
          }else{

            console.log("userrrrrrrrrrrrrrrrrrrr")
            const [faqs] = await con.query("SELECT * FROM tbl_faq where faq_type='User' ORDER BY created_at DESC"); 
            res.render('owner/users_faqs', { 'faqs': faqs, 'output': ' User FAQ Added successfully' });
          }

   
  } catch (error) {
    await con.rollback();
    console.error('Error in addFAQ API:', error);
    res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/users_privacy_policy', { output: output , pandps:pandps });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/owners_privacy_policy', { output: output,pandps:pandps });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 




// Insert or Update Privacy Policy for User or Owner
const addPrivacyPolicy = async (req, res, next) => {
  const con = await connection();
  console.log("req body ", req.body)

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
      res.render('owner/owners_privacy_policy', { output: `${policyType} Privacy ${action}  successfully !!`,pandps:pandps });
    }else{

      const [pandps] = await con.query("SELECT * FROM tbl_pandp WHERE policy_type = 'User' ORDER BY id DESC");
      res.render('owner/users_privacy_policy', { output: `${policyType} Privacy ${action} successfully !!`,pandps:pandps });
    }

  } catch (error) {
    await con.rollback(); 
    console.log(error)
      res.render('kil500', { output: `${error}` });
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

    res.render('owner/users_cancellation_policy', { output: output , pandps:pandps });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); 
    res.render('kil500', { output: `${error}` });
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

    res.render('owner/owners_cancellation_policy', { output: output,pandps:pandps });

  } catch (error) {
    console.error('Error:', error);
    await con.rollback(); 
    res.render('kil500', { output: `${error}` });
  } finally {
    con.release();
  }
}; 




// Insert or Update Cancellation Policy for User or Owner
const addCancellationPolicy = async (req, res, next) => {
const con = await connection();
console.log("req body ", req.body)

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
    res.render('owner/owners_cancellation_policy', { output: `${policyType} Cancellation ${action}  successfully !!`,pandps:pandps });
  }else{

    const [pandps] = await con.query("SELECT * FROM tbl_cancellation_policy WHERE policy_type = 'User' ORDER BY id DESC");
    res.render('owner/users_cancellation_policy', { output: `${policyType} Cancellation ${action} successfully !!`,pandps:pandps });
  }

} catch (error) {
  await con.rollback(); 
  console.log(error)
    res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/users_terms_condition', { output: output , tandc:tandc });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/owners_terms_condition', { output: output,tandc:tandc });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 




// Insert or Update Terms Condition for User or Owner
const addTermsCondition = async (req, res, next) => {
  const con = await connection();
  console.log("req body ", req.body)

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
      res.render('owner/owners_terms_condition', { output: `${termType} Terms & Conditons  ${action}  successfully !!`,tandc:tandc });
    }else{

      const [tandc] = await con.query("SELECT * FROM tbl_tandc WHERE tandc_type = 'User' ORDER BY id DESC");
      res.render('owner/users_terms_condition', { output: `${termType} Terms & Conditons ${action} successfully !!`,tandc:tandc });
    }

  } catch (error) {
    await con.rollback(); 
    console.log(error)
      res.render('kil500', { output: `${error}` });
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




  

  
  const inquiry_contacts = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('owner/inquiry_contacts', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 



  
  const about_us = async (req, res, next) => {
    const con = await connection();
    const output= req.cookies.rental_msg || '';
    try {
      await con.beginTransaction();
    
      await con.commit();
  
      res.render('owner/about_us', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
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
  
      res.render('owner/queries', { output: output });
  
    } catch (error) {
      console.error('Error:', error);
      await con.rollback(); 
      res.render('kil500', { output: `${error}` });
    } finally {
      con.release();
    }
  }; 






  
  

  const queries = async (req, res, next) => {
    const con = await connection(); 
    const output= req.cookies.rental_msg || '';
    try {
        const [openedQueries] = await con.query('SELECT * FROM tbl_user_support WHERE status = ? AND user_type= ? AND owner_id= ? ORDER BY id DESC', ['opened','User',req.owner.user_id]);
        const [closedQueries] = await con.query('SELECT * FROM tbl_user_support WHERE status = ? AND user_type= ? AND owner_id= ? ORDER BY id DESC', ['closed','User',req.owner.user_id]);
        
        const allQueries = [...openedQueries, ...closedQueries];

        // Fetch conversation threads for each complain_number
        for (const query of allQueries) {
          const [threads] = await con.query('SELECT * FROM tbl_user_threads WHERE complain_number = ? ORDER BY id DESC', [query.complain_number]);
          
          var [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [query.user_id ]); 
       
         
          query.ticket_thread = threads;
          console.log("queryyyyyyyyyy ",query )

          var owner_name = `${req.owner.first_name} ${req.owner.last_name}`;     
          query.owner_name =  owner_name
        

          if(user.length>0){
            var customer_name = `${user[0].first_name} ${user[0].last_name}`;
            console.log(customer_name)
            query.customer_name =  customer_name
          }else{
            query.customer_name =  'Deleted User'
          }          
      }

        res.render('owner/queries', { "output": output, "queries": allQueries });
    } catch (error) {
      console.log("error in fetching queries Admin Panel -> ",error)
        res.render('owner/kilvish500');
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

  //const [results] = await con.query('UPDATE tbl_user_support SET status = ? WHERE id = ?', [newStatus, queryID]);

  const [results] = await con.query('UPDATE tbl_user_support SET status = ?, closed_by = ? WHERE id = ?', [newStatus, 'support_executive', queryID]);

      if(results){
          res.json({ msg: 'Action Taken on Query'})
   }
  } catch (error) {

    res.render('kil500', { output: `${error}` });
    
  }

     
  
}



const sendMailtoUser = async (req, res, next) => {
  const con = await connection();


  try {

    var userTimezone = moment.tz.guess();

        //=================  Timzezone according to Client Location =========================
        const currentDateTime = moment().tz(userTimezone).format('YYYY-MM-DD HH:mm:ss');  
        console.log("Timezone on server -> ",userTimezone )
        const currentTime = moment().tz(userTimezone);
        const kildate = currentTime.format('YYYY-MM-DD');
        const kiltime = currentTime.format('hh:mm A');  
        console.log("currentDateTime ->> " , currentDateTime)  
        console.log("date ->> " , kildate)  
        console.log("time ->> " , kiltime)
        //=================  Timzezone according to Client Location =========================


    await con.beginTransaction();

      const email = req.body.recipientEmail;
      const subject = req.body.emailSubject;
      const message = req.body.emailMessage;
      const ticket_number = req.body.ticket_number;

      const complain_number = ticket_number;


      const [Queries] = await con.query('SELECT * FROM tbl_user_support WHERE status IN (?, ?) ORDER BY id DESC', ['opened', 'closed']);

      const [queryResult] = await con.query('SELECT status, closed_by FROM tbl_user_support WHERE complain_number = ?', [ticket_number]);

      if (queryResult.length > 0) {
        const { status, closed_by } = queryResult[0];
  
        if (status === 'closed') {
          const replyMessage = `This ticket is closed by ${closed_by === 'support_executive' ? 'support executive' : 'user'}`;
  
          await con.commit();
          //return res.render('owner/queries', { "output": replyMessage, "queries": Queries });
          if (req.method === 'POST') {
          res.cookie('rental_msg', replyMessage);
          res.redirect('/owner/queries')
          }
        }
      }

     
      const userID = '0';
      const role = userID == '0' ? 'support_executive' : 'customer';

    //  const [kilresult] =  await con.query(
    //     'INSERT INTO tbl_user_threads (complain_number, user_id, role, message) VALUES (?, ?, ?, ?)',
    //     [complain_number, userID, role, message]
    //   );

    if (req.method === 'POST') {

      const [kilresult] = await con.query(
        'INSERT INTO tbl_user_threads (complain_number, user_id, role, message, date, time) VALUES (?, ?, ?, ?, ?, ?)',
        [complain_number, userID, role, message, kildate, kiltime]
      );     

      console.log("thread reply by admin --> ", kilresult)

    }
  
      await con.commit();


      // Call the responsetoQuery function to send an email
      //responsetoQuery(email, message, subject);

      // Fetch queries from the tbl_user_support table

    

      const [openedQueries] = await con.query('SELECT * FROM tbl_user_support WHERE status = ? AND user_type= ? AND owner_id= ? ORDER BY id DESC', ['opened','User',req.owner.user_id]);
      const [closedQueries] = await con.query('SELECT * FROM tbl_user_support WHERE status = ? AND user_type= ? AND owner_id= ? ORDER BY id DESC', ['closed','User',req.owner.user_id]);
      
      const allQueries = [...openedQueries, ...closedQueries];

      // Fetch conversation threads for each complain_number
      for (const query of allQueries) {
        const [threads] = await con.query('SELECT * FROM tbl_user_threads WHERE complain_number = ? ORDER BY id DESC', [query.complain_number]);
        
        var [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [query.user_id ]); 
     

        query.ticket_thread = threads;
        var owner_name = `${req.owner.first_name} ${req.owner.last_name}`;     
        query.owner_name =  owner_name

        if(user.length>0){
          
          var customer_name = `${user[0].first_name} ${user[0].last_name}`;
          query.customer_name =  customer_name
        }else{
          query.customer_name =  'Deleted User'
        }          
    }

    res.cookie('rental_msg', "Ticket Response Sent to " + email + " and User's Account Successfully");
    res.redirect('/owner/queries')

      // if (Queries) {
      //     res.render('owner/queries', { "output": "Ticket Response Sent to " + email + " and User's Account Successfully", "queries": allQueries });
      // } else {
      //     res.render('owner/queries', { "output": "Failed to send Email", "queries": allQueries });
      // }
  } catch (error) {
      console.error('Error in ThreadReply by Admin & sendMailtoUser API:', error);
     // res.status(500).json({ result: 'Internal Server Error' });
      res.cookie('rental_msg', "Failed to send Email");
      res.redirect('/owner/queries')

  } finally {
      con.release();
  }
};




const AftersendemailQuriesReload = async (req, res, next) => {
  const con = await connection(); 
  try {
    
    const [openedQueries] = await con.query('SELECT * FROM tbl_user_support WHERE status = ? AND user_type= ? AND owner_id= ? ORDER BY id DESC', ['opened','User',req.owner.user_id]);
    const [closedQueries] = await con.query('SELECT * FROM tbl_user_support WHERE status = ? AND user_type= ? AND owner_id= ? ORDER BY id DESC', ['closed','User',req.owner.user_id]);
      
      const allQueries = [...openedQueries, ...closedQueries];

      // Fetch conversation threads for each complain_number
      for (const query of allQueries) {
        const [threads] = await con.query('SELECT * FROM tbl_user_threads WHERE complain_number = ? ORDER BY id DESC', [query.complain_number]);
        
        var [user] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [query.user_id ]); 
     

        query.ticket_thread = threads;
        var owner_name = `${req.owner.first_name} ${req.owner.last_name}`;     
        query.owner_name =  owner_name

        if(user.length>0){
         
          var customer_name = `${user[0].first_name} ${user[0].last_name}`;
          query.customer_name =  customer_name
        }else{
          query.customer_name =  'Deleted User'
        }          
    }

      res.render('owner/queries', { "output": "", "queries": allQueries });
  } catch (error) {
    console.log("error in fetching queries Admin Panel -> ",error)
    res.render('kil500', { output: `${error}` });
  }
}























  




//================================== END CONTROLLER +++++++++++++++++++++++++++++++++++++++++++++++++++

export {home, loginAdmin ,login , logout ,error404 , error500,  index,profile,profilePost,
  addUser, addUserPost ,checkemail,checkphonenumber,viewUsers ,changeUserStatus,deleteUser,user_withdrawal_report,
  deposit_to_User, withdrawal_to_User  , 
  addOwner , addUserOwner, viewOwners, changeOwnerStatus, deleteOwner , Owner_withdrawal_report, 
  deposit_to_Owner, withdrawal_to_Owner , 

  pending_bookings, confirmed_bookings, ongoing_bookings, completed_bookings, cancelled_bookings,
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
   userRatings, ownerRatings  , affiliation , referralAmounts ,deposits_fee, users_faqs , owners_faqs,

   users_privacy_policy, owners_privacy_policy ,   users_terms_condition ,owners_terms_condition,
   inquiry_contacts,about_us,queries ,general_settingPost,addCountryPost , checkCountry,checkcountryCode,
   checkcurrencyName ,changeCountryStatus , deleteCountry ,addAppSliderPost , deleteSlider , 
   updateCountryDetails, notificationsPost ,affiliationPost ,deleteAcode ,   referralAmountsPost,deletereferrals ,
   deposits_feePost,deleteDepositeRate, addFAQ,deleteFAQ,editFAQ ,addPrivacyPolicy,deletePrivacyPolicy,
   deleteTerms,addTermsCondition ,deleteCancellationPolicy ,addCancellationPolicy ,owners_cancellation_policy ,users_cancellation_policy ,
   QueriesPost , sendMailtoUser, AftersendemailQuriesReload ,updateUserPic,updateAdmin ,changepass
  

} 