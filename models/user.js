const getDb = require('../util/database').getDb;
const mongodb = require('mongodb');

class User {
    constructor(name, email, role = 'user') {
        this.name = name;
        this.email = email;
        this.role = role;
        this.createdAt = new Date();
        this.cart = { items: [], totalPrice: 0 };
    }

    async save() {
        const db = getDb();
        try {
            const result = await db.collection('users').insertOne(this);
            return result;
        } catch (err) {
            console.error('Lỗi khi lưu user:', err);
            throw err;
        }
    }

    static async findById(userId) {
        const db = getDb();
        try {
            const user = await db.collection('users')
                .findOne({ _id: new mongodb.ObjectId(userId.toString()) });
            return user;
        } catch (err) {
            console.error('Lỗi khi tìm user:', err);
            throw err;
        }
    }

    static async findByEmail(email) {
        const db = getDb();
        try {
            return await db.collection('users').findOne({ email: email });
        } catch (err) {
            console.error('Lỗi khi tìm user theo email:', err);
            throw err;
        }
    }

    async getCart() {
        try {
            if (!this._id) {
                console.error('User ID không tồn tại');
                return { items: [], totalPrice: 0 };
            }

            const db = getDb();
            const user = await db.collection('users').findOne({ _id: this._id });

            if (!user) {
                console.error('Không tìm thấy user');
                return { items: [], totalPrice: 0 };
            }

            if (!user.cart || !user.cart.items || user.cart.items.length === 0) {
                console.log('Giỏ hàng trống');
                return { items: [], totalPrice: 0 };
            }

            // Lấy thông tin sản phẩm cho mỗi item trong giỏ hàng
            const productIds = user.cart.items.map(item => {
                return item._id instanceof mongodb.ObjectId ?
                    item._id :
                    new mongodb.ObjectId(item._id);
            });

            const products = await db.collection('products')
                .find({ _id: { $in: productIds } })
                .toArray();

            // Map sản phẩm với số lượng
            const cartItems = user.cart.items.map(cartItem => {
                try {
                    const product = products.find(p =>
                        p._id.toString() === cartItem._id.toString()
                    );

                    if (!product) {
                        console.warn(`Không tìm thấy sản phẩm với ID: ${cartItem._id}`);
                        return null;
                    }

                    return {
                        _id: product._id,
                        title: product.title,
                        price: product.price || 0,
                        imageUrl: product.imageUrl,
                        quantity: cartItem.quantity || 1
                    };
                } catch (e) {
                    console.error(`Lỗi khi xử lý sản phẩm ID: ${cartItem._id}`, e);
                    return null;
                }
            }).filter(item => item !== null);




            // Tính tổng giá
            const totalPrice = cartItems.reduce((total, item) => {
                return total + ((item.price || 0) * (item.quantity || 1));
            }, 0);

            console.log('Giỏ hàng:', {
                items: cartItems,
                totalPrice: totalPrice
            });

            return {
                items: cartItems,
                totalPrice: totalPrice
            };
        } catch (err) {
            console.error('Lỗi khi lấy giỏ hàng:', err);
            return { items: [], totalPrice: 0 };
        }
    }

