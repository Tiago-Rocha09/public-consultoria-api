import jwt from 'jsonwebtoken';
import { Errors } from '../util/error.js';
import { checkToken } from '../util/jwt.js';

function checkAuth() {
    return async function(req, res, next) {
        const { authorization } = req.headers
        if(!authorization) return res.sendError(Errors.NOT_AUTHENTICATED, 401)
    
        const token = authorization?.split(' ')[1]
        const { userId, businessId } = await checkToken({token})
    
        if(userId) {
            req.userId = userId;
            req.businessId = businessId;
            next()
        } else {
            return res.sendError(Errors.NOT_AUTHENTICATED, 401)
        }
    }
}

export { 
    checkAuth 
}