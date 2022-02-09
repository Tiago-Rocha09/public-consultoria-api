
function errorHandler(req, res, next) {
    res.sendError = function(code, status) {
        this.status(status).json({
            status,
            success: false,
            msg: code
        })
    }
    next()
}

export {
    errorHandler
}