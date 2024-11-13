const { DateTime } = require('luxon');
const userHelper   = require('openfsm-user-helper');
const ProductDTO      = require('openfsm-product-dto');
const ProductMediaDTO      = require("openfsm-product-media-dto")
const warehouseHelper = require('openfsm-warehouse-helper');
const common      = require('openfsm-common');  /* Библиотека с общими параметрами */
const pool        = require('openfsm-database-connection-producer');
const MailNotificationProducer  =  require('openfsm-mail-notification-producer'); // ходим в почту через шину
require('dotenv').config();

const version = '1.0.0'

// найти продукт по id
exports.getProductById = async (req, res) => {
    const productId = req.params.id;

    // Проверка на валидность productId
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
        return res.status(400).json({ message: 'Product ID is required and must be a valid string.' });
    }
    try {
        // Пытаемся найти продукт
        const productItem = await warehouseHelper.findProductById(productId);

        // Если продукт не найден
        if (!productItem) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Преобразуем данные в DTO
        const product = new ProductDTO(productItem);

        // Возвращаем успешный ответ с продуктом
        res.status(200).json(product);
    } catch (error) {
        // Обработка ошибок на сервере
        console.error('Error fetching product:', error);  // Для логирования ошибки на сервере
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

exports.getProductsByCategories = async (req, res) => {
  let  categories = req.body.categories;  
  if (!Array.isArray(categories) || categories.length === 0) {  // Проверка на наличие категорий в запросе
      categories = null;
  }
  try {   
    const items = await warehouseHelper.findProductsByCategories(categories);  // Получаем список продуктов по категориям
    const itemsWithMedia = await Promise.all( // Асинхронно загружаем медиафайлы для каждого продукта
      items.map(async (item) => {
        try { // Загружаем медиафайлы для продукта          
          item.media = await warehouseHelper.findMediaByProductId(item.product_id);
        } catch (mediaError) { // Логируем ошибку загрузки медиафайлов, но продолжаем обработку других продуктов          
          console.error(`Error fetching media for product_id ${item.product_id}: ${mediaError.message}`);
          item.media = [];  // Если ошибка загрузки медиафайлов, оставляем пустой массив
        }
        return item;
      })
    );    
    res.status(200).json(itemsWithMedia); // Отправляем ответ с продуктами и медиафайлами
  } catch (error) {
    console.error('Error fetching products by categories:', error.message); // Обработка ошибок на уровне всего запроса
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// резервировать товаро по id
exports.productReservation = async (req, res) => {
  let {productId, count} = req.body;
  if (!productId || !count) return res.status(400).json({ message: common.HTTP_CODES.BAD_REQUEST.description });
  try {
     let status = await warehouseHelper.productReservation(productId, count);     
     if(!status) throw(common.RESERVE_ITEM_FAILED);
     res.status(200).json({status : true, productId : productId, count : count, message : common.RESERVE_ITEM_SUCCESS});
  } catch (error) {
    res.status(500).json({status : false, productId : productId, count : count, message: error});
  }
};

// отменить резервирование товара
exports.productReleaseReservation = async (req, res) => {
  let {productId, count} = req.body;
  if (!productId || !count) return res.status(400).json({ message: common.HTTP_CODES.BAD_REQUEST.description });
  try {
     let status = await warehouseHelper.productReleaseReservation(productId, count);     
     if(!status) throw(common.RELEASE_ITEM_FAILED);
     res.status(200).json({status : true, productId : productId, count : count, message : common.RELEASE_ITEM_SUCCESS});
  } catch (error) {
    res.status(500).json({status : false, productId : productId, count : count, message: error });
  }
};

