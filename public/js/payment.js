document.addEventListener('DOMContentLoaded', function() {
    // Hiển thị chi tiết COD ban đầu
    showPaymentDetails('cod');

    // Xử lý thay đổi phương thức thanh toán
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', updatePaymentSelection);
    });

    function showPaymentDetail(element) {
        if (element) {
            element.style.display = 'block';
        }
    }

    function updatePaymentSelection() {
        const selectedMethod = this.value;
        console.log('Selected payment method:', selectedMethod);
        
        // Hiển thị chi tiết thanh toán tương ứng
        showPaymentDetails(selectedMethod);
        
        // Cập nhật visual selection
        updateCardSelection(this);
    }

    function showPaymentDetails(method) {
        // Ẩn tất cả chi tiết thanh toán
        const allDetails = document.querySelectorAll('.payment-detail');
        allDetails.forEach(detail => {
            detail.style.display = 'none';
        });
        
        // Hiển thị chi tiết của phương thức được chọn
        const selectedDetail = document.getElementById(method + '-details');
        if (selectedDetail) {
            selectedDetail.style.display = 'block';
        }
    }

    function updateCardSelection(selectedInput) {
        // Reset tất cả card
        const allCards = document.querySelectorAll('.payment-card');
        allCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        // Highlight card được chọn
        const selectedCard = selectedInput.closest('.payment-card');
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
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

    function validatePaymentMethod() {
        const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
        
        if (!selectedPayment) {
            alert('Vui lòng chọn phương thức thanh toán!');
            return false;
        }
        
        const paymentMethod = selectedPayment.value;
        
        // Kiểm tra phương thức thanh toán hợp lệ
        if (paymentMethod !== 'cod' && paymentMethod !== 'vnpay') {
            alert('Phương thức thanh toán không hợp lệ!');
            return false;
        }
        
        return true;
    }

    // Khởi tạo trạng thái ban đầu
    const defaultSelected = document.querySelector('input[name="paymentMethod"]:checked');
    if (defaultSelected && defaultSelected.value === 'cod') {
        updatePaymentSelection();
        showPaymentDetail(codDetails);
    }

    // Xử lý submit form
    const checkoutForm = document.querySelector('form[action="/orders"]');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            if (!validatePaymentMethod()) {
                e.preventDefault();
                return false;
            }
            
            const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
            
            // Hiển thị loading
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                
                if (selectedPayment && selectedPayment.value === 'vnpay') {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chuyển đến VNPay...';
                } else if (selectedPayment && selectedPayment.value === 'cod') {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý đơn hàng...';
                } else {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
                }
            }
        });
    }
});