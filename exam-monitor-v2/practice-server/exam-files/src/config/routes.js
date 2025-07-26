const { baseController } = require("../controllers/catalog");
const { userController } = require("../controllers/user");
const { productController } = require("../controllers/product");

function configRoutes(app){
    app.use(baseController);
    app.use(userController);
    app.use(productController);
    //TODO set routers
}

module.exports = { configRoutes };    