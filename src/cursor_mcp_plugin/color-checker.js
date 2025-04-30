// json-two.html?f=000000&b=ffffff

var foregroundHex;
var backgroundHex;
var colorData;

// Check if param exists
var field = 'f';
var url = window.location.href;
if(url.indexOf('?' + field + '=') != -1) {
  // return true;
  foregroundHex = getUrlVariable('f');
  backgroundHex = getUrlVariable('b');
  checkColors(foregroundHex, backgroundHex);

} else if(url.indexOf('&' + field + '=') != -1) {
  // return true;
  foregroundHex = getUrlVariable('f');
  backgroundHex = getUrlVariable('b');
  checkColors(foregroundHex, backgroundHex);
}

// Get Url Parameter
function getUrlVariable(param) {
  var vars = {};
  window.location.href.replace( location.hash, '' ).replace(
    /[?&]+([^=&]+)=?([^&]*)?/gi, // regexp
    function( m, key, value ) { // callback
      vars[key] = value !== undefined ? value : '';
    }
  );
  if ( param ) {
    return vars[param] ? vars[param] : null;
  }
  return vars;
};

/**
 * Check contrast ratio between two colors, accounting for alpha values
 * @param {string} foregroundColor - Hex color of the foreground
 * @param {string} backgroundColor - Hex color of the background
 * @param {number} foregroundAlpha - Alpha value of foreground (0-1)
 * @param {number} backgroundAlpha - Alpha value of background (0-1)
 * @param {string} baseColor - Hex color of the canvas/page background (default white)
 */
function checkColors(foregroundColor, backgroundColor, foregroundAlpha = 1, backgroundAlpha = 1, baseColor = "#FFFFFF") {
  if (foregroundColor && backgroundColor) {
    foregroundHex = foregroundColor;
    backgroundHex = backgroundColor;
  }

  // Hex to RGB conversion
  function hexToRgb(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Alpha blending function: computes the resulting RGB values when a color with alpha is placed over another color
  function blendWithAlpha(color, alpha, background) {
    // For each component (r,g,b), blend using alpha
    return {
      r: Math.round(color.r * alpha + background.r * (1 - alpha)),
      g: Math.round(color.g * alpha + background.g * (1 - alpha)),
      b: Math.round(color.b * alpha + background.b * (1 - alpha))
    };
  }

  // Get RGB values from hex
  var foregroundRgb = hexToRgb(foregroundHex);
  var backgroundRgb = hexToRgb(backgroundHex);
  var baseRgb = hexToRgb(baseColor);

  // Handle alpha blending
  // First blend background with base color if it has opacity
  var effectiveBackgroundRgb = backgroundAlpha < 1 
    ? blendWithAlpha(backgroundRgb, backgroundAlpha, baseRgb) 
    : backgroundRgb;

  // Then blend foreground with effective background
  var effectiveForegroundRgb = foregroundAlpha < 1 
    ? blendWithAlpha(foregroundRgb, foregroundAlpha, effectiveBackgroundRgb) 
    : foregroundRgb;

  // Convert blended RGB values to arrays for luminance calculation
  var foregroundColorRgba = [effectiveForegroundRgb.r, effectiveForegroundRgb.g, effectiveForegroundRgb.b, 1];
  var backgroundColorRgba = [effectiveBackgroundRgb.r, effectiveBackgroundRgb.g, effectiveBackgroundRgb.b, 1];

  // Calculate luminance (perceived brightness)
  function luma(rgbaColor) {
    var rgb = [...rgbaColor]; // Clone the array
    for (var i = 0; i < 3; i++) {
      rgb[i] = rgb[i] / 255;
      rgb[i] = rgb[i] < .03928 ? rgb[i] / 12.92 : Math.pow((rgb[i] + .055) / 1.055, 2.4);
    }
    return .2126 * rgb[0] + .7152 * rgb[1] + 0.0722 * rgb[2];
  }

  var foregroundLuma = luma(foregroundColorRgba);
  var backgroundLuma = luma(backgroundColorRgba);

  // Calculate contrast ratio per WCAG 2.0 formula
  function checkContrast() {
    var l1 = Math.max(foregroundLuma, backgroundLuma) + 0.05;
    var l2 = Math.min(foregroundLuma, backgroundLuma) + 0.05;
    return l1 / l2;
  }

  var ratio = checkContrast();
  var ratioRounded = ratio.toPrecision(3);

  function checkRating(value) {
    if (ratioRounded >= value) {
      return true;
    } else {
      return false;
    }
  }

  var aaHeadline = checkRating(3);
  var aaaHeadline = checkRating(4.5);
  var aaText = checkRating(4.5);
  var aaaText = checkRating(7);
  var aaComponent = checkRating(3);

  // Return color data with effective RGB values after alpha blending
  colorData = {
    "foregroundHex": foregroundHex,
    "backgroundHex": backgroundHex,
    "foregroundAlpha": foregroundAlpha,
    "backgroundAlpha": backgroundAlpha,
    "effectiveForegroundRgb": effectiveForegroundRgb.r + ", " + effectiveForegroundRgb.g + ", " + effectiveForegroundRgb.b,
    "effectiveBackgroundRgb": effectiveBackgroundRgb.r + ", " + effectiveBackgroundRgb.g + ", " + effectiveBackgroundRgb.b,
    "foregroundRgb": foregroundRgb.r + ", " + foregroundRgb.g + ", " + foregroundRgb.b,
    "backgroundRgb": backgroundRgb.r + ", " + backgroundRgb.g + ", " + backgroundRgb.b,
    "contrast": ratioRounded,
    "aaHeadline": aaHeadline,
    "aaaHeadline": aaaHeadline,
    "aaText": aaText,
    "aaaText": aaaText,
    "aaComponent": aaComponent,
    "foregroundLuma": foregroundLuma,
    "backgroundLuma": backgroundLuma
  };
  
  return colorData;
};

// Function to calculate contrast ratio directly from RGBA values
function getContrastRatio(fgR, fgG, fgB, fgA, bgR, bgG, bgB, bgA, baseColor = "#FFFFFF") {
  // Convert RGB to hex for the foreground and background
  const fgHex = rgbToHex(fgR, fgG, fgB);
  const bgHex = rgbToHex(bgR, bgG, bgB);
  
  // Calculate contrast using our main function
  return checkColors(fgHex, bgHex, fgA, bgA, baseColor);
}

// Helper function to convert RGB to hex
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// console.log(colorData);
 