const { Product } = require('../models/Product');

async function getAll() {
    return await Product.find().lean();  
}

async function getById(id) {
    return await Product.findById(id); 
}

async function getRecent() {
    return await Product.find().sort({ $natural: -1 }).limit(3).lean();
}

async function create(data, ownerId) {

    const result = new Product({
        brand: data.brand,
        model: data.model,
        hardDisk: data.hardDisk,
        screenSize: data.screenSize,
        ram: data.ram,
        operatingSystem: data.operatingSystem,
        cpu: data.cpu,
        gpu: data.gpu,
        price: data.price,
        color: data.color,
        weight: data.weight,
        image: data.image,
        owner: ownerId,
    });

    return await result.save();
}

async function update(id, data, userId) {

    const record = await Product.findById(id);
    if(!record){
        throw new ReferenceError('Record not found' + id);
    }

    if(record.creator.toString() != userId){
        throw new ReferenceError('Access denied');
    }

    record.name = data.name;
    record.type = data.type;
    record.ram = data.ram;
    record.operationSistem = data.operationSistem;
    record.cpu = data.cpu;
    record.gpu = data.gpu;
    record.price = data.price;
    record.color = data.color;
    record.weight = data.weight;
    record.image = data.image;

    return await record.save();
}

async function deleteById(id, userId) {

    const record = await Product.findById(id);
    if(!record){
        throw new ReferenceError('Record not found' + id);
    }

    if(record.creator.toString() != userId){
        throw new ReferenceError('Access denied');
    }

    return await Product.findByIdAndDelete(id);
}

module.exports = { getAll, getById, create, update, deleteById, getRecent };
