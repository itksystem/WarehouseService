const { DateTime }    = require('luxon');
const basketHelper = require('openfsm-basket-helper');
const warehouseHelper = require('openfsm-warehouse-helper');
const common       = require('openfsm-common');  /* Библиотека с общими параметрами */
const CommonFunctionHelper = require("openfsm-common-functions")
const commonFunction= new CommonFunctionHelper();
const BasketItemDto   = require('openfsm-basket-item-dto');
const authMiddleware = require('openfsm-middlewares-auth-service'); // middleware для проверки токена

const MESSAGES        = require('common-warehouse-service').MESSAGES;
const WarehouseError  = require('openfsm-custom-error');
const logger          = require('openfsm-logger-handler');
const LANGUAGE = 'RU';
const _response= new CommonFunctionHelper();
const ResponseHelper = require("openfsm-response-helper");
const response = new ResponseHelper();


require('dotenv').config();



const isValidUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateRequest = (productId, quantity, userId) => {
    if (!productId || !isValidUUID(productId)) 
        return MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR;
    if (!quantity || typeof quantity !== "number" || quantity <= 0) 
        return MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR;
    if (!userId ) 
        return MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR;
    return null;
};

const sendResponse = (res, statusCode, data) => {
    res.status(statusCode).json(data);
};


exports.removeItemFromBasket = async (req, res) => {
    let { productId, quantity } = req.body;
    const userId = await authMiddleware.getUserId(req, res);

    const validationError = validateRequest(productId, quantity, userId);
    if (validationError)
        throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);     
    try {
        let productCount = await basketHelper.removeItemFromBasket(userId, productId, quantity);
        if (productCount === null) 
            throw new WarehouseError(404, MESSAGES[LANGUAGE].ERROR_FETCHING_PRODUCT); 
        sendResponse(res, 200, { 
            status: true, 
            basket: { 
                productId, 
                quantity: productCount 
            } });
    } catch (error) {
        response.error(req, res, error); 
    }
};

exports.addItemToBasket = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = await authMiddleware.getUserId(req, res);   
    const validationError = validateRequest(productId, quantity, userId);
    if (validationError) 
        throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);     
    try {
        const productCount = await basketHelper.addItemToBasket(userId, productId, quantity);
        if (productCount === null) 
            throw new WarehouseError(404, MESSAGES[LANGUAGE].ERROR_FETCHING_PRODUCT); 
        sendResponse(res, 200, { 
            status: true, 
            basket: { 
                productId, 
                quantity: productCount 
            },});
      } catch (error) {                
        response.error(req, res, error); 
    }
};

function calculateTotal(items) {
    if (!items|| !Array.isArray(items)) 
     return 0;    
    let totalAmount = 0; 
    items.forEach(item => { 
     if (item.price && item.quantity) {
         totalAmount += item.price * item.quantity;
     }
    });  
    return totalAmount;
  }

exports.getBasket = async (req, res) => {    
    const userId = await authMiddleware.getUserId(req, res);
    if (!userId)  
      throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);     
    try {
        const items = await basketHelper.getBasket(userId);
        sendResponse(res, 200, { 
            status: true, 
            basket: items.map(id => new BasketItemDto(id)), 
            totalAmount : calculateTotal(items), 
        });
    } catch (error) {        
        response.error(req, res, error); 
    }
};


exports.orderCreate = async (req, res) => {
    const userId = await authMiddleware.getUserId(req, res);
    const {orderId}= req.body;
    if (!userId || !orderId) 
        throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);     
    const data = await basketHelper.getBasket(userId );      // создали заказа  
    if (!data || (data.length == 0) )  
        throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR);     
    try {
        const basketId = await basketHelper.getBasketId(userId)              // Получили корзину
        const result   = await basketHelper.orderCreate(userId, basketId, orderId);      // создали заказа  
        const items    = await basketHelper.getBasketOrder(userId, orderId);   // привязали товары в корзине к заказу        
        const itemsWithResered = await Promise.all( // Асинхронно резервируем товары 
            items.map(async (item) => {
              try { 
                const warehouse  = await warehouseHelper.productReservation(item.productId, item.quantity);                    
                item.reserved = warehouse;  
              } catch (reservedError) { 
                logger.error(`product_id ${item.productId}: ${reservedError.message}`);
                item.reserved = false;  
              }
              return item;
            })
          );  
        if(!result || !items || !itemsWithResered) return sendResponse(res, 500,
             { success: false, status: 500, error: commonFunction.getDescriptionByCode(error.message)}
            );
        sendResponse(res, 200, { 
            status: true, 
            orderId : orderId, 
            items: items.map(id => new BasketItemDto(id)), 
            totalAmount : calculateTotal(items), 
        });
    } catch (error) {        
        response.error(req, res, error); 
    }
};



exports.getOrderDetails = async (req, res) => {    
    const orderId= req.params.orderId;
    if (!orderId) return sendResponse(res, 400, { message: common.HTTP_CODES.BAD_REQUEST });
    const userId = await authMiddleware.getUserId(req, res);
    if (!userId) return sendResponse(res, 400, { message: common.HTTP_CODES.BAD_REQUEST });
    try {        
        const items = await basketHelper.getBasketOrder(userId, orderId);
        sendResponse(res, 200, 
          {
            status: true,
            orderId : orderId,
            items: items.map(id => new BasketItemDto(id)),
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

