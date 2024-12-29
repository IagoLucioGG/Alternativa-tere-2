const express = require('express');
const {createClient, editClient, consultarClientes} = require('../controllers/clienteController');
const router = express.Router();

// Endpoint para cadastro de cliente (POST está correto)
router.post('/client/cadastrar', createClient);

//Endpoint para editar o cliente
router.put('/client/editar/:idCliente',editClient)

//Endpoint para consultar clientes
router.get('/clientes',consultarClientes)


module.exports = router;