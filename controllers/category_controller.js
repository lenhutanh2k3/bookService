import Category from '../models/category_model.js';
import Book from '../models/book_model.js';
import response from '../utils/response.js';


const category_controller = {
    addCategory: async (req, res) => {
        try {
            const { name, description } = req.body;

            // Validation chi tiết
            if (!name || name.trim().length === 0) {
                let err = new Error('Tên danh mục không được để trống.');
                err.statusCode = 400;
                throw err;
            }
            if (name.trim().length < 2) {
                let err = new Error('Tên danh mục phải có ít nhất 2 ký tự.');
                err.statusCode = 400;
                throw err;
            }
            if (name.trim().length > 100) {
                let err = new Error('Tên danh mục không được vượt quá 100 ký tự.');
                err.statusCode = 400;
                throw err;
            }

            const existingCategory = await Category.findOne({ name: name.trim() });
            if (existingCategory) {
                let err = new Error('Tên danh mục đã tồn tại.');
                err.statusCode = 409;
                throw err;
            }

            const newCategory = new Category({
                name: name.trim(),
                description: description ? description.trim() : ''
            });
            await newCategory.save();
            return response(res, 201, 'Thêm danh mục thành công!', { category: newCategory });
        } catch (error) {
            console.error('Add category error:', error);
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            if (error.name === 'ValidationError') {
                return response(res, 400, error.message);
            }
            return response(res, 500, 'Lỗi server nội bộ khi thêm danh mục.');
        }
    },

    getAllCategories: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;
            const categories = await Category.find().skip(skip).limit(parseInt(limit));
            const total = await Category.countDocuments();
            return response(res, 200, 'Lấy danh sách danh mục thành công', {
                categories,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    itemsPerPage: parseInt(limit),
                    totalItems: total,
                },
            });
        } catch (error) {
            return response(res, 500, 'Lỗi server nội bộ');
        }
    },

    getCategoryById: async (req, res) => {
        try {
            const { id } = req.params;
            const category = await Category.findById(id);
            if (!category) {
                let err = new Error('Không tìm thấy danh mục.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Lấy thông tin danh mục thành công', { category });
        } catch (error) {
            console.error('Get category by ID error:', error);
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            if (error.name === 'CastError') {
                return response(res, 400, 'ID danh mục không hợp lệ.');
            }
            return response(res, 500, 'Lỗi server nội bộ khi lấy danh mục theo ID.');
        }
    },

    updateCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            if (name) {
                const existingCategory = await Category.findOne({ name, _id: { $ne: id } });
                if (existingCategory) {
                    let err = new Error('Tên danh mục đã tồn tại.');
                    err.statusCode = 409;
                    throw err;
                }
            }

            const updatedCategory = await Category.findByIdAndUpdate(
                id,
                { name, description },
                { new: true, runValidators: true }
            );

            if (!updatedCategory) {
                let err = new Error('Không tìm thấy danh mục để cập nhật.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Cập nhật danh mục thành công', { category: updatedCategory });
        } catch (error) {
            console.error('Update category error:', error);
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            if (error.name === 'CastError') {
                return response(res, 400, 'ID danh mục không hợp lệ.');
            }
            if (error.name === 'ValidationError') {
                return response(res, 400, error.message);
            }
            return response(res, 500, 'Lỗi server nội bộ khi cập nhật danh mục.');
        }
    },

    deleteCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const referringBooksCount = await Book.countDocuments({ category: id });
            if (referringBooksCount > 0) {
                let err = new Error('Không thể xóa danh mục này vì có sách đang thuộc danh mục này. Vui lòng gán lại danh mục cho các sách hoặc xóa các sách liên quan trước.');
                err.statusCode = 409;
                throw err;
            }

            const deletedCategory = await Category.findByIdAndDelete(id);
            if (!deletedCategory) {
                let err = new Error('Không tìm thấy danh mục để xóa.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Xóa danh mục thành công', { category: deletedCategory });
        } catch (error) {
            console.error('Delete category error:', error);
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            if (error.name === 'CastError') {
                return response(res, 400, 'ID danh mục không hợp lệ.');
            }
            return response(res, 500, 'Lỗi server nội bộ khi xóa danh mục.');
        }
    },

    getAllCategoriesByIdsOrAll: async (req, res) => {
        try {
            const { ids, page = 1, limit = 10 } = req.query;
            if (ids) {
                // Lấy theo danh sách id
                const idArr = ids.split(',').filter(id => id);
                const categories = await Category.find({ _id: { $in: idArr } });
                return response(res, 200, 'Lấy danh sách danh mục theo id thành công', { categories });
            } else {
                // Lấy tất cả (giữ nguyên logic cũ)
                const skip = (page - 1) * limit;
                const categories = await Category.find().skip(skip).limit(parseInt(limit));
                const total = await Category.countDocuments();
                return response(res, 200, 'Lấy danh sách danh mục thành công', {
                    categories,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        itemsPerPage: parseInt(limit),
                        totalItems: total,
                    },
                });
            }
        } catch (error) {
            return response(res, 500, 'Lỗi server nội bộ');
        }
    }
};

export default category_controller;