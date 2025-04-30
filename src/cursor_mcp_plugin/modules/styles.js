// styles.js - Functions for working with Figma styles

/**
 * Get all styles from the current Figma document
 * @returns {Promise<Object>} Styles information
 */
export async function getStyles() {
  try {
    // Define style types to collect
    const styleTypes = ['PAINT', 'TEXT', 'EFFECT', 'GRID'];
    const allStyles = {};
    
    // Process each style type
    for (const styleType of styleTypes) {
      const styles = figma.getLocalStyles(styleType);
      
      if (!styles || styles.length === 0) {
        allStyles[styleType.toLowerCase()] = [];
        continue;
      }
      
      // Process styles of this type
      allStyles[styleType.toLowerCase()] = styles.map(style => {
        const baseStyle = {
          id: style.id,
          key: style.key,
          name: style.name,
          description: style.description || null,
          remote: style.remote || false
        };
        
        // Add type-specific properties
        switch (styleType) {
          case 'PAINT':
            if (style.paints) {
              baseStyle.paints = style.paints.map(paint => {
                return processPaint(paint);
              });
            }
            break;
            
          case 'TEXT':
            if (style.fontName) {
              baseStyle.fontFamily = style.fontName.family;
              baseStyle.fontStyle = style.fontName.style;
            }
            if (style.fontSize) baseStyle.fontSize = style.fontSize;
            if (style.letterSpacing) baseStyle.letterSpacing = style.letterSpacing;
            if (style.lineHeight) baseStyle.lineHeight = style.lineHeight;
            if (style.paragraphIndent) baseStyle.paragraphIndent = style.paragraphIndent;
            if (style.paragraphSpacing) baseStyle.paragraphSpacing = style.paragraphSpacing;
            if (style.textCase) baseStyle.textCase = style.textCase;
            if (style.textDecoration) baseStyle.textDecoration = style.textDecoration;
            break;
            
          case 'EFFECT':
            if (style.effects) {
              baseStyle.effects = style.effects.map(effect => {
                return processEffect(effect);
              });
            }
            break;
            
          case 'GRID':
            if (style.layoutGrids) {
              baseStyle.layoutGrids = style.layoutGrids.map(grid => {
                return {
                  pattern: grid.pattern,
                  sectionSize: grid.sectionSize,
                  visible: grid.visible,
                  color: grid.color ? processColor(grid.color) : null,
                  alignment: grid.alignment,
                  gutterSize: grid.gutterSize,
                  offset: grid.offset,
                  count: grid.count
                };
              });
            }
            break;
        }
        
        return baseStyle;
      });
    }
    
    // Return result
    return {
      success: true,
      styles: allStyles,
      counts: {
        paint: allStyles.paint?.length || 0,
        text: allStyles.text?.length || 0,
        effect: allStyles.effect?.length || 0,
        grid: allStyles.grid?.length || 0,
        total: (allStyles.paint?.length || 0) + 
               (allStyles.text?.length || 0) + 
               (allStyles.effect?.length || 0) + 
               (allStyles.grid?.length || 0)
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
 * Helper function to process paint objects
 * @param {Object} paint - Figma Paint object
 * @returns {Object} Processed paint object
 */
function processPaint(paint) {
  if (!paint) return null;
  
  const result = {
    type: paint.type
  };
  
  switch (paint.type) {
    case 'SOLID':
      if (paint.color) {
        result.color = processColor(paint.color);
      }
      if (paint.opacity !== undefined) {
        result.opacity = paint.opacity;
      }
      break;
      
    case 'GRADIENT_LINEAR':
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_ANGULAR':
    case 'GRADIENT_DIAMOND':
      result.gradientStops = paint.gradientStops?.map(stop => ({
        position: stop.position,
        color: processColor(stop.color)
      }));
      result.gradientTransform = paint.gradientTransform;
      break;
      
    case 'IMAGE':
      result.scaleMode = paint.scaleMode;
      result.imageRef = paint.imageRef;
      break;
  }
  
  return result;
}

/**
 * Helper function to process effect objects
 * @param {Object} effect - Figma Effect object
 * @returns {Object} Processed effect object
 */
function processEffect(effect) {
  if (!effect) return null;
  
  const result = {
    type: effect.type,
    visible: effect.visible !== false
  };
  
  switch (effect.type) {
    case 'DROP_SHADOW':
    case 'INNER_SHADOW':
      result.color = effect.color ? processColor(effect.color) : null;
      result.offset = effect.offset;
      result.radius = effect.radius;
      result.spread = effect.spread;
      break;
      
    case 'LAYER_BLUR':
    case 'BACKGROUND_BLUR':
      result.radius = effect.radius;
      break;
  }
  
  return result;
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