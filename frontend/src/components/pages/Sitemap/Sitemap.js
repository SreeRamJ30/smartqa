import React, { useState, useRef, useEffect } from 'react';
import './Sitemap.css';

function Sitemap() {
  // Sitemap state
  const [testingSitemap, setTestingSitemap] = useState({
    fileName: '',
    content: null,
    urlCount: 0
  });
  const [referenceSitemap, setReferenceSitemap] = useState({
    fileName: '',
    content: null,
    urlCount: 0
  });
  
  // URL input state
  const [testingUrls, setTestingUrls] = useState('');
  const [referenceUrls, setReferenceUrls] = useState('');
  const [showUrlInputs, setShowUrlInputs] = useState(false);
  const [generatingTestingSitemap, setGeneratingTestingSitemap] = useState(false);
  const [generatingReferenceSitemap, setGeneratingReferenceSitemap] = useState(false);
  
  // Enhanced visual testing parameters with additional options
  const [visualParams, setVisualParams] = useState({
    threshold: 0.1,
    captureDelay: 2000,
    hideSelectors: '',
    requireSameDimensions: true,
    ignoreAntialiasing: false,
    ignoreColors: false,
    debugMode: false,
    scaleToSameSize: true,
    asyncCaptureLimit: 10,
    asyncCompareLimit: 50,
    resembleOutputSettings: {
      errorColor: { red: 255, green: 0, blue: 255 },
      errorType: 'movement',
      transparency: 0.3,
      largeImageThreshold: 1200,
      useCrossOrigin: false,
      outputDiff: true
    },
    viewports: [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ]
  });
  
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [currentPreset, setCurrentPreset] = useState('standard');
  const [configurationSaved, setConfigurationSaved] = useState(false);
  const [parameterChanges, setParameterChanges] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    presets: true,
    parameters: true,
    viewports: true,
    advanced: false,
    summary: true
  });

  // Enhanced state for advanced features
  const [showConfigExport, setShowConfigExport] = useState(false);
  const [showConfigImport, setShowConfigImport] = useState(false);
  const [savedConfigurations, setSavedConfigurations] = useState([]);
  const [configurationName, setConfigurationName] = useState('');
  const [viewportPreview, setViewportPreview] = useState(null);
  const [batchOperations, setBatchOperations] = useState({
    selectedViewports: [],
    operation: 'scale',
    factor: 1.5
  });
  
  // New advanced state additions
  const [performanceMetrics, setPerformanceMetrics] = useState({
    estimatedDuration: 0,
    totalScreenshots: 0,
    memoryUsage: 0,
    networkRequests: 0
  });
  const [realTimeValidation, setRealTimeValidation] = useState({
    thresholdWarning: false,
    delayWarning: false,
    viewportWarning: false,
    selectorWarning: false
  });
  const [customColorScheme, setCustomColorScheme] = useState({
    errorColor: '#FF0066',
    successColor: '#00FF66',
    warningColor: '#FFB300',
    backgroundColor: '#FFFFFF'
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    urlPattern: '',
    excludePatterns: [],
    includeOnlyMobile: false,
    skipLargeImages: false,
    customHeaders: {}
  });
  const [testingSchedule, setTestingSchedule] = useState({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    notifications: true
  });
  const [aiAssistance, setAiAssistance] = useState({
    enabled: false,
    suggestions: [],
    autoOptimize: false,
    learningMode: true
  });
  
  // Refs for file inputs and UI elements
  const testingSitemapRef = useRef();
  const referenceSitemapRef = useRef();
  const advancedOptionsRef = useRef();
  const configImportRef = useRef();

  // Enhanced preset configurations with more comprehensive options
  const presetConfigurations = {
    standard: {
      name: 'Standard Testing',
      icon: 'fas fa-balance-scale',
      description: 'Balanced settings for most websites with common viewports',
      color: '#4CAF50',
      threshold: 0.1,
      captureDelay: 2000,
      hideSelectors: '.cookie-banner, .popup, .ads',
      requireSameDimensions: true,
      ignoreAntialiasing: false,
      ignoreColors: false,
      debugMode: false,
      viewports: [
        { name: 'Desktop FHD', width: 1920, height: 1080 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Mobile Large', width: 375, height: 812 }
      ]
    },
    strict: {
      name: 'Strict Precision',
      icon: 'fas fa-shield-alt',
      description: 'High precision testing with multiple viewports for critical applications',
      color: '#FF5722',
      threshold: 0.05,
      captureDelay: 3000,
      hideSelectors: '.cookie-banner, .popup, .ads, .timestamp, .dynamic-content',
      requireSameDimensions: true,
      ignoreAntialiasing: false,
      ignoreColors: false,
      debugMode: true,
      viewports: [
        { name: 'Desktop 4K', width: 2560, height: 1440 },
        { name: 'Desktop FHD', width: 1920, height: 1080 },
        { name: 'Desktop HD', width: 1366, height: 768 },
        { name: 'Tablet Landscape', width: 1024, height: 768 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Mobile XL', width: 414, height: 896 },
        { name: 'Mobile Standard', width: 375, height: 812 }
      ]
    },
    mobile: {
      name: 'Mobile Focused',
      icon: 'fas fa-mobile-alt',
      description: 'Optimized for mobile-first testing with popular device sizes',
      color: '#2196F3',
      threshold: 0.15,
      captureDelay: 1500,
      hideSelectors: '.desktop-only, .cookie-banner, .popup',
      requireSameDimensions: false,
      ignoreAntialiasing: true,
      ignoreColors: false,
      debugMode: false,
      viewports: [
        { name: 'iPhone 14 Pro Max', width: 428, height: 926 },
        { name: 'iPhone 14 Pro', width: 393, height: 852 },
        { name: 'iPhone 14', width: 390, height: 844 },
        { name: 'Samsung Galaxy S22', width: 384, height: 854 },
        { name: 'iPhone SE', width: 375, height: 667 },
        { name: 'iPad Mini', width: 744, height: 1133 }
      ]
    },
    performance: {
      name: 'Performance Mode',
      icon: 'fas fa-rocket',
      description: 'Fast testing with minimal delays and relaxed thresholds',
      color: '#FF9800',
      threshold: 0.2,
      captureDelay: 500,
      hideSelectors: '.ads, .analytics',
      requireSameDimensions: false,
      ignoreAntialiasing: true,
      ignoreColors: true,
      debugMode: false,
      viewports: [
        { name: 'Desktop', width: 1366, height: 768 },
        { name: 'Mobile', width: 375, height: 667 }
      ]
    },
    accessibility: {
      name: 'Accessibility Testing',
      icon: 'fas fa-universal-access',
      description: 'Focused on accessibility compliance with high contrast and zoom testing',
      color: '#9C27B0',
      threshold: 0.08,
      captureDelay: 2500,
      hideSelectors: '.decorative, .background-animations',
      requireSameDimensions: true,
      ignoreAntialiasing: false,
      ignoreColors: false,
      debugMode: true,
      viewports: [
        { name: 'Desktop 125%', width: 1536, height: 864 },
        { name: 'Desktop 150%', width: 1280, height: 720 },
        { name: 'Mobile Large Text', width: 375, height: 812 },
        { name: 'Tablet Zoom', width: 614, height: 819 }
      ]
    }
  };

  // Default viewports for quick re-add
  const defaultViewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 }
  ];

  // Common viewport presets for quick selection
  const viewportPresets = {
    desktop: [
      { name: 'Desktop 4K', width: 2560, height: 1440 },
      { name: 'Desktop QHD', width: 2048, height: 1152 },
      { name: 'Desktop FHD', width: 1920, height: 1080 },
      { name: 'Desktop HD', width: 1366, height: 768 },
      { name: 'Desktop Standard', width: 1280, height: 720 }
    ],
    tablet: [
      { name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
      { name: 'iPad Pro 11"', width: 834, height: 1194 },
      { name: 'iPad Air', width: 820, height: 1180 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Mini', width: 744, height: 1133 }
    ],
    mobile: [
      { name: 'iPhone 14 Pro Max', width: 428, height: 926 },
      { name: 'iPhone 14 Pro', width: 393, height: 852 },
      { name: 'iPhone 14', width: 390, height: 844 },
      { name: 'Samsung Galaxy S22', width: 384, height: 854 },
      { name: 'iPhone 13 Mini', width: 375, height: 812 },
      { name: 'iPhone SE', width: 375, height: 667 }
    ]
  };

  // Common selector suggestions for hiding elements
  const selectorSuggestions = [
    { label: 'Cookie Banners', value: '.cookie-banner, .cookie-notice, #cookie-consent' },
    { label: 'Advertisements', value: '.ad, .ads, .advertisement, [class*="ad-"]' },
    { label: 'Popups & Modals', value: '.popup, .modal, .overlay, .lightbox' },
    { label: 'Chat Widgets', value: '.chat-widget, .intercom, .zendesk-widget' },
    { label: 'Dynamic Content', value: '.timestamp, .live-update, [data-dynamic]' },
    { label: 'Social Media', value: '.social-share, .fb-like, .twitter-tweet' },
    { label: 'Animations', value: '[class*="animate"], .animated, .loading' }
  ];

  // Animation and UI helpers
  useEffect(() => {
    if (showAdvancedOptions && advancedOptionsRef.current) {
      // Smooth scroll to advanced options when opened
      setTimeout(() => {
        advancedOptionsRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
  }, [showAdvancedOptions]);

  // Handle sitemap file upload
  const handleFileUpload = (e, sitemapType) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const urlCount = countUrlsInSitemap(content);
      
      if (sitemapType === 'testing') {
        setTestingSitemap({
          fileName: file.name,
          content: content,
          urlCount: urlCount
        });
      } else {
        setReferenceSitemap({
          fileName: file.name,
          content: content,
          urlCount: urlCount
        });
      }
    };
    
    reader.readAsText(file);
  };

  // Count URLs in sitemap content
  const countUrlsInSitemap = (content) => {
    if (!content) return 0;
    
    // Simple counting for XML sitemaps
    const urlMatches = content.match(/<loc>(.*?)<\/loc>/g);
    return urlMatches ? urlMatches.length : 0;
  };

  // Upload sitemaps (would connect to backend in real implementation)
  const handleUploadSitemaps = () => {
    // Here you would typically send the sitemaps to the backend
    console.log('Testing sitemap:', testingSitemap);
    console.log('Reference sitemap:', referenceSitemap);
    
    alert('Sitemaps uploaded successfully!');
  };

  // Function to handle URL input changes for testing site
  const handleTestingUrlsChange = (e) => {
    setTestingUrls(e.target.value);
  };

  // Function to handle URL input changes for reference site
  const handleReferenceUrlsChange = (e) => {
    setReferenceUrls(e.target.value);
  };

  // Enhanced function to generate sitemap from pasted URLs
  const generateSitemapFromUrls = (urls, sitemapType) => {
    // Split the input by commas only
    const urlList = urls.split(',')
      .map(url => url.trim())
      .filter(url => url !== '');
    
    if (urlList.length === 0) {
      alert('Please enter at least one URL');
      return;
    }

    // Create XML sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    urlList.forEach(url => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${url}</loc>\n`;
      sitemap += `  </url>\n`;
    });
    
    sitemap += `</urlset>`;
    
    // Set the sitemap content
    const urlCount = urlList.length;
    const fileName = `generated-${sitemapType}-sitemap.xml`;
    
    if (sitemapType === 'testing') {
      setTestingSitemap({
        fileName: fileName,
        content: sitemap,
        urlCount: urlCount
      });
      setGeneratingTestingSitemap(false);
    } else {
      setReferenceSitemap({
        fileName: fileName,
        content: sitemap,
        urlCount: urlCount
      });
      setGeneratingReferenceSitemap(false);
    }
  };

  // Enhanced function to handle "Generate Sitemap" button click
  const toggleUrlInputs = () => {
    setShowUrlInputs(!showUrlInputs);
    if (showUrlInputs) {
      setGeneratingTestingSitemap(false);
      setGeneratingReferenceSitemap(false);
    }
  };

  // Start combined testing (DOM first, then Visual)
  const [modal, setModal] = useState({ open: false, type: '', message: '' });
  const handleStartTesting = () => {
    if (!testingSitemap.content || !referenceSitemap.content) {
      alert('Please upload both sitemaps before starting tests.');
      return;
    }

    setIsRunningTests(true);
    
    // Prepare visual testing parameters
    const hideSelectorsArray = visualParams.hideSelectors
      .split(',')
      .map(selector => selector.trim())
      .filter(selector => selector !== '');

    // Make API call to backend to start combined testing
    fetch('http://localhost:3001/api/test/combined', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testingSitemap: testingSitemap.content,
        referenceSitemap: referenceSitemap.content,
        viewports: visualParams.viewports,
        threshold: visualParams.threshold,
        hideSelectors: hideSelectorsArray,
        captureDelay: visualParams.captureDelay,
        user: JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user')),
        fromFrontend: true
      })
    })
    .then(response => response.json())
    .then((data) => {
      setIsRunningTests(false);
      if (data.success) {
        setModal({ open: true, type: 'success', message: `Combined testing completed!\nDOM Tests: ${data.domResult?.success ? 'Passed' : 'Failed'}\nVisual Tests: ${data.visualResult?.success ? 'Passed' : 'Failed'}` });
        setTimeout(() => {
          setModal({ open: false, type: '', message: '' });
          window.dispatchEvent(new CustomEvent('navigate-section', { detail: 'combined-results' }));
        }, 2000);
      } else {
        setModal({ open: true, type: 'error', message: `Testing failed: ${data.error || data.message}` });
        setTimeout(() => setModal({ open: false, type: '', message: '' }), 2500);
      }
    })
    .catch(error => {
      setIsRunningTests(false);
      setModal({ open: true, type: 'error', message: 'Error connecting to testing service. Please try again.' });
      setTimeout(() => setModal({ open: false, type: '', message: '' }), 2500);
    });
  };

  // Handle visual parameter changes
  const handleVisualParamChange = (param, value) => {
    setVisualParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  // Handle viewport changes
  const handleViewportChange = (index, field, value) => {
    const newViewports = [...visualParams.viewports];
    newViewports[index] = {
      ...newViewports[index],
      [field]: field === 'name' ? value : parseInt(value)
    };
    setVisualParams(prev => ({
      ...prev,
      viewports: newViewports
    }));
  };

  // Add new viewport
  const addViewport = () => {
    setVisualParams(prev => ({
      ...prev,
      viewports: [...prev.viewports, { name: '', width: 1920, height: 1080 }]
    }));
  };

  // Remove viewport
  const removeViewport = (index) => {
    if (visualParams.viewports.length > 1) {
      const newViewports = visualParams.viewports.filter((_, i) => i !== index);
      setVisualParams(prev => ({
        ...prev,
        viewports: newViewports
      }));
    }
  };

  // Reset file input when clicking "Choose File" again
  const resetFileInput = (sitemapType) => {
    if (sitemapType === 'testing') {
      testingSitemapRef.current.value = "";
    } else {
      referenceSitemapRef.current.value = "";
    }
  };

  // Enhanced preset application with smooth transitions
  const applyPreset = (presetKey) => {
    const preset = presetConfigurations[presetKey];
    if (!preset) return;

    setCurrentPreset(presetKey);
    
    // Visual feedback
    setConfigurationSaved(true);
    setTimeout(() => setConfigurationSaved(false), 2000);

    // Apply preset with staggered animation
    const updates = [
      () => setVisualParams(prev => ({ ...prev, threshold: preset.threshold })),
      () => setVisualParams(prev => ({ ...prev, captureDelay: preset.captureDelay })),
      () => setVisualParams(prev => ({ ...prev, hideSelectors: preset.hideSelectors })),
      () => setVisualParams(prev => ({ ...prev, viewports: preset.viewports }))
    ];

    updates.forEach((update, index) => {
      setTimeout(update, index * 100);
    });
  };

  // Enhanced section toggle with animation
  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Enhanced viewport management
  const addViewportFromPreset = (preset) => {
    setVisualParams(prev => ({
      ...prev,
      viewports: [...prev.viewports, { ...preset }]
    }));
  };

  // Quick selector application
  const applySelectorSuggestion = (suggestion) => {
    const current = visualParams.hideSelectors;
    const newValue = current ? `${current}, ${suggestion}` : suggestion;
    setVisualParams(prev => ({
      ...prev,
      hideSelectors: newValue
    }));
  };

  // Calculate test estimation
  const getTestEstimation = () => {
    const urlCount = Math.max(testingSitemap.urlCount, referenceSitemap.urlCount);
    const viewportCount = visualParams.viewports.length;
    const delaySeconds = visualParams.captureDelay / 1000;
    
    // Rough estimation: (capture delay + processing time) per URL per viewport
    const estimatedMinutes = Math.ceil((urlCount * viewportCount * (delaySeconds + 2)) / 60);
    
    return {
      urls: urlCount,
      viewports: viewportCount,
      totalScreenshots: urlCount * viewportCount * 2, // testing + reference
      estimatedTime: estimatedMinutes
    };
  };

  // Enhanced animation utilities
  const animateValue = (start, end, duration, callback) => {
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeInOutCubic = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const currentValue = start + (end - start) * easeInOutCubic;
      callback(currentValue);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  // Enhanced parameter change handler with validation
  const handleParameterChange = (parameter, value, min, max) => {
    // Validate input
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return;
    
    const clampedValue = Math.max(min, Math.min(max, numValue));
    
    // Update parameter with visual feedback
    setParameterChanges(prev => ({
      ...prev,
      [parameter]: { oldValue: visualParams[parameter], newValue: clampedValue }
    }));

    // Clear feedback after animation
    setTimeout(() => {
      setParameterChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[parameter];
        return newChanges;
      });
    }, 1000);

    setVisualParams(prev => ({
      ...prev,
      [parameter]: clampedValue
    }));
  };

  // Calculate configuration summary
  const getConfigurationSummary = () => {
    const totalViewports = visualParams.viewports.length;
    const avgDelay = visualParams.captureDelay;
    const precision = (100 - visualParams.threshold * 100).toFixed(1);
    const ignoredCount = visualParams.hideSelectors.split(',').filter(e => e.trim()).length;
    
    return {
      viewports: totalViewports,
      delay: `${avgDelay}ms`,
      precision: `${precision}%`,
      ignored: ignoredCount
    };
  };

  // Enhanced configuration management functions
  const exportConfiguration = () => {
    const config = {
      name: configurationName || `Config_${new Date().toISOString().split('T')[0]}`,
      timestamp: new Date().toISOString(),
      preset: currentPreset,
      parameters: visualParams,
      version: '2.0'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowConfigExport(false);
    setConfigurationName('');
  };

  const importConfiguration = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        
        // Validate configuration structure
        if (config.parameters && config.parameters.viewports) {
          setVisualParams(config.parameters);
          setCurrentPreset(config.preset || 'custom');
          
          // Show success message
          setConfigurationSaved(true);
          setTimeout(() => setConfigurationSaved(false), 3000);
          
          alert(`Configuration "${config.name}" imported successfully!`);
        } else {
          throw new Error('Invalid configuration format');
        }
      } catch (error) {
        alert('Error importing configuration: ' + error.message);
      }
    };
    
    reader.readAsText(file);
    setShowConfigImport(false);
  };

  const saveCurrentConfiguration = () => {
    if (!configurationName.trim()) {
      alert('Please enter a configuration name');
      return;
    }

    const config = {
      id: Date.now(),
      name: configurationName,
      timestamp: new Date().toISOString(),
      preset: currentPreset,
      parameters: visualParams
    };

    const saved = [...savedConfigurations, config];
    setSavedConfigurations(saved);
    localStorage.setItem('sitemapConfigurations', JSON.stringify(saved));
    
    setConfigurationSaved(true);
    setTimeout(() => setConfigurationSaved(false), 2000);
    setConfigurationName('');
  };

  const loadSavedConfiguration = (config) => {
    setVisualParams(config.parameters);
    setCurrentPreset(config.preset);
    
    setConfigurationSaved(true);
    setTimeout(() => setConfigurationSaved(false), 2000);
  };

  const deleteSavedConfiguration = (configId) => {
    const filtered = savedConfigurations.filter(config => config.id !== configId);
    setSavedConfigurations(filtered);
    localStorage.setItem('sitemapConfigurations', JSON.stringify(filtered));
  };

  // Batch viewport operations
  const applyBatchOperation = () => {
    const { selectedViewports, operation, factor } = batchOperations;
    
    if (selectedViewports.length === 0) {
      alert('Please select viewports to modify');
      return;
    }

    const newViewports = [...visualParams.viewports];
    
    selectedViewports.forEach(index => {
      switch (operation) {
        case 'scale':
          newViewports[index] = {
            ...newViewports[index],
            width: Math.round(newViewports[index].width * factor),
            height: Math.round(newViewports[index].height * factor)
          };
          break;
        case 'resize':
          // Custom resize logic could be added here
          break;
        case 'duplicate':
          newViewports.push({
            ...newViewports[index],
            name: `${newViewports[index].name} Copy`
          });
          break;
        default:
          break;
      }
    });

    setVisualParams(prev => ({ ...prev, viewports: newViewports }));
    setBatchOperations({ selectedViewports: [], operation: 'scale', factor: 1.5 });
  };

  // Real-time viewport preview
  const generateViewportPreview = (viewport) => {
    const aspectRatio = viewport.width / viewport.height;
    const category = viewport.width <= 480 ? 'mobile' : 
                    viewport.width <= 768 ? 'tablet' : 'desktop';
    
    return {
      aspectRatio: aspectRatio.toFixed(2),
      category,
      density: viewport.width * viewport.height,
      commonDevice: getCommonDeviceName(viewport.width, viewport.height)
    };
  };

  const getCommonDeviceName = (width, height) => {
    const devices = {
      '1920x1080': 'Full HD Desktop',
      '1366x768': 'HD Laptop',
      '768x1024': 'iPad Portrait',
      '375x812': 'iPhone X/11/12',
      '414x896': 'iPhone XR/11',
      '375x667': 'iPhone 6/7/8'
    };
    
    return devices[`${width}x${height}`] || 'Custom Size';
  };

  // Enhanced animation utilities
  const animateConfigurationChange = (element, type = 'highlight') => {
    if (!element) return;
    
    switch (type) {
      case 'highlight':
        element.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
        element.style.transform = 'scale(1.02)';
        setTimeout(() => {
          element.style.background = '';
          element.style.transform = '';
        }, 500);
        break;
      case 'pulse':
        element.classList.add('pulse-animation');
        setTimeout(() => element.classList.remove('pulse-animation'), 1000);
        break;
      case 'shake':
        element.classList.add('shake-animation');
        setTimeout(() => element.classList.remove('shake-animation'), 600);
        break;
    }
  };

  // Load saved configurations on component mount
  useEffect(() => {
    const saved = localStorage.getItem('sitemapConfigurations');
    if (saved) {
      try {
        setSavedConfigurations(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved configurations:', error);
      }
    }
  }, []);

  // Enhanced parameter validation
  const validateParameters = () => {
    const warnings = [];
    
    if (visualParams.threshold < 0.01) {
      warnings.push('Very low threshold may cause too many false positives');
    }
    if (visualParams.captureDelay > 10000) {
      warnings.push('High capture delay may significantly slow down testing');
    }
    if (visualParams.viewports.length > 10) {
      warnings.push('Many viewports will increase testing time significantly');
    }
    if (visualParams.viewports.some(v => v.width > 3000 || v.height > 3000)) {
      warnings.push('Very large viewports may impact performance');
    }
    
    return warnings;
  };

  // Animation for configuration changes
  useEffect(() => {
    const configPanel = document.querySelector('.advanced-options-panel.enhanced');
    if (configPanel) {
      configPanel.style.opacity = '0';
      configPanel.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        configPanel.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        configPanel.style.opacity = '1';
        configPanel.style.transform = 'translateY(0)';
      });
    }
  }, [showAdvancedOptions]);

  return (
    <div className="sitemap-container">
      <div className="sitemap-testing-section">
        <h2>Sitemap Management</h2>
        <p>Upload and manage sitemaps in XML format for combined DOM and Visual testing.</p>
        
        <div className="sitemap-upload-container">
          <div className="sitemap-upload-section">
            <h3>Upload Sitemaps</h3>
            <p>Choose XML or text sitemap files for both testing and reference sites</p>
            
            <div className="upload-panels">
              <div className="upload-panel">
                <h4>Testing Site Sitemap</h4>
                <div className="file-upload-wrapper">
                  <input 
                    type="file" 
                    id="testing-sitemap" 
                    accept=".xml,.txt"
                    ref={testingSitemapRef}
                    onChange={(e) => handleFileUpload(e, 'testing')}
                  />
                  <label 
                    htmlFor="testing-sitemap" 
                    className="file-upload-label"
                    onClick={() => resetFileInput('testing')}
                  >
                    <i className="fas fa-upload"></i> Choose Testing Sitemap
                  </label>
                  <span className="file-name">
                    {testingSitemap.fileName || 'No file chosen'}
                  </span>
                  {testingSitemap.fileName && (
                    <div className="url-count">
                      <i className="fas fa-link"></i> {testingSitemap.urlCount} URLs
                    </div>
                  )}
                </div>
              </div>
              
              <div className="upload-panel">
                <h4>Reference Site Sitemap</h4>
                <div className="file-upload-wrapper">
                  <input 
                    type="file" 
                    id="reference-sitemap" 
                    accept=".xml,.txt"
                    ref={referenceSitemapRef}
                    onChange={(e) => handleFileUpload(e, 'reference')}
                  />
                  <label 
                    htmlFor="reference-sitemap" 
                    className="file-upload-label"
                    onClick={() => resetFileInput('reference')}
                  >
                    <i className="fas fa-upload"></i> Choose Reference Sitemap
                  </label>
                  <span className="file-name">
                    {referenceSitemap.fileName || 'No file chosen'}
                  </span>
                  {referenceSitemap.fileName && (
                    <div className="url-count">
                      <i className="fas fa-link"></i> {referenceSitemap.urlCount} URLs
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Visual Testing Options */}
            <div className="advanced-options-section">
              <button 
                className="advanced-toggle-button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <div className="toggle-button-content">
                  <div className="toggle-icon">
                    <i className={`fas fa-${showAdvancedOptions ? 'chevron-up' : 'chevron-down'}`}></i>
                  </div>
                  <div className="toggle-text">
                    <span className="toggle-title">Advanced Testing Options</span>
                    <span className="toggle-subtitle">
                      Configure visual testing parameters and viewports
                    </span>
                  </div>
                </div>
                <div className="toggle-badge">
                  <i className="fas fa-cog"></i>
                </div>
              </button>

              {showAdvancedOptions && (
                <div className="advanced-options-panel" ref={advancedOptionsRef}>
                  {/* Preset Configurations */}
                  <div className="preset-section">
                    <h4>
                      <i className="fas fa-magic"></i>
                      Quick Presets
                    </h4>
                    <div className="preset-buttons">
                      {Object.entries(presetConfigurations).map(([key, preset]) => (
                        <button
                          key={key}
                          className={`preset-btn ${currentPreset === key ? 'active' : ''}`}
                          data-preset={key}
                          onClick={() => applyPreset(key)}
                          title={preset.description}
                        >
                          <i className={preset.icon}></i>
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                    {configurationSaved && (
                      <div className="preset-success">
                        <i className="fas fa-check-circle"></i>
                        Configuration applied successfully!
                      </div>
                    )}
                  </div>

                  {/* Testing Parameters */}
                  <div className="parameters-section">
                    <h4>
                      <i className="fas fa-sliders-h"></i>
                      Testing Parameters
                    </h4>
                    
                    <div className="param-grid">
                      <div className="param-group">
                        <label>
                          Threshold (0-1)
                          <div className="tooltip">
                            <i className="fas fa-info-circle"></i>
                            <span className="tooltip-text">
                              Visual difference tolerance. Lower values = more strict comparison
                            </span>
                          </div>
                        </label>
                        <div className="input-with-slider">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={visualParams.threshold}
                            onChange={(e) => handleVisualParamChange('threshold', parseFloat(e.target.value))}
                            className="param-slider"
                          />
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={visualParams.threshold}
                            onChange={(e) => handleVisualParamChange('threshold', parseFloat(e.target.value))}
                            className="param-input"
                          />
                        </div>
                        <div className="param-description">
                          Current: {(visualParams.threshold * 100).toFixed(1)}% tolerance
                        </div>
                      </div>
                      
                      <div className="param-group">
                        <label>
                          Capture Delay (ms)
                          <div className="tooltip">
                            <i className="fas fa-info-circle"></i>
                            <span className="tooltip-text">
                              Time to wait before capturing screenshot (for animations/loading)
                            </span>
                          </div>
                        </label>
                        <div className="input-with-buttons">
                          <button 
                            type="button"
                            onClick={() => handleVisualParamChange('captureDelay', Math.max(0, visualParams.captureDelay - 500))}
                            className="adjust-btn"
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={visualParams.captureDelay}
                            onChange={(e) => handleVisualParamChange('captureDelay', parseInt(e.target.value))}
                            className="param-input"
                          />
                          <button 
                            type="button"
                            onClick={() => handleVisualParamChange('captureDelay', visualParams.captureDelay + 500)}
                            className="adjust-btn"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                        <div className="param-description">
                          {visualParams.captureDelay / 1000}s delay before capture
                        </div>
                      </div>
                    </div>

                    <div className="param-group full-width">
                      <label>
                        Hide Selectors
                        <div className="tooltip">
                          <i className="fas fa-info-circle"></i>
                          <span className="tooltip-text">
                            CSS selectors for elements to hide during testing (e.g., ads, dynamic content)
                          </span>
                        </div>
                      </label>
                      <div className="selector-input-container">
                        <input
                          type="text"
                          placeholder="e.g., .ad-banner, #dynamic-content, .popup"
                          value={visualParams.hideSelectors}
                          onChange={(e) => handleVisualParamChange('hideSelectors', e.target.value)}
                          className="selector-input"
                        />
                        <div className="selector-suggestions">
                          {selectorSuggestions.map(suggestion => (
                            <span 
                              key={suggestion.value}
                              className="suggestion-tag"
                              onClick={() => applySelectorSuggestion(suggestion.value)}
                            >
                              {suggestion.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Viewports Configuration */}
                  <div className="viewports-section">
                    <div className="section-header">
                      <h4>
                        <i className="fas fa-tv"></i>
                        Viewport Configuration
                      </h4>
                      <span className="viewport-count">{visualParams.viewports.length} viewport{visualParams.viewports.length !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="viewports-grid">
                      {visualParams.viewports.map((viewport, index) => (
                        <div key={index} className="viewport-card">
                          <div className="viewport-header">
                            <div className="viewport-icon">
                              <i className={`fas fa-${
                                viewport.width <= 480 ? 'mobile-alt' : 
                                viewport.width <= 768 ? 'tablet-alt' : 
                                'desktop'
                              }`}></i>
                            </div>
                            <div className="viewport-name-input">
                              <input
                                type="text"
                                placeholder="Viewport name"
                                value={viewport.name}
                                onChange={(e) => handleViewportChange(index, 'name', e.target.value)}
                                className="viewport-name"
                              />
                            </div>
                            {visualParams.viewports.length > 1 && (
                              <button
                                className="remove-viewport-btn"
                                onClick={() => removeViewport(index)}
                                title="Remove viewport"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                          </div>
                          
                          <div className="viewport-dimensions">
                            <div className="dimension-group">
                              <label>Width</label>
                              <input
                                type="number"
                                placeholder="1920"
                                value={viewport.width}
                                onChange={(e) => handleViewportChange(index, 'width', e.target.value)}
                                className="dimension-input"
                              />
                              <span className="dimension-unit">px</span>
                            </div>
                            <div className="dimension-separator">×</div>
                            <div className="dimension-group">
                              <label>Height</label>
                              <input
                                type="number"
                                placeholder="1080"
                                value={viewport.height}
                                onChange={(e) => handleViewportChange(index, 'height', e.target.value)}
                                className="dimension-input"
                              />
                              <span className="dimension-unit">px</span>
                            </div>
                          </div>
                          
                          <div className="viewport-preview">
                            <div className="aspect-ratio-indicator">
                              Aspect ratio: {(viewport.width / viewport.height).toFixed(2)}:1
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Add missing default viewports */}
                    <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
                      {defaultViewports.filter(
                        dv => !visualParams.viewports.some(v => v.name.toLowerCase() === dv.name)
                      ).map((dv) => (
                        <button
                          key={dv.name}
                          className="add-viewport-btn"
                          style={{ maxWidth: 180 }}
                          onClick={() => setVisualParams(prev => ({
                            ...prev,
                            viewports: [...prev.viewports, { ...dv }]
                          }))}
                        >
                          <i className={`fas fa-${dv.name === 'desktop' ? 'desktop' : dv.name === 'tablet' ? 'tablet-alt' : 'mobile-alt'}`}></i>
                          Add {dv.name.charAt(0).toUpperCase() + dv.name.slice(1)}
                        </button>
                      ))}
                      <button className="add-viewport-btn" onClick={addViewport}>
                        <i className="fas fa-plus"></i>
                        Add Custom Viewport
                      </button>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="configuration-summary">
                    <h5>
                      <i className="fas fa-clipboard-list"></i>
                      Test Configuration Summary
                    </h5>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Threshold:</span>
                        <span className="summary-value">{(visualParams.threshold * 100).toFixed(1)}%</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Delay:</span>
                        <span className="summary-value">{visualParams.captureDelay}ms</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Viewports:</span>
                        <span className="summary-value">{visualParams.viewports.length}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Hidden elements:</span>
                        <span className="summary-value">
                          {visualParams.hideSelectors ? visualParams.hideSelectors.split(',').length : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                className="secondary-button"
                onClick={toggleUrlInputs}
              >
                <i className={`fas fa-${showUrlInputs ? 'minus' : 'plus'}-circle`}></i>
                {showUrlInputs ? 'Hide URL Inputs' : 'Generate from URLs'}
              </button>
              <button 
                className="primary-button"
                onClick={handleStartTesting}
                disabled={!testingSitemap.content || !referenceSitemap.content || isRunningTests}
              >
                <i className={`fas fa-${isRunningTests ? 'spinner fa-spin' : 'play'}`}></i> 
                {isRunningTests ? 'Running Tests...' : 'Start Combined Testing'}
              </button>
            </div>

            {/* URL Input Section */}
            {showUrlInputs && (
              <div className="url-input-section">
                <h4>Generate Sitemaps from URLs</h4>
                <p>Enter URLs separated by commas, or one per line</p>

                <div className="url-input-container">
                  <div className="form-group">
                    <label>Testing Site URLs</label>
                    <textarea 
                      placeholder="Enter URLs, e.g.:
https://test.example.com/page1,
https://test.example.com/page2,
https://test.example.com/page3"
                      value={testingUrls}
                      onChange={handleTestingUrlsChange}
                    ></textarea>
                    <button 
                      className={`url-generate-btn ${generatingTestingSitemap ? 'generating' : ''}`}
                      onClick={() => {
                        setGeneratingTestingSitemap(true);
                        generateSitemapFromUrls(testingUrls, 'testing');
                      }}
                      disabled={generatingTestingSitemap}
                    >
                      {generatingTestingSitemap ? 'Generating...' : 'Generate Testing Sitemap'}
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Reference Site URLs</label>
                    <textarea 
                      placeholder="Enter URLs, e.g.:
https://reference.example.com/page1,
https://reference.example.com/page2,
https://reference.example.com/page3"
                      value={referenceUrls}
                      onChange={handleReferenceUrlsChange}
                    ></textarea>
                    <button 
                      className={`url-generate-btn ${generatingReferenceSitemap ? 'generating' : ''}`}
                      onClick={() => {
                        setGeneratingReferenceSitemap(true);
                        generateSitemapFromUrls(referenceUrls, 'reference');
                      }}
                      disabled={generatingReferenceSitemap}
                    >
                      {generatingReferenceSitemap ? 'Generating...' : 'Generate Reference Sitemap'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="sitemap-preview-container">
            <h3>Sitemap Preview</h3>
            <div className="preview-panels">
              <div className="preview-panel">
                <h4>Testing Site</h4>
                {testingSitemap.content ? (
                  <>
                    <div className="url-count-display">
                      <i className="fas fa-link"></i> {testingSitemap.urlCount} URLs
                    </div>
                    <div className="sitemap-content">
                      {testingSitemap.content.substring(0, 500)}
                      {testingSitemap.content.length > 500 ? '...' : ''}
                    </div>
                  </>
                ) : (
                  <div className="empty-preview">
                    <i className="fas fa-sitemap"></i>
                    <p>No sitemap uploaded</p>
                  </div>
                )}
              </div>
              
              <div className="preview-panel">
                <h4>Reference Site</h4>
                {referenceSitemap.content ? (
                  <>
                    <div className="url-count-display">
                      <i className="fas fa-link"></i> {referenceSitemap.urlCount} URLs
                    </div>
                    <div className="sitemap-content">
                      {referenceSitemap.content.substring(0, 500)}
                      {referenceSitemap.content.length > 500 ? '...' : ''}
                    </div>
                  </>
                ) : (
                  <div className="empty-preview">
                    <i className="fas fa-sitemap"></i>
                    <p>No sitemap uploaded</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="status-info">
              <div className="status-indicator">
                <i className={`fas fa-${(!testingSitemap.content || !referenceSitemap.content) ? 'exclamation-triangle' : 'check-circle'}`}></i>
                <span>
                  {(!testingSitemap.content || !referenceSitemap.content) 
                    ? 'Upload both sitemaps to enable combined testing' 
                    : `Ready to test ${testingSitemap.urlCount + referenceSitemap.urlCount} URLs with DOM and Visual testing`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Advanced Options Section - moved outside and simplified */}
      {showAdvancedOptions && (
        <div className="advanced-options-panel enhanced" ref={advancedOptionsRef}>
          {/* Configuration Management */}
          <div className="config-management-section">
            <div className="section-header">
              <h4><i className="fas fa-cogs"></i> Configuration Management</h4>
              <div className="config-actions">
                <button 
                  className="btn-sm btn-outline"
                  onClick={() => setShowConfigExport(true)}
                  title="Export current configuration"
                >
                  <i className="fas fa-download"></i> Export
                </button>
                <button 
                  className="btn-sm btn-outline"
                  onClick={() => setShowConfigImport(true)}
                  title="Import configuration from file"
                >
                  <i className="fas fa-upload"></i> Import
                </button>
                <button 
                  className="btn-sm btn-primary"
                  onClick={() => {
                    const name = prompt('Enter configuration name:');
                    if (name) {
                      setConfigurationName(name);
                      saveCurrentConfiguration();
                    }
                  }}
                  title="Save current configuration"
                >
                  <i className="fas fa-save"></i> Save
                </button>
              </div>
            </div>

            {/* Saved Configurations */}
            {savedConfigurations.length > 0 && (
              <div className="saved-configurations">
                <h5>Saved Configurations</h5>
                <div className="saved-config-grid">
                  {savedConfigurations.map(config => (
                    <div key={config.id} className="saved-config-card">
                      <div className="config-info">
                        <h6>{config.name}</h6>
                        <span className="config-date">
                          {new Date(config.timestamp).toLocaleDateString()}
                        </span>
                        <span className="config-preset">{config.preset}</span>
                      </div>
                      <div className="config-actions">
                        <button 
                          className="btn-xs btn-primary"
                          onClick={() => loadSavedConfiguration(config)}
                          title="Load this configuration"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button 
                          className="btn-xs btn-danger"
                          onClick={() => deleteSavedConfiguration(config.id)}
                          title="Delete this configuration"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Performance Metrics Display */}
          <div className="performance-section">
            <h4><i className="fas fa-tachometer-alt"></i> Performance Estimation</h4>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="performance-label">Estimated Duration:</span>
                <span className="performance-value">{getTestEstimation().estimatedTime}min</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Total Screenshots:</span>
                <span className="performance-value">{getTestEstimation().totalScreenshots}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">URLs to Test:</span>
                <span className="performance-value">{getTestEstimation().urls}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Viewports:</span>
                <span className="performance-value">{getTestEstimation().viewports}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Export Modal */}
      {showConfigExport && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Export Configuration</h3>
              <button onClick={() => setShowConfigExport(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <label>Configuration Name:</label>
              <input
                type="text"
                value={configurationName}
                onChange={(e) => setConfigurationName(e.target.value)}
                placeholder="Enter configuration name"
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfigExport(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={exportConfiguration}>
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Import Modal */}
      {showConfigImport && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Import Configuration</h3>
              <button onClick={() => setShowConfigImport(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <label>Select Configuration File:</label>
              <input
                type="file"
                accept=".json"
                ref={configImportRef}
                onChange={importConfiguration}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfigImport(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isRunningTests && (
        <div className="dom-test-loader">
          <div className="spinner"></div>
          <div className="loader-text">Combined Testing is running...</div>
        </div>
      )}
      {modal.open && (
        <div className={`custom-modal ${modal.type}`}>
          <div className="modal-content">
            <span className="modal-icon">{modal.type === 'success' ? '✔️' : '❌'}</span>
            <div className="modal-message">{modal.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sitemap;