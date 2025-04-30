// utils.js - General utility functions

// Export utility functions
export {
  calculateContrastRatio,
  debounce,
  getUniqueId,
  isValidColor,
  hexToRgb,
  rgbToHex,
  clone,
  flattenObject,
  compareObjects,
  nodeToJSON,
  sanitizeNodeForDisplay,
  getScrollContainer,
  formatByteSize,
  wait,
  deepClone,
  generateUniqueId,
  summarizeFills,
  summarizeStrokes,
  delay,
  calculateLuminance,
  isEmpty,
  formatDate,
  isEqual,
  getBackgroundColor
};

// Calculate the contrast ratio between two colors
function calculateContrastRatio(color1, color2) {
  // Convert RGB to luminance value
  function getLuminance(color) {
    const rgb = [color.r, color.g, color.b].map(value => {
      value = value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      return value;
    });
    
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  
  // Get luminance values
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  // Calculate contrast ratio
  const lighterLum = Math.max(luminance1, luminance2);
  const darkerLum = Math.min(luminance1, luminance2);
  
  return (lighterLum + 0.05) / (darkerLum + 0.05);
}

// Debounce function to limit the rate at which a function is executed
function debounce(func, wait, immediate) {
  let timeout;
  
  return function(...args) {
    const context = this;
    
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}

// Generate a unique ID
function getUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Check if a color value is valid
function isValidColor(color) {
  if (!color) return false;
  
  // Check if it's a hex color
  if (typeof color === 'string') {
    const hexRegex = /^#([A-Fa-f0-9]{3}$|[A-Fa-f0-9]{6}$|[A-Fa-f0-9]{8}$)/;
    if (hexRegex.test(color)) return true;
    
    // Check for rgb/rgba format
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([01]|0?\.\d+)\s*\)$/;
    return rgbRegex.test(color) || rgbaRegex.test(color);
  }
  
  // Check if it's an RGB/RGBA object
  if (typeof color === 'object') {
    return (
      typeof color.r === 'number' && color.r >= 0 && color.r <= 1 &&
      typeof color.g === 'number' && color.g >= 0 && color.g <= 1 &&
      typeof color.b === 'number' && color.b >= 0 && color.b <= 1 &&
      (color.a === undefined || (typeof color.a === 'number' && color.a >= 0 && color.a <= 1))
    );
  }
  
  return false;
}

// Convert hex color to RGB
function hexToRgb(hex) {
  // Remove the # if present
  hex = hex.replace(/^#/, '');
  
  // Parse as RGB or RGBA
  let r, g, b, a = 1;
  
  if (hex.length === 3) {
    // Short form: #RGB
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255;
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255;
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255;
  } else if (hex.length === 6) {
    // Long form: #RRGGBB
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else if (hex.length === 8) {
    // With alpha: #RRGGBBAA
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
    a = parseInt(hex.substring(6, 8), 16) / 255;
  } else {
    throw new Error('Invalid hex color format');
  }
  
  return { r, g, b, a };
}

// Convert RGB to hex color
function rgbToHex(rgb) {
  // Ensure RGB values are between 0 and 1
  const r = Math.max(0, Math.min(1, rgb.r));
  const g = Math.max(0, Math.min(1, rgb.g));
  const b = Math.max(0, Math.min(1, rgb.b));
  
  // Convert to hex
  const rHex = Math.round(r * 255).toString(16).padStart(2, '0');
  const gHex = Math.round(g * 255).toString(16).padStart(2, '0');
  const bHex = Math.round(b * 255).toString(16).padStart(2, '0');
  
  // Include alpha if specified
  let aHex = '';
  if (rgb.a !== undefined && rgb.a < 1) {
    aHex = Math.round(rgb.a * 255).toString(16).padStart(2, '0');
  }
  
  return `#${rHex}${gHex}${bHex}${aHex}`;
}

// Deep clone an object
function clone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => clone(item));
  }
  
  // Handle objects
  const clonedObj = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = clone(obj[key]);
    }
  }
  
  return clonedObj;
}

