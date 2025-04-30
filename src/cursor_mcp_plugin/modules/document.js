// document.js - Document and selection related functions

import { sanitizeNodeForDisplay } from './utils.js';

/**
 * Get detailed information about the current Figma document
 * @returns {Promise<Object>} Document information
 */
export async function getDocumentInfo() {
  // Get basic document info
  const documentNode = figma.root;
  
  // Get all pages
  const pages = documentNode.children.map(page => ({
    id: page.id,
    name: page.name,
    isCurrentPage: page.id === figma.currentPage.id,
    childrenCount: page.children ? page.children.length : 0
  }));
  
  // Get current page details
  const currentPage = {
    id: figma.currentPage.id,
    name: figma.currentPage.name,
    width: figma.viewport.bounds.width,
    height: figma.viewport.bounds.height,
    childrenCount: figma.currentPage.children.length
  };
  
  // Get viewport information
  const viewport = {
    center: figma.viewport.center,
    zoom: figma.viewport.zoom,
    bounds: figma.viewport.bounds
  };
  
  return {
    id: documentNode.id,
    name: figma.root.name,
    lastModified: new Date().toISOString(),
    pages,
    currentPage,
    viewport,
    selection: figma.currentPage.selection.length > 0 ? 
      figma.currentPage.selection.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type
      })) : []
  };
}

/**
 * Get basic information about the current selection in Figma
 * @returns {Promise<Object>} Selection information
 */
export async function getSelection() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    return {
      count: 0,
      nodes: []
    };
  }
  
  const selectionInfo = selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? node.x : undefined,
    y: 'y' in node ? node.y : undefined,
    width: 'width' in node ? node.width : undefined,
    height: 'height' in node ? node.height : undefined,
    parent: node.parent ? {
      id: node.parent.id,
      name: node.parent.name,
      type: node.parent.type
    } : null
  }));
  
  return {
    count: selection.length,
    nodes: selectionInfo
  };
}

/**
 * Get detailed information about the current selection in Figma
 * @returns {Promise<Object>} Detailed selection information
 */
export async function readMyDesign() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    return {
      count: 0,
      nodes: []
    };
  }
  
  // Process each selected node
  const selectedNodes = selection.map(node => sanitizeNodeForDisplay(node));
  
  return {
    count: selection.length,
    nodes: selectedNodes
  };
}

/**
 * Get all styles from the current Figma document
 * @returns {Promise<Object>} Document styles
 */
export async function getStyles() {
  // Get all styles from the document
  const textStyles = figma.getLocalTextStyles();
  const colorStyles = figma.getLocalPaintStyles();
  const effectStyles = figma.getLocalEffectStyles();
  const gridStyles = figma.getLocalGridStyles();
  
  return {
    textStyles: textStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key,
      description: style.description || '',
      // Include some basic text properties
      fontSize: style.fontSize,
      fontName: style.fontName,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      paragraphIndent: style.paragraphIndent,
      paragraphSpacing: style.paragraphSpacing,
      textCase: style.textCase,
      textDecoration: style.textDecoration
    })),
    
    colorStyles: colorStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key,
      description: style.description || '',
      paints: style.paints
    })),
    
    effectStyles: effectStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key,
      description: style.description || '',
      effects: style.effects
    })),
    
    gridStyles: gridStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key,
      description: style.description || '',
      layoutGrids: style.layoutGrids
    }))
  };
}

/**
 * Get all local components from the Figma document
 * @returns {Promise<Object>} Local components information
 */
export async function getLocalComponents() {
  // Get all components in the document
  const components = figma.root.findAllWithCriteria({
    types: ['COMPONENT']
  });
  
  return {
    count: components.length,
    components: components.map(component => ({
      id: component.id,
      name: component.name,
      key: component.key,
      description: component.description || '',
      width: component.width,
      height: component.height,
      remote: component.remote,
      documentationLinks: component.documentationLinks || [],
      pageId: component.parent ? component.parent.id : null,
      pageName: component.parent ? component.parent.name : null
    }))
  };
}

/**
 * Get all annotations in the current document or specific node
 * @param {Object} params - Annotation parameters
 * @param {string} params.nodeId - Optional node ID to get annotations for
 * @param {boolean} params.includeCategories - Whether to include category info
 * @returns {Promise<Object>} Annotation information
 */
export async function getAnnotations(params = {}) {
  const { nodeId, includeCategories = true } = params;
  
  // If nodeId is provided, get annotations for that node only
  if (nodeId) {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    const annotations = figma.getAnnotationsForNode(node);
    
    return {
      nodeId,
      annotations: annotations.map(annotation => ({
        id: annotation.id,
        text: annotation.text,
        nodeId: annotation.node.id,
        nodeName: annotation.node.name,
        position: annotation.position
      })),
      categories: includeCategories ? getAnnotationCategories() : undefined
    };
  }
  
  // Otherwise, get all annotations in the document
  const annotations = figma.getAnnotations();
  
  return {
    count: annotations.length,
    annotations: annotations.map(annotation => ({
      id: annotation.id,
      text: annotation.text,
      nodeId: annotation.node.id,
      nodeName: annotation.node.name,
      position: annotation.position
    })),
    categories: includeCategories ? getAnnotationCategories() : undefined
  };
}

