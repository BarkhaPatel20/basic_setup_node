import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '82.112.238.22',
  user: 'root',
  password: 'Kil@123456',
  //password: 'Kil@123456',
  port: '3306',
  database: 'car_rental',
  waitForConnections: true, // Enable queueing
  connectionLimit: 100, // Set an appropriate limit
  charset: 'utf8mb4'
});

const connection = () => {
  return pool.getConnection();
};

export default connection;
