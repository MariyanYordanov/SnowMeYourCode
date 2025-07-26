const bcrypt = require('bcrypt');
const { User } = require('../models/User');

const identityName = 'email';

async function register(name, identity, password){

    const existingUser = await User.findOne({ [identityName]: identity });

    if(existingUser){
        throw new Error(`User [${identityName}] already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
        name: name,
        [identityName]: identity, 
        password: hashedPassword
    });

    await user.save();

    return user;    
}

async function login(identity, password){

    const user = await User.findOne({ [identityName]: identity });

    if(!user){
        throw new Error('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if(!isPasswordValid){
        throw new Error('Invalid credentials');
    }

    return user;
}

module.exports = { register, login };