/**
 * Helper function to get annotation categories
 * @returns {Array} Annotation categories
 */
function getAnnotationCategories() {
  const categories = figma.getAnnotationCategories();
  
  return categories.map(category => ({
    id: category.id,
    name: category.name,
    color: category.color
  }));
}

/**
 * Create or update an annotation
 * @param {Object} params - Annotation parameters
 * @param {string} params.nodeId - Node ID to annotate
 * @param {string} params.labelMarkdown - Annotation text in markdown
 * @param {string} params.annotationId - Optional ID to update existing
 * @param {string} params.categoryId - Optional category ID
 * @returns {Promise<Object>} Created or updated annotation
 */
export async function setAnnotation(params) {
  const { nodeId, labelMarkdown, annotationId, categoryId, properties } = params;
  
  // Get the node to annotate
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // Prepare annotation options
  const options = {};
  
  // Add category if provided
  if (categoryId) {
    const categories = figma.getAnnotationCategories();
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
      throw new Error(`Annotation category not found: ${categoryId}`);
    }
    
    options.category = category;
  }
  
  // Add properties if provided
  if (properties && Array.isArray(properties)) {
    options.properties = properties;
  }
  
  let annotation;
  
  // Update existing annotation or create new one
  if (annotationId) {
    const existingAnnotation = figma.getAnnotationById(annotationId);
    
    if (!existingAnnotation) {
      throw new Error(`Annotation not found: ${annotationId}`);
    }
    
    annotation = figma.updateAnnotation(existingAnnotation, labelMarkdown, options);
  } else {
    annotation = figma.createAnnotation(node, labelMarkdown, options);
  }
  
  return {
    id: annotation.id,
    text: annotation.text,
    nodeId: annotation.node.id,
    nodeName: annotation.node.name,
    position: annotation.position,
    categoryId: annotation.category ? annotation.category.id : null
  };
}

/**
 * Set multiple annotations parallelly in a node
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - Parent node ID
 * @param {Array} params.annotations - Array of annotations to apply
 * @returns {Promise<Object>} Results of setting annotations
 */
export async function setMultipleAnnotations(params) {
  const { nodeId, annotations } = params;
  
  // Verify parent node exists
  const parentNode = figma.getNodeById(nodeId);
  if (!parentNode) {
    throw new Error(`Parent node not found: ${nodeId}`);
  }
  
  const results = {
    success: 0,
    errors: [],
    annotations: []
  };
  
  // Process each annotation
  for (const annotationData of annotations) {
    try {
      // Get the node to annotate
      const targetNodeId = annotationData.nodeId;
      const targetNode = figma.getNodeById(targetNodeId);
      
      if (!targetNode) {
        results.errors.push({
          nodeId: targetNodeId,
          error: `Node not found: ${targetNodeId}`
        });
        continue;
      }
      
      // Check if target node is within parent node
      let isChild = false;
      let checkNode = targetNode.parent;
      
      while (checkNode) {
        if (checkNode.id === parentNode.id) {
          isChild = true;
          break;
        }
        checkNode = checkNode.parent;
      }
      
      if (!isChild) {
        results.errors.push({
          nodeId: targetNodeId,
          error: `Node is not within the parent node: ${targetNodeId}`
        });
        continue;
      }
      
      // Prepare annotation options
      const options = {};
      
      // Add category if provided
      if (annotationData.categoryId) {
        const categories = figma.getAnnotationCategories();
        const category = categories.find(cat => cat.id === annotationData.categoryId);
        
        if (!category) {
          results.errors.push({
            nodeId: targetNodeId,
            error: `Annotation category not found: ${annotationData.categoryId}`
          });
          continue;
        }
        
        options.category = category;
      }
      
      // Add properties if provided
      if (annotationData.properties && Array.isArray(annotationData.properties)) {
        options.properties = annotationData.properties;
      }
      
      let annotation;
      
      // Update existing annotation or create new one
      if (annotationData.annotationId) {
        const existingAnnotation = figma.getAnnotationById(annotationData.annotationId);
        
        if (!existingAnnotation) {
          results.errors.push({
            nodeId: targetNodeId,
            error: `Annotation not found: ${annotationData.annotationId}`
          });
          continue;
        }
        
        annotation = figma.updateAnnotation(existingAnnotation, annotationData.labelMarkdown, options);
      } else {
        annotation = figma.createAnnotation(targetNode, annotationData.labelMarkdown, options);
      }
      
      // Add successful annotation to results
      results.annotations.push({
        id: annotation.id,
        text: annotation.text,
        nodeId: annotation.node.id,
        nodeName: annotation.node.name,
        position: annotation.position,
        categoryId: annotation.category ? annotation.category.id : null
      });
      
      results.success++;
    } catch (error) {
      results.errors.push({
        nodeId: annotationData.nodeId,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get information about a specific node in Figma
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
 * Get information about multiple nodes in Figma
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