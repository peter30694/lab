const { AppError, ValidationError, AuthenticationError, NotFoundError, DatabaseError } = require('../util/errors');

// Middleware xử lý 404 - Not Found
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Không tìm thấy trang: ${req.originalUrl}`);
    next(error);
};

// Middleware xử lý lỗi chung
const errorHandler = (error, req, res, next) => {
    let err = { ...error };
    err.message = error.message;

    // Log lỗi để debug
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Xử lý các loại lỗi MongoDB
    if (error.name === 'CastError') {
        const message = 'ID không hợp lệ';
        err = new ValidationError(message);
    }

    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const message = `${field} đã tồn tại`;
        err = new ValidationError(message);
    }

    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map(val => val.message).join(', ');
        err = new ValidationError(message);
    }

    // Xử lý lỗi JWT
    if (error.name === 'JsonWebTokenError') {
        const message = 'Token không hợp lệ';
        err = new AuthenticationError(message);
    }

    if (error.name === 'TokenExpiredError') {
        const message = 'Token đã hết hạn';
        err = new AuthenticationError(message);
    }

    // Xác định status code và message
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Lỗi máy chủ nội bộ';

    // Trong môi trường production, không hiển thị chi tiết lỗi
    if (process.env.NODE_ENV === 'production' && !err.isOperational) {
        message = 'Đã xảy ra lỗi, vui lòng thử lại sau';
    }

    // Xử lý response dựa trên loại request
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        // API request - trả về JSON
        return res.status(statusCode).json({
            success: false,
            error: {
                message,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            }
        });
    }

    // Web request - render error page
    res.status(statusCode);
    
    // Render trang lỗi phù hợp
    if (statusCode === 404) {
        return res.render('error/404', {
            pageTitle: 'Không tìm thấy trang',
            path: '/404',
            message: message,
            url: req.originalUrl
        });
    }

    if (statusCode === 403) {
        return res.render('error/403', {
            pageTitle: 'Không có quyền truy cập',
            path: '/403',
            message: message
        });
    }

    if (statusCode === 401) {
        return res.render('error/401', {
            pageTitle: 'Chưa đăng nhập',
            path: '/401',
            message: message
        });
    }

    // Lỗi 500 hoặc các lỗi khác
    res.render('error/500', {
        pageTitle: 'Lỗi máy chủ',
        path: '/500',
        message: message,
        ...(process.env.NODE_ENV === 'development' && { 
            error: error,
            stack: error.stack 
        })
    });
};

// Middleware bắt lỗi async
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Middleware validation lỗi
const validationErrorHandler = (req, res, next) => {
    const errors = req.validationErrors();
    if (errors) {
        const message = errors.map(error => error.msg).join(', ');
        return next(new ValidationError(message));
    }
    next();
};

// Middleware rate limiting error
const rateLimitHandler = (req, res, next) => {
    const error = new AppError('Quá nhiều yêu cầu, vui lòng thử lại sau', 429);
    next(error);
};

module.exports = {
    notFoundHandler,
    errorHandler,
    asyncHandler,
    validationErrorHandler,
    rateLimitHandler
};