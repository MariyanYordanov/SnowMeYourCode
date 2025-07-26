const { verifyToken } = require("../services/jwt");

function session(){
    return function (req, res, next){
        const token = req.cookies?.token;
        if(token){
            try {
                const sessionData = verifyToken(token);
                req.user = {
                    _id: sessionData._id,
                    email: sessionData.email,
                }
                res.locals.hasUser = true;
            } catch (error) {
                res.clearCookie('token');
            }
        }
        next();
    }
} 

module.exports = { session };