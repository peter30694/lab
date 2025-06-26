const path = require('path');
const fs = require('fs');

const express = require('express');

const rootDir = require('../util/path');

const products = require('./admin').products;

const shopController = require('../controllers/shop');


const { sendOrderConfirmation } = require('../util/email');
const User = require('../models/user');
const isAuth = require('../middleware/is-auth');
const { getDb } = require('../util/database');

const router = express.Router();

// Route tạo và đăng nhập user mặc định
router.get('/create-default-user', async (req, res, next) => {
    try {
        // Kiểm tra xem user đã tồn tại chưa
        let user = await User.findByEmail('default@example.com');

        if (!user) {
            // Tạo user mới nếu chưa tồn tại
            const newUser = new User('Default User', 'default@example.com');
            newUser.role = 'admin'; // Set role là admin
            const result = await newUser.save();

            if (!result.insertedId) {
                throw new Error('Không thể tạo user mới - không có insertedId');
            }

            user = await User.findById(result.insertedId);
            if (!user) {
                throw new Error('Không thể tìm thấy user sau khi tạo');
            }

            console.log('Đã tạo user mới:', user);
        }

        // Lưu user vào session
        req.session.user = {
            _id: user._id.toString(),
            email: user.email,
            role: user.role || 'admin'
        };

        await req.session.save();
        console.log('Session user:', req.session.user);

        return res.redirect('/');
    } catch (err) {
        console.error('Lỗi khi tạo/đăng nhập user:', err);
        return res.status(500).json({
            error: 'Không thể tạo/đăng nhập user',
            details: err.message
        });
    }
});

// Trang chủ
router.get('/', shopController.getIndex);

// Danh sách sản phẩm
router.get('/products', shopController.getProducts);

// Chi tiết sản phẩm
router.get('/products/:productId', shopController.getProduct);

// Giỏ hàng - cần đăng nhập
router.get('/cart', isAuth, shopController.getCart);
router.post('/cart', isAuth, shopController.postCart);
router.post('/cart/add', isAuth, shopController.postCart); // AJAX endpoint
router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);
router.post('/cart-update-quantity', isAuth, shopController.postCartUpdateQuantity);

// Đơn hàng - cần đăng nhập
router.post('/orders', isAuth, shopController.postOrder);
router.get('/orders', isAuth, shopController.getOrders);

// Route tải xuống hóa đơn cho người dùng
router.get('/download-invoice/:orderId', isAuth, shopController.getDownloadInvoice);

router.get('/checkout', isAuth, shopController.getCheckout);





module.exports = router;
