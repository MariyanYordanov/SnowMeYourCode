const jwt = require('jsonwebtoken');

const secret = 'my secret';

// TODO identity name

function createToken(data){
    const payload = {
        _id: data._id,
        email: data.email,
    }

    const token = jwt.sign(payload, secret, { expiresIn: '1d' });

    return token;   
}

function verifyToken(token){
    const data = jwt.verify(token, secret);
    return data;
}

module.exports = { createToken, verifyToken };