/**
 * MDN JavaScript Reference Data
 * Contains curated API documentation for SPA development course
 */

// ================================
// MDN DATABASE STRUCTURE
// ================================

const MDN_DATABASE = {
    // Fetch API & AJAX
    fetch: {
        id: 'fetch',
        name: 'fetch()',
        category: 'fetch',
        description: 'Modern way to make HTTP requests',
        syntax: 'fetch(url, options)',
        parameters: [
            { name: 'url', type: 'string', description: 'Request URL' },
            { name: 'options', type: 'object', description: 'Request configuration (optional)' }
        ],
        returns: 'Promise<Response>',
        examples: [
            {
                title: 'Basic GET request',
                code: `fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`
            },
            {
                title: 'POST request with JSON',
                code: `fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John',
    email: 'john@example.com'
  })
})
.then(response => response.json())
.then(data => console.log(data));`
            }
        ],
        methods: ['then()', 'catch()', 'finally()'],
        relatedAPIs: ['Response', 'Request', 'Headers']
    },

    response: {
        id: 'response',
        name: 'Response',
        category: 'fetch',
        description: 'Represents response to a fetch request',
        syntax: 'response.method()',
        properties: [
            { name: 'ok', type: 'boolean', description: 'True if status 200-299' },
            { name: 'status', type: 'number', description: 'HTTP status code' },
            { name: 'statusText', type: 'string', description: 'HTTP status message' },
            { name: 'headers', type: 'Headers', description: 'Response headers' }
        ],
        methods: [
            { name: 'json()', returns: 'Promise', description: 'Parse response as JSON' },
            { name: 'text()', returns: 'Promise', description: 'Parse response as text' },
            { name: 'blob()', returns: 'Promise', description: 'Parse response as blob' }
        ],
        examples: [
            {
                title: 'Check response status',
                code: `fetch('/api/data')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => console.log(data));`
            }
        ]
    },

    // DOM API
    querySelector: {
        id: 'querySelector',
        name: 'querySelector()',
        category: 'dom',
        description: 'Select first element matching CSS selector',
        syntax: 'document.querySelector(selector)',
        parameters: [
            { name: 'selector', type: 'string', description: 'CSS selector string' }
        ],
        returns: 'Element | null',
        examples: [
            {
                title: 'Select by ID',
                code: `const button = document.querySelector('#myButton');
console.log(button);`
            },
            {
                title: 'Select by class',
                code: `const firstCard = document.querySelector('.card');
console.log(firstCard);`
            },
            {
                title: 'Complex selector',
                code: `const input = document.querySelector('form input[type="email"]');
input.focus();`
            }
        ],
        relatedAPIs: ['querySelectorAll', 'getElementById', 'getElementsByClassName']
    },

    querySelectorAll: {
        id: 'querySelectorAll',
        name: 'querySelectorAll()',
        category: 'dom',
        description: 'Select all elements matching CSS selector',
        syntax: 'document.querySelectorAll(selector)',
        parameters: [
            { name: 'selector', type: 'string', description: 'CSS selector string' }
        ],
        returns: 'NodeList',
        examples: [
            {
                title: 'Select all elements',
                code: `const buttons = document.querySelectorAll('.btn');
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('Button clicked');
  });
});`
            },
            {
                title: 'Convert to Array',
                code: `const items = Array.from(document.querySelectorAll('.item'));
const texts = items.map(item => item.textContent);
console.log(texts);`
            }
        ]
    },

    createElement: {
        id: 'createElement',
        name: 'createElement()',
        category: 'dom',
        description: 'Create new HTML element',
        syntax: 'document.createElement(tagName)',
        parameters: [
            { name: 'tagName', type: 'string', description: 'HTML tag name' }
        ],
        returns: 'Element',
        examples: [
            {
                title: 'Create and append element',
                code: `const div = document.createElement('div');
div.textContent = 'Hello World';
div.className = 'greeting';
document.body.appendChild(div);`
            },
            {
                title: 'Create complex element',
                code: `const button = document.createElement('button');
button.textContent = 'Click me';
button.addEventListener('click', () => {
  alert('Button clicked!');
});
document.getElementById('container').appendChild(button);`
            }
        ],
        relatedAPIs: ['appendChild', 'insertBefore', 'removeChild']
    },

    addEventListener: {
        id: 'addEventListener',
        name: 'addEventListener()',
        category: 'dom',
        description: 'Attach event handler to element',
        syntax: 'element.addEventListener(type, listener, options)',
        parameters: [
            { name: 'type', type: 'string', description: 'Event type (click, keydown, etc.)' },
            { name: 'listener', type: 'function', description: 'Event handler function' },
            { name: 'options', type: 'object', description: 'Event options (optional)' }
        ],
        examples: [
            {
                title: 'Basic click handler',
                code: `const button = document.querySelector('#myButton');
button.addEventListener('click', function(event) {
  console.log('Button clicked!');
  console.log('Event:', event);
});`
            },
            {
                title: 'Form submission',
                code: `const form = document.querySelector('#myForm');
form.addEventListener('submit', function(event) {
  event.preventDefault();
  const formData = new FormData(form);
  console.log('Form data:', Object.fromEntries(formData));
});`
            }
        ],
        relatedAPIs: ['removeEventListener', 'dispatchEvent']
    },

    // Array Methods
    map: {
        id: 'map',
        name: 'Array.map()',
        category: 'array',
        description: 'Create new array with transformed elements',
        syntax: 'array.map(callback)',
        parameters: [
            { name: 'callback', type: 'function', description: 'Transform function' }
        ],
        returns: 'Array',
        examples: [
            {
                title: 'Transform numbers',
                code: `const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(num => num * 2);
console.log(doubled); // [2, 4, 6, 8, 10]`
            },
            {
                title: 'Extract properties',
                code: `const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
];
const names = users.map(user => user.name);
console.log(names); // ['John', 'Jane']`
            }
        ],
        relatedAPIs: ['filter', 'reduce', 'forEach']
    },

    filter: {
        id: 'filter',
        name: 'Array.filter()',
        category: 'array',
        description: 'Create new array with elements that pass test',
        syntax: 'array.filter(callback)',
        parameters: [
            { name: 'callback', type: 'function', description: 'Test function' }
        ],
        returns: 'Array',
        examples: [
            {
                title: 'Filter numbers',
                code: `const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter(num => num % 2 === 0);
console.log(evens); // [2, 4, 6]`
            },
            {
                title: 'Filter objects',
                code: `const products = [
  { name: 'Laptop', price: 1000 },
  { name: 'Phone', price: 500 },
  { name: 'Tablet', price: 300 }
];
const expensive = products.filter(product => product.price > 400);
console.log(expensive);`
            }
        ]
    },

    reduce: {
        id: 'reduce',
        name: 'Array.reduce()',
        category: 'array',
        description: 'Reduce array to single value',
        syntax: 'array.reduce(callback, initialValue)',
        parameters: [
            { name: 'callback', type: 'function', description: 'Reducer function' },
            { name: 'initialValue', type: 'any', description: 'Initial accumulator value' }
        ],
        returns: 'any',
        examples: [
            {
                title: 'Sum numbers',
                code: `const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((acc, num) => acc + num, 0);
console.log(sum); // 15`
            },
            {
                title: 'Group by property',
                code: `const items = [
  { category: 'fruit', name: 'apple' },
  { category: 'fruit', name: 'banana' },
  { category: 'vegetable', name: 'carrot' }
];
const grouped = items.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item.name);
  return acc;
}, {});
console.log(grouped);`
            }
        ]
    },

    forEach: {
        id: 'forEach',
        name: 'Array.forEach()',
        category: 'array',
        description: 'Execute function for each array element',
        syntax: 'array.forEach(callback)',
        parameters: [
            { name: 'callback', type: 'function', description: 'Function to execute' }
        ],
        returns: 'undefined',
        examples: [
            {
                title: 'Log each element',
                code: `const fruits = ['apple', 'banana', 'orange'];
fruits.forEach((fruit, index) => {
  console.log(\`\${index}: \${fruit}\`);
});`
            },
            {
                title: 'Update DOM elements',
                code: `const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
  button.addEventListener('click', () => {
    button.classList.toggle('active');
  });
});`
            }
        ]
    },

    find: {
        id: 'find',
        name: 'Array.find()',
        category: 'array',
        description: 'Find first element matching condition',
        syntax: 'array.find(callback)',
        parameters: [
            { name: 'callback', type: 'function', description: 'Test function' }
        ],
        returns: 'Element | undefined',
        examples: [
            {
                title: 'Find by condition',
                code: `const users = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
  { id: 3, name: 'Bob' }
];
const user = users.find(u => u.id === 2);
console.log(user); // { id: 2, name: 'Jane' }`
            }
        ],
        relatedAPIs: ['findIndex', 'some', 'every']
    },

    // Object Methods
    objectKeys: {
        id: 'objectKeys',
        name: 'Object.keys()',
        category: 'object',
        description: 'Get array of object property names',
        syntax: 'Object.keys(obj)',
        parameters: [
            { name: 'obj', type: 'object', description: 'Target object' }
        ],
        returns: 'Array<string>',
        examples: [
            {
                title: 'Get object keys',
                code: `const user = { name: 'John', age: 30, city: 'Sofia' };
const keys = Object.keys(user);
console.log(keys); // ['name', 'age', 'city']`
            },
            {
                title: 'Iterate over object',
                code: `const config = { theme: 'dark', lang: 'bg', debug: true };
Object.keys(config).forEach(key => {
  console.log(\`\${key}: \${config[key]}\`);
});`
            }
        ],
        relatedAPIs: ['Object.values', 'Object.entries']
    },

    objectAssign: {
        id: 'objectAssign',
        name: 'Object.assign()',
        category: 'object',
        description: 'Copy properties from source to target object',
        syntax: 'Object.assign(target, ...sources)',
        parameters: [
            { name: 'target', type: 'object', description: 'Target object' },
            { name: 'sources', type: 'object[]', description: 'Source objects' }
        ],
        returns: 'object',
        examples: [
            {
                title: 'Merge objects',
                code: `const defaults = { theme: 'light', lang: 'en' };
const userPrefs = { theme: 'dark' };
const config = Object.assign({}, defaults, userPrefs);
console.log(config); // { theme: 'dark', lang: 'en' }`
            },
            {
                title: 'Clone object',
                code: `const original = { a: 1, b: 2 };
const copy = Object.assign({}, original);
copy.a = 999;
console.log(original.a); // 1 (unchanged)`
            }
        ]
    },

    // JSON API
    jsonParse: {
        id: 'jsonParse',
        name: 'JSON.parse()',
        category: 'json',
        description: 'Parse JSON string to JavaScript object',
        syntax: 'JSON.parse(text, reviver)',
        parameters: [
            { name: 'text', type: 'string', description: 'JSON string to parse' },
            { name: 'reviver', type: 'function', description: 'Transform function (optional)' }
        ],
        returns: 'any',
        examples: [
            {
                title: 'Parse JSON string',
                code: `const jsonString = '{"name": "John", "age": 30}';
const obj = JSON.parse(jsonString);
console.log(obj.name); // 'John'`
            },
            {
                title: 'Handle parse errors',
                code: `try {
  const data = JSON.parse(invalidJson);
} catch (error) {
  console.error('Invalid JSON:', error.message);
}`
            }
        ],
        relatedAPIs: ['JSON.stringify']
    },

    jsonStringify: {
        id: 'jsonStringify',
        name: 'JSON.stringify()',
        category: 'json',
        description: 'Convert JavaScript value to JSON string',
        syntax: 'JSON.stringify(value, replacer, space)',
        parameters: [
            { name: 'value', type: 'any', description: 'Value to stringify' },
            { name: 'replacer', type: 'function|array', description: 'Transform function (optional)' },
            { name: 'space', type: 'string|number', description: 'Formatting space (optional)' }
        ],
        returns: 'string',
        examples: [
            {
                title: 'Basic stringify',
                code: `const obj = { name: 'John', age: 30 };
const json = JSON.stringify(obj);
console.log(json); // '{"name":"John","age":30}'`
            },
            {
                title: 'Pretty print',
                code: `const data = { users: [{ name: 'John' }, { name: 'Jane' }] };
const pretty = JSON.stringify(data, null, 2);
console.log(pretty);`
            }
        ]
    },

    // Storage API
    localStorage: {
        id: 'localStorage',
        name: 'localStorage',
        category: 'storage',
        description: 'Store data persistently in browser',
        syntax: 'localStorage.method()',
        methods: [
            { name: 'setItem(key, value)', description: 'Store data' },
            { name: 'getItem(key)', description: 'Retrieve data' },
            { name: 'removeItem(key)', description: 'Remove data' },
            { name: 'clear()', description: 'Clear all data' }
        ],
        examples: [
            {
                title: 'Store and retrieve data',
                code: `// Store data
localStorage.setItem('username', 'john123');
localStorage.setItem('preferences', JSON.stringify({
  theme: 'dark',
  lang: 'bg'
}));

// Retrieve data
const username = localStorage.getItem('username');
const prefs = JSON.parse(localStorage.getItem('preferences'));
console.log(username, prefs);`
            },
            {
                title: 'Check if data exists',
                code: `const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.body.className = savedTheme;
} else {
  localStorage.setItem('theme', 'light');
}`
            }
        ],
        relatedAPIs: ['sessionStorage']
    },

    // Promise API
    promise: {
        id: 'promise',
        name: 'Promise',
        category: 'promise',
        description: 'Handle asynchronous operations',
        syntax: 'new Promise(executor)',
        parameters: [
            { name: 'executor', type: 'function', description: 'Function with resolve, reject parameters' }
        ],
        methods: [
            { name: 'then()', description: 'Handle success' },
            { name: 'catch()', description: 'Handle errors' },
            { name: 'finally()', description: 'Always execute' }
        ],
        examples: [
            {
                title: 'Create Promise',
                code: `const myPromise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const success = Math.random() > 0.5;
    if (success) {
      resolve('Operation successful!');
    } else {
      reject('Operation failed!');
    }
  }, 1000);
});

myPromise
  .then(result => console.log(result))
  .catch(error => console.error(error));`
            },
            {
                title: 'Async/await',
                code: `async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

fetchData().then(data => console.log(data));`
            }
        ]
    }
};

