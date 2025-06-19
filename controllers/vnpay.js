const VNPayService = require('../util/vnpay');
const Order = require('../models/order');
const { sendEmail } = require('../util/email');

/**
 * Xử lý return URL từ VNPay (khi user quay lại từ trang thanh toán)
 */
exports.handleVNPayReturn = async (req, res) => {
    try {
        console.log('🔄 Xử lý VNPay return:', req.query);
        
        const vnpayService = new VNPayService();
        const verifyResult = await vnpayService.verifyReturn(req.query);
        
        if (verifyResult.success) {
            // Thanh toán thành công
            console.log('✅ Thanh toán VNPay thành công:', verifyResult.orderId);
            
            // Cập nhật trạng thái đơn hàng
            await Order.updatePaymentStatus(verifyResult.orderId, 'paid', {
                paymentMethod: 'vnpay',
                transactionId: req.query.vnp_TransactionNo || '',
                paidAt: new Date(),
                vnpayData: verifyResult.vnpayData
            });
            
            // Chuyển hướng đến trang đơn hàng với thông báo thành công
            req.session.successMessage = `Thanh toán thành công! Mã giao dịch: ${req.query.vnp_TransactionNo || 'N/A'}`;
            return res.redirect('/orders');
            
        } else {
            // Thanh toán thất bại
            console.log('❌ Thanh toán VNPay thất bại:', verifyResult.orderId);
            
            // Cập nhật trạng thái đơn hàng
            await Order.updatePaymentStatus(verifyResult.orderId, 'failed', {
                paymentMethod: 'vnpay',
                failedAt: new Date(),
                failureReason: verifyResult.message || 'Thanh toán thất bại'
            });
            
            // Chuyển hướng đến trang đơn hàng với thông báo lỗi
            req.session.errorMessage = `Thanh toán thất bại: ${verifyResult.message || 'Vui lòng thử lại'}`;
            return res.redirect('/orders');
        }
        
    } catch (error) {
        console.error('❌ Lỗi xử lý VNPay return:', error);
        req.session.errorMessage = 'Có lỗi xảy ra khi xử lý thanh toán. Vui lòng liên hệ hỗ trợ.';
        return res.redirect('/orders');
    }
};

/**
 * Xử lý IPN (Instant Payment Notification) từ VNPay
 */
exports.handleVNPayIPN = async (req, res) => {
    try {
        console.log('🔄 Xử lý VNPay IPN:', req.query);
        
        const vnpayService = new VNPayService();
        const verifyResult = await vnpayService.verifyIPN(req.query);
        
        if (verifyResult.success) {
            console.log('✅ IPN VNPay hợp lệ:', verifyResult.orderId);
            
            // Cập nhật trạng thái đơn hàng
            await Order.updatePaymentStatus(verifyResult.orderId, 'paid', {
                paymentMethod: 'vnpay',
                transactionId: req.query.vnp_TransactionNo || '',
                paidAt: new Date(),
                vnpayData: verifyResult
            });
            
            // Gửi email xác nhận
            try {
                const order = await Order.findById(verifyResult.orderId);
                if (order && order.user && order.user.email) {
                    await sendEmail(
                        order.user.email,
                        'Xác nhận thanh toán thành công',
                        `
                        <h2>Thanh toán thành công!</h2>
                        <p>Đơn hàng <strong>${verifyResult.orderId}</strong> đã được thanh toán thành công qua VNPay.</p>
                        <p><strong>Mã giao dịch:</strong> ${req.query.vnp_TransactionNo || 'N/A'}</p>
                        <p><strong>Số tiền:</strong> ${verifyResult.amount?.toLocaleString('vi-VN')} VNĐ</p>
                        <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                        <p>Cảm ơn bạn đã mua hàng!</p>
                        `
                    );
                    console.log('✅ Đã gửi email xác nhận thanh toán VNPay');
                }
            } catch (emailError) {
                console.error('❌ Lỗi gửi email xác nhận VNPay:', emailError);
            }
            
            // Trả về response cho VNPay
            return res.status(200).json({ RspCode: '00', Message: 'success' });
            
        } else {
            console.log('❌ IPN VNPay không hợp lệ:', verifyResult.orderId);
            
            // Cập nhật trạng thái đơn hàng thất bại
            await Order.updatePaymentStatus(verifyResult.orderId, 'failed', {
                paymentMethod: 'vnpay',
                failedAt: new Date(),
                failureReason: verifyResult.message || 'IPN không hợp lệ'
            });
            
            return res.status(400).json({ RspCode: '97', Message: 'Invalid signature' });
        }
        
    } catch (error) {
        console.error('❌ Lỗi xử lý VNPay IPN:', error);
        return res.status(500).json({ RspCode: '99', Message: 'Internal server error' });
    }
};

/**
 * Kiểm tra trạng thái thanh toán VNPay
 */
exports.checkVNPayPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã đơn hàng'
            });
        }
        
        console.log('🔄 Kiểm tra trạng thái thanh toán VNPay:', orderId);
        
        // Lấy thông tin đơn hàng từ database
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }
        
        return res.json({
            success: true,
            orderId: orderId,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            transactionId: order.transactionId,
            paidAt: order.paidAt,
            message: 'Lấy thông tin đơn hàng thành công'
        });
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra trạng thái VNPay:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra trạng thái thanh toán'
        });
    }
};