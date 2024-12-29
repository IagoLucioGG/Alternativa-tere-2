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

const cadastrarGrade = async (req, res) => {
    const { idCliente, dataPrevistaEncerramento, itens } = req.body;
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    let connection; // Conexão para transação

    try {
        // Decodifica o token Base64
        const tokenDecoded = Buffer.from(tokenBase64.split(' ')[1], 'base64').toString('utf-8');
        const [loginUsuario] = tokenDecoded.split(':'); // Extrai o login do usuário
        const queryUsuario = 'SELECT idUsuario FROM Usuario WHERE loginUsuario = ?';
        const [usuarios] = await db.query(queryUsuario, [loginUsuario]);

        if (!usuarios.length) {
            return res.status(401).json({ message: 'Usuário não encontrado ou não autorizado.' });
        }

        const usuarioCriador = usuarios[0].idUsuario; // ID do usuário logado
        const queryCliente = 'SELECT idCliente FROM cliente WHERE idCliente = ?';
        const [idClienteValido] = await db.query(queryCliente, [idCliente]);

        if(!idClienteValido.length){
            console.log('Cliente não existente na base: ' + idCliente)
            return res.status(400).json({ message: 'Cliente não identificado' });
        }

        // Validações básicas
        if (!idCliente || !itens || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ message: 'Cliente e itens da grade são obrigatórios.' });
        }

        // Obtém uma conexão para transação
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Inserção na tabela grade
        const queryGrade = `
            INSERT INTO grade (idCliente, status, dataCriacao, dataPrevistaEncerramento, UsuarioCriador)
            VALUES (?, 'A', NOW(), ?, ?)
        `;
        const [resultGrade] = await connection.query(queryGrade, [idCliente, dataPrevistaEncerramento, usuarioCriador]);

        const idGrade = resultGrade.insertId; // ID da grade criada

        // Inserção na tabela gradeitem para cada item enviado
        const queryGradeItem = `
            INSERT INTO gradeitem (idGrade, idProduto, VlProduto, qtProduto)
            VALUES (?, ?, ?, ?)
        `;

        for (const item of itens) {
            const { idProduto, VlProduto, qtProduto } = item;

            if (!idProduto || !VlProduto || !qtProduto) {
                throw new Error('Todos os itens precisam de idProduto, VlProduto e qtProduto.');
            }

            await connection.query(queryGradeItem, [idGrade, idProduto, VlProduto, qtProduto]);
        }

        // Confirma a transação
        await connection.commit();

        // Resposta de sucesso
        res.status(201).json({
            message: 'Grade cadastrada com sucesso!',
            gradeCadastrada: {
                idGrade,
                status: 'A',
                dataCriacao: new Date(),
                itensCadastrados: itens.length,
            },
        });
    } catch (error) {
        // Reverte a transação em caso de erro
        if (connection) await connection.rollback();

        console.error('Erro ao cadastrar grade:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.release(); // Libera a conexão
    }
};


