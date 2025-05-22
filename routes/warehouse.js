const express = require('express');
const router = express.Router();
const authMiddleware = require('openfsm-middlewares-auth-service'); // middleware для проверки токена
const { getProductById, getProductsByCategories, productReservation, 
    productReleaseReservation,reservationAvailability,
    getProductCategories, getProductBrands
} = require('../controllers/warehouseController');

router.post('/v1/products', getProductsByCategories); // получить список продуктов
router.get( '/v1/products/reservation-availability', authMiddleware.authenticateToken, reservationAvailability); // доступно на складе
router.get( '/v1/products/categories',  getProductCategories); // категории товаров
router.get( '/v1/products/brands',  getProductBrands); // бренды
router.post('/v1/products/reserve', authMiddleware.authenticateToken, productReservation); // зарезервировать продукт
router.post('/v1/products/release', authMiddleware.authenticateToken, productReleaseReservation); // отменить резервирование
router.get( '/v1/products/:id',  getProductById);  // получить параметры продукта




module.exports = router;
