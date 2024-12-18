// rateLimiter.js
const rateLimit = {};

function rateLimiter(req, res, next) {
  const userIP = req.ip;
  console.log("userIP--->",userIP);
  const currentTime = Date.now();
  const windowSize = 60000; // 1 minute window
  const maxRequests = 10;

  if (!rateLimit[userIP]) {
    rateLimit[userIP] = { count: 1, startTime: currentTime };
    console.log("IF--->");
    console.log("rateLimit[userIP]--->",rateLimit[userIP]);
  } else {
    if (currentTime - rateLimit[userIP].startTime < windowSize) {
      if (rateLimit[userIP].count >= maxRequests) {
        return res.status(429).send({result:'Too many requests. Please try again later.'});
      }
      rateLimit[userIP].count++;
    } else {
      rateLimit[userIP] = { count: 1, startTime: currentTime };
    }
    console.log("else--->");
    console.log("rateLimit[userIP]--->",rateLimit[userIP]);
  }
  next();
}

export {rateLimiter} ;
