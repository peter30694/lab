const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');

const { sendOrderConfirmation, sendNewOrderNotification } = require('../util/email');
const mongodb = require('mongodb'); // 👈 Thêm dòng này vào đây
const fs = require('fs');
const { generateOrderPDF } = require('../util/pdf'); // Thêm import này
const mongoose = require('mongoose'); // Thêm import này


exports.getProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const sort = req.query.sort || '';

        // Build filter object
        let filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            filter.category = category;
        }

        // Build sort object
        let sortObj = {};
        switch (sort) {
            case 'price_asc':
                sortObj.price = 1;
                break;
            case 'price_desc':
                sortObj.price = -1;
                break;
            case 'name_asc':
                sortObj.title = 1;
                break;
            case 'name_desc':
                sortObj.title = -1;
                break;
            default:
                sortObj.createdAt = -1;
        }

        const products = await Product.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop/product-list', {
            products: products,
            pageTitle: 'Sản phẩm - PetShop',
            path: '/products',
            currentPage: page,
            totalPages: totalPages,
            search: search,
            category: category,
            sort: sort,
            hasProducts: products.length > 0,
            activeShop: true,
            productCSS: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | PetShop',
            path: '/error',
            error: 'Không thể tải danh sách sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
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
            pageTitle: `${product.title} | PetShop`,
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

exports.getIndex = async (req, res, next) => {
    try {
        // Get featured products (latest 8 products)
        const allProducts = await Product.find();
        const products = allProducts.slice(0, 8);

        res.render('shop/index', {
            products: products,
            pageTitle: 'PetShop - Cửa hàng thú cưng',
            path: '/',
            hasProducts: products.length > 0,
            activeShop: true,
            productCSS: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | PetShop',
            path: '/error',
            error: 'Không thể tải trang chủ',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
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
            
            // Check if this is an AJAX request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                const cart = await user.getCart();
                return res.json({
                    success: true,
                    message: 'Đã thêm sản phẩm vào giỏ hàng',
                    cartCount: cart.items.reduce((total, item) => total + item.quantity, 0)
                });
            }
            
            res.redirect('/cart');
        } catch (err) {
            // Nếu lỗi liên quan đến số lượng tồn kho, hiển thị thông báo lỗi
            if (err.message.includes('Số lượng vượt quá tồn kho')) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }
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
    if (!req.session.user || !req.session.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để đặt hàng'
      });
    }

    const { paymentMethod, name, phone, email, address, note } = req.body;
    
    // Validate payment method
    const validPaymentMethods = ['cod', 'vnpay'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    const userData = await User.findById(req.session.user._id);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    
    const user = new User(userData.name, userData.email, userData.role);
    user._id = new mongodb.ObjectId(userData._id);
    user.cart = userData.cart || { items: [], totalPrice: 0 };
    
    const cart = await user.getCart();
    
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng trống'
      });
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

    const order = new Order(
      req.session.user._id,
      products,
      totalAmount,
      {
        name: name,
        phone: phone,
        email: email || req.session.user.email,
        address: address
      },
      paymentMethod
    );
    order.shippingFee = shippingFee;
    order.paymentStatus = 'pending';
    order.orderStatus = 'pending';
    order.note = note || '';
    order.orderDate = new Date();

    const savedOrder = await order.save();

    // Handle different payment methods
    if (paymentMethod === 'cod') {
      // COD - Cash on Delivery
      await Order.updateStatus(savedOrder._id, 'confirmed');
      await Order.updatePaymentStatus(savedOrder._id, 'pending');
      
      // Clear cart
      await user.clearCart();
      
      return res.json({
        success: true,
        message: 'Đơn hàng đã được tạo thành công! Bạn sẽ thanh toán khi nhận hàng.',
        orderId: savedOrder._id
      });
    } else {
      // Invalid payment method
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tạo đơn hàng: ' + error.message
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
exports.getCheckout = async (req, res, next) => {
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

        res.render('shop/checkout', {
            pageTitle: 'Xác nhận đơn hàng',
            path: '/checkout',
            products: cart.items || [],
            totalPrice: cart.totalPrice || 0,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    } catch (err) {
        console.error('Lỗi khi tải trang checkout:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải trang thanh toán',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

