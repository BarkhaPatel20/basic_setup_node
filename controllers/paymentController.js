import axios from 'axios';
import connection from '../config.js';
import {decrypt64} from "../middleware/apihelper.js"

//const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Use live URL for production
const PAYPAL_API = 'https://api-m.paypal.com';

const tokenizeCard = async (req, res) => {
    try {
      const cardDetails = req.body;
  
      // Fetch credentials
      const con = await connection();
      const [[credentials]] = await con.query("SELECT * FROM tbl_important_credentials");
  
      if (!credentials) {
        throw new Error('PayPal credentials not found in the database');
      }
  
      const clientId = decrypt64(credentials.paypal_client_id);
      const secretKey = decrypt64(credentials.paypal_secret_key);
  
      console.log("Decrypted Client ID:", clientId);
      console.log("Decrypted Secret Key:", secretKey);
  
      // Step 1: Get PayPal access token
      const tokenResponse = await axios.post(
        `${PAYPAL_API}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: clientId,
            password: secretKey,
          },
        }
      );
  
      const accessToken = tokenResponse.data.access_token;
      console.log("Access Token:", accessToken);
  
      // Step 2: Tokenize the card
      const cardTokenResponse = await axios.post(
        `${PAYPAL_API}/v1/vault/credit-cards`,
        {
          number: cardDetails.cardNumber,
          type: cardDetails.cardType,
          expire_month: cardDetails.expireMonth,
          expire_year: cardDetails.expireYear,
          cvv2: cardDetails.cvv,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
  
      const tokenId = cardTokenResponse.data.id;
      console.log("Card Token ID:", tokenId);
  
      // Return the token ID
      res.json({ success: true, token: tokenId });
    } catch (error) {
      console.error('Error in tokenizeCard endpoint:', error.response?.data || error.message);
  
      if (error.response?.data?.error === 'invalid_client') {
        return res.status(400).json({ success: false, message: 'Invalid PayPal client ID or secret key.' });
      }
  
      res.status(500).json({ success: false, message: 'Failed to tokenize card. Please check your details and try again.' });
    }
  };
  
// Express endpoint for payment authorization
const authorizepayment = async (req, res) => {
    const { token, amount, currency } = req.body;
  
    try {
      // Fetch credentials
      const con = await connection();
      const [[credentials]] = await con.query("SELECT * FROM tbl_important_credentials");
  
      if (!credentials) {
        throw new Error('PayPal credentials not found in the database');
      }
  
      const clientId = decrypt64(credentials.paypal_client_id);
      const secretKey = decrypt64(credentials.paypal_secret_key);
  
      console.log("Decrypted Client ID:", clientId);
      console.log("Decrypted Secret Key:", secretKey);
  
      // Get PayPal access token
      const tokenResponse = await axios.post(
        `${PAYPAL_API}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: clientId,
            password: secretKey,
          },
        }
      );
  
      const accessToken = tokenResponse.data.access_token;
      console.log("Access Token:", accessToken);
  
      // Use the PayPal token for authorization
      const authorizationResponse = await axios.post(
        `${PAYPAL_API}/v1/payments/payment`,
        {
          intent: 'authorize',
          payer: {
            payment_method: 'credit_card',
            funding_instruments: [
              {
                credit_card_token: {
                  credit_card_id: token,
                },
              },
            ],
          },
          transactions: [
            {
              amount: {
                total: amount,
                currency: currency,
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
  console.log(transactions);
      res.json({ success: true, authorization: authorizationResponse.data });
    } catch (error) {
        console.error('Error in authorizepayment:', error.response?.data || error.message);
        
        // Log full response for debugging
        if (error.response?.data) {
          console.log("Full PayPal Response: ", JSON.stringify(error.response.data, null, 2));
        }
      
        if (error.response?.data?.error === 'invalid_client') {
          return res.status(400).json({ success: false, message: 'Invalid PayPal client ID or secret key.' });
        }
        
        res.status(500).json({ success: false, message: 'Failed to authorize payment.' });
      }
  };
  
export  {tokenizeCard , authorizepayment} ;

