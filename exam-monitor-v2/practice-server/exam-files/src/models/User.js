const { Schema, model } = require('mongoose');
// TODO add/change property names according to the project requirements
const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        minLenght: [2, 'Name should be more than 2 characters'],
        maxLenght: [20, 'Name should be less than 20 characters'],
    },
    email: {
        type: String,
        required: true,
        minLenght: [10, 'Email should be more than 10 characters'],
    },
    password: {
        type: String,
        required: true,
        minLenght: [4, 'Password should be more than 4 characters'],
    },
},{
    collation: { 
        locale: 'en', 
        strength: 2 
    },
});

const User = model('User', userSchema);

module.exports = { User };

