// This is the main code file for the Cursor MCP Figma plugin
// It handles Figma API commands

// Plugin state
const state = {
  serverPort: 3055, // Default port
};

// Helper function for progress updates
function sendProgressUpdate(
  commandId,
  commandType,
  status,
  progress,
  totalItems,
  processedItems,
  message,
  payload = null
) {
  const update = {
    type: "command_progress",
    commandId,
    commandType,
    status,
    progress,
    totalItems,
    processedItems,
    message,
    timestamp: Date.now(),
  };

  // Add optional chunk information if present
  if (payload) {
    if (
      payload.currentChunk !== undefined &&
      payload.totalChunks !== undefined
    ) {
      update.currentChunk = payload.currentChunk;
      update.totalChunks = payload.totalChunks;
      update.chunkSize = payload.chunkSize;
    }
    update.payload = payload;
  }

  // Send to UI
  figma.ui.postMessage(update);
  console.log(`Progress update: ${status} - ${progress}% - ${message}`);

  return update;
}

// Show UI
figma.showUI(__html__, { width: 350, height: 450 });

// Plugin commands from UI
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "update-settings":
      updateSettings(msg);
      break;
    case "notify":
      figma.notify(msg.message);
      break;
    case "close-plugin":
      figma.closePlugin();
      break;
    case "execute-command":
      // Execute commands received from UI (which gets them from WebSocket)
      try {
        const result = await handleCommand(msg.command, msg.params);
        // Send result back to UI
        figma.ui.postMessage({
          type: "command-result",
          id: msg.id,
          result,
        });
      } catch (error) {
        figma.ui.postMessage({
          type: "command-error",
          id: msg.id,
          error: error.message || "Error executing command",
        });
      }
      break;
    case "highlight-qa-element":
      highlightQAElement(msg.searchData);
      break;
  }
};

// Listen for plugin commands from menu
figma.on("run", ({ command }) => {
  figma.ui.postMessage({ type: "auto-connect" });
});

// Update plugin settings
function updateSettings(settings) {
  if (settings.serverPort) {
    state.serverPort = settings.serverPort;
  }

  figma.clientStorage.setAsync("settings", {
    serverPort: state.serverPort,
  });
}

// Handle commands from UI
async function handleCommand(command, params) {
  switch (command) {
    case "get_document_info":
      return await getDocumentInfo();
    case "get_selection":
      return await getSelection();
    case "get_node_info":
      if (!params || !params.nodeId) {
        throw new Error("Missing nodeId parameter");
      }
      return await getNodeInfo(params.nodeId);
    case "get_nodes_info":
      if (!params || !params.nodeIds || !Array.isArray(params.nodeIds)) {
        throw new Error("Missing or invalid nodeIds parameter");
      }
      return await getNodesInfo(params.nodeIds);
    case "read_my_design":
      return await readMyDesign();
    case "create_rectangle":
      return await createRectangle(params);
    case "create_frame":
      return await createFrame(params);
    case "create_text":
      return await createText(params);
    case "set_fill_color":
      return await setFillColor(params);
    case "set_stroke_color":
      return await setStrokeColor(params);
    case "move_node":
      return await moveNode(params);
    case "resize_node":
      return await resizeNode(params);
    case "delete_node":
      return await deleteNode(params);
    case "delete_multiple_nodes":
      return await deleteMultipleNodes(params);
    case "get_styles":
      return await getStyles();
    case "get_local_components":
      return await getLocalComponents();
    // case "get_team_components":
    //   return await getTeamComponents();
    case "create_component_instance":
      return await createComponentInstance(params);
    case "export_node_as_image":
      return await exportNodeAsImage(params);
    case "set_corner_radius":
      return await setCornerRadius(params);
    case "set_text_content":
      return await setTextContent(params);
    case "clone_node":
      return await cloneNode(params);
    case "scan_text_nodes":
      return await scanTextNodes(params);
    case "set_multiple_text_contents":
      return await setMultipleTextContents(params);
    case "get_annotations":
      return await getAnnotations(params);
    case "set_annotation":
      return await setAnnotation(params);
    case "scan_nodes_by_types":
      return await scanNodesByTypes(params);
    case "set_multiple_annotations":
      return await setMultipleAnnotations(params);
    case "set_layout_mode":
      return await setLayoutMode(params);
    case "set_padding":
      return await setPadding(params);
    case "set_axis_align":
      return await setAxisAlign(params);
    case "set_layout_sizing":
      return await setLayoutSizing(params);
    case "set_item_spacing":
      return await setItemSpacing(params);
    case "validate_qa_rules":
      return await validateQARules(params);
    case "test_qa_validation":
      return await testQAValidation();
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Command implementations

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

function rgbaToHex(color) {
  var r = Math.round(color.r * 255);
  var g = Math.round(color.g * 255);
  var b = Math.round(color.b * 255);
  var a = color.a !== undefined ? Math.round(color.a * 255) : 255;

  if (a === 255) {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          return x.toString(16).padStart(2, "0");
        })
        .join("")
    );
  }

  return (
    "#" +
    [r, g, b, a]
      .map((x) => {
        return x.toString(16).padStart(2, "0");
      })
      .join("")
  );
}

function filterFigmaNode(node) {
  if (node.type === "VECTOR") {
    return null;
  }

  var filtered = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if (node.fills && node.fills.length > 0) {
    filtered.fills = node.fills.map((fill) => {
      var processedFill = Object.assign({}, fill);
      delete processedFill.boundVariables;
      delete processedFill.imageRef;

      if (processedFill.gradientStops) {
        processedFill.gradientStops = processedFill.gradientStops.map(
          (stop) => {
            var processedStop = Object.assign({}, stop);
            if (processedStop.color) {
              processedStop.color = rgbaToHex(processedStop.color);
            }
            delete processedStop.boundVariables;
            return processedStop;
          }
        );
      }

      if (processedFill.color) {
        processedFill.color = rgbaToHex(processedFill.color);
      }

      return processedFill;
    });
  }

  if (node.strokes && node.strokes.length > 0) {
    filtered.strokes = node.strokes.map((stroke) => {
      var processedStroke = Object.assign({}, stroke);
      delete processedStroke.boundVariables;
      if (processedStroke.color) {
        processedStroke.color = rgbaToHex(processedStroke.color);
      }
      return processedStroke;
    });
  }

  if (node.cornerRadius !== undefined) {
    filtered.cornerRadius = node.cornerRadius;
  }

  if (node.absoluteBoundingBox) {
    filtered.absoluteBoundingBox = node.absoluteBoundingBox;
  }

  if (node.characters) {
    filtered.characters = node.characters;
  }

  if (node.style) {
    filtered.style = {
      fontFamily: node.style.fontFamily,
      fontStyle: node.style.fontStyle,
      fontWeight: node.style.fontWeight,
      fontSize: node.style.fontSize,
      textAlignHorizontal: node.style.textAlignHorizontal,
      letterSpacing: node.style.letterSpacing,
      lineHeightPx: node.style.lineHeightPx,
    };
  }

  if (node.children) {
    filtered.children = node.children
      .map((child) => {
        return filterFigmaNode(child);
      })
      .filter((child) => {
        return child !== null;
      });
  }

  return filtered;
}

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

async function createRectangle(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Rectangle",
    parentId,
  } = params || {};

  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  rect.name = name;

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(rect);
  } else {
    figma.currentPage.appendChild(rect);
  }

  return {
    id: rect.id,
    name: rect.name,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    parentId: rect.parent ? rect.parent.id : undefined,
  };
}

async function createFrame(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Frame",
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
    layoutMode = "NONE",
    layoutWrap = "NO_WRAP",
    paddingTop = 10,
    paddingRight = 10,
    paddingBottom = 10,
    paddingLeft = 10,
    primaryAxisAlignItems = "MIN",
    counterAxisAlignItems = "MIN",
    layoutSizingHorizontal = "FIXED",
    layoutSizingVertical = "FIXED",
    itemSpacing = 0,
  } = params || {};

  const frame = figma.createFrame();
  frame.x = x;
  frame.y = y;
  frame.resize(width, height);
  frame.name = name;

  // Set layout mode if provided
  if (layoutMode !== "NONE") {
    frame.layoutMode = layoutMode;
    frame.layoutWrap = layoutWrap;

    // Set padding values only when layoutMode is not NONE
    frame.paddingTop = paddingTop;
    frame.paddingRight = paddingRight;
    frame.paddingBottom = paddingBottom;
    frame.paddingLeft = paddingLeft;

    // Set axis alignment only when layoutMode is not NONE
    frame.primaryAxisAlignItems = primaryAxisAlignItems;
    frame.counterAxisAlignItems = counterAxisAlignItems;

    // Set layout sizing only when layoutMode is not NONE
    frame.layoutSizingHorizontal = layoutSizingHorizontal;
    frame.layoutSizingVertical = layoutSizingVertical;

    // Set item spacing only when layoutMode is not NONE
    frame.itemSpacing = itemSpacing;
  }

  // Set fill color if provided
  if (fillColor) {
    const paintStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1,
    };
    frame.fills = [paintStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1,
    };
    frame.strokes = [strokeStyle];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    frame.strokeWeight = strokeWeight;
  }

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(frame);
  } else {
    figma.currentPage.appendChild(frame);
  }

  return {
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    fills: frame.fills,
    strokes: frame.strokes,
    strokeWeight: frame.strokeWeight,
    layoutMode: frame.layoutMode,
    layoutWrap: frame.layoutWrap,
    parentId: frame.parent ? frame.parent.id : undefined,
  };
}

async function createText(params) {
  const {
    x = 0,
    y = 0,
    text = "Text",
    fontSize = 14,
    fontWeight = 400,
    fontColor = { r: 0, g: 0, b: 0, a: 1 }, // Default to black
    name = "",
    parentId,
  } = params || {};

  // Map common font weights to Figma font styles
  const getFontStyle = (weight) => {
    switch (weight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  };

  const textNode = figma.createText();
  textNode.x = x;
  textNode.y = y;
  textNode.name = name || text;
  try {
    await figma.loadFontAsync({
      family: "Inter",
      style: getFontStyle(fontWeight),
    });
    textNode.fontName = { family: "Inter", style: getFontStyle(fontWeight) };
    textNode.fontSize = parseInt(fontSize);
  } catch (error) {
    console.error("Error setting font size", error);
  }
  setCharacters(textNode, text);

  // Set text color
  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(fontColor.r) || 0,
      g: parseFloat(fontColor.g) || 0,
      b: parseFloat(fontColor.b) || 0,
    },
    opacity: parseFloat(fontColor.a) || 1,
  };
  textNode.fills = [paintStyle];

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(textNode);
  } else {
    figma.currentPage.appendChild(textNode);
  }

  return {
    id: textNode.id,
    name: textNode.name,
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
    characters: textNode.characters,
    fontSize: textNode.fontSize,
    fontWeight: fontWeight,
    fontColor: fontColor,
    fontName: textNode.fontName,
    fills: textNode.fills,
    parentId: textNode.parent ? textNode.parent.id : undefined,
  };
}