// ================================
// CATEGORY DEFINITIONS
// ================================

const CATEGORIES = {
    all: {
        name: 'All APIs',
        icon: '📚',
        description: 'Complete JavaScript reference'
    },
    fetch: {
        name: 'Fetch & AJAX',
        icon: '🌐',
        description: 'HTTP requests and responses'
    },
    dom: {
        name: 'DOM API',
        icon: '🏗️',
        description: 'Document Object Model manipulation'
    },
    array: {
        name: 'Array Methods',
        icon: '📋',
        description: 'Array manipulation and iteration'
    },
    object: {
        name: 'Object Methods',
        icon: '🔧',
        description: 'Object manipulation utilities'
    },
    storage: {
        name: 'Storage',
        icon: '💾',
        description: 'Browser storage APIs'
    },
    json: {
        name: 'JSON',
        icon: '📄',
        description: 'JSON parsing and stringifying'
    },
    promise: {
        name: 'Promises',
        icon: '⏳',
        description: 'Asynchronous programming'
    }
};

// ================================
// SEARCH INDEX
// ================================

const SEARCH_INDEX = [
    // Fetch API
    { id: 'fetch', name: 'fetch', category: 'fetch', keywords: ['ajax', 'http', 'request', 'api'] },
    { id: 'response', name: 'Response', category: 'fetch', keywords: ['http', 'status', 'json', 'text'] },

    // DOM API
    { id: 'querySelector', name: 'querySelector', category: 'dom', keywords: ['select', 'element', 'css'] },
    { id: 'querySelectorAll', name: 'querySelectorAll', category: 'dom', keywords: ['select', 'elements', 'css'] },
    { id: 'createElement', name: 'createElement', category: 'dom', keywords: ['create', 'element', 'html'] },
    { id: 'addEventListener', name: 'addEventListener', category: 'dom', keywords: ['event', 'click', 'listener'] },

    // Array Methods
    { id: 'map', name: 'Array.map', category: 'array', keywords: ['transform', 'convert', 'iterate'] },
    { id: 'filter', name: 'Array.filter', category: 'array', keywords: ['search', 'condition', 'test'] },
    { id: 'reduce', name: 'Array.reduce', category: 'array', keywords: ['sum', 'accumulate', 'combine'] },
    { id: 'forEach', name: 'Array.forEach', category: 'array', keywords: ['iterate', 'loop', 'each'] },
    { id: 'find', name: 'Array.find', category: 'array', keywords: ['search', 'locate', 'first'] },

    // Object Methods
    { id: 'objectKeys', name: 'Object.keys', category: 'object', keywords: ['properties', 'keys', 'iterate'] },
    { id: 'objectAssign', name: 'Object.assign', category: 'object', keywords: ['merge', 'copy', 'extend'] },

    // JSON
    { id: 'jsonParse', name: 'JSON.parse', category: 'json', keywords: ['parse', 'string', 'object'] },
    { id: 'jsonStringify', name: 'JSON.stringify', category: 'json', keywords: ['serialize', 'string', 'convert'] },

    // Storage
    { id: 'localStorage', name: 'localStorage', category: 'storage', keywords: ['store', 'save', 'persist'] },

    // Promises
    { id: 'promise', name: 'Promise', category: 'promise', keywords: ['async', 'await', 'then', 'catch'] }
];

