
const basketHelper = require('openfsm-basket-helper');
const warehouseHelper = require('openfsm-warehouse-helper');
const common       = require('openfsm-common');  /* Библиотека с общими параметрами */
const BasketItemDto  = require('openfsm-basket-item-dto');
const authMiddleware = require('openfsm-middlewares-auth-service'); // middleware для проверки токена
const WarehouseError  = require('openfsm-custom-error');
const MESSAGES        = require('common-warehouse-service').MESSAGES;
const LANGUAGE = 'RU';
const ResponseHelper = require("openfsm-response-helper");
const response = new ResponseHelper();
const logger          = require('openfsm-logger-handler');
const ClientProducerAMQP  =  require('openfsm-client-producer-amqp'); // ходим в почту через шину
const amqp = require('amqplib');
require('dotenv').config({ path: '.env-warehouse-service' });

const isValidUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const validateRequest = (productId, quantity, userId) => {
    if (!isValidUUID(productId)) 
        return MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR;
    if (!Number.isInteger(quantity) || quantity <= 0) 
        return MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR;
    if (!userId) 
        return MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR;
    return null;
};


const sendResponse = (res, statusCode = 200, data = {}) => {
    if (!res || !res.status) {
        console.error("sendResponse: Некорректный объект res");
        return;
    }
    res.status(statusCode).json(data);
};


exports.removeItemFromBasket = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = await authMiddleware.getUserId(req, res);

        // Валидация входных данных
        if (!productId || !quantity || quantity <= 0 || !userId) {
            throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);
        }

        // Удаление товара из корзины
        const productCount = await basketHelper.removeItemFromBasket(userId, productId, quantity);
        if (productCount === null) {
            throw new WarehouseError(404, MESSAGES[LANGUAGE].ERROR_FETCHING_PRODUCT);
        }

        // Отправка ответа
        sendResponse(res, 200, { 
            status: true, 
            basket: { productId, quantity: productCount }
        });

    } catch (error) {
        logger.error(`Ошибка при удалении товара из корзины: ${error.message}`);
        response.error(req, res, error);
    }
};


exports.addItemToBasket = async (req, res) => {
    try {

        const { productId, quantity } = req.body;
        const userId = await authMiddleware.getUserId(req, res);

        // Валидация входных данных
        // const validationError = validateRequest(productId, quantity, userId);
        console.log(`validationError =>`, req)
         console.log(`validationError =>`,productId,quantity,userId)
        if (!productId || !quantity || !userId) {
            throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);
        }

        // Проверка доступного количества товара на складе
        const availableQuantity = await basketHelper.getWarehouseProductCount(productId);
        console.log(`availableQuantity =>`,availableQuantity)
        if (availableQuantity === 0) {
            throw new WarehouseError(422, MESSAGES[LANGUAGE].PRODUCT_UNAVAILABLE);
        }
        
        // Добавление товара в корзину
        const productCount = await basketHelper.addItemToBasket(userId, productId, quantity);
        console.log(`productCount =>`,productCount)
        if (productCount === null) {
            throw new WarehouseError(404, MESSAGES[LANGUAGE].ERROR_FETCHING_PRODUCT);
        }

        // Отправка ответа
        sendResponse(res, 200, { 
            status: true, 
            basket: { productId, quantity: productCount }
        });

    } catch (error) {
        logger.error(`Ошибка при добавлении товара в корзину: ${error.message}`);
        response.error(req, res, error);
    }
};



  function calculateTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return 0;
    }    
    return items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return total + price * quantity;
    }, 0);
}



