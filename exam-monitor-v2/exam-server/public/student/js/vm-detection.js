/**
 * Virtual Machine Detection Module
 * Detects if exam is running inside VM (VirtualBox, VMware, etc)
 * CRITICAL SECURITY: Blocks login if VM is detected
 */

/**
 * Comprehensive VM detection result
 * @typedef {Object} VMDetectionResult
 * @property {boolean} isVM - True if VM detected
 * @property {number} confidence - Confidence level (0-100)
 * @property {Array<string>} indicators - List of indicators that triggered
 * @property {Object} details - Detailed fingerprint data
 */

/**
 * Perform comprehensive VM detection
 * @returns {VMDetectionResult}
 */
export function detectVirtualMachine() {
    const indicators = [];
    let confidence = 0;
    const details = {};

    // 1. GPU Vendor Detection (Most reliable)
    const gpuResult = checkGPUVendor();
    if (gpuResult.isVM) {
        indicators.push('GPU: ' + gpuResult.vendor);
        confidence += 40;
    }
    details.gpu = gpuResult;

    // 2. Hardware Concurrency (CPU cores)
    const cpuResult = checkCPUCores();
    if (cpuResult.suspicious) {
        indicators.push('CPU: ' + cpuResult.reason);
        confidence += 15;
    }
    details.cpu = cpuResult;

    // 3. Device Memory
    const memoryResult = checkDeviceMemory();
    if (memoryResult.suspicious) {
        indicators.push('Memory: ' + memoryResult.reason);
        confidence += 10;
    }
    details.memory = memoryResult;

    // 4. Screen Resolution Patterns
    const screenResult = checkScreenResolution();
    if (screenResult.suspicious) {
        indicators.push('Screen: ' + screenResult.reason);
        confidence += 10;
    }
    details.screen = screenResult;

    // 5. WebGL Renderer String
    const webglResult = checkWebGLRenderer();
    if (webglResult.isVM) {
        indicators.push('WebGL: ' + webglResult.renderer);
        confidence += 35;
    }
    details.webgl = webglResult;

    // 6. Plugin Detection (legacy but useful)
    const pluginResult = checkPlugins();
    if (pluginResult.suspicious) {
        indicators.push('Plugins: ' + pluginResult.reason);
        confidence += 5;
    }
    details.plugins = pluginResult;

    // 7. Performance Anomalies
    const perfResult = checkPerformanceAnomalies();
    if (perfResult.suspicious) {
        indicators.push('Performance: ' + perfResult.reason);
        confidence += 10;
    }
    details.performance = perfResult;

    // 8. Platform Consistency Check
    const platformResult = checkPlatformConsistency();
    if (platformResult.suspicious) {
        indicators.push('Platform: ' + platformResult.reason);
        confidence += 5;
    }
    details.platform = platformResult;

    const isVM = confidence >= 50; // Threshold for VM detection

    return {
        isVM,
        confidence,
        indicators,
        details
    };
}

/**
 * Check GPU vendor for VM signatures
 */
function checkGPUVendor() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            return { isVM: false, vendor: 'No WebGL', reason: 'WebGL not supported' };
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) {
            return { isVM: false, vendor: 'Unknown', reason: 'Debug info not available' };
        }

        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        // VM GPU signatures
        const vmSignatures = [
            'VMware',
            'VirtualBox',
            'QEMU',
            'Virtual',
            'Microsoft Basic Render Driver',
            'llvmpipe', // Software renderer
            'SwiftShader'
        ];

        const isVM = vmSignatures.some(sig =>
            vendor.includes(sig) || renderer.includes(sig)
        );

        return {
            isVM,
            vendor,
            renderer,
            reason: isVM ? 'VM GPU detected' : 'Real GPU'
        };

    } catch (error) {
        console.error('GPU check error:', error);
        return { isVM: false, vendor: 'Error', reason: error.message };
    }
}

/**
 * Check CPU core count
 */
function checkCPUCores() {
    const cores = navigator.hardwareConcurrency || 0;

    // VMs often have 1-2 cores allocated
    const suspicious = cores > 0 && cores <= 2;

    return {
        suspicious,
        cores,
        reason: suspicious ? `Low core count (${cores})` : `Normal (${cores} cores)`
    };
}

/**
 * Check device memory
 */
function checkDeviceMemory() {
    const memory = navigator.deviceMemory; // In GB

    if (memory === undefined) {
        return { suspicious: false, memory: 'Unknown', reason: 'API not supported' };
    }

    // VMs often have limited RAM (2-4GB)
    const suspicious = memory <= 4;

    return {
        suspicious,
        memory: memory + 'GB',
        reason: suspicious ? `Low memory (${memory}GB)` : `Normal (${memory}GB)`
    };
}

/**
 * Check screen resolution for VM patterns
 */
