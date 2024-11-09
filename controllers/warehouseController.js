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
  let productId = req.params.id;
  if (!productId) return res.status(400).json({ message: common.HTTP_CODES.BAD_REQUEST.description });
  try {
     const productItem = await warehouseHelper.findProductById(productId);
     const product = new ProductDTO(productItem);            
     res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// найти список продуктов
exports.getProductsByCategories = async (req, res) => {
  let categories = req.body.categories;
  try {
    const items = await warehouseHelper.findProductsByCategories(categories);
    // Используем for...of для асинхронного ожидания
    for (let item of items) {
      try {        
        item.media =  await warehouseHelper.findMediaByProductId(item.product_id);        
      } catch (error) {
        console.log(error);
      }
    }    
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
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