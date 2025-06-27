const VNPay = require('../util/vnpay');
const Order = require('../models/order');
const User = require('../models/user');
const { sendEmail } = require('../util/email');

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
            quantity: item.quantity,
            product: {
                _id: item._id,
                title: item.title,
                price: item.price,
                imageUrl: item.imageUrl
            }
        }));

        const subtotal = products.reduce((total, item) => total + (item.product.price * item.quantity), 0);
        const shippingFee = subtotal >= 500000 ? 0 : 30000;
        const totalAmount = subtotal + shippingFee;

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
        let vnp_Params = { ...req.query };
        
        // Debug logging
        console.log('=== VNPay Return URL Debug ===');
        console.log('Query params:', req.query);
        console.log('Response Code:', vnp_Params.vnp_ResponseCode);
        console.log('Transaction No:', vnp_Params.vnp_TransactionNo);
        console.log('Amount:', vnp_Params.vnp_Amount);
        console.log('Order ID:', vnp_Params.vnp_TxnRef);
        
        const isValidSignature = vnpay.verifyReturnUrl(vnp_Params);
        console.log('Signature valid:', isValidSignature);

        if (!isValidSignature) {
            console.log('❌ Signature validation failed');
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

        const order = await Order.findById(orderId);
        if (!order) {
            return res.render('shop/payment-result', {
                pageTitle: 'Không tìm thấy đơn hàng',
                path: '/payment-result',
                success: false,
                message: 'Không tìm thấy đơn hàng',
                orderId
            });
        }

        console.log('Processing response code:', responseCode);
        
        if (responseCode === '00') {
            console.log('✅ Payment successful - Response code 00');
            if (order.status !== 'paid') {
                console.log('Updating order status to paid');
                order.status = 'paid';
                order.paymentMethod = 'vnpay';
                order.paymentDetails = {
                    transactionNo,
                    bankCode,
                    responseCode,
                    paidAt: new Date()
                };
                await order.save();
                console.log('Order updated successfully');

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
                    if (order.shippingInfo?.email) {
                        await sendEmail(
                            order.shippingInfo.email,
                            'Xác nhận thanh toán đơn hàng',
                            `Đơn hàng #${orderId} đã được thanh toán thành công qua VNPay.\n\nMã giao dịch: ${transactionNo}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ\n\nCảm ơn bạn đã mua hàng!`
                        );
                    }
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
                formattedAmount: amount.toLocaleString('vi-VN')
            });

        } else {
            console.log('❌ Payment failed - Response code:', responseCode);
            console.log('Failure reason:', vnpay.getResponseMessage(responseCode));
            
            order.status = 'payment_failed';
            order.paymentDetails = {
                responseCode,
                failedAt: new Date(),
                failureReason: vnpay.getResponseMessage(responseCode)
            };
            await order.save();
            console.log('Order marked as failed');

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
        let vnp_Params = { ...req.query };
        const isValidSignature = vnpay.verifyReturnUrl(vnp_Params);

        if (!isValidSignature) {
            return res.json({ RspCode: '97', Message: 'Invalid signature' });
        }

        const orderId = vnp_Params.vnp_TxnRef;
        const responseCode = vnp_Params.vnp_ResponseCode;
        const amount = parseInt(vnp_Params.vnp_Amount, 10) / 100;

        const order = await Order.findById(orderId);
        if (!order) return res.json({ RspCode: '01', Message: 'Order not found' });

        if (order.totalPrice !== amount) {
            return res.json({ RspCode: '04', Message: 'Invalid amount' });
        }

        if (responseCode === '00') {
            if (order.status !== 'paid') {
                order.status = 'paid';
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
