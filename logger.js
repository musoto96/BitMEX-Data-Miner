const { createLogger, format, transports } = require('winston');
require('dotenv').config();

const consolelog = process.env.CONSOLELOG;
const consolelvl = process.env.CONSOLELVL;
const locale = process.env.LOCALE;

//
// The default logging levels
//
const defaultLevels = {
  error:   0,
  warn:    1,
  info:    2,
  http:    3,
  verbose: 4,
  debug:   5,
  silly:   6
};

// 
// Custom levels
// 
const customLevels = {
  error:   0,
  warn:    1,
  info:    2,
  verbose: 3,
  debug:   4,
  http:    5,
  max:     6
};

const tzFormat = () => {
    return new Date().toLocaleString(locale, { timeZone: process.env.TZ });
}

const logger = createLogger({
  levels: customLevels,
  format: format.combine(
    format.timestamp({ format: tzFormat }), 
    format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.title.toUpperCase()} - ${JSON.stringify(info.message)}`)
  ), 
  transports: [
    new transports.File({ filename: './logs/error.log',    level: 'error' }),
    new transports.File({ filename: './logs/warn.log',     level: 'warn' }),
    new transports.File({ filename: './logs/info.log',     level: 'info' }),
    new transports.File({ filename: './logs/http.log',     level: 'http' }),
    new transports.File({ filename: './logs/verbose.log',  level: 'verbose' }),
    new transports.File({ filename: './logs/debug.log',    level: 'debug' }),
    new transports.File({ filename: './logs/max.log',      level: 'max' }),
  ],
});

// 
// Use CONSOLELOG env variable to log to console or only to files.
// 
if (consolelvl) {
  logger.add(
    new transports.Console(
      { 
        format: format.combine(
          format.timestamp({ format: tzFormat }), 
          format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.title.toUpperCase()} - ${JSON.stringify(info.message)}`)
        ), level: consolelvl 
      }
    )
  );
}

module.exports = { logger };

// Test logging
// Running node logger.js
if (require.main === module) {
  logger.log({ level: 'error',   title: 'Err log test',  message: 'Error' });
  logger.log({ level: 'warn',    title: 'Wrn log test',  message: 'Warning' });
  logger.log({ level: 'info',    title: 'Wrn log test',  message: 'Info' });
  logger.log({ level: 'verbose', title: 'Vrb log test',  message: 'Verbose' });
  logger.log({ level: 'debug',   title: 'Dbg log test',  message: 'Debug' });
  logger.log({ level: 'http',    title: 'htt log test',  message: 'http' });
  logger.log({ level: 'max',     title: 'max log test',  message: 'max' });
}
