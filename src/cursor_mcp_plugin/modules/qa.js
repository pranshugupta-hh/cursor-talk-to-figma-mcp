// qa.js - Quality Assurance validation functions

import { calculateContrastRatio } from './utils.js';

// Cache for QA results to avoid redundant checks
const cachedQAResults = new Map();

// Store original node properties for restoration after highlighting
const originalNodeProps = new Map();

/**
 * Validate QA rules for a given node
 * @param {Object} node - The node to validate
 * @returns {Object} Object containing violations
 */
export function validateQARules(node) {
  // Check if we have cached results for this node
  if (cachedQAResults.has(node.id)) {
    return cachedQAResults.get(node.id);
  }
  
  // Initialize the violations object
  const violations = {
    colorContrastText: [],
    colorContrastUI: [],
    cornerRadius: []
  };
  
  // Check color contrast for text
  const textContrastViolations = validateColorContrastText(node);
  if (textContrastViolations.length > 0) {
    violations.colorContrastText = textContrastViolations;
  }
  
  // Check color contrast for UI elements
  const uiContrastViolations = validateColorContrastUI(node);
  if (uiContrastViolations.length > 0) {
    violations.colorContrastUI = uiContrastViolations;
  }
  
  // Check corner radius
  const cornerRadiusViolations = validateCornerRadius(node);
  if (cornerRadiusViolations.length > 0) {
    violations.cornerRadius = cornerRadiusViolations;
  }
  
  // Cache the results
  cachedQAResults.set(node.id, violations);
  
  return violations;
}

/**
 * Highlight a QA element with violations
 * @param {string} id - The ID of the node to highlight
 * @returns {Promise<void>}
 */
export async function highlightQAElement(id) {
  try {
    // Get the node from Figma
    const node = figma.getNodeById(id);
    if (!node) {
      console.error(`Node with ID ${id} not found.`);
      return;
    }
    
    // Store original node properties for restoration
    storeOriginalNodeProps(node);
    
    // Highlight based on node type
    if ('fills' in node) {
      // For nodes with fills (shapes, frames, etc.)
      await figma.setFillColorAsync(id, {
        r: 1,
        g: 0.5,
        b: 0,
        a: 0.5
      });
    } else if ('strokes' in node) {
      // For nodes with strokes
      await figma.setStrokeColorAsync(id, {
        r: 1,
        g: 0,
        b: 0,
        a: 1
      });
      await figma.setStrokeWeightAsync(id, 2);
    }
    
    // Reset after 2 seconds
    setTimeout(() => {
      restoreOriginalAppearance(id);
    }, 2000);
  } catch (error) {
    console.error('Error highlighting QA element:', error);
  }
}

/**
 * Store original node properties for later restoration
 * @param {Object} node - The node to store properties for
 * @private
 */
function storeOriginalNodeProps(node) {
  const originalProps = {};
  
  if ('fills' in node && node.fills.length > 0) {
    originalProps.fills = JSON.parse(JSON.stringify(node.fills));
  }
  
  if ('strokes' in node && node.strokes.length > 0) {
    originalProps.strokes = JSON.parse(JSON.stringify(node.strokes));
    originalProps.strokeWeight = node.strokeWeight;
  }
  
  originalNodeProps.set(node.id, originalProps);
}

/**
 * Restore original appearance of a highlighted node
 * @param {string} nodeId - The ID of the node to restore
 * @private
 */
async function restoreOriginalAppearance(nodeId) {
  try {
    if (!originalNodeProps.has(nodeId)) {
      console.warn(`No original properties found for node ${nodeId}`);
      return;
    }
    
    const node = figma.getNodeById(nodeId);
    if (!node) {
      console.error(`Node with ID ${nodeId} not found for restoration.`);
      return;
    }
    
    const originalProps = originalNodeProps.get(nodeId);
    
    // Restore fills if they exist
    if (originalProps.fills && 'fills' in node) {
      node.fills = originalProps.fills;
    }
    
    // Restore strokes if they exist
    if (originalProps.strokes && 'strokes' in node) {
      node.strokes = originalProps.strokes;
    }
    
    // Restore stroke weight if it exists
    if (originalProps.strokeWeight && 'strokeWeight' in node) {
      node.strokeWeight = originalProps.strokeWeight;
    }
    
    // Remove from the map to free memory
    originalNodeProps.delete(nodeId);
  } catch (error) {
    console.error('Error restoring original appearance:', error);
  }
}

/**
 * Validate color contrast for text elements
 * @param {Object} node - The node to validate
 * @returns {Array} Array of violations
 */
