const { VNPay } = require('vn-payments');
const crypto = require('crypto');

class VNPayService {
    constructor() {
        this.vnpay = new VNPay({
            paymentGateway: process.env.VNPAY_GATEWAY || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            merchant: process.env.VNPAY_TMN_CODE || 'VNPAY01',
            secureSecret: process.env.VNPAY_HASH_SECRET || 'RAOEXHYVSDDIIENYWSLDIIZTANXUXZFJ',
            testMode: process.env.NODE_ENV !== 'production'
        });
    }

    /**
     * Tạo URL thanh toán VNPay
     * @param {Object} orderData - Thông tin đơn hàng
     * @returns {Promise<string>} - URL thanh toán
     */
    async createPayment(orderData) {
        try {
            const {
                orderId,
                amount,
                orderInfo,
                returnUrl,
                ipAddr
            } = orderData;

            // Dữ liệu thanh toán
            const checkoutData = {
                amount: amount,
                customerId: orderId,
                currency: 'VND',
                clientIp: ipAddr || '127.0.0.1',
                billingCity: 'Ha Noi',
                billingCountry: 'VN',
                billingPostCode: '100000',
                billingStateProvince: 'Ha Noi',
                billingStreet: 'Thanh Xuan',
                deliveryAddress: 'Thanh Xuan Ha Noi',
                deliveryCity: 'Ha Noi',
                deliveryCountry: 'VN',
                deliveryProvince: 'Ha Noi',
                orderDescription: orderInfo || `Thanh toan don hang ${orderId}`,
                orderCategory: 'other',
                returnUrl: returnUrl || process.env.VNPAY_RETURN_URL || 'http://localhost:5000/vnpay/return',
                transactionId: orderId,
                customFields: {
                    orderId: orderId
                }
            };

            console.log('🔄 Tạo URL thanh toán VNPay:', {
                orderId,
                amount,
                orderInfo
            });

            // Tạo URL thanh toán
            const paymentUrl = await this.vnpay.buildCheckoutUrl(checkoutData);
            
            console.log('✅ Tạo URL thanh toán VNPay thành công:', paymentUrl.href);
            
            return {
                success: true,
                paymentUrl: paymentUrl.href,
                orderId: orderId
            };

        } catch (error) {
            console.error('❌ Lỗi tạo thanh toán VNPay:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Xác thực callback từ VNPay
     * @param {Object} query - Query parameters từ VNPay
     * @returns {Promise<Object>} - Kết quả xác thực
     */
    async verifyReturn(query) {
        try {
            console.log('🔄 Xác thực callback VNPay:', query);
            
            const results = await this.vnpay.verifyReturnUrl(query);
            
            console.log('✅ Kết quả xác thực VNPay:', results);
            
            return {
                success: results.isSucceed,
                orderId: results.orderId,
                amount: results.amount,
                message: results.message,
                transactionStatus: results.isSucceed ? 'SUCCESS' : 'FAILED',
                vnpayData: results
            };

        } catch (error) {
            console.error('❌ Lỗi xác thực VNPay:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Xác thực IPN (Instant Payment Notification) từ VNPay
     * @param {Object} query - Query parameters từ VNPay IPN
     * @returns {Promise<Object>} - Kết quả xác thực
     */
    async verifyIPN(query) {
        try {
            console.log('🔄 Xác thực IPN VNPay:', query);
            
            const results = await this.vnpay.verifyReturnUrl(query);
            
            return {
                success: results.isSucceed,
                orderId: results.orderId,
                amount: results.amount,
                message: results.message,
                transactionStatus: results.isSucceed ? 'SUCCESS' : 'FAILED'
            };

        } catch (error) {
            console.error('❌ Lỗi xác thực IPN VNPay:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Tạo secure hash cho VNPay
     * @param {Object} params - Tham số cần hash
     * @returns {string} - Secure hash
     */
    createSecureHash(params) {
        const sortedParams = Object.keys(params)
            .filter(key => key !== 'vnp_SecureHash' && params[key] !== '')
            .sort()
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
        
        const secretKey = process.env.VNPAY_HASH_SECRET || 'RAOEXHYVSDDIIENYWSLDIIZTANXUXZFJ';
        const hash = crypto.createHmac('sha512', secretKey)
            .update(sortedParams)
            .digest('hex');
        
        return hash;
    }

    /**
     * Kiểm tra trạng thái thanh toán
     * @param {string} orderId - Mã đơn hàng
     * @returns {Object} - Thông tin trạng thái
     */
    async checkPaymentStatus(orderId) {
        try {
            // VNPay không có API query trực tiếp trong vn-payments
            // Cần implement riêng nếu cần thiết
            console.log('🔄 Kiểm tra trạng thái thanh toán VNPay:', orderId);
            
            return {
                success: true,
                orderId: orderId,
                message: 'Vui lòng kiểm tra trạng thái đơn hàng trong hệ thống'
            };

        } catch (error) {
            console.error('❌ Lỗi kiểm tra trạng thái VNPay:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = VNPayService;