document.addEventListener('DOMContentLoaded', function() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const paymentDetails = document.getElementById('payment-details');
    const codDetails = document.getElementById('cod-details');
    const bankDetails = document.getElementById('bank-details');
    const momoDetails = document.getElementById('momo-details');
    const ewalletDetails = document.getElementById('ewallet-details');
    const creditDetails = document.getElementById('credit-details');
    const vnpayDetails = document.getElementById('vnpay-details');

    // Xử lý khi chọn phương thức thanh toán
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            // Ẩn tất cả chi tiết thanh toán
            hideAllDetails();
            
            // Hiển thị chi tiết tương ứng
            switch(this.value) {
                case 'cod':
                    paymentDetails.style.display = 'none';
                    break;
                case 'bank':
                    showPaymentDetail(bankDetails);
                    break;
                case 'momo':
                    showPaymentDetail(momoDetails);
                    break;
                case 'ewallet':
                    showPaymentDetail(ewalletDetails);
                    break;
                case 'credit':
                    showPaymentDetail(creditDetails);
                    break;
                case 'vnpay':
                    showPaymentDetail(vnpayDetails);
                    break;
            }
            
            // Cập nhật style cho card được chọn
            updateCardSelection(this);
        });
    });

    function hideAllDetails() {
        const details = document.querySelectorAll('.payment-detail');
        details.forEach(detail => {
            detail.style.display = 'none';
        });
    }

    function showPaymentDetail(element) {
        paymentDetails.style.display = 'block';
        element.style.display = 'block';
    }

    function updateCardSelection(selectedInput) {
        // Xóa class selected từ tất cả cards
        const allCards = document.querySelectorAll('.payment-method');
        allCards.forEach(card => {
            card.classList.remove('selected');
            card.style.borderColor = '#e9ecef';
            card.style.backgroundColor = '#fff';
        });
        
        // Thêm style cho card được chọn
        const selectedCard = selectedInput.closest('.payment-method');
        selectedCard.classList.add('selected');
        selectedCard.style.borderColor = '#007bff';
        selectedCard.style.backgroundColor = '#f8f9ff';
    }

    // Xử lý click vào card để chọn radio button
    const paymentCards = document.querySelectorAll('.payment-method');
    paymentCards.forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }
        });
    });

    // Khởi tạo trạng thái ban đầu
    const defaultSelected = document.querySelector('input[name="paymentMethod"]:checked');
    if (defaultSelected) {
        updateCardSelection(defaultSelected);
    }

    // Xử lý form submit
    const checkoutForm = document.querySelector('form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
            
            if (!selectedPayment) {
                e.preventDefault();
                alert('Vui lòng chọn phương thức thanh toán!');
                return false;
            }

            // Hiển thị loading cho button submit
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
                submitBtn.disabled = true;
            }

            // Xử lý theo từng phương thức thanh toán
            switch(selectedPayment.value) {
                case 'momo':
                console.log('Chuyển hướng đến trang thanh toán MoMo...');
                break;
            case 'vnpay':
                console.log('Chuyển hướng đến trang thanh toán VNPay...');
                break;
            case 'credit':
                console.log('Chuyển hướng đến trang thanh toán thẻ tín dụng...');
                break;
            case 'bank':
            case 'ewallet':
                // Hiển thị thông báo cần chuyển khoản
                console.log('Cần xác nhận chuyển khoản');
                break;
            case 'cod':
            default:
                console.log('Phương thức thanh toán:', selectedPayment.value);
                break;
            }
        });
    }
});