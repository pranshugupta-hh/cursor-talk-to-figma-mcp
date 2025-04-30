// layout.js - Functions for working with Figma layout properties and auto-layout

/**
 * Set the layout mode and wrap behavior of a frame
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the frame to modify
 * @param {string} params.layoutMode - Layout mode (NONE, HORIZONTAL, VERTICAL)
 * @param {string} [params.layoutWrap] - Layout wrap behavior (NO_WRAP, WRAP)
 * @returns {Promise<Object>} Result of the operation
 */
export async function setLayoutMode(params) {
  try {
    const { nodeId, layoutMode, layoutWrap } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (!layoutMode) {
      return {
        success: false,
        error: 'Layout mode is required'
      };
    }
    
    // Check if layout mode is valid
    const validLayoutModes = ['NONE', 'HORIZONTAL', 'VERTICAL'];
    if (!validLayoutModes.includes(layoutMode)) {
      return {
        success: false,
        error: `Invalid layout mode. Must be one of: ${validLayoutModes.join(', ')}`
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
    
    // Check if node is a frame or component
    if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE' && node.type !== 'COMPONENT_SET') {
      return {
        success: false,
        error: `Node with ID ${nodeId} is not a frame, component, instance, or component set`
      };
    }
    
    // Set layout mode
    node.layoutMode = layoutMode;
    
    // Set layout wrap if provided
    if (layoutWrap) {
      const validLayoutWraps = ['NO_WRAP', 'WRAP'];
      if (!validLayoutWraps.includes(layoutWrap)) {
        return {
          success: false,
          error: `Invalid layout wrap. Must be one of: ${validLayoutWraps.join(', ')}`
        };
      }
      
      node.layoutWrap = layoutWrap;
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        layoutMode: node.layoutMode,
        layoutWrap: node.layoutWrap
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
 * Set padding values for an auto-layout frame
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the frame to modify
 * @param {number} [params.paddingTop] - Top padding value
 * @param {number} [params.paddingRight] - Right padding value
 * @param {number} [params.paddingBottom] - Bottom padding value
 * @param {number} [params.paddingLeft] - Left padding value
 * @returns {Promise<Object>} Result of the operation
 */
export async function setPadding(params) {
  try {
    const { nodeId, paddingTop, paddingRight, paddingBottom, paddingLeft } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    // At least one padding value must be provided
    if (paddingTop === undefined && paddingRight === undefined && 
        paddingBottom === undefined && paddingLeft === undefined) {
      return {
        success: false,
        error: 'At least one padding value must be provided'
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
    
    // Check if node is a frame or component with auto-layout
    if ((node.type !== 'FRAME' && node.type !== 'COMPONENT' && 
         node.type !== 'INSTANCE' && node.type !== 'COMPONENT_SET') || 
        node.layoutMode === 'NONE') {
      return {
        success: false,
        error: `Node with ID ${nodeId} is not a frame, component, instance, or component set with auto-layout`
      };
    }
    
    // Set padding values if provided
    if (paddingTop !== undefined) node.paddingTop = paddingTop;
    if (paddingRight !== undefined) node.paddingRight = paddingRight;
    if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
    if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        paddingTop: node.paddingTop,
        paddingRight: node.paddingRight,
        paddingBottom: node.paddingBottom,
        paddingLeft: node.paddingLeft
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
 * Set primary and counter axis alignment for an auto-layout frame
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the frame to modify
 * @param {string} [params.primaryAxisAlignItems] - Primary axis alignment (MIN, MAX, CENTER, SPACE_BETWEEN)
 * @param {string} [params.counterAxisAlignItems] - Counter axis alignment (MIN, MAX, CENTER, BASELINE)
 * @returns {Promise<Object>} Result of the operation
 */
export async function setAxisAlign(params) {
  try {
    const { nodeId, primaryAxisAlignItems, counterAxisAlignItems } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    // At least one axis alignment must be provided
    if (primaryAxisAlignItems === undefined && counterAxisAlignItems === undefined) {
      return {
        success: false,
        error: 'At least one axis alignment must be provided'
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
    
    // Check if node is a frame or component with auto-layout
    if ((node.type !== 'FRAME' && node.type !== 'COMPONENT' && 
         node.type !== 'INSTANCE' && node.type !== 'COMPONENT_SET') || 
        node.layoutMode === 'NONE') {
      return {
        success: false,
        error: `Node with ID ${nodeId} is not a frame, component, instance, or component set with auto-layout`
      };
    }
    
    // Set primary axis alignment if provided
    if (primaryAxisAlignItems !== undefined) {
      const validPrimaryAxisAlignments = ['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN'];
      if (!validPrimaryAxisAlignments.includes(primaryAxisAlignItems)) {
        return {
          success: false,
          error: `Invalid primary axis alignment. Must be one of: ${validPrimaryAxisAlignments.join(', ')}`
        };
      }
      
      node.primaryAxisAlignItems = primaryAxisAlignItems;
    }
    
    // Set counter axis alignment if provided
    if (counterAxisAlignItems !== undefined) {
      const validCounterAxisAlignments = ['MIN', 'MAX', 'CENTER', 'BASELINE'];
      if (!validCounterAxisAlignments.includes(counterAxisAlignItems)) {
        return {
          success: false,
          error: `Invalid counter axis alignment. Must be one of: ${validCounterAxisAlignments.join(', ')}`
        };
      }
      
      node.counterAxisAlignItems = counterAxisAlignItems;
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        primaryAxisAlignItems: node.primaryAxisAlignItems,
        counterAxisAlignItems: node.counterAxisAlignItems
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
 * Set horizontal and vertical sizing modes for an auto-layout frame
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the frame to modify
 * @param {string} [params.layoutSizingHorizontal] - Horizontal sizing mode (FIXED, HUG, FILL)
 * @param {string} [params.layoutSizingVertical] - Vertical sizing mode (FIXED, HUG, FILL)
 * @returns {Promise<Object>} Result of the operation
 */
export async function setLayoutSizing(params) {
  try {
    const { nodeId, layoutSizingHorizontal, layoutSizingVertical } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    // At least one sizing mode must be provided
    if (layoutSizingHorizontal === undefined && layoutSizingVertical === undefined) {
      return {
        success: false,
        error: 'At least one layout sizing mode must be provided'
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
    
    // Check if node supports layout sizing
    if (!('layoutSizingHorizontal' in node) || !('layoutSizingVertical' in node)) {
      return {
        success: false,
        error: `Node with ID ${nodeId} does not support layout sizing`
      };
    }
    
    // Set horizontal sizing mode if provided
    if (layoutSizingHorizontal !== undefined) {
      const validSizingModes = ['FIXED', 'HUG', 'FILL'];
      if (!validSizingModes.includes(layoutSizingHorizontal)) {
        return {
          success: false,
          error: `Invalid horizontal sizing mode. Must be one of: ${validSizingModes.join(', ')}`
        };
      }
      
      node.layoutSizingHorizontal = layoutSizingHorizontal;
    }
    
    // Set vertical sizing mode if provided
    if (layoutSizingVertical !== undefined) {
      const validSizingModes = ['FIXED', 'HUG', 'FILL'];
      if (!validSizingModes.includes(layoutSizingVertical)) {
        return {
          success: false,
          error: `Invalid vertical sizing mode. Must be one of: ${validSizingModes.join(', ')}`
        };
      }
      
      node.layoutSizingVertical = layoutSizingVertical;
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        layoutSizingHorizontal: node.layoutSizingHorizontal,
        layoutSizingVertical: node.layoutSizingVertical
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
 * Set distance between children in an auto-layout frame
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the frame to modify
 * @param {number} params.itemSpacing - Distance between children
 * @returns {Promise<Object>} Result of the operation
 */
export async function setItemSpacing(params) {
  try {
    const { nodeId, itemSpacing } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (itemSpacing === undefined) {
      return {
        success: false,
        error: 'Item spacing value is required'
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
    
    // Check if node is a frame or component with auto-layout
    if ((node.type !== 'FRAME' && node.type !== 'COMPONENT' && 
         node.type !== 'INSTANCE' && node.type !== 'COMPONENT_SET') || 
        node.layoutMode === 'NONE') {
      return {
        success: false,
        error: `Node with ID ${nodeId} is not a frame, component, instance, or component set with auto-layout`
      };
    }
    
    // Set item spacing
    node.itemSpacing = itemSpacing;
    
    // Return result
    return {
      success: true,
      node: {
        id: node.id,
        type: node.type,
        itemSpacing: node.itemSpacing
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 