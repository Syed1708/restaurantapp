// # Backend scaffold — Express + Mongoose (TypeScript-ready JS)

// This document contains a minimal, production-oriented backend scaffold you can copy into a repo. It includes folder structure, package.json, env example, Mongoose models, core middleware, and example controllers (auth + order creation with transaction + stock decrement).

// ---

// ## Folder structure

```
backend/
├─ package.json
├─ README.md
├─ .env.example
├─ src/
│  ├─ server.js                // app bootstrap
│  ├─ app.js                   // express app
│  ├─ config/
│  │  └─ db.js                 // mongoose connection
│  ├─ routes/
│  │  ├─ auth.routes.js
│  │  ├─ products.routes.js
│  │  └─ orders.routes.js
│  ├─ controllers/
│  │  ├─ auth.controller.js
│  │  ├─ products.controller.js
│  │  └─ orders.controller.js
│  ├─ models/
│  │  ├─ Product.js
│  │  ├─ StockItem.js
│  │  ├─ Order.js
│  │  ├─ User.js
│  │  └─ Expense.js
│  ├─ middleware/
│  │  ├─ auth.js
│  │  └─ errorHandler.js
│  └─ utils/
│     └─ counters.js           // sequential counters helper
└─ tests/
```

---

// ## package.json (minimal)

```json
{
  "name": "restaurant-backend",
  "version": "0.1.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.0.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

---

## .env.example

```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/restaurant?retryWrites=true&w=majority
JWT_SECRET=replace_with_strong_secret
PORT=4000
NODE_ENV=development
```

---

## src/config/db.js

```js
const mongoose = require('mongoose');

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { dbName: 'restaurant' });
  console.log('MongoDB connected');
}

module.exports = { connect };
```

---

## src/server.js

```js
require('dotenv').config();
const { connect } = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 4000;

connect()
  .then(() => app.listen(PORT, () => console.log(`Server listening on ${PORT}`)))
  .catch(err => {
    console.error('Failed to start', err);
    process.exit(1);
  });
```

---

## src/app.js

```js
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/products.routes');
const orderRoutes = require('./routes/orders.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

module.exports = app;
```

---

## src/models/Product.js

```js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const VariantSchema = new Schema({
  name: String,
  priceDelta: { type: Number, default: 0 },
  sku: String
}, { _id: false });

const IngredientSchema = new Schema({
  materialId: { type: Schema.Types.ObjectId, ref: 'StockItem' },
  qty: Number
}, { _id: false });

const ProductSchema = new Schema({
  name: { type: String, required: true },
  sku: String,
  description: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  price: { type: Number, required: true }, // cents
  variants: [VariantSchema],
  ingredients: [IngredientSchema],
  trackStock: { type: Boolean, default: false },
  stockUnit: String,
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
```

---

## src/models/StockItem.js

```js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const StockItemSchema = new Schema({
  name: String,
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, default: 0 },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location' },
  lastUpdated: Date
}, { timestamps: true });

module.exports = mongoose.model('StockItem', StockItemSchema);
```

---

## src/models/Order.js

```js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  variant: String,
  qty: Number,
  priceAtOrder: Number
}, { _id: false });

const PaymentSchema = new Schema({
  type: { type: String, enum: ['cash','card','voucher','other'] },
  amount: Number,
  methodDetails: Schema.Types.Mixed
}, { _id: false });

const OrderSchema = new Schema({
  number: Number,
  locationId: { type: Schema.Types.ObjectId, ref: 'Location' },
  table: String,
  items: [OrderItemSchema],
  status: { type: String, default: 'open' },
  subtotal: Number,
  tax: Number,
  total: Number,
  payments: [PaymentSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
```

---

## src/models/User.js

```js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin','manager','waiter','kitchen'], default: 'waiter' },
  permissions: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
```

---

## src/middleware/auth.js

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '') || req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = auth;
```

---

## src/middleware/errorHandler.js

```js
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal error' });
}

module.exports = { errorHandler };
```

---

## src/utils/counters.js

```js
// simple counters collection for sequential numbers
const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

async function nextSequence(name) {
  const result = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

module.exports = { nextSequence };
```

---

## src/controllers/auth.controller.js

```js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function register(req, res) {
  const { name, email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash: hash, role });
  res.json({ id: user._id, email: user.email });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid' });
  const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
}

module.exports = { register, login };
```

---

## src/controllers/orders.controller.js

```js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const StockItem = require('../models/StockItem');
const { nextSequence } = require('../utils/counters');

// create order and decrement stock atomically
async function createOrder(req, res, next) {
  const session = await mongoose.startSession();
  try {
    const { items, table, locationId } = req.body;
    let resultOrder;

    await session.withTransaction(async () => {
      // 1. get order number
      const number = await nextSequence(`orders:${new Date().toISOString().slice(0,10)}:${locationId}`);

      // 2. create order doc
      const orderDoc = {
        number,
        locationId,
        table,
        items,
        status: 'open',
        subtotal: items.reduce((s,i)=>s + (i.priceAtOrder * i.qty), 0)
      };

      const created = await Order.create([orderDoc], { session });
      resultOrder = created[0];

      // 3. decrement stock for tracked items
      for (const it of items) {
        // naive: find matching stock item for product and decrement
        const stock = await StockItem.findOne({ productId: it.productId, locationId }).session(session);
        if (stock && stock.quantity < it.qty) {
          throw Object.assign(new Error('Insufficient stock for product ' + it.productId), { status: 400 });
        }
        if (stock) {
          stock.quantity -= it.qty;
          stock.lastUpdated = new Date();
          await stock.save({ session });
        }
      }
    });

    res.status(201).json(resultOrder);
  } catch (err) {
    next(err);
  } finally {
    session.endSession();
  }
}

module.exports = { createOrder };
```

---

## src/routes/auth.routes.js

```js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);

module.exports = router;
```

---

## src/routes/orders.routes.js

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createOrder } = require('../controllers/orders.controller');

router.post('/', auth, createOrder);

module.exports = router;
```

---

## src/routes/products.routes.js (skeleton)

```js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

router.get('/', auth, async (req,res)=>{
  const items = await Product.find();
  res.json(items);
});

router.post('/', auth, async (req,res)=>{
  const p = await Product.create(req.body);
  res.status(201).json(p);
});

module.exports = router;
```

// ---

// ## Quick notes & next steps

// - This scaffold uses plain JavaScript for maximum simplicity; converting to TypeScript is straightforward (add tsconfig, rename files, add types).
// - The order creation controller includes a transaction and a counters helper for sequential numbering.
// - You should add input validation (e.g., using Zod or Joi) and better error mapping.
// - Add tests: integration tests for the atomic order flow (create order -> stock decremented -> order exists) are critical.

// ---

// If you want, next I will:
// 1. Expand controllers for products, users (full CRUD), expenses and reports; or
// 2. Add JWT refresh token flow + secure cookie implementation; or
// 3. Scaffold the Next.js frontend POS page and data fetching hooks.

// Tell me which of those you'd like me to do next and I will implement it.