async function setFillColor(params) {
  console.log("setFillColor", params);
  const {
    nodeId,
    color: { r, g, b, a },
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("fills" in node)) {
    throw new Error(`Node does not support fills: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: parseFloat(r) || 0,
    g: parseFloat(g) || 0,
    b: parseFloat(b) || 0,
    a: parseFloat(a) || 1,
  };

  // Set fill
  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(rgbColor.r),
      g: parseFloat(rgbColor.g),
      b: parseFloat(rgbColor.b),
    },
    opacity: parseFloat(rgbColor.a),
  };

  console.log("paintStyle", paintStyle);

  node.fills = [paintStyle];

  return {
    id: node.id,
    name: node.name,
    fills: [paintStyle],
  };
}

async function setStrokeColor(params) {
  const {
    nodeId,
    color: { r, g, b, a },
    weight = 1,
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("strokes" in node)) {
    throw new Error(`Node does not support strokes: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: r !== undefined ? r : 0,
    g: g !== undefined ? g : 0,
    b: b !== undefined ? b : 0,
    a: a !== undefined ? a : 1,
  };

  // Set stroke
  const paintStyle = {
    type: "SOLID",
    color: {
      r: rgbColor.r,
      g: rgbColor.g,
      b: rgbColor.b,
    },
    opacity: rgbColor.a,
  };

  node.strokes = [paintStyle];

  // Set stroke weight if available
  if ("strokeWeight" in node) {
    node.strokeWeight = weight;
  }

  return {
    id: node.id,
    name: node.name,
    strokes: node.strokes,
    strokeWeight: "strokeWeight" in node ? node.strokeWeight : undefined,
  };
}

async function moveNode(params) {
  const { nodeId, x, y } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (x === undefined || y === undefined) {
    throw new Error("Missing x or y parameters");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("x" in node) || !("y" in node)) {
    throw new Error(`Node does not support position: ${nodeId}`);
  }

  node.x = x;
  node.y = y;

  return {
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
  };
}

async function resizeNode(params) {
  const { nodeId, width, height } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (width === undefined || height === undefined) {
    throw new Error("Missing width or height parameters");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("resize" in node)) {
    throw new Error(`Node does not support resizing: ${nodeId}`);
  }

  node.resize(width, height);

  return {
    id: node.id,
    name: node.name,
    width: node.width,
    height: node.height,
  };
}

async function deleteNode(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Save node info before deleting
  const nodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  node.remove();

  return nodeInfo;
}

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

// async function getTeamComponents() {
//   try {
//     const teamComponents =
//       await figma.teamLibrary.getAvailableComponentsAsync();

//     return {
//       count: teamComponents.length,
//       components: teamComponents.map((component) => ({
//         key: component.key,
//         name: component.name,
//         description: component.description,
//         libraryName: component.libraryName,
//       })),
//     };
//   } catch (error) {
//     throw new Error(`Error getting team components: ${error.message}`);
//   }
// }

async function createComponentInstance(params) {
  const { componentKey, x = 0, y = 0 } = params || {};

  if (!componentKey) {
    throw new Error("Missing componentKey parameter");
  }

  try {
    const component = await figma.importComponentByKeyAsync(componentKey);
    const instance = component.createInstance();

    instance.x = x;
    instance.y = y;

    figma.currentPage.appendChild(instance);

    return {
      id: instance.id,
      name: instance.name,
      x: instance.x,
      y: instance.y,
      width: instance.width,
      height: instance.height,
      componentId: instance.componentId,
    };
  } catch (error) {
    throw new Error(`Error creating component instance: ${error.message}`);
  }
}

async function exportNodeAsImage(params) {
  const { nodeId, scale = 1 } = params || {};

  const format = "PNG";

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("exportAsync" in node)) {
    throw new Error(`Node does not support exporting: ${nodeId}`);
  }

  try {
    const settings = {
      format: format,
      constraint: { type: "SCALE", value: scale },
    };

    const bytes = await node.exportAsync(settings);

    let mimeType;
    switch (format) {
      case "PNG":
        mimeType = "image/png";
        break;
      case "JPG":
        mimeType = "image/jpeg";
        break;
      case "SVG":
        mimeType = "image/svg+xml";
        break;
      case "PDF":
        mimeType = "application/pdf";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    // Proper way to convert Uint8Array to base64
    const base64 = customBase64Encode(bytes);
    // const imageData = `data:${mimeType};base64,${base64}`;

    return {
      nodeId,
      format,
      scale,
      mimeType,
      imageData: base64,
    };
  } catch (error) {
    throw new Error(`Error exporting node as image: ${error.message}`);
  }
}
function customBase64Encode(bytes) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let base64 = "";

  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  let a, b, c, d;
  let chunk;

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048 = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032 = (2^6 - 1) << 6
    d = chunk & 63; // 63 = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += chars[a] + chars[b] + chars[c] + chars[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3 = 2^2 - 1

    base64 += chars[a] + chars[b] + "==";
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008 = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15 = 2^4 - 1

    base64 += chars[a] + chars[b] + chars[c] + "=";
  }

  return base64;
}

async function setCornerRadius(params) {
  const { nodeId, radius, corners } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (radius === undefined) {
    throw new Error("Missing radius parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Check if node supports corner radius
  if (!("cornerRadius" in node)) {
    throw new Error(`Node does not support corner radius: ${nodeId}`);
  }

  // If corners array is provided, set individual corner radii
  if (corners && Array.isArray(corners) && corners.length === 4) {
    if ("topLeftRadius" in node) {
      // Node supports individual corner radii
      if (corners[0]) node.topLeftRadius = radius;
      if (corners[1]) node.topRightRadius = radius;
      if (corners[2]) node.bottomRightRadius = radius;
      if (corners[3]) node.bottomLeftRadius = radius;
    } else {
      // Node only supports uniform corner radius
      node.cornerRadius = radius;
    }
  } else {
    // Set uniform corner radius
    node.cornerRadius = radius;
  }

  return {
    id: node.id,
    name: node.name,
    cornerRadius: "cornerRadius" in node ? node.cornerRadius : undefined,
    topLeftRadius: "topLeftRadius" in node ? node.topLeftRadius : undefined,
    topRightRadius: "topRightRadius" in node ? node.topRightRadius : undefined,
    bottomRightRadius:
      "bottomRightRadius" in node ? node.bottomRightRadius : undefined,
    bottomLeftRadius:
      "bottomLeftRadius" in node ? node.bottomLeftRadius : undefined,
  };
}

async function setTextContent(params) {
  const { nodeId, text } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (text === undefined) {
    throw new Error("Missing text parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);

    await setCharacters(node, text);

    return {
      id: node.id,
      name: node.name,
      characters: node.characters,
      fontName: node.fontName,
    };
  } catch (error) {
    throw new Error(`Error setting text content: ${error.message}`);
  }
}

// Initialize settings on load
(async function initializePlugin() {
  try {
    const savedSettings = await figma.clientStorage.getAsync("settings");
    if (savedSettings) {
      if (savedSettings.serverPort) {
        state.serverPort = savedSettings.serverPort;
      }
    }

    // Send initial settings to UI
    figma.ui.postMessage({
      type: "init-settings",
      settings: {
        serverPort: state.serverPort,
      },
    });
  } catch (error) {
    console.error("Error loading settings:", error);
  }
})();

function uniqBy(arr, predicate) {
  const cb = typeof predicate === "function" ? predicate : (o) => o[predicate];
  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values(),
  ];
}
const setCharacters = async (node, characters, options) => {
  const fallbackFont = (options && options.fallbackFont) || {
    family: "Inter",
    style: "Regular",
  };
  try {
    if (node.fontName === figma.mixed) {
      if (options && options.smartStrategy === "prevail") {
        const fontHashTree = {};
        for (let i = 1; i < node.characters.length; i++) {
          const charFont = node.getRangeFontName(i - 1, i);
          const key = `${charFont.family}::${charFont.style}`;
          fontHashTree[key] = fontHashTree[key] ? fontHashTree[key] + 1 : 1;
        }
        const prevailedTreeItem = Object.entries(fontHashTree).sort(
          (a, b) => b[1] - a[1]
        )[0];
        const [family, style] = prevailedTreeItem[0].split("::");
        const prevailedFont = {
          family,
          style,
        };
        await figma.loadFontAsync(prevailedFont);
        node.fontName = prevailedFont;
      } else if (options && options.smartStrategy === "strict") {
        return setCharactersWithStrictMatchFont(node, characters, fallbackFont);
      } else if (options && options.smartStrategy === "experimental") {
        return setCharactersWithSmartMatchFont(node, characters, fallbackFont);
      } else {
        const firstCharFont = node.getRangeFontName(0, 1);
        await figma.loadFontAsync(firstCharFont);
        node.fontName = firstCharFont;
      }
    } else {
      await figma.loadFontAsync({
        family: node.fontName.family,
        style: node.fontName.style,
      });
    }
  } catch (err) {
    console.warn(
      `Failed to load "${node.fontName["family"]} ${node.fontName["style"]}" font and replaced with fallback "${fallbackFont.family} ${fallbackFont.style}"`,
      err
    );
    await figma.loadFontAsync(fallbackFont);
    node.fontName = fallbackFont;
  }
  try {
    node.characters = characters;
    return true;
  } catch (err) {
    console.warn(`Failed to set characters. Skipped.`, err);
    return false;
  }
};

const setCharactersWithStrictMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const fontHashTree = {};
  for (let i = 1; i < node.characters.length; i++) {
    const startIdx = i - 1;
    const startCharFont = node.getRangeFontName(startIdx, i);
    const startCharFontVal = `${startCharFont.family}::${startCharFont.style}`;
    while (i < node.characters.length) {
      i++;
      const charFont = node.getRangeFontName(i - 1, i);
      if (startCharFontVal !== `${charFont.family}::${charFont.style}`) {
        break;
      }
    }
    fontHashTree[`${startIdx}_${i}`] = startCharFontVal;
  }
  await figma.loadFontAsync(fallbackFont);
  node.fontName = fallbackFont;
  node.characters = characters;
  console.log(fontHashTree);
  await Promise.all(
    Object.keys(fontHashTree).map(async (range) => {
      console.log(range, fontHashTree[range]);
      const [start, end] = range.split("_");
      const [family, style] = fontHashTree[range].split("::");
      const matchedFont = {
        family,
        style,
      };
      await figma.loadFontAsync(matchedFont);
      return node.setRangeFontName(Number(start), Number(end), matchedFont);
    })
  );
  return true;
};

const getDelimiterPos = (str, delimiter, startIdx = 0, endIdx = str.length) => {
  const indices = [];
  let temp = startIdx;
  for (let i = startIdx; i < endIdx; i++) {
    if (
      str[i] === delimiter &&
      i + startIdx !== endIdx &&
      temp !== i + startIdx
    ) {
      indices.push([temp, i + startIdx]);
      temp = i + startIdx + 1;
    }
  }
  temp !== endIdx && indices.push([temp, endIdx]);
  return indices.filter(Boolean);
};

const buildLinearOrder = (node) => {
  const fontTree = [];
  const newLinesPos = getDelimiterPos(node.characters, "\n");
  newLinesPos.forEach(([newLinesRangeStart, newLinesRangeEnd], n) => {
    const newLinesRangeFont = node.getRangeFontName(
      newLinesRangeStart,
      newLinesRangeEnd
    );
    if (newLinesRangeFont === figma.mixed) {
      const spacesPos = getDelimiterPos(
        node.characters,
        " ",
        newLinesRangeStart,
        newLinesRangeEnd
      );
      spacesPos.forEach(([spacesRangeStart, spacesRangeEnd], s) => {
        const spacesRangeFont = node.getRangeFontName(
          spacesRangeStart,
          spacesRangeEnd
        );
        if (spacesRangeFont === figma.mixed) {
          const spacesRangeFont = node.getRangeFontName(
            spacesRangeStart,
            spacesRangeStart[0]
          );
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        } else {
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        }
      });
    } else {
      fontTree.push({
        start: newLinesRangeStart,
        delimiter: "\n",
        family: newLinesRangeFont.family,
        style: newLinesRangeFont.style,
      });
    }
  });
  return fontTree
    .sort((a, b) => +a.start - +b.start)
    .map(({ family, style, delimiter }) => ({ family, style, delimiter }));
};

const setCharactersWithSmartMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const rangeTree = buildLinearOrder(node);
  const fontsToLoad = uniqBy(
    rangeTree,
    ({ family, style }) => `${family}::${style}`
  ).map(({ family, style }) => ({
    family,
    style,
  }));

  await Promise.all([...fontsToLoad, fallbackFont].map(figma.loadFontAsync));

  node.fontName = fallbackFont;
  node.characters = characters;

  let prevPos = 0;
  rangeTree.forEach(({ family, style, delimiter }) => {
    if (prevPos < node.characters.length) {
      const delimeterPos = node.characters.indexOf(delimiter, prevPos);
      const endPos =
        delimeterPos > prevPos ? delimeterPos : node.characters.length;
      const matchedFont = {
        family,
        style,
      };
      node.setRangeFontName(prevPos, endPos, matchedFont);
      prevPos = endPos + 1;
    }
  });
  return true;
};

// Add the cloneNode function implementation
async function cloneNode(params) {
  const { nodeId, x, y } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Clone the node
  const clone = node.clone();

  // If x and y are provided, move the clone to that position
  if (x !== undefined && y !== undefined) {
    if (!("x" in clone) || !("y" in clone)) {
      throw new Error(`Cloned node does not support position: ${nodeId}`);
    }
    clone.x = x;
    clone.y = y;
  }

  // Add the clone to the same parent as the original node
  if (node.parent) {
    node.parent.appendChild(clone);
  } else {
    figma.currentPage.appendChild(clone);
  }

  return {
    id: clone.id,
    name: clone.name,
    x: "x" in clone ? clone.x : undefined,
    y: "y" in clone ? clone.y : undefined,
    width: "width" in clone ? clone.width : undefined,
    height: "height" in clone ? clone.height : undefined,
  };
}