// Flatten a nested object (useful for logging)
function flattenObject(obj, prefix = '') {
  let result = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively flatten nested objects
        Object.assign(result, flattenObject(obj[key], propName));
      } else {
        // Add leaf property
        result[propName] = obj[key];
      }
    }
  }
  
  return result;
}

// Compare two objects for equality
function compareObjects(obj1, obj2) {
  // Check if both are the same object reference
  if (obj1 === obj2) return true;
  
  // Check if either is null or not an object
  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  // Check if they're arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    
    for (let i = 0; i < obj1.length; i++) {
      if (!compareObjects(obj1[i], obj2[i])) return false;
    }
    
    return true;
  }
  
  // Check if one is an array and the other is not
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  // Compare object properties
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!obj2.hasOwnProperty(key) || !compareObjects(obj1[key], obj2[key])) {
      return false;
    }
  }
  
  return true;
}

// Convert a node to a JSON-safe format
function nodeToJSON(node, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    return "[Max depth reached]";
  }
  
  if (!node) return null;
  
  const result = {};
  
  // Add basic properties
  result.id = node.id;
  result.name = node.name;
  result.type = node.type;
  
  // Add position and size if available
  if ('x' in node) result.x = node.x;
  if ('y' in node) result.y = node.y;
  if ('width' in node) result.width = node.width;
  if ('height' in node) result.height = node.height;
  
  // Add specific properties based on node type
  if (node.type === 'TEXT') {
    result.characters = node.characters;
    result.fontSize = node.fontSize;
    result.fontName = node.fontName;
  }
  
  // Add children recursively
  if ('children' in node && Array.isArray(node.children)) {
    if (node.children.length <= 20) {
      result.children = node.children.map(child => 
        nodeToJSON(child, maxDepth, currentDepth + 1)
      );
    } else {
      result.children = `[${node.children.length} children]`;
    }
  }
  
  return result;
}

// Sanitize node data for display
function sanitizeNodeForDisplay(node) {
  const safeProps = ['id', 'name', 'type', 'x', 'y', 'width', 'height'];
  const result = {};
  
  safeProps.forEach(prop => {
    if (prop in node) {
      result[prop] = node[prop];
    }
  });
  
  // Handle text nodes
  if (node.type === 'TEXT' && 'characters' in node) {
    result.characters = node.characters.length > 100 
      ? node.characters.substring(0, 100) + '...' 
      : node.characters;
  }
  
  // Include children count
  if ('children' in node && Array.isArray(node.children)) {
    result.childrenCount = node.children.length;
  }
  
  return result;
}

// Get the nearest scrollable container
function getScrollContainer(element) {
  if (!element) return null;
  
  // Check if the element itself is scrollable
  if (
    element.scrollHeight > element.clientHeight ||
    element.scrollWidth > element.clientWidth
  ) {
    const computedStyle = window.getComputedStyle(element);
    const overflow = computedStyle.overflow;
    const overflowY = computedStyle.overflowY;
    const overflowX = computedStyle.overflowX;
    
    if (
      overflow === 'auto' || overflow === 'scroll' ||
      overflowY === 'auto' || overflowY === 'scroll' ||
      overflowX === 'auto' || overflowX === 'scroll'
    ) {
      return element;
    }
  }
  
  // Check parent
  return element.parentElement ? getScrollContainer(element.parentElement) : null;
}

// Format byte size to human-readable format
function formatByteSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Promise-based wait function
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  
  return clone;
}

/**
 * Generates a unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export function generateUniqueId(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize a node for display (remove circular references)
 * @param {Object} node - Figma node to sanitize
 * @returns {Object} Sanitized node
 */
