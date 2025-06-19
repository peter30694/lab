const Order = require('../models/order');
const MomoPaymentService = require('../util/momo');
const { sendOrderConfirmation, sendNewOrderNotification } = require('../util/email');
const User = require('../models/user');

/**
 * Xử lý callback return từ MoMo (khi user quay lại từ trang thanh toán)
 */
exports.handleMomoReturn = async (req, res, next) => {
    try {
        const momoService = new MomoPaymentService();
        const result = momoService.processPaymentResult(req.query);
        
        if (result.success) {
            // Cập nhật trạng thái đơn hàng
            await Order.updatePaymentStatus(result.orderId, 'paid');
            
            // Chuyển hướng đến trang đơn hàng với thông báo thành công
            res.redirect('/orders?success=true&payment=momo');
        } else {
            // Chuyển hướng đến trang đơn hàng với thông báo lỗi
            res.redirect('/orders?error=true&message=' + encodeURIComponent(result.error));
        }
    } catch (error) {
        console.error('Lỗi xử lý MoMo return:', error);
        res.redirect('/orders?error=true&message=' + encodeURIComponent('Lỗi xử lý thanh toán'));
    }
};

/**
 * Xử lý webhook notify từ MoMo (callback từ server MoMo)
 */
exports.handleMomoNotify = async (req, res, next) => {
    try {
        const momoService = new MomoPaymentService();
        const result = momoService.processPaymentResult(req.body);
        
        if (result.success) {
            // Cập nhật trạng thái đơn hàng
            await Order.updatePaymentStatus(result.orderId, 'paid');
            
            // Lấy thông tin đơn hàng để gửi email
            const order = await Order.findById(result.orderId);
            if (order) {
                const user = await User.findById(order.userId);
                if (user) {
                    // Gửi email xác nhận thanh toán thành công
                    Promise.all([
                        sendOrderConfirmation(order, user),
                        sendNewOrderNotification(order, user)
                    ]).catch(err => {
                        console.error('Lỗi khi gửi email xác nhận thanh toán:', err);
                    });
                }
            }
            
            // Trả về response cho MoMo
            res.status(200).json({
                errorCode: 0,
                message: 'Success'
            });
        } else {
            console.error('Thanh toán MoMo thất bại:', result.error);
            
            // Cập nhật trạng thái đơn hàng thành failed
            await Order.updatePaymentStatus(result.orderId, 'failed');
            
            res.status(200).json({
                errorCode: 1,
                message: result.error
            });
        }
    } catch (error) {
        console.error('Lỗi xử lý MoMo notify:', error);
        res.status(500).json({
            errorCode: 1,
            message: 'Internal server error'
        });
    }
};

/**
 * Kiểm tra trạng thái thanh toán MoMo
 */
exports.checkMomoPaymentStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'Order ID is required'
            });
        }
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            orderId: order._id,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod
        });
    } catch (error) {
        console.error('Lỗi kiểm tra trạng thái thanh toán:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};