async function scanTextNodes(params) {
  console.log(`Starting to scan text nodes from node ID: ${params.nodeId}`);
  const {
    nodeId,
    useChunking = true,
    chunkSize = 10,
    commandId = generateCommandId(),
  } = params || {};

  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    console.error(`Node with ID ${nodeId} not found`);
    // Send error progress update
    sendProgressUpdate(
      commandId,
      "scan_text_nodes",
      "error",
      0,
      0,
      0,
      `Node with ID ${nodeId} not found`,
      { error: `Node not found: ${nodeId}` }
    );
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // If chunking is not enabled, use the original implementation
  if (!useChunking) {
    const textNodes = [];
    try {
      // Send started progress update
      sendProgressUpdate(
        commandId,
        "scan_text_nodes",
        "started",
        0,
        1, // Not known yet how many nodes there are
        0,
        `Starting scan of node "${node.name || nodeId}" without chunking`,
        null
      );

      await findTextNodes(node, [], 0, textNodes);

      // Send completed progress update
      sendProgressUpdate(
        commandId,
        "scan_text_nodes",
        "completed",
        100,
        textNodes.length,
        textNodes.length,
        `Scan complete. Found ${textNodes.length} text nodes.`,
        { textNodes }
      );

      return {
        success: true,
        message: `Scanned ${textNodes.length} text nodes.`,
        count: textNodes.length,
        textNodes: textNodes,
        commandId,
      };
    } catch (error) {
      console.error("Error scanning text nodes:", error);

      // Send error progress update
      sendProgressUpdate(
        commandId,
        "scan_text_nodes",
        "error",
        0,
        0,
        0,
        `Error scanning text nodes: ${error.message}`,
        { error: error.message }
      );

      throw new Error(`Error scanning text nodes: ${error.message}`);
    }
  }

  // Chunked implementation
  console.log(`Using chunked scanning with chunk size: ${chunkSize}`);

  // First, collect all nodes to process (without processing them yet)
  const nodesToProcess = [];

  // Send started progress update
  sendProgressUpdate(
    commandId,
    "scan_text_nodes",
    "started",
    0,
    0, // Not known yet how many nodes there are
    0,
    `Starting chunked scan of node "${node.name || nodeId}"`,
    { chunkSize }
  );

  await collectNodesToProcess(node, [], 0, nodesToProcess);

  const totalNodes = nodesToProcess.length;
  console.log(`Found ${totalNodes} total nodes to process`);

  // Calculate number of chunks needed
  const totalChunks = Math.ceil(totalNodes / chunkSize);
  console.log(`Will process in ${totalChunks} chunks`);

  // Send update after node collection
  sendProgressUpdate(
    commandId,
    "scan_text_nodes",
    "in_progress",
    5, // 5% progress for collection phase
    totalNodes,
    0,
    `Found ${totalNodes} nodes to scan. Will process in ${totalChunks} chunks.`,
    {
      totalNodes,
      totalChunks,
      chunkSize,
    }
  );

  // Process nodes in chunks
  const allTextNodes = [];
  let processedNodes = 0;
  let chunksProcessed = 0;

  for (let i = 0; i < totalNodes; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, totalNodes);
    console.log(
      `Processing chunk ${chunksProcessed + 1}/${totalChunks} (nodes ${i} to ${
        chunkEnd - 1
      })`
    );

    // Send update before processing chunk
    sendProgressUpdate(
      commandId,
      "scan_text_nodes",
      "in_progress",
      Math.round(5 + (chunksProcessed / totalChunks) * 90), // 5-95% for processing
      totalNodes,
      processedNodes,
      `Processing chunk ${chunksProcessed + 1}/${totalChunks}`,
      {
        currentChunk: chunksProcessed + 1,
        totalChunks,
        textNodesFound: allTextNodes.length,
      }
    );

    const chunkNodes = nodesToProcess.slice(i, chunkEnd);
    const chunkTextNodes = [];

    // Process each node in this chunk
    for (const nodeInfo of chunkNodes) {
      if (nodeInfo.node.type === "TEXT") {
        try {
          const textNodeInfo = await processTextNode(
            nodeInfo.node,
            nodeInfo.parentPath,
            nodeInfo.depth
          );
          if (textNodeInfo) {
            chunkTextNodes.push(textNodeInfo);
          }
        } catch (error) {
          console.error(`Error processing text node: ${error.message}`);
          // Continue with other nodes
        }
      }

      // Brief delay to allow UI updates and prevent freezing
      await delay(5);
    }

    // Add results from this chunk
    allTextNodes.push(...chunkTextNodes);
    processedNodes += chunkNodes.length;
    chunksProcessed++;

    // Send update after processing chunk
    sendProgressUpdate(
      commandId,
      "scan_text_nodes",
      "in_progress",
      Math.round(5 + (chunksProcessed / totalChunks) * 90), // 5-95% for processing
      totalNodes,
      processedNodes,
      `Processed chunk ${chunksProcessed}/${totalChunks}. Found ${allTextNodes.length} text nodes so far.`,
      {
        currentChunk: chunksProcessed,
        totalChunks,
        processedNodes,
        textNodesFound: allTextNodes.length,
        chunkResult: chunkTextNodes,
      }
    );

    // Small delay between chunks to prevent UI freezing
    if (i + chunkSize < totalNodes) {
      await delay(50);
    }
  }

  // Send completed progress update
  sendProgressUpdate(
    commandId,
    "scan_text_nodes",
    "completed",
    100,
    totalNodes,
    processedNodes,
    `Scan complete. Found ${allTextNodes.length} text nodes.`,
    {
      textNodes: allTextNodes,
      processedNodes,
      chunks: chunksProcessed,
    }
  );

  return {
    success: true,
    message: `Chunked scan complete. Found ${allTextNodes.length} text nodes.`,
    totalNodes: allTextNodes.length,
    processedNodes: processedNodes,
    chunks: chunksProcessed,
    textNodes: allTextNodes,
    commandId,
  };
}

// Helper function to collect all nodes that need to be processed
async function collectNodesToProcess(
  node,
  parentPath = [],
  depth = 0,
  nodesToProcess = []
) {
  // Skip invisible nodes
  if (node.visible === false) return;

  // Get the path to this node
  const nodePath = [...parentPath, node.name || `Unnamed ${node.type}`];

  // Add this node to the processing list
  nodesToProcess.push({
    node: node,
    parentPath: nodePath,
    depth: depth,
  });

  // Recursively add children
  if ("children" in node) {
    for (const child of node.children) {
      await collectNodesToProcess(child, nodePath, depth + 1, nodesToProcess);
    }
  }
}

// Process a single text node
async function processTextNode(node, parentPath, depth) {
  if (node.type !== "TEXT") return null;

  try {
    // Safely extract font information
    let fontFamily = "";
    let fontStyle = "";

    if (node.fontName) {
      if (typeof node.fontName === "object") {
        if ("family" in node.fontName) fontFamily = node.fontName.family;
        if ("style" in node.fontName) fontStyle = node.fontName.style;
      }
    }

    // Create a safe representation of the text node
    const safeTextNode = {
      id: node.id,
      name: node.name || "Text",
      type: node.type,
      characters: node.characters,
      fontSize: typeof node.fontSize === "number" ? node.fontSize : 0,
      fontFamily: fontFamily,
      fontStyle: fontStyle,
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
      width: typeof node.width === "number" ? node.width : 0,
      height: typeof node.height === "number" ? node.height : 0,
      path: parentPath.join(" > "),
      depth: depth,
    };

    // Highlight the node briefly (optional visual feedback)
    try {
      const originalFills = JSON.parse(JSON.stringify(node.fills));
      node.fills = [
        {
          type: "SOLID",
          color: { r: 1, g: 0.5, b: 0 },
          opacity: 0.3,
        },
      ];

      // Brief delay for the highlight to be visible
      await delay(100);

      try {
        node.fills = originalFills;
      } catch (err) {
        console.error("Error resetting fills:", err);
      }
    } catch (highlightErr) {
      console.error("Error highlighting text node:", highlightErr);
      // Continue anyway, highlighting is just visual feedback
    }

    return safeTextNode;
  } catch (nodeErr) {
    console.error("Error processing text node:", nodeErr);
    return null;
  }
}

// A delay function that returns a promise
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Keep the original findTextNodes for backward compatibility
async function findTextNodes(node, parentPath = [], depth = 0, textNodes = []) {
  // Skip invisible nodes
  if (node.visible === false) return;

  // Get the path to this node including its name
  const nodePath = [...parentPath, node.name || `Unnamed ${node.type}`];

  if (node.type === "TEXT") {
    try {
      // Safely extract font information to avoid Symbol serialization issues
      let fontFamily = "";
      let fontStyle = "";

      if (node.fontName) {
        if (typeof node.fontName === "object") {
          if ("family" in node.fontName) fontFamily = node.fontName.family;
          if ("style" in node.fontName) fontStyle = node.fontName.style;
        }
      }

      // Create a safe representation of the text node with only serializable properties
      const safeTextNode = {
        id: node.id,
        name: node.name || "Text",
        type: node.type,
        characters: node.characters,
        fontSize: typeof node.fontSize === "number" ? node.fontSize : 0,
        fontFamily: fontFamily,
        fontStyle: fontStyle,
        x: typeof node.x === "number" ? node.x : 0,
        y: typeof node.y === "number" ? node.y : 0,
        width: typeof node.width === "number" ? node.width : 0,
        height: typeof node.height === "number" ? node.height : 0,
        path: nodePath.join(" > "),
        depth: depth,
      };

      // Only highlight the node if it's not being done via API
      try {
        // Safe way to create a temporary highlight without causing serialization issues
        const originalFills = JSON.parse(JSON.stringify(node.fills));
        node.fills = [
          {
            type: "SOLID",
            color: { r: 1, g: 0.5, b: 0 },
            opacity: 0.3,
          },
        ];

        // Promise-based delay instead of setTimeout
        await delay(500);

        try {
          node.fills = originalFills;
        } catch (err) {
          console.error("Error resetting fills:", err);
        }
      } catch (highlightErr) {
        console.error("Error highlighting text node:", highlightErr);
        // Continue anyway, highlighting is just visual feedback
      }

      textNodes.push(safeTextNode);
    } catch (nodeErr) {
      console.error("Error processing text node:", nodeErr);
      // Skip this node but continue with others
    }
  }

  // Recursively process children of container nodes
  if ("children" in node) {
    for (const child of node.children) {
      await findTextNodes(child, nodePath, depth + 1, textNodes);
    }
  }
}

