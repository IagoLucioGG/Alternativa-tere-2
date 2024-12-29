const express = require('express');
const { createUser, loginUser, editUser, inativarUsuario, ativarUsuario, consultarUsuarios, consultarUsuariosId } = require('../controllers/userController');
const router = express.Router();


// Endpoint para cadastro de usuário (POST está correto)
router.post('/users', createUser);

// Endpoint para login de usuário (POST está correto)
router.post('/users/login', loginUser);

// Endpoint para editar um usuário (alterado de POST para PUT)
router.put('/users/editar/:idUsuario', editUser);

// Endpoint para inativar um usuário (alterado de POST para PUT ou DELETE)
router.put('/users/inativar/:idUsuario', inativarUsuario);

// Endpoint para ativar um usuário (alterado de POST para PUT ou DELETE)
router.put('/users/ativar/:idUsuario', ativarUsuario);

// Endpoint para consultar a lista de usuários
router.get('/users/consulta', consultarUsuarios)

// Endpoint para consultar usuário por Id
router.get('/users/:idUsuario', consultarUsuariosId)

module.exports = router;
