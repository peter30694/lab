const VNPay = require('../util/vnpay');
const Order = require('../models/order');
const User = require('../models/user');
const { sendEmail, sendOrderConfirmation } = require('../util/email');

const vnpay = new VNPay();

// Tạo URL thanh toán VNPay
exports.createPayment = async (req, res, next) => {
    try {
        const { name, phone, email, address, paymentMethod } = req.body;

        if (!name || !phone || !address || paymentMethod !== 'vnpay') {
            return res.status(400).json({ success: false, message: 'Thông tin đơn hàng không hợp lệ' });
        }

        const userData = await User.findById(req.session.user._id);
        if (!userData) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

        const user = new User(userData.name, userData.email, userData.role);
        user._id = userData._id;
        user.cart = userData.cart || { items: [], totalPrice: 0 };

        const cart = await user.getCart();
        if (!cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        const products = cart.items.map(item => ({
            productId: item._id,
            quantity: item.quantity,
            title: item.title,
            price: item.price,
            imageUrl: item.imageUrl
        }));

        const subtotal = products.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shippingFee = subtotal >= 500000 ? 0 : 30000;
        const totalAmount = subtotal + shippingFee;

        console.log('🔍 DEBUG - Creating order with userId:', req.session.user._id, 'Type:', typeof req.session.user._id);
        
        const order = new Order(
            req.session.user._id,
            products,
            totalAmount,
            { name, phone, email: email || userData.email, address },
            'vnpay'
        );
        order.status = 'pending_payment';
        order.shippingFee = shippingFee;

        const savedOrder = await order.save();

        const ipAddr = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            '127.0.0.1';

        const paymentUrl = vnpay.createPaymentUrl(
            savedOrder.insertedId.toString(),
            totalAmount,
            `Thanh toán đơn hàng ${savedOrder.insertedId}`,
            ipAddr
        );

        // Lưu paymentUrl vào đơn hàng
        await Order.updatePaymentUrl(savedOrder.insertedId, paymentUrl);

        res.json({
            success: true,
            paymentUrl,
            orderId: savedOrder.insertedId
        });

    } catch (error) {
        console.error('Lỗi tạo URL thanh toán VNPay:', error);
        res.status(500).json({ success: false, message: 'Lỗi tạo URL thanh toán: ' + error.message });
    }
};

// Xử lý Return URL từ VNPay
exports.vnpayReturn = async (req, res, next) => {
    try {
        console.log('--- VNPay Return Callback ---');
        console.log('Query params:', req.query);
        let vnp_Params = { ...req.query };
        const isValidSignature = vnpay.verifyReturnUrl(vnp_Params);

        if (!isValidSignature) {
            return res.render('shop/payment-result', {
                pageTitle: 'Kết quả thanh toán',
                path: '/payment-result',
                success: false,
                message: 'Chữ ký không hợp lệ',
                orderId: vnp_Params.vnp_TxnRef
            });
        }

        const orderId = vnp_Params.vnp_TxnRef;
        const responseCode = vnp_Params.vnp_ResponseCode;
        const amount = parseInt(vnp_Params.vnp_Amount, 10) / 100;
        const transactionNo = vnp_Params.vnp_TransactionNo;
        const bankCode = vnp_Params.vnp_BankCode;

        // Sửa: luôn thử tìm bằng ObjectId trước, nếu lỗi thì fallback sang string
        const mongodb = require('mongodb');
        let rawOrder = null;
        try {
            rawOrder = await Order.findById(new mongodb.ObjectId(orderId));
        } catch (e) {
            rawOrder = await Order.findById(orderId);
        }
        if (!rawOrder) {
            console.error('Không tìm thấy đơn hàng với orderId:', orderId);
            return res.render('shop/payment-result', {
                pageTitle: 'Không tìm thấy đơn hàng',
                path: '/payment-result',
                success: false,
                message: 'Không tìm thấy đơn hàng',
                orderId
            });
        }

        // Log kiểm tra số tiền
        if (rawOrder.totalPrice !== amount) {
            console.error('Số tiền không khớp:', rawOrder.totalPrice, amount);
        }

        // Tạo lại instance đúng
        const orderItems = Array.isArray(rawOrder.items) && rawOrder.items.length > 0
            ? rawOrder.items
            : (Array.isArray(rawOrder.products) ? rawOrder.products : []);
        const order = new Order(
            rawOrder.userId,
            orderItems,
            rawOrder.totalPrice,
            rawOrder.shippingInfo,
            rawOrder.paymentMethod
        );
        order._id = rawOrder._id;
        order.shippingFee = rawOrder.shippingFee;

        if (responseCode === '00') {
            if (order.status !== 'paid') {
                order.status = 'paid';
                order.paymentStatus = 'paid';
                order.paymentMethod = 'vnpay';
                order.paymentDetails = {
                    transactionNo,
                    bankCode,
                    responseCode,
                    paidAt: new Date()
                };
                await order.save();

                try {
                    const userData = await User.findById(order.userId);
                    if (userData) {
                        const user = new User(userData.name, userData.email, userData.role);
                        user._id = userData._id;
                        await user.clearCart();
                    }
                } catch (err) {
                    console.error('Lỗi xóa giỏ hàng:', err);
                }

                try {
                    await sendOrderConfirmation(order, { name: order.shippingInfo?.name, email: order.shippingInfo?.email });
                } catch (err) {
                    console.error('Lỗi gửi email xác nhận:', err);
                }
            }

            return res.render('shop/payment-result', {
                pageTitle: 'Thanh toán thành công',
                path: '/payment-result',
                success: true,
                message: 'Thanh toán thành công',
                orderId,
                transactionNo,
                amount
            });

        } else {
            order.status = 'payment_failed';
            order.paymentStatus = 'failed';
            order.paymentDetails = {
                responseCode,
                failedAt: new Date(),
                failureReason: vnpay.getResponseMessage(responseCode)
            };
            await order.save();

            return res.render('shop/payment-result', {
                pageTitle: 'Thanh toán thất bại',
                path: '/payment-result',
                success: false,
                message: vnpay.getResponseMessage(responseCode),
                orderId
            });
        }

    } catch (error) {
        console.error('Lỗi xử lý Return URL:', error);
        res.render('shop/payment-result', {
            pageTitle: 'Lỗi thanh toán',
            path: '/payment-result',
            success: false,
            message: 'Có lỗi xảy ra khi xử lý kết quả thanh toán',
            orderId: req.query.vnp_TxnRef || 'N/A'
        });
    }
};

// Xử lý IPN từ VNPay
exports.vnpayIPN = async (req, res, next) => {
    try {
        console.log('--- VNPay IPN Callback ---');
        console.log('Query params:', req.query);
        let vnp_Params = { ...req.query };
        const isValidSignature = vnpay.verifyReturnUrl(vnp_Params);

        if (!isValidSignature) {
            return res.json({ RspCode: '97', Message: 'Invalid signature' });
        }

        const orderId = vnp_Params.vnp_TxnRef;
        const responseCode = vnp_Params.vnp_ResponseCode;
        const amount = parseInt(vnp_Params.vnp_Amount, 10) / 100;

        const rawOrder = await Order.findById(orderId);
        if (!rawOrder) return res.json({ RspCode: '01', Message: 'Order not found' });

        const orderItems = Array.isArray(rawOrder.items) && rawOrder.items.length > 0
            ? rawOrder.items
            : (Array.isArray(rawOrder.products) ? rawOrder.products : []);
        const order = new Order(
            rawOrder.userId,
            orderItems,
            rawOrder.totalPrice,
            rawOrder.shippingInfo,
            rawOrder.paymentMethod
        );
        order._id = rawOrder._id;
        order.shippingFee = rawOrder.shippingFee;

        if (order.totalPrice !== amount) {
            return res.json({ RspCode: '04', Message: 'Invalid amount' });
        }

        if (responseCode === '00') {
            if (order.status !== 'paid') {
                order.status = 'paid';
                order.paymentStatus = 'paid';
                order.paymentMethod = 'vnpay';
                order.paymentDetails = {
                    transactionNo: vnp_Params.vnp_TransactionNo,
                    bankCode: vnp_Params.vnp_BankCode,
                    responseCode,
                    paidAt: new Date()
                };
                await order.save();
            }
        } else {
            order.status = 'payment_failed';
            order.paymentStatus = 'failed';
            order.paymentDetails = {
                responseCode,
                failedAt: new Date(),
                failureReason: vnpay.getResponseMessage(responseCode)
            };
            await order.save();
        }

        return res.json({ RspCode: '00', Message: 'Success' });

    } catch (error) {
        console.error('Lỗi xử lý IPN:', error);
        res.json({ RspCode: '99', Message: 'Unknown error' });
    }
};
