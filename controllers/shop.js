const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
const VNPayService = require('../util/vnpay');
const { sendOrderConfirmation, sendNewOrderNotification } = require('../util/email');
const mongodb = require('mongodb'); // 👈 Thêm dòng này vào đây
const fs = require('fs');
const { generateOrderPDF } = require('../util/pdf'); // Thêm import này
const mongoose = require('mongoose'); // Thêm import này


exports.getProducts = (req, res, next) => {
    Product.fetchAll()
        .then(products => {
            res.render('shop', {
                prods: products,
                pageTitle: 'Phương Store | Danh sách sản phẩm',
                path: '/products',
                hasProducts: products.length > 0,
                activeShop: true,
                productCSS: true,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).render('error', {
                pageTitle: 'Lỗi | Phương Store',
                path: '/error',
                error: 'Không thể tải danh sách sản phẩm',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        });
};

exports.getProduct = async (req, res, next) => {
    try {
        const prodId = req.params.productId;
        const product = await Product.findById(prodId);

        if (!product) {
            return res.status(404).render('404', {
                pageTitle: 'Không tìm thấy sản phẩm | Phương Store',
                path: '/404',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Lấy các sản phẩm liên quan (cùng loại hoặc giá tương đương)
        const relatedProducts = await Product.findRelatedProducts(product);

        res.render('shop/product-detail', {
            product: product,
            pageTitle: `${product.title} | Phương Store`,
            path: '/products',
            relatedProducts: relatedProducts,
            hasRelatedProducts: relatedProducts.length > 0,
            activeShop: true,
            productCSS: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | Phương Store',
            path: '/error',
            error: 'Không thể tải thông tin sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.getIndex = (req, res, next) => {
    Product.fetchAll()
        .then(products => {
            res.render('index', {
                prods: products,
                pageTitle: 'Phương Store | Trang chủ',
                path: '/',
                hasProducts: products.length > 0,
                activeShop: true,
                productCSS: true,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).render('error', {
                pageTitle: 'Lỗi | Phương Store',
                path: '/error',
                error: 'Không thể tải trang chủ',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        });
};


exports.getCart = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/create-default-user');
        }

        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.redirect('/create-default-user');
        }

        const user = new User(userData.name, userData.email, userData.role);
        user._id = new mongodb.ObjectId(userData._id);
        user.cart = userData.cart || { items: [], totalPrice: 0 };

        const cart = await user.getCart();

        res.render('shop/cart', {
            path: '/cart',
            pageTitle: 'Giỏ hàng của bạn',
            products: cart.items || [],
            totalPrice: cart.totalPrice || 0,
            activeCart: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    } catch (err) {
        console.error('Lỗi khi tải giỏ hàng:\n', err.stack || err);
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể tải giỏ hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postCart = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/create-default-user');
        }

        const prodId = req.body.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        if (!prodId) {
            return res.status(400).render('error', {
                pageTitle: 'Error',
                path: '/error',
                error: 'Không có sản phẩm được chọn',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        const product = await Product.findById(prodId);
        if (!product) {
            return res.status(404).render('error', {
                pageTitle: 'Error',
                path: '/error',
                error: 'Không tìm thấy sản phẩm',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.redirect('/create-default-user');
        }

        const user = new User(userData.name, userData.email, userData.role);
        user._id = new mongodb.ObjectId(userData._id);
        user.cart = userData.cart || { items: [], totalPrice: 0 };

        if (!(product._id instanceof mongodb.ObjectId)) {
            product._id = new mongodb.ObjectId(product._id);
        }

        try {
            await user.addToCart(product, quantity);
            res.redirect('/cart');
        } catch (err) {
            // Nếu lỗi liên quan đến số lượng tồn kho, hiển thị thông báo lỗi
            if (err.message.includes('Số lượng vượt quá tồn kho')) {
                return res.status(400).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: err.message,
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }
            throw err;
        }
    } catch (err) {
        console.error('Lỗi khi thêm vào giỏ hàng:\n', err.stack || err);
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể thêm sản phẩm vào giỏ hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postCartDeleteProduct = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/create-default-user');
        }

        const prodId = req.body.productId;
        const userData = await User.findById(req.session.user._id);

        if (!userData) {
            return res.redirect('/create-default-user');
        }

        // Tạo instance User đúng cách
        const user = new User(userData.name, userData.email, userData.role);
        user._id = new mongodb.ObjectId(userData._id);
        user.cart = userData.cart || { items: [], totalPrice: 0 };

        await user.removeFromCart(prodId);
        res.redirect('/cart');
    } catch (err) {
        console.log(err);
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể xóa sản phẩm khỏi giỏ hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postCartUpdateQuantity = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/create-default-user');
        }

        const prodId = req.body.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        if (!prodId) {
            return res.status(400).render('error', {
                pageTitle: 'Error',
                path: '/error',
                error: 'Không có sản phẩm được chọn',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.redirect('/create-default-user');
        }

        const user = new User(userData.name, userData.email, userData.role);
        user._id = new mongodb.ObjectId(userData._id);
        user.cart = userData.cart || { items: [], totalPrice: 0 };

        // Remove the product from cart first
        await user.removeFromCart(prodId);

        // Add it back with new quantity
        const product = await Product.findById(prodId);
        if (product) {
            await user.addToCart(product, quantity);
        }

        res.redirect('/cart');
    } catch (err) {
        console.error('Lỗi khi cập nhật số lượng:\n', err.stack || err);
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể cập nhật số lượng sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postOrder = async (req, res, next) => {
  try {
    const { paymentMethod, name, phone, address, note, vnpayMethod, vnpayBank } = req.body;
    
    // Validate payment method
    const validPaymentMethods = ['cod', 'vnpay', 'bank_transfer', 'e_wallet'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    const userData = await User.findById(req.user._id);
    if (!userData) {
      return res.redirect('/login');
    }
    
    const user = new User(userData.name, userData.email, userData.role);
    user._id = new mongodb.ObjectId(userData._id);
    user.cart = userData.cart || { items: [], totalPrice: 0 };
    
    const cart = await user.getCart();
    
    if (!cart.items || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    const products = cart.items.map(item => {
      return {
        quantity: item.quantity,
        product: {
          _id: item._id,
          title: item.title,
          price: item.price,
          imageUrl: item.imageUrl
        }
      };
    });

    // Calculate total
    const subtotal = products.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
    
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const totalAmount = subtotal + shippingFee;

    const order = new Order({
      user: {
        userId: req.user._id,
        name: name,
        phone: phone,
        address: address
      },
      products: products,
      totalAmount: totalAmount,
      shippingFee: shippingFee,
      paymentMethod: paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      note: note || '',
      orderDate: new Date()
    });

    await order.save();

    // Handle different payment methods
    if (paymentMethod === 'vnpay') {
      const vnpayService = new VNPayService();
      
      // Create VNPay payment URL
      const paymentData = {
        amount: totalAmount,
        orderInfo: `Thanh toan don hang ${order._id.toString()}`,
        orderType: 'other',
        bankCode: '',
        locale: 'vn',
        ipAddr: req.ip || req.connection.remoteAddress || '127.0.0.1'
      };
      
      console.log('PaymentData being sent to VNPay:', JSON.stringify(paymentData, null, 2));
      
      const paymentResult = vnpayService.createPayment(paymentData);
      console.log('VNPay payment result:', JSON.stringify(paymentResult, null, 2));
      
      if (paymentResult.success) {
        // Store order ID in session for return handling
        req.session.pendingOrderId = order._id;
        
        console.log('Redirecting to VNPay URL:', paymentResult.paymentUrl);
        // Redirect trực tiếp đến VNPay
        return res.redirect(paymentResult.paymentUrl);
      } else {
        console.error('VNPay payment creation failed:', paymentResult.error);
        return res.status(500).json({
          success: false,
          message: 'Không thể tạo liên kết thanh toán VNPay: ' + (paymentResult.error || 'Unknown error')
        });
      }
    } else if (paymentMethod === 'cod') {
      // COD - Cash on Delivery
      order.paymentStatus = 'pending';
      order.orderStatus = 'confirmed';
      await order.save();
      
      // Clear cart and redirect
      await user.clearCart();
      
      // Set success message
      req.session.successMessage = 'Đơn hàng đã được tạo thành công! Bạn sẽ thanh toán khi nhận hàng.';
      
      return res.redirect('/orders');
    } else {
      // Invalid payment method
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/create-default-user');
        }

        const user = await User.findById(req.session.user._id);

        if (!user) {
            return res.redirect('/create-default-user');
        }

        const orders = await Order.findByUserId(user._id);

        // ✅ Đảm bảo tất cả order đều có .items là array
        const cleanedOrders = orders.map(order => {
            return {
                ...order,
                items: Array.isArray(order.items)
                    ? order.items
                    : (Array.isArray(order.products) ? order.products : [])
            };
        });

        res.render('shop/orders', {
            path: '/orders',
            pageTitle: 'Đơn hàng của bạn | Phương Store',
            orders: cleanedOrders,
            activeOrders: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            success: req.query.success === 'true'
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | Phương Store',
            path: '/error',
            error: 'Không thể tải danh sách đơn hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Controller tải xuống hóa đơn cho người dùng
exports.getDownloadInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        console.log('Bắt đầu tải xuống hóa đơn cho đơn hàng:', orderId);

        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/login');
        }

        // Kiểm tra tính hợp lệ của orderId
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            console.error('ID đơn hàng không hợp lệ:', orderId);
            return res.status(400).render('error', {
                pageTitle: 'Lỗi | Phương Store',
                path: '/error',
                error: 'ID đơn hàng không hợp lệ',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Lấy thông tin đơn hàng
        const order = await Order.findById(orderId);
        if (!order) {
            console.error('Không tìm thấy đơn hàng với ID:', orderId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy đơn hàng | Phương Store',
                path: '/error',
                error: 'Không tìm thấy đơn hàng với ID: ' + orderId,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Kiểm tra xem đơn hàng có thuộc về người dùng hiện tại không
        if (order.userId.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
            console.error('Người dùng không có quyền truy cập đơn hàng này');
            return res.status(403).render('error', {
                pageTitle: 'Truy cập bị từ chối | Phương Store',
                path: '/error',
                error: 'Bạn không có quyền truy cập đơn hàng này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Lấy thông tin người dùng
        const user = await User.findById(order.userId);
        if (!user) {
            console.error('Không tìm thấy người dùng với ID:', order.userId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy người dùng | Phương Store',
                path: '/error',
                error: 'Không tìm thấy thông tin người dùng',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Tạo PDF
        console.log('Đang tạo PDF hóa đơn...');
        const pdfPath = await generateOrderPDF(order, user);
        console.log('Đã tạo PDF hóa đơn thành công tại:', pdfPath);

        // Kiểm tra file PDF có tồn tại không
        if (!fs.existsSync(pdfPath)) {
            console.error('File PDF không tồn tại sau khi tạo:', pdfPath);
            return res.status(500).render('error', {
                pageTitle: 'Lỗi | Phương Store',
                path: '/error',
                error: 'Không thể tạo file PDF hóa đơn',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Gửi file PDF về client
        res.download(pdfPath, `invoice-${orderId}.pdf`, (err) => {
            if (err) {
                console.error('Lỗi khi tải file PDF:', err);
                return res.status(500).render('error', {
                    pageTitle: 'Lỗi | Phương Store',
                    path: '/error',
                    error: 'Không thể tải xuống file PDF: ' + err.message,
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }
            console.log('Đã gửi file PDF hóa đơn thành công');

            // Xóa file sau khi đã gửi
            fs.unlink(pdfPath, (err) => {
                if (err) {
                    console.error('Lỗi khi xóa file PDF:', err);
                } else {
                    console.log('Đã xóa file PDF hóa đơn tạm thời');
                }
            });
        });
    } catch (err) {
        console.error('Lỗi khi tải xuống hóa đơn:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | Phương Store',
            path: '/error',
            error: 'Không thể tải xuống hóa đơn: ' + err.message,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};
exports.getCheckout = (req, res, next) => {
    const cart = req.session.cart || { items: [] };

    const products = cart.items.map(item => {
        return {
            _id: item._id,
            title: item.title,
            price: item.price,
            quantity: item.quantity
        };
    });

    const totalPrice = cart.items.reduce((total, item) => {
        return total + item.price * item.quantity;
    }, 0);

    res.render('shop/checkout', {
        pageTitle: 'Xác nhận đơn hàng',
        path: '/checkout',
        products,
        totalPrice
    });
};

