require('dotenv').config();
const { connect } = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 4000;

connect().then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port http://localhost:${PORT}`));
    
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
