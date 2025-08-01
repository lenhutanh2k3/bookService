// src/models/category_model.js
import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true 
    },
    description: {
        type: String,
        default: ''
    },

}, {
    timestamps: true
});

const Category = mongoose.model('Category', CategorySchema);
export default Category;