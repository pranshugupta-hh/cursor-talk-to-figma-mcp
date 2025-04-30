// styling.js - Functions for working with Figma styling and appearance properties

/**
 * Set the fill color of a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to modify
 * @param {number} params.r - Red component (0-1)
 * @param {number} params.g - Green component (0-1)
 * @param {number} params.b - Blue component (0-1)
 * @param {number} [params.a=1] - Alpha component (0-1)
 * @returns {Promise<Object>} Result of the operation
 */
export async function setFillColor(params) {
  try {
    const { nodeId, r, g, b, a = 1 } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (r === undefined || g === undefined || b === undefined) {
      return {
        success: false,
        error: 'RGB color values are required'
      };
    }
    
    // Get the node
    const node = figma.getNodeById(nodeId);
    
    if (!node) {
      return {
        success: false,
        error: `Node with ID ${nodeId} not found`
      };
    }
    
    // Check if node can have fills
    if (!('fills' in node)) {
      return {
        success: false,
        error: `Node with ID ${nodeId} cannot have fills`
      };
    }
    
    // Set fill color
    node.fills = [{
      type: 'SOLID',
      color: { r, g, b },
      opacity: a
    }];
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        fills: node.fills
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Set the stroke color of a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to modify
 * @param {number} params.r - Red component (0-1)
 * @param {number} params.g - Green component (0-1)
 * @param {number} params.b - Blue component (0-1)
 * @param {number} [params.a=1] - Alpha component (0-1)
 * @param {number} [params.weight] - Stroke weight
 * @returns {Promise<Object>} Result of the operation
 */
export async function setStrokeColor(params) {
  try {
    const { nodeId, r, g, b, a = 1, weight } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (r === undefined || g === undefined || b === undefined) {
      return {
        success: false,
        error: 'RGB color values are required'
      };
    }
    
    // Get the node
    const node = figma.getNodeById(nodeId);
    
    if (!node) {
      return {
        success: false,
        error: `Node with ID ${nodeId} not found`
      };
    }
    
    // Check if node can have strokes
    if (!('strokes' in node)) {
      return {
        success: false,
        error: `Node with ID ${nodeId} cannot have strokes`
      };
    }
    
    // Set stroke color
    node.strokes = [{
      type: 'SOLID',
      color: { r, g, b },
      opacity: a
    }];
    
    // Set stroke weight if provided
    if (weight !== undefined) {
      if (!('strokeWeight' in node)) {
        return {
          success: false,
          error: `Node with ID ${nodeId} cannot have stroke weight`
        };
      }
      
      node.strokeWeight = weight;
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        strokes: node.strokes,
        strokeWeight: 'strokeWeight' in node ? node.strokeWeight : undefined
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Set the corner radius of a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to modify
 * @param {number} params.radius - Corner radius value
 * @param {boolean[]} [params.corners] - Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]
 * @returns {Promise<Object>} Result of the operation
 */
export async function setCornerRadius(params) {
  try {
    const { nodeId, radius, corners } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (radius === undefined) {
      return {
        success: false,
        error: 'Radius value is required'
      };
    }
    
    // Get the node
    const node = figma.getNodeById(nodeId);
    
    if (!node) {
      return {
        success: false,
        error: `Node with ID ${nodeId} not found`
      };
    }
    
    // Check if node can have corner radius
    if (!('cornerRadius' in node)) {
      return {
        success: false,
        error: `Node with ID ${nodeId} cannot have corner radius`
      };
    }
    
    // If corners array is provided
    if (corners && Array.isArray(corners) && corners.length === 4) {
      // Check if node supports individual corner radius
      if (!('topLeftRadius' in node)) {
        return {
          success: false,
          error: `Node with ID ${nodeId} does not support individual corner radius`
        };
      }
      
      // Set individual corner radii
      if (corners[0]) node.topLeftRadius = radius;
      if (corners[1]) node.topRightRadius = radius;
      if (corners[2]) node.bottomRightRadius = radius;
      if (corners[3]) node.bottomLeftRadius = radius;
    } else {
      // Set uniform corner radius
      node.cornerRadius = radius;
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        cornerRadius: 'cornerRadius' in node ? node.cornerRadius : undefined,
        topLeftRadius: 'topLeftRadius' in node ? node.topLeftRadius : undefined,
        topRightRadius: 'topRightRadius' in node ? node.topRightRadius : undefined,
        bottomRightRadius: 'bottomRightRadius' in node ? node.bottomRightRadius : undefined,
        bottomLeftRadius: 'bottomLeftRadius' in node ? node.bottomLeftRadius : undefined
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all styles from the current document
 * @returns {Promise<Object>} All style objects in the document
 */
export async function getStyles() {
  try {
    // Get all styles from the document
    const styles = {
      color: figma.getLocalPaintStyles(),
      text: figma.getLocalTextStyles(),
      effect: figma.getLocalEffectStyles(),
      grid: figma.getLocalGridStyles()
    };
    
    // Process styles for return
    const processedStyles = {
      color: styles.color.map(style => ({
        id: style.id,
        key: style.key,
        name: style.name,
        description: style.description,
        paints: style.paints
      })),
      text: styles.text.map(style => ({
        id: style.id,
        key: style.key,
        name: style.name,
        description: style.description,
        fontName: style.fontName,
        fontSize: style.fontSize,
        letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeight,
        paragraphIndent: style.paragraphIndent,
        paragraphSpacing: style.paragraphSpacing,
        textCase: style.textCase,
        textDecoration: style.textDecoration
      })),
      effect: styles.effect.map(style => ({
        id: style.id,
        key: style.key,
        name: style.name,
        description: style.description,
        effects: style.effects
      })),
      grid: styles.grid.map(style => ({
        id: style.id,
        key: style.key,
        name: style.name,
        description: style.description,
        layoutGrids: style.layoutGrids
      }))
    };
    
    // Return styles
    return {
      success: true,
      styles: processedStyles,
      counts: {
        color: processedStyles.color.length,
        text: processedStyles.text.length,
        effect: processedStyles.effect.length,
        grid: processedStyles.grid.length,
        total: processedStyles.color.length + 
               processedStyles.text.length + 
               processedStyles.effect.length + 
               processedStyles.grid.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 