const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
const { sendOrderConfirmation, sendNewOrderNotification } = require('../util/email');
const mongodb = require('mongodb'); // 👈 Thêm dòng này vào đây
const fs = require('fs');
const { generateOrderPDF } = require('../util/pdf'); // Thêm import này
const mongoose = require('mongoose'); // Thêm import này
const MomoPaymentService = require('../util/momo');
const VNPayService = require('../util/vnpay'); // Import MoMo service


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
    // ✅ Kiểm tra đăng nhập
    if (!req.session.user || !req.session.user._id) {
      return res.redirect('/create-default-user');
    }

    // ✅ Lấy thông tin khách hàng từ form checkout
    const { name, phone, email, address, paymentMethod } = req.body;

    // ✅ Kiểm tra các trường bắt buộc
    if (!name || !phone || !email || !address || !paymentMethod) {
      return res.status(400).render('error', {
        pageTitle: 'Lỗi',
        path: '/error',
        error: 'Vui lòng điền đầy đủ thông tin giao hàng và chọn phương thức thanh toán',
        isAuthenticated: !!req.session.user,
        isAdmin: req.session.user?.role === 'admin'
      });
    }

    // ✅ Lấy thông tin người dùng từ database
    const userData = await User.findById(req.session.user._id);
    if (!userData) {
      return res.redirect('/create-default-user');
    }

    // ✅ Khởi tạo lại đối tượng User
    const user = new User(userData.name, userData.email, userData.role);
    user._id = new mongodb.ObjectId(userData._id);
    user.cart = userData.cart || { items: [], totalPrice: 0 };

    // ✅ Lấy giỏ hàng
    const cart = await user.getCart();
    if (!cart.items || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    // ✅ Tạo đơn hàng với thông tin giao hàng và thanh toán
    const order = new Order(user._id, cart.items, cart.totalPrice, {
      name,
      phone,
      email,
      address
    }, paymentMethod);

    // ✅ Lưu đơn hàng trước
    await order.save();

    // ✅ Xử lý thanh toán MoMo
    if (paymentMethod === 'momo') {
      try {
        const momoService = new MomoPaymentService();
        const paymentResult = await momoService.createPayment({
          orderId: order._id.toString(),
          amount: cart.totalPrice,
          orderInfo: `Thanh toán đơn hàng ${order._id}`,
          customerInfo: {
            name: name,
            phone: phone,
            email: email
          }
        });

        if (paymentResult.success) {
          // Xóa giỏ hàng sau khi tạo payment thành công
          await user.clearCart();
          // Chuyển hướng đến trang thanh toán MoMo
          return res.redirect(paymentResult.payUrl);
        } else {
          // Nếu tạo payment thất bại, hiển thị lỗi
          return res.status(500).render('error', {
            pageTitle: 'Lỗi thanh toán | Phương Store',
            path: '/error',
            error: `Lỗi MoMo: ${paymentResult.error}`,
            isAuthenticated: !!req.session.user,
            isAdmin: req.session.user?.role === 'admin'
          });
        }
      } catch (error) {
        console.error('Lỗi khi tạo thanh toán MoMo:', error);
        return res.status(500).render('error', {
          pageTitle: 'Lỗi thanh toán | Phương Store',
          path: '/error',
          error: 'Không thể kết nối đến MoMo',
          isAuthenticated: !!req.session.user,
          isAdmin: req.session.user?.role === 'admin'
        });
      }
    }

    // ✅ Xử lý thanh toán VNPay
    if (paymentMethod === 'vnpay') {
      try {
        const vnpayService = new VNPayService();
        const paymentResult = await vnpayService.createPayment({
          orderId: order._id.toString(),
          amount: cart.totalPrice,
          orderInfo: `Thanh toán đơn hàng ${order._id}`,
          returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5000/vnpay/return',
          ipAddr: req.ip || req.connection.remoteAddress || '127.0.0.1'
        });

        if (paymentResult.success) {
          // Xóa giỏ hàng sau khi tạo payment thành công
          await user.clearCart();
          // Chuyển hướng đến trang thanh toán VNPay
          return res.redirect(paymentResult.paymentUrl);
        } else {
          // Nếu tạo payment thất bại, hiển thị lỗi
          return res.status(500).render('error', {
            pageTitle: 'Lỗi thanh toán | Phương Store',
            path: '/error',
            error: `Lỗi VNPay: ${paymentResult.error}`,
            isAuthenticated: !!req.session.user,
            isAdmin: req.session.user?.role === 'admin'
          });
        }
      } catch (error) {
        console.error('Lỗi khi tạo thanh toán VNPay:', error);
        return res.status(500).render('error', {
          pageTitle: 'Lỗi thanh toán | Phương Store',
          path: '/error',
          error: 'Không thể kết nối đến VNPay',
          isAuthenticated: !!req.session.user,
          isAdmin: req.session.user?.role === 'admin'
        });
      }
    }

    // ✅ Xóa giỏ hàng cho các phương thức thanh toán khác
    await user.clearCart();

    // ✅ Chuyển hướng thành công
    res.redirect('/orders?success=true');

    // ✅ Gửi email xác nhận (không chặn luồng)
    Promise.all([
      sendOrderConfirmation(order, user),
      sendNewOrderNotification(order, user)
    ]).catch(err => {
      console.error('Lỗi khi gửi email:', err);
    });

  } catch (err) {
    console.error('Lỗi khi đặt hàng:', err);
    res.status(500).render('error', {
      pageTitle: 'Lỗi | Phương Store',
      path: '/error',
      error: 'Không thể tạo đơn hàng',
      isAuthenticated: !!req.session.user,
      isAdmin: req.session.user?.role === 'admin'
    });
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

