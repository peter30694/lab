const { body, validationResult } = require('express-validator');

// Middleware để xử lý kết quả validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errorMessages
        });
    }
    next();
};

// Validation rules cho product
const validateProduct = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Tên sản phẩm phải từ 3-100 ký tự'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Giá sản phẩm phải là số dương'),
    body('description')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Mô tả sản phẩm phải từ 10-1000 ký tự'),
    body('category')
        .trim()
        .notEmpty()
        .withMessage('Danh mục sản phẩm không được để trống'),
    handleValidationErrors
];

// Validation rules cho user registration
const validateUserRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Tên phải từ 2-50 ký tự'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email không hợp lệ'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
    handleValidationErrors
];

// Validation rules cho user login
const validateUserLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email không hợp lệ'),
    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống'),
    handleValidationErrors
];

// Validation rules cho shipping info
const validateShippingInfo = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Tên người nhận phải từ 2-50 ký tự'),
    body('phone')
        .matches(/^[0-9]{10,11}$/)
        .withMessage('Số điện thoại phải có 10-11 chữ số'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email không hợp lệ'),
    body('address')
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('Địa chỉ phải từ 10-200 ký tự'),
    handleValidationErrors
];

// Validation rules cho order
const validateOrder = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('Đơn hàng phải có ít nhất 1 sản phẩm'),
    body('items.*.productId')
        .isMongoId()
        .withMessage('ID sản phẩm không hợp lệ'),
    body('items.*.quantity')
        .isInt({ min: 1, max: 100 })
        .withMessage('Số lượng phải từ 1-100'),
    body('totalPrice')
        .isFloat({ min: 0 })
        .withMessage('Tổng tiền phải là số dương'),
    body('paymentMethod')
        .isIn(['cod', 'bank', 'ewallet', 'credit'])
        .withMessage('Phương thức thanh toán không hợp lệ'),
    handleValidationErrors
];

// Validation rules cho ObjectId
const validateObjectId = (paramName) => [
    body(paramName)
        .isMongoId()
        .withMessage(`${paramName} không hợp lệ`),
    handleValidationErrors
];

// Sanitize input để tránh XSS
const sanitizeInput = [
    body('*').escape().trim()
];

module.exports = {
    handleValidationErrors,
    validateProduct,
    validateUserRegistration,
    validateUserLogin,
    validateShippingInfo,
    validateOrder,
    validateObjectId,
    sanitizeInput
};