
import jwt from 'jsonwebtoken';
import connection from '../config.js';
import dotenv from 'dotenv'
dotenv.config({path:"./config.env"});

const con = await connection();

const sendTokenAdmin = (admin, statusCode, res)=>{
    const token =  getJWTToken(admin.admin_id ); 
    //options for tokens  
        const options = {
            expires: new Date(
                Date.now() + process.env.COOKIE_EXPIRE*24*60*60*1000
            ), 
            httpOnly:true
        }      
    res.status(statusCode).cookie('Admin_token',token,options).redirect('/superadmin')      
}


// JWT Token for Sub Admin 

const sendTokenSubAdmin = (subadmin , statusCode , res)=>{
    const token = getJWTToken(subadmin.id);
    const options = {
        expires : new Date (
            Date.now()+process.env.COOKIE_EXPIRE*24*60*60*1000
        ), 
        httpOnly:true
    }
    res.status(statusCode).cookie('SubAdmin_Token',token,options).redirect('/subadmin')
}


// Creating Token and saving in Cookie for user 
const sendTokenUser = (user,type, statusCode, res)=>{ 
    const token =  getJWTToken(user.user_id); 
    //options for tokens  
        const options = {
            expires: new Date(
                Date.now() + process.env.COOKIE_EXPIRE*24*60*60*1000
            ), 
            httpOnly:true
        }                 
        //res.redirect('/user/home/')
        ////console.log("login success", user.user_id)
       res.status(statusCode).cookie('token',token,options).json({ result: "success","user_id":user.user_id,"JWT":token,type:type});       
}


const sendTokenOwner = (owner, statusCode, res)=>{   
    const token =  getJWTToken(owner.user_id ); 
    //options for tokens  
        const options = {
            expires: new Date(
                Date.now() + process.env.COOKIE_EXPIRE*24*60*60*1000
            ), 
            httpOnly:true
        }      
    res.status(statusCode).cookie('Owner_token',token,options).redirect('/owner')      
}

function getJWTToken(id){ 
    return jwt.sign({id:id},process.env.JWT_SECRET,{ expiresIn: process.env.JWT_EXPIRE })
}

export {sendTokenUser , sendTokenAdmin , sendTokenSubAdmin , sendTokenOwner}
