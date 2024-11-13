const express = require('express');
const router = express.Router();
const common = require("openfsm-common"); /* Библиотека с общими параметрами */
const authMiddleware = require('openfsm-middlewares-auth-service'); // middleware для проверки токена
const basket = require('../controllers/basketController');

router.post('/v1/basket/product-add', authMiddleware.authenticateToken, basket.addItemToBasket); // Добавить товар в корзине
router.post('/v1/basket/product-remove', authMiddleware.authenticateToken, basket.removeItemFromBasket); // Удалить товар в корзине
router.get('/v1/basket', authMiddleware.authenticateToken, basket.getBasket); // Удалить товар в корзине


module.exports = router;
