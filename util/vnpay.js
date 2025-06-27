const crypto = require('crypto');
const moment = require('moment');

class VNPay {
    constructor() {
        // Kiểm tra environment variables
        if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET) {
            throw new Error('VNPay configuration missing: TMN_CODE or HASH_SECRET not found');
        }
        if (!process.env.VNPAY_URL || !process.env.VNPAY_RETURN_URL) {
            throw new Error('VNPay configuration missing: URL or RETURN_URL not found');
        }
        
        this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
        this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
        this.vnp_Url = process.env.VNPAY_URL;
        this.vnp_ReturnUrl = process.env.VNPAY_RETURN_URL;
        this.vnp_IpnUrl = process.env.VNPAY_IPN_URL;
    }

    // Tạo URL thanh toán
    createPaymentUrl(orderId, amount, orderInfo, ipAddr, locale = 'vn') {
        // Validate inputs
        if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
            throw new Error('Order ID không hợp lệ');
        }
        if (!orderInfo || typeof orderInfo !== 'string' || orderInfo.length > 255) {
            throw new Error('Thông tin đơn hàng không hợp lệ (tối đa 255 ký tự)');
        }
        if (!ipAddr || typeof ipAddr !== 'string') {
            throw new Error('IP Address không hợp lệ');
        }
        // Kiểm tra số tiền hợp lệ
        if (!amount || typeof amount !== 'number' || amount < 5000 || amount >= 1000000000) {
            throw new Error('Số tiền không hợp lệ. Phải từ 5,000 đến dưới 1 tỷ VND');
        }

        const createDate = moment().format('YYYYMMDDHHmmss');

        const vnp_Params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: this.vnp_TmnCode,
            vnp_Locale: locale,
            vnp_CurrCode: 'VND',
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: amount * 100, // Đơn vị: x100
            vnp_ReturnUrl: this.vnp_ReturnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate
        };

        // Sắp xếp tham số theo thứ tự alphabet
        const sortedParams = this.sortObject(vnp_Params);

        // Tạo chuỗi dữ liệu để ký
        const signData = new URLSearchParams(sortedParams).toString();

        // Tạo secure hash (chữ ký)
        const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // Thêm vnp_SecureHash vào tham số
        sortedParams.vnp_SecureHash = signed;

        // Tạo URL thanh toán cuối cùng
        const paymentUrl = `${this.vnp_Url}?${new URLSearchParams(sortedParams).toString()}`;
        return paymentUrl;
    }

    // Xác thực chữ ký từ VNPay (khi return)
    verifyReturnUrl(vnp_Params) {
        console.log('=== VNPay Signature Verification Debug ===');
        
        // Clone object để không modify object gốc
        const params = { ...vnp_Params };
        const receivedHash = params['vnp_SecureHash'];
        
        console.log('Received hash:', receivedHash);
        
        // Validate required fields
        if (!receivedHash) {
            console.log('❌ Missing vnp_SecureHash');
            throw new Error('Thiếu vnp_SecureHash trong response');
        }
        
        delete params['vnp_SecureHash'];
        delete params['vnp_SecureHashType'];

        const sortedParams = this.sortObject(params);
        console.log('Sorted params for signing:', sortedParams);
        
        const signData = new URLSearchParams(sortedParams).toString();
        console.log('Sign data string:', signData);
        console.log('Hash secret (first 10 chars):', this.vnp_HashSecret.substring(0, 10) + '...');

        const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        
        console.log('Generated hash:', signed);
        console.log('Hashes match:', signed === receivedHash);
        console.log('=== End Signature Verification Debug ===');

        return signed === receivedHash;
    }

    // Sắp xếp tham số
    sortObject(obj) {
        const sorted = {};
        Object.keys(obj)
            .sort()
            .forEach((key) => {
                sorted[key] = typeof obj[key] === 'string' ? obj[key] : String(obj[key]);
            });
        return sorted;
    }

    // Lấy thông báo từ mã phản hồi VNPay
    getResponseMessage(responseCode) {
        const messages = {
            '00': 'Giao dịch thành công',
            '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ.',
            '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking.',
            '10': 'Xác thực thông tin sai quá 3 lần.',
            '11': 'Hết thời gian thanh toán.',
            '12': 'Thẻ/Tài khoản bị khóa.',
            '13': 'Sai mật khẩu OTP.',
            '24': 'Khách hàng hủy giao dịch.',
            '51': 'Không đủ số dư.',
            '65': 'Vượt hạn mức giao dịch.',
            '75': 'Ngân hàng bảo trì.',
            '79': 'Nhập sai mật khẩu quá số lần quy định.',
            '99': 'Lỗi khác (không xác định)'
        };
        return messages[responseCode] || 'Lỗi không xác định';
    }
}

module.exports = VNPay;
