// simple counters collection for sequential numbers
const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

async function nextSequence(name) {
  const result = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

module.exports = { nextSequence };
