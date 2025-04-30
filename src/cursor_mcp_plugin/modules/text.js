// text.js - Functions for creating and manipulating text nodes in Figma

/**
 * Create a new text element
 * @param {Object} params - Parameters
 * @param {number} params.x - X position
 * @param {number} params.y - Y position
 * @param {string} params.text - Text content
 * @param {string} [params.name] - Semantic layer name for the text node
 * @param {number} [params.fontSize] - Font size (default: 14)
 * @param {number} [params.fontWeight] - Font weight (e.g., 400 for Regular, 700 for Bold)
 * @param {Object} [params.fontColor] - Font color in RGBA format
 * @param {number} params.fontColor.r - Red component (0-1)
 * @param {number} params.fontColor.g - Green component (0-1)
 * @param {number} params.fontColor.b - Blue component (0-1)
 * @param {number} [params.fontColor.a] - Alpha component (0-1)
 * @param {string} [params.parentId] - Optional parent node ID to append the text to
 * @returns {Promise<Object>} Result of the operation
 */
export async function createText(params) {
  try {
    const { x, y, text, name, fontSize, fontWeight, fontColor, parentId } = params;
    
    // Validate parameters
    if (x === undefined || y === undefined) {
      return {
        success: false,
        error: 'X and Y positions are required'
      };
    }
    
    if (!text) {
      return {
        success: false,
        error: 'Text content is required'
      };
    }
    
    // Create text node
    const textNode = figma.createText();
    
    // Set position
    textNode.x = x;
    textNode.y = y;
    
    // Set text content
    await figma.loadFontAsync(textNode.fontName);
    textNode.characters = text;
    
    // Set optional name
    if (name) {
      textNode.name = name;
    }
    
    // Set optional font size
    if (fontSize) {
      textNode.fontSize = fontSize;
    }
    
    // Set optional font weight
    if (fontWeight) {
      await figma.loadFontAsync({
        family: textNode.fontName.family,
        style: getFontStyleFromWeight(fontWeight)
      });
      
      textNode.fontName = {
        family: textNode.fontName.family,
        style: getFontStyleFromWeight(fontWeight)
      };
    }
    
    // Set optional font color
    if (fontColor) {
      const { r, g, b, a = 1 } = fontColor;
      
      // Validate color components
      if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1 || a < 0 || a > 1) {
        return {
          success: false,
          error: 'Color components must be between 0 and 1'
        };
      }
      
      textNode.fills = [{
        type: 'SOLID',
        color: { r, g, b },
        opacity: a
      }];
    }
    
    // Add to parent if specified
    if (parentId) {
      const parentNode = figma.getNodeById(parentId);
      
      if (!parentNode) {
        return {
          success: false,
          error: `Parent node with ID ${parentId} not found`
        };
      }
      
      if (!('appendChild' in parentNode)) {
        return {
          success: false,
          error: `Parent node with ID ${parentId} cannot have children`
        };
      }
      
      parentNode.appendChild(textNode);
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: textNode.id,
        type: textNode.type,
        name: textNode.name,
        characters: textNode.characters,
        x: textNode.x,
        y: textNode.y,
        width: textNode.width,
        height: textNode.height
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
 * Set the text content of an existing text node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the text node to modify
 * @param {string} params.text - New text content
 * @returns {Promise<Object>} Result of the operation
 */
export async function setTextContent(params) {
  try {
    const { nodeId, text } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (text === undefined) {
      return {
        success: false,
        error: 'Text content is required'
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
    
    // Check if node is a text node
    if (node.type !== 'TEXT') {
      return {
        success: false,
        error: `Node with ID ${nodeId} is not a text node`
      };
    }
    
    // Load font and set text
    await figma.loadFontAsync(node.fontName);
    node.characters = text;
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        characters: node.characters,
        width: node.width,
        height: node.height
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
 * Set multiple text contents parallelly in a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node containing the text nodes to replace
 * @param {Array} params.text - Array of text node IDs and their replacement texts
 * @param {string} params.text[].nodeId - The ID of the text node
 * @param {string} params.text[].text - The replacement text
 * @returns {Promise<Object>} Result of the operation
 */
export async function setMultipleTextContents(params) {
  try {
    const { nodeId, text } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (!text || !Array.isArray(text) || text.length === 0) {
      return {
        success: false,
        error: 'Text array is required and must not be empty'
      };
    }
    
    // Get the container node
    const containerNode = figma.getNodeById(nodeId);
    
    if (!containerNode) {
      return {
        success: false,
        error: `Container node with ID ${nodeId} not found`
      };
    }
    
    // Results tracking
    const results = {
      success: true,
      updatedNodes: [],
      failedNodes: []
    };
    
    // Process each text update
    for (const item of text) {
      if (!item.nodeId || item.text === undefined) {
        results.failedNodes.push({
          error: 'Text item must have nodeId and text properties'
        });
        continue;
      }
      
      try {
        const result = await setTextContent({
          nodeId: item.nodeId,
          text: item.text
        });
        
        if (result.success) {
          results.updatedNodes.push(result.node);
        } else {
          results.failedNodes.push({
            id: item.nodeId,
            error: result.error
          });
        }
      } catch (err) {
        results.failedNodes.push({
          id: item.nodeId,
          error: err.message
        });
      }
    }
    
    // Update overall success status
    if (results.failedNodes.length > 0 && results.updatedNodes.length === 0) {
      results.success = false;
    }
    
    return results;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Scan all text nodes in a selected node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - ID of the node to scan
 * @returns {Promise<Object>} Array of text nodes found
 */
export async function scanTextNodes(params) {
  try {
    const { nodeId } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
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
    
    // Check if the node can contain children
    if (!('findAll' in node)) {
      return {
        success: false,
        error: `Node with ID ${nodeId} cannot be scanned for text nodes`
      };
    }
    
    // Find all text nodes
    const textNodes = node.findAll(n => n.type === 'TEXT');
    
    // Map text nodes to a simplified format
    const mappedTextNodes = textNodes.map(textNode => ({
      id: textNode.id,
      name: textNode.name,
      characters: textNode.characters,
      x: textNode.x,
      y: textNode.y,
      width: textNode.width,
      height: textNode.height,
      fontSize: textNode.fontSize,
      fontName: textNode.fontName,
      fills: textNode.fills
    }));
    
    // Return result
    return {
      success: true,
      count: mappedTextNodes.length,
      textNodes: mappedTextNodes
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper function to convert weight to font style
 * @param {number} weight - Font weight
 * @returns {string} Font style
 */
function getFontStyleFromWeight(weight) {
  if (weight <= 300) return 'Light';
  if (weight <= 400) return 'Regular';
  if (weight <= 500) return 'Medium';
  if (weight <= 600) return 'Semibold';
  if (weight <= 700) return 'Bold';
  if (weight <= 800) return 'Heavy';
  return 'Black';
} 