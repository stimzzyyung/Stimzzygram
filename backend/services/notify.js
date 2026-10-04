const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitTo } = require('./socket');

const prefKey = { like: 'likes', comment: 'comments', reply: 'comments', follow: 'followers', follow_request: 'followers', message: 'messages' };

/** Creates a notification, pushes it over Socket.IO and (if possible) via Expo push. Never throws. */
exports.notify = async ({ recipient, sender, type, post, text }) => {
  try {
    if (String(recipient) === String(sender)) return;
    const user = await User.findById(recipient).select('pushToken notificationPrefs blocked');
    if (!user || user.blocked.includes(sender)) return;
    const key = prefKey[type];
    if (key && user.notificationPrefs?.[key] === false) return;

    const n = await Notification.create({ recipient, sender, type, post, text });
    const populated = await n.populate('sender', 'username avatar isVerified');
    emitTo(recipient, 'notification:new', populated);

    if (user.pushToken) {
      const body = { like: 'liked your post', comment: 'commented on your post', reply: 'replied to your comment',
        follow: 'started following you', follow_request: 'requested to follow you', message: 'sent you a message',
        mention: 'mentioned you', story_reaction: 'reacted to your story' }[type];
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: user.pushToken, title: 'StimzzyVibe', body: `@${populated.sender?.username || 'someone'} ${body}` }),
      }).catch(() => {});
    }
  } catch (e) { console.error('notify error', e.message); }
};
