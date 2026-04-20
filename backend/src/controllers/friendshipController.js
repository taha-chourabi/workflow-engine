const db = require('../models');
const { User, Friendship, Notification, sequelize } = db;
const { Op } = require('sequelize');

// Send friend invitation
exports.sendFriendRequest = async (req, res) => {
  try {
    const { addresseeId } = req.body;
    const requesterId = req.user.id;

    if (requesterId === addresseeId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous envoyer une demande d\'ami' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ message: 'Une demande d\'ami existe déjà' });
    }

    // Create friendship request
    const friendship = await Friendship.create({
      requesterId,
      addresseeId,
      status: 'pending'
    });

    // Create notification for the recipient
    await Notification.create({
      userId: addresseeId,
      type: 'FRIEND_REQUEST',
      title: 'Nouvelle demande d\'ami',
      message: `${req.user.fullName} vous a envoyé une demande d'ami`,
      relatedId: friendship.id,
      relatedType: 'Friendship'
    });

    res.status(201).json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Get friend requests
exports.getFriendRequests = async (req, res) => {
  try {
    const requests = await Friendship.findAll({
      where: { addresseeId: req.user.id, status: 'pending' },
      include: [
        { model: User, as: 'requester', attributes: ['id', 'fullName', 'email'] }
      ]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Accept friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const friendship = await Friendship.findOne({
      where: { 
        id: requestId, 
        addresseeId: req.user.id, 
        status: 'pending' 
      }
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Demande d\'ami non trouvée' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    // Create notification for the requester
    await Notification.create({
      userId: friendship.requesterId,
      type: 'FRIEND_ACCEPTED',
      title: 'Demande d\'ami acceptée',
      message: `${req.user.fullName} a accepté votre demande d'ami`,
      relatedId: friendship.id,
      relatedType: 'Friendship'
    });

    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Decline friend request
exports.declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const friendship = await Friendship.findOne({
      where: { 
        id: requestId, 
        addresseeId: req.user.id, 
        status: 'pending' 
      }
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Demande d\'ami non trouvée' });
    }

    friendship.status = 'declined';
    await friendship.save();

    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Get friends list
exports.getFriends = async (req, res) => {
  try {
    const friends = await Friendship.findAll({
      where: {
        [Op.and]: [
          { status: 'accepted' },
          {
            [Op.or]: [
              { requesterId: req.user.id },
              { addresseeId: req.user.id }
            ]
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: User,
          as: 'addressee',
          attributes: ['id', 'fullName', 'email']
        }
      ]
    });

    // Format response to return friend objects
    const friendList = friends.map(friendship => {
      const friend = friendship.requesterId === req.user.id 
        ? friendship.addressee 
        : friendship.requester;
      return friend;
    });

    res.json(friendList);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Get all users for messaging
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { 
        id: { [Op.ne]: req.user.id },
        isActive: true 
      },
      attributes: ['id', 'fullName', 'email', 'department', 'role']
    });
    res.json(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
