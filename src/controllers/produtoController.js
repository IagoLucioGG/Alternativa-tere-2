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

// Função para cadastrar um produto
const createProduct = async (req, res) => {
    const { nomeProduto, vlProduto, codigoEan } = req.body;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    // Validações básicas
    if (!nomeProduto || !vlProduto) {
        return res.status(400).json({ message: 'Nome e valor do produto são obrigatórios.' });
    }

    try {
        // Seleciona o próximo código único para o produto
        const [rows] = await db.query('SELECT MAX(CodigoProduto) AS Codigo FROM Produto');
        const codigoSequencial = (rows[0].Codigo || 0) + 1;

        // Insere o produto no banco de dados
        const query = `
            INSERT INTO Produto (nomeProduto, codigoProduto, vlProduto, ean12, status)
            VALUES (?, ?, ?, ?, 'ativo')
        `;

        const [result] = await db.query(query, [nomeProduto, codigoSequencial, vlProduto, codigoEan || null]);

        // Retorna sucesso
        res.status(201).json({
            message: 'Produto cadastrado com sucesso!',
            produtoCadastrado: {
                idProduto: result.insertId
            }
        });
    } catch (error) {
        console.error('Erro ao cadastrar produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


const consultarProdutos = async (req, res) => {
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        
        
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    const { status, nomeProduto, codigoProduto } = req.query;

    let query = `
        SELECT IdProduto, NomeProduto, CodigoProduto, VlProduto, Ean12, Status FROM Produto
    `;

    const conditions = [];
    if (status) conditions.push(`Status = '${status}'`);
    if (nomeProduto) conditions.push(`NomeProduto LIKE '%${nomeProduto}%'`);
    if (codigoProduto) conditions.push(`CodigoProduto = '${codigoProduto}'`);

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
        const [rows] = await db.query(query);

        // Retorna a lista de produtos
        res.status(200).json({ produtos: rows });
    } catch (error) {
        console.error('Erro ao consultar lista de produtos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


const consultarProdutoId = async (req, res) => {
    const { idProduto } = req.params;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição
    
    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    try {
        // Consulta ao banco de dados para obter todos os produtos
        const query = `
            SELECT IdProduto, NomeProduto, CodigoProduto, VlProduto, Ean12, Status  FROM Produto where idProduto = ?
        `;
        const [rows] = await db.query(query,[idProduto]);

        // Retorna a lista de usuários
        res.status(200).json({ produto: rows });
    } catch (error) {
        console.error('Erro ao consultar lista de usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


const editProduto = async (req, res) => {
    const { idProduto } = req.params;
    const {NomeProduto, VlProduto, Ean12, Status } = req.body;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    try {
        // Consulta ao banco para verificar se o token corresponde ao usuário
        const query = `
            SELECT * FROM Produto WHERE  idProduto = ?
        `;

        
        const [rows] = await db.query(query, [idProduto]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Produto não encontrado no banco de dados' });
        }


        // Atualiza os dados do usuário
        const updateQuery = `
            UPDATE Produto SET
                NomeProduto = COALESCE(?, NomeProduto),
                VlProduto = COALESCE(?, VlProduto),
                Ean12 = COALESCE(?, Ean12),
                Status = COALESCE(?, Status)
            WHERE idProduto = ?f
        `;
        await db.query(updateQuery, [
            NomeProduto || null,
            VlProduto || null,
            Ean12 || null,
            Status || null,
            idProduto
        ]);

        // Retorna sucesso
        res.status(200).json({ message: 'Produto atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao editar Produto:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};






module.exports = { createProduct, consultarProdutos, consultarProdutoId, editProduto };
