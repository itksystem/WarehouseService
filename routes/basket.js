const express = require('express');
const router = express.Router();
const common = require("openfsm-common"); /* Библиотека с общими параметрами */
const authMiddleware = require('openfsm-middlewares-auth-service'); // middleware для проверки токена
const basket = require('../controllers/basketController');

router.post('/v1/basket/product-add', authMiddleware.authenticateToken, basket.addItemToBasket); // Добавить товар в корзине
router.post('/v1/basket/product-remove', authMiddleware.authenticateToken, basket.removeItemFromBasket); // Удалить товар в корзине
router.post('/v1/basket/order-create', authMiddleware.authenticateToken, basket.orderCreate); // Отдать товары из корзины в заказ
router.delete('/v1/basket/item/:productId', authMiddleware.authenticateToken, basket.deleteBasketProductItem); // Удалить позицию из корзины
router.get('/v1/basket', authMiddleware.authenticateToken, basket.getBasket); // Корзина
router.get('/v1/order/:orderId/details', authMiddleware.authenticateToken, basket.getOrderDetails); // Корзина


module.exports = router;
