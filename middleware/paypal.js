//paypal.js
import paypal from '@paypal/checkout-server-sdk';
import connection from '../config.js';
import { decrypt64 } from './apihelper.js';

let paypalClient = null; // Cache the PayPal client to avoid multiple initializations

// Function to initialize and return the PayPal client
const getPaypalClient = async () => {
  if (paypalClient) {
    return paypalClient; // Return cached client if already initialized
  }

  const con = await connection();
  try {
    const [[credentials]] = await con.query("SELECT * FROM tbl_important_credentials");

    if (credentials) {
      // Decrypt PayPal client ID and secret key
      const clientId = decrypt64(credentials.paypal_client_id);
      const secretKey = decrypt64(credentials.paypal_secret_key);

      console.log("Decrypted PayPal Client ID:", clientId);
      console.log("Decrypted PayPal Secret Key:", secretKey);

      // Set up the PayPal environment (sandbox or live)
      const environment = new paypal.core.SandboxEnvironment(clientId, secretKey);

      // Create PayPal client
      paypalClient = new paypal.core.PayPalHttpClient(environment);
      return paypalClient;
    } else {
      throw new Error("PayPal credentials not found in the database");
    }
  } catch (error) {
    console.error("Error setting up PayPal client:", error);
    throw error;
  } finally {
    if (con) con.release(); // Release the database connection
  }
};

export { getPaypalClient };