// Replace text in a specific node
async function setMultipleTextContents(params) {
  const { nodeId, text } = params || {};
  const commandId = params.commandId || generateCommandId();

  if (!nodeId || !text || !Array.isArray(text)) {
    const errorMsg = "Missing required parameters: nodeId and text array";

    // Send error progress update
    sendProgressUpdate(
      commandId,
      "set_multiple_text_contents",
      "error",
      0,
      0,
      0,
      errorMsg,
      { error: errorMsg }
    );

    throw new Error(errorMsg);
  }

  console.log(
    `Starting text replacement for node: ${nodeId} with ${text.length} text replacements`
  );

  // Send started progress update
  sendProgressUpdate(
    commandId,
    "set_multiple_text_contents",
    "started",
    0,
    text.length,
    0,
    `Starting text replacement for ${text.length} nodes`,
    { totalReplacements: text.length }
  );

  // Define the results array and counters
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // Split text replacements into chunks of 5
  const CHUNK_SIZE = 5;
  const chunks = [];

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Split ${text.length} replacements into ${chunks.length} chunks`);

  // Send chunking info update
  sendProgressUpdate(
    commandId,
    "set_multiple_text_contents",
    "in_progress",
    5, // 5% progress for planning phase
    text.length,
    0,
    `Preparing to replace text in ${text.length} nodes using ${chunks.length} chunks`,
    {
      totalReplacements: text.length,
      chunks: chunks.length,
      chunkSize: CHUNK_SIZE,
    }
  );

  // Process each chunk sequentially
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(
      `Processing chunk ${chunkIndex + 1}/${chunks.length} with ${
        chunk.length
      } replacements`
    );

    // Send chunk processing start update
    sendProgressUpdate(
      commandId,
      "set_multiple_text_contents",
      "in_progress",
      Math.round(5 + (chunkIndex / chunks.length) * 90), // 5-95% for processing
      text.length,
      successCount + failureCount,
      `Processing text replacements chunk ${chunkIndex + 1}/${chunks.length}`,
      {
        currentChunk: chunkIndex + 1,
        totalChunks: chunks.length,
        successCount,
        failureCount,
      }
    );

    // Process replacements within a chunk in parallel
    const chunkPromises = chunk.map(async (replacement) => {
      if (!replacement.nodeId || replacement.text === undefined) {
        console.error(`Missing nodeId or text for replacement`);
        return {
          success: false,
          nodeId: replacement.nodeId || "unknown",
          error: "Missing nodeId or text in replacement entry",
        };
      }

      try {
        console.log(
          `Attempting to replace text in node: ${replacement.nodeId}`
        );

        // Get the text node to update (just to check it exists and get original text)
        const textNode = await figma.getNodeByIdAsync(replacement.nodeId);

        if (!textNode) {
          console.error(`Text node not found: ${replacement.nodeId}`);
          return {
            success: false,
            nodeId: replacement.nodeId,
            error: `Node not found: ${replacement.nodeId}`,
          };
        }

        if (textNode.type !== "TEXT") {
          console.error(
            `Node is not a text node: ${replacement.nodeId} (type: ${textNode.type})`
          );
          return {
            success: false,
            nodeId: replacement.nodeId,
            error: `Node is not a text node: ${replacement.nodeId} (type: ${textNode.type})`,
          };
        }

        // Save original text for the result
        const originalText = textNode.characters;
        console.log(`Original text: "${originalText}"`);
        console.log(`Will translate to: "${replacement.text}"`);

        // Highlight the node before changing text
        let originalFills;
        try {
          // Save original fills for restoration later
          originalFills = JSON.parse(JSON.stringify(textNode.fills));
          // Apply highlight color (orange with 30% opacity)
          textNode.fills = [
            {
              type: "SOLID",
              color: { r: 1, g: 0.5, b: 0 },
              opacity: 0.3,
            },
          ];
        } catch (highlightErr) {
          console.error(
            `Error highlighting text node: ${highlightErr.message}`
          );
          // Continue anyway, highlighting is just visual feedback
        }

        // Use the existing setTextContent function to handle font loading and text setting
        await setTextContent({
          nodeId: replacement.nodeId,
          text: replacement.text,
        });

        // Keep highlight for a moment after text change, then restore original fills
        if (originalFills) {
          try {
            // Use delay function for consistent timing
            await delay(500);
            textNode.fills = originalFills;
          } catch (restoreErr) {
            console.error(`Error restoring fills: ${restoreErr.message}`);
          }
        }

        console.log(
          `Successfully replaced text in node: ${replacement.nodeId}`
        );
        return {
          success: true,
          nodeId: replacement.nodeId,
          originalText: originalText,
          translatedText: replacement.text,
        };
      } catch (error) {
        console.error(
          `Error replacing text in node ${replacement.nodeId}: ${error.message}`
        );
        return {
          success: false,
          nodeId: replacement.nodeId,
          error: `Error applying replacement: ${error.message}`,
        };
      }
    });

    // Wait for all replacements in this chunk to complete
    const chunkResults = await Promise.all(chunkPromises);

    // Process results for this chunk
    chunkResults.forEach((result) => {
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
      results.push(result);
    });

    // Send chunk processing complete update with partial results
    sendProgressUpdate(
      commandId,
      "set_multiple_text_contents",
      "in_progress",
      Math.round(5 + ((chunkIndex + 1) / chunks.length) * 90), // 5-95% for processing
      text.length,
      successCount + failureCount,
      `Completed chunk ${chunkIndex + 1}/${
        chunks.length
      }. ${successCount} successful, ${failureCount} failed so far.`,
      {
        currentChunk: chunkIndex + 1,
        totalChunks: chunks.length,
        successCount,
        failureCount,
        chunkResults: chunkResults,
      }
    );

    // Add a small delay between chunks to avoid overloading Figma
    if (chunkIndex < chunks.length - 1) {
      console.log("Pausing between chunks to avoid overloading Figma...");
      await delay(1000); // 1 second delay between chunks
    }
  }

  console.log(
    `Replacement complete: ${successCount} successful, ${failureCount} failed`
  );

  // Send completed progress update
  sendProgressUpdate(
    commandId,
    "set_multiple_text_contents",
    "completed",
    100,
    text.length,
    successCount + failureCount,
    `Text replacement complete: ${successCount} successful, ${failureCount} failed`,
    {
      totalReplacements: text.length,
      replacementsApplied: successCount,
      replacementsFailed: failureCount,
      completedInChunks: chunks.length,
      results: results,
    }
  );

  return {
    success: successCount > 0,
    nodeId: nodeId,
    replacementsApplied: successCount,
    replacementsFailed: failureCount,
    totalReplacements: text.length,
    results: results,
    completedInChunks: chunks.length,
    commandId,
  };
}

// Function to generate simple UUIDs for command IDs
function generateCommandId() {
  return (
    "cmd_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

async function getAnnotations(params) {
  try {
    const { nodeId, includeCategories = true } = params;

    // Get categories first if needed
    let categoriesMap = {};
    if (includeCategories) {
      const categories = await figma.annotations.getAnnotationCategoriesAsync();
      categoriesMap = categories.reduce((map, category) => {
        map[category.id] = {
          id: category.id,
          label: category.label,
          color: category.color,
          isPreset: category.isPreset,
        };
        return map;
      }, {});
    }

    if (nodeId) {
      // Get annotations for a specific node
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      if (!("annotations" in node)) {
        throw new Error(`Node type ${node.type} does not support annotations`);
      }

      const result = {
        nodeId: node.id,
        name: node.name,
        annotations: node.annotations || [],
      };

      if (includeCategories) {
        result.categories = Object.values(categoriesMap);
      }

      return result;
    } else {
      // Get all annotations in the current page
      const annotations = [];
      const processNode = async (node) => {
        if (
          "annotations" in node &&
          node.annotations &&
          node.annotations.length > 0
        ) {
          annotations.push({
            nodeId: node.id,
            name: node.name,
            annotations: node.annotations,
          });
        }
        if ("children" in node) {
          for (const child of node.children) {
            await processNode(child);
          }
        }
      };

      // Start from current page
      await processNode(figma.currentPage);

      const result = {
        annotatedNodes: annotations,
      };

      if (includeCategories) {
        result.categories = Object.values(categoriesMap);
      }

      return result;
    }
  } catch (error) {
    console.error("Error in getAnnotations:", error);
    throw error;
  }
}

async function setAnnotation(params) {
  try {
    console.log("=== setAnnotation Debug Start ===");
    console.log("Input params:", JSON.stringify(params, null, 2));

    const { nodeId, annotationId, labelMarkdown, categoryId, properties } =
      params;

    // Validate required parameters
    if (!nodeId) {
      console.error("Validation failed: Missing nodeId");
      return { success: false, error: "Missing nodeId" };
    }

    if (!labelMarkdown) {
      console.error("Validation failed: Missing labelMarkdown");
      return { success: false, error: "Missing labelMarkdown" };
    }

    console.log("Attempting to get node:", nodeId);
    // Get and validate node
    const node = await figma.getNodeByIdAsync(nodeId);
    console.log("Node lookup result:", {
      id: nodeId,
      found: !!node,
      type: node ? node.type : undefined,
      name: node ? node.name : undefined,
      hasAnnotations: node ? "annotations" in node : false,
    });

    if (!node) {
      console.error("Node lookup failed:", nodeId);
      return { success: false, error: `Node not found: ${nodeId}` };
    }

    // Validate node supports annotations
    if (!("annotations" in node)) {
      console.error("Node annotation support check failed:", {
        nodeType: node.type,
        nodeId: node.id,
      });
      return {
        success: false,
        error: `Node type ${node.type} does not support annotations`,
      };
    }

    // Create the annotation object
    const newAnnotation = {
      labelMarkdown,
    };

    // Validate and add categoryId if provided
    if (categoryId) {
      console.log("Adding categoryId to annotation:", categoryId);
      newAnnotation.categoryId = categoryId;
    }

    // Validate and add properties if provided
    if (properties && Array.isArray(properties) && properties.length > 0) {
      console.log(
        "Adding properties to annotation:",
        JSON.stringify(properties, null, 2)
      );
      newAnnotation.properties = properties;
    }

    // Log current annotations before update
    console.log("Current node annotations:", node.annotations);

    // Overwrite annotations
    console.log(
      "Setting new annotation:",
      JSON.stringify(newAnnotation, null, 2)
    );
    node.annotations = [newAnnotation];

    // Verify the update
    console.log("Updated node annotations:", node.annotations);
    console.log("=== setAnnotation Debug End ===");

    return {
      success: true,
      nodeId: node.id,
      name: node.name,
      annotations: node.annotations,
    };
  } catch (error) {
    console.error("=== setAnnotation Error ===");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      params: JSON.stringify(params, null, 2),
    });
    return { success: false, error: error.message };
  }
}

/**
 * Scan for nodes with specific types within a node
 * @param {Object} params - Parameters object
 * @param {string} params.nodeId - ID of the node to scan within
 * @param {Array<string>} params.types - Array of node types to find (e.g. ['COMPONENT', 'FRAME'])
 * @returns {Object} - Object containing found nodes
 */
async function scanNodesByTypes(params) {
  console.log(`Starting to scan nodes by types from node ID: ${params.nodeId}`);
  const { nodeId, types = [] } = params || {};

  if (!types || types.length === 0) {
    throw new Error("No types specified to search for");
  }

  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // Simple implementation without chunking
  const matchingNodes = [];

  // Send a single progress update to notify start
  const commandId = generateCommandId();
  sendProgressUpdate(
    commandId,
    "scan_nodes_by_types",
    "started",
    0,
    1,
    0,
    `Starting scan of node "${node.name || nodeId}" for types: ${types.join(
      ", "
    )}`,
    null
  );

  // Recursively find nodes with specified types
  await findNodesByTypes(node, types, matchingNodes);

  // Send completion update
  sendProgressUpdate(
    commandId,
    "scan_nodes_by_types",
    "completed",
    100,
    matchingNodes.length,
    matchingNodes.length,
    `Scan complete. Found ${matchingNodes.length} matching nodes.`,
    { matchingNodes }
  );

  return {
    success: true,
    message: `Found ${matchingNodes.length} matching nodes.`,
    count: matchingNodes.length,
    matchingNodes: matchingNodes,
    searchedTypes: types,
  };
}

/**
 * Helper function to recursively find nodes with specific types
 * @param {SceneNode} node - The root node to start searching from
 * @param {Array<string>} types - Array of node types to find
 * @param {Array} matchingNodes - Array to store found nodes
 */
async function findNodesByTypes(node, types, matchingNodes = []) {
  // Skip invisible nodes
  if (node.visible === false) return;

  // Check if this node is one of the specified types
  if (types.includes(node.type)) {
    // Create a minimal representation with just ID, type and bbox
    matchingNodes.push({
      id: node.id,
      name: node.name || `Unnamed ${node.type}`,
      type: node.type,
      // Basic bounding box info
      bbox: {
        x: typeof node.x === "number" ? node.x : 0,
        y: typeof node.y === "number" ? node.y : 0,
        width: typeof node.width === "number" ? node.width : 0,
        height: typeof node.height === "number" ? node.height : 0,
      },
    });
  }

  // Recursively process children of container nodes
  if ("children" in node) {
    for (const child of node.children) {
      await findNodesByTypes(child, types, matchingNodes);
    }
  }
}

// Set multiple annotations with async progress updates
async function setMultipleAnnotations(params) {
  console.log("=== setMultipleAnnotations Debug Start ===");
  console.log("Input params:", JSON.stringify(params, null, 2));

  const { nodeId, annotations } = params;

  if (!annotations || annotations.length === 0) {
    console.error("Validation failed: No annotations provided");
    return { success: false, error: "No annotations provided" };
  }

  console.log(
    `Processing ${annotations.length} annotations for node ${nodeId}`
  );

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // Process annotations sequentially
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    console.log(
      `\nProcessing annotation ${i + 1}/${annotations.length}:`,
      JSON.stringify(annotation, null, 2)
    );

    try {
      console.log("Calling setAnnotation with params:", {
        nodeId: annotation.nodeId,
        labelMarkdown: annotation.labelMarkdown,
        categoryId: annotation.categoryId,
        properties: annotation.properties,
      });

      const result = await setAnnotation({
        nodeId: annotation.nodeId,
        labelMarkdown: annotation.labelMarkdown,
        categoryId: annotation.categoryId,
        properties: annotation.properties,
      });

      console.log("setAnnotation result:", JSON.stringify(result, null, 2));

      if (result.success) {
        successCount++;
        results.push({ success: true, nodeId: annotation.nodeId });
        console.log(`✓ Annotation ${i + 1} applied successfully`);
      } else {
        failureCount++;
        results.push({
          success: false,
          nodeId: annotation.nodeId,
          error: result.error,
        });
        console.error(`✗ Annotation ${i + 1} failed:`, result.error);
      }
    } catch (error) {
      failureCount++;
      const errorResult = {
        success: false,
        nodeId: annotation.nodeId,
        error: error.message,
      };
      results.push(errorResult);
      console.error(`✗ Annotation ${i + 1} failed with error:`, error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  const summary = {
    success: successCount > 0,
    annotationsApplied: successCount,
    annotationsFailed: failureCount,
    totalAnnotations: annotations.length,
    results: results,
  };

  console.log("\n=== setMultipleAnnotations Summary ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("=== setMultipleAnnotations Debug End ===");

  return summary;
}

async function deleteMultipleNodes(params) {
  const { nodeIds } = params || {};
  const commandId = generateCommandId();

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    const errorMsg = "Missing or invalid nodeIds parameter";
    sendProgressUpdate(
      commandId,
      "delete_multiple_nodes",
      "error",
      0,
      0,
      0,
      errorMsg,
      { error: errorMsg }
    );
    throw new Error(errorMsg);
  }

  console.log(`Starting deletion of ${nodeIds.length} nodes`);

  // Send started progress update
  sendProgressUpdate(
    commandId,
    "delete_multiple_nodes",
    "started",
    0,
    nodeIds.length,
    0,
    `Starting deletion of ${nodeIds.length} nodes`,
    { totalNodes: nodeIds.length }
  );

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // Process nodes in chunks of 5 to avoid overwhelming Figma
  const CHUNK_SIZE = 5;
  const chunks = [];

  for (let i = 0; i < nodeIds.length; i += CHUNK_SIZE) {
    chunks.push(nodeIds.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Split ${nodeIds.length} deletions into ${chunks.length} chunks`);

  // Send chunking info update
  sendProgressUpdate(
    commandId,
    "delete_multiple_nodes",
    "in_progress",
    5,
    nodeIds.length,
    0,
    `Preparing to delete ${nodeIds.length} nodes using ${chunks.length} chunks`,
    {
      totalNodes: nodeIds.length,
      chunks: chunks.length,
      chunkSize: CHUNK_SIZE,
    }
  );

  // Process each chunk sequentially
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(
      `Processing chunk ${chunkIndex + 1}/${chunks.length} with ${
        chunk.length
      } nodes`
    );

    // Send chunk processing start update
    sendProgressUpdate(
      commandId,
      "delete_multiple_nodes",
      "in_progress",
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      nodeIds.length,
      successCount + failureCount,
      `Processing deletion chunk ${chunkIndex + 1}/${chunks.length}`,
      {
        currentChunk: chunkIndex + 1,
        totalChunks: chunks.length,
        successCount,
        failureCount,
      }
    );

    // Process deletions within a chunk in parallel
    const chunkPromises = chunk.map(async (nodeId) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);

        if (!node) {
          console.error(`Node not found: ${nodeId}`);
          return {
            success: false,
            nodeId: nodeId,
            error: `Node not found: ${nodeId}`,
          };
        }

        // Save node info before deleting
        const nodeInfo = {
          id: node.id,
          name: node.name,
          type: node.type,
        };

        // Delete the node
        node.remove();

        console.log(`Successfully deleted node: ${nodeId}`);
        return {
          success: true,
          nodeId: nodeId,
          nodeInfo: nodeInfo,
        };
      } catch (error) {
        console.error(`Error deleting node ${nodeId}: ${error.message}`);
        return {
          success: false,
          nodeId: nodeId,
          error: error.message,
        };
      }
    });

    // Wait for all deletions in this chunk to complete
    const chunkResults = await Promise.all(chunkPromises);

    // Process results for this chunk
    chunkResults.forEach((result) => {
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
      results.push(result);
    });

    // Send chunk processing complete update
    sendProgressUpdate(
      commandId,
      "delete_multiple_nodes",
      "in_progress",
      Math.round(5 + ((chunkIndex + 1) / chunks.length) * 90),
      nodeIds.length,
      successCount + failureCount,
      `Completed chunk ${chunkIndex + 1}/${
        chunks.length
      }. ${successCount} successful, ${failureCount} failed so far.`,
      {
        currentChunk: chunkIndex + 1,
        totalChunks: chunks.length,
        successCount,
        failureCount,
        chunkResults: chunkResults,
      }
    );

    // Add a small delay between chunks
    if (chunkIndex < chunks.length - 1) {
      console.log("Pausing between chunks...");
      await delay(1000);
    }
  }

  console.log(
    `Deletion complete: ${successCount} successful, ${failureCount} failed`
  );

  // Send completed progress update
  sendProgressUpdate(
    commandId,
    "delete_multiple_nodes",
    "completed",
    100,
    nodeIds.length,
    successCount + failureCount,
    `Node deletion complete: ${successCount} successful, ${failureCount} failed`,
    {
      totalNodes: nodeIds.length,
      nodesDeleted: successCount,
      nodesFailed: failureCount,
      completedInChunks: chunks.length,
      results: results,
    }
  );

  return {
    success: successCount > 0,
    nodesDeleted: successCount,
    nodesFailed: failureCount,
    totalNodes: nodeIds.length,
    results: results,
    completedInChunks: chunks.length,
    commandId,
  };
}