exports.orderCreate = async (req, res) => {
    let orderId =  null;    
    let basketId = null;
    try {
        const userId = await authMiddleware.getUserId(req, res);
        orderId = req.body.orderId;
        console.log(`${userId} ${orderId}`);

        if (!userId || !orderId) {
            console.log(`!userId || !orderId`);
            throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);
        }

        const basketData = await basketHelper.getBasket(userId);
        console.log(basketData);
        if (!basketData || basketData.length === 0) {
            console.log(`!basketData || basketData.length === 0`);            
            throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);
        }

        // Получаем идентификатор корзины
        basketId = await basketHelper.getBasketId(userId);
        console.log(`${basketId}`);
        if (!basketId) {
            console.log(`!basketId`);
            throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);
        }

        // Создаем заказ
        const result = await basketHelper.orderCreate(orderId, basketId);
        console.log(orderId, basketId);
        if (!result) {
            console.log("Ошибка при создании заказа");
            return sendResponse(res, 500, {
                success: false,
                status: 500,
                error: "Ошибка при создании заказа",
            });
        }

        // Получаем товары из корзины, привязанные к заказу
        const items = await basketHelper.getBasketOrder(orderId, basketId);
        if (!items || items.length === 0) {
            console.log("Корзина пуста или не привязана к заказу");
            return sendResponse(res, 400, {
                success: false,
                status: 400,
                error: "Корзина пуста или не привязана к заказу",
            });
        }

        // Асинхронно резервируем товары
        const itemsWithReserved = await Promise.allSettled(
            items.map(async (item) => {
                try {
                    const warehouse = await warehouseHelper.productReservation(item.productId, item.quantity);
                    return { ...item, reserved: warehouse };
                } catch (reservedError) {
                    logger.error(`Ошибка при резервировании товара ${item.productId}: ${reservedError.message}`);                    
                    return { ...item, reserved: false };
                }
            })
        );

        // Формируем финальный список товаров с информацией о резервации
        const processedItems = itemsWithReserved.map(result =>
            result.status === "fulfilled" ? result.value : { reserved: false });

        sendResponse(res, 200, {
            status: true,
            orderId: orderId,
            items: processedItems.map(id => new BasketItemDto(id)),
            totalAmount: calculateTotal(processedItems),
        });

    } catch (error) {
        logger.error("Ошибка при создании заказа:", error);
        await basketHelper.orderDecline(orderId, basketId);
        response.error(req, res, error);
    }
};

exports.getBasket = async (req, res) => {    
    try {
        const userId = await authMiddleware.getUserId(req, res);
        if (!userId) {
            throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);
        }

        const items = await basketHelper.getBasket(userId) || [];
        
        sendResponse(res, 200, { 
            status: true, 
            basket: items.map(id => new BasketItemDto(id)),
            totalAmount: calculateTotal(items), 
        });

    } catch (error) {        
        logger.error(`Ошибка при получении корзины пользователя: ${error.message}`);
        response.error(req, res, error);
    }
};


exports.getOrderDetails = async (req, res) => {    
    try {        
        const orderId= req.params.orderId;
        const userId = await authMiddleware.getUserId(req, res);        
        if (!orderId || !userId) return sendResponse(res, 400, { message: common.HTTP_CODES.BAD_REQUEST });
        // Получаем идентификатор корзины
        basketId = await basketHelper.getBasketId(userId);
          console.log(`${basketId}`);
          if (!basketId) {
              console.log(`!basketId`);
              throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);
          }
        const items = await basketHelper.getBasketOrder(orderId, basketId);
        sendResponse(res, 200, 
          {
            status: true,
            orderId : orderId,
            items : items.map(id => new BasketItemDto(id)),
            totalAmount : calculateTotal(items),
          });
    } catch (error) {        
        response.error(req, res, error); 
    }
};

exports.deleteBasketProductItem = async (req, res) => {    
    const productId= req.params.productId;
    if (!productId) return sendResponse(res, 400, { message: common.HTTP_CODES.BAD_REQUEST });
    const userId = await authMiddleware.getUserId(req, res);
    if (!userId) return sendResponse(res, 400, { message: common.HTTP_CODES.BAD_REQUEST });
    try {        
      const result = await basketHelper.productBasketRemove(userId, productId) ;
      sendResponse(res, 200, {
         status: result, 
         productId
        });
    } catch (error) {        
        response.error(req, res, error); 
    }
};

