const crypto = require('crypto');
const querystring = require('querystring');

class VNPayService {
    constructor() {
        this.tmnCode = process.env.VNPAY_TMN_CODE;
        this.secretKey = process.env.VNPAY_HASH_SECRET;
        this.vnpUrl = process.env.VNPAY_GATEWAY_URL;
        this.returnUrl = process.env.VNPAY_RETURN_URL;
        
        console.log('VNPay Config:');
        console.log('TMN_CODE:', this.tmnCode);
        console.log('HASH_SECRET:', this.secretKey ? '***' + this.secretKey.slice(-4) : 'MISSING');
        console.log('GATEWAY_URL:', this.vnpUrl);
        console.log('RETURN_URL:', this.returnUrl);
    }

    createPayment(orderData, paymentMethod = null, bankCode = null) {
        try {
            const date = new Date();
            const createDate = date.getFullYear().toString() +
                (date.getMonth() + 1).toString().padStart(2, '0') +
                date.getDate().toString().padStart(2, '0') +
                date.getHours().toString().padStart(2, '0') +
                date.getMinutes().toString().padStart(2, '0') +
                date.getSeconds().toString().padStart(2, '0');

            const orderId = date.getHours().toString().padStart(2, '0') +
                date.getMinutes().toString().padStart(2, '0') +
                date.getSeconds().toString().padStart(2, '0');

            let vnp_Params = {
                'vnp_Version': '2.1.0',
                'vnp_Command': 'pay',
                'vnp_TmnCode': this.tmnCode,
                'vnp_Locale': 'vn',
                'vnp_CurrCode': 'VND',
                'vnp_TxnRef': orderId,
                'vnp_OrderInfo': orderData.orderInfo || 'Thanh toan don hang',
                'vnp_OrderType': orderData.orderType || 'other',
                'vnp_Amount': orderData.amount * 100,
                'vnp_ReturnUrl': this.returnUrl,
                'vnp_IpAddr': orderData.ipAddr || '127.0.0.1',
                'vnp_CreateDate': createDate
            };

            if (bankCode && bankCode !== '') {
                vnp_Params['vnp_BankCode'] = bankCode;
            }

            if (paymentMethod && paymentMethod !== '') {
                vnp_Params['vnp_CardType'] = paymentMethod;
            }

            vnp_Params = this.sortObject(vnp_Params);

            const signData = Object.entries(vnp_Params)
                .map(([key, val]) => `${key}=${val}`)
                .join('&');

            console.log('VNPay signData for payment:', signData);

            const hmac = crypto.createHmac('sha512', this.secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
            console.log('VNPay generated signature:', signed);

            vnp_Params['vnp_SecureHash'] = signed;

            const paymentUrl = this.vnpUrl + '?' + querystring.stringify(vnp_Params);

            return {
                success: true,
                paymentUrl: paymentUrl,
                orderId: orderId
            };
        } catch (error) {
            console.error('VNPay payment creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    verifyReturnUrl(vnpParams) {
        try {
            const secureHash = vnpParams['vnp_SecureHash'];
            console.log('VNPay received signature:', secureHash);

            delete vnpParams['vnp_SecureHash'];
            delete vnpParams['vnp_SecureHashType'];

            const sortedParams = this.sortObject(vnpParams);

            const signData = Object.entries(sortedParams)
                .map(([key, val]) => `${key}=${val}`)
                .join('&');

            console.log('VNPay signData for verification:', signData);

            const hmac = crypto.createHmac('sha512', this.secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
            console.log('VNPay received signature:', secureHash); // Chữ ký mà VNPay gửi về
            console.log('VNPay computed signature:', signed);
            console.log('VNPay signature match:', secureHash === signed);

            return secureHash === signed;
        } catch (error) {
            console.error('VNPay verification error:', error);
            return false;
        }
    }

    sortObject(obj) {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        keys.forEach(key => {
            sorted[key] = obj[key];
        });
        return sorted;
    }
}

module.exports = VNPayService;