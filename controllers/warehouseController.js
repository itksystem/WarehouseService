const ProductDTO      = require('openfsm-product-dto');
const warehouseHelper = require('openfsm-warehouse-helper');
const basketHelper    = require('openfsm-basket-helper');
// const common          = require('openfsm-common');  /* Библиотека с общими параметрами */
const authMiddleware  = require('openfsm-middlewares-auth-service'); // middleware для проверки токена
const MediaImageDto   = require('openfsm-media-image-dto');
const MESSAGES        = require('common-warehouse-service').MESSAGES;
const WarehouseError  = require('openfsm-custom-error');
const logger          = require('openfsm-logger-handler');

const LANGUAGE = 'RU';
const CommonFunctionHelper = require("openfsm-common-functions")
const _response= new CommonFunctionHelper();
const ResponseHelper = require("openfsm-response-helper");
const response = new ResponseHelper();


require('dotenv').config({ path: '.env-warehouse-service' });

/*
 Поиск продукта по его идентификатору ID
 @input req/req - 
 @output array itemsWithMedia
   200 - создан
   400 - оршибка данных
   422 - ошибка процесса
   500 - серверная ошибка
*/
exports.getProductById = async (req, res) => {
    const productId = req.params.id;
    if (!productId 
          || typeof productId !== 'string' 
            || productId.trim() === '') throw new WarehouseError(400, MESSAGES[LANGUAGE].PRODUCT_ID_REQUIRED ); 
    try {
        const productItem = await warehouseHelper.findProductById(productId);
        if (!productItem)  throw new WarehouseError(404, MESSAGES[LANGUAGE].PRODUCT_NOT_FOUND ); 
        
        let product = new ProductDTO(productItem);
        try {           
            mediaTtems  = await warehouseHelper.findMediaByProductId(product.productId); // Загружаем медиафайлы для продукта
            product.mediaFiles = mediaTtems.map(id => new MediaImageDto(id))
          } catch (error) { 
            // Логируем ошибку загрузки медиафайлов, но продолжаем обработку других продуктов          
            logger.error(`${MESSAGES[LANGUAGE].ERROR_FETCHING_MEDIA} ${item.productId}: ${error.message}`);
            // Если ошибка загрузки медиафайлов, оставляем пустой массив
            item.media = [];  
        }
        res.status(200).json(product);
    } catch (error) {         
      response.error(req, res, error); 
    }
};

/*
 Получение списка продуктов по категории
 @input req/req - 
 @output array itemsWithMedia
   200 - создан
   400 - оршибка данных
   422 - ошибка процесса
   500 - серверная ошибка
*/
exports.getProductsByCategories = async (req, res) => {
  let { categories, page, limit, search} = req.body;  
  let userId = await authMiddleware.getUserId(req, res);
  if (!Array.isArray(categories) || categories.length === 0)  
    categories = null;  
  try {   
    let  items = await warehouseHelper.findProductsByCategories(categories,page,limit,search);  // Получаем список продуктов по категориям
    if(items.length == 0) // если не нашли смотрим через Like
      items = await warehouseHelper.findProductsByCategoriesByLike(categories,page,limit,search);  // Получаем список продуктов по категориям
      
    let poducts = items.map(id => new ProductDTO(id))
    const itemsWithMedia = await Promise.all( 
     // Асинхронно загружаем медиафайлы для каждого продукта
      poducts.map(async (item) => {
        try { 
        // Загружаем медиафайлы для продукта          
          mediaTtems       = await warehouseHelper.findMediaByProductId(item.productId); 
          item.mediaFiles  = mediaTtems.map(id => new MediaImageDto(id))
          basketCount      = await basketHelper.getProductCountInBasket(userId, item.productId);
          item.basketCount = basketCount;
        } catch (error) { // Логируем ошибку загрузки медиафайлов, но продолжаем обработку других продуктов          
          logger.error(`${MESSAGES[LANGUAGE].ERROR_FETCHING_MEDIA} ${item.productId}: ${error.message}`);
          item.media = [];  // Если ошибка загрузки медиафайлов, оставляем пустой массив
        }
        return item;
      })
    );    
    res.status(200).json(itemsWithMedia); // Отправляем ответ с продуктами и медиафайлами
  } catch (error) {
    response.error(req, res, error); 
  }
};

/*
 Резервирование товара
 @input req/req - 
 @output object
   200 - создан
   400 - оршибка данных
   422 - ошибка процесса
   500 - серверная ошибка
*/
exports.productReservation = async (req, res) => {
  let {productId, count} = req.body;
  if (!productId || !count) 
    throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR); 
  try {
     let status = await warehouseHelper.productReservation(productId, count);     
     if(!status) new WarehouseError(500,MESSAGES[LANGUAGE].RESERVE_ITEM_FAILED);
     res.status(200).json({status : true, productId : productId, count : count, message : MESSAGES[LANGUAGE].RESERVE_ITEM_SUCCESS});
  } catch (error) {
    response.error(req, res, error); 
  }
};

/*
 Отмена резервирования товара
 @input req/req - 
 @output object
   200 - создан
   400 - оршибка данных
   422 - ошибка процесса
   500 - серверная ошибка
*/

exports.productReleaseReservation = async (req, res) => {
  let {productId, count} = req.body;
  if (!productId || !count) 
    throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR); 
  try {
     let status = await warehouseHelper.productReleaseReservation(productId, count);     
     if(!status) throw(MESSAGES[LANGUAGE].RELEASE_ITEM_FAILED);
     res.status(200).json({status : true, productId : productId, count : count, message :  MESSAGES[LANGUAGE].RELEASE_ITEM_SUCCESS});
  } catch (error) {
    response.error(req, res, error); 
  }
};

/*
 Проверить доступность товаров на складе для резервирования
 @input req/req - 
 @output object
   200 - создан
   400 - оршибка данных
   422 - ошибка процесса
   500 - серверная ошибка
*/
exports.reservationAvailability = async (req, res) => {
  let userId = await authMiddleware.getUserId(req, res) ;
  if (!userId) 
    throw new WarehouseError(400, MESSAGES[LANGUAGE].INPUT_VALIDATION_ERROR); 
  let basketId = await basketHelper.getBasketId(userId)
  try {
     let result = await warehouseHelper.getBasketProductsAvailability(basketId);     
     if(!result) 
      throw new WarehouseError(400, MESSAGES[LANGUAGE].ERROR_FETCHING_WAREHOUSE);       
      const availabilityStatus = !result.some(item => item.availability === 0);
      result.availabilityStatus = availabilityStatus
      res.status(200).json({ result, availabilityStatus });
  } catch (error) {    
    response.error(req, res, error); 
  }
};
