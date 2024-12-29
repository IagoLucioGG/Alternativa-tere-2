const mysql = require('mysql2');
require('dotenv').config();  // Carrega as variáveis de ambiente

// Criação da conexão com o MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,  // Deve ser 'root', ou o usuário configurado no .env
    password: process.env.DB_PASSWORD,  // A senha configurada no .env
    database: process.env.DB_NAME,  // O nome do banco de dados
    port: process.env.DB_PORT,  // A porta configurada no .env
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});


// Exporta a pool de conexões para uso no backend
module.exports = pool.promise();
