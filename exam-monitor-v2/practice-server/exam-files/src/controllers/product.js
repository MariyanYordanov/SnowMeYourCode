const { Router } = require('express');
const { body, validationResult } = require('express-validator');    
const { isUser } = require('../middlewares/guards');
const { getAll, getById, create, update, deleteById, getRecent } = require('../services/product');
const { parseError } = require('../util');
const { urlToHttpOptions } = require('url');
const { log } = require('console');

const productController = Router();

productController.get('/create', 
    isUser(), 
    (req, res) => { res.render('create', { title: 'Create Product' });
});

productController.post('/create', 
    isUser(),
    body('brand').trim().isLength({ min: 3 }).withMessage('Brand must be at least 3 characters long'),
    body('model').trim().isLength({ min: 3 }).withMessage('Model must be at least 3 characters long'),
    body('hardDisk').trim().isLength({ min: 3 }).withMessage('Model must be at least 3 characters long'),
    body('screenSize').trim().isLength({ min: 3 }).withMessage('Model must be at least 3 characters long'),
    body('ram').trim().isLength({ min: 1 }).withMessage('Ram must be at least 1 character long'),   
    body('operatingSystem').trim().isLength({ min: 3 }).withMessage('Operation sistem must be at least 3 characters long'),
    body('cpu').trim().isLength({ min: 3 }).withMessage('Cpu must be at least 3 characters long'),
    body('gpu').trim().isLength({ min: 3 }).withMessage('Gpu must be at least 3 characters long'),
    body('price').trim().isLength({ min: 1 }).withMessage('Price must be at least 1 character long'),
    body('color').trim().isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('weight').trim().isLength({ min: 1 }).withMessage('Weight must be at least 1 character long'),
    body('image').trim().isURL().withMessage('Image must be a valid URL'),
    async (req, res) => {

    try {
        const validation = validationResult(req);

        if(validation.errors.length){
            throw validation.errors;
        }

        const result = await create(req.body, req.user._id);
        res.redirect('/details/' + result._id);

    } catch (err) {
        res.render('create', { 
            title: 'Create Product', 
            data: req.body, 
            errors: parseError(err).errors 
        });
    }
});

module.exports = { productController };