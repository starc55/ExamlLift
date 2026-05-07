export function readStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function seedStorage(key, value) {
  const currentValue = localStorage.getItem(key);

  if (!currentValue) {
    writeStorage(key, value);
  }
}
