const VNPay = require('../util/vnpay');
const Order = require('../models/order');
const User = require('../models/user');
const { sendEmail } = require('../util/email');

// Khởi tạo VNPay instance
const vnpay = new VNPay();

// Tạo URL thanh toán VNPay
exports.createPayment = async (req, res, next) => {
    try {
        // Debug: Log toàn bộ req.body
        console.log('=== VNPay createPayment - req.body ===');
        console.log(JSON.stringify(req.body, null, 2));
        console.log('=====================================');
        
        const { name, phone, email, address, paymentMethod } = req.body;
        
        // Validate input
        if (!name || !phone || !address || paymentMethod !== 'vnpay') {
            return res.status(400).json({
                success: false,
                message: 'Thông tin đơn hàng không hợp lệ'
            });
        }
        
        // Lấy thông tin user và cart
        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }
        
        const user = new User(userData.name, userData.email, userData.role);
        user._id = userData._id;
        user.cart = userData.cart || { items: [], totalPrice: 0 };
        
        const cart = await user.getCart();
        
        if (!cart.items || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }
        
        // Tính toán tổng tiền
        const products = cart.items.map(item => {
            return {
                quantity: item.quantity,
                product: {
                    _id: item._id,
                    title: item.title,
                    price: item.price,
                    imageUrl: item.imageUrl
                }
            };
        });
        
        const subtotal = products.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);
        
        const shippingFee = subtotal >= 500000 ? 0 : 30000;
        const totalAmount = subtotal + shippingFee;
        
        // Tạo đơn hàng tạm thời
        const order = new Order(
            req.session.user._id,
            products,
            totalAmount,
            {
                name: name,
                phone: phone,
                email: email || req.session.user.email,
                address: address
            },
            'vnpay'
        );
        
        order.status = 'pending_payment';
        order.shippingFee = shippingFee;
        
        const savedOrder = await order.save();
        
        // Lấy IP address của client
        const ipAddr = req.headers['x-forwarded-for'] ||
                      req.connection.remoteAddress ||
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                      '127.0.0.1';
        
        // Tạo URL thanh toán
        const paymentUrl = vnpay.createPaymentUrl(
            savedOrder.insertedId.toString(),
            totalAmount,
            `Thanh toán đơn hàng ${savedOrder.insertedId}`,
            ipAddr
        );
        
        res.json({
            success: true,
            paymentUrl: paymentUrl,
            orderId: savedOrder.insertedId
        });
        
    } catch (error) {
        console.error('Lỗi tạo URL thanh toán VNPay:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi tạo URL thanh toán: ' + error.message
        });
    }
};

