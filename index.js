const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');

dotenv.config();

const customerRoutes = require('./routes/customer.routes');
const orderRoutes = require('./routes/order.routes');
const campaignRoutes = require('./routes/campaign.routes');
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');
const campaignController = require('./controllers/campaign.controller');

const errorHandler = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

require('./config/passport');

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// Special route for vendor callbacks (doesn't need auth)
app.post('/api/receipt', campaignController.deliveryReceipt);

app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to SmartServe',
    });
});

app.use(errorHandler);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });