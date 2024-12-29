const puppeteer = require('puppeteer');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function gerarPDF(idGrade) {
    try {
        // Consulta a grade no banco de dados
        const gradeQuery = `
            SELECT g.idGrade, g.dataCriacao, g.dataPrevistaEncerramento, g.dataEncerramento, 
                c.nomeCliente, c.telefoneCliente, c.endereco
            FROM grade g
            INNER JOIN cliente c ON g.idCliente = c.idCliente
            WHERE g.idGrade = ?;
        `;
        const [gradeResult] = await db.query(gradeQuery, [idGrade]);

        if (!gradeResult) {
            throw new Error('Grade não encontrada.');
        }

        const grade = gradeResult[0]; // Dados da grade

        // Consulta os itens da grade
        const gradeItemsQuery = `
            SELECT gi.idProduto, p.nomeProduto AS nome, gi.qtProduto AS quantidade, gi.VlProduto AS valor
            FROM gradeItem gi
            INNER JOIN produto p ON gi.idProduto = p.idProduto
            WHERE gi.idGrade = ?;
        `;
        const [gradeItemsResult] = await db.query(gradeItemsQuery, [idGrade]);

        if (!gradeItemsResult || gradeItemsResult.length === 0) {
            throw new Error('Nenhum item encontrado para esta grade. ' + idGrade);
        }

        const gradeItems = gradeItemsResult; // Dados dos itens da grade

        // Preparar valores com validação
        const nomeCliente = grade.nomeCliente || 'N/A';
        const telefoneCliente = grade.telefoneCliente || 'N/A';
        const endereco = grade.endereco || 'N/A';

        // Calcular a altura do conteúdo baseado no número de produtos
        const alturaBase = 80; // Altura mínima para folha A4
        const alturaPorProduto = 10; // Incremento de altura por produto
        const alturaConteudo = alturaBase + (gradeItems.length * alturaPorProduto);

        // Substituir valores no HTML
        const htmlContent = `
            <div id="recibo"
                style="font-family: Arial, sans-serif; font-size: 14px; color: #000; text-align: left; width: 100%; max-width: 80mm; margin: 0 auto;">
                <h2 style="font-size: 18px; text-align: center; color: #000;">ALTERNATIVA</h2>
                <hr style="border: 1px dashed #000; margin: 5px 0;">

                <h3 style="font-size: 14px; color: #000; margin: 5px 0;">Dados do Cliente</h3>
                <p style="margin: 2px 0;"><strong>Nome:</strong> ${nomeCliente}</p>
                <p style="margin: 2px 0;"><strong>Telefone:</strong> ${telefoneCliente}</p>
                <p style="margin: 2px 0;"><strong>Endereço:</strong> ${endereco}</p>

                <hr style="border: 1px dashed #000; margin: 5px 0;">
                <h3 style="font-size: 14px; color: #000; margin: 5px 0;">Detalhes dos Produtos</h3>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="text-align: left;">Produto</th>
                            <th style="text-align: right;">Qtd</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gradeItems.map(item => `
                            <tr>
                                <td style="font-size: 16px;">${item.nome || 'N/A'}</td>
                                <td style="text-align: right; font-size: 16px;">${item.quantidade || 'N/A'}</td>
                                <td style="text-align: right; font-size: 16px;">R$ ${item.valor !== undefined ? parseFloat(item.valor).toFixed(2) : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <hr style="border: 1px dashed #000; margin: 5px 0;">
                <p style="margin: 5px 0;"><strong>Total de Mercadorias:</strong> ${gradeItems.length}</p>
                <p style="margin: 5px 0; text-align: right; font-size: 16px;">
                    <strong>Valor Total:</strong> R$ ${gradeItems.reduce((total, item) => total + (item.valor !== undefined ? parseFloat(item.valor) * item.quantidade : 0), 0).toFixed(2)}
                </p>
            </div>
        `;

        // Criar PDF com Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'load' });

        const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        const pdfPath = path.join(pdfDir, `grade-${idGrade}.pdf`);
        await page.pdf({
            path: pdfPath,
            width: '80mm', // Largura do papel
            height: `${alturaConteudo}mm`, // Altura dinâmica baseada no número de produtos
            printBackground: true,
            margin: { top: 5, right: 5, bottom: 5, left: 5 } // Margens estreitas para caber melhor
        });

        await browser.close();
        return pdfPath;
    } catch (error) {
        console.error('Erro ao gerar PDF:', error.message);
        throw new Error('Erro ao gerar PDF: ' + error.message);
    }
}

async function gerarPDFEncerramento(idGrade) {
    try {
        // Consulta a grade no banco de dados
        const gradeQuery = `
            SELECT g.idGrade, g.dataCriacao, g.dataPrevistaEncerramento, g.dataEncerramento, 
                c.nomeCliente, c.telefoneCliente, c.endereco
            FROM grade g
            INNER JOIN cliente c ON g.idCliente = c.idCliente
            WHERE g.idGrade = ?;
        `;
        const [gradeResult] = await db.query(gradeQuery, [idGrade]);

        if (!gradeResult) {
            throw new Error('Grade não encontrada.');
        }

        const grade = gradeResult[0]; // Dados da grade

        // Consulta os itens de encerramento
        const encerramentoItemsQuery = `
            SELECT ei.idGradeItem, p.nomeProduto AS nome, ei.qtVendida AS quantidade, ei.VlTotalVenda AS valor
            FROM encerramentoGradeItem ei
            INNER JOIN gradeItem GI ON GI.idGradeItem = ei.idGradeItem
            INNER JOIN grade G ON G.idGrade = GI.idGrade
            INNER JOIN produto p ON GI.idProduto = p.idProduto
            WHERE G.idGrade = ?;
        `;
        const [encerramentoItemsResult] = await db.query(encerramentoItemsQuery, [idGrade]);

        if (!encerramentoItemsResult || encerramentoItemsResult.length === 0) {
            throw new Error('Nenhum item de encerramento encontrado para esta grade.');
        }

        const encerramentoItems = encerramentoItemsResult; // Dados dos itens de encerramento

        // Preparar valores com validação
        const nomeCliente = grade.nomeCliente || 'N/A';
        const telefoneCliente = grade.telefoneCliente || 'N/A';
        const endereco = grade.endereco || 'N/A';

        // Calcular a altura do conteúdo baseado no número de produtos
        const alturaBase = 20; // Altura mínima para folha A4
        const alturaPorProduto = 9; // Incremento de altura por produto
        const alturaConteudo = alturaBase + (encerramentoItems.length * alturaPorProduto);

        // Calcular totais
        const valorTotalVendido = encerramentoItems.reduce((total, item) => total + (item.valor !== undefined ? parseFloat(item.valor) : 0), 0);
        const qtTotalVendido = encerramentoItems.reduce((total, item) => total + (item.quantidade !== undefined ? parseFloat(item.quantidade) : 0), 0);
        const valorEstabelecimento = valorTotalVendido * 0.25;
        const valorAReceber = valorTotalVendido - valorEstabelecimento;

        // Substituir valores no HTML
        const htmlContent = `
            <div id="recibo"
                style="font-family: Arial, sans-serif; font-size: 14px; color: #000; text-align: left; width: 100%; max-width: 80mm; margin: 0 auto;">
                <h2 style="font-size: 18px; text-align: center; color: #000;">ALTERNATIVA</h2>
                <hr style="border: 1px dashed #000; margin: 5px 0;">

                <h3 style="font-size: 14px; color: #000; margin: 5px 0;">Dados do Cliente</h3>
                <p style="margin: 2px 0; text-align: left;"><strong>Nome:</strong> ${nomeCliente}</p>
                <p style="margin: 2px 0; text-align: left;"><strong>Telefone:</strong> ${telefoneCliente}</p>
                <p style="margin: 2px 0; text-align: left;"><strong>Endereço:</strong> ${endereco}</p>

                <hr style="border: 1px dashed #000; margin: 5px 0;">
                <h3 style="font-size: 14px; color: #000; margin: 5px 0;">Detalhes das vendas</h3>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="text-align: left;">Produtos</th>
                            <th style="text-align: right;">Quant</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${encerramentoItems.map(item => `
                            <tr>
                                <td style="text-align: left; font-size: 16px;">${item.nome || 'N/A'}</td>
                                <td style="text-align: right; font-size: 14px;">${item.quantidade || 'N/A'}</td>
                                <td style="text-align: right; font-size: 14px;">R$ ${item.valor !== undefined ? parseFloat(item.valor).toFixed(2) : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <hr style="border: 1px dashed #000; margin: 5px 0;">
                <p style="margin: 5px 0;"><strong>Quant Produtos vendidos:</strong> ${qtTotalVendido}</p>
                <p style="margin: 5px 0;; font-size: 14px;">
                    <strong>Valor Total Vendido:</strong> R$ ${valorTotalVendido.toFixed(2)}
                </p>
                <p style="margin: 5px 0;; font-size: 14px;">
                    <strong>Valor do Estabelec (25%):</strong> R$ ${valorEstabelecimento.toFixed(2)}
                </p>
                <p style="margin: 5px 0;; font-size: 14px;">
                    <strong>Valor a Receber:</strong> R$ ${valorAReceber.toFixed(2)}
                </p>
            </div>
        `;

        // Criar PDF com Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'load' });

        const pdfDir = path.join(__dirname, '..', 'public', 'pdfs');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        const pdfPath = path.join(pdfDir, `encerramento-grade-${idGrade}.pdf`);
        await page.pdf({
            path: pdfPath,
            width: '80mm', // Largura do papel
            height: `${alturaConteudo}mm`, // Altura dinâmica baseada no número de produtos
            printBackground: true,
            margin: { top: 5, right: 5, bottom: 5, left: 5 } // Margens estreitas para caber melhor
        });

        await browser.close();
        return pdfPath;
    } catch (error) {
        console.error('Erro ao gerar PDF:', error.message);
        throw new Error('Erro ao gerar PDF: ' + error.message);
    }
}

module.exports = { gerarPDF, gerarPDFEncerramento };
