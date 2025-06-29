const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

module.exports = class Product {
    constructor(id, title, imageUrl, description, price, stockQuantity = 0) {
        this._id = id ? new mongodb.ObjectId(id) : null;
        this.title = title;
        this.imageUrl = imageUrl;
        this.description = description;
        this.price = parseFloat(price);
        this.stockQuantity = parseInt(stockQuantity);
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    async save() {
        try {
            const db = getDb();
            let result;

            if (this._id) {
                // Cập nhật sản phẩm
                this.updatedAt = new Date();
                result = await db.collection('products').updateOne(
                    { _id: this._id },
                    {
                        $set: {
                            title: this.title,
                            imageUrl: this.imageUrl,
                            description: this.description,
                            price: this.price,
                            stockQuantity: this.stockQuantity,
                            updatedAt: this.updatedAt
                        }
                    }
                );
                console.log('Đã cập nhật sản phẩm:', result);
            } else {
                // Thêm sản phẩm mới
                result = await db.collection('products').insertOne({
                    title: this.title,
                    imageUrl: this.imageUrl,
                    description: this.description,
                    price: this.price,
                    stockQuantity: this.stockQuantity,
                    createdAt: this.createdAt,
                    updatedAt: this.updatedAt
                });
                console.log('Đã thêm sản phẩm mới:', result);
            }
            return result;
        } catch (err) {
            console.error('Lỗi khi lưu sản phẩm:', err);
            throw err;
        }
    }

    static async fetchAll() {
        try {
            const db = getDb();
            console.log('Đang lấy danh sách sản phẩm từ MongoDB...');
            const products = await db.collection('products')
                .find()
                .sort({ createdAt: -1 })
                .toArray();
            console.log('Số sản phẩm tìm thấy:', products.length);
            return products;
        } catch (err) {
            console.error('Lỗi khi lấy danh sách sản phẩm:', err);
            throw err;
        }
    }

    static async find(filter = {}) {
        try {
            const db = getDb();
            console.log('Đang tìm sản phẩm với filter:', filter);
            const products = await db.collection('products')
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();
            console.log('Số sản phẩm tìm thấy:', products.length);
            return products;
        } catch (err) {
            console.error('Lỗi khi tìm sản phẩm:', err);
            throw err;
        }
    }

    static async findById(productId) {
        try {
            const db = getDb();
            console.log('Đang tìm sản phẩm với ID:', productId);
            const product = await db.collection('products')
                .findOne({ _id: new mongodb.ObjectId(productId) });
            console.log('Kết quả tìm kiếm:', product);
            return product;
        } catch (err) {
            console.error('Lỗi khi tìm sản phẩm:', err);
            throw err;
        }
    }

    static async deleteById(productId) {
        try {
            const db = getDb();
            const result = await db.collection('products')
                .deleteOne({ _id: new mongodb.ObjectId(productId) });
            console.log('Đã xóa sản phẩm:', result);
            return result;
        } catch (err) {
            console.error('Lỗi khi xóa sản phẩm:', err);
            throw err;
        }
    }

    static async findRelatedProducts(product, limit = 4) {
        try {
            const db = getDb();
            const relatedProducts = await db.collection('products')
                .find({
                    _id: { $ne: product._id },
                    price: {
                        $gte: product.price * 0.8,
                        $lte: product.price * 1.2
                    }
                })
                .limit(limit)
                .toArray();
            return relatedProducts;
        } catch (err) {
            console.error('Lỗi khi tìm sản phẩm liên quan:', err);
            throw err;
        }
    }
}