    async addToCart(product, quantity = 1) {
        try {
            if (!this._id) {
                console.error('User ID không tồn tại');
                return;
            }

            if (!product || !product._id) {
                console.error('Product hoặc Product ID không tồn tại');
                return;
            }

            // Kiểm tra số lượng tồn kho
            if (product.stockQuantity && quantity > product.stockQuantity) {
                throw new Error(`Số lượng vượt quá tồn kho. Chỉ còn ${product.stockQuantity} sản phẩm.`);
            }

            // Đảm bảo product._id là ObjectId
            const productId = product._id instanceof mongodb.ObjectId ?
                product._id :
                new mongodb.ObjectId(product._id);

            const db = getDb();

            // Lấy thông tin user hiện tại từ database để có cart mới nhất
            const currentUser = await db.collection('users').findOne({ _id: this._id });
            if (!currentUser) {
                throw new Error('Không tìm thấy user');
            }

            // Đảm bảo cart tồn tại
            const userCart = currentUser.cart || { items: [] };
            const updatedCartItems = [...(userCart.items || [])];

            const cartProductIndex = updatedCartItems.findIndex(cp => {
                return cp._id.toString() === productId.toString();
            });

            if (cartProductIndex > -1) {
                // Sản phẩm đã có trong giỏ hàng
                const newQuantity = updatedCartItems[cartProductIndex].quantity + quantity;
                if (product.stockQuantity && newQuantity > product.stockQuantity) {
                    throw new Error(`Số lượng vượt quá tồn kho. Chỉ còn ${product.stockQuantity} sản phẩm.`);
                }
                updatedCartItems[cartProductIndex].quantity = newQuantity;
            } else {
                // Thêm sản phẩm mới vào giỏ hàng
                updatedCartItems.push({
                    _id: productId,
                    quantity: quantity
                });
            }

            const updatedCart = {
                items: updatedCartItems
            };

            await db.collection('users').updateOne(
                { _id: this._id },
                { $set: { cart: updatedCart } }
            );

            console.log('Đã thêm sản phẩm vào giỏ hàng:', {
                productId: productId.toString(),
                quantity: quantity,
                cartItems: updatedCartItems
            });
        } catch (err) {
            console.error('Lỗi khi thêm vào giỏ hàng:', err);
            throw err;
        }
    }

    async removeFromCart(productId) {
        try {
            if (!this._id) {
                console.error('User chưa có _id');
                throw new Error('User chưa có _id');
            }

            const db = getDb();
            const cart = await this.getCart();
            const updatedCartItems = cart.items.filter(item => {
                return item._id.toString() !== productId.toString();
            });

            const updatedCart = {
                items: updatedCartItems,
                totalPrice: updatedCartItems.reduce((total, item) => {
                    return total + ((item.price || 0) * (item.quantity || 1));
                }, 0)
            };

            await db.collection('users').updateOne(
                { _id: new mongodb.ObjectId(this._id) },
                { $set: { cart: updatedCart } }
            );
        } catch (err) {
            console.error('Lỗi khi xóa sản phẩm khỏi giỏ hàng:', err);
            throw err;
        }
    }

    async clearCart() {
        try {
            if (!this._id) {
                console.error('User chưa có _id');
                throw new Error('User chưa có _id');
            }

            const db = getDb();
            await db.collection('users').updateOne(
                { _id: new mongodb.ObjectId(this._id) },
                { $set: { cart: { items: [], totalPrice: 0 } } }
            );
        } catch (err) {
            console.error('Lỗi khi xóa giỏ hàng:', err);
            throw err;
        }
    }

    static async updateName(userId, newName) {
        const db = getDb();
        try {
            return await db.collection('users').updateOne(
                { _id: new mongodb.ObjectId(userId) },
                { $set: { name: newName, updatedAt: new Date() } }
            );
        } catch (err) {
            console.error('Lỗi khi cập nhật tên user:', err);
            throw err;
        }
    }

    static async updatePassword(userId, newPassword) {
        const db = getDb();
        try {
            return await db.collection('users').updateOne(
                { _id: new mongodb.ObjectId(userId) },
                { $set: { password: newPassword, updatedAt: new Date() } }
            );
        } catch (err) {
            console.error('Lỗi khi cập nhật mật khẩu user:', err);
            throw err;
        }
    }

    static async create({ name, email, password, phone, address, role = 'user' }) {
        const db = getDb();
        const user = {
            name,
            email,
            password,
            phone,
            address,
            role,
            createdAt: new Date(),
            cart: { items: [], totalPrice: 0 }
        };
        try {
            const result = await db.collection('users').insertOne(user);
            user._id = result.insertedId;
            return user;
        } catch (err) {
            console.error('Lỗi khi tạo user:', err);
            throw err;
        }
    }
}

module.exports = User;