export function validateColorContrastText(node) {
  const violations = [];
  
  // Collect all text nodes
  const textNodes = [];
  
  // Helper function to collect text nodes
  function collectTextNodes(node) {
    if (node.type === 'TEXT') {
      textNodes.push(node);
    } else if ('children' in node) {
      node.children.forEach(child => collectTextNodes(child));
    }
  }
  
  collectTextNodes(node);
  
  // Check each text node for contrast ratio
  textNodes.forEach(textNode => {
    // Skip empty text nodes
    if (!textNode.characters || textNode.characters.trim() === '') {
      return;
    }
    
    // Get text color
    const fills = textNode.fills;
    if (!fills || fills.length === 0 || fills[0].type !== 'SOLID') {
      return;
    }
    
    const textColor = fills[0].color;
    
    // Get background color
    // This is simplified - in a real plugin you'd need to determine the actual background
    // by checking parent nodes, overlapping elements, etc.
    let bgColor;
    
    // Attempt to get background from parent
    let parent = textNode.parent;
    while (parent && (!parent.fills || parent.fills.length === 0 || parent.fills[0].type !== 'SOLID')) {
      parent = parent.parent;
    }
    
    if (parent && parent.fills && parent.fills.length > 0 && parent.fills[0].type === 'SOLID') {
      bgColor = parent.fills[0].color;
    } else {
      // Default to white if no background color found
      bgColor = { r: 1, g: 1, b: 1 };
    }
    
    // Calculate contrast ratio
    const contrastRatio = calculateContrastRatio(textColor, bgColor);
    
    // WCAG 2.0 Level AA requires a contrast ratio of at least 4.5:1 for normal text
    // and 3:1 for large text. Large text is defined as 18pt or 14pt bold.
    const isLargeText = 
      textNode.fontSize >= 18 || 
      (textNode.fontSize >= 14 && textNode.fontWeight >= 700);
    
    const requiredRatio = isLargeText ? 3 : 4.5;
    
    if (contrastRatio < requiredRatio) {
      violations.push({
        id: textNode.id,
        name: textNode.name,
        type: 'text',
        contrastRatio,
        requiredRatio,
        textColor,
        bgColor,
        message: `Text "${textNode.characters.substring(0, 20)}${textNode.characters.length > 20 ? '...' : ''}" has insufficient contrast (${contrastRatio.toFixed(2)}:1, required ${requiredRatio}:1)`
      });
    }
  });
  
  return violations;
}

/**
 * Validate color contrast for UI elements
 * @param {Object} node - The node to validate
 * @returns {Array} Array of violations
 */
export function validateColorContrastUI(node) {
  const violations = [];
  
  // Collect all UI elements (buttons, icons, etc.)
  const uiElements = [];
  
  // Helper function to collect UI elements
  function collectUIElements(node) {
    // Include elements likely to be UI components
    if (
      node.name.toLowerCase().includes('button') ||
      node.name.toLowerCase().includes('icon') ||
      node.name.toLowerCase().includes('control') ||
      node.type === 'INSTANCE' || 
      node.type === 'COMPONENT'
    ) {
      uiElements.push(node);
    }
    
    // Check children
    if ('children' in node) {
      node.children.forEach(child => collectUIElements(child));
    }
  }
  
  collectUIElements(node);
  
  // Check each UI element for contrast ratio
  uiElements.forEach(uiElement => {
    if (!('fills' in uiElement) || !uiElement.fills || uiElement.fills.length === 0) {
      return;
    }
    
    // Get UI element color
    const elementColor = uiElement.fills[0].color;
    
    // Get adjacent color (simplified)
    // In a real plugin, you would check for adjacent elements
    let adjacentColor;
    
    // Attempt to get background from parent
    let parent = uiElement.parent;
    while (parent && (!parent.fills || parent.fills.length === 0 || parent.fills[0].type !== 'SOLID')) {
      parent = parent.parent;
    }
    
    if (parent && parent.fills && parent.fills.length > 0 && parent.fills[0].type === 'SOLID') {
      adjacentColor = parent.fills[0].color;
    } else {
      // Default to white if no background color found
      adjacentColor = { r: 1, g: 1, b: 1 };
    }
    
    // Calculate contrast ratio
    const contrastRatio = calculateContrastRatio(elementColor, adjacentColor);
    
    // WCAG 2.0 Level AA requires a contrast ratio of at least 3:1 for UI elements
    const requiredRatio = 3;
    
    if (contrastRatio < requiredRatio) {
      violations.push({
        id: uiElement.id,
        name: uiElement.name,
        type: 'ui',
        contrastRatio,
        requiredRatio,
        elementColor,
        adjacentColor,
        message: `UI element "${uiElement.name}" has insufficient contrast (${contrastRatio.toFixed(2)}:1, required ${requiredRatio}:1)`
      });
    }
  });
  
  return violations;
}

/**
 * Validate corner radius for cards and images
 * @param {Object} node - The node to validate
 * @returns {Array} Array of violations
 */
export function validateCornerRadius(node) {
  const violations = [];
  
  // Collect all cards and image containers
  const elements = [];
  
  // Helper function to collect elements
  function collectElements(node) {
    // Include elements likely to be cards or images
    if (
      node.name.toLowerCase().includes('card') ||
      node.name.toLowerCase().includes('image') ||
      node.name.toLowerCase().includes('photo') ||
      node.type === 'RECTANGLE' ||
      (node.type === 'FRAME' && node.cornerRadius !== undefined)
    ) {
      elements.push(node);
    }
    
    // Check children
    if ('children' in node) {
      node.children.forEach(child => collectElements(child));
    }
  }
  
  collectElements(node);
  
  // Check each element for correct corner radius
  elements.forEach(element => {
    // Skip elements without corner radius property
    if (element.cornerRadius === undefined) {
      return;
    }
    
    // For this example, assume the design system requires 6px corner radius
    const requiredRadius = 6;
    
    if (element.cornerRadius !== requiredRadius) {
      violations.push({
        id: element.id,
        name: element.name,
        type: 'cornerRadius',
        currentRadius: element.cornerRadius,
        requiredRadius,
        message: `Element "${element.name}" has incorrect corner radius (${element.cornerRadius}px, should be ${requiredRadius}px)`
      });
    }
  });
  
  return violations;
} 