const path = require('path');
const fs = require('fs');
const express = require('express');
const rootDir = require('../util/path');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, isAdmin, adminController.getAddProduct);

// /admin/add-product => POST
router.post('/add-product', isAuth, isAdmin, adminController.postAddProduct);

// /admin/products => GET
router.get('/products', isAuth, isAdmin, adminController.getProducts);

// /admin/edit-product/:productId => GET
router.get('/edit-product/:productId', isAuth, isAdmin, adminController.getEditProduct);

// /admin/edit-product => POST
router.post('/edit-product', isAuth, isAdmin, adminController.postEditProduct);

// /admin/delete-product => POST
router.post('/delete-product', isAuth, isAdmin, adminController.postDeleteProduct);

// Route tải xuống hóa đơn PDF
router.get('/download-invoice/:orderId', isAuth, isAdmin, adminController.getDownloadInvoice);

// Route xuất PDF danh sách sản phẩm
router.get('/export-products-pdf', isAuth, isAdmin, adminController.getExportProductsPDF);

// Routes quản lý đơn hàng
router.get('/orders', isAuth, isAdmin, adminController.getOrders);

// Route xem chi tiết đơn hàng
router.get('/orders/:orderId', isAuth, isAdmin, adminController.getOrderDetail);

// Route cập nhật trạng thái đơn hàng
router.post('/update-order-status', isAuth, isAdmin, adminController.postUpdateOrderStatus);

// Route cập nhật trạng thái thanh toán
router.post('/update-payment-status', isAuth, isAdmin, adminController.postUpdatePaymentStatus);

// Route tải hóa đơn
router.get('/orders/:orderId/invoice', isAuth, isAdmin, adminController.getDownloadInvoice);

module.exports = router;