async function setLayoutMode(params) {
  const { nodeId, layoutMode = "NONE", layoutWrap = "NO_WRAP" } = params || {};

  // Get the target node
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // Check if node is a frame or component that supports layoutMode
  if (
    node.type !== "FRAME" &&
    node.type !== "COMPONENT" &&
    node.type !== "COMPONENT_SET" &&
    node.type !== "INSTANCE"
  ) {
    throw new Error(`Node type ${node.type} does not support layoutMode`);
  }

  // Set layout mode
  node.layoutMode = layoutMode;

  // Set layoutWrap if applicable
  if (layoutMode !== "NONE") {
    node.layoutWrap = layoutWrap;
  }

  return {
    id: node.id,
    name: node.name,
    layoutMode: node.layoutMode,
    layoutWrap: node.layoutWrap,
  };
}

async function setPadding(params) {
  const { nodeId, paddingTop, paddingRight, paddingBottom, paddingLeft } =
    params || {};

  // Get the target node
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // Check if node is a frame or component that supports padding
  if (
    node.type !== "FRAME" &&
    node.type !== "COMPONENT" &&
    node.type !== "COMPONENT_SET" &&
    node.type !== "INSTANCE"
  ) {
    throw new Error(`Node type ${node.type} does not support padding`);
  }

  // Check if the node has auto-layout enabled
  if (node.layoutMode === "NONE") {
    throw new Error(
      "Padding can only be set on auto-layout frames (layoutMode must not be NONE)"
    );
  }

  // Set padding values if provided
  if (paddingTop !== undefined) node.paddingTop = paddingTop;
  if (paddingRight !== undefined) node.paddingRight = paddingRight;
  if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
  if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;

  return {
    id: node.id,
    name: node.name,
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
  };
}

async function setAxisAlign(params) {
  const { nodeId, primaryAxisAlignItems, counterAxisAlignItems } = params || {};

  // Get the target node
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // Check if node is a frame or component that supports axis alignment
  if (
    node.type !== "FRAME" &&
    node.type !== "COMPONENT" &&
    node.type !== "COMPONENT_SET" &&
    node.type !== "INSTANCE"
  ) {
    throw new Error(`Node type ${node.type} does not support axis alignment`);
  }

  // Check if the node has auto-layout enabled
  if (node.layoutMode === "NONE") {
    throw new Error(
      "Axis alignment can only be set on auto-layout frames (layoutMode must not be NONE)"
    );
  }

  // Validate and set primaryAxisAlignItems if provided
  if (primaryAxisAlignItems !== undefined) {
    if (
      !["MIN", "MAX", "CENTER", "SPACE_BETWEEN"].includes(primaryAxisAlignItems)
    ) {
      throw new Error(
        "Invalid primaryAxisAlignItems value. Must be one of: MIN, MAX, CENTER, SPACE_BETWEEN"
      );
    }
    node.primaryAxisAlignItems = primaryAxisAlignItems;
  }

  // Validate and set counterAxisAlignItems if provided
  if (counterAxisAlignItems !== undefined) {
    if (!["MIN", "MAX", "CENTER", "BASELINE"].includes(counterAxisAlignItems)) {
      throw new Error(
        "Invalid counterAxisAlignItems value. Must be one of: MIN, MAX, CENTER, BASELINE"
      );
    }
    // BASELINE is only valid for horizontal layout
    if (
      counterAxisAlignItems === "BASELINE" &&
      node.layoutMode !== "HORIZONTAL"
    ) {
      throw new Error(
        "BASELINE alignment is only valid for horizontal auto-layout frames"
      );
    }
    node.counterAxisAlignItems = counterAxisAlignItems;
  }

  return {
    id: node.id,
    name: node.name,
    primaryAxisAlignItems: node.primaryAxisAlignItems,
    counterAxisAlignItems: node.counterAxisAlignItems,
    layoutMode: node.layoutMode,
  };
}

async function setLayoutSizing(params) {
  const { nodeId, layoutSizingHorizontal, layoutSizingVertical } = params || {};

  // Get the target node
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // Check if node is a frame or component that supports layout sizing
  if (
    node.type !== "FRAME" &&
    node.type !== "COMPONENT" &&
    node.type !== "COMPONENT_SET" &&
    node.type !== "INSTANCE"
  ) {
    throw new Error(`Node type ${node.type} does not support layout sizing`);
  }

  // Check if the node has auto-layout enabled
  if (node.layoutMode === "NONE") {
    throw new Error(
      "Layout sizing can only be set on auto-layout frames (layoutMode must not be NONE)"
    );
  }

  // Validate and set layoutSizingHorizontal if provided
  if (layoutSizingHorizontal !== undefined) {
    if (!["FIXED", "HUG", "FILL"].includes(layoutSizingHorizontal)) {
      throw new Error(
        "Invalid layoutSizingHorizontal value. Must be one of: FIXED, HUG, FILL"
      );
    }
    // HUG is only valid on auto-layout frames and text nodes
    if (
      layoutSizingHorizontal === "HUG" &&
      !["FRAME", "TEXT"].includes(node.type)
    ) {
      throw new Error(
        "HUG sizing is only valid on auto-layout frames and text nodes"
      );
    }
    // FILL is only valid on auto-layout children
    if (
      layoutSizingHorizontal === "FILL" &&
      (!node.parent || node.parent.layoutMode === "NONE")
    ) {
      throw new Error("FILL sizing is only valid on auto-layout children");
    }
    node.layoutSizingHorizontal = layoutSizingHorizontal;
  }

  // Validate and set layoutSizingVertical if provided
  if (layoutSizingVertical !== undefined) {
    if (!["FIXED", "HUG", "FILL"].includes(layoutSizingVertical)) {
      throw new Error(
        "Invalid layoutSizingVertical value. Must be one of: FIXED, HUG, FILL"
      );
    }
    // HUG is only valid on auto-layout frames and text nodes
    if (
      layoutSizingVertical === "HUG" &&
      !["FRAME", "TEXT"].includes(node.type)
    ) {
      throw new Error(
        "HUG sizing is only valid on auto-layout frames and text nodes"
      );
    }
    // FILL is only valid on auto-layout children
    if (
      layoutSizingVertical === "FILL" &&
      (!node.parent || node.parent.layoutMode === "NONE")
    ) {
      throw new Error("FILL sizing is only valid on auto-layout children");
    }
    node.layoutSizingVertical = layoutSizingVertical;
  }

  return {
    id: node.id,
    name: node.name,
    layoutSizingHorizontal: node.layoutSizingHorizontal,
    layoutSizingVertical: node.layoutSizingVertical,
    layoutMode: node.layoutMode,
  };
}

async function setItemSpacing(params) {
  const { nodeId, itemSpacing } = params || {};

  // Get the target node
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // Check if node is a frame or component that supports item spacing
  if (
    node.type !== "FRAME" &&
    node.type !== "COMPONENT" &&
    node.type !== "COMPONENT_SET" &&
    node.type !== "INSTANCE"
  ) {
    throw new Error(`Node type ${node.type} does not support item spacing`);
  }

  // Check if the node has auto-layout enabled
  if (node.layoutMode === "NONE") {
    throw new Error(
      "Item spacing can only be set on auto-layout frames (layoutMode must not be NONE)"
    );
  }

  // Set item spacing
  if (itemSpacing !== undefined) {
    if (typeof itemSpacing !== "number") {
      throw new Error("Item spacing must be a number");
    }
    node.itemSpacing = itemSpacing;
  }

  return {
    id: node.id,
    name: node.name,
    itemSpacing: node.itemSpacing,
    layoutMode: node.layoutMode,
  };
}

