// ui.js - UI related functions

import { flattenObject, sanitizeNodeForDisplay } from './utils.js';

/**
 * Create a tooltip element
 * @param {string} text - Tooltip text
 * @param {Object} position - Position {x, y}
 * @returns {HTMLElement} The created tooltip element
 */
export function createTooltip(text, position) {
  const tooltip = document.createElement('div');
  tooltip.className = 'mcp-tooltip';
  tooltip.textContent = text;
  
  tooltip.style.position = 'absolute';
  tooltip.style.left = `${position.x}px`;
  tooltip.style.top = `${position.y}px`;
  tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  tooltip.style.color = 'white';
  tooltip.style.padding = '4px 8px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.zIndex = '1000';
  tooltip.style.pointerEvents = 'none';
  
  document.body.appendChild(tooltip);
  
  // Position adjustment to ensure tooltip is visible
  const rect = tooltip.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    tooltip.style.left = `${position.x - rect.width}px`;
  }
  if (rect.bottom > window.innerHeight) {
    tooltip.style.top = `${position.y - rect.height}px`;
  }
  
  return tooltip;
}

/**
 * Remove a tooltip element
 * @param {HTMLElement} tooltip - The tooltip element to remove
 */
export function removeTooltip(tooltip) {
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
  }
}

/**
 * Create a toast notification
 * @param {string} message - Toast message
 * @param {string} type - Type of toast (success, error, info, warning)
 * @param {number} duration - Duration in ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('mcp-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'mcp-toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '1000';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `mcp-toast mcp-toast-${type}`;
  toast.textContent = message;
  
  // Style the toast
  toast.style.backgroundColor = type === 'success' ? '#4CAF50' : 
                               type === 'error' ? '#F44336' : 
                               type === 'warning' ? '#FF9800' : '#2196F3';
  toast.style.color = 'white';
  toast.style.padding = '12px 16px';
  toast.style.marginTop = '8px';
  toast.style.borderRadius = '4px';
  toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  toast.style.minWidth = '200px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Fade out and remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.parentNode.removeChild(toastContainer);
      }
    }, 300);
  }, duration);
  
  return toast;
}

/**
 * Format a node for display in the UI
 * @param {Object} node - The node to format
 * @param {boolean} includeChildren - Whether to include children
 * @returns {Object} Formatted node for display
 */
export function formatNodeForDisplay(node, includeChildren = false) {
  // Use the sanitizeNodeForDisplay utility to format the node
  const formattedNode = sanitizeNodeForDisplay(node);
  
  // If we want to include children and the node has children
  if (includeChildren && node.children && node.children.length > 0) {
    formattedNode.children = node.children.map(child => 
      formatNodeForDisplay(child, false) // Don't go deeper than one level
    );
  }
  
  return formattedNode;
}

/**
 * Format error for display in the UI
 * @param {Error} error - The error to format
 * @returns {Object} Formatted error object
 */
export function formatErrorForDisplay(error) {
  return {
    message: error.message || 'Unknown error',
    stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
    name: error.name,
    code: error.code
  };
}

/**
 * Create a popup overlay for confirmation or custom UI
 * @param {Object} options - Popup options
 * @returns {Object} Popup controller
 */
export function createPopup(options = {}) {
  const {
    title = '',
    content = '',
    width = '300px',
    height = 'auto',
    buttons = [
      { label: 'Cancel', type: 'secondary' },
      { label: 'Confirm', type: 'primary' }
    ],
    onClose = () => {},
    customClass = ''
  } = options;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'mcp-popup-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '2000';
  
  // Create popup
  const popup = document.createElement('div');
  popup.className = `mcp-popup ${customClass}`;
  popup.style.backgroundColor = 'white';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  popup.style.width = width;
  popup.style.maxWidth = '90%';
  popup.style.maxHeight = '90%';
  popup.style.overflow = 'auto';
  
  // Create header if title exists
  if (title) {
    const header = document.createElement('div');
    header.className = 'mcp-popup-header';
    header.style.padding = '16px';
    header.style.borderBottom = '1px solid #eee';
    header.style.fontWeight = 'bold';
    header.textContent = title;
    popup.appendChild(header);
  }
  
  // Create content
  const contentElement = document.createElement('div');
  contentElement.className = 'mcp-popup-content';
  contentElement.style.padding = '16px';
  
  if (typeof content === 'string') {
    contentElement.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    contentElement.appendChild(content);
  }
  
  popup.appendChild(contentElement);
  
  // Create buttons if any
  if (buttons && buttons.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'mcp-popup-footer';
    footer.style.padding = '16px';
    footer.style.borderTop = '1px solid #eee';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '8px';
    
    buttons.forEach((button) => {
      const btn = document.createElement('button');
      btn.textContent = button.label;
      btn.className = `mcp-button mcp-button-${button.type || 'secondary'}`;
      
      // Style button based on type
      btn.style.padding = '8px 16px';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      
      if (button.type === 'primary') {
        btn.style.backgroundColor = '#1E88E5';
        btn.style.color = 'white';
      } else {
        btn.style.backgroundColor = '#e0e0e0';
        btn.style.color = '#333';
      }
      
      btn.addEventListener('click', (e) => {
        if (button.onClick) {
          button.onClick(e);
        }
        
        if (button.closeOnClick !== false) {
          closePopup();
        }
      });
      
      footer.appendChild(btn);
    });
    
    popup.appendChild(footer);
  }
  
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  // Close popup function
  const closePopup = () => {
    document.body.removeChild(overlay);
    onClose();
  };
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', handler);
    }
  });
  
  return {
    element: popup,
    overlay,
    close: closePopup,
    setContent: (newContent) => {
      contentElement.innerHTML = '';
      if (typeof newContent === 'string') {
        contentElement.innerHTML = newContent;
      } else if (newContent instanceof HTMLElement) {
        contentElement.appendChild(newContent);
      }
    }
  };
}

