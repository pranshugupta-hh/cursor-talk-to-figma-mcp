// annotations.js - Functions for working with Figma annotations

/**
 * Get all annotations in the document or specific node
 * @param {Object} params - Parameters
 * @param {string} [params.nodeId] - Optional node ID to get annotations for
 * @param {boolean} [params.includeCategories=true] - Whether to include category information
 * @returns {Promise<Object>} Annotations information
 */
export async function getAnnotations(params = {}) {
  try {
    const { nodeId, includeCategories = true } = params;
    let annotationsResult = [];
    let categoriesResult = {};
    
    // Get annotations from the document or specific node
    if (nodeId) {
      // Get annotations for specific node
      const node = figma.getNodeById(nodeId);
      if (!node) {
        return {
          success: false,
          error: `Node with ID ${nodeId} not found`
        };
      }
      
      // Check if node has annotations
      if (!node.annotations) {
        return {
          success: true,
          annotations: [],
          categories: includeCategories ? {} : undefined
        };
      }
      
      // Process node annotations
      annotationsResult = processAnnotations(node.annotations);
    } else {
      // Get all annotations in the document
      const documentAnnotations = figma.root.annotations || [];
      annotationsResult = processAnnotations(documentAnnotations);
    }
    
    // Process categories if requested
    if (includeCategories) {
      const categories = figma.annotationCategories || [];
      categoriesResult = categories.reduce((acc, category) => {
        acc[category.id] = {
          id: category.id,
          name: category.name,
          color: processColor(category.color)
        };
        return acc;
      }, {});
    }
    
    // Return result
    return {
      success: true,
      annotations: annotationsResult,
      categories: includeCategories ? categoriesResult : undefined,
      count: annotationsResult.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create or update an annotation
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node to annotate
 * @param {string} params.labelMarkdown - The annotation text in markdown format
 * @param {string} [params.annotationId] - The ID of the annotation to update (if updating)
 * @param {string} [params.categoryId] - The ID of the annotation category
 * @param {Array} [params.properties] - Additional properties for the annotation
 * @returns {Promise<Object>} Result of the operation
 */
export async function setAnnotation(params) {
  try {
    const { nodeId, labelMarkdown, annotationId, categoryId, properties } = params;
    
    // Validate required parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (!labelMarkdown) {
      return {
        success: false,
        error: 'Label markdown is required'
      };
    }
    
    // Get the node to annotate
    const node = figma.getNodeById(nodeId);
    if (!node) {
      return {
        success: false,
        error: `Node with ID ${nodeId} not found`
      };
    }
    
    // Create or update annotation
    let annotation;
    const annoData = {
      labelMarkdown,
      ...categoryId && { categoryId }
    };
    
    if (annotationId) {
      // Try to find existing annotation
      annotation = node.annotations?.find(anno => anno.id === annotationId);
      
      if (!annotation) {
        // Annotation with specified ID not found, create new one
        annotation = node.createAnnotation(annoData);
      } else {
        // Update existing annotation
        annotation.labelMarkdown = labelMarkdown;
        if (categoryId) annotation.categoryId = categoryId;
      }
    } else {
      // Create new annotation
      annotation = node.createAnnotation(annoData);
    }
    
    // Apply additional properties if provided
    if (properties && Array.isArray(properties)) {
      properties.forEach(prop => {
        if (prop && prop.type) {
          annotation[prop.type] = prop.value;
        }
      });
    }
    
    // Return updated annotation details
    return {
      success: true,
      annotation: {
        id: annotation.id,
        nodeId: node.id,
        labelMarkdown: annotation.labelMarkdown,
        categoryId: annotation.categoryId || null
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
 * Set multiple annotations on a node in parallel
 * @param {Object} params - Parameters
 * @param {string} params.nodeId - The ID of the node containing elements to annotate
 * @param {Array} params.annotations - Array of annotation data
 * @returns {Promise<Object>} Result of the operation
 */
export async function setMultipleAnnotations(params) {
  try {
    const { nodeId, annotations } = params;
    
    // Validate required parameters
    if (!nodeId) {
      return {
        success: false,
        error: 'Node ID is required'
      };
    }
    
    if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
      return {
        success: false,
        error: 'Annotations array is required and must not be empty'
      };
    }
    
    // Get the parent node
    const parentNode = figma.getNodeById(nodeId);
    if (!parentNode) {
      return {
        success: false,
        error: `Node with ID ${nodeId} not found`
      };
    }
    
    // Process each annotation
    const results = [];
    for (const annoData of annotations) {
      // Set annotation for each item
      const result = await setAnnotation({
        ...annoData,
        nodeId: annoData.nodeId || nodeId
      });
      
      results.push({
        nodeId: annoData.nodeId || nodeId,
        annotationId: result.success ? result.annotation.id : null,
        success: result.success,
        error: result.error
      });
    }
    
    // Return results
    return {
      success: true,
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper function to process annotations
 * @param {Array} annotations - Array of Figma annotation objects
 * @returns {Array} Processed annotations
 */
function processAnnotations(annotations) {
  if (!annotations || !Array.isArray(annotations)) {
    return [];
  }
  
  return annotations.map(anno => {
    const targetNode = anno.targetNode ? figma.getNodeById(anno.targetNode.id) : null;
    
    return {
      id: anno.id,
      labelMarkdown: anno.labelMarkdown,
      categoryId: anno.categoryId || null,
      targetNodeId: anno.targetNode?.id || null,
      targetNodeName: targetNode?.name || null
    };
  });
}

/**
 * Helper function to process color objects
 * @param {Object} color - Figma Color object
 * @returns {Object} Processed color object with RGBA values
 */
function processColor(color) {
  if (!color) return null;
  
  return {
    r: color.r || 0,
    g: color.g || 0,
    b: color.b || 0,
    a: color.a !== undefined ? color.a : 1
  };
} 