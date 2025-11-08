require('dotenv').config();
console.log('Loaded .env file successfully');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'NOT SET');
