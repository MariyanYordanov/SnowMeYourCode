/**
 * Docs Manager - JavaScript Reference/Cheat Sheet
 */

export class DocsManager {
    constructor() {
        this.docsContent = document.getElementById('docs-content');
        this.searchInput = document.getElementById('docs-search-input');
        this.viewer = null;
        this.overlay = null;

        this.init();
    }

    init() {
        this.createViewer();
        this.renderDocs();
        this.bindEvents();
        console.log('Docs Manager initialized');
    }

    createViewer() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'docs-viewer-overlay';
        this.overlay.addEventListener('click', () => this.closeViewer());
        document.body.appendChild(this.overlay);

        // Create viewer
        this.viewer = document.createElement('div');
        this.viewer.className = 'docs-viewer';
        this.viewer.innerHTML = `
            <div class="docs-viewer-header">
                <span class="docs-viewer-title">Documentation</span>
                <button class="docs-viewer-close">&times;</button>
            </div>
            <div class="docs-viewer-body"></div>
        `;
        document.body.appendChild(this.viewer);

        this.viewer.querySelector('.docs-viewer-close').addEventListener('click', () => this.closeViewer());
    }

    bindEvents() {
        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filterDocs(e.target.value);
            });
        }

        // Section toggle
        this.docsContent?.addEventListener('click', (e) => {
            const header = e.target.closest('.docs-section-header');
            if (header) {
                const section = header.parentElement;
                section.classList.toggle('open');
            }

            const item = e.target.closest('.docs-item');
            if (item) {
                const docId = item.dataset.doc;
                this.showDoc(docId);
            }
        });

        // Copy button functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                const codeBlock = e.target.closest('.docs-code');
                const code = codeBlock.querySelector('code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    e.target.textContent = 'Copied!';
                    e.target.classList.add('copied');
                    setTimeout(() => {
                        e.target.textContent = 'Copy';
                        e.target.classList.remove('copied');
                    }, 2000);
                });
            }
        });

        // Close viewer on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.viewer.classList.contains('open')) {
                this.closeViewer();
            }
        });
    }

    filterDocs(query) {
        const sections = this.docsContent.querySelectorAll('.docs-section');
        const lowerQuery = query.toLowerCase();

        sections.forEach(section => {
            const items = section.querySelectorAll('.docs-item');
            let hasVisibleItems = false;

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                const keywords = item.dataset.keywords?.toLowerCase() || '';
                const matches = text.includes(lowerQuery) || keywords.includes(lowerQuery);

                item.classList.toggle('hidden', !matches);
                if (matches) hasVisibleItems = true;
            });

            // Show section if it has visible items or header matches
            const headerText = section.querySelector('.docs-section-header').textContent.toLowerCase();
            const sectionMatches = headerText.includes(lowerQuery) || hasVisibleItems;
            section.classList.toggle('hidden', !sectionMatches);

            // Auto-open sections with matches
            if (hasVisibleItems && query) {
                section.classList.add('open');
            }
        });
    }

    renderDocs() {
        if (!this.docsContent) return;

        this.docsContent.innerHTML = `
            <!-- JS Basics -->
            <div class="docs-section">
                <div class="docs-section-header">Variables & Data Types</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="variables" data-keywords="let const var declaration">Variables (let, const, var)</div>
                    <div class="docs-item" data-doc="datatypes" data-keywords="string number boolean null undefined">Data Types</div>
                    <div class="docs-item" data-doc="typeof" data-keywords="type check">typeof Operator</div>
                    <div class="docs-item" data-doc="typeconversion" data-keywords="parse int float string number">Type Conversion</div>
                </div>
            </div>

            <div class="docs-section">
                <div class="docs-section-header">Operators</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="arithmetic" data-keywords="+ - * / % add subtract multiply divide">Arithmetic Operators</div>
                    <div class="docs-item" data-doc="comparison" data-keywords="== === != !== > < >= <=">Comparison Operators</div>
                    <div class="docs-item" data-doc="logical" data-keywords="&& || ! and or not">Logical Operators</div>
                    <div class="docs-item" data-doc="ternary" data-keywords="? : conditional">Ternary Operator</div>
                </div>
            </div>

            <div class="docs-section">
                <div class="docs-section-header">Control Flow</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="ifelse" data-keywords="condition branch">if...else Statements</div>
                    <div class="docs-item" data-doc="switch" data-keywords="case break default">switch Statement</div>
                    <div class="docs-item" data-doc="forloop" data-keywords="iteration counter">for Loop</div>
                    <div class="docs-item" data-doc="whileloop" data-keywords="iteration condition">while / do...while</div>
                    <div class="docs-item" data-doc="forof" data-keywords="iteration array">for...of Loop</div>
                    <div class="docs-item" data-doc="forin" data-keywords="iteration object keys">for...in Loop</div>
                </div>
            </div>

            <div class="docs-section">
                <div class="docs-section-header">Functions</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="functions" data-keywords="function declaration parameters return">Function Declaration</div>
                    <div class="docs-item" data-doc="arrow" data-keywords="=> lambda">Arrow Functions</div>
                    <div class="docs-item" data-doc="parameters" data-keywords="default rest spread arguments">Parameters & Arguments</div>
                    <div class="docs-item" data-doc="scope" data-keywords="local global closure">Scope & Closure</div>
                    <div class="docs-item" data-doc="callbacks" data-keywords="callback higher order">Callbacks</div>
                </div>
            </div>

            <!-- Arrays -->
            <div class="docs-section">
                <div class="docs-section-header">Arrays</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="arraycreate" data-keywords="create new array literal">Creating Arrays</div>
                    <div class="docs-item" data-doc="arrayaccess" data-keywords="index bracket length">Accessing Elements</div>
                    <div class="docs-item" data-doc="arrayadd" data-keywords="push unshift add insert">Adding Elements</div>
                    <div class="docs-item" data-doc="arrayremove" data-keywords="pop shift splice delete">Removing Elements</div>
                    <div class="docs-item" data-doc="arrayiterate" data-keywords="foreach map filter reduce">Iteration Methods</div>
                    <div class="docs-item" data-doc="arraysearch" data-keywords="find findindex indexof includes">Search Methods</div>
                    <div class="docs-item" data-doc="arraysort" data-keywords="sort reverse">Sorting Arrays</div>
                    <div class="docs-item" data-doc="arrayother" data-keywords="slice concat join split">Other Array Methods</div>
                </div>
            </div>

            <!-- Strings -->
            <div class="docs-section">
                <div class="docs-section-header">Strings</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="stringbasics" data-keywords="create template literal">String Basics</div>
                    <div class="docs-item" data-doc="stringmethods" data-keywords="substring slice substr">Extracting Substrings</div>
                    <div class="docs-item" data-doc="stringsearch" data-keywords="indexof includes startswith endswith">Search in Strings</div>
                    <div class="docs-item" data-doc="stringmodify" data-keywords="replace replaceall toUpperCase toLowerCase trim">Modifying Strings</div>
                    <div class="docs-item" data-doc="stringsplit" data-keywords="split join">Split & Join</div>
                </div>
            </div>

            <!-- Objects -->
            <div class="docs-section">
                <div class="docs-section-header">Objects</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="objectcreate" data-keywords="create literal new">Creating Objects</div>
                    <div class="docs-item" data-doc="objectaccess" data-keywords="dot bracket property">Accessing Properties</div>
                    <div class="docs-item" data-doc="objectmethods" data-keywords="keys values entries assign">Object Methods</div>
                    <div class="docs-item" data-doc="objectiterate" data-keywords="for in entries">Iterating Objects</div>
                    <div class="docs-item" data-doc="destructuring" data-keywords="destructure unpack">Destructuring</div>
                    <div class="docs-item" data-doc="spread" data-keywords="... spread rest">Spread Operator</div>
                </div>
            </div>

            <!-- Classes -->
            <div class="docs-section">
                <div class="docs-section-header">Classes</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="classbasics" data-keywords="class constructor new">Class Basics</div>
                    <div class="docs-item" data-doc="classmethods" data-keywords="method static getter setter">Methods & Properties</div>
                    <div class="docs-item" data-doc="inheritance" data-keywords="extends super">Inheritance</div>
                </div>
            </div>

            <!-- Map & Set -->
            <div class="docs-section">
                <div class="docs-section-header">Map & Set</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="map" data-keywords="map set get has delete">Map</div>
                    <div class="docs-item" data-doc="set" data-keywords="set add has delete unique">Set</div>
                </div>
            </div>

            <!-- DOM -->
            <div class="docs-section">
                <div class="docs-section-header">DOM Manipulation</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="domselect" data-keywords="getElementById querySelector querySelectorAll">Selecting Elements</div>
                    <div class="docs-item" data-doc="domcreate" data-keywords="createElement appendChild insertBefore">Creating Elements</div>
                    <div class="docs-item" data-doc="dommodify" data-keywords="innerHTML textContent classList style">Modifying Elements</div>
                    <div class="docs-item" data-doc="domattributes" data-keywords="getAttribute setAttribute removeAttribute dataset">Attributes</div>
                    <div class="docs-item" data-doc="domevents" data-keywords="addEventListener click submit event">Event Handling</div>
                    <div class="docs-item" data-doc="domeventobject" data-keywords="event target preventDefault stopPropagation">Event Object</div>
                </div>
            </div>

            <!-- Async -->
            <div class="docs-section">
                <div class="docs-section-header">Async Programming</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="promises" data-keywords="promise then catch finally resolve reject">Promises</div>
                    <div class="docs-item" data-doc="asyncawait" data-keywords="async await try catch">Async/Await</div>
                    <div class="docs-item" data-doc="fetch" data-keywords="fetch get post json api request">Fetch API</div>
                    <div class="docs-item" data-doc="fetchexamples" data-keywords="crud get post put delete">Fetch Examples (CRUD)</div>
                </div>
            </div>

            <!-- JSON -->
            <div class="docs-section">
                <div class="docs-section-header">JSON</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="json" data-keywords="parse stringify json object">JSON Methods</div>
                </div>
            </div>

            <!-- Error Handling -->
            <div class="docs-section">
                <div class="docs-section-header">Error Handling</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="trycatch" data-keywords="try catch finally throw error">try...catch</div>
                </div>
            </div>

            <!-- Modules -->
            <div class="docs-section">
                <div class="docs-section-header">Modules</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="modules" data-keywords="import export default">Import & Export</div>
                </div>
            </div>

            <!-- Regular Expressions -->
            <div class="docs-section">
                <div class="docs-section-header">Regular Expressions</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="regex" data-keywords="regex regexp pattern test match">RegExp Basics</div>
                    <div class="docs-item" data-doc="regexpatterns" data-keywords="pattern metacharacter quantifier">Common Patterns</div>
                </div>
            </div>

            <!-- Useful Methods -->
            <div class="docs-section">
                <div class="docs-section-header">Useful Methods</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="math" data-keywords="math random floor ceil round abs min max">Math Object</div>
                    <div class="docs-item" data-doc="date" data-keywords="date time now getdate getmonth">Date Object</div>
                    <div class="docs-item" data-doc="console" data-keywords="console log warn error table">Console Methods</div>
                </div>
            </div>

            <!-- Templates & Rendering -->
            <div class="docs-section">
                <div class="docs-section-header">Templates & Rendering</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="templatestrings" data-keywords="template literal interpolation">Template Literals</div>
                    <div class="docs-item" data-doc="lithtml" data-keywords="lit-html html render template">lit-html Basics</div>
                </div>
            </div>

            <!-- Routing -->
            <div class="docs-section">
                <div class="docs-section-header">Routing (page.js)</div>
                <div class="docs-section-content">
                    <div class="docs-item" data-doc="pagejs" data-keywords="page router route navigation">page.js Basics</div>
                </div>
            </div>
        `;
    }

    showDoc(docId) {
        const doc = this.getDocContent(docId);
        if (!doc) return;

        const body = this.viewer.querySelector('.docs-viewer-body');
        const title = this.viewer.querySelector('.docs-viewer-title');

        title.textContent = doc.title;
        body.innerHTML = doc.content;

        this.viewer.classList.add('open');
        this.overlay.classList.add('open');
    }

    closeViewer() {
        this.viewer.classList.remove('open');
        this.overlay.classList.remove('open');
    }

    getDocContent(docId) {
        const docs = {
            // Variables & Data Types
            variables: {
                title: 'Variables (let, const, var)',
                content: `
                    <h2>Variables in JavaScript</h2>
                    <p>Variables are containers for storing data values.</p>

                    <h3>let - Block Scoped</h3>
                    <p>Can be reassigned, but not redeclared in the same scope.</p>
                    ${this.codeBlock(`let name = "John";
name = "Jane"; // OK - can reassign
// let name = "Bob"; // Error - cannot redeclare`)}

                    <h3>const - Block Scoped, Constant</h3>
                    <p>Cannot be reassigned or redeclared. Must be initialized.</p>
                    ${this.codeBlock(`const PI = 3.14159;
// PI = 3.14; // Error - cannot reassign

// But objects/arrays can be modified:
const user = { name: "John" };
user.name = "Jane"; // OK - modifying property
// user = {}; // Error - cannot reassign`)}

                    <h3>var - Function Scoped (avoid)</h3>
                    <p>Old way, has hoisting issues. Prefer let/const.</p>
                    ${this.codeBlock(`var x = 10;
var x = 20; // OK - can redeclare (problematic)`)}

                    <div class="docs-note">
                        <p><strong>Best Practice:</strong> Use <code>const</code> by default, <code>let</code> when you need to reassign. Avoid <code>var</code>.</p>
                    </div>
                `
            },

            datatypes: {
                title: 'Data Types',
                content: `
                    <h2>JavaScript Data Types</h2>

                    <h3>Primitive Types</h3>
                    ${this.codeBlock(`// String
let name = "John";
let greeting = 'Hello';
let template = \`Hello \${name}\`; // Template literal

// Number (integers and floats)
let age = 25;
let price = 19.99;
let negative = -10;

// Boolean
let isActive = true;
let isComplete = false;

// Undefined - declared but not assigned
let x;
console.log(x); // undefined

// Null - intentional absence of value
let data = null;

// Symbol (unique identifier)
let id = Symbol('id');

// BigInt (large integers)
let bigNum = 9007199254740991n;`)}

                    <h3>Reference Types</h3>
                    ${this.codeBlock(`// Object
let person = {
    name: "John",
    age: 30
};

// Array
let colors = ["red", "green", "blue"];

// Function
function greet() {
    return "Hello!";
}`)}
                `
            },

            typeof: {
                title: 'typeof Operator',
                content: `
                    <h2>typeof Operator</h2>
                    <p>Returns a string indicating the type of the operand.</p>

                    ${this.codeBlock(`typeof "Hello"     // "string"
typeof 42          // "number"
typeof true        // "boolean"
typeof undefined   // "undefined"
typeof null        // "object" (historical bug)
typeof {}          // "object"
typeof []          // "object"
typeof function(){} // "function"
typeof Symbol()    // "symbol"`)}

                    <h3>Checking for Arrays</h3>
                    ${this.codeBlock(`// typeof returns "object" for arrays
let arr = [1, 2, 3];
typeof arr; // "object"

// Use Array.isArray() instead
Array.isArray(arr); // true
Array.isArray({}); // false`)}
                `
            },

            typeconversion: {
                title: 'Type Conversion',
                content: `
                    <h2>Type Conversion</h2>

                    <h3>To String</h3>
                    ${this.codeBlock(`String(123);      // "123"
String(true);     // "true"
String(null);     // "null"
(123).toString(); // "123"
123 + "";         // "123" (implicit)`)}

                    <h3>To Number</h3>
                    ${this.codeBlock(`Number("123");    // 123
Number("12.34");  // 12.34
Number("hello");  // NaN
Number(true);     // 1
Number(false);    // 0
Number(null);     // 0
Number(undefined);// NaN

parseInt("42px");   // 42
parseInt("3.14");   // 3
parseFloat("3.14"); // 3.14

+"123"; // 123 (unary plus)`)}

                    <h3>To Boolean</h3>
                    ${this.codeBlock(`Boolean(1);        // true
Boolean(0);        // false
Boolean("");       // false
Boolean("hello");  // true
Boolean(null);     // false
Boolean(undefined);// false
Boolean([]);       // true (empty array is truthy!)
Boolean({});       // true (empty object is truthy!)

// Falsy values: 0, "", null, undefined, NaN, false`)}
                `
            },

            // Operators
            arithmetic: {
                title: 'Arithmetic Operators',
                content: `
                    <h2>Arithmetic Operators</h2>

                    ${this.codeBlock(`let a = 10, b = 3;

a + b   // 13  Addition
a - b   // 7   Subtraction
a * b   // 30  Multiplication
a / b   // 3.33... Division
a % b   // 1   Modulus (remainder)
a ** b  // 1000 Exponentiation

// Increment/Decrement
let x = 5;
x++;    // 6 (post-increment)
++x;    // 7 (pre-increment)
x--;    // 6 (post-decrement)
--x;    // 5 (pre-decrement)

// Assignment operators
x += 5;  // x = x + 5
x -= 3;  // x = x - 3
x *= 2;  // x = x * 2
x /= 4;  // x = x / 4
x %= 3;  // x = x % 3`)}
                `
            },

            comparison: {
                title: 'Comparison Operators',
                content: `
                    <h2>Comparison Operators</h2>

                    ${this.codeBlock(`// Equality
5 == "5"   // true  (loose equality - type coercion)
5 === "5"  // false (strict equality - no coercion)
5 != "5"   // false
5 !== "5"  // true

// Comparison
5 > 3   // true
5 < 3   // false
5 >= 5  // true
5 <= 4  // false

// Comparing strings (alphabetical)
"apple" < "banana" // true
"a" < "b"          // true`)}

                    <div class="docs-warning">
                        <p><strong>Always use === and !== </strong> to avoid unexpected type coercion bugs.</p>
                    </div>
                `
            },

            logical: {
                title: 'Logical Operators',
                content: `
                    <h2>Logical Operators</h2>

                    ${this.codeBlock(`// AND (&&) - both must be true
true && true   // true
true && false  // false
false && true  // false

// OR (||) - at least one must be true
true || false  // true
false || true  // true
false || false // false

// NOT (!) - inverts the value
!true   // false
!false  // true
!0      // true
!"hello" // false

// Short-circuit evaluation
let name = user && user.name; // Safe property access
let value = input || "default"; // Default value

// Nullish coalescing (??)
let x = null ?? "default";  // "default"
let y = 0 ?? "default";     // 0 (only null/undefined trigger default)`)}
                `
            },

            ternary: {
                title: 'Ternary Operator',
                content: `
                    <h2>Ternary (Conditional) Operator</h2>
                    <p>Shorthand for if...else</p>

                    ${this.codeBlock(`// Syntax: condition ? valueIfTrue : valueIfFalse

let age = 20;
let status = age >= 18 ? "adult" : "minor";
// status = "adult"

// Equivalent to:
let status;
if (age >= 18) {
    status = "adult";
} else {
    status = "minor";
}

// Nested ternary (use sparingly)
let score = 85;
let grade = score >= 90 ? "A"
          : score >= 80 ? "B"
          : score >= 70 ? "C"
          : "F";`)}
                `
            },

            // Control Flow
            ifelse: {
                title: 'if...else Statements',
                content: `
                    <h2>if...else Statements</h2>

                    ${this.codeBlock(`// Simple if
if (condition) {
    // code if true
}

// if...else
if (condition) {
    // code if true
} else {
    // code if false
}

// if...else if...else
let score = 85;

if (score >= 90) {
    console.log("Grade: A");
} else if (score >= 80) {
    console.log("Grade: B");
} else if (score >= 70) {
    console.log("Grade: C");
} else {
    console.log("Grade: F");
}

// Multiple conditions
if (age >= 18 && hasLicense) {
    console.log("Can drive");
}

if (isWeekend || isHoliday) {
    console.log("Day off");
}`)}
                `
            },

            switch: {
                title: 'switch Statement',
                content: `
                    <h2>switch Statement</h2>

                    ${this.codeBlock(`let day = "Monday";

switch (day) {
    case "Monday":
        console.log("Start of week");
        break;
    case "Friday":
        console.log("Almost weekend!");
        break;
    case "Saturday":
    case "Sunday":
        console.log("Weekend!");
        break;
    default:
        console.log("Regular day");
}

// Without break - falls through
let month = 2;
switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
        days = 31;
        break;
    case 4: case 6: case 9: case 11:
        days = 30;
        break;
    case 2:
        days = 28;
        break;
}`)}
                `
            },

            forloop: {
                title: 'for Loop',
                content: `
                    <h2>for Loop</h2>

                    ${this.codeBlock(`// Basic for loop
for (let i = 0; i < 5; i++) {
    console.log(i); // 0, 1, 2, 3, 4
}

// Counting backwards
for (let i = 5; i > 0; i--) {
    console.log(i); // 5, 4, 3, 2, 1
}

// Step by 2
for (let i = 0; i <= 10; i += 2) {
    console.log(i); // 0, 2, 4, 6, 8, 10
}

// Iterating array with index
let colors = ["red", "green", "blue"];
for (let i = 0; i < colors.length; i++) {
    console.log(i, colors[i]);
}

// break - exit loop
for (let i = 0; i < 10; i++) {
    if (i === 5) break;
    console.log(i); // 0, 1, 2, 3, 4
}

// continue - skip iteration
for (let i = 0; i < 5; i++) {
    if (i === 2) continue;
    console.log(i); // 0, 1, 3, 4
}`)}
                `
            },

            whileloop: {
                title: 'while / do...while',
                content: `
                    <h2>while Loop</h2>
                    <p>Executes while condition is true. Condition checked before each iteration.</p>

                    ${this.codeBlock(`let i = 0;
while (i < 5) {
    console.log(i);
    i++;
}
// Output: 0, 1, 2, 3, 4`)}

                    <h2>do...while Loop</h2>
                    <p>Executes at least once. Condition checked after each iteration.</p>

                    ${this.codeBlock(`let i = 0;
do {
    console.log(i);
    i++;
} while (i < 5);
// Output: 0, 1, 2, 3, 4

// Runs at least once even if condition is false
let x = 10;
do {
    console.log(x); // 10 - runs once
} while (x < 5);`)}
                `
            },

            forof: {
                title: 'for...of Loop',
                content: `
                    <h2>for...of Loop</h2>
                    <p>Iterates over iterable objects (arrays, strings, maps, sets).</p>

                    ${this.codeBlock(`// Array
let colors = ["red", "green", "blue"];
for (let color of colors) {
    console.log(color);
}
// red, green, blue

// String
let str = "Hello";
for (let char of str) {
    console.log(char);
}
// H, e, l, l, o

// With index (using entries())
for (let [index, color] of colors.entries()) {
    console.log(index, color);
}
// 0 "red", 1 "green", 2 "blue"

// Map
let map = new Map([["a", 1], ["b", 2]]);
for (let [key, value] of map) {
    console.log(key, value);
}

// Set
let set = new Set([1, 2, 3]);
for (let value of set) {
    console.log(value);
}`)}
                `
            },

            forin: {
                title: 'for...in Loop',
                content: `
                    <h2>for...in Loop</h2>
                    <p>Iterates over object property names (keys).</p>

                    ${this.codeBlock(`let person = {
    name: "John",
    age: 30,
    city: "NYC"
};

for (let key in person) {
    console.log(key + ": " + person[key]);
}
// name: John
// age: 30
// city: NYC

// Can also use with arrays (but for...of is better)
let arr = ["a", "b", "c"];
for (let index in arr) {
    console.log(index, arr[index]);
}
// 0 "a", 1 "b", 2 "c"`)}

                    <div class="docs-note">
                        <p><strong>Tip:</strong> Use <code>for...of</code> for arrays, <code>for...in</code> for objects.</p>
                    </div>
                `
            },

            // Functions
            functions: {
                title: 'Function Declaration',
                content: `
                    <h2>Function Declaration</h2>

                    ${this.codeBlock(`// Function declaration (hoisted)
function greet(name) {
    return "Hello, " + name + "!";
}
greet("John"); // "Hello, John!"

// Function expression (not hoisted)
const greet = function(name) {
    return "Hello, " + name + "!";
};

// Multiple parameters
function add(a, b) {
    return a + b;
}
add(5, 3); // 8

// No return value
function logMessage(msg) {
    console.log(msg);
    // implicitly returns undefined
}

// Multiple return statements
function checkAge(age) {
    if (age >= 18) {
        return "Adult";
    }
    return "Minor";
}`)}
                `
            },

            arrow: {
                title: 'Arrow Functions',
                content: `
                    <h2>Arrow Functions</h2>

                    ${this.codeBlock(`// Basic syntax
const greet = (name) => {
    return "Hello, " + name;
};

// Single parameter - parentheses optional
const double = n => n * 2;

// No parameters - parentheses required
const sayHi = () => "Hi!";

// Implicit return (single expression)
const add = (a, b) => a + b;

// Returning object literal - wrap in parentheses
const createUser = (name, age) => ({ name, age });

// With array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);`)}

                    <div class="docs-warning">
                        <p><strong>Note:</strong> Arrow functions don't have their own <code>this</code> binding.</p>
                    </div>
                `
            },

            parameters: {
                title: 'Parameters & Arguments',
                content: `
                    <h2>Parameters & Arguments</h2>

                    <h3>Default Parameters</h3>
                    ${this.codeBlock(`function greet(name = "Guest") {
    return "Hello, " + name;
}
greet();      // "Hello, Guest"
greet("John"); // "Hello, John"`)}

                    <h3>Rest Parameters</h3>
                    ${this.codeBlock(`function sum(...numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3);    // 6
sum(1, 2, 3, 4); // 10

function log(first, ...rest) {
    console.log(first); // 1
    console.log(rest);  // [2, 3, 4]
}
log(1, 2, 3, 4);`)}

                    <h3>Spread in Function Calls</h3>
                    ${this.codeBlock(`const numbers = [1, 2, 3];
Math.max(...numbers); // 3

function greet(a, b, c) {
    console.log(a, b, c);
}
greet(...numbers); // 1 2 3`)}
                `
            },

            scope: {
                title: 'Scope & Closure',
                content: `
                    <h2>Scope</h2>

                    <h3>Block Scope (let, const)</h3>
                    ${this.codeBlock(`if (true) {
    let x = 10;
    const y = 20;
}
// x and y are not accessible here

for (let i = 0; i < 3; i++) {
    // i only exists in this block
}`)}

                    <h3>Function Scope</h3>
                    ${this.codeBlock(`function example() {
    var x = 10; // function scoped
    let y = 20; // block scoped

    if (true) {
        var x = 30; // same x!
        let y = 40; // different y
    }
    console.log(x); // 30
    console.log(y); // 20
}`)}

                    <h3>Closure</h3>
                    ${this.codeBlock(`function createCounter() {
    let count = 0;
    return function() {
        count++;
        return count;
    };
}

const counter = createCounter();
counter(); // 1
counter(); // 2
counter(); // 3`)}
                `
            },

            callbacks: {
                title: 'Callbacks',
                content: `
                    <h2>Callbacks</h2>
                    <p>A callback is a function passed as an argument to another function.</p>

                    ${this.codeBlock(`// Basic callback
function processData(data, callback) {
    // Process data...
    callback(data);
}

processData("Hello", function(result) {
    console.log(result);
});

// With arrow function
processData("World", (result) => {
    console.log(result);
});

// Common uses
const numbers = [1, 2, 3, 4, 5];

// forEach
numbers.forEach((num, index) => {
    console.log(index, num);
});

// map
const doubled = numbers.map(num => num * 2);

// filter
const evens = numbers.filter(num => num % 2 === 0);

// setTimeout
setTimeout(() => {
    console.log("Delayed message");
}, 1000);`)}
                `
            },

            // Arrays
            arraycreate: {
                title: 'Creating Arrays',
                content: `
                    <h2>Creating Arrays</h2>

                    ${this.codeBlock(`// Array literal (preferred)
const fruits = ["apple", "banana", "orange"];

// Empty array
const empty = [];

// Array constructor
const numbers = new Array(1, 2, 3);

// Array with fixed length
const fixed = new Array(5); // [empty × 5]

// Array.from()
const chars = Array.from("hello"); // ["h", "e", "l", "l", "o"]
const range = Array.from({length: 5}, (_, i) => i); // [0, 1, 2, 3, 4]

// Array.of()
const arr = Array.of(1, 2, 3); // [1, 2, 3]

// Fill array
const zeros = new Array(5).fill(0); // [0, 0, 0, 0, 0]`)}
                `
            },

            arrayaccess: {
                title: 'Accessing Elements',
                content: `
                    <h2>Accessing Array Elements</h2>

                    ${this.codeBlock(`const fruits = ["apple", "banana", "orange", "grape"];

// By index (0-based)
fruits[0];  // "apple"
fruits[2];  // "orange"
fruits[-1]; // undefined (use at() instead)

// at() method - supports negative indices
fruits.at(0);   // "apple"
fruits.at(-1);  // "grape" (last element)
fruits.at(-2);  // "orange" (second to last)

// Length property
fruits.length;  // 4

// First and last
const first = fruits[0];
const last = fruits[fruits.length - 1];
// OR
const last = fruits.at(-1);

// Check if index exists
if (fruits[10] !== undefined) {
    // index exists
}`)}
                `
            },

            arrayadd: {
                title: 'Adding Elements',
                content: `
                    <h2>Adding Elements to Arrays</h2>

                    ${this.codeBlock(`const arr = [1, 2, 3];

// push() - add to end
arr.push(4);        // returns 4 (new length)
arr.push(5, 6);     // add multiple
// arr is now [1, 2, 3, 4, 5, 6]

// unshift() - add to beginning
arr.unshift(0);     // returns 7 (new length)
// arr is now [0, 1, 2, 3, 4, 5, 6]

// splice() - add at specific index
arr.splice(3, 0, "a", "b"); // at index 3, remove 0, add "a", "b"
// arr is now [0, 1, 2, "a", "b", 3, 4, 5, 6]

// Spread operator - create new array
const newArr = [...arr, 7, 8];

// concat() - merge arrays (returns new array)
const combined = arr.concat([7, 8]);`)}
                `
            },

            arrayremove: {
                title: 'Removing Elements',
                content: `
                    <h2>Removing Elements from Arrays</h2>

                    ${this.codeBlock(`const arr = [1, 2, 3, 4, 5];

// pop() - remove from end
const last = arr.pop();  // returns 5
// arr is now [1, 2, 3, 4]

// shift() - remove from beginning
const first = arr.shift(); // returns 1
// arr is now [2, 3, 4]

// splice() - remove at specific index
arr.splice(1, 1); // at index 1, remove 1 element
// arr is now [2, 4]

// splice() returns removed elements
const removed = arr.splice(0, 2); // [2, 4]

// Remove by value (find index first)
const fruits = ["apple", "banana", "orange"];
const index = fruits.indexOf("banana");
if (index > -1) {
    fruits.splice(index, 1);
}

// filter() - remove all matching (returns new array)
const numbers = [1, 2, 3, 4, 5];
const withoutThree = numbers.filter(n => n !== 3);
// [1, 2, 4, 5]`)}
                `
            },

            arrayiterate: {
                title: 'Iteration Methods',
                content: `
                    <h2>Array Iteration Methods</h2>

                    <h3>forEach() - Execute function for each element</h3>
                    ${this.codeBlock(`const arr = [1, 2, 3];
arr.forEach((value, index, array) => {
    console.log(index, value);
});`)}

                    <h3>map() - Transform each element</h3>
                    ${this.codeBlock(`const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2);
// [2, 4, 6]

const users = [{name: "John"}, {name: "Jane"}];
const names = users.map(user => user.name);
// ["John", "Jane"]`)}

                    <h3>filter() - Keep elements that pass test</h3>
                    ${this.codeBlock(`const numbers = [1, 2, 3, 4, 5];
const evens = numbers.filter(n => n % 2 === 0);
// [2, 4]

const adults = users.filter(u => u.age >= 18);`)}

                    <h3>reduce() - Reduce to single value</h3>
                    ${this.codeBlock(`const numbers = [1, 2, 3, 4, 5];

// Sum
const sum = numbers.reduce((acc, n) => acc + n, 0);
// 15

// Max
const max = numbers.reduce((max, n) => n > max ? n : max, numbers[0]);

// Group by
const items = [{type: "a"}, {type: "b"}, {type: "a"}];
const grouped = items.reduce((acc, item) => {
    acc[item.type] = acc[item.type] || [];
    acc[item.type].push(item);
    return acc;
}, {});`)}

                    <h3>every() & some()</h3>
                    ${this.codeBlock(`const numbers = [2, 4, 6, 8];

// every() - all must pass
numbers.every(n => n % 2 === 0); // true

// some() - at least one must pass
numbers.some(n => n > 5); // true`)}
                `
            },

            arraysearch: {
                title: 'Search Methods',
                content: `
                    <h2>Array Search Methods</h2>

                    ${this.codeBlock(`const arr = [1, 2, 3, 4, 5, 3];

// indexOf() - first index of value (-1 if not found)
arr.indexOf(3);     // 2
arr.indexOf(10);    // -1

// lastIndexOf() - last index of value
arr.lastIndexOf(3); // 5

// includes() - check if value exists
arr.includes(3);    // true
arr.includes(10);   // false

// find() - first element that passes test
const users = [
    {id: 1, name: "John"},
    {id: 2, name: "Jane"}
];
const user = users.find(u => u.id === 2);
// {id: 2, name: "Jane"}

// findIndex() - index of first element that passes test
const index = users.findIndex(u => u.id === 2);
// 1

// findLast() / findLastIndex() - search from end
arr.findLast(n => n > 2);      // 3
arr.findLastIndex(n => n > 2); // 5`)}
                `
            },

            arraysort: {
                title: 'Sorting Arrays',
                content: `
                    <h2>Sorting Arrays</h2>

                    ${this.codeBlock(`// sort() - modifies original array!
const fruits = ["banana", "apple", "orange"];
fruits.sort(); // ["apple", "banana", "orange"]

// Numbers - need compare function!
const numbers = [10, 5, 20, 1];
numbers.sort(); // ["1", "10", "20", "5"] - WRONG!

// Ascending
numbers.sort((a, b) => a - b); // [1, 5, 10, 20]

// Descending
numbers.sort((a, b) => b - a); // [20, 10, 5, 1]

// Sort objects
const users = [
    {name: "John", age: 30},
    {name: "Jane", age: 25}
];
users.sort((a, b) => a.age - b.age); // by age ascending
users.sort((a, b) => a.name.localeCompare(b.name)); // by name

// reverse() - reverse array
const arr = [1, 2, 3];
arr.reverse(); // [3, 2, 1]

// toSorted() / toReversed() - return new array (ES2023)
const sorted = numbers.toSorted((a, b) => a - b);`)}

                    <div class="docs-warning">
                        <p><strong>Warning:</strong> <code>sort()</code> and <code>reverse()</code> modify the original array!</p>
                    </div>
                `
            },

            arrayother: {
                title: 'Other Array Methods',
                content: `
                    <h2>Other Array Methods</h2>

                    <h3>slice() - Extract portion (new array)</h3>
                    ${this.codeBlock(`const arr = [1, 2, 3, 4, 5];
arr.slice(1, 3);  // [2, 3] - from index 1 to 3 (exclusive)
arr.slice(2);     // [3, 4, 5] - from index 2 to end
arr.slice(-2);    // [4, 5] - last 2 elements
arr.slice();      // [1, 2, 3, 4, 5] - copy array`)}

                    <h3>concat() - Merge arrays</h3>
                    ${this.codeBlock(`const a = [1, 2];
const b = [3, 4];
const c = a.concat(b);    // [1, 2, 3, 4]
const d = a.concat(b, [5]); // [1, 2, 3, 4, 5]`)}

                    <h3>join() - Array to string</h3>
                    ${this.codeBlock(`const arr = ["Hello", "World"];
arr.join(" ");   // "Hello World"
arr.join("-");   // "Hello-World"
arr.join("");    // "HelloWorld"`)}

                    <h3>flat() - Flatten nested arrays</h3>
                    ${this.codeBlock(`const nested = [1, [2, 3], [4, [5, 6]]];
nested.flat();    // [1, 2, 3, 4, [5, 6]]
nested.flat(2);   // [1, 2, 3, 4, 5, 6]
nested.flat(Infinity); // flatten all levels`)}

                    <h3>flatMap() - map + flat</h3>
                    ${this.codeBlock(`const arr = [1, 2, 3];
arr.flatMap(x => [x, x * 2]);
// [1, 2, 2, 4, 3, 6]`)}
                `
            },

            // Strings
            stringbasics: {
                title: 'String Basics',
                content: `
                    <h2>String Basics</h2>

                    ${this.codeBlock(`// Creating strings
const single = 'Hello';
const double = "World";
const template = \`Hello \${name}\`; // Template literal

// String length
"Hello".length; // 5

// Accessing characters
const str = "Hello";
str[0];      // "H"
str.at(-1);  // "o" (last character)
str.charAt(1); // "e"

// Strings are immutable
let str = "Hello";
str[0] = "J"; // Does nothing!
str = "J" + str.slice(1); // Create new string

// Multi-line strings
const multi = \`Line 1
Line 2
Line 3\`;

// Template literals
const name = "John";
const age = 30;
const msg = \`\${name} is \${age} years old\`;
const calc = \`2 + 2 = \${2 + 2}\`;`)}
                `
            },

            stringmethods: {
                title: 'Extracting Substrings',
                content: `
                    <h2>Extracting Substrings</h2>

                    ${this.codeBlock(`const str = "Hello, World!";

// substring(start, end) - end exclusive
str.substring(0, 5);   // "Hello"
str.substring(7);      // "World!"

// slice(start, end) - supports negative indices
str.slice(0, 5);   // "Hello"
str.slice(-6);     // "World!"
str.slice(-6, -1); // "World"

// substr(start, length) - deprecated, avoid
str.substr(7, 5);  // "World"`)}

                    <div class="docs-note">
                        <p><strong>Tip:</strong> Use <code>slice()</code> - it's the most flexible and supports negative indices.</p>
                    </div>
                `
            },

            stringsearch: {
                title: 'Search in Strings',
                content: `
                    <h2>Search in Strings</h2>

                    ${this.codeBlock(`const str = "Hello, World! Hello!";

// indexOf() / lastIndexOf()
str.indexOf("Hello");      // 0
str.lastIndexOf("Hello");  // 14
str.indexOf("xyz");        // -1 (not found)

// includes()
str.includes("World");     // true
str.includes("world");     // false (case-sensitive)

// startsWith() / endsWith()
str.startsWith("Hello");   // true
str.endsWith("!");         // true
str.startsWith("World", 7); // true (from position 7)

// search() - with RegExp
str.search(/world/i);      // 7 (case-insensitive)

// match() - find matches
str.match(/Hello/g);       // ["Hello", "Hello"]`)}
                `
            },

            stringmodify: {
                title: 'Modifying Strings',
                content: `
                    <h2>Modifying Strings</h2>
                    <p>Strings are immutable - these methods return new strings.</p>

                    ${this.codeBlock(`const str = "  Hello, World!  ";

// Case conversion
str.toUpperCase();  // "  HELLO, WORLD!  "
str.toLowerCase();  // "  hello, world!  "

// Trimming whitespace
str.trim();         // "Hello, World!"
str.trimStart();    // "Hello, World!  "
str.trimEnd();      // "  Hello, World!"

// Replace
const s = "Hello, World!";
s.replace("World", "JS");     // "Hello, JS!"
s.replace(/o/g, "0");         // "Hell0, W0rld!" (all o's)
s.replaceAll("l", "L");       // "HeLLo, WorLd!"

// Padding
"5".padStart(3, "0");  // "005"
"5".padEnd(3, "0");    // "500"

// Repeat
"ab".repeat(3);        // "ababab"`)}
                `
            },

            stringsplit: {
                title: 'Split & Join',
                content: `
                    <h2>Split & Join</h2>

                    <h3>split() - String to Array</h3>
                    ${this.codeBlock(`const str = "apple,banana,orange";

str.split(",");     // ["apple", "banana", "orange"]
str.split(",", 2);  // ["apple", "banana"] (limit)

"Hello".split("");  // ["H", "e", "l", "l", "o"]

// Split by whitespace
"Hello World".split(" ");  // ["Hello", "World"]

// Split by regex
"a1b2c3".split(/\\d/);  // ["a", "b", "c"]`)}

                    <h3>join() - Array to String</h3>
                    ${this.codeBlock(`const arr = ["apple", "banana", "orange"];

arr.join(",");   // "apple,banana,orange"
arr.join(" - "); // "apple - banana - orange"
arr.join("");    // "applebananaorange"

// Common pattern: split, transform, join
const str = "hello world";
const titled = str
    .split(" ")
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(" ");
// "Hello World"`)}
                `
            },

            // Objects
            objectcreate: {
                title: 'Creating Objects',
                content: `
                    <h2>Creating Objects</h2>

                    ${this.codeBlock(`// Object literal (most common)
const person = {
    name: "John",
    age: 30,
    greet() {
        return "Hello!";
    }
};

// Shorthand property names
const name = "John";
const age = 30;
const person = { name, age };
// Same as: { name: name, age: age }

// Computed property names
const key = "color";
const obj = {
    [key]: "red",
    ["prop" + 1]: "value"
};
// { color: "red", prop1: "value" }

// Object constructor
const obj = new Object();
obj.name = "John";

// Object.create()
const proto = { greet() { return "Hi"; } };
const obj = Object.create(proto);`)}
                `
            },

            objectaccess: {
                title: 'Accessing Properties',
                content: `
                    <h2>Accessing Object Properties</h2>

                    ${this.codeBlock(`const person = {
    name: "John",
    age: 30,
    "favorite color": "blue"
};

// Dot notation
person.name;     // "John"
person.age;      // 30

// Bracket notation (required for special characters)
person["name"];           // "John"
person["favorite color"]; // "blue"

// Dynamic property access
const prop = "age";
person[prop];             // 30

// Optional chaining (?.)
const user = { address: { city: "NYC" } };
user.address?.city;       // "NYC"
user.contact?.email;      // undefined (no error)

// Check if property exists
"name" in person;         // true
person.hasOwnProperty("name"); // true

// Default values
const color = person.color ?? "default";
const color = person.color || "default";`)}
                `
            },

            objectmethods: {
                title: 'Object Methods',
                content: `
                    <h2>Object Methods</h2>

                    ${this.codeBlock(`const person = { name: "John", age: 30 };

// Object.keys() - array of keys
Object.keys(person);   // ["name", "age"]

// Object.values() - array of values
Object.values(person); // ["John", 30]

// Object.entries() - array of [key, value] pairs
Object.entries(person);
// [["name", "John"], ["age", 30]]

// Object.fromEntries() - create object from entries
const entries = [["a", 1], ["b", 2]];
Object.fromEntries(entries); // { a: 1, b: 2 }

// Object.assign() - copy/merge objects
const copy = Object.assign({}, person);
const merged = Object.assign({}, obj1, obj2);

// Spread operator (preferred for copy/merge)
const copy = { ...person };
const merged = { ...obj1, ...obj2 };

// Object.freeze() - make immutable
Object.freeze(person);
person.name = "Jane"; // Does nothing

// Object.seal() - prevent add/remove, allow modify
Object.seal(person);`)}
                `
            },

            objectiterate: {
                title: 'Iterating Objects',
                content: `
                    <h2>Iterating Over Objects</h2>

                    ${this.codeBlock(`const person = { name: "John", age: 30, city: "NYC" };

// for...in loop
for (let key in person) {
    console.log(key, person[key]);
}

// Object.keys() + forEach
Object.keys(person).forEach(key => {
    console.log(key, person[key]);
});

// Object.entries() + for...of
for (let [key, value] of Object.entries(person)) {
    console.log(key, value);
}

// Object.values() - just values
Object.values(person).forEach(value => {
    console.log(value);
});

// Transform object
const doubled = Object.fromEntries(
    Object.entries(person).map(([k, v]) => [k, v * 2])
);`)}
                `
            },

            destructuring: {
                title: 'Destructuring',
                content: `
                    <h2>Destructuring</h2>

                    <h3>Object Destructuring</h3>
                    ${this.codeBlock(`const person = { name: "John", age: 30, city: "NYC" };

// Basic
const { name, age } = person;
// name = "John", age = 30

// With different variable names
const { name: personName, age: personAge } = person;

// Default values
const { name, country = "USA" } = person;

// Nested
const user = { info: { name: "John" } };
const { info: { name } } = user;

// In function parameters
function greet({ name, age }) {
    return \`\${name} is \${age}\`;
}
greet(person);`)}

                    <h3>Array Destructuring</h3>
                    ${this.codeBlock(`const colors = ["red", "green", "blue"];

// Basic
const [first, second] = colors;
// first = "red", second = "green"

// Skip elements
const [, , third] = colors;
// third = "blue"

// Rest pattern
const [first, ...rest] = colors;
// first = "red", rest = ["green", "blue"]

// Default values
const [a, b, c, d = "yellow"] = colors;

// Swap variables
let a = 1, b = 2;
[a, b] = [b, a];`)}
                `
            },

            spread: {
                title: 'Spread Operator',
                content: `
                    <h2>Spread Operator (...)</h2>

                    <h3>With Arrays</h3>
                    ${this.codeBlock(`// Copy array
const original = [1, 2, 3];
const copy = [...original];

// Merge arrays
const arr1 = [1, 2];
const arr2 = [3, 4];
const merged = [...arr1, ...arr2]; // [1, 2, 3, 4]

// Add elements
const withMore = [...arr1, 5, 6]; // [1, 2, 5, 6]

// Convert iterable to array
const chars = [..."hello"]; // ["h", "e", "l", "l", "o"]
const unique = [...new Set([1, 1, 2, 2, 3])]; // [1, 2, 3]`)}

                    <h3>With Objects</h3>
                    ${this.codeBlock(`// Copy object
const original = { a: 1, b: 2 };
const copy = { ...original };

// Merge objects (later properties override)
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const merged = { ...obj1, ...obj2 };
// { a: 1, b: 3, c: 4 }

// Add/override properties
const updated = { ...original, b: 10, c: 3 };`)}
                `
            },

            // Classes
            classbasics: {
                title: 'Class Basics',
                content: `
                    <h2>Class Basics</h2>

                    ${this.codeBlock(`class Person {
    // Constructor
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    // Method
    greet() {
        return \`Hello, I'm \${this.name}\`;
    }

    // Method with parameters
    celebrateBirthday() {
        this.age++;
        return \`Happy birthday! Now \${this.age}\`;
    }
}

// Create instance
const john = new Person("John", 30);
john.name;           // "John"
john.greet();        // "Hello, I'm John"
john.celebrateBirthday(); // "Happy birthday! Now 31"

// Check instance
john instanceof Person; // true`)}
                `
            },

            classmethods: {
                title: 'Methods & Properties',
                content: `
                    <h2>Class Methods & Properties</h2>

                    ${this.codeBlock(`class Circle {
    // Static property
    static PI = 3.14159;

    // Private field (prefix with #)
    #radius;

    constructor(radius) {
        this.#radius = radius;
    }

    // Getter
    get radius() {
        return this.#radius;
    }

    // Setter
    set radius(value) {
        if (value > 0) {
            this.#radius = value;
        }
    }

    // Instance method
    getArea() {
        return Circle.PI * this.#radius ** 2;
    }

    // Static method
    static createUnit() {
        return new Circle(1);
    }
}

const c = new Circle(5);
c.radius;           // 5 (getter)
c.radius = 10;      // setter
c.getArea();        // 314.159

Circle.PI;          // 3.14159 (static)
Circle.createUnit(); // new Circle(1)`)}
                `
            },

            inheritance: {
                title: 'Inheritance',
                content: `
                    <h2>Class Inheritance</h2>

                    ${this.codeBlock(`class Animal {
    constructor(name) {
        this.name = name;
    }

    speak() {
        return \`\${this.name} makes a sound\`;
    }
}

class Dog extends Animal {
    constructor(name, breed) {
        super(name); // Call parent constructor
        this.breed = breed;
    }

    // Override parent method
    speak() {
        return \`\${this.name} barks\`;
    }

    // New method
    fetch() {
        return \`\${this.name} fetches the ball\`;
    }
}

const dog = new Dog("Rex", "German Shepherd");
dog.name;    // "Rex"
dog.breed;   // "German Shepherd"
dog.speak(); // "Rex barks"
dog.fetch(); // "Rex fetches the ball"

dog instanceof Dog;    // true
dog instanceof Animal; // true`)}
                `
            },

            // Map & Set
            map: {
                title: 'Map',
                content: `
                    <h2>Map</h2>
                    <p>Map holds key-value pairs. Any value can be a key (objects too).</p>

                    ${this.codeBlock(`// Create Map
const map = new Map();

// Or with initial values
const map = new Map([
    ["name", "John"],
    ["age", 30]
]);

// set() - add/update
map.set("city", "NYC");
map.set("age", 31);

// get() - retrieve value
map.get("name");     // "John"
map.get("unknown");  // undefined

// has() - check if key exists
map.has("name");     // true

// delete() - remove entry
map.delete("city");

// size
map.size;            // 2

// clear() - remove all
map.clear();

// Iteration
for (let [key, value] of map) {
    console.log(key, value);
}

map.forEach((value, key) => {
    console.log(key, value);
});

// Get keys, values, entries
map.keys();    // Iterator
map.values();  // Iterator
map.entries(); // Iterator

// Convert to array
const arr = [...map];
const keys = [...map.keys()];`)}
                `
            },

            set: {
                title: 'Set',
                content: `
                    <h2>Set</h2>
                    <p>Set stores unique values of any type.</p>

                    ${this.codeBlock(`// Create Set
const set = new Set();

// Or with initial values
const set = new Set([1, 2, 3, 3, 4]);
// Set {1, 2, 3, 4} - duplicates removed

// add() - add value
set.add(5);
set.add(5); // Ignored - already exists

// has() - check if value exists
set.has(3);    // true
set.has(10);   // false

// delete() - remove value
set.delete(3);

// size
set.size;      // 4

// clear() - remove all
set.clear();

// Iteration
for (let value of set) {
    console.log(value);
}

set.forEach(value => {
    console.log(value);
});

// Common use: Remove duplicates from array
const arr = [1, 2, 2, 3, 3, 3];
const unique = [...new Set(arr)];
// [1, 2, 3]

// Convert to array
const arr = Array.from(set);
const arr = [...set];`)}
                `
            },

            // DOM
            domselect: {
                title: 'Selecting Elements',
                content: `
                    <h2>Selecting DOM Elements</h2>

                    ${this.codeBlock(`// By ID (returns single element)
const el = document.getElementById("myId");

// By CSS selector (returns first match)
const el = document.querySelector(".myClass");
const el = document.querySelector("#myId");
const el = document.querySelector("div.container > p");

// By CSS selector (returns all matches - NodeList)
const els = document.querySelectorAll(".myClass");
const els = document.querySelectorAll("p");

// Convert NodeList to Array
const arr = Array.from(els);
const arr = [...els];

// By class name (returns HTMLCollection)
const els = document.getElementsByClassName("myClass");

// By tag name (returns HTMLCollection)
const els = document.getElementsByTagName("p");

// Relative selection
const parent = el.parentElement;
const children = el.children;
const next = el.nextElementSibling;
const prev = el.previousElementSibling;
const closest = el.closest(".container"); // Nearest ancestor`)}
                `
            },

            domcreate: {
                title: 'Creating Elements',
                content: `
                    <h2>Creating DOM Elements</h2>

                    ${this.codeBlock(`// Create element
const div = document.createElement("div");
const p = document.createElement("p");

// Set content
div.textContent = "Hello";
div.innerHTML = "<strong>Hello</strong>";

// Set attributes
div.id = "myDiv";
div.className = "container";
div.setAttribute("data-id", "123");

// Add to DOM
document.body.appendChild(div);

// Insert at specific position
parent.insertBefore(newEl, referenceEl);
parent.append(el1, el2);     // Multiple, at end
parent.prepend(el1, el2);    // Multiple, at start
el.before(newEl);            // Before element
el.after(newEl);             // After element

// Replace element
parent.replaceChild(newEl, oldEl);
oldEl.replaceWith(newEl);

// Remove element
el.remove();
parent.removeChild(el);

// Clone element
const clone = el.cloneNode(true);  // true = deep clone`)}
                `
            },

            dommodify: {
                title: 'Modifying Elements',
                content: `
                    <h2>Modifying DOM Elements</h2>

                    <h3>Content</h3>
                    ${this.codeBlock(`// Text content (safer - no HTML parsing)
el.textContent = "Hello";

// HTML content (parses HTML)
el.innerHTML = "<strong>Hello</strong>";

// Outer HTML (includes element itself)
el.outerHTML = "<div>New element</div>";`)}

                    <h3>Classes</h3>
                    ${this.codeBlock(`el.classList.add("active");
el.classList.remove("active");
el.classList.toggle("active");
el.classList.contains("active"); // true/false
el.classList.replace("old", "new");

// Multiple classes
el.classList.add("a", "b", "c");

// Set all classes
el.className = "class1 class2";`)}

                    <h3>Styles</h3>
                    ${this.codeBlock(`// Inline styles
el.style.color = "red";
el.style.backgroundColor = "blue";
el.style.fontSize = "16px";
el.style.cssText = "color: red; font-size: 16px;";

// Get computed style
const style = getComputedStyle(el);
style.color; // "rgb(255, 0, 0)"`)}
                `
            },

            domattributes: {
                title: 'Attributes',
                content: `
                    <h2>DOM Attributes</h2>

                    ${this.codeBlock(`// Get attribute
el.getAttribute("href");
el.getAttribute("data-id");

// Set attribute
el.setAttribute("href", "https://example.com");
el.setAttribute("data-id", "123");

// Remove attribute
el.removeAttribute("disabled");

// Check if exists
el.hasAttribute("disabled");

// Data attributes (data-*)
// <div data-user-id="123" data-active="true">
el.dataset.userId;   // "123"
el.dataset.active;   // "true"
el.dataset.newProp = "value"; // Sets data-new-prop

// Common properties
el.id;           // Get/set id
el.className;    // Get/set class
el.href;         // Get/set href (for links)
el.src;          // Get/set src (for images)
el.value;        // Get/set value (for inputs)
el.checked;      // Get/set checked (for checkboxes)
el.disabled;     // Get/set disabled`)}
                `
            },

            domevents: {
                title: 'Event Handling',
                content: `
                    <h2>Event Handling</h2>

                    ${this.codeBlock(`// Add event listener
el.addEventListener("click", function(event) {
    console.log("Clicked!");
});

// With arrow function
el.addEventListener("click", (e) => {
    console.log("Clicked!");
});

// Named function (can be removed)
function handleClick(e) {
    console.log("Clicked!");
}
el.addEventListener("click", handleClick);
el.removeEventListener("click", handleClick);

// Common events
"click"       // Mouse click
"dblclick"    // Double click
"mouseenter"  // Mouse enters element
"mouseleave"  // Mouse leaves element
"keydown"     // Key pressed
"keyup"       // Key released
"submit"      // Form submitted
"change"      // Input value changed
"input"       // Input value changing
"focus"       // Element focused
"blur"        // Element lost focus
"load"        // Page/resource loaded
"DOMContentLoaded" // DOM ready

// Event delegation
document.addEventListener("click", (e) => {
    if (e.target.matches(".btn")) {
        // Handle button click
    }
});`)}
                `
            },

            domeventobject: {
                title: 'Event Object',
                content: `
                    <h2>Event Object</h2>

                    ${this.codeBlock(`el.addEventListener("click", (event) => {
    // Target element
    event.target;        // Element that triggered event
    event.currentTarget; // Element with listener

    // Prevent default behavior
    event.preventDefault();

    // Stop propagation
    event.stopPropagation();

    // Mouse events
    event.clientX;  // X relative to viewport
    event.clientY;  // Y relative to viewport
    event.pageX;    // X relative to document
    event.pageY;    // Y relative to document
    event.button;   // Which mouse button

    // Keyboard events
    event.key;      // Key value ("Enter", "a", etc.)
    event.code;     // Physical key ("KeyA", "Enter")
    event.ctrlKey;  // Ctrl pressed?
    event.shiftKey; // Shift pressed?
    event.altKey;   // Alt pressed?

    // Form events
    event.target.value; // Input value
});

// Example: Form submission
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
});`)}
                `
            },

            // Async
            promises: {
                title: 'Promises',
                content: `
                    <h2>Promises</h2>

                    ${this.codeBlock(`// Create a Promise
const promise = new Promise((resolve, reject) => {
    // Async operation
    if (success) {
        resolve(result);
    } else {
        reject(error);
    }
});

// Using a Promise
promise
    .then(result => {
        console.log(result);
        return anotherResult;
    })
    .then(anotherResult => {
        console.log(anotherResult);
    })
    .catch(error => {
        console.error(error);
    })
    .finally(() => {
        console.log("Done");
    });

// Promise.all - wait for all
Promise.all([promise1, promise2, promise3])
    .then(([result1, result2, result3]) => {
        // All resolved
    });

// Promise.race - first to complete
Promise.race([promise1, promise2])
    .then(firstResult => {
        // First to resolve
    });

// Promise.allSettled - all complete (success or fail)
Promise.allSettled([promise1, promise2])
    .then(results => {
        results.forEach(r => {
            if (r.status === "fulfilled") {
                console.log(r.value);
            } else {
                console.log(r.reason);
            }
        });
    });`)}
                `
            },

            asyncawait: {
                title: 'Async/Await',
                content: `
                    <h2>Async/Await</h2>

                    ${this.codeBlock(`// Async function
async function fetchData() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// Arrow function
const fetchData = async () => {
    const response = await fetch(url);
    return response.json();
};

// Using the async function
fetchData()
    .then(data => console.log(data))
    .catch(error => console.error(error));

// Or with await (inside async function)
const data = await fetchData();

// Parallel execution
const [users, posts] = await Promise.all([
    fetch("/users").then(r => r.json()),
    fetch("/posts").then(r => r.json())
]);

// Sequential execution
const user = await fetchUser(id);
const posts = await fetchPosts(user.id);`)}
                `
            },

            fetch: {
                title: 'Fetch API',
                content: `
                    <h2>Fetch API</h2>

                    ${this.codeBlock(`// GET request (default)
fetch("https://api.example.com/data")
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        return response.json();
    })
    .then(data => console.log(data))
    .catch(error => console.error(error));

// With async/await
async function getData() {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("HTTP error " + response.status);
    }
    const data = await response.json();
    return data;
}

// POST request
fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: "John", age: 30 })
})
    .then(response => response.json())
    .then(data => console.log(data));

// Response methods
response.json();  // Parse as JSON
response.text();  // Parse as text
response.blob();  // Parse as Blob`)}
                `
            },

            fetchexamples: {
                title: 'Fetch Examples (CRUD)',
                content: `
                    <h2>Fetch CRUD Examples</h2>

                    <h3>GET - Read</h3>
                    ${this.codeBlock(`// Get all
async function getAll() {
    const response = await fetch("/api/items");
    return response.json();
}

// Get one
async function getById(id) {
    const response = await fetch(\`/api/items/\${id}\`);
    return response.json();
}`)}

                    <h3>POST - Create</h3>
                    ${this.codeBlock(`async function create(data) {
    const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return response.json();
}`)}

                    <h3>PUT - Update</h3>
                    ${this.codeBlock(`async function update(id, data) {
    const response = await fetch(\`/api/items/\${id}\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return response.json();
}`)}

                    <h3>DELETE - Delete</h3>
                    ${this.codeBlock(`async function remove(id) {
    const response = await fetch(\`/api/items/\${id}\`, {
        method: "DELETE"
    });
    return response.json();
}`)}
                `
            },

            // JSON
            json: {
                title: 'JSON Methods',
                content: `
                    <h2>JSON Methods</h2>

                    <h3>JSON.stringify() - Object to JSON string</h3>
                    ${this.codeBlock(`const obj = { name: "John", age: 30 };

JSON.stringify(obj);
// '{"name":"John","age":30}'

// Pretty print (2 spaces indent)
JSON.stringify(obj, null, 2);
/*
{
  "name": "John",
  "age": 30
}
*/

// Filter properties
JSON.stringify(obj, ["name"]);
// '{"name":"John"}'`)}

                    <h3>JSON.parse() - JSON string to Object</h3>
                    ${this.codeBlock(`const json = '{"name":"John","age":30}';

const obj = JSON.parse(json);
// { name: "John", age: 30 }

obj.name; // "John"

// With reviver function
JSON.parse(json, (key, value) => {
    if (key === "age") return value + 1;
    return value;
});
// { name: "John", age: 31 }`)}

                    <div class="docs-note">
                        <p><strong>Note:</strong> JSON only supports strings, numbers, booleans, null, arrays, and objects. Functions, undefined, and symbols are not valid.</p>
                    </div>
                `
            },

            // Error Handling
            trycatch: {
                title: 'try...catch',
                content: `
                    <h2>Error Handling</h2>

                    ${this.codeBlock(`try {
    // Code that might throw an error
    const data = JSON.parse(invalidJson);
} catch (error) {
    // Handle the error
    console.error("Error:", error.message);
} finally {
    // Always runs (optional)
    console.log("Cleanup");
}

// Throw custom error
function divide(a, b) {
    if (b === 0) {
        throw new Error("Cannot divide by zero");
    }
    return a / b;
}

// Error types
throw new Error("Generic error");
throw new TypeError("Type error");
throw new RangeError("Range error");

// Check error type
try {
    // ...
} catch (error) {
    if (error instanceof TypeError) {
        // Handle type error
    } else {
        throw error; // Re-throw
    }
}

// Async error handling
async function fetchData() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Fetch failed:", error);
        return null;
    }
}`)}
                `
            },

            // Modules
            modules: {
                title: 'Import & Export',
                content: `
                    <h2>JavaScript Modules</h2>

                    <h3>Named Exports</h3>
                    ${this.codeBlock(`// utils.js
export const PI = 3.14159;
export function add(a, b) {
    return a + b;
}
export class Calculator { }

// Or export at end
const PI = 3.14159;
function add(a, b) { return a + b; }
export { PI, add };`)}

                    <h3>Named Imports</h3>
                    ${this.codeBlock(`// Import specific
import { PI, add } from './utils.js';

// Import with alias
import { add as sum } from './utils.js';

// Import all as namespace
import * as utils from './utils.js';
utils.PI; // 3.14159
utils.add(1, 2); // 3`)}

                    <h3>Default Export</h3>
                    ${this.codeBlock(`// calculator.js
export default class Calculator {
    add(a, b) { return a + b; }
}

// Or
class Calculator { }
export default Calculator;`)}

                    <h3>Default Import</h3>
                    ${this.codeBlock(`// Can use any name
import Calculator from './calculator.js';
import Calc from './calculator.js';

// Combine default and named
import Calculator, { PI, add } from './utils.js';`)}
                `
            },

            // Regex
            regex: {
                title: 'RegExp Basics',
                content: `
                    <h2>Regular Expressions</h2>

                    ${this.codeBlock(`// Create RegExp
const regex = /pattern/flags;
const regex = new RegExp("pattern", "flags");

// Flags
/pattern/i  // Case-insensitive
/pattern/g  // Global (find all)
/pattern/m  // Multiline

// Test if matches
/hello/.test("hello world"); // true

// Find match
"hello world".match(/world/); // ["world"]
"hello hello".match(/hello/g); // ["hello", "hello"]

// Replace
"hello".replace(/l/g, "L"); // "heLLo"

// Search (returns index)
"hello".search(/l/); // 2`)}

                    <h3>Common Metacharacters</h3>
                    ${this.codeBlock(`.     Any character (except newline)
\\d    Digit [0-9]
\\D    Non-digit
\\w    Word character [a-zA-Z0-9_]
\\W    Non-word character
\\s    Whitespace
\\S    Non-whitespace
^     Start of string
$     End of string
\\b    Word boundary`)}
                `
            },

            regexpatterns: {
                title: 'Common Patterns',
                content: `
                    <h2>Common RegExp Patterns</h2>

                    ${this.codeBlock(`// Quantifiers
*     Zero or more
+     One or more
?     Zero or one
{n}   Exactly n
{n,}  n or more
{n,m} Between n and m

// Character classes
[abc]     a, b, or c
[^abc]    Not a, b, or c
[a-z]     a to z
[A-Z]     A to Z
[0-9]     0 to 9

// Groups
(abc)     Capture group
(?:abc)   Non-capturing group
a|b       a or b`)}

                    <h3>Useful Examples</h3>
                    ${this.codeBlock(`// Email (simple)
/^[\\w.-]+@[\\w.-]+\\.\\w+$/

// Phone (basic)
/^\\d{3}-\\d{3}-\\d{4}$/

// URL
/^https?:\\/\\/[\\w.-]+/

// Numbers only
/^\\d+$/

// Letters only
/^[a-zA-Z]+$/

// Extract numbers
"abc123def456".match(/\\d+/g); // ["123", "456"]

// Replace multiple spaces
"a  b   c".replace(/\\s+/g, " "); // "a b c"`)}
                `
            },

            // Useful Methods
            math: {
                title: 'Math Object',
                content: `
                    <h2>Math Object</h2>

                    ${this.codeBlock(`// Constants
Math.PI;     // 3.141592653589793
Math.E;      // 2.718281828459045

// Rounding
Math.round(4.5);  // 5 (nearest integer)
Math.floor(4.9);  // 4 (round down)
Math.ceil(4.1);   // 5 (round up)
Math.trunc(4.9);  // 4 (remove decimals)

// Absolute value
Math.abs(-5);     // 5

// Power & Square root
Math.pow(2, 3);   // 8 (2^3)
2 ** 3;           // 8 (same as pow)
Math.sqrt(16);    // 4

// Min & Max
Math.min(1, 2, 3);  // 1
Math.max(1, 2, 3);  // 3
Math.min(...arr);   // Min of array
Math.max(...arr);   // Max of array

// Random
Math.random();           // 0 to 0.999...
Math.random() * 10;      // 0 to 9.999...
Math.floor(Math.random() * 10);     // 0 to 9
Math.floor(Math.random() * 10) + 1; // 1 to 10

// Random integer in range
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}`)}
                `
            },

            date: {
                title: 'Date Object',
                content: `
                    <h2>Date Object</h2>

                    ${this.codeBlock(`// Current date/time
const now = new Date();

// Specific date
const date = new Date("2024-12-25");
const date = new Date(2024, 11, 25); // Month is 0-indexed!
const date = new Date(2024, 11, 25, 10, 30, 0);

// Timestamp (milliseconds since 1970)
Date.now();        // Current timestamp
date.getTime();    // Timestamp of date

// Get components
date.getFullYear();   // 2024
date.getMonth();      // 11 (December, 0-indexed)
date.getDate();       // 25 (day of month)
date.getDay();        // Day of week (0=Sunday)
date.getHours();      // 10
date.getMinutes();    // 30
date.getSeconds();    // 0

// Set components
date.setFullYear(2025);
date.setMonth(0);      // January
date.setDate(1);
date.setHours(12);

// Format
date.toLocaleDateString();  // "12/25/2024"
date.toLocaleTimeString();  // "10:30:00 AM"
date.toISOString();         // "2024-12-25T10:30:00.000Z"

// Compare dates
date1 > date2;
date1.getTime() === date2.getTime();`)}
                `
            },

            console: {
                title: 'Console Methods',
                content: `
                    <h2>Console Methods</h2>

                    ${this.codeBlock(`// Basic logging
console.log("Message");
console.log("Value:", value);
console.log("Multiple", "values", 123);

// Log levels
console.info("Info message");
console.warn("Warning message");
console.error("Error message");

// Formatted output
console.log("Name: %s, Age: %d", "John", 30);

// Object inspection
console.dir(object);
console.table([{a: 1}, {a: 2}]); // Table format

// Grouping
console.group("Group name");
console.log("Inside group");
console.groupEnd();

// Timing
console.time("timer");
// ... code to measure
console.timeEnd("timer"); // timer: 123ms

// Counting
console.count("label"); // label: 1
console.count("label"); // label: 2

// Clear console
console.clear();

// Assert (logs if false)
console.assert(x > 0, "x should be positive");`)}
                `
            },

            // Templates & Rendering
            templatestrings: {
                title: 'Template Literals',
                content: `
                    <h2>Template Literals</h2>

                    ${this.codeBlock(`// Basic interpolation
const name = "John";
const greeting = \`Hello, \${name}!\`;

// Expressions
const result = \`2 + 2 = \${2 + 2}\`;
const status = \`Status: \${isActive ? "Active" : "Inactive"}\`;

// Multi-line strings
const html = \`
    <div class="card">
        <h2>\${title}</h2>
        <p>\${description}</p>
    </div>
\`;

// Nested templates
const items = ["a", "b", "c"];
const list = \`
    <ul>
        \${items.map(item => \`<li>\${item}</li>\`).join("")}
    </ul>
\`;

// Tagged templates
function highlight(strings, ...values) {
    return strings.reduce((acc, str, i) => {
        return acc + str + (values[i] ? \`<mark>\${values[i]}</mark>\` : "");
    }, "");
}
const result = highlight\`Hello \${name}, you have \${count} messages\`;`)}
                `
            },

            lithtml: {
                title: 'lit-html Basics',
                content: `
                    <h2>lit-html</h2>

                    ${this.codeBlock(`import { html, render } from 'lit-html';

// Basic template
const template = html\`<h1>Hello World</h1>\`;

// With data
const greeting = (name) => html\`<h1>Hello, \${name}!</h1>\`;

// Render to DOM
render(template, document.body);
render(greeting("John"), document.getElementById("app"));

// Conditionals
const template = html\`
    \${isLoggedIn
        ? html\`<p>Welcome back!</p>\`
        : html\`<p>Please log in</p>\`
    }
\`;

// Lists
const items = ["Apple", "Banana", "Orange"];
const list = html\`
    <ul>
        \${items.map(item => html\`<li>\${item}</li>\`)}
    </ul>
\`;

// Event handlers
const button = html\`
    <button @click=\${(e) => console.log("Clicked!")}>
        Click me
    </button>
\`;

// Attributes
const input = html\`
    <input
        type="text"
        .value=\${value}
        ?disabled=\${isDisabled}
        @input=\${(e) => handleInput(e)}
    >
\`;`)}

                    <div class="docs-note">
                        <p><strong>Note:</strong> <code>.property</code> for properties, <code>?attr</code> for boolean attributes, <code>@event</code> for event listeners.</p>
                    </div>
                `
            },

            // Routing
            pagejs: {
                title: 'page.js Basics',
                content: `
                    <h2>page.js Router</h2>

                    ${this.codeBlock(`import page from 'page';

// Define routes
page('/', homePage);
page('/about', aboutPage);
page('/users/:id', userPage);
page('/products/:category/:id', productPage);
page('*', notFoundPage);

// Start router
page.start();

// Route handlers
function homePage(ctx) {
    render(homeTemplate(), document.body);
}

function userPage(ctx) {
    const userId = ctx.params.id;
    // Fetch and render user
}

// Query parameters
// URL: /search?q=hello&page=2
function searchPage(ctx) {
    const query = ctx.querystring; // "q=hello&page=2"
    const params = new URLSearchParams(query);
    const q = params.get('q');     // "hello"
    const page = params.get('page'); // "2"
}

// Navigate programmatically
page('/about');
page.redirect('/login');

// Middleware
page('*', (ctx, next) => {
    // Run before every route
    console.log('Navigating to:', ctx.path);
    next();
});

// Protected routes
page('/dashboard', requireAuth, dashboardPage);

function requireAuth(ctx, next) {
    if (isAuthenticated()) {
        next();
    } else {
        page.redirect('/login');
    }
}`)}
                `
            }
        };

        return docs[docId];
    }

    codeBlock(code) {
        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return `<div class="docs-code"><button class="copy-btn">Copy</button><pre><code>${escaped}</code></pre></div>`;
    }
}

export default DocsManager;
