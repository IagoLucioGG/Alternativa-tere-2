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

// Função para cadastrar um usuário
const createUser = async (req, res) => {
    const { nomeUsuario, loginUsuario, senha, emailUsuario } = req.body;

    // Validações básicas
    if (!nomeUsuario || !loginUsuario || !senha) {
        return res.status(400).json({ message: 'Nome, login e senha são obrigatórios.' });
    }

    try {
        // Codifica a senha em MD5
        const senhaCodificada = crypto.createHash('md5').update(senha).digest('hex');

        // Insere o usuário no banco de dados
        const query = `
            INSERT INTO Usuario (nomeUsuario, loginUsuario, senha, emailUsuario, status, dataCriacao, token, dtExpiracaoToken)
            VALUES (?, ?, ?, ?, 'ativo', NOW(), ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
        `;

        const tokenBase64 = Buffer.from(`${loginUsuario}:${senhaCodificada}:${new Date().toISOString()}`).toString('base64');
        const tokenCompleto = `Basic ${tokenBase64}`;
        
        const emailParam = emailUsuario ? emailUsuario : null;

        const [result] = await db.query(query, [nomeUsuario, loginUsuario, senhaCodificada, emailParam, tokenCompleto]);

        // Retorna sucesso
        res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            userId: result.insertId,
        });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


// Função para fazer login
const loginUser = async (req, res) => {
    const { loginUsuario, senha } = req.body;

    // Validações básicas
    if (!loginUsuario || !senha) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        // Codifica a senha em MD5
        const senhaCodificada = crypto.createHash('md5').update(senha).digest('hex');

        // Consulta ao banco de dados para verificar se o usuário existe com a senha codificada
        const query = `
            SELECT * FROM Usuario 
            WHERE loginUsuario = ? AND senha = ?
        `;
        const [rows] = await db.query(query, [loginUsuario, senhaCodificada]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
        }

        if (rows[0].status == 'inativo') {
            return res.status(401).json({ message: 'Usuário Inativo' });
        }

        // Gerar o token: usuario + senhaCodificada codificado em Base64
        const token = Buffer.from(`${loginUsuario}:${senhaCodificada}:${new Date().toISOString()}`).toString('base64');
        const tokenCompleto = `Basic ${token}`;


        // Definir a data de expiração do token (1 semana a partir de agora)
        const dtExpiracaoToken = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 semana de validade
        const ultimoLogin = new Date(Date.now());

        // Atualizar o token e a data de expiração no banco de dados
        const updateTokenQuery = `
            UPDATE Usuario SET token = ?, dtExpiracaoToken = ?, ultimoLogin = ?
            WHERE loginUsuario = ?
        `;
        await db.query(updateTokenQuery, [tokenCompleto, dtExpiracaoToken, ultimoLogin, loginUsuario]);

        // Retorna sucesso e o token gerado
        res.status(200).json({
            message: 'Usuário válido.',
            token: tokenCompleto,
            dtExpiracaoToken: dtExpiracaoToken
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


// Função para editar um usuário
const editUser = async (req, res) => {
    const { idUsuario } = req.params;
    const { nomeUsuario, loginUsuario, senha, emailUsuario, senhaAtual } = req.body;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    // Validações básicas
    if (!senhaAtual) {
        return res.status(400).json({ message: 'Senha atual é obrigatória.' });
    }

    try {
        // Consulta ao banco para verificar se o token corresponde ao usuário
        const query = `
            SELECT * FROM Usuario WHERE  senha = ?
        `;

        const senhaCodificada = crypto.createHash('md5').update(senhaAtual).digest('hex')
        const [rows] = await db.query(query, [senhaCodificada]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Senha atual incorreta.' });
        }


        // Atualiza os dados do usuário
        const updateQuery = `
            UPDATE Usuario SET
                nomeUsuario = COALESCE(?, nomeUsuario),
                loginUsuario = COALESCE(?, loginUsuario),
                senha = COALESCE(?, senha),
                emailUsuario = COALESCE(?, emailUsuario)
            WHERE idUsuario = ?
        `;
        await db.query(updateQuery, [
            nomeUsuario || null,
            loginUsuario || null,
            senha ? crypto.createHash('md5').update(senha).digest('hex') : null,
            emailUsuario || null,
            idUsuario,
        ]);

        // Retorna sucesso
        res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Função para inativar um usuário
const inativarUsuario = async (req, res) => {
    const { idUsuario } = req.params;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    try {
        // Consulta ao banco para verificar se o token corresponde ao usuário
        const query = `
            SELECT * FROM Usuario WHERE idUsuario = ?
        `;
        const [rows] = await db.query(query, [idUsuario, tokenBase64]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        if (rows[0].status == 'inativo') {
            return res.status(404).json({ message: 'Usuário já está inativado' });
        }

        // Inativa o usuário
        const updateQuery = `
            UPDATE Usuario SET status = 'inativo' WHERE idUsuario = ?
        `;
        await db.query(updateQuery, [idUsuario]);

        // Retorna sucesso
        res.status(200).json({ message: 'Usuário inativado com sucesso.' });
    } catch (error) {
        console.error('Erro ao inativar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const ativarUsuario = async (req, res) => {
    const { idUsuario } = req.params;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    try {
        // Consulta ao banco para verificar se o token corresponde ao usuário
        const query = `
            SELECT * FROM Usuario WHERE idUsuario = ?
        `;
        const [rows] = await db.query(query, [idUsuario, tokenBase64]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        if (rows[0].status == 'ativo') {
            return res.status(404).json({ message: 'Usuário já está ativado' });
        }

        // Ativa o usuário
        const updateQuery = `
            UPDATE Usuario SET status = 'ativo' WHERE idUsuario = ?
        `;
        await db.query(updateQuery, [idUsuario]);

        // Retorna sucesso
        res.status(200).json({ message: 'Usuário ativado com sucesso.' });
    } catch (error) {
        console.error('Erro ao ativar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Função para consultar a lista de usuários
const consultarUsuarios = async (req, res) => {
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    try {
        // Consulta ao banco de dados para obter todos os usuários
        const query = `
            SELECT idUsuario, nomeUsuario, loginUsuario, emailUsuario, status, dataCriacao, ultimoLogin FROM Usuario
        `;
        const [rows] = await db.query(query);

        // Retorna a lista de usuários
        res.status(200).json({ usuarios: rows });
    } catch (error) {
        console.error('Erro ao consultar lista de usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const consultarUsuariosId = async (req, res) => {
    const { idUsuario } = req.params;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    try {
        // Consulta ao banco de dados para obter todos os usuários
        const query = `
            SELECT idUsuario, nomeUsuario, loginUsuario, emailUsuario, status, dataCriacao, ultimoLogin FROM Usuario where idUsuario = ?
        `;
        const [rows] = await db.query(query, [idUsuario]);

        // Retorna a lista de usuários
        res.status(200).json({ usuarios: rows });
    } catch (error) {
        console.error('Erro ao consultar lista de usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

module.exports = { createUser, loginUser, editUser, inativarUsuario, ativarUsuario, consultarUsuarios, consultarUsuariosId };


