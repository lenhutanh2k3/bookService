// src/controllers/publisher_controller.js
import Publisher from '../models/publisher_model.js';
import Book from '../models/book_model.js';
import response from '../utils/response.js';

const publisher_controller = {

    addPublisher: async (req, res) => {
        try {
            const { name, address, contact } = req.body;

            const existingPublisher = await Publisher.findOne({ name });
            if (existingPublisher) {
                let err = new Error('Tên nhà xuất bản đã tồn tại.');
                err.statusCode = 409;
                throw err;
            }

            const newPublisher = new Publisher({ name, address, contact });
            await newPublisher.save();
            return response(res, 201, 'Thêm nhà xuất bản thành công', { publisher: newPublisher });
        } catch (error) {
            console.error('Add publisher error:', error);
            if (error.name === 'ValidationError') {
                return response(res, 400, error.message);
            }
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            return response(res, 500, 'Lỗi server nội bộ khi thêm nhà xuất bản.');
        }
    },

    getAllPublishers: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;
            const publishers = await Publisher.find().skip(skip).limit(parseInt(limit));
            const total = await Publisher.countDocuments();
            return response(res, 200, 'Lấy danh sách nhà xuất bản thành công', {
                publishers,
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

    getPublisherById: async (req, res) => {
        try {
            const { id } = req.params;
            const publisher = await Publisher.findById(id);
            if (!publisher) {
                let err = new Error('Không tìm thấy nhà xuất bản.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Lấy thông tin nhà xuất bản thành công', { publisher });
        } catch (error) {
            console.error('Get publisher by ID error:', error);
            if (error.name === 'CastError') {
                return response(res, 400, 'ID nhà xuất bản không hợp lệ.');
            }
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            return response(res, 500, 'Lỗi server nội bộ khi lấy nhà xuất bản theo ID.');
        }
    },

    updatePublisher: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, address, contact } = req.body;

            if (name) {
                const existingPublisher = await Publisher.findOne({ name, _id: { $ne: id } });
                if (existingPublisher) {
                    let err = new Error('Tên nhà xuất bản đã tồn tại.');
                    err.statusCode = 409;
                    throw err;
                }
            }

            const updatedPublisher = await Publisher.findByIdAndUpdate(
                id,
                { name, address, contact },
                { new: true, runValidators: true }
            );

            if (!updatedPublisher) {
                let err = new Error('Không tìm thấy nhà xuất bản để cập nhật.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Cập nhật nhà xuất bản thành công', { publisher: updatedPublisher });
        } catch (error) {
            console.error('Update publisher error:', error);
            if (error.name === 'ValidationError') {
                return response(res, 400, error.message);
            }
            if (error.name === 'CastError') {
                return response(res, 400, 'ID nhà xuất bản không hợp lệ.');
            }
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            return response(res, 500, 'Lỗi server nội bộ khi cập nhật nhà xuất bản.');
        }
    },

    deletePublisher: async (req, res) => {
        try {
            const { id } = req.params;

            // Ràng buộc: Kiểm tra xem có cuốn sách nào liên kết với nhà xuất bản này không
            const referringBooksCount = await Book.countDocuments({ publisher: id });
            if (referringBooksCount > 0) {
                let err = new Error('Không thể xóa nhà xuất bản vì có sách đang liên kết với nhà xuất bản này. Vui lòng gán lại nhà xuất bản cho các sách hoặc xóa các sách liên quan trước.');
                err.statusCode = 409;
                throw err;
            }

            const deletedPublisher = await Publisher.findByIdAndDelete(id);
            if (!deletedPublisher) {
                let err = new Error('Không tìm thấy nhà xuất bản để xóa.');
                err.statusCode = 404;
                throw err;
            }
            return response(res, 200, 'Xóa nhà xuất bản thành công', { publisher: deletedPublisher });
        } catch (error) {
            console.error('Delete publisher error:', error);
            if (error.name === 'CastError') {
                return response(res, 400, 'ID nhà xuất bản không hợp lệ.');
            }
            if (error.statusCode) {
                return response(res, error.statusCode, error.message);
            }
            return response(res, 500, 'Lỗi server nội bộ khi xóa nhà xuất bản.');
        }
    }
};

export default publisher_controller;