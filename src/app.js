const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/products.routes');
const orderRoutes = require('./routes/orders.routes');
const stockRoutes = require('./routes/stock.routes');
const reportRoutes = require('./routes/report.routes');
const { errorHandler } = require('./middleware/errorHandler');
const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => res.send('Restaurant backend API is running!'));

app.use(errorHandler);
module.exports = app;
