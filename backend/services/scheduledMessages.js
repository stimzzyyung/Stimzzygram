const ScheduledMessage = require('../models/ScheduledMessage');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendDirect } = require('../controllers/messageController');
const { emitTo } = require('./socket');

let running = false;
let timer = null;

async function processDueMessages() {
  if (running) return;
  running = true;
  try {
    while (true) {
      const scheduled = await ScheduledMessage.findOneAndUpdate(
        {
          scheduledAt: { $lte: new Date() },
          $or: [
            { status: 'pending' },
            { status: 'processing', updatedAt: { $lte: new Date(Date.now() - 60 * 1000) } },
          ],
        },
        { $set: { status: 'processing' } },
        { new: true, sort: { scheduledAt: 1, createdAt: 1 } },
      );
      if (!scheduled) break;

      if (!scheduled.sender || !scheduled.recipient) {
        scheduled.status = 'failed';
        scheduled.error = 'Scheduled message is missing sender or recipient data.';
        await scheduled.save();
        continue;
      }

      try {
        const sender = await User.findById(scheduled.sender);
        if (!sender) throw new Error('The sender account no longer exists.');
        const message = await sendDirect({
          from: sender,
          to: scheduled.recipient,
          text: scheduled.text,
          replyTo: scheduled.replyTo,
          scheduledMessageId: scheduled._id,
        });
        scheduled.status = 'sent';
        scheduled.message = message._id;
        await scheduled.save();
      } catch (error) {
        const delivered = await Message.findOne({ scheduledMessage: scheduled._id });
        if (delivered) {
          scheduled.status = 'sent';
          scheduled.message = delivered._id;
          await scheduled.save();
          continue;
        }
        scheduled.status = 'failed';
        scheduled.error = error.message;
        await scheduled.save();
        emitTo(scheduled.sender, 'message:scheduled:failed', {
          scheduledMessageId: scheduled._id,
          message: error.message,
        });
        console.error(`Scheduled message ${scheduled._id} failed:`, error.message);
      }
    }
  } finally {
    running = false;
  }
}

exports.start = () => {
  if (timer) return;

  const tick = () => {
    processDueMessages().catch((error) => console.error('Scheduled message worker failed:', error));
  };

  tick();
  timer = setInterval(tick, 10 * 1000);
  timer.unref();
};

exports.stop = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