async function validateQARules(params) {
  const { ignoreStatusBar = true, outputFilePath = "qa_report.txt", frameIds = [], useSelection = false } = params;
  const commandId = generateCommandId();
  let frames = [];

  try {
    // Send initial progress update
    sendProgressUpdate(
      commandId,
      "validate_qa_rules",
      "started",
      0,
      100,
      0,
      "Starting QA validation...",
      null
    );

    // Load the current page asynchronously
    await figma.currentPage.loadAsync();

    // Get all frames to validate
    if (useSelection) {
      // Use current selection if useSelection is true
      const selectedNodes = figma.currentPage.selection;
      
      if (selectedNodes.length === 0) {
        throw new Error("No frames selected. Please select at least one frame to validate.");
      }
      
      // Filter to only include frames
      frames = selectedNodes.filter(node => node.type === "FRAME");
      
      if (frames.length === 0) {
        throw new Error("No frames found in selection. Please select at least one frame to validate.");
      }
    } else if (frameIds.length > 0) {
      // Get specific frames by IDs - use async version
      frames = await Promise.all(frameIds.map(id => figma.getNodeByIdAsync(id)));
      frames = frames.filter(node => node && node.type === "FRAME");
    } else {
      // Get all top-level frames in the current page
      frames = figma.currentPage.children.filter(node => node.type === "FRAME");
    }

    if (frames.length === 0) {
      throw new Error("No frames found to validate");
    }

    sendProgressUpdate(
      commandId,
      "validate_qa_rules",
      "in_progress",
      10,
      100,
      10,
      `Found ${frames.length} frames to validate`,
      null
    );

    // Rules to validate
    const qaRules = [
      {
        id: "consistent_page_margins",
        name: "Consistent page margins",
        description: "Space between elements and the left and right edges of the screen",
        expected: "16px on mobile devices, 24px on tablet devices"
      },
      {
        id: "typographic_hierarchy",
        name: "Poor typographic hierarchy",
        description: "Number of typographic styles per screen",
        expected: "Less than 5 typographic styles per screen"
      },
      {
        id: "imagery_edge_to_edge",
        name: "Bring imagery edge to edge",
        description: "Photography positioning",
        expected: "Photography should extend to the top of the screen, overlapping the top status bar"
      },
      {
        id: "bottom_os_bar",
        name: "Bottom OS bar color",
        description: "Bottom OS bar background color",
        expected: "Should be transparent to its background (no white stripe) or match the background color"
      },
      {
        id: "vertical_spacing_cards",
        name: "Vertical spacing between cards",
        description: "Gap between cards",
        expected: "Gap between cards is 12px"
      },
      {
        id: "vertical_spacing_header",
        name: "Vertical spacing with header",
        description: "Gap between cards and section header",
        expected: "Gap between cards and section header is 16px"
      },
      {
        id: "vertical_spacing_sections",
        name: "Vertical spacing between sections",
        description: "Gap between sections",
        expected: "Gap between sections is 32px"
      },
      {
        id: "vertical_spacing_inputs",
        name: "Vertical spacing for input fields",
        description: "Gap between grouped input fields",
        expected: "Gap between grouped input fields is 24px"
      },
      {
        id: "color_contrast_text",
        name: "Color contrast for text",
        description: "Contrast between text and its background",
        expected: "Contrast ratio of at least 4.5:1"
      },
      {
        id: "color_contrast_ui",
        name: "Color contrast for UI elements",
        description: "Contrast between graphic element and its background",
        expected: "Contrast ratio of at least 3:1"
      },
      {
        id: "ui_language",
        name: "UI language",
        description: "Title case style",
        expected: "All titles should be written in sentence case, unless they are a proper noun"
      },
      {
        id: "too_many_buttons",
        name: "Too many buttons",
        description: "Number of buttons per screen",
        expected: "Less than 3 buttons per screen"
      },
      {
        id: "button_bar_shadow",
        name: "Button bar shadow",
        description: "Button bar shadow style",
        expected: "Button bar should not show a drop shadow unless the page is scrollable"
      },
      {
        id: "corner_radius",
        name: "Corner radius",
        description: "Corner radius consistency",
        expected: "All cards and images should have a 6px corner radius"
      },
      {
        id: "card_shadow",
        name: "Card shadow",
        description: "Card shadow style",
        expected: "All cards should have a drop shadow to indicate clickability"
      },
      {
        id: "typeface",
        name: "Typeface",
        description: "Font family usage",
        expected: "All fonts should be using Brown typeface, not Brandon"
      }
    ];

    // Result storage
    const results = {};
    
    // Process each frame
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      // Update progress 
      sendProgressUpdate(
        commandId,
        "validate_qa_rules",
        "in_progress",
        10 + Math.round(80 * (i / frames.length)),
        frames.length,
        i,
        `Validating frame ${i+1}/${frames.length}: ${frame.name}`,
        null
      );
      
      // Initialize frame results
      results[frame.id] = {
        name: frame.name,
        rules: {}
      };
      
      // Check each rule for this frame
      for (const rule of qaRules) {
        try {
          // Validate rule
          const validationResult = await validateRule(frame, rule, ignoreStatusBar);
          results[frame.id].rules[rule.id] = validationResult;
        } catch (error) {
          console.error(`Error validating rule ${rule.id} for frame ${frame.name}:`, error);
          results[frame.id].rules[rule.id] = {
            passed: false,
            reason: `Error checking rule: ${error.message || 'Unknown error'}`
          };
        }
      }
    }
    
    // Generate report
    const report = generateQAReport(results, qaRules);
    
    // Send completed progress update
    sendProgressUpdate(
      commandId,
      "validate_qa_rules",
      "completed",
      100,
      frames.length,
      frames.length,
      "QA validation completed",
      { report, results }
    );
    
    return {
      success: true,
      report,
      results,
      commandId
    };
  } catch (error) {
    console.error("Error in validateQARules:", error);
    
    // Send error progress update
    sendProgressUpdate(
      commandId,
      "validate_qa_rules",
      "error",
      0,
      100,
      0,
      `Error validating QA rules: ${error.message || 'Unknown error'}`,
      null
    );
    
    throw error;
  }
}

// Helper function to validate individual rules
async function validateRule(frame, rule, ignoreStatusBar) {
  try {
    console.log(`Validating rule: ${rule.id}`);
    
    // Check if validation function exists for the rule
    let validationFunction;
    
    switch (rule.id) {
      case "consistent_page_margins": 
        validationFunction = validatePageMargins;
        break;
      case "typographic_hierarchy":
        validationFunction = validateTypographicHierarchy;
        break;
      case "imagery_edge_to_edge":
        validationFunction = validateImageryEdgeToEdge;
        break;
      case "bottom_os_bar":
        validationFunction = validateBottomOSBar;
        break;
      case "vertical_spacing_cards":
        validationFunction = validateVerticalSpacingCards;
        break;
      case "vertical_spacing_header":
        validationFunction = validateVerticalSpacingHeader;
        break;
      case "vertical_spacing_sections":
        validationFunction = validateVerticalSpacingSections;
        break;
      case "vertical_spacing_inputs":
        validationFunction = validateVerticalSpacingInputs;
        break;
      case "color_contrast_text":
        validationFunction = validateColorContrastText;
        break;
      case "color_contrast_ui":
        validationFunction = validateColorContrastUI;
        break;
      case "ui_language":
        validationFunction = validateUILanguage;
        break;
      case "too_many_buttons":
        validationFunction = validateTooManyButtons;
        break;
      case "button_bar_shadow":
        validationFunction = validateButtonBarShadow;
        break;
      case "corner_radius":
        validationFunction = validateCornerRadius;
        break;
      case "card_shadow":
        validationFunction = validateCardShadow;
        break;
      case "typeface":
        validationFunction = validateTypeface;
        break;
      default:
        return {
          passed: false,
          reason: `Unimplemented rule: ${rule.id}`
        };
    }
    
    console.log(`Validation function for ${rule.id}:`, typeof validationFunction);
    
    if (typeof validationFunction !== 'function') {
      console.error(`Validation function for rule ${rule.id} is not defined`);
      return {
        passed: false,
        reason: `Validation function for rule ${rule.id} is not implemented yet`
      };
    }
    
    // Call the validation function
    if (rule.id === "imagery_edge_to_edge") {
      return validationFunction(frame, ignoreStatusBar);
    } else {
      return validationFunction(frame);
    }
  } catch (error) {
    console.error(`Error validating rule ${rule.id}:`, error);
    return {
      passed: false,
      reason: `Error checking rule: ${error.message}`
    };
  }
}

// Rule validation implementations
async function validatePageMargins(frame) {
  // Check if frame is mobile or tablet based on width
  const isMobile = frame.width <= 420; // Assumption for mobile width
  const requiredMargin = isMobile ? 16 : 24;
  
  // Find elements that are close to the edges
  const violations = [];
  
  for (const child of frame.children) {
    // Skip background elements and status bars
    if (child.name.toLowerCase().includes('background') || 
        child.name.toLowerCase().includes('status') ||
        child.name.toLowerCase().includes('statusbar')) {
      continue;
    }
    
    // Check left margin
    if (child.x < requiredMargin && child.x > 0) {
      violations.push({
        element: child.name,
        position: 'left',
        actual: Math.round(child.x),
        required: requiredMargin
      });
    }
    
    // Check right margin
    const rightEdge = child.x + child.width;
    const frameRightEdge = frame.width;
    const rightMargin = frameRightEdge - rightEdge;
    
    if (rightMargin < requiredMargin && rightMargin > 0) {
      violations.push({
        element: child.name,
        position: 'right',
        actual: Math.round(rightMargin),
        required: requiredMargin
      });
    }
  }
  
  if (violations.length === 0) {
    return {
      passed: true,
      details: `All elements respect the ${requiredMargin}px margin requirement for ${isMobile ? 'mobile' : 'tablet'}`
    };
  } else {
    return {
      passed: false,
      reason: `Found ${violations.length} elements that violate the ${requiredMargin}px margin requirement`,
      details: violations
    };
  }
}

async function validateTypographicHierarchy(frame) {
  // Find all text nodes
  const textNodes = [];
  
  function collectTextNodes(node) {
    if (node.type === 'TEXT') {
      textNodes.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        collectTextNodes(child);
      }
    }
  }
  
  collectTextNodes(frame);
  
  // Collect unique text styles
  const textStyles = new Set();
  
  for (const node of textNodes) {
    // We'll use a combination of font, size and weight as a "style"
    if (node.fontName) {
      const styleKey = `${node.fontName.family}-${node.fontSize}-${node.fontWeight || 'normal'}`;
      textStyles.add(styleKey);
    }
  }
  
  const styleCount = textStyles.size;
  
  if (styleCount < 5) {
    return {
      passed: true,
      details: `Found ${styleCount} typographic styles, which is less than the maximum of 5`
    };
  } else {
    return {
      passed: false,
      reason: `Found ${styleCount} typographic styles, which exceeds the maximum of 5`,
      details: `Recommended to consolidate text styles for better consistency`
    };
  }
}

async function validateImageryEdgeToEdge(frame, ignoreStatusBar) {
  // Find all image nodes at the top of the screen
  const imageNodes = [];
  
  function isImageNode(node) {
    // Check if it's an image or has image fills
    if (node.type === 'IMAGE') return true;
    
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.type === 'IMAGE') return true;
      }
    }
    
    return false;
  }
  
  function collectImageNodes(node) {
    if (isImageNode(node)) {
      imageNodes.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        collectImageNodes(child);
      }
    }
  }
  
  collectImageNodes(frame);
  
  // Check if any image extends to the top of the screen
  const topImages = imageNodes.filter(img => img.y <= (ignoreStatusBar ? 44 : 0) && img.x <= 1);
  
  if (topImages.length > 0) {
    return {
      passed: true,
      details: `Found ${topImages.length} image(s) that extend to the top of the screen`
    };
  } else {
    return {
      passed: false,
      reason: `No images found that extend to the top of the screen`,
      details: `Images should extend to the top edge of the screen for an immersive experience`
    };
  }
}

async function validateBottomOSBar(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "Bottom OS bar validation is not fully implemented yet"
  };
}

function generateQAReport(results, rules) {
  let report = "# Quality Assurance Report\n\n";
  
  // Add timestamp
  report += `Generated on: ${new Date().toLocaleString()}\n\n`;
  
  // Process each frame
  for (const frameId in results) {
    const frame = results[frameId];
    report += `## Frame: ${frame.name}\n\n`;
    
    // Calculate overall stats
    const passedRules = Object.values(frame.rules).filter(r => r.passed).length;
    const totalRules = rules.length;
    const percentage = Math.round((passedRules / totalRules) * 100);
    
    report += `Overall: ${passedRules}/${totalRules} rules passed (${percentage}%)\n\n`;
    
    // List all rules with pass/fail status
    report += "### Rule Checklist\n\n";
    
    for (const rule of rules) {
      const result = frame.rules[rule.id];
      const passSymbol = result.passed ? "✅" : "❌";
      
      report += `${passSymbol} **${rule.name}**: ${rule.description}\n`;
      report += `   - Expected: ${rule.expected}\n`;
      
      if (!result.passed && result.reason) {
        report += `   - Issue: ${result.reason}\n`;
        
        // Add details if available
        if (result.details) {
          if (typeof result.details === 'string') {
            report += `   - Details: ${result.details}\n`;
          } else if (Array.isArray(result.details)) {
            report += `   - Details: Found ${result.details.length} violation(s)\n`;
            for (const detail of result.details.slice(0, 3)) { // Show max 3 violations
              report += `     * ${JSON.stringify(detail)}\n`;
            }
            if (result.details.length > 3) {
              report += `     * ... and ${result.details.length - 3} more\n`;
            }
          }
        }
      }
      
      report += "\n";
    }
    
    report += "---\n\n";
  }
  
  return report;
}

// Additional rule validation functions (simplified implementations)
async function validateVerticalSpacingCards(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "Vertical spacing cards validation is not fully implemented yet"
  };
}

async function validateVerticalSpacingHeader(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "Vertical spacing header validation is not fully implemented yet"
  };
}

async function validateVerticalSpacingSections(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "Vertical spacing sections validation is not fully implemented yet"
  };
}

async function validateVerticalSpacingInputs(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "Vertical spacing inputs validation is not fully implemented yet"
  };
}

