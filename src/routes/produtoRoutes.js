const express = require('express');
const { createProduct, consultarProdutos, consultarProdutoId, editProduto} = require('../controllers/produtoController');
const router = express.Router();


// Endpoint para cadastro de usuário (POST está correto)
router.post('/product/cadastrar', createProduct);

//Endpoint para consultar uma lista de produtos
router.get('/products',consultarProdutos);


//Endpoint para consultar um produto pelo Id
router.get('/product/:idProduto',consultarProdutoId);

//Endpoint para editar produtos
router.put('/product/editar/:idProduto', editProduto)


module.exports = router;
