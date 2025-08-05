// src/controllers/author_controller.js
import Author from '../models/author_model.js';
import Book from '../models/book_model.js';
import response from '../utils/response.js';


const author_controller = {
    addAuthor: async (req, res) => {
        try {
            const { name, biography } = req.body;
            // Validation chi tiết
            if (!name || name.trim().length === 0) {
                let err = new Error('Tên tác giả không được để trống.');
                err.statusCode = 400;
                throw err;
            }
            if (name.trim().length < 2) {
                let err = new Error('Tên tác giả phải có ít nhất 2 ký tự.');
                err.statusCode = 400;
                throw err;
            }
            if (name.trim().length > 100) {
                let err = new Error('Tên tác giả không được vượt quá 100 ký tự.');
                err.statusCode = 400;
                throw err;
            }
            const existingAuthor = await Author.findOne({ name: name.trim() });
            if (existingAuthor) {
                let err = new Error('Tên tác giả đã tồn tại.');
                err.statusCode = 409;
                throw err;
            }
            const newAuthor = new Author({
                name: name.trim(),
                biography: biography ? biography.trim() : ''
            });
            await newAuthor.save();
            return response(res, 201, 'Thêm tác giả thành công!', { author: newAuthor });
        } catch (error) {
            console.error('Add author error:', error);
            if (error.name === 'ValidationError') {
                return response(res, 400, error.message);
            }
            if (error.name === 'CastError') {
                return response(res, 400, 'ID tác giả không hợp lệ.');
            }
            return response(res, error.statusCode || 500, error.message || 'Lỗi server nội bộ khi thêm tác giả.');
        }
    },

    getAllAuthors: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;
            const authors = await Author.find().skip(skip).limit(parseInt(limit));
            const total = await Author.countDocuments();
            return response(res, 200, 'Lấy danh sách tác giả thành công', {
                authors,
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

    getAuthorById: async (req, res) => {
        try {
            const { id } = req.params;
            const author = await Author.findById(id);
            if (!author) {
                let err = new Error('Không tìm thấy tác giả.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Lấy thông tin tác giả thành công', { author });
        } catch (error) {
            console.error('Get author by ID error:', error);
            if (error.name === 'CastError') {
                return response(res, 400, 'ID tác giả không hợp lệ.');
            }
            return response(res, error.statusCode || 500, error.message || 'Lỗi server nội bộ khi lấy tác giả theo ID.');
        }
    },

    updateAuthor: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, biography } = req.body;
            if (name) {
                const existingAuthor = await Author.findOne({ name, _id: { $ne: id } });
                if (existingAuthor) {
                    let err = new Error('Tên tác giả đã tồn tại.');
                    err.statusCode = 409;
                    throw err;
                }
            }
            const updatedAuthor = await Author.findByIdAndUpdate(
                id,
                { name, biography },
                { new: true, runValidators: true }
            );
            if (!updatedAuthor) {
                let err = new Error('Không tìm thấy tác giả để cập nhật.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Cập nhật tác giả thành công', { author: updatedAuthor });
        } catch (error) {
            console.error('Update author error:', error);
            if (error.name === 'ValidationError') {
                return response(res, 400, error.message);
            }
            if (error.name === 'CastError') {
                return response(res, 400, 'ID tác giả không hợp lệ.');
            }
            return response(res, error.statusCode || 500, error.message || 'Lỗi server nội bộ khi cập nhật tác giả.');
        }
    },

    deleteAuthor: async (req, res) => {
        try {
            const { id } = req.params;

            const referringBooksCount = await Book.countDocuments({ author: id });
            if (referringBooksCount > 0) {
                let err = new Error('Không thể xóa tác giả vì có sách đang liên kết với tác giả này. Vui lòng gán lại tác giả cho các sách hoặc xóa các sách liên quan trước.');
                err.statusCode = 409;
                throw err;
            }

            const deletedAuthor = await Author.findByIdAndDelete(id);
            if (!deletedAuthor) {
                let err = new Error('Không tìm thấy tác giả để xóa.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Xóa tác giả thành công', { author: deletedAuthor });
        } catch (error) {
            console.error('Delete author error:', error);
            if (error.name === 'CastError') {
                return response(res, 400, 'ID tác giả không hợp lệ.');
            }
            return response(res, error.statusCode || 500, error.message || 'Lỗi server nội bộ khi xóa tác giả.');
        }
    },

    // Thống kê tác giả
    getAuthorStats: async (req, res) => {
        try {
            const total = await Author.countDocuments();
            const active = await Author.countDocuments({ status: 'active' });

            return response(res, 200, 'Lấy thống kê tác giả thành công', {
                total,
                active
            });
        } catch (error) {
            console.error('Get author stats error:', error);
            return response(res, 500, 'Lỗi khi lấy thống kê tác giả');
        }
    }
};

export default author_controller;