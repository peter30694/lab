require('dotenv').config();
const VNPay = require('./util/vnpay');

console.log('='.repeat(60));
console.log('🚀 DEMO VNPAY PAYMENT URL GENERATOR');
console.log('='.repeat(60));

// Khởi tạo VNPay instance
const vnpay = new VNPay();

// Test case 1: Đơn hàng cơ bản
console.log('\n📦 Test Case 1: Đơn hàng cơ bản');
const paymentUrl1 = vnpay.createPaymentUrl(
    'ORDER12345', 
    100000, 
    'Thanh toán đơn hàng ORDER12345', 
    '127.0.0.1'
);
console.log('🔗 URL:', paymentUrl1);

// Test case 2: Đơn hàng với số tiền lớn
console.log('\n💰 Test Case 2: Đơn hàng với số tiền lớn');
const paymentUrl2 = vnpay.createPaymentUrl(
    'ORDER67890', 
    2500000, 
    'Thanh toán laptop Dell XPS 13', 
    '192.168.1.100'
);
console.log('🔗 URL:', paymentUrl2);

// Test case 3: Đơn hàng với mô tả tiếng Việt có dấu
console.log('\n🇻🇳 Test Case 3: Đơn hàng với mô tả tiếng Việt');
const paymentUrl3 = vnpay.createPaymentUrl(
    'ORDER99999', 
    750000, 
    'Thanh toán khóa học lập trình Node.js', 
    '10.0.0.1'
);
console.log('🔗 URL:', paymentUrl3);

// Hiển thị thông tin cấu hình
console.log('\n' + '='.repeat(60));
console.log('⚙️  THÔNG TIN CẤU HÌNH VNPAY');
console.log('='.repeat(60));
console.log('🏪 TMN Code:', process.env.VNPAY_TMN_CODE);
console.log('🌐 VNPay URL:', process.env.VNPAY_URL);
console.log('↩️  Return URL:', process.env.VNPAY_RETURN_URL);
console.log('📡 IPN URL:', process.env.VNPAY_IPN_URL);

// Hiển thị các response code phổ biến
console.log('\n' + '='.repeat(60));
console.log('📋 CÁC MÃ PHẢN HỒI VNPAY PHỔ BIẾN');
console.log('='.repeat(60));
const commonCodes = ['00', '24', '51', '11', '12', '99'];
commonCodes.forEach(code => {
    console.log(`${code}: ${vnpay.getResponseMessage(code)}`);
});

console.log('\n✅ Demo hoàn thành! Các URL trên có thể sử dụng để test thanh toán.');
console.log('⚠️  Lưu ý: Đây là môi trường sandbox, không thực hiện giao dịch thật.');