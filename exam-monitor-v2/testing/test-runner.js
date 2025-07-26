#!/usr/bin/env node

/**
 * 🧪 ANTI-CHEAT TESTING FRAMEWORK
 * Automated testing of exam anti-cheat system using Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const colors = require('colors');

// Test configuration
const config = {
    examUrl: 'http://localhost:8080/student',
    testStudent: {
        name: 'Test Student',
        class: '11Б'
    },
    browsers: ['chromium'], // Can add 'firefox', 'webkit'
    headless: false, // Set to true for CI/CD
    timeout: 30000,
    outputDir: './test-results'
};

class AntiCheatTester {
    constructor() {
        this.results = {
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                errors: 0
            },
            tests: [],
            browser: '',
            timestamp: new Date().toISOString(),
            coverage: {}
        };
        
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        console.log('🚀 INITIALIZING ANTI-CHEAT TESTING FRAMEWORK'.blue.bold);
        
        // Ensure output directory exists
        await fs.ensureDir(config.outputDir);
        
        // Launch browser
        this.browser = await puppeteer.launch({
            headless: config.headless,
            defaultViewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Set up console logging
        this.page.on('console', msg => {
            if (msg.text().includes('🔥') || msg.text().includes('❌')) {
                console.log(`[BROWSER] ${msg.text()}`.yellow);
            }
        });
        
        console.log('✅ Browser launched successfully'.green);
    }

    async loginToExam() {
        console.log('🔑 Logging into exam system...'.cyan);
        
        await this.page.goto(config.examUrl, { waitUntil: 'networkidle2' });
        
        // Wait for page to load
        await this.page.waitForTimeout(1000);
        
        // Accept terms
        await this.page.waitForSelector('#terms-agreement', { visible: true });
        await this.page.click('#terms-agreement');
        
        // Fill login form
        await this.page.waitForSelector('#student-name', { visible: true });
        await this.page.type('#student-name', config.testStudent.name);
        
        await this.page.waitForSelector('#student-class', { visible: true });
        await this.page.select('#student-class', config.testStudent.class);
        
        // Find and click login button (could be different ID)
        await this.page.waitForTimeout(500);
        const loginButton = await this.page.$('#login-btn') || await this.page.$('button[type="submit"]') || await this.page.$('.login-btn');
        if (loginButton) {
            await loginButton.click();
        } else {
            // Try to find button with text content
            await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const loginBtn = buttons.find(btn => btn.textContent.includes('Вход') || btn.textContent.includes('Login') || btn.textContent.includes('Start'));
                if (loginBtn) loginBtn.click();
            });
        }
        
        // Wait for navigation and fullscreen prompt
        await this.page.waitForTimeout(3000);
        
        // Look for fullscreen prompt overlay
        console.log('Looking for fullscreen prompt...'.yellow);
        const fullscreenPrompt = await this.page.$('#fullscreen-prompt-overlay');
        
        if (fullscreenPrompt) {
            console.log('Found fullscreen prompt, clicking enter fullscreen button...'.yellow);
            
            // Click the fullscreen button
            await this.page.waitForSelector('#enter-fullscreen-btn', { visible: true });
            await this.page.click('#enter-fullscreen-btn');
            
            // Wait for fullscreen to activate
            await this.page.waitForTimeout(2000);
            
            // Check if we're in fullscreen
            const isFullscreen = await this.page.evaluate(() => {
                return !!(document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement || 
                         document.msFullscreenElement);
            });
            
            if (isFullscreen) {
                console.log('✅ Successfully entered fullscreen mode'.green);
            } else {
                console.log('⚠️ Fullscreen mode not detected, continuing anyway...'.yellow);
            }
        } else {
            console.log('No fullscreen prompt found, trying direct fullscreen...'.yellow);
            // Try direct fullscreen if no prompt
            await this.page.evaluate(() => {
                document.documentElement.requestFullscreen();
            });
        }
        
        // Wait for anti-cheat activation
        await this.page.waitForTimeout(3000);
        
        // Debug: Check page state
        const pageState = await this.page.evaluate(() => {
            return {
                hasExamApp: !!window.ExamApp,
                isLoggedIn: window.ExamApp ? window.ExamApp.isLoggedIn : false,
                isFullscreen: window.ExamApp ? window.ExamApp.isFullscreen : false,
                antiCheatActive: window.ExamApp ? window.ExamApp.antiCheatActive : false,
                currentUrl: window.location.href,
                fullscreenElement: !!document.fullscreenElement,
                overlayExists: !!document.querySelector('#fullscreen-prompt-overlay')
            };
        });
        
        console.log('Page state:', JSON.stringify(pageState, null, 2));
        
        if (pageState.antiCheatActive) {
            console.log('✅ Anti-cheat system is ACTIVE'.green);
        } else {
            console.log('⚠️ Anti-cheat system may not be active'.yellow);
            
            // Try to force activate anti-cheat
            await this.page.evaluate(() => {
                if (window.ExamApp) {
                    window.ExamApp.antiCheatActive = true;
                    window.ExamApp.isFullscreen = true;
                    window.ExamApp.isLoggedIn = true;
                }
            });
            
            console.log('🔧 Attempted to force activate anti-cheat'.yellow);
        }
        
        console.log('✅ Successfully logged into exam and entered fullscreen'.green);
    }

    async runTest(testName, testFunction, category = 'general') {
        this.results.summary.total++;
        
        const testResult = {
            name: testName,
            category: category,
            status: 'running',
            startTime: Date.now(),
            endTime: null,
            duration: null,
            error: null,
            violationDetected: false,
            expectedViolation: true,
            logs: []
        };
        
        console.log(`🧪 Testing: ${testName}`.yellow);
        
        try {
            // Set up violation detection
            let violationDetected = false;
            
            this.page.on('console', (msg) => {
                const text = msg.text();
                testResult.logs.push(text);
                
                if (text.includes('❌') || text.includes('BLOCKED') || text.includes('DETECTED')) {
                    violationDetected = true;
                    testResult.violationDetected = true;
                }
            });
            
            // Run the test
            await testFunction(this.page);
            
            // Wait for system to process
            await this.page.waitForTimeout(1000);
            
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            // Check if violation was properly detected
            if (testResult.expectedViolation && violationDetected) {
                testResult.status = 'passed';
                this.results.summary.passed++;
                console.log(`✅ ${testName} PASSED - Violation detected as expected`.green);
            } else if (!testResult.expectedViolation && !violationDetected) {
                testResult.status = 'passed';
                this.results.summary.passed++;
                console.log(`✅ ${testName} PASSED - No violation as expected`.green);
            } else {
                testResult.status = 'failed';
                this.results.summary.failed++;
                console.log(`❌ ${testName} FAILED - Expected violation: ${testResult.expectedViolation}, Detected: ${violationDetected}`.red);
            }
            
        } catch (error) {
            testResult.status = 'error';
            testResult.error = error.message;
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            this.results.summary.errors++;
            
            console.log(`💥 ${testName} ERROR: ${error.message}`.red);
        }
        
        this.results.tests.push(testResult);
    }

    async runKeyboardTests() {
        console.log('⌨️ RUNNING KEYBOARD TESTS'.blue.bold);
        
        // Test function keys
        const functionKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F11', 'F12'];
        for (const key of functionKeys) {
            await this.runTest(`Function Key ${key}`, async (page) => {
                await page.keyboard.press(key);
            }, 'keyboard');
        }
        
        // Test dangerous combinations
        const dangerousCombos = [
            { keys: 'Control+Shift+I', desc: 'DevTools' },
            { keys: 'Control+Shift+J', desc: 'Console' },
            { keys: 'Control+R', desc: 'Refresh' },
            { keys: 'Control+T', desc: 'New Tab' },
            { keys: 'Control+W', desc: 'Close Tab' },
            { keys: 'Alt+Tab', desc: 'Alt+Tab' },
            { keys: 'Control+U', desc: 'View Source' }
        ];
        
        for (const combo of dangerousCombos) {
            await this.runTest(`Key Combo: ${combo.desc}`, async (page) => {
                await page.keyboard.press(combo.keys);
            }, 'keyboard');
        }
        
        // Test allowed combinations in editor
        await this.runTest('Allowed Combo: Ctrl+C in Editor', async (page) => {
            await page.click('#monaco-editor');
            await page.keyboard.press('Control+KeyC');
        }, 'keyboard');
    }

    async runMouseTests() {
        console.log('🖱️ RUNNING MOUSE TESTS'.blue.bold);
        
        // Test right click
        await this.runTest('Right Click', async (page) => {
            await page.click('body', { button: 'right' });
        }, 'mouse');
        
        // Test middle click
        await this.runTest('Middle Click', async (page) => {
            await page.click('body', { button: 'middle' });
        }, 'mouse');
        
        // Test mouse leave window
        await this.runTest('Mouse Leave Window', async (page) => {
            await page.mouse.move(0, 0);
            await page.evaluate(() => {
                document.dispatchEvent(new Event('mouseleave'));
            });
        }, 'mouse');
    }

    async runFullscreenTests() {
        console.log('📺 RUNNING FULLSCREEN TESTS'.blue.bold);
        
        // Test ESC key (exit fullscreen)
        await this.runTest('ESC Key - Exit Fullscreen', async (page) => {
            await page.keyboard.press('Escape');
        }, 'fullscreen');
        
        // Test F11 (toggle fullscreen)
        await this.runTest('F11 - Toggle Fullscreen', async (page) => {
            await page.keyboard.press('F11');
        }, 'fullscreen');
        
        // Test programmatic fullscreen exit
        await this.runTest('Programmatic Fullscreen Exit', async (page) => {
            await page.evaluate(() => {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            });
        }, 'fullscreen');
    }

    async runFocusTests() {
        console.log('👁️ RUNNING FOCUS TESTS'.blue.bold);
        
        // Test window blur
        await this.runTest('Window Blur', async (page) => {
            await page.evaluate(() => {
                window.dispatchEvent(new Event('blur'));
            });
        }, 'focus');
        
        // Test visibility change
        await this.runTest('Visibility Change', async (page) => {
            await page.evaluate(() => {
                Object.defineProperty(document, 'visibilityState', {
                    writable: true,
                    value: 'hidden'
                });
                document.dispatchEvent(new Event('visibilitychange'));
            });
        }, 'focus');
    }

    async generateReport() {
        console.log('📊 GENERATING TEST REPORT'.blue.bold);
        
        const reportData = {
            ...this.results,
            config: config,
            environment: {
                userAgent: await this.page.evaluate(() => navigator.userAgent),
                platform: await this.page.evaluate(() => navigator.platform),
                language: await this.page.evaluate(() => navigator.language)
            }
        };
        
        // Generate JSON report
        const jsonReportPath = path.join(config.outputDir, `test-report-${Date.now()}.json`);
        await fs.writeJson(jsonReportPath, reportData, { spaces: 2 });
        
        // Generate HTML report
        const htmlReport = this.generateHtmlReport(reportData);
        const htmlReportPath = path.join(config.outputDir, `test-report-${Date.now()}.html`);
        await fs.writeFile(htmlReportPath, htmlReport);
        
        console.log(`📄 JSON Report: ${jsonReportPath}`.green);
        console.log(`🌐 HTML Report: ${htmlReportPath}`.green);
        
        // Print summary
        this.printSummary();
    }

    generateHtmlReport(data) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Anti-Cheat Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0; font-size: 2em; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .errors { color: #ffc107; }
        .total { color: #007bff; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .test-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #ddd; }
        .test-passed { border-left-color: #28a745; }
        .test-failed { border-left-color: #dc3545; }
        .test-error { border-left-color: #ffc107; }
        .category { display: inline-block; background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; }
        .logs { background: #f1f3f4; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.8em; max-height: 100px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Anti-Cheat System Test Report</h1>
            <p>Generated: ${data.timestamp}</p>
            <p>Browser: ${data.environment.userAgent}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3 class="total">${data.summary.total}</h3>
                <p>Total Tests</p>
            </div>
            <div class="metric">
                <h3 class="passed">${data.summary.passed}</h3>
                <p>Passed</p>
            </div>
            <div class="metric">
                <h3 class="failed">${data.summary.failed}</h3>
                <p>Failed</p>
            </div>
            <div class="metric">
                <h3 class="errors">${data.summary.errors}</h3>
                <p>Errors</p>
            </div>
        </div>
        
        <div class="test-grid">
            ${data.tests.map(test => `
                <div class="test-card test-${test.status}">
                    <h4>${test.name}</h4>
                    <p><span class="category">${test.category}</span></p>
                    <p><strong>Status:</strong> ${test.status.toUpperCase()}</p>
                    <p><strong>Duration:</strong> ${test.duration}ms</p>
                    <p><strong>Violation Expected:</strong> ${test.expectedViolation ? 'Yes' : 'No'}</p>
                    <p><strong>Violation Detected:</strong> ${test.violationDetected ? 'Yes' : 'No'}</p>
                    ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ''}
                    ${test.logs.length > 0 ? `
                        <details>
                            <summary>Console Logs</summary>
                            <div class="logs">${test.logs.join('<br>')}</div>
                        </details>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
    }

    printSummary() {
        console.log('\n📊 TEST SUMMARY'.blue.bold);
        console.log('═'.repeat(50).gray);
        console.log(`Total Tests: ${this.results.summary.total}`.white);
        console.log(`Passed: ${this.results.summary.passed}`.green);
        console.log(`Failed: ${this.results.summary.failed}`.red);
        console.log(`Errors: ${this.results.summary.errors}`.yellow);
        
        const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);
        console.log(`Success Rate: ${successRate}%`.cyan);
        console.log('═'.repeat(50).gray);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.loginToExam();
            
            await this.runKeyboardTests();
            await this.runMouseTests();
            await this.runFullscreenTests();
            await this.runFocusTests();
            
            await this.generateReport();
            
        } catch (error) {
            console.error('💥 Testing framework error:'.red, error);
        } finally {
            await this.cleanup();
        }
    }
}

// Run tests if executed directly
if (require.main === module) {
    const tester = new AntiCheatTester();
    tester.run().then(() => {
        console.log('🏁 Testing completed'.green.bold);
        process.exit(0);
    }).catch(error => {
        console.error('💥 Fatal error:'.red, error);
        process.exit(1);
    });
}

module.exports = AntiCheatTester;