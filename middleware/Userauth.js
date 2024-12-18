import jwt from 'jsonwebtoken';
import connection from '../config.js';

const isAuthenticatedUser = async (req, res, next) => {
   // Print the entire req.body to debug
  
  const { user_type } = req.body; // Assuming 'type' is sent in the request body


  // If 'type' is present and is 'Guest', skip token verification
  if (user_type === 'Guest') {
    //console.log("gurest mode")
    return next();
  }

  // If 'type' is not present or any other type, proceed with token verification
  if (req.header('Authorization')) {
    var token = req.header('Authorization').replace('Bearer ', '');
  }

  const con = await connection();
  //console.log("jwt from user", token);

  if (!token) {
    return res.status(200).json({ result: 'Access denied. No token provided.' });
  }

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    const [result] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [decodedData.id]);
    //console.log(result[0]);
    req.user = result[0];

    next();
  } catch (error) {
    res.status(400).json({ result: 'Session Time Out!!' });
  } finally {
    con.release();
  }
};

export { isAuthenticatedUser };
