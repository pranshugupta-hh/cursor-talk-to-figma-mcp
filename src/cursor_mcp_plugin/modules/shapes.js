// shapes.js - Functions for creating rectangles, frames and other shapes in Figma

/**
 * Create a new rectangle
 * @param {Object} params - Parameters
 * @param {number} params.x - X position
 * @param {number} params.y - Y position
 * @param {number} params.width - Width of the rectangle
 * @param {number} params.height - Height of the rectangle
 * @param {string} [params.name] - Optional name for the rectangle
 * @param {string} [params.parentId] - Optional parent node ID to append the rectangle to
 * @returns {Promise<Object>} Result of the operation
 */
export async function createRectangle(params) {
  try {
    const { x, y, width, height, name, parentId } = params;
    
    // Validate parameters
    if (x === undefined || y === undefined) {
      return {
        success: false,
        error: 'X and Y positions are required'
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
    
    // Create rectangle
    const rectangle = figma.createRectangle();
    
    // Set position and size
    rectangle.x = x;
    rectangle.y = y;
    rectangle.resize(width, height);
    
    // Set optional name
    if (name) {
      rectangle.name = name;
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
      
      parentNode.appendChild(rectangle);
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: rectangle.id,
        type: rectangle.type,
        name: rectangle.name,
        x: rectangle.x,
        y: rectangle.y,
        width: rectangle.width,
        height: rectangle.height
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
 * Create a new frame
 * @param {Object} params - Parameters
 * @param {number} params.x - X position
 * @param {number} params.y - Y position
 * @param {number} params.width - Width of the frame
 * @param {number} params.height - Height of the frame
 * @param {string} [params.name] - Optional name for the frame
 * @param {Object} [params.fillColor] - Fill color in RGBA format
 * @param {number} params.fillColor.r - Red component (0-1)
 * @param {number} params.fillColor.g - Green component (0-1)
 * @param {number} params.fillColor.b - Blue component (0-1)
 * @param {number} [params.fillColor.a] - Alpha component (0-1)
 * @param {Object} [params.strokeColor] - Stroke color in RGBA format
 * @param {number} params.strokeColor.r - Red component (0-1)
 * @param {number} params.strokeColor.g - Green component (0-1)
 * @param {number} params.strokeColor.b - Blue component (0-1)
 * @param {number} [params.strokeColor.a] - Alpha component (0-1)
 * @param {number} [params.strokeWeight] - Stroke weight
 * @param {string} [params.layoutMode] - Auto-layout mode for the frame (NONE, HORIZONTAL, VERTICAL)
 * @param {string} [params.layoutWrap] - Whether the auto-layout frame wraps its children (NO_WRAP, WRAP)
 * @param {string} [params.primaryAxisAlignItems] - Primary axis alignment for auto-layout frame (MIN, MAX, CENTER, SPACE_BETWEEN)
 * @param {string} [params.counterAxisAlignItems] - Counter axis alignment for auto-layout frame (MIN, MAX, CENTER, BASELINE)
 * @param {string} [params.layoutSizingHorizontal] - Horizontal sizing mode for auto-layout frame (FIXED, HUG, FILL)
 * @param {string} [params.layoutSizingVertical] - Vertical sizing mode for auto-layout frame (FIXED, HUG, FILL)
 * @param {number} [params.itemSpacing] - Distance between children in auto-layout frame
 * @param {number} [params.paddingTop] - Top padding for auto-layout frame
 * @param {number} [params.paddingRight] - Right padding for auto-layout frame
 * @param {number} [params.paddingBottom] - Bottom padding for auto-layout frame
 * @param {number} [params.paddingLeft] - Left padding for auto-layout frame
 * @param {string} [params.parentId] - Optional parent node ID to append the frame to
 * @returns {Promise<Object>} Result of the operation
 */
export async function createFrame(params) {
  try {
    const {
      x, y, width, height, name, fillColor, strokeColor, strokeWeight,
      layoutMode, layoutWrap, primaryAxisAlignItems, counterAxisAlignItems,
      layoutSizingHorizontal, layoutSizingVertical, itemSpacing,
      paddingTop, paddingRight, paddingBottom, paddingLeft, parentId
    } = params;
    
    // Validate parameters
    if (x === undefined || y === undefined) {
      return {
        success: false,
        error: 'X and Y positions are required'
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
    
    // Create frame
    const frame = figma.createFrame();
    
    // Set position and size
    frame.x = x;
    frame.y = y;
    frame.resize(width, height);
    
    // Set optional name
    if (name) {
      frame.name = name;
    }
    
    // Set optional fill color
    if (fillColor) {
      const { r, g, b, a = 1 } = fillColor;
      
      // Validate color components
      if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1 || a < 0 || a > 1) {
        return {
          success: false,
          error: 'Fill color components must be between 0 and 1'
        };
      }
      
      frame.fills = [{
        type: 'SOLID',
        color: { r, g, b },
        opacity: a
      }];
    }
    
    // Set optional stroke color and weight
    if (strokeColor) {
      const { r, g, b, a = 1 } = strokeColor;
      
      // Validate color components
      if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1 || a < 0 || a > 1) {
        return {
          success: false,
          error: 'Stroke color components must be between 0 and 1'
        };
      }
      
      frame.strokes = [{
        type: 'SOLID',
        color: { r, g, b },
        opacity: a
      }];
      
      // Set stroke weight if provided
      if (strokeWeight !== undefined) {
        if (strokeWeight <= 0) {
          return {
            success: false,
            error: 'Stroke weight must be greater than 0'
          };
        }
        
        frame.strokeWeight = strokeWeight;
      }
    }
    
    // Set auto-layout properties if layoutMode is provided
    if (layoutMode) {
      // Validate layout mode
      const validLayoutModes = ['NONE', 'HORIZONTAL', 'VERTICAL'];
      if (!validLayoutModes.includes(layoutMode)) {
        return {
          success: false,
          error: `Invalid layout mode. Must be one of: ${validLayoutModes.join(', ')}`
        };
      }
      
      frame.layoutMode = layoutMode;
      
      // Only set additional layout properties if not NONE
      if (layoutMode !== 'NONE') {
        // Set layout wrap if provided
        if (layoutWrap) {
          const validLayoutWraps = ['NO_WRAP', 'WRAP'];
          if (!validLayoutWraps.includes(layoutWrap)) {
            return {
              success: false,
              error: `Invalid layout wrap. Must be one of: ${validLayoutWraps.join(', ')}`
            };
          }
          
          frame.layoutWrap = layoutWrap;
        }
        
        // Set primary axis alignment if provided
        if (primaryAxisAlignItems) {
          const validPrimaryAxisAlignments = ['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN'];
          if (!validPrimaryAxisAlignments.includes(primaryAxisAlignItems)) {
            return {
              success: false,
              error: `Invalid primary axis alignment. Must be one of: ${validPrimaryAxisAlignments.join(', ')}`
            };
          }
          
          frame.primaryAxisAlignItems = primaryAxisAlignItems;
        }
        
        // Set counter axis alignment if provided
        if (counterAxisAlignItems) {
          const validCounterAxisAlignments = ['MIN', 'MAX', 'CENTER', 'BASELINE'];
          if (!validCounterAxisAlignments.includes(counterAxisAlignItems)) {
            return {
              success: false,
              error: `Invalid counter axis alignment. Must be one of: ${validCounterAxisAlignments.join(', ')}`
            };
          }
          
          frame.counterAxisAlignItems = counterAxisAlignments;
        }
        
        // Set horizontal sizing mode if provided
        if (layoutSizingHorizontal) {
          const validSizingModes = ['FIXED', 'HUG', 'FILL'];
          if (!validSizingModes.includes(layoutSizingHorizontal)) {
            return {
              success: false,
              error: `Invalid horizontal sizing mode. Must be one of: ${validSizingModes.join(', ')}`
            };
          }
          
          frame.layoutSizingHorizontal = layoutSizingHorizontal;
        }
        
        // Set vertical sizing mode if provided
        if (layoutSizingVertical) {
          const validSizingModes = ['FIXED', 'HUG', 'FILL'];
          if (!validSizingModes.includes(layoutSizingVertical)) {
            return {
              success: false,
              error: `Invalid vertical sizing mode. Must be one of: ${validSizingModes.join(', ')}`
            };
          }
          
          frame.layoutSizingVertical = layoutSizingVertical;
        }
        
        // Set item spacing if provided
        if (itemSpacing !== undefined) {
          frame.itemSpacing = itemSpacing;
        }
        
        // Set padding if provided
        if (paddingTop !== undefined) frame.paddingTop = paddingTop;
        if (paddingRight !== undefined) frame.paddingRight = paddingRight;
        if (paddingBottom !== undefined) frame.paddingBottom = paddingBottom;
        if (paddingLeft !== undefined) frame.paddingLeft = paddingLeft;
      }
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
      
      parentNode.appendChild(frame);
    }
    
    // Return result
    return {
      success: true,
      node: {
        id: frame.id,
        type: frame.type,
        name: frame.name,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        layoutMode: frame.layoutMode,
        layoutWrap: frame.layoutWrap,
        primaryAxisAlignItems: frame.primaryAxisAlignItems,
        counterAxisAlignItems: frame.counterAxisAlignItems,
        layoutSizingHorizontal: frame.layoutSizingHorizontal,
        layoutSizingVertical: frame.layoutSizingVertical,
        itemSpacing: frame.itemSpacing,
        paddingTop: frame.paddingTop,
        paddingRight: frame.paddingRight,
        paddingBottom: frame.paddingBottom,
        paddingLeft: frame.paddingLeft
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
 * Scan for child nodes with specific types in a container node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - ID of the node to scan
 * @param {string[]} params.types - Array of node types to find in the child nodes
 * @returns {Promise<Object>} Result containing matching nodes grouped by type
 */
export async function scanNodesByTypes(params) {
  try {
    const { nodeId, types } = params;
    
    // Validate parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (!types || !Array.isArray(types) || types.length === 0) {
      return {
        success: false,
        error: 'Types array is required and must not be empty'
      };
    }
    
    // Valid node types in Figma
    const validNodeTypes = [
      'DOCUMENT', 'PAGE', 'SLICE', 'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET',
      'INSTANCE', 'BOOLEAN_OPERATION', 'VECTOR', 'STAR', 'LINE', 'ELLIPSE',
      'POLYGON', 'RECTANGLE', 'TEXT', 'STICKY', 'CONNECTOR', 'SHAPE_WITH_TEXT'
    ];
    
    // Validate each type
    for (const type of types) {
      if (!validNodeTypes.includes(type)) {
        return {
          success: false,
          error: `Invalid node type: ${type}. Valid types are: ${validNodeTypes.join(', ')}`
        };
      }
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
        error: `Node with ID ${nodeId} cannot be scanned for child nodes`
      };
    }
    
    // Find nodes of specified types
    const matchingNodes = {};
    let totalCount = 0;
    
    // Initialize result object with empty arrays for each type
    for (const type of types) {
      matchingNodes[type] = [];
    }
    
    // Find nodes of each type
    for (const type of types) {
      const nodesOfType = node.findAll(n => n.type === type);
      
      // Map nodes to a simplified format
      const mappedNodes = nodesOfType.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        x: 'x' in n ? n.x : undefined,
        y: 'y' in n ? n.y : undefined,
        width: 'width' in n ? n.width : undefined,
        height: 'height' in n ? n.height : undefined,
        parentId: n.parent ? n.parent.id : null
      }));
      
      matchingNodes[type] = mappedNodes;
      totalCount += mappedNodes.length;
    }
    
    // Return result
    return {
      success: true,
      container: {
        id: node.id,
        name: node.name,
        type: node.type
      },
      matchingNodes,
      totalCount
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 