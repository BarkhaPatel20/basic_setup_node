import http from 'http';
import https from 'https';
import express from 'express';
import * as url from 'url';
import * as path from 'path';
import fs from 'fs';
import cookie from 'cookie-parser';
import dotenv from 'dotenv'
import connection from "./config.js";
import requestIp from "request-ip";
import csurf from "csurf";

import SuperAdminRouter from "./routes/superadminRoute.js";

import ownerRouter from "./routes/ownerRoute.js";

import PaymentRouter from "./routes/paymentRouter.js"

import ApiRouter from "./routes/apiRoute.js";

import IndexRouter from "./routes/indexRoute.js";

import initializeChatService from './controllers/chatSocket.js'; 

import kilsocket from './controllers/websocket.js';


dotenv.config({path:"./config.env"});

//---------------Import Section Finish ----------------
const app = express();
const server = http.createServer(app);
// const sslOptions = {
//   key: fs.readFileSync('/etc/letsencrypt/live/jouner.com/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/jouner.com/fullchain.pem'),
// };

// const server = https.createServer(sslOptions,app);


const port = 3000;
const __dirname = url.fileURLToPath(new URL('.',import.meta.url));

//----------------------  global  Middleware start ----------------
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookie());
app.use(requestIp.mw());

//========== CSRF Start Middleware ======================
// const csrfMiddleware = csurf({
//   cookie: {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production', // Only secure in production
//     sameSite: 'strict',
//   },
// });

//========== CSRF End ======================

//========== CSRF Start Middleware ======================

// Define CSRF middleware with cookie
const csrfMiddleware = csurf({ cookie: true });

// Skip CSRF for specific routes by using a condition
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // Skip CSRF for /api and / routes
  }
  csrfMiddleware(req, res, next); // Apply CSRF protection for other routes
});

// Set csrfToken for the rest of the routes (only where CSRF protection is applied)
app.use((req, res, next) => {
  if (!(req.path.startsWith('/api'))) {
    res.locals.csrfToken = req.csrfToken(); // Set csrfToken for non-skipped routes
  }
  next();
});


//========== CSRF End ======================

app.use(async (req, res, next) => {

    const con = await connection();
    try {
    
      app.locals.host  =  process.env.Host;
      app.locals.currentUrl = req.originalUrl;

      const [locations] = await con.query('SELECT * FROM tbl_locations');
      app.locals.locations = locations;        

      app.locals.dashboard_type = 'User';
      
      req.locations = locations;


      app.locals.currency  =  process.env.currency;
      req.currency = process.env.currency;

      const [Notifications] = await con.query("SELECT * FROM tbl_notification_list where user_type='Admin' And read_status='No' ORDER BY user_id DESC LIMIT 5");
      const [notificationsCount] = await con.query("SELECT count(*) as notifyCount FROM tbl_notification_list where user_type='Admin' And read_status='No' ORDER BY user_id DESC");
  
      app.locals.Notifications = Notifications;   
      app.locals.notificationsCount = notificationsCount[0].notifyCount;

      next();
    } catch (error) {
      console.error('Global Variables Error ->> :', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      con.release(); // Release the connection back to the pool
    }
    
  });

  

app.use('/owner',ownerRouter);
app.use('/superadmin',SuperAdminRouter);
app.use('/api',ApiRouter);
app.use('/paymentapi',PaymentRouter)
app.use('/',IndexRouter);

app.set("view engine","ejs");
app.set("views",[
    path.join(__dirname,"./views"),
    path.join(__dirname,"./views/superadmin"),
    path.join(__dirname,"./views/owner"),
    path.join(__dirname,"/views/api"),
    path.join(__dirname,"/views/paymentapi"),
])

app.get('/api', (req, res) => {
  res.json({ message: 'Hello, World!' });
});




//==================================================

//------Kil Socket -------
initializeChatService(server);

//kilsocket(server)

server.listen(port,() => {
    console.log(`Server is running on port ${port}`);
})

