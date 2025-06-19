const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const { generateOrderPDF, generateProductsPDF } = require('../util/pdf');
const mongoose = require('mongoose');
const upload = require('../util/file-upload');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/add-product', {
        pageTitle: 'Thêm sản phẩm mới',
        path: '/admin/add-product',
        editing: false,
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin'
    });
};

exports.postAddProduct = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền thực hiện thao tác này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Xử lý upload file
        upload.single('image')(req, res, async (err) => {
            if (err) {
                return res.status(400).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: err.message,
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }

            const { title, price, description, stockQuantity } = req.body;
            const imageUrl = req.file ? '/images/products/' + req.file.filename : null;

            if (!imageUrl) {
                return res.status(400).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Vui lòng tải lên hình ảnh sản phẩm',
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }

            const product = new Product(
                null,
                title,
                imageUrl,
                description,
                parseFloat(price),
                parseInt(stockQuantity)
            );

            await product.save();
            res.redirect('/admin/products');
        });
    } catch (err) {
        console.error('Lỗi khi thêm sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể thêm sản phẩm mới',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.getProducts = async (req, res, next) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.redirect('/create-default-user');
        }

        const products = await Product.fetchAll();
        console.log('Products:', products);

        res.render('admin/products', {
            prods: products || [],
            pageTitle: 'Quản lý sản phẩm',
            path: '/admin/products',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    } catch (err) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.getEditProduct = async (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }

    const prodId = req.params.productId;
    try {
        const product = await Product.findById(prodId);
        if (!product) {
            return res.redirect('/');
        }

        res.render('admin/edit-product', {
            pageTitle: 'Chỉnh sửa sản phẩm',
            path: '/admin/edit-product',
            editing: editMode,
            product: product
        });
    } catch (err) {
        console.error('Lỗi khi lấy thông tin sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải thông tin sản phẩm'
        });
    }
};

exports.postEditProduct = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền thực hiện thao tác này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Xử lý upload file
        upload.single('image')(req, res, async (err) => {
            if (err) {
                return res.status(400).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: err.message,
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }

            const prodId = req.body.productId;
            const updatedTitle = req.body.title;
            const updatedPrice = parseFloat(req.body.price);
            const updatedDesc = req.body.description;
            const updatedStockQuantity = parseInt(req.body.stockQuantity);
            const updatedCategory = req.body.category;

            // Lấy sản phẩm hiện tại để giữ lại imageUrl nếu không upload file mới
            const currentProduct = await Product.findById(prodId);
            if (!currentProduct) {
                return res.status(404).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Không tìm thấy sản phẩm',
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }

            // Nếu có file mới thì sử dụng file mới, không thì giữ file cũ
            const updatedImageUrl = req.file ? '/images/products/' + req.file.filename : currentProduct.imageUrl;

            const product = new Product(
                prodId,
                updatedTitle,
                updatedImageUrl,
                updatedDesc,
                updatedPrice,
                updatedStockQuantity,
                updatedCategory
            );

            await product.save();
            res.redirect('/admin/products');
        });
    } catch (err) {
        console.error('Lỗi khi cập nhật sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể cập nhật sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postDeleteProduct = async (req, res, next) => {
    try {
        const prodId = req.body.productId;
        await Product.deleteById(prodId);
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Lỗi khi xóa sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể xóa sản phẩm'
        });
    }
};

// Controller tải xuống hóa đơn
exports.getDownloadInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        console.log('Bắt đầu tải xuống hóa đơn cho đơn hàng:', orderId);

        // Kiểm tra tính hợp lệ của orderId
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            console.error('ID đơn hàng không hợp lệ:', orderId);
            return res.status(400).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'ID đơn hàng không hợp lệ'
            });
        }

        // Lấy thông tin đơn hàng
        const order = await Order.findById(orderId);
        if (!order) {
            console.error('Không tìm thấy đơn hàng với ID:', orderId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy đơn hàng',
                path: '/error',
                error: 'Không tìm thấy đơn hàng với ID: ' + orderId
            });
        }

        // Lấy thông tin người dùng
        const user = await User.findById(order.userId);
        if (!user) {
            console.error('Không tìm thấy người dùng với ID:', order.userId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy người dùng',
                path: '/error',
                error: 'Không tìm thấy người dùng với ID: ' + order.userId
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
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Không thể tạo file PDF hóa đơn'
            });
        }

        // Gửi file PDF về client
        res.download(pdfPath, `invoice-${orderId}.pdf`, (err) => {
            if (err) {
                console.error('Lỗi khi tải file PDF:', err);
                return res.status(500).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Không thể tải xuống file PDF: ' + err.message
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
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải xuống hóa đơn: ' + err.message
        });
    }
};

