const VNPay = require('./util/vnpay');
require('dotenv').config();

// Script để debug VNPay return URL
const vnpay = new VNPay();

// Mô phỏng một response từ VNPay (thay thế bằng URL thực tế từ VNPay)
const sampleReturnParams = {
    vnp_Amount: '10000000', // 100,000 VND * 100
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: 'VNP14567890',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Thanh toan don hang 123',
    vnp_PayDate: '20241227134609',
    vnp_ResponseCode: '00',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_TransactionNo: '14567890',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: '123',
    vnp_SecureHashType: 'SHA256'
};

console.log('=== VNPay Return URL Debug Test ===');
console.log('Sample params (without hash):', sampleReturnParams);

// Tạo hash cho sample params
const crypto = require('crypto');
const params = { ...sampleReturnParams };
delete params.vnp_SecureHashType;

// Sắp xếp params
const sortedParams = {};
Object.keys(params)
    .sort()
    .forEach((key) => {
        sortedParams[key] = typeof params[key] === 'string' ? params[key] : String(params[key]);
    });

const signData = new URLSearchParams(sortedParams).toString();
console.log('Sign data:', signData);

const hmac = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

console.log('Generated hash:', signed);

// Thêm hash vào params
sampleReturnParams.vnp_SecureHash = signed;

console.log('\n=== Testing Verification ===');
try {
    const isValid = vnpay.verifyReturnUrl(sampleReturnParams);
    console.log('Verification result:', isValid);
} catch (error) {
    console.error('Verification error:', error.message);
}

console.log('\n=== Instructions ===');
console.log('1. Thực hiện một giao dịch test trên VNPay');
console.log('2. Copy URL return từ VNPay');
console.log('3. Parse các tham số từ URL và test với script này');
console.log('4. Kiểm tra log trong terminal khi truy cập return URL thực tế');