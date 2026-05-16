const isDev = import.meta.env.DEV;
const activeTimers = new Set();

export const logger = {
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    }
  },
  time: (label) => {
    if (isDev) {
      activeTimers.add(label);
      console.time(label);
    }
  },
  timeEnd: (label) => {
    if (isDev && activeTimers.has(label)) {
      activeTimers.delete(label);
      console.timeEnd(label);
    }
  },
};
