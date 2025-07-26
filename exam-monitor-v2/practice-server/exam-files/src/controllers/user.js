const { Router } = require('express');
const { parseError } = require('../util');
const { login, register } = require('../services/user');
const { createToken } = require('../services/jwt');
const { isGuest } = require('../middlewares/guards');
const { validationResult, body } = require('express-validator');

const userController = Router();

userController.get('/login', isGuest(), (req, res) => {
    res.render('login', { title: 'Login Page' });
});

userController.post('/login', isGuest(),
    body('email').trim(),
    body('password').trim(),
    async (req, res) => {
        const { email, password } = req.body;

        try {
            const result = await login(email, password);
            const token = createToken(result);
            res.cookie('token', token);
            console.log('Logged in as ' + result.email);
            res.redirect('/');
        } catch (err) {
            res.render('login', { data: { email }, errors: parseError(err).errors});
        }
    }
);

userController.get('/register', isGuest(), (req, res) => {
    res.render('register', { title: 'Register Page' });
});

userController.post('/register', 
    isGuest(), 
    body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
    body('email').trim().isEmail().isLength(10).withMessage('Invalid email'),
    body('password').trim().isLength({ min: 3 }).withMessage('Password must be at least 3 characters'),
    body('repass').trim().custom((value, { req }) => value == req.body.password).withMessage('Passwords don\'t match'),
    async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const validation = validationResult(req);   
        if (validation.errors.length) {
            throw validation.errors;
        }

        const result = await register(name, email, password);
        const token = createToken(result);
        res.cookie('token', token);
        res.redirect('/');
    } catch (err) {
        res.render('register', { 
            title: 'Error Register Page', 
            errors: parseError(err).errors,
            data: { email, name } 
        });
    }
});

userController.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

module.exports = { userController };