// nodes.js - Basic Figma node operations

import { filterFigmaNode, customBase64Encode, deepClone, sanitizeNodeForDisplay } from './utils.js';

// Export all functions
export {
  getDocumentInfo, getSelection, getNodeInfo, getNodesInfo, readMyDesign,
  createRectangle, createFrame, createText, setFillColor, setStrokeColor,
  moveNode, resizeNode, deleteNode, deleteMultipleNodes, 
  getStyles, getLocalComponents, createComponentInstance,
  exportNodeAsImage, setCornerRadius, setTextContent, cloneNode
};

// Get document info
async function getDocumentInfo() {
  await figma.currentPage.loadAsync();
  const page = figma.currentPage;
  return {
    name: page.name,
    id: page.id,
    type: page.type,
    children: page.children.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
    currentPage: {
      id: page.id,
      name: page.name,
      childCount: page.children.length,
    },
    pages: [
      {
        id: page.id,
        name: page.name,
        childCount: page.children.length,
      },
    ],
  };
}

// Get current selection
async function getSelection() {
  return {
    selectionCount: figma.currentPage.selection.length,
    selection: figma.currentPage.selection.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
    })),
  };
}

// Get node info by ID
async function getNodeInfo(nodeId) {
  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  const response = await node.exportAsync({
    format: "JSON_REST_V1",
  });

  return filterFigmaNode(response.document);
}

// Get multiple nodes info by IDs
async function getNodesInfo(nodeIds) {
  try {
    // Load all nodes in parallel
    const nodes = await Promise.all(
      nodeIds.map((id) => figma.getNodeByIdAsync(id))
    );

    // Filter out any null values (nodes that weren't found)
    const validNodes = nodes.filter((node) => node !== null);

    // Export all valid nodes in parallel
    const responses = await Promise.all(
      validNodes.map(async (node) => {
        const response = await node.exportAsync({
          format: "JSON_REST_V1",
        });
        return {
          nodeId: node.id,
          document: filterFigmaNode(response.document),
        };
      })
    );

    return responses;
  } catch (error) {
    throw new Error(`Error getting nodes info: ${error.message}`);
  }
}

// Get info about selected nodes
async function readMyDesign() {
  try {
    // Load all selected nodes in parallel
    const nodes = await Promise.all(
      figma.currentPage.selection.map((node) => figma.getNodeByIdAsync(node.id))
    );

    // Filter out any null values (nodes that weren't found)
    const validNodes = nodes.filter((node) => node !== null);

    // Export all valid nodes in parallel
    const responses = await Promise.all(
      validNodes.map(async (node) => {
        const response = await node.exportAsync({
          format: "JSON_REST_V1",
        });
        return {
          nodeId: node.id,
          document: filterFigmaNode(response.document),
        };
      })
    );

    return responses;
  } catch (error) {
    throw new Error(`Error getting nodes info: ${error.message}`);
  }
}

/**
 * Create a rectangle in Figma
 * @param {Object} params - Rectangle parameters
 * @param {number} params.x - X position
 * @param {number} params.y - Y position
 * @param {number} params.width - Width
 * @param {number} params.height - Height
 * @param {string} params.name - Optional name
 * @param {string} params.parentId - Optional parent node ID
 * @returns {Promise<Object>} Created node
 */
export async function createRectangle(params) {
  const { x, y, width, height, name, parentId } = params;
  
  const resultNode = await figma.createRectangle({
    x,
    y,
    width,
    height,
    name: name || 'Rectangle',
    parentId: parentId || figma.currentPage.id
  });
  
  return sanitizeNodeForDisplay(resultNode);
}

/**
 * Create a frame in Figma
 * @param {Object} params - Frame parameters
 * @returns {Promise<Object>} Created node
 */
