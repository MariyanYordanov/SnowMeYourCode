const { Router } = require('express');
const { getAll, getById } = require('../services/product');
// TODO replace with your own router
const baseController = Router();

baseController.get('/', async (req, res) => {
    const products = await getAll();
    res.render('home', { products, title: 'Home Page' });
});

baseController.get('/about', (req, res) => {
    res.render('about', { title: 'About Page' });
});

baseController.get('/details/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const product = await getById(id);
        product.owner == req.user._id;

        res.render('details', { product, title: 'Product Details' });
    } catch (error) {
        console.error(error);
        res.redirect('/404');
    }
});

baseController.get('/catalog', async (req, res) => {
    const products = await getAll();
    res.render('catalog', { products, title: 'Catalog Page' });
});

// baseController.get('/404', (req, res) => {
//     res.render('404', { title: 'Page Not Found' });
// });

// baseController.get('*', (req, res) => {
//     res.redirect('/404');
// });

module.exports = { baseController };