// Controller xuất PDF danh sách sản phẩm
exports.getExportProductsPDF = async (req, res, next) => {
    try {
        console.log('Bắt đầu xuất PDF danh sách sản phẩm');

        // Lấy danh sách sản phẩm với điều kiện lọc
        const { category, minPrice, maxPrice, sortBy } = req.query;
        let products = await Product.fetchAll();

        if (!products) {
            console.error('Không thể lấy danh sách sản phẩm');
            return res.status(500).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Không thể lấy danh sách sản phẩm'
            });
        }

        // Áp dụng bộ lọc nếu có
        if (category) {
            products = products.filter(p => p.category === category);
        }
        if (minPrice) {
            products = products.filter(p => p.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            products = products.filter(p => p.price <= parseFloat(maxPrice));
        }

        // Sắp xếp sản phẩm
        if (sortBy) {
            switch (sortBy) {
                case 'price-asc':
                    products.sort((a, b) => (a.price || 0) - (b.price || 0));
                    break;
                case 'price-desc':
                    products.sort((a, b) => (b.price || 0) - (a.price || 0));
                    break;
                case 'name-asc':
                    products.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                    break;
                case 'name-desc':
                    products.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                    break;
            }
        }

        console.log(`Đã lấy được ${products.length} sản phẩm`);

        if (products.length === 0) {
            console.log('Không có sản phẩm nào để xuất PDF');
            return res.status(404).render('error', {
                pageTitle: 'Không có sản phẩm',
                path: '/error',
                error: 'Không có sản phẩm nào phù hợp với tiêu chí tìm kiếm'
            });
        }

        // Tạo PDF
        console.log('Đang tạo PDF...');
        const pdfPath = await generateProductsPDF(products);
        console.log('Đã tạo PDF thành công tại:', pdfPath);

        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(pdfPath)) {
            console.error('File PDF không tồn tại sau khi tạo:', pdfPath);
            return res.status(500).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Không thể tạo file PDF'
            });
        }

        // Gửi file PDF về client
        console.log('Đang gửi file PDF về client...');
        const fileName = `products-list-${new Date().toISOString().slice(0, 10)}.pdf`;
        res.download(pdfPath, fileName, (err) => {
            if (err) {
                console.error('Lỗi khi tải file PDF:', err);
                return res.status(500).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Không thể tải xuống file PDF: ' + err.message
                });
            }
            console.log('Đã gửi file PDF thành công');

            // Xóa file sau khi đã gửi
            try {
                fs.unlink(pdfPath, (err) => {
                    if (err) {
                        console.error('Lỗi khi xóa file PDF:', err);
                    } else {
                        console.log('Đã xóa file PDF tạm thời');
                    }
                });
            } catch (unlinkErr) {
                console.error('Lỗi khi xóa file PDF:', unlinkErr);
            }
        });
    } catch (err) {
        console.error('Lỗi khi xuất PDF danh sách sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể xuất PDF danh sách sản phẩm: ' + err.message
        });
    }
};

// Quản lý đơn hàng
exports.getOrders = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền truy cập trang này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: false
            });
        }

        const orders = await Order.findAll();
        
        res.render('admin/orders', {
            pageTitle: 'Quản lý đơn hàng',
            path: '/admin/orders',
            orders: orders,
            isAuthenticated: true,
            isAdmin: true
        });
    } catch (err) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách đơn hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Cập nhật trạng thái đơn hàng
exports.postUpdateOrderStatus = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này' });
        }

        const { orderId, status } = req.body;
        
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
        }

        const result = await Order.updateStatus(orderId, status);
        
        if (result.modifiedCount > 0) {
            res.json({ success: true, message: 'Cập nhật trạng thái đơn hàng thành công' });
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
    } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái đơn hàng:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật trạng thái' });
    }
};

// Cập nhật trạng thái thanh toán
exports.postUpdatePaymentStatus = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này' });
        }

        const { orderId, paymentStatus } = req.body;
        
        if (!orderId || !paymentStatus) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
        }

        const result = await Order.updatePaymentStatus(orderId, paymentStatus);
        
        if (result.modifiedCount > 0) {
            res.json({ success: true, message: 'Cập nhật trạng thái thanh toán thành công' });
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
    } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái thanh toán:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật trạng thái thanh toán' });
    }
};

// Xem chi tiết đơn hàng
exports.getOrderDetail = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền truy cập trang này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: false
            });
        }

        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy',
                path: '/error',
                error: 'Không tìm thấy đơn hàng',
                isAuthenticated: true,
                isAdmin: true
            });
        }
        
        res.render('admin/order-detail', {
            pageTitle: `Chi tiết đơn hàng ${order._id}`,
            path: '/admin/orders',
            order: order,
            isAuthenticated: true,
            isAdmin: true
        });
    } catch (err) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải chi tiết đơn hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};
