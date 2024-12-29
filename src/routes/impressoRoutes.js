const express = require('express');
const router = express.Router();
const { gerarPDF, gerarPDFEncerramento } = require('../controllers/impressoController');

// Rota para gerar e baixar o PDF da grade
router.get('/grade/imprimir/:idGrade', async (req, res) => {
    try {
        const idGrade = req.params.idGrade;
        const pdfPath = await gerarPDF(idGrade);

        // Verifique se o PDF foi gerado corretamente
        if (!pdfPath) {
            throw new Error('Erro ao gerar o PDF');
        }

        // Enviar o PDF para download
        res.download(pdfPath, `grade-${idGrade}.pdf`, err => {
            if (err) {
                throw new Error('Erro ao enviar o PDF para download: ' + err.message);
            }
            console.log('Pdf gerado com sucesso!')
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Rota para gerar e baixar o PDF de encerramento da grade
router.get('/grade/encerramento/imprimir/:idGrade', async (req, res) => {
    try {
        const idGrade = req.params.idGrade;
        const pdfPath = await gerarPDFEncerramento(idGrade);

        // Verifique se o PDF foi gerado corretamente
        if (!pdfPath) {
            throw new Error('Erro ao gerar o PDF de encerramento');
        }

        // Enviar o PDF para download
        res.download(pdfPath, `encerramento-grade-${idGrade}.pdf`, err => {
            if (err) {
                throw new Error('Erro ao enviar o PDF de encerramento para download: ' + err.message);
            }
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = router;