export async function createFrame(params) {
  const {
    x, y, width, height, name,
    parentId,
    layoutMode,
    layoutWrap,
    primaryAxisAlignItems,
    counterAxisAlignItems,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    itemSpacing,
    layoutSizingHorizontal,
    layoutSizingVertical,
    fillColor,
    strokeColor,
    strokeWeight
  } = params;
  
  const frameParams = {
    x,
    y,
    width,
    height,
    name: name || 'Frame',
    parentId: parentId || figma.currentPage.id
  };
  
  // Add auto layout properties if specified
  if (layoutMode) {
    frameParams.layoutMode = layoutMode;
    
    if (layoutWrap) frameParams.layoutWrap = layoutWrap;
    if (primaryAxisAlignItems) frameParams.primaryAxisAlignItems = primaryAxisAlignItems;
    if (counterAxisAlignItems) frameParams.counterAxisAlignItems = counterAxisAlignItems;
    
    if (paddingTop !== undefined) frameParams.paddingTop = paddingTop;
    if (paddingRight !== undefined) frameParams.paddingRight = paddingRight;
    if (paddingBottom !== undefined) frameParams.paddingBottom = paddingBottom;
    if (paddingLeft !== undefined) frameParams.paddingLeft = paddingLeft;
    
    if (itemSpacing !== undefined && primaryAxisAlignItems !== 'SPACE_BETWEEN') {
      frameParams.itemSpacing = itemSpacing;
    }
    
    if (layoutSizingHorizontal) frameParams.layoutSizingHorizontal = layoutSizingHorizontal;
    if (layoutSizingVertical) frameParams.layoutSizingVertical = layoutSizingVertical;
  }
  
  // Create the frame
  const resultNode = await figma.createFrame(frameParams);
  
  // Set fill color if specified
  if (fillColor) {
    await figma.setFillColor({
      nodeId: resultNode.id,
      ...fillColor
    });
  }
  
  // Set stroke color if specified
  if (strokeColor) {
    const strokeParams = {
      nodeId: resultNode.id,
      ...strokeColor
    };
    
    if (strokeWeight !== undefined) {
      strokeParams.weight = strokeWeight;
    }
    
    await figma.setStrokeColor(strokeParams);
  }
  
  return sanitizeNodeForDisplay(resultNode);
}

/**
 * Create a text element in Figma
 * @param {Object} params - Text parameters
 * @returns {Promise<Object>} Created node
 */
export async function createText(params) {
  const { x, y, text, name, fontSize, fontWeight, fontColor, parentId } = params;
  
  // Create text node
  const resultNode = await figma.createText({
    x, 
    y,
    text: text || '',
    name: name || 'Text',
    fontSize: fontSize || 14,
    parentId: parentId || figma.currentPage.id
  });
  
  // Set font weight if specified
  if (fontWeight !== undefined) {
    await figma.loadFontAsync({
      family: 'Inter',
      style: fontWeight === 700 ? 'Bold' : fontWeight === 600 ? 'Semi Bold' : 'Regular'
    });
    
    resultNode.fontWeight = fontWeight;
  }
  
  // Set font color if specified
  if (fontColor) {
    await figma.setFillColor({
      nodeId: resultNode.id,
      ...fontColor
    });
  }
  
  return sanitizeNodeForDisplay(resultNode);
}

/**
 * Move a node to a new position
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to move
 * @param {number} params.x - New X position
 * @param {number} params.y - New Y position
 * @returns {Promise<Object>} Result of the operation
 */
