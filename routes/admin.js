const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const MarketListing = require('../models/MarketListing');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// ALL ADMIN ROUTES REQUIRE ADMIN AUTH
router.use(adminAuth);

// Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalActiveListings,
      totalCompletedSales,
      totalRevenue,
      recentTransactions,
      topSellers
    ] = await Promise.all([
      User.countDocuments(),
      MarketListing.countDocuments({ status: 'active' }),
      MarketListing.countDocuments({ status: 'sold' }),
      Transaction.aggregate([
        { $match: { type: 'sale', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'username steamId')
        .populate('marketListing', 'item.marketName'),
      User.aggregate([
        { $match: { reputation: { $exists: true } } },
        { $sort: { 'reputation.positive': -1 } },
        { $limit: 10 },
        {
          $project: {
            username: 1,
            steamId: 1,
            'reputation.positive': 1,
            'reputation.negative': 1
          }
        }
      ])
    ]);

    const totalRevenueAmount = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.json({
      totalUsers,
      totalActiveListings,
      totalCompletedSales,
      totalRevenue: totalRevenueAmount,
      recentTransactions,
      topSellers
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users with filters
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, isBanned } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { steamId: { $regex: search, $options: 'i' } }
      ];
    }
    if (isBanned !== undefined) {
      filter.isBanned = isBanned === 'true';
    }

    const users = await User.find(filter)
      .select('-steamInventory')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-steamInventory');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's transactions
    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('marketListing', 'item.marketName');

    // Get user's listings
    const listings = await MarketListing.find({ seller: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      user,
      transactions,
      listings
    });
  } catch (error) {
    logger.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Ban/Unban user
router.post('/users/:id/ban', async (req, res) => {
  try {
    const { isBanned, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBanned = isBanned;
    await user.save();

    logger.info(`Admin ${req.user.username} ${isBanned ? 'banned' : 'unbanned'} user ${user.username}`);

    res.json({
      message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
      user
    });
  } catch (error) {
    logger.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to update user ban status' });
  }
});

// Add/remove admin
router.post('/users/:id/admin', async (req, res) => {
  try {
    const { isAdmin } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isAdmin = isAdmin;
    await user.save();

    logger.info(`Admin ${req.user.username} ${isAdmin ? 'granted' : 'removed'} admin rights from ${user.username}`);

    res.json({
      message: `Admin rights ${isAdmin ? 'granted' : 'removed'} successfully`,
      user
    });
  } catch (error) {
    logger.error('Error updating admin rights:', error);
    res.status(500).json({ error: 'Failed to update admin rights' });
  }
});

// Adjust user balance
router.post('/users/:id/balance', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldBalance = user.wallet.balance;
    user.wallet.balance += amount;
    await user.save();

    // Create transaction record
    await Transaction.create({
      type: 'admin_adjustment',
      user: user._id,
      amount: amount,
      status: 'completed',
      description: `Admin adjustment: ${reason || 'Balance updated by admin'} (${oldBalance} -> ${user.wallet.balance})`
    });

    logger.info(`Admin ${req.user.username} adjusted balance for ${user.username}: ${amount}`);

    res.json({
      message: 'Balance adjusted successfully',
      oldBalance,
      newBalance: user.wallet.balance,
      adjustment: amount
    });
  } catch (error) {
    logger.error('Error adjusting balance:', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

// Get all listings with filters
router.get('/listings', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter['item.marketName'] = { $regex: search, $options: 'i' };
    }

    const listings = await MarketListing.find(filter)
      .populate('seller', 'username steamId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MarketListing.countDocuments(filter);

    res.json({
      listings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Delete listing
router.delete('/listings/:id', async (req, res) => {
  try {
    const listing = await MarketListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await MarketListing.findByIdAndDelete(req.params.id);

    logger.info(`Admin ${req.user.username} deleted listing ${req.params.id}`);

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    logger.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// Get all transactions
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const transactions = await Transaction.find(filter)
      .populate('user', 'username steamId')
      .populate('marketListing', 'item.marketName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get pending withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Transaction.find({
      type: 'withdrawal',
      status: 'pending'
    })
      .populate('user', 'username steamId')
      .sort({ createdAt: -1 });

    res.json({ withdrawals });
  } catch (error) {
    logger.error('Error fetching withdrawals:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Process withdrawal
router.post('/withdrawals/:id/process', async (req, res) => {
  try {
    const { status } = req.body; // 'completed' or 'failed'
    const withdrawal = await Transaction.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    withdrawal.status = status;
    await withdrawal.save();

    if (status === 'failed') {
      // Refund the user if withdrawal failed
      const user = await User.findById(withdrawal.user);
      if (user) {
        user.wallet.balance += Math.abs(withdrawal.amount);
        await user.save();
      }
    }

    logger.info(`Admin ${req.user.username} ${status} withdrawal ${req.params.id}`);

    res.json({
      message: `Withdrawal ${status} successfully`,
      withdrawal
    });
  } catch (error) {
    logger.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// System logs (simplified - in real app would use proper logging service)
router.get('/logs', async (req, res) => {
  try {
    // This is a placeholder - in a real app you'd query actual log files
    res.json({
      message: 'Log viewing not implemented in demo',
      logs: []
    });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
