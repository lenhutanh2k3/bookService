import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import categoryRoutes from './routes/category_routes.js';
import bookRoutes from './routes/book_routes.js';
import authorRoutes from './routes/author_routes.js';
import publisherRoutes from './routes/publisher_routes.js';
import ratingRoutes from './routes/rating_routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads/images', express.static(path.join(__dirname, 'public/uploads/images')));

app.use('/api/categories', categoryRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/books', ratingRoutes);


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});