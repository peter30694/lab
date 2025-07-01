// Main JavaScript for Phương Store

document.addEventListener('DOMContentLoaded', function() {
    // Legacy mobile menu (keep for backward compatibility)
    const backdrop = document.querySelector('.backdrop');
    const sideDrawer = document.querySelector('.mobile-nav');
    const menuToggle = document.querySelector('#side-menu-toggle');
    
    function backdropClickHandler() {
        backdrop.style.display = 'none';
        sideDrawer.classList.remove('open');
    }
    
    function menuToggleClickHandler() {
        backdrop.style.display = 'block';
        sideDrawer.classList.add('open');
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', backdropClickHandler);
    }
    
    if (menuToggle) {
        menuToggle.addEventListener('click', menuToggleClickHandler);
    }
    
    // New mobile menu toggle for header
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            const icon = this.querySelector('i');
            if (mobileMenu.classList.contains('hidden')) {
                icon.classList.remove('ri-close-line');
                icon.classList.add('ri-menu-line');
            } else {
                icon.classList.remove('ri-menu-line');
                icon.classList.add('ri-close-line');
            }
        });
    }
    
    // Radio button interactions
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            // Reset all radio buttons in the same group
            const groupName = this.name;
            const groupRadios = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
            
            groupRadios.forEach(rb => {
                const indicator = rb.parentElement.querySelector('div:last-child');
                if (indicator) {
                    indicator.classList.add('opacity-0');
                }
            });
            
            // Show selected
            if (this.checked) {
                const indicator = this.parentElement.querySelector('div:last-child');
                if (indicator) {
                    indicator.classList.remove('opacity-0');
                }
            }
        });
    });
    
    // Checkbox interactions
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const box = this.parentElement.querySelector('div:nth-child(2)');
            const check = this.parentElement.querySelector('div:last-child');
            
            if (this.checked) {
                if (box) {
                    box.classList.remove('border-gray-300');
                    box.classList.add('border-primary', 'bg-primary');
                }
                if (check) {
                    check.classList.remove('opacity-0');
                }
            } else {
                if (box) {
                    box.classList.add('border-gray-300');
                    box.classList.remove('border-primary', 'bg-primary');
                }
                if (check) {
                    check.classList.add('opacity-0');
                }
            }
        });
    });
    
    // Password visibility toggle
    const passwordToggles = document.querySelectorAll('button[class*="absolute right-3"]');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('ri-eye-line');
                    icon.classList.add('ri-eye-off-line');
                } else {
                    input.type = 'password';
                    icon.classList.remove('ri-eye-off-line');
                    icon.classList.add('ri-eye-line');
                }
            }
        });
    });
    
    // Toast notifications
    window.showToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <i class="ri-${type === 'success' ? 'check' : type === 'error' ? 'close' : 'information'}-circle-line text-lg"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">${message}</p>
                </div>
                <div class="ml-auto pl-3">
                    <button class="inline-flex text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    };
    
    // Add to cart functionality
    window.addToCart = function(productId, quantity = 1) {
        fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ productId, quantity })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
                updateCartCount(data.cartCount);
            } else {
                showToast(data.message || 'Có lỗi xảy ra', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra khi thêm sản phẩm', 'error');
        });
    };
    
    // Update cart count
    function updateCartCount(count) {
        const cartBadges = document.querySelectorAll('.cart-count');
        cartBadges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }
    
    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('form-error');
                    isValid = false;
                } else {
                    field.classList.remove('form-error');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
            }
        });
    });
    
    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Chart initialization function (for admin pages)
window.initCharts = function() {
    if (typeof echarts === 'undefined') return;
    
    // Revenue Chart
    const revenueChartEl = document.getElementById('revenue-chart');
    if (revenueChartEl) {
        const revenueChart = echarts.init(revenueChartEl);
        const revenueOption = {
            animation: false,
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                textStyle: { color: '#1f2937' }
            },
            grid: { top: 10, right: 10, bottom: 20, left: 40 },
            xAxis: {
                type: 'category',
                data: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#1f2937' }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisLabel: { color: '#1f2937' },
                splitLine: { lineStyle: { color: '#f3f4f6' } }
            },
            series: [{
                name: 'Doanh thu',
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 3, color: 'rgba(87, 181, 231, 1)' },
                areaStyle: {
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(87, 181, 231, 0.2)' },
                            { offset: 1, color: 'rgba(87, 181, 231, 0.01)' }
                        ]
                    }
                },
                data: [35, 42, 60, 85, 75, 90, 105, 115, 94, 110, 120, 135]
            }]
        };
        revenueChart.setOption(revenueOption);
        
        window.addEventListener('resize', () => revenueChart.resize());
    }
    
    // Category Chart
    const categoryChartEl = document.getElementById('category-chart');
    if (categoryChartEl) {
        const categoryChart = echarts.init(categoryChartEl);
        const categoryOption = {
            animation: false,
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                textStyle: { color: '#1f2937' }
            },
            legend: {
                orient: 'vertical', right: 10, top: 'center',
                textStyle: { color: '#1f2937' }
            },
            series: [{
                name: 'Phân loại', type: 'pie',
                radius: ['40%', '70%'], center: ['40%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 8 },
                label: { show: false },
                emphasis: { label: { show: false } },
                labelLine: { show: false },
                data: [
                    { value: 45, name: 'Chó cưng', itemStyle: { color: 'rgba(87, 181, 231, 1)' } },
                    { value: 30, name: 'Mèo cưng', itemStyle: { color: 'rgba(141, 211, 199, 1)' } },
                    { value: 15, name: 'Cá cảnh', itemStyle: { color: 'rgba(251, 191, 114, 1)' } },
                    { value: 10, name: 'Thú nhỏ', itemStyle: { color: 'rgba(252, 141, 98, 1)' } }
                ]
            }]
        };
        categoryChart.setOption(categoryOption);
        
        window.addEventListener('resize', () => categoryChart.resize());
    }
};

// Auto-initialize charts if elements exist
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('revenue-chart') || document.getElementById('category-chart')) {
        initCharts();
    }
});
