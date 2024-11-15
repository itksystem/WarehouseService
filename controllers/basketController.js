const { DateTime }    = require('luxon');
const basketHelper = require('openfsm-basket-helper');
const common       = require('openfsm-common');  /* Библиотека с общими параметрами */
const BasketItemDto   = require('openfsm-basket-item-dto');
require('dotenv').config();



const isValidUUID = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateRequest = (productId, quantity, userId) => {
    if (!productId || !isValidUUID(productId)) return "Invalid product ID";
    if (!quantity || typeof quantity !== "number" || quantity <= 0) return "Invalid quantity";
    if (!userId ) return "Invalid user ID";
    return null;
};

const sendResponse = (res, statusCode, data) => {
    res.status(statusCode).json(data);
};


exports.removeItemFromBasket = async (req, res) => {
    let { productId, quantity } = req.body;
    let userId = req.user.id;

    const validationError = validateRequest(productId, quantity, userId);
    if (validationError) return sendResponse(res, 400, { message: validationError });
    
    try {
        let productCount = await basketHelper.removeItemFromBasket(userId, productId, quantity);
        if (productCount === null) return sendResponse(res, 404, { status: false, message: "Product not found in basket" });        
        sendResponse(res, 200, { status: true, basket: { productId, quantity: productCount } });

    } catch (error) {
        console.error("Error removing item from basket:", error);
        sendResponse(res, 500, { status: false, message: "Internal server error" });
    }
};

exports.addItemToBasket = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;
   
    const validationError = validateRequest(productId, quantity, userId);
    if (validationError) return sendResponse(res, 400, { message: validationError });
    try {
        const productCount = await basketHelper.addItemToBasket(userId, productId, quantity);
        sendResponse(res, 200, {
            status: true,
            basket: { productId, quantity: productCount },
        });
    } catch (error) {        
        console.error("Error adding item to basket:", error);
        sendResponse(res, 500, { status: false, message: "Internal server error" });
    }
};


function calculateTotal(items) {
    if (!items|| !Array.isArray(items)) return 0;    
    let totalAmount = 0; 
    items.forEach(item => { 
        if (item.price && item.quantity) {
            totalAmount += item.price * item.quantity;
        }
    });
  
    return totalAmount;
  }

exports.getBasket = async (req, res) => {
    const userId = req.user.id;       
    if (!userId) return sendResponse(res, 400, { message: validationError });
    try {
        const items = await basketHelper.getBasket(userId);
        sendResponse(res, 200, 
          {
            status: true,
            basket: items.map(id => new BasketItemDto(id)),
            totalAmount : calculateTotal(items),
          });
    } catch (error) {        
        console.error("Error adding item to basket:", error);
        sendResponse(res, 500, { status: false, message: "Internal server error" });
    }
};
