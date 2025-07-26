const express = require("express");
const cookieParser = require("cookie-parser");
const { session } = require("../middlewares/session");

const secret = "mySecret is the best secret";

function expressConfig(app) {
    
    app.use(cookieParser(secret));
    app.use(session());
    // TODO add other middlewares

    app.use('/static',express.static('static'));
    app.use(express.urlencoded({ extended: true }));
}

module.exports = { expressConfig };
