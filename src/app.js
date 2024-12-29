const express = require('express');
const userRoutes = require('./routes/userRoutes'); // Supondo que as rotas de usuário estão em um arquivo separado
const produtoRoutes = require('./routes/produtoRoutes'); // Supondo que as rotas de produto estão em um arquivo separado
const clienteRoutes = require('./routes/clienteRoutes'); // Supondo que as rotas de produto estão em um arquivo separado
const gradeRoutes = require('./routes/gradeRoutes'); // Supondo que as rotas de produto estão em um arquivo separado
const impressoRoutes = require('./routes/impressoRoutes'); // Supondo que as rotas de produto estão em um arquivo separado

const cors = require('cors');
const app = express();
app.use(cors());

// Middleware para interpretar JSON no corpo das requisições
app.use(express.json());  // Certifique-se de que isso esteja antes das rotas


// Prefixo para as rotas
app.use('/api', userRoutes,);
app.use('/api', produtoRoutes);
app.use('/api', clienteRoutes);
app.use('/api', gradeRoutes);
app.use('/api', impressoRoutes);

// Rota de teste para garantir que o servidor está funcionando
app.get('/api/ping', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Status do Servidor</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #000000, #082032);
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    text-align: center;
                    padding: 20px;
                    border: 2px solid #fff;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    background: #1a1a40);
                }
                h1 {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                p {
                    font-size: 1.2rem;
                }
                .status {
                    font-weight: bold;
                    color: #1e5128;
                }
            </style>
        </head>
        <body>
            <div class="container">
            
                <h1>🚀 Servidor Online</h1>
                <strong><p>O serviço está <span class="status">ativo</span> e rodando com sucesso!</p></strong>
                <h2>🌎</h2>
                <h2>APIs - Alternativa</h2>
            </div>
        </body>
        </html>
    `);
});


module.exports = app;
