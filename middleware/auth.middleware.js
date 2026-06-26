const jwt = require('jsonwebtoken');

// Middleware to validate JWT token
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    try {
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token format invalid.' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            ...decoded,
            // For team members, route data queries through the owner's ID.
            // ownId preserves the actual user for audit purposes.
            ownId: decoded.id,
            id:    decoded.orgId || decoded.id,
        };
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = {
    authenticateJWT
};