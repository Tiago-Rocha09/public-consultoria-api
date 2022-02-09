
import jwt from 'jsonwebtoken';

const JWT_KEY = "FI0%#*Bt{7m?>iS$HaS5Xg6?uB9oZ0H$+Yz{gP5J<7B5";

function createToken({userId, businessId}) {
    return jwt.sign({
        exp: Math.floor(Date.now() / 1000) + 600000000,
        userId,
        businessId
      }, JWT_KEY)
}

function checkToken({token}) {
    var decoded = jwt.verify(token, JWT_KEY);
    return { userId: decoded.userId, businessId: decoded.businessId }
}

export {
    createToken,
    checkToken
}