const { Notification } = require('../models');

const getUserNotifications = async (req, res) => {
  const notifs = await Notification.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
  res.json(notifs);
};

const markAsRead = async (req, res) => {
  await Notification.update({ read: true }, { where: { id: req.params.id, userId: req.user.id } });
  res.json({ message: 'Notification lue' });
};

const markAllAsRead = async (req, res) => {
  await Notification.update({ read: true }, { where: { userId: req.user.id, read: false } });
  res.json({ message: 'Toutes les notifications lues' });
};

module.exports = { getUserNotifications, markAsRead, markAllAsRead };