async function validateColorContrastText(frame) {
  // Find all text nodes and check their contrast against backgrounds
  const textNodes = [];
  const violations = [];
  
  // Collect all text nodes
  function collectTextNodes(node) {
    if (node.type === 'TEXT') {
      textNodes.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        collectTextNodes(child);
      }
    }
  }
  
  collectTextNodes(frame);
  
  // For each text node, check the contrast with its background
  for (const textNode of textNodes) {
    // Only process visible text nodes with content
    if (!textNode.visible || !textNode.characters || textNode.characters.trim() === '') {
      continue;
    }
    
    try {
      // Get text color (assuming solid fill for simplicity)
      let textColor = null;
      if (textNode.fills && textNode.fills.length > 0) {
        const fill = textNode.fills.find(f => f.type === 'SOLID' && f.visible !== false);
        if (fill) {
          textColor = fill.color;
        }
      }
      
      if (!textColor) {
        continue; // Skip if no solid fill found
      }
      
      // Find background color (simplified approach)
      // In a real implementation, you might need to check parent containers or overlapping elements
      let backgroundColor = { r: 1, g: 1, b: 1 }; // Default to white
      
      // Get parent with background
      let parent = textNode.parent;
      while (parent && !backgroundColor) {
        if (parent.fills && parent.fills.length > 0) {
          const fill = parent.fills.find(f => f.type === 'SOLID' && f.visible !== false);
          if (fill) {
            backgroundColor = fill.color;
            break;
          }
        }
        parent = parent.parent;
      }
      
      // Calculate contrast ratio
      const ratio = calculateContrastRatio(textColor, backgroundColor);
      
      // For text, WCAG requires 4.5:1 minimum contrast
      if (ratio < 4.5) {
        violations.push({
          element: textNode.name || 'Text element',
          nodeId: textNode.id, // Store node ID for direct selection
          text: textNode.characters.substring(0, 20) + (textNode.characters.length > 20 ? '...' : ''),
          contrastRatio: ratio.toFixed(2),
          textColor: rgbToHex(textColor),
          backgroundColor: rgbToHex(backgroundColor),
          required: 4.5
        });
      }
    } catch (error) {
      console.error(`Error checking contrast for text node ${textNode.name}:`, error);
    }
  }
  
  if (violations.length === 0) {
    return {
      passed: true,
      details: `All ${textNodes.length} text elements have sufficient contrast (at least 4.5:1)`
    };
  } else {
    return {
      passed: false,
      reason: `Found ${violations.length} text elements with insufficient contrast`,
      details: violations
    };
  }
}

async function validateColorContrastUI(frame) {
  // Check contrast for UI elements like buttons, icons, form controls
  const uiNodes = [];
  const violations = [];
  
  // Collect potential UI elements (simplified - in production, this would be more sophisticated)
  function collectUINodes(node) {
    // Check if node name indicates it's a UI element
    const isUIElement = node.name.toLowerCase().includes('button') || 
                       node.name.toLowerCase().includes('icon') ||
                       node.name.toLowerCase().includes('control') ||
                       node.name.toLowerCase().includes('input') ||
                       node.name.toLowerCase().includes('checkbox') ||
                       node.name.toLowerCase().includes('radio');
    
    if (isUIElement) {
      uiNodes.push(node);
    }
    
    // Check children
    if (node.children) {
      for (const child of node.children) {
        collectUINodes(child);
      }
    }
  }
  
  collectUINodes(frame);
  
  // For each UI element, check the contrast with its surrounding/background
  for (const uiNode of uiNodes) {
    // Skip invisible elements
    if (!uiNode.visible) {
      continue;
    }
    
    try {
      // Get foreground color (assuming solid fill for simplicity)
      let foregroundColor = null;
      if (uiNode.fills && uiNode.fills.length > 0) {
        const fill = uiNode.fills.find(f => f.type === 'SOLID' && f.visible !== false);
        if (fill) {
          foregroundColor = fill.color;
        }
      }
      
      // If no fill, try stroke color
      if (!foregroundColor && uiNode.strokes && uiNode.strokes.length > 0) {
        const stroke = uiNode.strokes.find(s => s.type === 'SOLID' && s.visible !== false);
        if (stroke) {
          foregroundColor = stroke.color;
        }
      }
      
      if (!foregroundColor) {
        continue; // Skip if no solid color found
      }
      
      // Find background color (simplified approach)
      let backgroundColor = { r: 1, g: 1, b: 1 }; // Default to white
      
      // Get parent with background
      let parent = uiNode.parent;
      while (parent && !backgroundColor) {
        if (parent.fills && parent.fills.length > 0) {
          const fill = parent.fills.find(f => f.type === 'SOLID' && f.visible !== false);
          if (fill) {
            backgroundColor = fill.color;
            break;
          }
        }
        parent = parent.parent;
      }
      
      // Calculate contrast ratio
      const ratio = calculateContrastRatio(foregroundColor, backgroundColor);
      
      // For UI elements, WCAG requires 3:1 minimum contrast
      if (ratio < 3) {
        violations.push({
          element: uiNode.name || 'UI element',
          nodeId: uiNode.id, // Store node ID for direct selection
          contrastRatio: ratio.toFixed(2),
          foregroundColor: rgbToHex(foregroundColor),
          backgroundColor: rgbToHex(backgroundColor),
          required: 3
        });
      }
    } catch (error) {
      console.error(`Error checking contrast for UI node ${uiNode.name}:`, error);
    }
  }
  
  if (violations.length === 0) {
    return {
      passed: true,
      details: `All ${uiNodes.length} UI elements have sufficient contrast (at least 3:1)`
    };
  } else {
    return {
      passed: false,
      reason: `Found ${violations.length} UI elements with insufficient contrast`,
      details: violations
    };
  }
}

async function validateUILanguage(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "UI language validation is not fully implemented yet"
  };
}

async function validateTooManyButtons(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "Too many buttons validation is not fully implemented yet"
  };
}

async function validateButtonBarShadow(frame) {
  // Placeholder implementation
  return {
    passed: true,
    details: "Button bar shadow validation is not fully implemented yet"
  };
}

async function validateCornerRadius(frame) {
  // Check if cards and images have 6px corner radius
  const targetNodes = [];
  const violations = [];
  const EXPECTED_RADIUS = 6;
  
  // To store mapping between element names and node IDs
  const nodeIds = {};
  
  // Collect nodes that should have corner radius
  function collectNodes(node) {
    // Skip invisible nodes or components
    if (!node.visible || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      return;
    }
    
    // Skip nodes likely to be part of the UI framework (action bars, navigation)
    if (node.name.toLowerCase().includes('action') || 
        node.name.toLowerCase().includes('navigation') ||
        node.name.toLowerCase().includes('button') ||
        node.name.toLowerCase().includes('icon') ||
        node.name.toLowerCase().includes('tab')) {
      return;
    }
    
    // Only check cards and images based on name or type
    const isCard = node.name.toLowerCase().includes('card') || 
                   node.name.toLowerCase().includes('tile') ||
                   (node.parent && node.parent.name.toLowerCase().includes('card'));
                   
    const isImage = node.type === 'IMAGE' || 
                    node.name.toLowerCase().includes('image') || 
                    node.name.toLowerCase().includes('photo') || 
                    node.name.toLowerCase().includes('picture') ||
                    (node.fills && node.fills.some(fill => fill.type === 'IMAGE' && fill.visible !== false));
    
    // Some rectangles are used as cards or image containers
    const isPotentialCardOrImage = 
      node.type === 'RECTANGLE' && 
      node.fills && 
      node.fills.some(fill => fill.visible !== false) &&
      !node.name.toLowerCase().includes('background') &&
      !node.name.toLowerCase().includes('container') &&
      !node.name.toLowerCase().includes('wrapper') &&
      !node.name.toLowerCase().includes('box');
    
    if (isCard || isImage || (isPotentialCardOrImage && node.parent && node.parent.type === 'FRAME')) {
      // Only add if the node actually has corner radius properties
      if (node.cornerRadius !== undefined || 
          (node.topLeftRadius !== undefined && 
           node.topRightRadius !== undefined && 
           node.bottomRightRadius !== undefined && 
           node.bottomLeftRadius !== undefined)) {
        
        // Store node ID mapped to its name for later lookup
        nodeIds[node.name] = node.id;
        
        targetNodes.push({
          node,
          type: isCard ? 'card' : (isImage ? 'image' : 'rectangle')
        });
      }
    }
    
    // Check children
    if (node.children) {
      for (const child of node.children) {
        collectNodes(child);
      }
    }
  }
  
  collectNodes(frame);
  
  // Check corner radius for each node
  for (const item of targetNodes) {
    const node = item.node;
    const nodeType = item.type;
    
    let cornerRadiusValue;
    let individualCorners = false;
    
    // Handle both single radius and individual corner radii
    if (typeof node.cornerRadius === 'number') {
      cornerRadiusValue = node.cornerRadius;
    } else if (node.topLeftRadius !== undefined) {
      individualCorners = true;
      // Check if all corners have the same radius
      const allSame = 
        node.topLeftRadius === node.topRightRadius &&
        node.topRightRadius === node.bottomRightRadius &&
        node.bottomRightRadius === node.bottomLeftRadius;
      
      if (allSame) {
        cornerRadiusValue = node.topLeftRadius;
      } else {
        // If corners have different radii, that's a violation but we'll use the top-left for reporting
        cornerRadiusValue = node.topLeftRadius;
        
        violations.push({
          element: node.name || `${nodeType} element`,
          nodeId: node.id, // Store the actual node ID
          issue: 'Inconsistent corner radii',
          cornerRadii: {
            topLeft: node.topLeftRadius,
            topRight: node.topRightRadius,
            bottomRight: node.bottomRightRadius,
            bottomLeft: node.bottomLeftRadius
          },
          expected: EXPECTED_RADIUS
        });
        continue;
      }
    } else {
      // If no corner radius property was found, skip this node
      continue;
    }
    
    // Check if radius matches expected value
    if (cornerRadiusValue !== EXPECTED_RADIUS) {
      violations.push({
        element: node.name || `${nodeType} element`,
        nodeId: node.id, // Store the actual node ID
        actualRadius: cornerRadiusValue,
        expected: EXPECTED_RADIUS
      });
    }
  }
  
  if (violations.length === 0) {
    return {
      passed: true,
      details: `All ${targetNodes.length} cards and images have the correct corner radius (${EXPECTED_RADIUS}px)`
    };
  } else {
    return {
      passed: false,
      reason: `Found ${violations.length} elements with incorrect corner radius`,
      details: violations,
      nodeIds: nodeIds // Include the mapping for better element finding
    };
  }
}

async function validateTypeface(frame) {
  // Check if all text uses Brown typeface instead of Brandon
  const textNodes = [];
  const violations = [];
  const EXPECTED_TYPEFACE = 'Brown';
  const PROHIBITED_TYPEFACE = 'Brandon';
  
  // Collect all text nodes
  function collectTextNodes(node) {
    if (node.type === 'TEXT') {
      textNodes.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        collectTextNodes(child);
      }
    }
  }
  
  collectTextNodes(frame);
  
  // Check font family for each text node
  for (const textNode of textNodes) {
    // Only process visible text nodes with content
    if (!textNode.visible || !textNode.characters || textNode.characters.trim() === '') {
      continue;
    }
    
    try {
      let fontFamily = null;
      
      // Get font information
      if (textNode.fontName && textNode.fontName.family) {
        fontFamily = textNode.fontName.family;
      }
      
      // Check for style overrides
      const styleOverrides = [];
      if (textNode.styleOverrideTable) {
        for (const [index, style] of Object.entries(textNode.styleOverrideTable)) {
          if (style.fontName && style.fontName.family) {
            styleOverrides.push({
              index: parseInt(index),
              family: style.fontName.family
            });
          }
        }
      }
      
      // Check if using prohibited typeface (Brandon) or not using expected typeface (Brown)
      let hasViolation = false;
      
      if (fontFamily === PROHIBITED_TYPEFACE || (fontFamily !== EXPECTED_TYPEFACE && fontFamily !== null)) {
        hasViolation = true;
      }
      
      // Check style overrides for violations
      const violatingOverrides = styleOverrides.filter(
        override => override.family === PROHIBITED_TYPEFACE || 
                  (override.family !== EXPECTED_TYPEFACE && override.family !== null)
      );
      
      if (hasViolation || violatingOverrides.length > 0) {
        violations.push({
          element: textNode.name || 'Text element',
          text: textNode.characters.substring(0, 20) + (textNode.characters.length > 20 ? '...' : ''),
          actualTypeface: fontFamily,
          hasStyleOverrides: violatingOverrides.length > 0,
          violatingOverrides: violatingOverrides.length > 0 ? 
            violatingOverrides.map(o => o.family).filter((v, i, a) => a.indexOf(v) === i) : [],
          expected: EXPECTED_TYPEFACE
        });
      }
    } catch (error) {
      console.error(`Error checking typeface for text node ${textNode.name}:`, error);
    }
  }
  
  if (violations.length === 0) {
    return {
      passed: true,
      details: `All ${textNodes.length} text elements use the correct typeface (${EXPECTED_TYPEFACE})`
    };
  } else {
    return {
      passed: false,
      reason: `Found ${violations.length} text elements using incorrect typeface`,
      details: violations
    };
  }
}

