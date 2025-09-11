const storage = {
  setItem: (key: string, value: string | object) => {
    if (typeof value === 'string') {
      localStorage.setItem(key, value)
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
    
  },
  getItem: (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "''");
    } catch (error) {
      return localStorage.getItem(key);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};

export default storage;