export async function moveNode(params) {
  try {
    const { nodeId, x, y } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (x === undefined || y === undefined) {
      return {
        success: false,
        error: 'X and Y positions are required'
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
    
    // Check if node can be moved (has x and y properties)
    if (!('x' in node) || !('y' in node)) {
      return {
        success: false,
        error: `Node with ID ${nodeId} cannot be moved (no position properties)`
      };
    }
    
    // Move the node
    node.x = x;
    node.y = y;
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        x: node.x,
        y: node.y
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
 * Resize a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to resize
 * @param {number} params.width - New width
 * @param {number} params.height - New height
 * @returns {Promise<Object>} Result of the operation
 */
export async function resizeNode(params) {
  try {
    const { nodeId, width, height } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (width === undefined || height === undefined) {
      return {
        success: false,
        error: 'Width and height are required'
      };
    }
    
    if (width <= 0 || height <= 0) {
      return {
        success: false,
        error: 'Width and height must be greater than 0'
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
    
    // Check if node can be resized (has width and height properties)
    if (!('width' in node) || !('height' in node)) {
      return {
        success: false,
        error: `Node with ID ${nodeId} cannot be resized (no dimension properties)`
      };
    }
    
    // Resize the node
    node.resize(width, height);
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
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
 * Delete a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to delete
 * @returns {Promise<Object>} Result of the operation
 */
export async function deleteNode(params) {
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
    
    // Store node info before deletion
    const nodeInfo = {
      id: node.id,
      type: node.type,
      name: node.name
    };
    
    // Delete the node
    node.remove();
    
    // Return result
    return {
      success: true,
      deletedNode: nodeInfo
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete multiple nodes at once
 * @param {Object} params - Parameters
 * @param {string[]} params.nodeIds - Array of node IDs to delete
 * @returns {Promise<Object>} Result of the operation
 */
export async function deleteMultipleNodes(params) {
  try {
    const { nodeIds } = params;
    
    // Validate parameters
    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return {
        success: false,
        error: 'Node IDs array is required and must not be empty'
      };
    }
    
    const results = {
      success: true,
      deletedNodes: [],
      failedNodes: []
    };
    
    // Process each node
    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId);
      
      if (!node) {
        results.failedNodes.push({
          id: nodeId,
          error: `Node not found`
        });
        continue;
      }
      
      try {
        // Store node info before deletion
        const nodeInfo = {
          id: node.id,
          type: node.type,
          name: node.name
        };
        
        // Delete the node
        node.remove();
        
        // Add to successful deletions
        results.deletedNodes.push(nodeInfo);
      } catch (err) {
        results.failedNodes.push({
          id: nodeId,
          error: err.message
        });
      }
    }
    
    // Update overall success status
    if (results.failedNodes.length > 0 && results.deletedNodes.length === 0) {
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
 * Clone an existing node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to clone
 * @param {number} [params.x] - X position for the clone
 * @param {number} [params.y] - Y position for the clone
 * @returns {Promise<Object>} Result of the operation with the new node
 */
export async function cloneNode(params) {
  try {
    const { nodeId, x, y } = params;
    
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
    
    // Check if node can be cloned
    if (!node.clone) {
      return {
        success: false,
        error: `Node with ID ${nodeId} cannot be cloned`
      };
    }
    
    // Clone the node
    const clone = node.clone();
    
    // Position the clone if coordinates provided
    if (x !== undefined && y !== undefined && 'x' in clone && 'y' in clone) {
      clone.x = x;
      clone.y = y;
    } else if (('x' in clone && 'y' in clone)) {
      // Offset the clone a bit from the original if no coordinates provided
      clone.x = node.x + 10;
      clone.y = node.y + 10;
    }
    
    // Return result
    return {
      success: true,
      originalNode: {
        id: node.id,
        type: node.type
      },
      newNode: {
        id: clone.id,
        type: clone.type,
        name: clone.name,
        x: 'x' in clone ? clone.x : undefined,
        y: 'y' in clone ? clone.y : undefined,
        width: 'width' in clone ? clone.width : undefined,
        height: 'height' in clone ? clone.height : undefined
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
 * Set fill color for a node
 * @param {Object} params - Fill color parameters
 * @param {string} params.nodeId - Node ID
 * @param {number} params.r - Red component (0-1)
 * @param {number} params.g - Green component (0-1)
 * @param {number} params.b - Blue component (0-1)
 * @param {number} params.a - Optional alpha component (0-1)
 * @returns {Promise<Object>} Updated node
 */
export async function setFillColor(params) {
  const { nodeId, r, g, b, a = 1 } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  await figma.setFillColor({
    nodeId,
    r, g, b, a
  });
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set stroke color for a node
 * @param {Object} params - Stroke color parameters
 * @param {string} params.nodeId - Node ID
 * @param {number} params.r - Red component (0-1)
 * @param {number} params.g - Green component (0-1)
 * @param {number} params.b - Blue component (0-1)
 * @param {number} params.a - Optional alpha component (0-1)
 * @param {number} params.weight - Optional stroke weight
 * @returns {Promise<Object>} Updated node
 */
export async function setStrokeColor(params) {
  const { nodeId, r, g, b, a = 1, weight } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  const strokeParams = {
    nodeId,
    r, g, b, a
  };
  
  if (weight !== undefined) {
    strokeParams.weight = weight;
  }
  
  await figma.setStrokeColor(strokeParams);
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set text content for a text node
 * @param {Object} params - Text content parameters
 * @param {string} params.nodeId - Text node ID
 * @param {string} params.text - New text content
 * @returns {Promise<Object>} Updated node
 */
export async function setTextContent(params) {
  const { nodeId, text } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  if (node.type !== 'TEXT') {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }
  
  // Load fonts before setting text
  await figma.loadFontAsync({ family: node.fontName.family, style: node.fontName.style });
  
  node.characters = text;
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set corner radius for a node
 * @param {Object} params - Corner radius parameters
 * @param {string} params.nodeId - Node ID
 * @param {number} params.radius - Corner radius value
 * @param {boolean[]} params.corners - Optional array for which corners to round
 * @returns {Promise<Object>} Updated node
 */
export async function setCornerRadius(params) {
  const { nodeId, radius, corners } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // Check if the node supports corner radius
  if (!('cornerRadius' in node)) {
    throw new Error(`Node does not support corner radius: ${nodeId}`);
  }
  
  // If corners are specified, set individual corner radii
  if (corners && Array.isArray(corners) && corners.length === 4) {
    node.topLeftRadius = corners[0] ? radius : 0;
    node.topRightRadius = corners[1] ? radius : 0;
    node.bottomRightRadius = corners[2] ? radius : 0;
    node.bottomLeftRadius = corners[3] ? radius : 0;
  } else {
    // Set uniform corner radius
    node.cornerRadius = radius;
  }
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set layout mode and wrap for a frame
 * @param {Object} params - Layout parameters
 * @param {string} params.nodeId - Frame node ID
 * @param {string} params.layoutMode - Layout mode (NONE, HORIZONTAL, VERTICAL)
 * @param {string} params.layoutWrap - Optional wrap behavior (NO_WRAP, WRAP)
 * @returns {Promise<Object>} Updated node
 */
export async function setLayoutMode(params) {
  const { nodeId, layoutMode, layoutWrap } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    throw new Error(`Node does not support layout mode: ${nodeId}`);
  }
  
  node.layoutMode = layoutMode;
  
  if (layoutWrap) {
    node.layoutWrap = layoutWrap;
  }
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set padding for an auto-layout frame
 * @param {Object} params - Padding parameters
 * @param {string} params.nodeId - Frame node ID
 * @param {number} params.paddingTop - Optional top padding
 * @param {number} params.paddingRight - Optional right padding
 * @param {number} params.paddingBottom - Optional bottom padding
 * @param {number} params.paddingLeft - Optional left padding
 * @returns {Promise<Object>} Updated node
 */
export async function setPadding(params) {
  const { nodeId, paddingTop, paddingRight, paddingBottom, paddingLeft } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  if (node.layoutMode === 'NONE') {
    throw new Error(`Node does not have auto-layout enabled: ${nodeId}`);
  }
  
  if (paddingTop !== undefined) node.paddingTop = paddingTop;
  if (paddingRight !== undefined) node.paddingRight = paddingRight;
  if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
  if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set axis alignment for an auto-layout frame
 * @param {Object} params - Axis alignment parameters
 * @param {string} params.nodeId - Frame node ID
 * @param {string} params.primaryAxisAlignItems - Primary axis alignment
 * @param {string} params.counterAxisAlignItems - Counter axis alignment
 * @returns {Promise<Object>} Updated node
 */
export async function setAxisAlign(params) {
  const { nodeId, primaryAxisAlignItems, counterAxisAlignItems } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  if (node.layoutMode === 'NONE') {
    throw new Error(`Node does not have auto-layout enabled: ${nodeId}`);
  }
  
  if (primaryAxisAlignItems) node.primaryAxisAlignItems = primaryAxisAlignItems;
  if (counterAxisAlignItems) node.counterAxisAlignItems = counterAxisAlignItems;
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set layout sizing for an auto-layout frame
 * @param {Object} params - Layout sizing parameters
 * @param {string} params.nodeId - Frame node ID
 * @param {string} params.layoutSizingHorizontal - Horizontal sizing mode
 * @param {string} params.layoutSizingVertical - Vertical sizing mode
 * @returns {Promise<Object>} Updated node
 */
export async function setLayoutSizing(params) {
  const { nodeId, layoutSizingHorizontal, layoutSizingVertical } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  if (layoutSizingHorizontal) node.layoutSizingHorizontal = layoutSizingHorizontal;
  if (layoutSizingVertical) node.layoutSizingVertical = layoutSizingVertical;
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Set item spacing for an auto-layout frame
 * @param {Object} params - Item spacing parameters
 * @param {string} params.nodeId - Frame node ID
 * @param {number} params.itemSpacing - Distance between children
 * @returns {Promise<Object>} Updated node
 */
export async function setItemSpacing(params) {
  const { nodeId, itemSpacing } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  if (node.layoutMode === 'NONE') {
    throw new Error(`Node does not have auto-layout enabled: ${nodeId}`);
  }
  
  if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
    console.warn('itemSpacing will be ignored when primaryAxisAlignItems is set to SPACE_BETWEEN');
  }
  
  node.itemSpacing = itemSpacing;
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Create a component instance
 * @param {Object} params - Component instance parameters
 * @param {string} params.componentKey - Key of component to instantiate
 * @param {number} params.x - X position
 * @param {number} params.y - Y position
 * @returns {Promise<Object>} Created instance node
 */
export async function createComponentInstance(params) {
  const { componentKey, x, y } = params;
  
  const resultNode = await figma.createComponentInstance({
    componentKey,
    x: x || 0,
    y: y || 0
  });
  
  return sanitizeNodeForDisplay(resultNode);
}

/**
 * Get node information
 * @param {Object} params - Node info parameters
 * @param {string} params.nodeId - Node ID
 * @returns {Promise<Object>} Node information
 */
export async function getNodeInfo(params) {
  const { nodeId } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  return sanitizeNodeForDisplay(node);
}

/**
 * Get information about multiple nodes
 * @param {Object} params - Nodes info parameters
 * @param {string[]} params.nodeIds - Array of node IDs
 * @returns {Promise<Object>} Object with node information
 */
export async function getNodesInfo(params) {
  const { nodeIds } = params;
  
  const result = {
    nodes: [],
    errors: []
  };
  
  for (const nodeId of nodeIds) {
    try {
      const node = figma.getNodeById(nodeId);
      if (!node) {
        result.errors.push({
          nodeId,
          error: `Node not found: ${nodeId}`
        });
        continue;
      }
      
      result.nodes.push(sanitizeNodeForDisplay(node));
    } catch (error) {
      result.errors.push({
        nodeId,
        error: error.message
      });
    }
  }
  
  return result;
}

/**
 * Scan text nodes in a parent node
 * @param {Object} params - Scan parameters
 * @param {string} params.nodeId - Parent node ID
 * @returns {Promise<Object>} Array of text nodes
 */
export async function scanTextNodes(params) {
  const { nodeId } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  const textNodes = [];
  
  // Function to recursively scan for text nodes
  function scanForTextNodes(parentNode) {
    if (parentNode.type === 'TEXT') {
      textNodes.push(sanitizeNodeForDisplay(parentNode));
      return;
    }
    
    // Check if node has children
    if ('children' in parentNode) {
      for (const child of parentNode.children) {
        scanForTextNodes(child);
      }
    }
  }
  
  // Start the scan
  scanForTextNodes(node);
  
  return {
    parentNode: sanitizeNodeForDisplay(node),
    textNodes
  };
}

/**
 * Scan for specific node types in a parent node
 * @param {Object} params - Scan parameters
 * @param {string} params.nodeId - Parent node ID
 * @param {string[]} params.types - Array of node types to find
 * @returns {Promise<Object>} Array of matching nodes
 */
export async function scanNodesByTypes(params) {
  const { nodeId, types } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  const matchingNodes = [];
  
  // Function to recursively scan for matching nodes
  function scanForNodeTypes(parentNode) {
    if (types.includes(parentNode.type)) {
      matchingNodes.push(sanitizeNodeForDisplay(parentNode));
    }
    
    // Check if node has children
    if ('children' in parentNode) {
      for (const child of parentNode.children) {
        scanForNodeTypes(child);
      }
    }
  }
  
  // Start the scan
  scanForNodeTypes(node);
  
  return {
    parentNode: sanitizeNodeForDisplay(node),
    matchingNodes
  };
}

/**
 * Export a node as an image
 * @param {Object} params - Export parameters
 * @param {string} params.nodeId - Node ID to export
 * @param {string} params.format - Export format (PNG, JPG, SVG, PDF)
 * @param {number} params.scale - Export scale
 * @returns {Promise<Object>} Export result
 */
export async function exportNodeAsImage(params) {
  const { nodeId, format = 'PNG', scale = 1 } = params;
  
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  const settings = [{
    format: format.toLowerCase(),
    scale
  }];
  
  const bytes = await node.exportAsync(settings[0]);
  
  return {
    nodeId,
    format,
    scale,
    bytes
  };
}

// Get Figma styles
async function getStyles() {
  const styles = {
    colors: await figma.getLocalPaintStylesAsync(),
    texts: await figma.getLocalTextStylesAsync(),
    effects: await figma.getLocalEffectStylesAsync(),
    grids: await figma.getLocalGridStylesAsync(),
  };

  return {
    colors: styles.colors.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      paint: style.paints[0],
    })),
    texts: styles.texts.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      fontSize: style.fontSize,
      fontName: style.fontName,
    })),
    effects: styles.effects.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
    grids: styles.grids.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
  };
}

// Get local components
async function getLocalComponents() {
  await figma.loadAllPagesAsync();

  const components = figma.root.findAllWithCriteria({
    types: ["COMPONENT"],
  });

  return {
    count: components.length,
    components: components.map((component) => ({
      id: component.id,
      name: component.name,
      key: "key" in component ? component.key : null,
    })),
  };
} 