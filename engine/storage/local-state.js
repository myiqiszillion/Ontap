// Single-process local persistence. Serverless must use a configured durable backend.
const fs = require('fs');
const path = require('path');
class LocalState {
  constructor(filename) {
    if (process.env.VERCEL) throw new Error('BLOCKED: durable serverless storage is not configured');
    this.filename = filename;
  }
  read(fallback) {
    if (!fs.existsSync(this.filename)) return fallback;
    return JSON.parse(fs.readFileSync(this.filename, 'utf8'));
  }
  write(value) {
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    const temp = this.filename + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
    fs.renameSync(temp, this.filename);
  }
}
module.exports = LocalState;
