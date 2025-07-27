import Book from '../models/book_model.js';
import Image from '../models/image_model.js';
import response from '../utils/response.js';
import mongoose from 'mongoose';
import { deletePhysicalImages } from '../utils/image_utils.js';
import axios from 'axios';

const book_controller = {
    addBook: async (req, res, next) => {
        try {
            const { title, description, price, category, publisher, author, availability, stockCount } = req.body;
            const files = req.files || [];
            // Kiểm tra ảnh
            if (files.length === 0) {
                let err = new Error('Vui lòng cung cấp ít nhất một ảnh cho sách.');
                err.statusCode = 400;
                throw err;
            }
            // Kiểm tra tên sách đã tồn tại
            const existingBook = await Book.findOne({ title });
            if (existingBook) {
                let err = new Error('Tên sách đã tồn tại.');
                err.statusCode = 409;
                throw err;
            }

            // Lưu thông tin ảnh vào DB
            const newImagesData = files.map((file) => ({
                filename: file.filename,
                path: file.path.replace(/^public[\\/]/, ''),
                createdBy: req.user ? req.user.id : null,
            }));
            const savedImages = await Image.insertMany(newImagesData);
            const imageIds = savedImages.map(img => img._id);

            // Tạo sách mới
            const newBook = new Book({
                title,
                description,
                price: parseFloat(price),
                images: imageIds,
                category,
                publisher,
                author,
                availability: availability === 'true',
                stockCount: parseInt(stockCount),
            });

            await newBook.save();

            // Populate dữ liệu để trả về
            const populatedBook = await Book.findById(newBook._id)
                .populate('category')
                .populate('publisher')
                .populate('author')
                .populate('images');

            return response(res, 201, 'Thêm sách thành công', { book: populatedBook });
        } catch (error) {
            // Xóa các file ảnh vật lý đã tải lên nếu có lỗi
            if (req.files && req.files.length > 0) {
                const imagesPathsToClean = req.files.map(file => ({ path: file.path.replace(/^public[\\/]/, '') }));
                try {
                    await deletePhysicalImages(imagesPathsToClean);
                } catch (cleanError) {
                    console.error('Lỗi khi dọn dẹp ảnh vật lý sau lỗi thêm sách:', cleanError);
                }
            }
            next(error);
        }
    },

    getAllBooks: async (req, res, next) => {
        try {
            const { q, category, available, minPrice, maxPrice, sort, page: pageParam, limit: limitParam, author, publisher, status } = req.query;

            let query = {};
            if (status === 'deleted') {
                query.status = 'deleted';
            } else if (status === 'active' || !status) {
                query.status = 'active';
            }

            // Tìm kiếm theo từ khóa q
            let searchQuery = {};
            if (q && q.trim() !== '') {
                const searchTerm = q.trim();
                searchQuery = {
                    $or: [
                        { title: { $regex: searchTerm, $options: 'i' } }
                    ]
                };
            }

            // Lọc theo danh mục
            if (category) {
                const categoryIds = category.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
                if (categoryIds.length === 0) {
                    let err = new Error('ID danh mục không hợp lệ.');
                    err.statusCode = 400;
                    throw err;
                }
                query.category = { $in: categoryIds };
            }
            // Lọc theo tác giả
            if (author) {
                const authorIds = author.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
                if (authorIds.length === 0) {
                    let err = new Error('ID tác giả không hợp lệ.');
                    err.statusCode = 400;
                    throw err;
                }
                query.author = { $in: authorIds };
            }
            // Lọc theo nhà xuất bản
            if (publisher) {
                const publisherIds = publisher.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
                if (publisherIds.length === 0) {
                    let err = new Error('ID nhà xuất bản không hợp lệ.');
                    err.statusCode = 400;
                    throw err;
                }
                query.publisher = { $in: publisherIds };
            }

            // Lọc theo trạng thái có sẵn
            if (available !== undefined) {
                query.availability = available === 'true';
            }
            // Lọc theo khoảng giá
            if (minPrice !== undefined || maxPrice !== undefined) {
                let min = minPrice !== undefined ? parseFloat(minPrice) : undefined;
                let max = maxPrice !== undefined ? parseFloat(maxPrice) : undefined;
                if (min !== undefined && (isNaN(min) || min < 0)) {
                    let err = new Error('Giá tối thiểu không hợp lệ.');
                    err.statusCode = 400;
                    throw err;
                }
                if (max !== undefined && (isNaN(max) || max < 0)) {
                    let err = new Error('Giá tối đa không hợp lệ.');
                    err.statusCode = 400;
                    throw err;
                }
                // Nếu cả hai đều có và min > max thì hoán đổi
                if (min !== undefined && max !== undefined && min > max) {
                    [min, max] = [max, min];
                }
                query.price = {};
                if (min !== undefined) query.price.$gte = min;
                if (max !== undefined) query.price.$lte = max;
            }

            // Xây dựng sort option
            let sortOption = {};
            if (sort) {
                const [field, order] = sort.split(':');
                sortOption[field] = order === 'desc' ? -1 : 1;
            } else {
                sortOption = { createdAt: -1 };
            }

            // Phân trang
            const page = parseInt(pageParam) || 1;
            const limit = parseInt(limitParam) || 12;
            const skip = (page - 1) * limit;

            // Nếu có tìm kiếm theo từ khóa, sử dụng aggregation để tìm kiếm theo author và publisher
            if (q && q.trim() !== '') {
                const searchTerm = q.trim();

                // Tạo aggregation pipeline
                const pipeline = [
                    // Match theo các điều kiện lọc cơ bản
                    { $match: query },
                    // Lookup author
                    {
                        $lookup: {
                            from: 'authors',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'authorData'
                        }
                    },
                    // Lookup publisher
                    {
                        $lookup: {
                            from: 'publishers',
                            localField: 'publisher',
                            foreignField: '_id',
                            as: 'publisherData'
                        }
                    },
                    // Lookup category
                    {
                        $lookup: {
                            from: 'categories',
                            localField: 'category',
                            foreignField: '_id',
                            as: 'categoryData'
                        }
                    },
                    // Lookup images
                    {
                        $lookup: {
                            from: 'images',
                            localField: 'images',
                            foreignField: '_id',
                            as: 'imagesData'
                        }
                    },
                    // Match theo từ khóa tìm kiếm
                    {
                        $match: {
                            $or: [
                                { title: { $regex: searchTerm, $options: 'i' } },
                                { 'authorData.name': { $regex: searchTerm, $options: 'i' } },
                                { 'publisherData.name': { $regex: searchTerm, $options: 'i' } }
                            ]
                        }
                    },
                    // Project để format lại dữ liệu
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            description: 1,
                            price: 1,
                            availability: 1,
                            stockCount: 1,
                            status: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            author: { $arrayElemAt: ['$authorData', 0] },
                            publisher: { $arrayElemAt: ['$publisherData', 0] },
                            category: { $arrayElemAt: ['$categoryData', 0] },
                            images: '$imagesData'
                        }
                    },
                    // Sort
                    { $sort: sortOption },
                    // Count total
                    {
                        $facet: {
                            metadata: [{ $count: 'total' }],
                            data: [{ $skip: skip }, { $limit: limit }]
                        }
                    }
                ];

                const result = await Book.aggregate(pipeline);
                const total = result[0].metadata[0]?.total || 0;
                const books = result[0].data || [];

                return response(res, 200, 'Lấy danh sách sách thành công', {
                    books: books,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: limit
                    },
                });
            } else {
                // Nếu không có tìm kiếm, sử dụng query thông thường
                const total = await Book.countDocuments(query);
                const books = await Book.find(query)
                    .populate('category')
                    .populate('publisher')
                    .populate('author')
                    .populate('images')
                    .sort(sortOption)
                    .skip(skip)
                    .limit(limit);

                return response(res, 200, 'Lấy danh sách sách thành công', {
                    books: books,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: limit
                    },
                });
            }
        } catch (error) {
            next(error);
        }
    },

    getBookById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const book = await Book.findOne({ _id: id, status: 'active' })
                .populate('category')
                .populate('publisher')
                .populate('author')
                .populate('images');

            if (!book) {
                let err = new Error('Không tìm thấy sách.');
                err.statusCode = 404;
                throw err;
            }

            // Gọi sang mainService để lấy rating trung bình động
            let averageRating = 0;
            let totalReviews = 0;
            try {
                const resp = await axios.get(`${process.env.MAIN_SERVICE}/api/reviews/book/${id}/average-rating`);
                if (resp.data && resp.data.data) {
                    averageRating = resp.data.data.averageRating;
                    totalReviews = resp.data.data.totalReviews;
                }
            } catch (err) {
                console.error('Không lấy được rating từ mainService:', err.message);
            }

            // Đảm bảo trả về các trường rating cho frontend
            const bookObj = book.toObject();
            bookObj.rating = averageRating;
            bookObj.reviewCount = totalReviews;
            return response(res, 200, 'Lấy thông tin sách thành công', { book: bookObj });
        } catch (error) {
            next(error);
        }
    },
    // Hàm mới để lấy nhiều sách theo một mảng ID
    getBooksByIds: async (req, res, next) => {
        try {
            const { ids } = req.query;

            console.log('getBooksByIds called with ids:', ids);
            console.log('Request URL:', req.url);
            console.log('Request method:', req.method);

            // Nếu không có ids, trả về danh sách rỗng thay vì lỗi
            if (!ids) {
                console.log('No ids provided, returning empty array');
                return response(res, 200, 'Lấy danh sách sách thành công', { books: [] });
            }

            const bookIds = ids.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
            if (bookIds.length === 0) {
                console.log('No valid book ids found, returning empty array');
                return response(res, 200, 'Lấy danh sách sách thành công', { books: [] });
            }

            console.log('Valid book ids:', bookIds);

            // Tìm tất cả sách có ID trong danh sách và status active
            const books = await Book.find({ _id: { $in: bookIds }, status: 'active' })
                .populate('category')
                .populate('publisher')
                .populate('author')
                .populate('images');

            // Sắp xếp lại sách theo thứ tự ID được yêu cầu
            const sortedBooks = bookIds.map(id => books.find(book => book._id.toString() === id)).filter(Boolean);

            console.log('Found books:', sortedBooks.length);
            return response(res, 200, 'Lấy danh sách sách thành công', { books: sortedBooks });
        } catch (error) {
            console.error('Lỗi khi lấy nhiều sách theo ID:', error);
            next(error);
        }
    },

    updateBook: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { title, description, price, category, publisher, author, availability, stockCount, keepExistingImages } = req.body;
            const files = req.files || [];
            const updateData = {};

            const existingBook = await Book.findById(id);
            if (!existingBook) {
                let err = new Error('Không tìm thấy sách.');
                err.statusCode = 404;
                throw err;
            }

            // Cập nhật các trường thông tin sách
            if (title !== undefined) {
                const bookWithSameTitle = await Book.findOne({ title, _id: { $ne: id } });
                if (bookWithSameTitle) {
                    let err = new Error('Tên sách đã tồn tại.');
                    err.statusCode = 409;
                    throw err;
                }
                updateData.title = title;
            }
            if (description !== undefined) updateData.description = description;
            if (price !== undefined) updateData.price = parseFloat(price);
            if (availability !== undefined) updateData.availability = availability === 'true';
            if (stockCount !== undefined) updateData.stockCount = parseInt(stockCount);
            if (category !== undefined) updateData.category = category;
            if (publisher !== undefined) updateData.publisher = publisher;
            if (author !== undefined) updateData.author = author;

            // Xử lý ảnh
            let finalImageIds = [];
            const oldImagesInDB = await Image.find({ _id: { $in: existingBook.images } });

            if (keepExistingImages === 'true' || keepExistingImages === true) {
                finalImageIds = existingBook.images.map(img => img.toString());
            } else {
                if (oldImagesInDB.length > 0) {
                    await deletePhysicalImages(oldImagesInDB);
                    await Image.deleteMany({ _id: { $in: existingBook.images } });
                }
            }

            if (files.length > 0) {
                const newImagesData = files.map((file) => ({
                    filename: file.filename,
                    path: file.path.replace(/^public[\\/]/, ''),
                    createdBy: req.user ? req.user.id : null,
                }));
                const savedNewImages = await Image.insertMany(newImagesData);
                finalImageIds = [...finalImageIds, ...savedNewImages.map(img => img._id.toString())];
            }

            if (finalImageIds.length === 0) {
                let err = new Error('Vui lòng cung cấp ít nhất một ảnh cho sách.');
                err.statusCode = 400;
                throw err;
            }
            updateData.images = finalImageIds;

            // Cập nhật sách
            const updatedBook = await Book.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            )
                .populate('category')
                .populate('publisher')
                .populate('author')
                .populate('images');

            if (!updatedBook) {
                let err = new Error('Không tìm thấy sách để cập nhật.');
                err.statusCode = 404;
                throw err;
            }

            return response(res, 200, 'Cập nhật sách thành công', { book: updatedBook });
        } catch (error) {
            // Xóa các file ảnh vật lý mới tải lên nếu lỗi xảy ra
            if (req.files && req.files.length > 0) {
                const newUploadedImagesPaths = req.files.map(file => ({ path: file.path.replace(/^public[\\/]/, '') }));
                try {
                    await deletePhysicalImages(newUploadedImagesPaths);
                } catch (cleanError) {
                    console.error('Lỗi khi dọn dẹp ảnh vật lý mới sau lỗi cập nhật sách:', cleanError);
                }
            }
            next(error);
        }
    },

    deleteBook: async (req, res, next) => {
        try {
            const { id } = req.params;
            // Bỏ kiểm tra đơn hàng, chỉ xóa mềm
            const bookToDelete = await Book.findById(id);
            if (!bookToDelete) {
                let err = new Error('Không tìm thấy sách để xóa.');
                err.statusCode = 404;
                throw err;
            }
            // Xóa mềm: cập nhật status thành 'deleted'
            bookToDelete.status = 'deleted';
            await bookToDelete.save();
            return response(res, 200, 'Xóa mềm sách thành công', { book: bookToDelete });
        } catch (error) {
            next(error);
        }
    },
    updateBookStock: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            if (quantity === undefined || typeof quantity !== 'number') {
                let err = new Error('Số lượng cập nhật tồn kho không hợp lệ.');
                err.statusCode = 400;
                throw err;
            }

            const book = await Book.findById(id);
            if (!book) {
                let err = new Error('Không tìm thấy sách.');
                err.statusCode = 404;
                throw err;
            }

            const newStockCount = book.stockCount + quantity;
            if (newStockCount < 0) {
                let err = new Error(`Số lượng tồn kho không thể âm. Hiện tại: ${book.stockCount}, Yêu cầu giảm: ${-quantity}.`);
                err.statusCode = 400;
                throw err;
            }

            book.stockCount = newStockCount;
            await book.save();

            return response(res, 200, 'Cập nhật tồn kho sách thành công', { book });
        } catch (error) {
            console.error('Lỗi khi cập nhật tồn kho sách:', error);
            next(error);
        }
    },

    updateBookSales: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            if (!quantity || isNaN(quantity) || quantity <= 0) {
                let err = new Error('Số lượng bán không hợp lệ.');
                err.statusCode = 400;
                throw err;
            }

            const book = await Book.findByIdAndUpdate(
                id,
                { $inc: { salesCount: quantity } },
                { new: true }
            );

            if (!book) {
                let err = new Error('Không tìm thấy sách.');
                err.statusCode = 404;
                throw err;
            }

            return response(res, 200, 'Cập nhật salesCount thành công.', { book });
        } catch (error) {
            next(error);
        }
    },
    // API khôi phục sách đã xóa mềm
    restoreBook: async (req, res, next) => {
        try {
            const { id } = req.params;
            const book = await Book.findOne({ _id: id, status: 'deleted' });
            if (!book) {
                let err = new Error('Không tìm thấy sách đã xóa mềm để khôi phục.');
                err.statusCode = 404;
                throw err;
            }
            book.status = 'active';
            await book.save();
            return response(res, 200, 'Khôi phục sách thành công', { book });
        } catch (error) {
            next(error);
        }
    }
};

export default book_controller;