// Xử lý kết quả trả về từ VNPay
exports.vnpayReturn = async (req, res, next) => {
    try {
        // Debug: Log toàn bộ req.query
        console.log('=== VNPay Return - req.query ===');
        console.log(JSON.stringify(req.query, null, 2));
        console.log('================================');
        
        let vnp_Params = req.query;
        
        // Xác thực chữ ký
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
        const amount = vnp_Params.vnp_Amount / 100; // Chia cho 100 vì VNPay nhân với 100
        const transactionNo = vnp_Params.vnp_TransactionNo;
        const bankCode = vnp_Params.vnp_BankCode;
        
        // Tìm đơn hàng
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.render('shop/payment-result', {
                pageTitle: 'Kết quả thanh toán',
                path: '/payment-result',
                success: false,
                message: 'Không tìm thấy đơn hàng',
                orderId: orderId
            });
        }
        
        if (responseCode === '00') {
            // Thanh toán thành công
            order.status = 'paid';
            order.paymentMethod = 'vnpay';
            order.paymentDetails = {
                transactionNo: transactionNo,
                bankCode: bankCode,
                responseCode: responseCode,
                paidAt: new Date()
            };
            
            await order.save();
            
            // Xóa giỏ hàng sau khi thanh toán thành công
            try {
                const userData = await User.findById(order.userId);
                if (userData) {
                    const user = new User(userData.name, userData.email, userData.role);
                    user._id = userData._id;
                    await user.clearCart();
                }
            } catch (cartError) {
                console.error('Lỗi xóa giỏ hàng:', cartError);
            }
            
            // Gửi email xác nhận
            try {
                if (order.shippingInfo && order.shippingInfo.email) {
                    await sendEmail(
                        order.shippingInfo.email,
                        'Xác nhận thanh toán đơn hàng',
                        `Đơn hàng #${orderId} đã được thanh toán thành công qua VNPay.\n\nMã giao dịch: ${transactionNo}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ\n\nCảm ơn bạn đã mua hàng!`
                    );
                }
            } catch (emailError) {
                console.error('Lỗi gửi email xác nhận:', emailError);
            }
            
            res.render('shop/payment-result', {
                pageTitle: 'Thanh toán thành công',
                path: '/payment-result',
                success: true,
                message: 'Thanh toán thành công',
                orderId: orderId,
                transactionNo: transactionNo,
                amount: amount
            });
            
        } else {
            // Thanh toán thất bại
            order.status = 'payment_failed';
            order.paymentDetails = {
                responseCode: responseCode,
                failedAt: new Date(),
                failureReason: vnpay.getResponseMessage(responseCode)
            };
            
            await order.save();
            
            res.render('shop/payment-result', {
                pageTitle: 'Thanh toán thất bại',
                path: '/payment-result',
                success: false,
                message: vnpay.getResponseMessage(responseCode),
                orderId: orderId
            });
        }
        
    } catch (error) {
        console.error('Lỗi xử lý kết quả VNPay:', error);
        res.render('shop/payment-result', {
            pageTitle: 'Lỗi thanh toán',
            path: '/payment-result',
            success: false,
            message: 'Có lỗi xảy ra khi xử lý kết quả thanh toán',
            orderId: req.query.vnp_TxnRef || 'N/A'
        });
    }
};

// Xử lý IPN (Instant Payment Notification) từ VNPay
exports.vnpayIPN = async (req, res, next) => {
    try {
        // Debug: Log toàn bộ req.query
        console.log('=== VNPay IPN - req.query ===');
        console.log(JSON.stringify(req.query, null, 2));
        console.log('=============================');
        
        let vnp_Params = req.query;
        
        // Xác thực chữ ký
        const isValidSignature = vnpay.verifyReturnUrl(vnp_Params);
        
        if (!isValidSignature) {
            return res.json({ RspCode: '97', Message: 'Invalid signature' });
        }
        
        const orderId = vnp_Params.vnp_TxnRef;
        const responseCode = vnp_Params.vnp_ResponseCode;
        const amount = vnp_Params.vnp_Amount / 100;
        
        // Tìm đơn hàng
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.json({ RspCode: '01', Message: 'Order not found' });
        }
        
        // Kiểm tra số tiền
        if (order.totalPrice !== amount) {
            return res.json({ RspCode: '04', Message: 'Invalid amount' });
        }
        
        if (responseCode === '00') {
            // Cập nhật trạng thái đơn hàng nếu chưa được cập nhật
            if (order.status !== 'paid') {
                order.status = 'paid';
                order.paymentMethod = 'vnpay';
                order.paymentDetails = {
                    transactionNo: vnp_Params.vnp_TransactionNo,
                    bankCode: vnp_Params.vnp_BankCode,
                    responseCode: responseCode,
                    paidAt: new Date()
                };
                
                await order.save();
            }
            
            res.json({ RspCode: '00', Message: 'Success' });
        } else {
            res.json({ RspCode: '00', Message: 'Success' });
        }
        
    } catch (error) {
        console.error('Lỗi xử lý IPN VNPay:', error);
        res.json({ RspCode: '99', Message: 'Unknown error' });
    }
};