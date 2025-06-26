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
        if (selectedInput && typeof selectedInput.closest === 'function') {
            const selectedCard = selectedInput.closest('.payment-card');
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
        } else {
            // Fallback: tìm parent element
            let parent = selectedInput;
            while (parent && parent.parentElement) {
                parent = parent.parentElement;
                if (parent.classList && parent.classList.contains('payment-card')) {
                    parent.classList.add('selected');
                    break;
                }
            }
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
    window.processOrder = function() {
        const form = document.getElementById('checkoutForm');
        const formData = new FormData(form);
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        if (!validatePaymentMethod()) {
            return;
        }
        
        // Prepare order data
        const orderData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            address: formData.get('address'),
            paymentMethod: paymentMethod
        };
        
        // Show loading
        const button = document.querySelector('button[onclick="processOrder()"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        button.disabled = true;
        
        if (paymentMethod === 'vnpay') {
            // VNPay payment
            fetch('/vnpay/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.paymentUrl;
                } else {
                    alert('Có lỗi xảy ra: ' + data.message);
                    button.innerHTML = originalText;
                    button.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Có lỗi xảy ra khi tạo thanh toán');
                button.innerHTML = originalText;
                button.disabled = false;
            });
        } else {
            // COD payment
            fetch('/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/orders';
                } else {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Có lỗi xảy ra');
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Có lỗi xảy ra: ' + error.message);
                button.innerHTML = originalText;
                button.disabled = false;
            });
        }
    };
});