function checkScreenResolution() {
    const width = screen.width;
    const height = screen.height;
    const availWidth = screen.availWidth;
    const availHeight = screen.availHeight;

    // Common VM resolutions
    const vmResolutions = [
        '800x600',
        '1024x768',
        '1280x800', // VirtualBox default
        '1360x768'  // VMware default
    ];

    const currentRes = `${width}x${height}`;
    const isCommonVM = vmResolutions.includes(currentRes);

    // Check for exact available vs total match (suspicious in VMs)
    const perfectMatch = (width === availWidth && height === availHeight);

    const suspicious = isCommonVM || (perfectMatch && width < 1920);

    return {
        suspicious,
        width,
        height,
        availWidth,
        availHeight,
        reason: suspicious ? `VM-like resolution (${currentRes})` : `Normal (${currentRes})`
    };
}

/**
 * Check WebGL renderer string
 */
function checkWebGLRenderer() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            return { isVM: false, renderer: 'No WebGL' };
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) {
            return { isVM: false, renderer: 'Unknown' };
        }

        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        const vmPatterns = [
            /vmware/i,
            /virtualbox/i,
            /virtual/i,
            /qemu/i,
            /llvmpipe/i,
            /software/i,
            /swiftshader/i
        ];

        const isVM = vmPatterns.some(pattern => pattern.test(renderer));

        return {
            isVM,
            renderer,
            reason: isVM ? 'VM renderer detected' : 'Real renderer'
        };

    } catch (error) {
        return { isVM: false, renderer: 'Error', reason: error.message };
    }
}

/**
 * Check browser plugins (legacy detection)
 */
function checkPlugins() {
    const plugins = navigator.plugins;

    if (!plugins || plugins.length === 0) {
        return { suspicious: true, count: 0, reason: 'No plugins (suspicious)' };
    }

    // VMs often have very few or no plugins
    const suspicious = plugins.length < 3;

    return {
        suspicious,
        count: plugins.length,
        reason: suspicious ? `Few plugins (${plugins.length})` : `Normal (${plugins.length} plugins)`
    };
}

/**
 * Check for performance anomalies
 */
function checkPerformanceAnomalies() {
    try {
        // Measure simple operation speed
        const start = performance.now();

        // CPU-intensive operation
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += Math.sqrt(i);
        }

        const duration = performance.now() - start;

        // VMs are typically slower
        const suspicious = duration > 100; // More than 100ms for simple operation

        return {
            suspicious,
            duration: Math.round(duration) + 'ms',
            reason: suspicious ? `Slow performance (${Math.round(duration)}ms)` : `Normal (${Math.round(duration)}ms)`
        };

    } catch (error) {
        return { suspicious: false, duration: 'Error', reason: error.message };
    }
}

/**
 * Check platform consistency
 */
function checkPlatformConsistency() {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    const appVersion = navigator.appVersion;

    // Check for mismatches that indicate VM
    const platformLower = platform.toLowerCase();
    const uaLower = userAgent.toLowerCase();

    // Linux with Win32 platform = Wine/VM
    const suspicious = (
        (uaLower.includes('linux') && platform.includes('Win')) ||
        (uaLower.includes('windows') && platform.includes('Linux'))
    );

    return {
        suspicious,
        platform,
        userAgent: userAgent.substring(0, 50) + '...',
        reason: suspicious ? 'Platform mismatch' : 'Consistent'
    };
}

/**
 * Get detailed VM detection report (for logging)
 */
export function getVMDetectionReport() {
    const result = detectVirtualMachine();

    return {
        ...result,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        summary: result.isVM
            ? `WARNING: VM DETECTED (${result.confidence}% confidence)`
            : `OK: Real machine (${result.confidence}% VM probability)`
    };
}

/**
 * Check if VM detection should block login
 * @param {VMDetectionResult} result
 * @returns {boolean}
 */
export function shouldBlockLogin(result) {
    // Block if confidence >= 50%
    return result.confidence >= 50;
}

/**
 * Format VM detection message for user
 * @param {VMDetectionResult} result
 * @returns {string}
 */
export function formatVMMessage(result) {
    if (!result.isVM) {
        return 'OK: Устройството е валидирано';
    }

    const indicators = result.indicators.join(', ');

    return `WARNING: Засечена е виртуална машина!\n\n` +
           `Изпитът НЕ МОЖЕ да се провежда във виртуална среда.\n\n` +
           `Индикатори: ${indicators}\n\n` +
           `Моля, влезте от реално устройство.`;
}

/**
 * Log VM detection to server
 * @param {VMDetectionResult} result
 * @param {string} studentInfo
 */
export async function reportVMDetectionToServer(result, studentInfo) {
    try {
        const response = await fetch('/api/security/vm-detection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vmDetection: result,
                studentInfo: studentInfo,
                timestamp: Date.now()
            })
        });

        if (!response.ok) {
            console.warn('Failed to report VM detection to server');
        }

    } catch (error) {
        console.error('Error reporting VM detection:', error);
    }
}
