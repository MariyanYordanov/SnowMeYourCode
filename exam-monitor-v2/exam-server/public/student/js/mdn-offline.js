/**
 * Offline MDN Reference Data
 * Core JavaScript APIs for SPA development
 */

export const OFFLINE_MDN = {
    fetch: {
        title: 'Fetch API',
        syntax: 'fetch(url, options)',
        description: 'Modern way to make HTTP requests and handle responses',
        examples: [
            {
                title: 'Basic GET request',
                code: `fetch('/api/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`
            },
            {
                title: 'POST with JSON',
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
        methods: [
            { name: 'then()', description: 'Handle successful response' },
            { name: 'catch()', description: 'Handle errors' },
            { name: 'finally()', description: 'Always execute after request' }
        ],
        properties: [
            { name: 'response.ok', type: 'boolean', description: 'True if status 200-299' },
            { name: 'response.status', type: 'number', description: 'HTTP status code' },
            { name: 'response.json()', type: 'Promise', description: 'Parse as JSON' }
        ]
    },

    dom: {
        title: 'DOM API',
        syntax: 'document.method()',
        description: 'Document Object Model manipulation methods',
        examples: [
            {
                title: 'Select elements',
                code: `// Select single element
const button = document.querySelector('#myButton');

// Select multiple elements
const items = document.querySelectorAll('.item');
items.forEach(item => {
  item.addEventListener('click', handleClick);
});`
            },
            {
                title: 'Create and append',
                code: `// Create element
const div = document.createElement('div');
div.textContent = 'Hello World';
div.className = 'greeting';

// Append to page
document.body.appendChild(div);`
            }
        ],
        methods: [
            { name: 'querySelector()', description: 'Select first matching element' },
            { name: 'querySelectorAll()', description: 'Select all matching elements' },
            { name: 'createElement()', description: 'Create new element' },
            { name: 'addEventListener()', description: 'Add event listener' }
        ]
    },

    array: {
        title: 'Array Methods',
        syntax: 'array.method(callback)',
        description: 'Array manipulation and iteration methods',
        examples: [
            {
                title: 'Transform arrays',
                code: `const numbers = [1, 2, 3, 4, 5];

// Transform each element
const doubled = numbers.map(num => num * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// Filter elements
const evens = numbers.filter(num => num % 2 === 0);
console.log(evens); // [2, 4]`
            },
            {
                title: 'Find elements',
                code: `const users = [
  { id: 1, name: 'John', age: 30 },
  { id: 2, name: 'Jane', age: 25 }
];

// Find single element
const user = users.find(u => u.id === 2);
console.log(user); // { id: 2, name: 'Jane', age: 25 }

// Check if exists
const hasAdult = users.some(u => u.age >= 18);
console.log(hasAdult); // true`
            }
        ],
        methods: [
            { name: 'map()', description: 'Transform each element' },
            { name: 'filter()', description: 'Select elements by condition' },
            { name: 'find()', description: 'Find first matching element' },
            { name: 'forEach()', description: 'Execute function for each element' },
            { name: 'reduce()', description: 'Reduce to single value' }
        ]
    },

    object: {
        title: 'Object Methods',
        syntax: 'Object.method(obj)',
        description: 'Object manipulation utilities',
        examples: [
            {
                title: 'Object keys and values',
                code: `const user = { name: 'John', age: 30, city: 'Sofia' };

// Get all keys
const keys = Object.keys(user);
console.log(keys); // ['name', 'age', 'city']

// Get all values
const values = Object.values(user);
console.log(values); // ['John', 30, 'Sofia']

// Get key-value pairs
const entries = Object.entries(user);
console.log(entries); // [['name', 'John'], ['age', 30], ['city', 'Sofia']]`
            },
            {
                title: 'Merge objects',
                code: `const defaults = { theme: 'light', lang: 'en' };
const userPrefs = { theme: 'dark' };

// Merge objects
const config = Object.assign({}, defaults, userPrefs);
console.log(config); // { theme: 'dark', lang: 'en' }

// Modern spread syntax
const config2 = { ...defaults, ...userPrefs };
console.log(config2); // { theme: 'dark', lang: 'en' }`
            }
        ],
        methods: [
            { name: 'Object.keys()', description: 'Get array of property names' },
            { name: 'Object.values()', description: 'Get array of property values' },
            { name: 'Object.entries()', description: 'Get array of [key, value] pairs' },
            { name: 'Object.assign()', description: 'Copy properties to target object' }
        ]
    },

    json: {
        title: 'JSON API',
        syntax: 'JSON.method(data)',
        description: 'JavaScript Object Notation parsing and stringifying',
        examples: [
            {
                title: 'Parse JSON string',
                code: `// Parse JSON string to object
const jsonString = '{"name": "John", "age": 30}';
const obj = JSON.parse(jsonString);
console.log(obj.name); // 'John'

// Handle parse errors
try {
  const data = JSON.parse(invalidJson);
} catch (error) {
  console.error('Invalid JSON:', error.message);
}`
            },
            {
                title: 'Convert to JSON',
                code: `// Convert object to JSON string
const user = { name: 'John', age: 30 };
const json = JSON.stringify(user);
console.log(json); // '{"name":"John","age":30}'

// Pretty print with indentation
const prettyJson = JSON.stringify(user, null, 2);
console.log(prettyJson);`
            }
        ],
        methods: [
            { name: 'JSON.parse()', description: 'Parse JSON string to object' },
            { name: 'JSON.stringify()', description: 'Convert object to JSON string' }
        ]
    },

    storage: {
        title: 'Storage API',
        syntax: 'localStorage.method()',
        description: 'Browser storage for persistent data',
        examples: [
            {
                title: 'Store and retrieve',
                code: `// Store simple data
localStorage.setItem('username', 'john123');
localStorage.setItem('theme', 'dark');

// Store objects (convert to JSON)
const user = { name: 'John', preferences: { theme: 'dark' } };
localStorage.setItem('user', JSON.stringify(user));

// Retrieve data
const username = localStorage.getItem('username');
const userObj = JSON.parse(localStorage.getItem('user'));
console.log(username, userObj);`
            },
            {
                title: 'Check and remove',
                code: `// Check if item exists
if (localStorage.getItem('theme')) {
  console.log('Theme is set');
}

// Remove single item
localStorage.removeItem('username');

// Clear all storage
localStorage.clear();`
            }
        ],
        methods: [
            { name: 'setItem(key, value)', description: 'Store data' },
            { name: 'getItem(key)', description: 'Retrieve data' },
            { name: 'removeItem(key)', description: 'Remove data' },
            { name: 'clear()', description: 'Clear all data' }
        ]
    },

    promise: {
        title: 'Promise API',
        syntax: 'new Promise(executor)',
        description: 'Handle asynchronous operations',
        examples: [
            {
                title: 'Create Promise',
                code: `// Create new Promise
const myPromise = new Promise((resolve, reject) => {
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
                code: `// Modern async/await syntax
async function fetchUserData() {
  try {
    const response = await fetch('/api/user');
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Use async function
fetchUserData()
  .then(user => console.log(user))
  .catch(error => console.error(error));`
            }
        ],
        methods: [
            { name: 'then()', description: 'Handle successful result' },
            { name: 'catch()', description: 'Handle errors' },
            { name: 'finally()', description: 'Always execute' },
            { name: 'Promise.all()', description: 'Wait for all promises' }
        ]
    },

    classes: {
        title: 'ES6 Classes',
        syntax: 'class ClassName { }',
        description: 'Object-oriented programming with classes',
        examples: [
            {
                title: 'Basic class',
                code: `class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
  
  greet() {
    return \`Hello, I'm \${this.name}\`;
  }
  
  getInfo() {
    return {
      name: this.name,
      email: this.email
    };
  }
}

// Create instance
const user = new User('John', 'john@example.com');
console.log(user.greet()); // 'Hello, I'm John'`
            },
            {
                title: 'Inheritance',
                code: `class Admin extends User {
  constructor(name, email, permissions) {
    super(name, email); // Call parent constructor
    this.permissions = permissions;
  }
  
  hasPermission(action) {
    return this.permissions.includes(action);
  }
}

// Create admin
const admin = new Admin('Jane', 'jane@example.com', ['read', 'write']);
console.log(admin.greet()); // 'Hello, I'm Jane'
console.log(admin.hasPermission('write')); // true`
            }
        ],
        methods: [
            { name: 'constructor()', description: 'Initialize instance' },
            { name: 'super()', description: 'Call parent method' },
            { name: 'static method()', description: 'Class-level method' }
        ]
    }
};

export const MDN_URLS = {
    fetch: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
    dom: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model',
    array: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#instance_methods',
    object: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object#static_methods',
    json: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON',
    storage: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API',
    promise: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
    classes: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes'
};