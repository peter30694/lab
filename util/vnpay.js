const crypto = require('crypto');
const moment = require('moment');

class VNPay {
    constructor() {
        this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
        this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
        this.vnp_Url = process.env.VNPAY_URL;
        this.vnp_ReturnUrl = process.env.VNPAY_RETURN_URL;
        this.vnp_IpnUrl = process.env.VNPAY_IPN_URL;
    }

    // Tạo URL thanh toán
    createPaymentUrl(orderId, amount, orderInfo, ipAddr, locale = 'vn') {
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
            vnp_Amount: amount * 100,
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
        const receivedHash = vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        const sortedParams = this.sortObject(vnp_Params);
        const signData = new URLSearchParams(sortedParams).toString();

        const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

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
