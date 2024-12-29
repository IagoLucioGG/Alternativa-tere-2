const express = require('express');
const { cadastrarGrade, consultarGrades, editarGrade, encerrarGrade, simularEncerramentoGrade } = require('../controllers/gradeController');
const router = express.Router();

// Endpoint para cadastrar Grade
router.post('/grade/cadastrar', cadastrarGrade);

// Endpoint para consultar Grades
router.get('/grade/consultar', consultarGrades);

//Endpoint para Alterar grade
router.put('/grade/editar',editarGrade )

// Endpoint para encerrar uma grade
router.post('/grade/encerrar', encerrarGrade);

//Endpoint Para simular o encerramento de grade
router.post('/grade/simularEncerramento', simularEncerramentoGrade)

module.exports = router;
