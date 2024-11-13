const express = require('express');
const router = express.Router();
const common = require("openfsm-common"); /* Библиотека с общими параметрами */
const authMiddleware = require('openfsm-middlewares-auth-service'); // middleware для проверки токена
const { getProductById, getProductsByCategories, productReservation, productReleaseReservation } = require('../controllers/warehouseController');

router.post('/v1/products', getProductsByCategories); // получить список продуктов
router.get('/v1/products/:id',  getProductById);  // получить параметры продукта
router.post('/v1/products/reserve', authMiddleware.authenticateToken, productReservation); // зарезервировать продукт
router.post('/v1/products/release', authMiddleware.authenticateToken, productReleaseReservation); // отменить резервирование

module.exports = router;
