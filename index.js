const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const passport = require('passport');

// Load environment variables
dotenv.config();

// Import routes
const customerRoutes = require('./routes/customer.routes');
const orderRoutes = require('./routes/order.routes');
const campaignRoutes = require('./routes/campaign.routes');
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');
const campaignController = require('./controllers/campaign.controller');

// Import error middleware
const errorHandler = require('./middleware/error.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure passport
require('./config/passport');

// Middleware
// Updated CORS configuration to explicitly allow requests from frontend
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
app.use(express.json());
app.use(passport.initialize());

// API documentation setup - enable Swagger UI
const swaggerDocument = require('./swagger.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// Special route for vendor callbacks (doesn't need auth)
app.post('/api/receipt', campaignController.deliveryReceipt);

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Mini CRM API',
        documentation: 'API documentation available at /api-docs'
    });
});

// Error handling middleware - must be after all other routes
app.use(errorHandler);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });