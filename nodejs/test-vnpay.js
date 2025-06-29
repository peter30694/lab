require('dotenv').config();
const VNPay = require('./util/vnpay');

// Khởi tạo VNPay instance
const vnpay = new VNPay();

// Test tạo URL thanh toán
const paymentUrl = vnpay.createPaymentUrl('ORDER12345', 100000, 'Thanh toán đơn hàng ORDER12345', '127.0.0.1');
console.log('🔗 Link thanh toán:', paymentUrl);

// Test với các tham số khác nhau
const paymentUrl2 = vnpay.createPaymentUrl('ORDER67890', 250000, 'Thanh toán đơn hàng ORDER67890', '192.168.1.1');
console.log('🔗 Link thanh toán 2:', paymentUrl2);

// Test với số tiền lớn
const paymentUrl3 = vnpay.createPaymentUrl('ORDER99999', 1500000, 'Thanh toán đơn hàng ORDER99999', '10.0.0.1');
console.log('🔗 Link thanh toán 3:', paymentUrl3);

// Hiển thị thông tin cấu hình VNPay
console.log('\n📋 Thông tin cấu hình VNPay:');
console.log('- TMN Code:', process.env.VNPAY_TMN_CODE);
console.log('- VNPay URL:', process.env.VNPAY_URL);
console.log('- Return URL:', process.env.VNPAY_RETURN_URL);
console.log('- IPN URL:', process.env.VNPAY_IPN_URL);

// Test verify return URL (giả lập)
const mockReturnData = {
    vnp_Amount: '10000000', // 100,000 VND * 100
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: '20231201123456',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Thanh toan don hang ORDER12345',
    vnp_PayDate: '20231201120000',
    vnp_ResponseCode: '00',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_TransactionNo: '14123456',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: 'ORDER12345',
    vnp_SecureHash: 'dummy_hash'
};

console.log('\n🔍 Test verify return URL:');
const isValid = vnpay.verifyReturnUrl(mockReturnData);
console.log('- Kết quả verify:', isValid ? '✅ Hợp lệ' : '❌ Không hợp lệ');

// Test response message
console.log('\n📝 Test response messages:');
console.log('- Code 00:', vnpay.getResponseMessage('00'));
console.log('- Code 07:', vnpay.getResponseMessage('07'));
console.log('- Code 09:', vnpay.getResponseMessage('09'));
console.log('- Code 10:', vnpay.getResponseMessage('10'));
console.log('- Code 11:', vnpay.getResponseMessage('11'));
console.log('- Code 12:', vnpay.getResponseMessage('12'));
console.log('- Code 24:', vnpay.getResponseMessage('24'));
console.log('- Code 51:', vnpay.getResponseMessage('51'));
console.log('- Code 65:', vnpay.getResponseMessage('65'));
console.log('- Code 75:', vnpay.getResponseMessage('75'));
console.log('- Code 79:', vnpay.getResponseMessage('79'));
console.log('- Code 99:', vnpay.getResponseMessage('99'));