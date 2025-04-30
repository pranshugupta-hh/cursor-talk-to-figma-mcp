// index.js - Exports all functions from the modules

// Import modules
import * as stylingModule from './styling.js';
import * as layoutModule from './layout.js';
import * as nodesModule from './nodes.js';
import * as textModule from './text.js';
import * as componentsModule from './components.js';
import * as shapesModule from './shapes.js';

// Re-export all modules
export const styling = stylingModule;
export const layout = layoutModule;
export const nodes = nodesModule;
export const text = textModule;
export const components = componentsModule;
export const shapes = shapesModule;

// Export individual functions grouped by category
export const figma = {
  // Styling functions
  setFillColor: stylingModule.setFillColor,
  setStrokeColor: stylingModule.setStrokeColor,
  setCornerRadius: stylingModule.setCornerRadius,
  getStyles: stylingModule.getStyles,
  
  // Layout functions
  setLayoutMode: layoutModule.setLayoutMode,
  setPadding: layoutModule.setPadding,
  setAxisAlign: layoutModule.setAxisAlign,
  setLayoutSizing: layoutModule.setLayoutSizing,
  setItemSpacing: layoutModule.setItemSpacing,
  
  // Node manipulation functions
  moveNode: nodesModule.moveNode,
  resizeNode: nodesModule.resizeNode,
  cloneNode: nodesModule.cloneNode,
  deleteNode: nodesModule.deleteNode,
  deleteMultipleNodes: nodesModule.deleteMultipleNodes,
  getNodeInfo: nodesModule.getNodeInfo,
  getNodesInfo: nodesModule.getNodesInfo,
  
  // Text functions
  createText: textModule.createText,
  setTextContent: textModule.setTextContent,
  setMultipleTextContents: textModule.setMultipleTextContents,
  scanTextNodes: textModule.scanTextNodes,
  
  // Component functions
  getLocalComponents: componentsModule.getLocalComponents,
  createComponentInstance: componentsModule.createComponentInstance,
  getInstanceOverrides: componentsModule.getInstanceOverrides,
  setInstanceOverrides: componentsModule.setInstanceOverrides,
  
  // Shape functions
  createRectangle: shapesModule.createRectangle,
  createFrame: shapesModule.createFrame,
  scanNodesByTypes: shapesModule.scanNodesByTypes
}; 