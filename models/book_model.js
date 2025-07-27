
import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Tiêu đề sách là bắt buộc'],
        trim: true,
        unique: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Giá sách là bắt buộc'],
        min: [0, 'Giá không thể âm'],
    },
    images: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Danh mục là bắt buộc'],
        index: true
    },
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Publisher',
        required: [true, 'Nhà xuất bản là bắt buộc'],
        index: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Author',
        required: [true, 'Tác giả là bắt buộc'],
        index: true
    },
    availability: {
        type: Boolean,
        default: true,
        index: true
    },
    stockCount: {
        type: Number,
        required: [true, 'Số lượng tồn kho là bắt buộc'],
        min: [0, 'Số lượng tồn kho không thể âm'],
    },
    salesCount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'deleted'],
        default: 'active',
        index: true
    }
}, {
    timestamps: true,
});

bookSchema.pre('save', function (next) {
    if (this.isModified('stockCount') || this.isNew) {
        this.availability = this.stockCount > 0;
    }
    next();
});

bookSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update && update.stockCount !== undefined) {
        update.availability = update.stockCount > 0;
    }
    next();
});

bookSchema.index({ createdAt: -1 });

export default mongoose.model('Book', bookSchema);