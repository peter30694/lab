const VNPayService = require('../util/vnpay');
const Order = require('../models/order');
const { sendEmail, sendOrderConfirmation } = require('../util/email');

function getVNPayResponseMessage(responseCode) {
    const messages = {
        '00': 'Giao dịch thành công',
        '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
        '09': 'Thẻ/Tài khoản chưa đăng ký InternetBanking.',
        '10': 'Xác thực thông tin sai quá 3 lần.',
        '11': 'Hết hạn chờ thanh toán.',
        '12': 'Thẻ/Tài khoản bị khóa.',
        '13': 'Sai mật khẩu OTP.',
        '24': 'Khách hàng hủy giao dịch.',
        '51': 'Không đủ số dư.',
        '65': 'Vượt hạn mức giao dịch trong ngày.',
        '75': 'Ngân hàng đang bảo trì.',
        '79': 'Sai mật khẩu thanh toán quá số lần quy định.',
        '99': 'Lỗi không xác định.'
    };
    return messages[responseCode] || 'Lỗi không xác định';
}

exports.handleVNPayReturn = async (req, res) => {
    try {
        console.log('\n===== VNPay RETURN Callback =====');
        console.log('Query:', req.query);

        const vnpayService = new VNPayService();
        const isValid = vnpayService.verifyReturnUrl(req.query);
        const isSuccess = req.query.vnp_ResponseCode === '00';
        if (!isValid) {
            console.log('❌ Chữ ký VNPay không hợp lệ');
            return res.redirect('/orders?error=Chữ ký không hợp lệ');
        }
        if (!isValid) {
            return res.redirect('/orders?error=Chữ ký không hợp lệ');
        }

        const orderId = req.query.vnp_TxnRef;
        const transactionId = req.query.vnp_TransactionNo || 'UNKNOWN';

        if (isSuccess) {
            console.log('✅ Thanh toán thành công:', orderId);

            await Order.updatePaymentStatus(orderId, {
                paymentStatus: 'paid',
                paymentMethod: 'vnpay',
                transactionId: transactionId,
                paidAt: new Date(),
                vnpayData: req.query
            });

            return res.redirect('/orders?success=Thanh toán VNPay thành công!');
        } else {
            console.log('❌ Thanh toán thất bại:', orderId);
            const message = getVNPayResponseMessage(req.query.vnp_ResponseCode);

            await Order.updatePaymentStatus(orderId, {
                paymentStatus: 'failed',
                paymentMethod: 'vnpay',
                failedAt: new Date(),
                failureReason: message
            });

            return res.redirect(`/orders?error=${encodeURIComponent(message)}`);
        }

    } catch (error) {
        console.error('❌ Lỗi xử lý return VNPay:', error);
        return res.redirect('/orders?error=Có lỗi xảy ra khi xử lý thanh toán!');
    }
};

exports.handleVNPayIPN = async (req, res) => {
    try {
        console.log('\n===== VNPay IPN Callback =====');
        console.log('Query:', req.query);

        const vnpayService = new VNPayService();
        const isValid = vnpayService.verifyReturnUrl(req.query);
        const isSuccess = req.query.vnp_ResponseCode === '00';

        if (!isValid) {
            return res.status(200).json({ RspCode: '97', Message: 'invalid signature' });
        }

        const orderId = req.query.vnp_TxnRef;
        const transactionId = req.query.vnp_TransactionNo || 'UNKNOWN';

        if (isSuccess) {
            console.log('✅ IPN hợp lệ:', orderId);

            await Order.updatePaymentStatus(orderId, {
                paymentStatus: 'paid',
                paymentMethod: 'vnpay',
                transactionId: transactionId,
                paidAt: new Date(),
                vnpayData: req.query
            });

            try {
                const order = await Order.findById(orderId);
                const email = order?.shippingInfo?.email;
                const name = order?.shippingInfo?.name;

                if (email) {
                    await sendOrderConfirmation(email, name, {
                        orderId: order._id,
                        items: order.items,
                        totalAmount: order.totalPrice,
                        paymentMethod: 'VNPay',
                        status: 'Đã thanh toán'
                    });
                    console.log('✅ Đã gửi email xác nhận.');
                }
            } catch (err) {
                console.error('❌ Gửi email lỗi:', err);
            }

            return res.status(200).json({ RspCode: '00', Message: 'success' });
        } else {
            const message = getVNPayResponseMessage(req.query.vnp_ResponseCode);

            await Order.updatePaymentStatus(orderId, {
                paymentStatus: 'failed',
                paymentMethod: 'vnpay',
                failedAt: new Date(),
                failureReason: message
            });

            return res.status(200).json({ RspCode: '00', Message: 'transaction recorded as failed' });
        }

    } catch (error) {
        console.error('❌ Lỗi IPN:', error);
        return res.status(200).json({ RspCode: '99', Message: 'unknown error' });
    }
};

exports.checkVNPayPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng' });
        }

        console.log('🔍 Kiểm tra đơn hàng:', orderId);

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        return res.json({
            success: true,
            orderId,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            transactionId: order.transactionId,
            paidAt: order.paidAt,
            message: 'Lấy thông tin đơn hàng thành công'
        });
    } catch (error) {
        console.error('❌ Lỗi kiểm tra trạng thái:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi kiểm tra thanh toán' });
    }
};