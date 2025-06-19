const MomoPayment = require('momo-payment-sdk');
const crypto = require('crypto');

class MomoPaymentService {
    constructor() {
        // Cấu hình MoMo - sử dụng sandbox cho test
        this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
        this.accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
        this.secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
        this.environment = process.env.MOMO_ENVIRONMENT || 'sandbox';
        
        this.momoPayment = new MomoPayment({
            partnerCode: this.partnerCode,
            accessKey: this.accessKey,
            secretKey: this.secretKey,
            environment: this.environment
        });
        
        // URL cấu hình
        this.returnUrl = process.env.MOMO_RETURN_URL || 'http://localhost:5000/momo/return';
        this.notifyUrl = process.env.MOMO_NOTIFY_URL || 'http://localhost:5000/momo/notify';
    }

    /**
     * Tạo payment request cho MoMo
     * @param {Object} orderData - Thông tin đơn hàng
     * @returns {Promise<Object>} - Kết quả từ MoMo API
     */
    async createPayment(orderData) {
        try {
            const { orderId, amount, orderInfo, customerInfo } = orderData;
            
            const paymentData = {
                orderId: orderId,
                amount: amount,
                orderInfo: orderInfo || `Thanh toán đơn hàng ${orderId}`,
                returnUrl: this.returnUrl,
                notifyUrl: this.notifyUrl,
                extraData: JSON.stringify({
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone,
                    customerEmail: customerInfo.email
                })
            };

            const result = await this.momoPayment.createPayment(paymentData);
            
            if (result.errorCode === 0) {
                return {
                    success: true,
                    payUrl: result.payUrl,
                    orderId: result.orderId,
                    transId: result.transId
                };
            } else {
                return {
                    success: false,
                    error: result.localMessage || result.message,
                    errorCode: result.errorCode
                };
            }
        } catch (error) {
            console.error('Lỗi khi tạo payment MoMo:', error);
            return {
                success: false,
                error: 'Không thể kết nối đến MoMo'
            };
        }
    }

    /**
     * Xác thực signature từ MoMo callback
     * @param {Object} data - Dữ liệu từ MoMo callback
     * @returns {boolean} - True nếu signature hợp lệ
     */
    verifySignature(data) {
        try {
            const {
                partnerCode,
                orderId,
                requestId,
                amount,
                orderInfo,
                orderType,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                signature
            } = data;

            // Tạo raw signature theo thứ tự của MoMo
            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
            
            // Tạo signature để so sánh
            const expectedSignature = crypto
                .createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            console.error('Lỗi khi xác thực signature:', error);
            return false;
        }
    }

    /**
     * Xử lý kết quả thanh toán từ MoMo
     * @param {Object} callbackData - Dữ liệu callback từ MoMo
     * @returns {Object} - Kết quả xử lý
     */
    processPaymentResult(callbackData) {
        const isValidSignature = this.verifySignature(callbackData);
        
        if (!isValidSignature) {
            return {
                success: false,
                error: 'Signature không hợp lệ'
            };
        }

        const { resultCode, orderId, transId, amount, message } = callbackData;
        
        if (resultCode === 0) {
            return {
                success: true,
                orderId: orderId,
                transId: transId,
                amount: amount,
                message: 'Thanh toán thành công'
            };
        } else {
            return {
                success: false,
                orderId: orderId,
                error: message || 'Thanh toán thất bại',
                resultCode: resultCode
            };
        }
    }
}

module.exports = MomoPaymentService;