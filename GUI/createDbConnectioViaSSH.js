import { createTunnel } from 'tunnel-ssh';
import mysql from 'mysql2/promise';

// SSH Tunnel Config
const tunnelOptions = {
    autoClose:true
  }
  
  const serverOptions = {
    port: process.env.DB_PORT
  }
  
  const sshOptions = {
    host: process.env.DB_SSH_HOST,
    port: 22,
    username: process.env.DB_SSH_USER,
    password: process.env.DB_SSH_PASSWORD
  }
  
  const forwardOptions = {
    srcAddr: '127.0.0.1',
    srcPort: process.env.DB_SSH_PORT,
    dstAddr: '127.0.0.1',
    dstPort: process.env.DB_SSH_PORT
  }
  
  let [server, conn] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
  
  server.on('connection', (connection) => {
    console.log("SSH Tunnel succesfully connected!");
  });
  
  // MySQL Config
export const db = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
  });