const consultarGrades = async (req, res) => {
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    const { dataInicio, dataFim, status, idCliente, idProduto } = req.query;

    try {
        // Monta a query principal com filtros opcionais
        let queryGrade = `
            SELECT g.idGrade, g.status AS Status,
                g.idCliente, C.nomeCliente, C.telefoneCliente, C.endereco,
                g.dataCriacao AS DataCriacao,
                g.dataPrevistaEncerramento AS DataPrevistaEncerramento, g.dataEncerramento AS DataEncerramento,
                g.UsuarioCriador, g.UsuarioEncerramento,
                uc.loginUsuario AS CriadorLogin, uc.status AS CriadorStatus,
                ue.loginUsuario AS EncerradorLogin, ue.status AS EncerradorStatus
            FROM grade g
            LEFT JOIN Cliente C ON g.idCliente = C.idCliente
            LEFT JOIN Usuario uc ON g.UsuarioCriador = uc.idUsuario
            LEFT JOIN Usuario ue ON g.UsuarioEncerramento = ue.idUsuario
            WHERE 1=1
        `;

        const queryParams = [];

        if (dataInicio) {
            queryGrade += ' AND g.dataCriacao >= ?';
            queryParams.push(dataInicio);
        }

        if (dataFim) {
            queryGrade += ' AND g.dataCriacao <= ?';
            queryParams.push(dataFim);
        }

        if (status) {
            queryGrade += ' AND g.status = ?';
            queryParams.push(status);
        }

        if (idCliente) {
            queryGrade += ' AND g.idCliente = ?';
            queryParams.push(idCliente);
        }

        const [grades] = await db.query(queryGrade, queryParams);

        // Itera sobre cada grade para buscar seus itens
        const gradesCompletas = await Promise.all(
            grades.map(async (grade) => {
                let queryItens = `
                    SELECT gi.idGradeItem, gi.idProduto, gi.qtProduto AS Quantidade, gi.VlProduto,
                        p.NomeProduto, p.status AS ProdutoStatus
                    FROM gradeitem gi
                    JOIN Produto p ON gi.idProduto = p.idProduto
                    WHERE gi.idGrade = ?
                `;

                const itemParams = [grade.idGrade];

                if (idProduto) {
                    queryItens += ' AND gi.idProduto = ?';
                    itemParams.push(idProduto);
                }

                const [itens] = await db.query(queryItens, itemParams);

                return {
                    IdGrade: grade.idGrade,
                    Status: grade.Status,
                    Cliente: {
                        IdCliente:grade.idCliente,
                        NomeCliente: grade.nomeCliente,
                        TelefoneCliente: grade.telefoneCliente,
                        EnderecoCliente: grade.endereco
                    },
                    DataCriacao: grade.DataCriacao,
                    DataPrevistaEncerramento: grade.DataPrevistaEncerramento,
                    DataEncerramento: grade.DataEncerramento,
                    UsuarioCriador: {
                        IdUsuario: grade.UsuarioCriador,
                        LoginUsuario: grade.CriadorLogin,
                        Status: grade.CriadorStatus,
                    },
                    UsuarioEncerramento: grade.UsuarioEncerramento ? {
                        IdUsuario: grade.UsuarioEncerramento,
                        LoginUsuario: grade.EncerradorLogin,
                        Status: grade.EncerradorStatus,
                    } : null,
                    Itens: itens.map(item => ({
                        IdGradeItem: item.idGradeItem,
                        IdProduto: item.idProduto,
                        DescricaoNomeProduto: item.NomeProduto,
                        Quantidade: item.Quantidade,
                        VlProduto: item.VlProduto,
                        Status: item.ProdutoStatus,
                    })),
                };
            })
        );

        // Retorna as grades completas
        res.status(200).json(gradesCompletas);
    } catch (error) {
        console.error('Erro ao consultar grades:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const editarGrade = async (req, res) => {
    const tokenBase64 = req.headers['authorization']; // Token no cabeçalho da requisição

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    const { idGrade, dataPrevistaEncerramento, itensAdicionados, itensAlterados, itensRemovidos } = req.body;

    if (!idGrade) {
        return res.status(400).json({ message: 'ID da grade é obrigatório.' });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Validar e converter dataPrevistaEncerramento para formato MySQL
        let dataPrevistaEncerramentoSQL = null;
        if (dataPrevistaEncerramento) {
            const date = new Date(dataPrevistaEncerramento);
            if (isNaN(date.getTime())) {
                throw new Error('Data prevista de encerramento inválida.');
            }
            dataPrevistaEncerramentoSQL = date.toISOString().slice(0, 19).replace('T', ' ');
        }

        // Atualizar data prevista de encerramento
        if (dataPrevistaEncerramentoSQL) {
            const queryDataEncerramento = `
                UPDATE grade
                SET dataPrevistaEncerramento = ?
                WHERE idGrade = ? AND ? >= NOW()
            `;

            const [result] = await connection.query(queryDataEncerramento, [
                dataPrevistaEncerramentoSQL,
                idGrade,
                dataPrevistaEncerramentoSQL,
            ]);

            if (result.affectedRows === 0) {
                throw new Error('Data prevista de encerramento inválida ou não atualizada.');
            }
        }

        // Adicionar novos itens
        if (itensAdicionados && itensAdicionados.length > 0) {
            const queryAdicionarItem = `
                INSERT INTO gradeitem (idGrade, idProduto, qtProduto, VlProduto)
                VALUES (?, ?, ?, ?)
            `;

            for (const item of itensAdicionados) {
                const { idProduto, qtProduto, VlProduto } = item;

                if (!idProduto || !qtProduto || !VlProduto) {
                    throw new Error('Itens adicionados devem conter idProduto, qtProduto e VlProduto.');
                }

                await connection.query(queryAdicionarItem, [idGrade, idProduto, qtProduto, VlProduto]);
            }
        }

        // Alterar itens existentes
        if (itensAlterados && itensAlterados.length > 0) {
            const queryAlterarItem = `
                UPDATE gradeitem
                SET qtProduto = ?, VlProduto = ?
                WHERE idGradeItem = ? AND idGrade = ?
            `;

            for (const item of itensAlterados) {
                const { idGradeItem, qtProduto, VlProduto } = item;

                if (!idGradeItem || !qtProduto || !VlProduto) {
                    throw new Error('Itens alterados devem conter idGradeItem, qtProduto e VlProduto.');
                }

                await connection.query(queryAlterarItem, [qtProduto, VlProduto, idGradeItem, idGrade]);
            }
        }

        // Remover itens
        if (itensRemovidos && itensRemovidos.length > 0) {
            const queryRemoverItem = `
                DELETE FROM gradeitem
                WHERE idGradeItem = ? AND idGrade = ?
            `;

            for (const idGradeItem of itensRemovidos) {
                await connection.query(queryRemoverItem, [idGradeItem, idGrade]);
            }
        }

        // Confirma a transação
        await connection.commit();

        res.status(200).json({ message: 'Grade editada com sucesso.' });
    } catch (error) {
        if (connection) await connection.rollback();

        console.error('Erro ao editar grade:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.release();
    }
};
const encerrarGrade = async (req, res) => {
    const { idGrade, itensEncerramento } = req.body;
    const tokenBase64 = req.headers['authorization'];

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    if (!idGrade || !Array.isArray(itensEncerramento) || itensEncerramento.length === 0) {
        return res.status(400).json({ message: 'ID da grade e itens de encerramento são obrigatórios.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Atualizar status da grade e definir data de encerramento
        const queryGrade = `
            UPDATE grade 
            SET status = 'E', dataEncerramento = NOW()
            WHERE idGrade = ?
        `;
        await connection.query(queryGrade, [idGrade]);

        // Processar cada item de encerramento
        const queryItem = `
            SELECT idGradeItem, qtProduto, VlProduto 
            FROM gradeitem 
            WHERE idGrade = ? AND idGradeItem = ?
        `;
        const itensCalculados = [];
        let vendaTotalGrade = 0, vlADescontar = 0, vlAReceber = 0;

        for (const item of itensEncerramento) {
            const { idGradeItem, qtSobrada } = item;

            // Verificar item no banco
            const [rows] = await connection.query(queryItem, [idGrade, idGradeItem]);
            if (rows.length === 0) {
                throw new Error(`Item ${idGradeItem} não encontrado na grade ${idGrade}.`);
            }

            const { qtProduto, VlProduto } = rows[0];

            // Cálculos
            const qtVendida = qtProduto - qtSobrada;
            const vlTotalVendaItem = qtVendida * VlProduto;
            const vlComercioItem = vlTotalVendaItem * 0.25;
            const vlRecebidoItem = vlTotalVendaItem * 0.75;

            // Salvar valores calculados no banco
            const queryEncerramentoItem = `
                INSERT INTO encerramentoGradeItem (idGradeItem, qtVendida, qtSobrada, VlTotalVenda, VlComercio, VlRecebido)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await connection.query(queryEncerramentoItem, [
                idGradeItem,
                qtVendida,
                qtSobrada,
                vlTotalVendaItem,
                vlComercioItem,
                vlRecebidoItem,
            ]);

            // Adicionar ao array de resposta
            itensCalculados.push({
                idGradeItem,
                qtVendida,
                qtSobrada,
                vlTotalVenda: vlTotalVendaItem,
                vlComercio: vlComercioItem,
                vlRecebido: vlRecebidoItem,
            });

            // Somar os valores totais
            vendaTotalGrade += vlTotalVendaItem;
            vlADescontar += vlComercioItem;
            vlAReceber += vlRecebidoItem;
        }

        // Confirma a transação
        await connection.commit();

        // Responder com os detalhes do encerramento
        res.status(200).json({
            idGrade,
            status: 'Encerrada',
            dataEncerramento: new Date().toISOString(),
            itensEncerrados: itensCalculados,
            vendaTotalGrade,
            vlADescontar,
            vlAReceber,
        });
    } catch (error) {
        if (connection) await connection.rollback();

        console.error('Erro ao encerrar grade:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.release();
    }
};

const simularEncerramentoGrade = async (req, res) => {
    const { idGrade, itensEncerramento } = req.body;
    const tokenBase64 = req.headers['authorization'];

    // Validação do token
    if (!tokenBase64 || !(await validarToken(tokenBase64))) {
        return res.status(401).json({ message: 'Token inválido ou não autorizado.' });
    }

    if (!idGrade || !Array.isArray(itensEncerramento) || itensEncerramento.length === 0) {
        return res.status(400).json({ message: 'ID da grade e itens de encerramento são obrigatórios.' });
    }

    try {
        // Buscar os itens da grade no banco para validação
        const queryItem = `
            SELECT idGradeItem, qtProduto, VlProduto 
            FROM gradeitem 
            WHERE idGrade = ? AND idGradeItem = ?
        `;
        const itensCalculados = [];
        let vendaTotalGrade = 0, vlADescontar = 0, vlAReceber = 0;
        

        for (const item of itensEncerramento) {
            const { idGradeItem, qtSobrada } = item;

            // Verificar item no banco
            const [rows] = await db.query(queryItem, [idGrade, idGradeItem]);
            if (rows.length === 0) {
                throw new Error(`Item ${idGradeItem} não encontrado na grade ${idGrade}.`);
            }

            const { qtProduto, VlProduto } = rows[0];

            // Cálculos
            const qtVendida = qtProduto - qtSobrada;
            const vlTotalVendaItem = qtVendida * VlProduto;
            const vlComercioItem = vlTotalVendaItem * 0.25;
            const vlRecebidoItem = vlTotalVendaItem * 0.75;

            // Adicionar ao array de resposta
            itensCalculados.push({
                idGradeItem,
                qtVendida,
                qtSobrada,
                vlTotalVenda: vlTotalVendaItem,
                vlComercio: vlComercioItem,
                vlRecebido: vlRecebidoItem,
            });

            // Somar os valores totais
            vendaTotalGrade += vlTotalVendaItem;
            vlADescontar += vlComercioItem;
            vlAReceber += vlRecebidoItem;
        }

        // Retornar a simulação sem alterar o banco de dados
        res.status(200).json({
            idGrade,
            status: 'Simulação de Encerramento',
            dataSimulacao: new Date().toISOString(),
            itensSimulados: itensCalculados,
            vendaTotalGrade,
            vlADescontar,
            vlAReceber,
        });
    } catch (error) {
        console.error('Erro ao simular encerramento da grade:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
    }
};




module.exports = { cadastrarGrade, consultarGrades, editarGrade, encerrarGrade, simularEncerramentoGrade };
