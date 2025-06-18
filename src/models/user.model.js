const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    googleId: {
        type: String,
        sparse: true
    },
    picture: {
        type: String
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    }
}, {
    timestamps: true
});

// Method to check if a password matches the user's password
userSchema.methods.isValidPassword = async function(password) {
    if (!this.password) return false;
    const compare = await bcrypt.compare(password, this.password);
    return compare;
};

const User = mongoose.model('User', userSchema);

module.exports = User;