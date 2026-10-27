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
    const temp = this.filename + '.' + process.pid + '.' + Date.now() + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
    try {
      fs.renameSync(temp, this.filename);
    } catch (e) {
      if (e.code === 'EPERM' || e.code === 'EBUSY') {
        fs.copyFileSync(temp, this.filename);
        try { fs.unlinkSync(temp); } catch (_) {}
      } else {
        throw e;
      }
    }
  }
}
module.exports = LocalState;