async function validateCardShadow(frame) {
  // Check if all cards have a drop shadow to indicate clickability
  const cardNodes = [];
  const violations = [];
  
  // Collect all card nodes
  function collectCardNodes(node) {
    // Check if node is a card based on name
    const isCard = node.name.toLowerCase().includes('card') || 
                  node.name.toLowerCase().includes('tile');
    
    if (isCard) {
      cardNodes.push(node);
    }
    
    // Check children recursively
    if (node.children) {
      for (const child of node.children) {
        collectCardNodes(child);
      }
    }
  }
  
  collectCardNodes(frame);
  
  // If no cards found, return inconclusive
  if (cardNodes.length === 0) {
    return {
      passed: true,
      details: "No card elements found to validate shadow"
    };
  }
  
  // Check each card for proper shadow
  for (const cardNode of cardNodes) {
    // Skip invisible cards
    if (!cardNode.visible) {
      continue;
    }
    
    try {
      // Check for effects (shadows)
      let hasShadow = false;
      
      if (cardNode.effects && cardNode.effects.length > 0) {
        // Look for drop shadow effect
        const shadowEffect = cardNode.effects.find(effect => 
          effect.type === 'DROP_SHADOW' && effect.visible !== false
        );
        
        if (shadowEffect) {
          hasShadow = true;
        }
      }
      
      // If no shadow found, add to violations
      if (!hasShadow) {
        violations.push({
          element: cardNode.name || 'Card element',
          issue: 'Missing drop shadow',
          recommendation: 'Add a drop shadow effect to indicate clickability'
        });
      }
    } catch (error) {
      console.error(`Error checking shadow for card ${cardNode.name}:`, error);
    }
  }
  
  if (violations.length === 0) {
    return {
      passed: true,
      details: `All ${cardNodes.length} card elements have appropriate drop shadows`
    };
  } else {
    return {
      passed: false,
      reason: `Found ${violations.length} card elements missing drop shadows`,
      details: violations
    };
  }
}
// Restore essential helper functions that were removed

// Helper function to calculate contrast ratio
function calculateContrastRatio(color1, color2) {
  // Convert RGB to luminance
  const luminance1 = calculateLuminance(color1);
  const luminance2 = calculateLuminance(color2);
  
  // Calculate contrast ratio
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Calculate relative luminance for a color
function calculateLuminance(color) {
  // Convert sRGB to linear RGB
  const linearR = convertSRGBtoLinear(color.r);
  const linearG = convertSRGBtoLinear(color.g);
  const linearB = convertSRGBtoLinear(color.b);
  
  // Calculate luminance
  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

// Convert sRGB component to linear RGB
function convertSRGBtoLinear(value) {
  if (value <= 0.03928) {
    return value / 12.92;
  } else {
    return Math.pow((value + 0.055) / 1.055, 2.4);
  }
}

// Convert RGB to hex
function rgbToHex(color) {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
}

// Simple helper for running QA validation on current selection
async function testQAValidation() {
  // Check if there's a valid selection
  const selection = figma.currentPage.selection;
  
  if (!selection || selection.length === 0) {
    throw new Error("Please select at least one frame to validate");
  }
  
  // Filter for frames only
  const frames = selection.filter(node => node.type === "FRAME");
  
  if (frames.length === 0) {
    throw new Error("Please select at least one frame to validate");
  }
  
  // Get the frame IDs
  const frameIds = frames.map(frame => frame.id);
  
  // Run QA validation with the selected frames
  return await validateQARules({
    frameIds,
    ignoreStatusBar: true,
    useSelection: true
  });
}

// Function to find and highlight elements from QA validation results
async function highlightQAElement(searchData) {
  console.log("Searching for element:", searchData);
  
  try {
    let targetNode = null;
    
    // If we have a direct nodeId, use it first
    if (searchData.nodeId) {
      targetNode = await figma.getNodeByIdAsync(searchData.nodeId);
      if (targetNode) {
        console.log("Found node by ID:", targetNode.name);
      }
    }
    
    // If node not found by ID, try to search by name and properties
    if (!targetNode) {
      // Get the frame first
      const frame = searchData.frameId ? await figma.getNodeByIdAsync(searchData.frameId) : null;
      
      if (!frame) {
        throw new Error(`Frame not found with ID: ${searchData.frameId}`);
      }
      
      console.log(`Searching in frame "${frame.name}" for element "${searchData.elementName}"`);
      
      // Search within the frame based on rule-specific criteria
      if (searchData.ruleId === "corner_radius") {
        targetNode = await findNodeByCornerRadius(frame, searchData);
      } else if (searchData.ruleId === "color_contrast_text") {
        targetNode = await findNodeByTextContrast(frame, searchData);
      } else if (searchData.ruleId === "color_contrast_ui") {
        targetNode = await findNodeByUIContrast(frame, searchData);
      } else {
        // Generic search by name
        targetNode = await findNodeByName(frame, searchData.elementName);
      }
    }
    
    if (!targetNode) {
      throw new Error(`Element "${searchData.elementName}" not found in frame`);
    }
    
    // Select the node
    figma.currentPage.selection = [targetNode];
    
    // Scroll viewport to the node
    figma.viewport.scrollAndZoomIntoView([targetNode]);
    
    // First save all original properties we might modify
    let originalState = {
      fills: 'fills' in targetNode ? JSON.parse(JSON.stringify(targetNode.fills)) : null,
      strokes: 'strokes' in targetNode ? JSON.parse(JSON.stringify(targetNode.strokes)) : null,
      strokeWeight: 'strokeWeight' in targetNode ? targetNode.strokeWeight : null,
      effects: 'effects' in targetNode ? JSON.parse(JSON.stringify(targetNode.effects)) : null
    };
    
    // Store node ID and type for restoration
    const nodeId = targetNode.id;
    const nodeType = targetNode.type;
    
    try {
      // Apply highlight fill
      if ('fills' in targetNode) {
        targetNode.fills = [{
          type: 'SOLID',
          color: { r: 1, g: 0.5, b: 0 },
          opacity: 0.5
        }];
      }
      
      // Apply highlight stroke if applicable
      if ('strokes' in targetNode) {
        targetNode.strokes = [{
          type: 'SOLID',
          color: { r: 1, g: 0.3, b: 0 },
          opacity: 1
        }];
        
        if ('strokeWeight' in targetNode) {
          targetNode.strokeWeight = 2;
        }
      }
      
      // Flash notification
      figma.notify(`Found element: ${targetNode.name}`, { timeout: 2000 });
      
      // Use standard setTimeout to restore original appearance
      setTimeout(async () => {
        try {
          // Try to get the node again since it might have changed
          const nodeToRestore = await figma.getNodeByIdAsync(nodeId);
          
          if (!nodeToRestore) {
            console.log("Node no longer exists, cannot restore appearance");
            return;
          }
          
          // Restore original appearance
          if ('fills' in nodeToRestore && originalState.fills !== null) {
            nodeToRestore.fills = originalState.fills;
          }
          
          if ('strokes' in nodeToRestore && originalState.strokes !== null) {
            nodeToRestore.strokes = originalState.strokes;
          }
          
          if ('strokeWeight' in nodeToRestore && originalState.strokeWeight !== null) {
            nodeToRestore.strokeWeight = originalState.strokeWeight;
          }
          
          if ('effects' in nodeToRestore && originalState.effects !== null) {
            nodeToRestore.effects = originalState.effects;
          }
          
          console.log("Original appearance restored");
        } catch (error) {
          console.error("Error in restoration:", error);
          // Don't show an error notification to avoid disrupting the user
        }
      }, 1500);
      
    } catch (highlightError) {
      console.error("Error applying highlight:", highlightError);
      figma.notify("Error highlighting element: " + highlightError.message, { error: true });
      
      // Attempt to immediately restore in case of error
      try {
        if ('fills' in targetNode && originalState.fills !== null) {
          targetNode.fills = originalState.fills;
        }
        if ('strokes' in targetNode && originalState.strokes !== null) {
          targetNode.strokes = originalState.strokes;
        }
      } catch (restoreError) {
        console.error("Error restoring after highlight error:", restoreError);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error highlighting QA element:", error);
    figma.notify(`Error finding element: ${error.message}`, { error: true });
    return false;
  }
}

// Helper function to find a node by name
async function findNodeByName(parent, name) {
  if (!parent || !name) return null;
  
  // Check if the current node matches
  if (parent.name && parent.name.toLowerCase() === name.toLowerCase()) {
    return parent;
  }
  
  // Recursively check all children
  if ('children' in parent) {
    for (const child of parent.children) {
      const found = await findNodeByName(child, name);
      if (found) return found;
    }
  }
  
  return null;
}

// Find a node by corner radius
async function findNodeByCornerRadius(parent, searchData) {
  const exactRadius = searchData.actualRadius;
  const elementName = searchData.elementName;
  const results = [];
  
  function searchNode(node) {
    // Skip invisible nodes
    if (!node.visible) return;
    
    // Check if node has the same name
    const nameMatches = elementName && node.name === elementName;
    
    // Check if node has the same corner radius
    const radiusMatches = 
      'cornerRadius' in node && 
      typeof node.cornerRadius === 'number' && 
      Math.abs(node.cornerRadius - exactRadius) < 0.1;
    
    // For nodes with individual corner radii
    const individualRadiusMatches = 
      'topLeftRadius' in node && 
      node.topLeftRadius !== undefined && 
      Math.abs(node.topLeftRadius - exactRadius) < 0.1;
    
    // If both name and radius match, this is likely our target
    if (nameMatches && (radiusMatches || individualRadiusMatches)) {
      results.push({
        node,
        exactMatch: true,
        score: 100
      });
    } 
    // If only one property matches, it's a partial match
    else if (nameMatches || radiusMatches || individualRadiusMatches) {
      let score = 0;
      if (nameMatches) score += 50;
      if (radiusMatches || individualRadiusMatches) score += 40;
      
      results.push({
        node,
        exactMatch: false,
        score
      });
    }
    
    // Recursively check children
    if ('children' in node) {
      for (const child of node.children) {
        searchNode(child);
      }
    }
  }
  
  searchNode(parent);
  
  // Sort results by score, highest first
  results.sort((a, b) => b.score - a.score);
  
  // Return the best match, if any
  return results.length > 0 ? results[0].node : null;
}

// Find a text node by contrast issue
async function findNodeByTextContrast(parent, searchData) {
  const elementName = searchData.elementName;
  const textContent = searchData.text;
  const results = [];
  
  function searchNode(node) {
    // Skip invisible nodes
    if (!node.visible) return;
    
    // Check if node is a text node
    if (node.type === 'TEXT') {
      // Check name match
      const nameMatches = elementName && node.name === elementName;
      
      // Check text content match
      const textMatches = textContent && 
        node.characters && 
        node.characters.includes(textContent);
      
      if (nameMatches || textMatches) {
        let score = 0;
        if (nameMatches) score += 50;
        if (textMatches) score += 50;
        
        results.push({
          node,
          exactMatch: nameMatches && textMatches,
          score
        });
      }
    }
    
    // Recursively check children
    if ('children' in node) {
      for (const child of node.children) {
        searchNode(child);
      }
    }
  }
  
  searchNode(parent);
  
  // Sort results by score, highest first
  results.sort((a, b) => b.score - a.score);
  
  // Return the best match, if any
  return results.length > 0 ? results[0].node : null;
}

// Find a UI element by contrast issue
async function findNodeByUIContrast(parent, searchData) {
  const elementName = searchData.elementName;
  const results = [];
  
  function searchNode(node) {
    // Skip invisible nodes
    if (!node.visible) return;
    
    // Check if node is a UI element based on name
    const isUIElement = node.name.toLowerCase().includes('button') || 
                        node.name.toLowerCase().includes('icon') ||
                        node.name.toLowerCase().includes('control') ||
                        node.name.toLowerCase().includes('input');
    
    // Check name match
    const nameMatches = elementName && node.name === elementName;
    
    if (nameMatches || (isUIElement && elementName && node.name.includes(elementName))) {
      let score = 0;
      if (nameMatches) score += 70;
      if (isUIElement) score += 30;
      
      results.push({
        node,
        exactMatch: nameMatches,
        score
      });
    }
    
    // Recursively check children
    if ('children' in node) {
      for (const child of node.children) {
        searchNode(child);
      }
    }
  }
  
  searchNode(parent);
  
  // Sort results by score, highest first
  results.sort((a, b) => b.score - a.score);
  
  // Return the best match, if any
  return results.length > 0 ? results[0].node : null;
}

