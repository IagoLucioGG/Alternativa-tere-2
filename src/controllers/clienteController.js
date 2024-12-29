const crypto = require('crypto'); // Para codificar a senha
const db = require('../config/db');


// Função para validar o token
const validarToken = async (tokenBase64) => {
    try {
        // Verifica se o token existe na tabela Usuario e se não expirou
        const query = `
            SELECT * FROM Usuario 
            WHERE token = ? AND dtExpiracaoToken > NOW()
        `;
        const [rows] = await db.query(query, [tokenBase64]);

        // Retorna true se o token for válido e não expirado
        return rows.length > 0;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
};

const createClient = async (req, res) => {
    const { nomeCliente, telefoneCliente, endereco } = req.body;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    // Validações básicas
    if (!nomeCliente || !telefoneCliente || !endereco) {
        return res.status(400).json({ message: 'Nome, telefone e endereço do cliente são obrigatórios.' });
    }

    try {

        // Insere o cliente no banco de dados
        const query = `
            INSERT INTO cliente ( nomeCliente, telefoneCliente, dataCriacao, endereco )
            VALUES (?, ?, NOW(), ?)
        `;

        const [result] = await db.query(query, [nomeCliente, telefoneCliente, endereco]);

        // Retorna sucesso
        res.status(201).json({
            message: 'Cliente cadastrado com sucesso!',
            clienteCadastrado: {
                clientId: result.insertId
            }
        });
    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


const editClient = async (req, res) => {
    const { idCliente } = req.params;
    const {nomeCliente, telefoneCliente, endereco } = req.body;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    try {
        // Consulta ao banco para verificar se o token corresponde ao usuário
        const query = `
            SELECT * FROM Cliente WHERE  idCliente = ?
        `;

        
        const [rows] = await db.query(query, [idCliente]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'cliente não encontrado no banco de dados' });
        }


        // Atualiza os dados do usuário
        const updateQuery = `
            UPDATE Produto SET
                nomeCliente = COALESCE(?, nomeCliente),
                telefoneCliente = COALESCE(?, telefoneCliente),
                endereco = COALESCE(?, endereco),
            WHERE idCliente = ?
        `;
        await db.query(updateQuery, [
            nomeCliente || null,
            telefoneCliente || null,
            endereco || null,
            idCliente
        ]);

        // Retorna sucesso
        res.status(200).json({ message: 'Cliente atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao editar Cliente:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const consultarClientes = async (req, res) => {
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    const { nomeCliente, telefoneCliente, endereco } = req.query;

    let query = `
        SELECT idCliente, nomeCliente, telefoneCliente, endereco FROM Cliente
    `;

    const conditions = [];
    if (nomeCliente) conditions.push(`nomeCliente like '%${nomeCliente}%'`);
    if (telefoneCliente) conditions.push(`telefoneCliente = '${telefoneCliente}'`);
    if (endereco) conditions.push(`endereco LIKE '%${endereco}%'`);

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
        const [rows] = await db.query(query);

        // Retorna a lista de produtos
        res.status(200).json({ clientes: rows });
    } catch (error) {
        console.error('Erro ao consultar lista de clientes:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};



module.exports = { createClient, editClient, consultarClientes };