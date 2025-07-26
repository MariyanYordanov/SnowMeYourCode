const { Schema, model, Types } = require('mongoose');

const productSchema = new Schema({
    brand: {
        type: String,
        required: true,
        minLength: [1, 'Brand should be more than 2 characters'],
    },
    model: {
        type: String,
        required: true,
        minLength: [1, 'Model should be more than 5 characters'],
        maxLength: [20, 'Model should be less than 20 characters'],
    },
    hardDisk: {
        type: String,
        required: true,
        minLength: [1, 'Hard disk should be more than 5 characters'],
        maxLength: [20, 'Hard disk should be less than 20 characters'],
    },
    screenSize: {
        type: String,
        required: true,
        minLength: [1, 'Screen size should be more than 1 characters'],
        maxLength: [10, 'Screen size should be less than 10 characters'],
    },
    ram: {
        type: String,
        required: true,
        minLength: [2, 'Ram should be more than 2 characters'],
        maxLength: [10, 'Ram should be less than 10 characters'],
    },
    operatingSystem: {
        type: String,
        required: true,
        minLength: [1, 'Operation sistem should be more than 1 characters'],
        maxLength: [20, 'Operation sistem should be less than 20 characters'],
    },
    cpu: {
        type: String,
        required: true,
        minLength: [1, 'Cpu should be more than 1 characters'],
        maxLength: [50, 'Cpu should be less than 50 characters'],
    },
    gpu: {
        type: String,
        required: true,
        minLength: [1, 'Cpu should be more than 1 characters'],
        maxLength: [50, 'Cpu should be less than 50 characters'],
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price should be a positive number'],
    },
    color: {
        type: String,
        required: true,
        minLength: [2, 'Color should be more than 2 characters'],
        maxLength: [50, 'Color should be less than 50 characters'],
    },
    weight: {
        type: String,
        required: true,
        minLength: [1, 'Weight should be more than 1 characters'],
        maxLength: [20, 'Weight should be less than 20 characters'],
    },
    image: {
        type: String,
        required: true,
    },
    preferredList: {
        type: [Types.ObjectId],
        ref: 'User',
        default: [],
    },
    owner: {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    },
});

const Product = model('Product', productSchema);

module.exports = { Product };