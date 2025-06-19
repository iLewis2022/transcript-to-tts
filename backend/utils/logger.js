const isDev = process.env.NODE_ENV === 'development';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const logger = {
  info: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.blue}[INFO]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  success: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  warn: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  error: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.error(`${colors.red}[ERROR]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  debug: (message, ...args) => {
    if (isDev) {
      const timestamp = new Date().toISOString();
      console.log(`${colors.magenta}[DEBUG]${colors.reset} ${timestamp}: ${message}`, ...args);
    }
  },
  
  processing: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.cyan}[PROCESSING]${colors.reset} ${timestamp}: ${message}`, ...args);
  }
};

module.exports = logger; 