// ================================
// EXPORT FUNCTIONS
// ================================

/**
 * Get MDN content by category
 */
export function getMDNContentByCategory(category) {
    if (category === 'all') {
        return generateAllCategoriesHTML();
    }

    const categoryAPIs = Object.values(MDN_DATABASE).filter(api => api.category === category);
    return generateCategoryHTML(category, categoryAPIs);
}

/**
 * Get specific API data
 */
export function getAPIData(apiId) {
    return MDN_DATABASE[apiId] || null;
}

/**
 * Search MDN database
 */
export function searchMDNDatabase(query) {
    const searchTerm = query.toLowerCase();

    return SEARCH_INDEX.filter(item => {
        return item.name.toLowerCase().includes(searchTerm) ||
            item.keywords.some(keyword => keyword.includes(searchTerm));
    });
}

/**
 * Generate API HTML
 */
export function generateAPIHTML(apiData) {
    return `
        <div class="api-reference">
            <div class="api-header">
                <h3>${apiData.name}</h3>
                <span class="api-category">${CATEGORIES[apiData.category]?.name || apiData.category}</span>
            </div>
            
            <div class="api-description">
                <p>${apiData.description}</p>
            </div>
            
            <div class="api-syntax">
                <h4>Syntax</h4>
                <code class="syntax-code">${apiData.syntax}</code>
            </div>
            
            ${apiData.parameters ? generateParametersHTML(apiData.parameters) : ''}
            ${apiData.properties ? generatePropertiesHTML(apiData.properties) : ''}
            ${apiData.methods ? generateMethodsHTML(apiData.methods) : ''}
            ${apiData.returns ? `<div class="api-returns"><h4>Returns</h4><code>${apiData.returns}</code></div>` : ''}
            
            <div class="api-examples">
                <h4>Examples</h4>
                ${apiData.examples.map(example => `
                    <div class="example-block">
                        <h5>${example.title}</h5>
                        <div class="code-example">
                            <button class="copy-code-btn">📋 Copy</button>
                            <pre><code>${escapeHTML(example.code)}</code></pre>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${apiData.relatedAPIs ? generateRelatedAPIsHTML(apiData.relatedAPIs) : ''}
        </div>
    `;
}

/**
 * Generate all categories overview HTML
 */
function generateAllCategoriesHTML() {
    const categoriesHTML = Object.entries(CATEGORIES)
        .filter(([key]) => key !== 'all')
        .map(([key, category]) => {
            const categoryAPIs = Object.values(MDN_DATABASE).filter(api => api.category === key);
            return `
                <div class="category-overview" data-category="${key}">
                    <div class="category-header">
                        <span class="category-icon">${category.icon}</span>
                        <h4>${category.name}</h4>
                        <span class="api-count">${categoryAPIs.length} APIs</span>
                    </div>
                    <p class="category-description">${category.description}</p>
                    <div class="category-apis">
                        ${categoryAPIs.slice(0, 4).map(api => `
                            <span class="api-item" data-api="${api.id}">${api.name}</span>
                        `).join('')}
                        ${categoryAPIs.length > 4 ? `<span class="more-apis">+${categoryAPIs.length - 4} more</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

    return `
        <div class="mdn-overview">
            <h3>📚 JavaScript Reference for SPA Development</h3>
            <p>Browse APIs by category or use search to find specific methods</p>
            <div class="categories-grid">
                ${categoriesHTML}
            </div>
        </div>
    `;
}

/**
 * Generate category HTML
 */
function generateCategoryHTML(category, apis) {
    const categoryInfo = CATEGORIES[category];

    return `
        <div class="category-content">
            <div class="category-title">
                <span class="category-icon">${categoryInfo.icon}</span>
                <h3>${categoryInfo.name}</h3>
            </div>
            <p class="category-description">${categoryInfo.description}</p>
            
            <div class="apis-list">
                ${apis.map(api => `
                    <div class="api-item" data-api="${api.id}">
                        <h4>${api.name}</h4>
                        <p>${api.description}</p>
                        <code class="inline-syntax">${api.syntax}</code>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Helper functions for HTML generation
 */
function generateParametersHTML(parameters) {
    return `
        <div class="api-parameters">
            <h4>Parameters</h4>
            <ul>
                ${parameters.map(param => `
                    <li>
                        <code>${param.name}</code>
                        <span class="param-type">${param.type}</span>
                        - ${param.description}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

function generatePropertiesHTML(properties) {
    return `
        <div class="api-properties">
            <h4>Properties</h4>
            <ul>
                ${properties.map(prop => `
                    <li>
                        <code>${prop.name}</code>
                        <span class="param-type">${prop.type}</span>
                        - ${prop.description}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

function generateMethodsHTML(methods) {
    return `
        <div class="api-methods">
            <h4>Methods</h4>
            <ul>
                ${methods.map(method => `
                    <li>
                        <code>${typeof method === 'string' ? method : method.name}</code>
                        ${method.returns ? `<span class="param-type">${method.returns}</span>` : ''}
                        ${method.description ? `- ${method.description}` : ''}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

function generateRelatedAPIsHTML(relatedAPIs) {
    return `
        <div class="related-apis">
            <h4>Related APIs</h4>
            <div class="related-links">
                ${relatedAPIs.map(api => `
                    <span class="related-api" data-api="${api.toLowerCase()}">${api}</span>
                `).join('')}
            </div>
        </div>
    `;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}