/**
 * Create a tabbed interface
 * @param {Object} options - Tab options
 * @returns {HTMLElement} The tab container element
 */
export function createTabbedInterface(options = {}) {
  const {
    tabs = [],
    activeTab = 0,
    onChange = () => {}
  } = options;
  
  const container = document.createElement('div');
  container.className = 'mcp-tabs-container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '100%';
  
  // Create tab headers
  const tabHeaders = document.createElement('div');
  tabHeaders.className = 'mcp-tab-headers';
  tabHeaders.style.display = 'flex';
  tabHeaders.style.borderBottom = '1px solid #ddd';
  
  // Create tab content container
  const tabContents = document.createElement('div');
  tabContents.className = 'mcp-tab-contents';
  
  // Create each tab and content
  tabs.forEach((tab, index) => {
    // Create tab header
    const tabHeader = document.createElement('div');
    tabHeader.className = `mcp-tab-header ${index === activeTab ? 'mcp-tab-active' : ''}`;
    tabHeader.textContent = tab.label;
    tabHeader.style.padding = '10px 16px';
    tabHeader.style.cursor = 'pointer';
    tabHeader.style.borderBottom = index === activeTab ? '2px solid #1E88E5' : '2px solid transparent';
    tabHeader.style.color = index === activeTab ? '#1E88E5' : '#333';
    
    tabHeader.addEventListener('click', () => {
      // Hide all content
      Array.from(tabContents.children).forEach(content => {
        content.style.display = 'none';
      });
      
      // Show selected content
      tabContents.children[index].style.display = 'block';
      
      // Update active tab styling
      Array.from(tabHeaders.children).forEach((header, i) => {
        if (i === index) {
          header.classList.add('mcp-tab-active');
          header.style.borderBottom = '2px solid #1E88E5';
          header.style.color = '#1E88E5';
        } else {
          header.classList.remove('mcp-tab-active');
          header.style.borderBottom = '2px solid transparent';
          header.style.color = '#333';
        }
      });
      
      // Call onChange handler
      onChange(index);
    });
    
    tabHeaders.appendChild(tabHeader);
    
    // Create tab content
    const tabContent = document.createElement('div');
    tabContent.className = 'mcp-tab-content';
    tabContent.style.display = index === activeTab ? 'block' : 'none';
    tabContent.style.padding = '16px';
    
    if (typeof tab.content === 'string') {
      tabContent.innerHTML = tab.content;
    } else if (tab.content instanceof HTMLElement) {
      tabContent.appendChild(tab.content);
    }
    
    tabContents.appendChild(tabContent);
  });
  
  container.appendChild(tabHeaders);
  container.appendChild(tabContents);
  
  return container;
}

/**
 * Create a form field
 * @param {Object} options - Field options
 * @returns {HTMLElement} The field element
 */