export function sanitizeNodeForDisplay(node) {
  if (!node) return null;
  
  // Basic node info to include
  const sanitized = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible
  };
  
  // Add specific properties based on node type
  switch (node.type) {
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'POLYGON':
    case 'STAR':
    case 'VECTOR':
    case 'LINE':
      sanitized.x = node.x;
      sanitized.y = node.y;
      sanitized.width = node.width;
      sanitized.height = node.height;
      sanitized.fills = summarizeFills(node.fills);
      sanitized.strokes = summarizeStrokes(node.strokes);
      break;
      
    case 'FRAME':
    case 'GROUP':
    case 'COMPONENT':
    case 'COMPONENT_SET':
    case 'INSTANCE':
      sanitized.x = node.x;
      sanitized.y = node.y;
      sanitized.width = node.width;
      sanitized.height = node.height;
      sanitized.childCount = node.children ? node.children.length : 0;
      break;
      
    case 'TEXT':
      sanitized.x = node.x;
      sanitized.y = node.y;
      sanitized.width = node.width;
      sanitized.height = node.height;
      sanitized.characters = node.characters;
      sanitized.fontSize = node.fontSize;
      sanitized.fills = summarizeFills(node.fills);
      break;
      
    default:
      break;
  }
  
  return sanitized;
}

/**
 * Summarize fills array for display
 * @param {Array} fills - Array of fill objects
 * @returns {Array} Simplified fill objects
 */
function summarizeFills(fills) {
  if (!fills || !Array.isArray(fills)) return [];
  
  return fills.map(fill => {
    if (fill.type === 'SOLID') {
      return {
        type: 'SOLID',
        color: {
          r: fill.color.r,
          g: fill.color.g,
          b: fill.color.b,
          a: fill.opacity || 1
        }
      };
    }
    return { type: fill.type };
  });
}

/**
 * Summarize strokes array for display
 * @param {Array} strokes - Array of stroke objects
 * @returns {Array} Simplified stroke objects
 */
function summarizeStrokes(strokes) {
  if (!strokes || !Array.isArray(strokes)) return [];
  
  return strokes.map(stroke => {
    if (stroke.type === 'SOLID') {
      return {
        type: 'SOLID',
        color: {
          r: stroke.color.r,
          g: stroke.color.g,
          b: stroke.color.b,
          a: stroke.opacity || 1
        }
      };
    }
    return { type: stroke.type };
  });
}

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate luminance of a color
 * @param {Object} color - RGB color object {r, g, b}
 * @returns {number} Luminance value (0-1)
 */
export function calculateLuminance(color) {
  const r = color.r <= 0.03928 ? color.r / 12.92 : Math.pow((color.r + 0.055) / 1.055, 2.4);
  const g = color.g <= 0.03928 ? color.g / 12.92 : Math.pow((color.g + 0.055) / 1.055, 2.4);
  const b = color.b <= 0.03928 ? color.b / 12.92 : Math.pow((color.b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Check if value is empty (null, undefined, empty string/array/object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Format a date to a readable string
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format string (simple)
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date);
  
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Check if two objects are equal
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} True if objects are equal
 */
export function isEqual(obj1, obj2) {
  // Handle primitives
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }
  
  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    
    for (let i = 0; i < obj1.length; i++) {
      if (!isEqual(obj1[i], obj2[i])) return false;
    }
    
    return true;
  }
  
  // Handle objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Get background color of a node
 * @param {Object} node - Figma node
 * @returns {Object|null} RGB color object or null
 */
export function getBackgroundColor(node) {
  if (!node) return null;
  
  // Check if node has fills
  if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    // Find the first visible solid fill
    const solidFill = node.fills.find(fill => fill.type === 'SOLID' && fill.visible !== false);
    
    if (solidFill) {
      return {
        r: solidFill.color.r,
        g: solidFill.color.g,
        b: solidFill.color.b,
        a: solidFill.opacity !== undefined ? solidFill.opacity : 1
      };
    }
  }
  
  // If this node doesn't have a background color, try its parent
  if (node.parent) {
    return getBackgroundColor(node.parent);
  }
  
  // Default to white if no background color found
  return { r: 1, g: 1, b: 1, a: 1 };
} 