import jwt from 'jsonwebtoken'
import connection  from '../config.js'

const isAuthenticatedOwner = async (req, res, next) => {
    const { Owner_token } = req.cookies;

    if (!Owner_token) {
        return res.redirect('/owner/login');
    }

    try {
        const decodedData = jwt.verify(Owner_token, process.env.JWT_SECRET);
        const con = await connection();
        const [results] = await con.query('SELECT * FROM tbl_user WHERE user_id = ?', [decodedData.id]);
    
            req.owner = results[0];
            res.app.locals.loggeduser = req.owner; 
            next();
    } catch (error) {
        return res.redirect('/owner/login');
    }
};

export  {isAuthenticatedOwner}