export function createFormField(options = {}) {
  const {
    label = '',
    type = 'text',
    value = '',
    placeholder = '',
    name = '',
    required = false,
    onChange = () => {},
    options = [] // For select, radio, checkbox
  } = options;
  
  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'mcp-form-field';
  fieldContainer.style.marginBottom = '16px';
  
  // Create label if provided
  if (label) {
    const labelElement = document.createElement('label');
    labelElement.textContent = required ? `${label} *` : label;
    labelElement.style.display = 'block';
    labelElement.style.marginBottom = '4px';
    fieldContainer.appendChild(labelElement);
  }
  
  let input;
  
  // Create input based on type
  switch (type) {
    case 'textarea':
      input = document.createElement('textarea');
      input.value = value;
      input.placeholder = placeholder;
      input.name = name;
      input.required = required;
      input.style.width = '100%';
      input.style.padding = '8px';
      input.style.borderRadius = '4px';
      input.style.border = '1px solid #ddd';
      input.style.minHeight = '80px';
      break;
      
    case 'select':
      input = document.createElement('select');
      input.name = name;
      input.required = required;
      input.style.width = '100%';
      input.style.padding = '8px';
      input.style.borderRadius = '4px';
      input.style.border = '1px solid #ddd';
      
      // Add options
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.selected = option.value === value;
        input.appendChild(optionElement);
      });
      break;
      
    case 'radio':
    case 'checkbox':
      input = document.createElement('div');
      input.className = `mcp-${type}-group`;
      input.style.display = 'flex';
      input.style.flexDirection = 'column';
      input.style.gap = '8px';
      
      // Add options
      options.forEach(option => {
        const optionContainer = document.createElement('div');
        optionContainer.style.display = 'flex';
        optionContainer.style.alignItems = 'center';
        
        const optionInput = document.createElement('input');
        optionInput.type = type;
        optionInput.name = name;
        optionInput.value = option.value;
        optionInput.id = `${name}-${option.value}`;
        
        if (type === 'checkbox') {
          optionInput.checked = Array.isArray(value) && value.includes(option.value);
        } else {
          optionInput.checked = option.value === value;
        }
        
        optionInput.addEventListener('change', (e) => {
          onChange({
            name,
            value: type === 'checkbox' 
              ? Array.from(input.querySelectorAll('input:checked')).map(input => input.value)
              : e.target.value
          });
        });
        
        const optionLabel = document.createElement('label');
        optionLabel.htmlFor = `${name}-${option.value}`;
        optionLabel.textContent = option.label;
        optionLabel.style.marginLeft = '8px';
        
        optionContainer.appendChild(optionInput);
        optionContainer.appendChild(optionLabel);
        input.appendChild(optionContainer);
      });
      break;
      
    default: // text, number, email, etc.
      input = document.createElement('input');
      input.type = type;
      input.value = value;
      input.placeholder = placeholder;
      input.name = name;
      input.required = required;
      input.style.width = '100%';
      input.style.padding = '8px';
      input.style.borderRadius = '4px';
      input.style.border = '1px solid #ddd';
      break;
  }
  
  // Add change handler for simple inputs
  if (type !== 'radio' && type !== 'checkbox') {
    input.addEventListener('change', (e) => {
      onChange({
        name,
        value: e.target.value
      });
    });
  }
  
  fieldContainer.appendChild(input);
  
  return fieldContainer;
}

/**
 * Create a form with multiple fields
 * @param {Object} options - Form options
 * @returns {Object} Form controller
 */
export function createForm(options = {}) {
  const {
    fields = [],
    onSubmit = () => {},
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    showCancel = true,
    onCancel = () => {}
  } = options;
  
  const form = document.createElement('form');
  form.className = 'mcp-form';
  
  // Form values state
  const formValues = {};
  
  // Create fields
  fields.forEach(field => {
    // Set initial value in formValues
    formValues[field.name] = field.value;
    
    // Create field with handler to update formValues
    const fieldElement = createFormField({
      ...field,
      onChange: ({ name, value }) => {
        formValues[name] = value;
        if (field.onChange) {
          field.onChange({ name, value });
        }
      }
    });
    
    form.appendChild(fieldElement);
  });
  
  // Create buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'mcp-form-buttons';
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'flex-end';
  buttonsContainer.style.gap = '8px';
  buttonsContainer.style.marginTop = '16px';
  
  if (showCancel) {
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = cancelLabel;
    cancelButton.className = 'mcp-button mcp-button-secondary';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.backgroundColor = '#e0e0e0';
    cancelButton.style.color = '#333';
    cancelButton.style.cursor = 'pointer';
    
    cancelButton.addEventListener('click', () => {
      onCancel();
    });
    
    buttonsContainer.appendChild(cancelButton);
  }
  
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = submitLabel;
  submitButton.className = 'mcp-button mcp-button-primary';
  submitButton.style.padding = '8px 16px';
  submitButton.style.border = 'none';
  submitButton.style.borderRadius = '4px';
  submitButton.style.backgroundColor = '#1E88E5';
  submitButton.style.color = 'white';
  submitButton.style.cursor = 'pointer';
  
  buttonsContainer.appendChild(submitButton);
  form.appendChild(buttonsContainer);
  
  // Handle submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onSubmit(formValues);
  });
  
  return {
    element: form,
    getValues: () => ({ ...formValues }),
    setValues: (values) => {
      Object.assign(formValues, values);
      
      // Update form inputs
      fields.forEach(field => {
        const input = form.querySelector(`[name="${field.name}"]`);
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = values[field.name] || false;
          } else {
            input.value = values[field.name] || '';
          }
        }
      });
    },
    reset: () => form.reset()
  };
} 