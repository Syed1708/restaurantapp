const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/products.routes');
const orderRoutes = require('./routes/orders.routes');
const stockRoutes = require('./routes/stock.routes');
// const reportRoutes = require('./routes/report.routes');
const locationRoutes = require('./routes/locations.routes');
const adjustmentsRoutes = require('./routes/adjustments.routes');
const { errorHandler } = require('./middleware/errorHandler');
const app = express();

app.use(morgan('dev'));
// ✅ CORS configuration
app.use(cors({
  origin: "http://localhost:3000", // your frontend URL
  credentials: true, // allow cookies (optional, but good to have)
}));
// use json data parse
app.use(express.json());
// for using form data by postman
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/adjustments', adjustmentsRoutes);
// app.use('/api/reports', reportRoutes);
app.use('/api/locations', locationRoutes);

app.get('/', (req, res) => res.send('Restaurant backend API is running!'));

app.use(errorHandler);
module.exports = app;
