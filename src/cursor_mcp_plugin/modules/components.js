// components.js - Functions for working with Figma components and instances

import { sanitizeNodeForDisplay } from './utils.js';

/**
 * Get all local components from the Figma document
 * @returns {Promise<Object>} Result containing all local components
 */
export async function getLocalComponents() {
  try {
    // Get all local components from the document
    const components = figma.root.findAll(node => node.type === 'COMPONENT');
    
    // Map components to a simplified format
    const mappedComponents = components.map(component => ({
      id: component.id,
      key: component.key,
      name: component.name,
      description: component.description,
      width: component.width,
      height: component.height,
      componentSetId: component.parent && component.parent.type === 'COMPONENT_SET' ? component.parent.id : null
    }));
    
    // Get component sets
    const componentSets = figma.root.findAll(node => node.type === 'COMPONENT_SET');
    
    // Map component sets to a simplified format
    const mappedComponentSets = componentSets.map(componentSet => ({
      id: componentSet.id,
      name: componentSet.name,
      description: componentSet.description,
      width: componentSet.width,
      height: componentSet.height,
      variantProperties: componentSet.variantGroupProperties,
      childCount: componentSet.children.length
    }));
    
    // Return result
    return {
      success: true,
      components: mappedComponents,
      componentSets: mappedComponentSets,
      componentCount: mappedComponents.length,
      componentSetCount: mappedComponentSets.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create an instance of a component
 * @param {Object} params - Parameters
 * @param {string} params.componentKey - Key of the component to instantiate
 * @param {number} params.x - X position
 * @param {number} params.y - Y position
 * @param {string} [params.parentId] - Optional parent node ID to append the instance to
 * @returns {Promise<Object>} Result of the operation
 */
export async function createComponentInstance(params) {
  try {
    const { componentKey, x, y, parentId } = params;
    
    // Validate parameters
    if (!componentKey) {
      return {
        success: false,
        error: 'Component key is required'
      };
    }
    
    if (x === undefined || y === undefined) {
      return {
        success: false,
        error: 'X and Y positions are required'
      };
    }
    
    // Create component instance
    const instance = figma.createComponentInstance(componentKey);
    
    if (!instance) {
      return {
        success: false,
        error: `Component with key ${componentKey} not found`
      };
    }
    
    // Set position
    instance.x = x;
    instance.y = y;
    
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
      
      parentNode.appendChild(instance);
    }
    
    // Return result
    return {
      success: true,
      instance: {
        id: instance.id,
        type: instance.type,
        name: instance.name,
        x: instance.x,
        y: instance.y,
        width: instance.width,
        height: instance.height,
        componentId: instance.componentId,
        mainComponent: instance.mainComponent ? {
          id: instance.mainComponent.id,
          name: instance.mainComponent.name,
          key: instance.mainComponent.key
        } : null
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
 * Get all override properties from a component instance
 * @param {Object} params - Parameters
 * @param {string} [params.nodeId] - Optional ID of the component instance to get overrides from
 * @returns {Promise<Object>} Result containing instance overrides
 */
export async function getInstanceOverrides(params) {
  try {
    const { nodeId } = params;
    
    // Get the instance node
    let instanceNode;
    
    if (nodeId) {
      instanceNode = figma.getNodeById(nodeId);
      
      if (!instanceNode) {
        return {
          success: false,
          error: `Node with ID ${nodeId} not found`
        };
      }
      
      if (instanceNode.type !== 'INSTANCE') {
        return {
          success: false,
          error: `Node with ID ${nodeId} is not a component instance`
        };
      }
    } else {
      // Use first selected instance if no nodeId provided
      const selection = figma.currentPage.selection;
      
      if (!selection || selection.length === 0) {
        return {
          success: false,
          error: 'No selection and no nodeId provided'
        };
      }
      
      const selectedInstance = selection.find(node => node.type === 'INSTANCE');
      
      if (!selectedInstance) {
        return {
          success: false,
          error: 'No component instance selected'
        };
      }
      
      instanceNode = selectedInstance;
    }
    
    // Get overrides
    const overrides = getComponentOverrides(instanceNode);
    
    // Return result
    return {
      success: true,
      instance: {
        id: instanceNode.id,
        name: instanceNode.name,
        componentId: instanceNode.componentId,
        mainComponent: instanceNode.mainComponent ? {
          id: instanceNode.mainComponent.id,
          name: instanceNode.mainComponent.name,
          key: instanceNode.mainComponent.key
        } : null
      },
      overrides
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Apply previously copied overrides to component instances
 * @param {Object} params - Parameters
 * @param {string} params.sourceInstanceId - ID of the source component instance
 * @param {string[]} params.targetNodeIds - Array of target instance IDs to apply overrides to
 * @returns {Promise<Object>} Result of the operation
 */
export async function setInstanceOverrides(params) {
  try {
    const { sourceInstanceId, targetNodeIds } = params;
    
    // Validate parameters
    if (!sourceInstanceId) {
      return {
        success: false,
        error: 'Source instance ID is required'
      };
    }
    
    if (!targetNodeIds || !Array.isArray(targetNodeIds) || targetNodeIds.length === 0) {
      return {
        success: false,
        error: 'Target node IDs array is required and must not be empty'
      };
    }
    
    // Get the source instance
    const sourceInstance = figma.getNodeById(sourceInstanceId);
    
    if (!sourceInstance) {
      return {
        success: false,
        error: `Source instance with ID ${sourceInstanceId} not found`
      };
    }
    
    if (sourceInstance.type !== 'INSTANCE') {
      return {
        success: false,
        error: `Node with ID ${sourceInstanceId} is not a component instance`
      };
    }
    
    // Get overrides from source
    const overrides = getComponentOverrides(sourceInstance);
    
    // Apply overrides to target instances
    const results = {
      success: true,
      updatedInstances: [],
      failedInstances: []
    };
    
    for (const targetNodeId of targetNodeIds) {
      const targetNode = figma.getNodeById(targetNodeId);
      
      if (!targetNode) {
        results.failedInstances.push({
          id: targetNodeId,
          error: 'Node not found'
        });
        continue;
      }
      
      if (targetNode.type !== 'INSTANCE') {
        results.failedInstances.push({
          id: targetNodeId,
          error: 'Node is not a component instance'
        });
        continue;
      }
      
      try {
        // Apply overrides to target
        applyComponentOverrides(targetNode, overrides);
        
        results.updatedInstances.push({
          id: targetNode.id,
          name: targetNode.name,
          componentId: targetNode.componentId
        });
      } catch (err) {
        results.failedInstances.push({
          id: targetNodeId,
          error: err.message
        });
      }
    }
    
    // Update overall success status
    if (results.failedInstances.length > 0 && results.updatedInstances.length === 0) {
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
 * Helper function to extract component overrides
 * @param {Object} instance - The component instance to extract overrides from
 * @returns {Object} Extracted overrides
 */
function getComponentOverrides(instance) {
  const overrides = {
    componentId: instance.componentId,
    mainComponentKey: instance.mainComponent ? instance.mainComponent.key : null,
    properties: {}
  };
  
  // Get component properties if they exist
  if (instance.componentProperties) {
    for (const [key, value] of Object.entries(instance.componentProperties)) {
      overrides.properties[key] = {
        type: value.type,
        value: value.value
      };
    }
  }
  
  // Return overrides
  return overrides;
}

/**
 * Helper function to apply component overrides
 * @param {Object} instance - The component instance to apply overrides to
 * @param {Object} overrides - The overrides to apply
 */
function applyComponentOverrides(instance, overrides) {
  // Swap component if needed
  if (overrides.mainComponentKey && instance.mainComponent?.key !== overrides.mainComponentKey) {
    instance.swapComponent(figma.getComponentByKey(overrides.mainComponentKey));
  }
  
  // Apply properties
  for (const [key, value] of Object.entries(overrides.properties)) {
    // Check if property exists on target
    if (instance.componentProperties && key in instance.componentProperties) {
      // Apply the property if types match
      if (instance.componentProperties[key].type === value.type) {
        instance.setComponentProperty(key, value.value);
      }
    }
  }
}

/**
 * Get Figma Prototyping Reactions from multiple nodes
 * @param {Object} params - Reaction parameters
 * @param {string[]} params.nodeIds - Array of node IDs to get reactions from
 * @returns {Promise<Object>} Reaction information
 */
export async function getReactions(params) {
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
      
      // Get reactions for this node
      const reactions = node.reactions || [];
      
      result.nodes.push({
        nodeId,
        nodeName: node.name,
        nodeType: node.type,
        reactions: reactions.map(reaction => ({
          action: reaction.action,
          trigger: reaction.trigger,
          destinationId: reaction.destination?.id,
          destinationName: reaction.destination?.name,
          preserveScrollPosition: reaction.preserveScrollPosition,
          navigationAction: reaction.navigationAction,
          transition: reaction.transition ? {
            type: reaction.transition.type,
            duration: reaction.transition.duration,
            easing: reaction.transition.easing
          } : null,
          name: reaction.name
        }))
      });
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
 * Set a copied connector node as the default connector
 * @param {Object} params - Connector parameters
 * @param {string} params.connectorId - ID of the connector node
 * @returns {Promise<Object>} Result of setting default connector
 */
export async function setDefaultConnector(params = {}) {
  const { connectorId } = params;
  
  // If no ID is provided, clear the default connector
  if (!connectorId) {
    // Clear default connector
    figma.setDefaultConnectorStyle(null);
    
    return {
      success: true,
      message: 'Default connector style has been cleared'
    };
  }
  
  // Otherwise, get the connector node
  const connectorNode = figma.getNodeById(connectorId);
  
  if (!connectorNode) {
    throw new Error(`Connector node not found: ${connectorId}`);
  }
  
  if (connectorNode.type !== 'CONNECTOR') {
    throw new Error(`Node is not a connector: ${connectorId}`);
  }
  
  // Set as default connector style
  figma.setDefaultConnectorStyle(connectorNode);
  
  return {
    success: true,
    message: `Set node "${connectorNode.name}" as default connector style`,
    connectorId
  };
}

/**
 * Create connections between nodes using the default connector style
 * @param {Object} params - Connection parameters
 * @param {Array} params.connections - Array of node connections to create
 * @returns {Promise<Object>} Created connections
 */
export async function createConnections(params) {
  const { connections } = params;
  
  if (!connections || !Array.isArray(connections) || connections.length === 0) {
    throw new Error('No connections specified');
  }
  
  const results = {
    success: 0,
    errors: [],
    connectors: []
  };
  
  for (const connection of connections) {
    try {
      const { startNodeId, endNodeId, text } = connection;
      
      // Get start and end nodes
      const startNode = figma.getNodeById(startNodeId);
      const endNode = figma.getNodeById(endNodeId);
      
      if (!startNode) {
        results.errors.push({
          connection,
          error: `Start node not found: ${startNodeId}`
        });
        continue;
      }
      
      if (!endNode) {
        results.errors.push({
          connection,
          error: `End node not found: ${endNodeId}`
        });
        continue;
      }
      
      // Create connector between the nodes
      const connector = figma.createConnector();
      connector.connectorStart = {
        endpointNodeId: startNodeId,
        magnet: 'AUTO'
      };
      connector.connectorEnd = {
        endpointNodeId: endNodeId,
        magnet: 'AUTO'
      };
      
      // Add text if provided
      if (text) {
        connector.text = text;
      }
      
      // Add to page
      figma.currentPage.appendChild(connector);
      
      // Add to results
      results.connectors.push({
        id: connector.id,
        startNodeId,
        endNodeId,
        text: text || '',
        name: connector.name
      });
      
      results.success++;
    } catch (error) {
      results.errors.push({
        connection,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Scan for child nodes with specific types in a Figma node
 * @param {Object} params - Scan parameters
 * @param {string} params.nodeId - ID of the node to scan
 * @param {string[]} params.types - Array of node types to find
 * @returns {Promise<Object>} Found nodes information
 */
export async function scanNodesByTypes(params) {
  const { nodeId, types } = params;
  
  if (!nodeId) {
    throw new Error('Node ID is required');
  }
  
  if (!types || !Array.isArray(types) || types.length === 0) {
    throw new Error('Types array is required');
  }
  
  // Get the node
  const node = figma.getNodeById(nodeId);
  
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // Convert types to uppercase to match Figma's enum values
  const upperTypes = types.map(type => type.toUpperCase());
  
  // Find all nodes with the specified types
  const foundNodes = [];
  
  // Helper function to recursively scan for nodes
  function scanNode(currentNode) {
    // Skip the root node itself
    if (currentNode.id !== nodeId) {
      if (upperTypes.includes(currentNode.type)) {
        foundNodes.push(currentNode);
      }
    }
    
    // Scan children if they exist
    if ('children' in currentNode) {
      for (const child of currentNode.children) {
        scanNode(child);
      }
    }
  }
  
  // Start scan
  scanNode(node);
  
  // Return basic info about found nodes
  return {
    count: foundNodes.length,
    nodes: foundNodes.map(foundNode => ({
      id: foundNode.id,
      name: foundNode.name,
      type: foundNode.type,
      x: 'x' in foundNode ? foundNode.x : undefined,
      y: 'y' in foundNode ? foundNode.y : undefined,
      width: 'width' in foundNode ? foundNode.width : undefined,
      height: 'height' in foundNode ? foundNode.height : undefined,
      parent: foundNode.parent ? {
        id: foundNode.parent.id,
        name: foundNode.parent.name,
        type: foundNode.parent.type
      } : null
    }))
  };
}

/**
 * Scan all text nodes in a selected Figma node
 * @param {Object} params - Scan parameters
 * @param {string} params.nodeId - ID of the node to scan
 * @returns {Promise<Object>} Found text nodes
 */
export async function scanTextNodes(params) {
  const { nodeId } = params;
  
  if (!nodeId) {
    throw new Error('Node ID is required');
  }
  
  // Get the node
  const node = figma.getNodeById(nodeId);
  
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // Find all text nodes
  const textNodes = [];
  
  // Helper function to recursively scan for text nodes
  function scanNode(currentNode) {
    if (currentNode.type === 'TEXT') {
      textNodes.push(currentNode);
    }
    
    // Scan children if they exist
    if ('children' in currentNode) {
      for (const child of currentNode.children) {
        scanNode(child);
      }
    }
  }
  
  // Start scan
  scanNode(node);
  
  // Return basic info about found text nodes
  return {
    count: textNodes.length,
    textNodes: textNodes.map(textNode => ({
      id: textNode.id,
      name: textNode.name,
      characters: textNode.characters,
      x: textNode.x,
      y: textNode.y,
      width: textNode.width,
      height: textNode.height,
      fontSize: textNode.fontSize,
      fontName: textNode.fontName,
      parent: textNode.parent ? {
        id: textNode.parent.id,
        name: textNode.parent.name,
        type: textNode.parent.type
      } : null
    }))
  };
}

/**
 * Set multiple text contents parallelly in a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - Parent node ID
 * @param {Array} params.text - Array of text node IDs and replacement texts
 * @returns {Promise<Object>} Results of setting text contents
 */
export async function setMultipleTextContents(params) {
  const { nodeId, text } = params;
  
  if (!nodeId) {
    throw new Error('Parent node ID is required');
  }
  
  if (!text || !Array.isArray(text) || text.length === 0) {
    throw new Error('Text array is required');
  }
  
  // Get the parent node
  const parentNode = figma.getNodeById(nodeId);
  
  if (!parentNode) {
    throw new Error(`Parent node not found: ${nodeId}`);
  }
  
  const results = {
    success: 0,
    errors: [],
    updated: []
  };
  
  // Process each text update
  for (const textUpdate of text) {
    try {
      const { nodeId: textNodeId, text: newText } = textUpdate;
      
      // Get the text node
      const textNode = figma.getNodeById(textNodeId);
      
      if (!textNode) {
        results.errors.push({
          nodeId: textNodeId,
          error: `Text node not found: ${textNodeId}`
        });
        continue;
      }
      
      if (textNode.type !== 'TEXT') {
        results.errors.push({
          nodeId: textNodeId,
          error: `Node is not a text node: ${textNodeId}`
        });
        continue;
      }
      
      // Check if text node is within parent node
      let isChild = false;
      let checkNode = textNode.parent;
      
      while (checkNode) {
        if (checkNode.id === parentNode.id) {
          isChild = true;
          break;
        }
        checkNode = checkNode.parent;
      }
      
      if (!isChild) {
        results.errors.push({
          nodeId: textNodeId,
          error: `Text node is not within the parent node: ${textNodeId}`
        });
        continue;
      }
      
      // Update text content
      const originalText = textNode.characters;
      textNode.characters = newText;
      
      // Add to results
      results.updated.push({
        nodeId: textNodeId,
        oldText: originalText,
        newText
      });
      
      results.success++;
    } catch (error) {
      results.errors.push({
        nodeId: textUpdate.nodeId,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Join a specific channel to communicate with Figma
 * @param {Object} params - Channel parameters
 * @param {string} params.channel - The name of the channel to join
 * @returns {Promise<Object>} Result of joining channel
 */
export async function joinChannel(params = {}) {
  const { channel = '' } = params;
  
  // Check if channel name is valid
  if (!channel || typeof channel !== 'string') {
    throw new Error('Invalid channel name');
  }
  
  // Join the requested channel
  return {
    success: true,
    message: `Joined channel: ${channel}`,
    channel
  };
} 