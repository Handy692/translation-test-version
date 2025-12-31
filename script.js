// 全局变量
let currentMode = '';
let sentences = [];
let currentSentenceIndex = 0;
let startTime = null;
let timerInterval = null;
let userTranslations = [];
let selectedPassages = []; // 存储已选择过的文章索引
let currentPassageIndex = 0;
let passages = [
    // 默认测试文章 1
    "这是第一篇测试文章的内容。这篇文章包含多个句子，用于测试分句练习模式和PDF生成功能。\n\n今天天气很好，阳光明媚，适合外出活动。\n\n学习英语翻译需要不断练习，掌握词汇和语法知识。\n\n通过翻译练习，可以提高语言表达能力和跨文化交流能力。\n\n希望这篇测试文章能够帮助您了解应用的功能和使用方法。",
    // 默认测试文章 2
    "这是第二篇测试文章的内容，用于测试整篇练习模式。\n\n这篇文章的内容更长，包含更多的段落和句子结构。\n\n在整篇练习模式下，用户需要一次性翻译完整的文章。\n\n这种模式可以帮助用户提高整体翻译能力和上下文理解能力。\n\n通过不断练习，可以逐渐掌握翻译技巧，提高翻译质量。\n\n这篇文章的内容涵盖了不同的主题和语言结构，适合进行全面的翻译练习。\n\n希望您能够通过这篇文章的练习，提高自己的翻译水平和语言能力。"
];

// 翻译历史数据存储模块
const TranslationHistory = {
    // 存储键名
    STORAGE_KEYS: {
        VERSIONS: 'translationHistoryVersions',
        FILES: 'translationHistoryFiles'
    },
    
    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // 获取历史版本数据
    getHistoryVersions() {
        try {
            const versions = localStorage.getItem(this.STORAGE_KEYS.VERSIONS);
            return versions ? JSON.parse(versions) : [];
        } catch (error) {
            console.error('Error getting history versions:', error);
            return [];
        }
    },
    
    // 保存历史版本数据
    saveHistoryVersions(versions) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.VERSIONS, JSON.stringify(versions));
            return true;
        } catch (error) {
            console.error('Error saving history versions:', error);
            return false;
        }
    },
    
    // 添加历史版本
    addHistoryVersion(versionData) {
        const versions = this.getHistoryVersions();
        const newVersion = {
            id: this.generateId(),
            timestamp: Date.now(),
            ...versionData
        };
        versions.push(newVersion);
        return this.saveHistoryVersions(versions);
    },
    
    // 删除历史版本
    deleteHistoryVersion(versionId) {
        const versions = this.getHistoryVersions();
        const updatedVersions = versions.filter(v => v.id !== versionId);
        return this.saveHistoryVersions(updatedVersions);
    },
    
    // 清空所有历史版本
    clearAllHistoryVersions() {
        return this.saveHistoryVersions([]);
    },
    
    // 获取历史文件数据
    getHistoryFiles() {
        try {
            const files = localStorage.getItem(this.STORAGE_KEYS.FILES);
            return files ? JSON.parse(files) : [];
        } catch (error) {
            console.error('Error getting history files:', error);
            return [];
        }
    },
    
    // 保存历史文件数据
    saveHistoryFiles(files) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.FILES, JSON.stringify(files));
            return true;
        } catch (error) {
            console.error('Error saving history files:', error);
            return false;
        }
    },
    
    // 添加历史文件
    addHistoryFile(fileData) {
        const files = this.getHistoryFiles();
        const newFile = {
            id: this.generateId(),
            timestamp: Date.now(),
            ...fileData
        };
        files.push(newFile);
        return this.saveHistoryFiles(files);
    },
    
    // 删除历史文件
    deleteHistoryFile(fileId) {
        const files = this.getHistoryFiles();
        const updatedFiles = files.filter(f => f.id !== fileId);
        return this.saveHistoryFiles(updatedFiles);
    },
    
    // 清空所有历史文件
    clearAllHistoryFiles() {
        return this.saveHistoryFiles([]);
    },
    
    // 导出历史数据
    exportHistoryData() {
        return {
            versions: this.getHistoryVersions(),
            files: this.getHistoryFiles(),
            exportDate: new Date().toISOString()
        };
    },
    
    // 导入历史数据
    importHistoryData(historyData) {
        if (historyData.versions && Array.isArray(historyData.versions)) {
            this.saveHistoryVersions(historyData.versions);
        }
        
        if (historyData.files && Array.isArray(historyData.files)) {
            this.saveHistoryFiles(historyData.files);
        }
        
        return true;
    }
};

// 文本切分相关变量
let sentenceSplits = null; // 存储两种切分规则的结果
let currentSplitType = 'byLine'; // 当前使用的切分类型（byLine或byPeriod）
let shouldShowMenu = false; // 是否需要显示下拉菜单

// DOM元素
const uploadSection = document.getElementById('upload-section');
const passageSelection = document.getElementById('passage-selection');
const modeSelection = document.getElementById('mode-selection');
const sentencePractice = document.getElementById('sentence-practice');
const passagePractice = document.getElementById('passage-practice');
const resultSection = document.getElementById('result-section');

const wordFile = document.getElementById('word-file');
const uploadBtn = document.getElementById('upload-btn');
const passageList = document.getElementById('passage-list');
const sentenceModeBtn = document.getElementById('sentence-mode-btn');
const passageModeBtn = document.getElementById('passage-mode-btn');
const englishInput = document.getElementById('english-input');
const passageInput = document.getElementById('passage-input');
const backToSelectBtn = document.getElementById('back-to-select');
const uploadNewBtn = document.getElementById('upload-new');
const backToPassageBtn = document.getElementById('back-to-passage');

// 下拉菜单相关DOM元素
const sentenceModeDropdown = document.getElementById('sentence-mode-dropdown');
const dropdownOptions = document.querySelectorAll('.dropdown-option');

// 练习模式选择相关DOM元素
const practiceModeSelector = document.getElementById('practice-mode-selector');
const practiceModeSelect = document.getElementById('practice-mode');

// 导航按钮
const prevSentenceBtn = document.getElementById('prev-sentence-btn');
const nextSentenceBtn = document.getElementById('next-sentence-btn');
const completeTranslationBtn = document.getElementById('complete-translation-btn');
const passageCompleteBtn = document.getElementById('passage-complete-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const wordbookBtn = document.getElementById('wordbook-btn');

// DeepSeek API 相关元素
const deepseekApiKey = document.getElementById('deepseek-api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');

// 单词本相关元素 - 只保留必要的元素
const totalWordsEl = document.getElementById('total-words');

// 全局变量 - 单词本
let wordbook = JSON.parse(localStorage.getItem('wordbook')) || [];
let selectedText = '';
let selectedWordData = null;
let currentView = 'main';

const timer = document.getElementById('timer');
const currentChinese = document.getElementById('current-chinese');
const currentSentenceEl = document.getElementById('current-sentence');
const totalSentencesEl = document.getElementById('total-sentences');
const chinesePassage = document.getElementById('chinese-passage');

const resultTime = document.getElementById('result-time');
const resultScore = document.getElementById('result-score');
const grammarErrors = document.getElementById('grammar-errors');
const translatedText = document.getElementById('translated-text');

// 状态管理
let appState = {
    passages: [],
    currentPassageIndex: 0,
    sentenceSplits: null,
    currentSplitType: 'byLine',
    shouldShowMenu: false,
    selectedPassages: [],
    userTranslations: [],
    currentSentenceIndex: 0
};

// 保存状态到localStorage
function saveAppState() {
    try {
        localStorage.setItem('appState', JSON.stringify(appState));
        console.log('状态保存成功');
    } catch (error) {
        console.error('状态保存失败:', error);
        alert('状态保存失败，请检查浏览器存储设置\n\n错误详情:\n' + error.message);
    }
}

// 从localStorage加载状态
function loadAppState() {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
        appState = JSON.parse(savedState);
        passages = appState.passages;
        currentPassageIndex = appState.currentPassageIndex;
        sentenceSplits = appState.sentenceSplits;
        currentSplitType = appState.currentSplitType;
        shouldShowMenu = appState.shouldShowMenu;
        selectedPassages = appState.selectedPassages;
        userTranslations = appState.userTranslations;
        currentSentenceIndex = appState.currentSentenceIndex;
        currentMode = appState.currentMode || '';
    }
}

// 初始化状态
loadAppState();

// 初始化事件监听器
function initEventListeners() {
    // 主题切换相关事件监听
    initThemeToggle();
    
    // 条件性添加事件监听器，确保元素存在
    if (uploadBtn) uploadBtn.addEventListener('click', handleFileUpload);
    if (sentenceModeBtn) sentenceModeBtn.addEventListener('click', startSentenceMode);
    if (passageModeBtn) passageModeBtn.addEventListener('click', startPassageMode);
    if (backToSelectBtn) backToSelectBtn.addEventListener('click', backToSelection);
    if (backToPassageBtn) backToPassageBtn.addEventListener('click', backToPassageSelection);
    if (uploadNewBtn) uploadNewBtn.addEventListener('click', uploadNewFile);
    if (englishInput) englishInput.addEventListener('keypress', handleSentenceInput);
    if (englishInput) englishInput.addEventListener('keydown', handleSentenceKeyDown);
    if (passageInput) passageInput.addEventListener('keypress', handlePassageInput);
    
    // 练习模式切换事件监听
    if (practiceModeSelect) practiceModeSelect.addEventListener('change', handlePracticeModeChange);
    
    // 导航按钮事件监听
    if (prevSentenceBtn) prevSentenceBtn.addEventListener('click', handlePrevSentence);
    if (nextSentenceBtn) nextSentenceBtn.addEventListener('click', handleNextSentence);
    if (completeTranslationBtn) completeTranslationBtn.addEventListener('click', handleCompleteTranslation);
    if (passageCompleteBtn) passageCompleteBtn.addEventListener('click', handleCompleteTranslation);
    if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', handleDownloadPdf);
    
    // DeepSeek API 相关事件监听
    if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);
    
    // 日志面板切换按钮事件监听
    const toggleLogBtn = document.getElementById('toggle-log-btn');
    if (toggleLogBtn) {
        // 移除旧的事件监听器，避免重复添加
        toggleLogBtn.removeEventListener('click', toggleLogPanel);
        toggleLogBtn.addEventListener('click', toggleLogPanel);
    }
    
    // 下拉菜单事件监听
    const dropdownOptions = document.querySelectorAll('.dropdown-option');
    dropdownOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 检查当前是否在模式选择页面，如果不是则不执行任何操作
            const modeSelection = document.getElementById('mode-selection');
            if (!modeSelection || !modeSelection.classList.contains('active')) {
                return;
            }
            
            // 设置当前切分类型
            currentSplitType = this.dataset.mode;
            // 更新练习模式选择器
            if (practiceModeSelect) practiceModeSelect.value = currentSplitType;
            // 启动分句练习模式
            startSentenceMode();
        });
    });
}

// 处理练习模式切换
function handlePracticeModeChange() {
    if (!practiceModeSelect) return;
    currentSplitType = practiceModeSelect.value;
    
    // 切换到新的切分结果
    sentences = sentenceSplits[currentSplitType];
    
    // 重置当前句子索引和用户翻译
    currentSentenceIndex = 0;
    userTranslations = [];
    
    // 更新当前显示的句子和进度
    updateCurrentSentence();
}

// 显示文章选择界面
function showPassageSelection() {
    passageList.innerHTML = '';
    
    // 创建随机选择按钮
    const randomSelectBtn = document.createElement('button');
    randomSelectBtn.id = 'random-select-btn';
    randomSelectBtn.className = 'select-passage-btn random-btn';
    randomSelectBtn.textContent = '随机选择';
    randomSelectBtn.title = '随机选择一篇未被选择过的文章';
    
    // 检查是否有文章可选择
    if (passages.length === 0) {
        randomSelectBtn.disabled = true;
        randomSelectBtn.title = '无可用文章';
    } else {
        randomSelectBtn.disabled = false;
        // 检查是否所有文章都已被选择
        const unselectedPassages = passages.filter((_, index) => !selectedPassages.includes(index));
        if (unselectedPassages.length === 0) {
            randomSelectBtn.disabled = false; // 允许用户再次随机选择已选过的文章
        }
    }
    
    // 添加随机选择按钮到文章列表容器
    passageList.appendChild(randomSelectBtn);
    
    // 动态生成文章列表
    passages.forEach((passage, index) => {
        const passageItem = document.createElement('div');
        passageItem.className = 'passage-item';
        passageItem.innerHTML = `
            <h3>文章 ${index + 1}</h3>
            <p class="passage-preview">${passage.substring(0, 100)}${passage.length > 100 ? '...' : ''}</p>
            <button class="select-passage-btn" data-index="${index}">选择这篇文章</button>
        `;
        passageList.appendChild(passageItem);
    });
    
    // 添加事件监听器
    const selectButtons = document.querySelectorAll('.select-passage-btn');
    selectButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.id === 'random-select-btn') {
                randomSelectPassage();
            } else {
                const index = parseInt(this.getAttribute('data-index'));
                selectPassage(index);
            }
        });
    });
    
    // 保存状态
    appState.passages = passages;
    saveAppState();
    
    // 如果当前页面是上传页面，则跳转到文档选择页面
    if (window.location.pathname.endsWith('1_upload.html')) {
        if (window.PageTransition) {
            PageTransition.transitionTo('2_document_selection.html');
        } else {
            window.location.href = '2_document_selection.html';
        }
    } else {
        // 显示文章选择区域
        showSection(passageSelection);
    }
}

// 选择文章
function selectPassage(index) {
    currentPassageIndex = index;
    // 保存两种切分规则的结果
    sentenceSplits = splitChineseSentences(passages[index]);
    
    // 重置切分类型
    currentSplitType = 'byLine';
    
    // 规则优先级判断逻辑
    // 检查是否同时满足两种切分规则
    shouldShowMenu = false;
    
    // 条件1: 两种切分结果都不为空
    const bothHaveSentences = sentenceSplits.byLine.length > 0 && sentenceSplits.byPeriod.length > 0;
    
    // 条件2: 两种切分结果不同
    const resultsDifferent = JSON.stringify(sentenceSplits.byLine) !== JSON.stringify(sentenceSplits.byPeriod);
    
    // 条件3: 按句号切分的结果长度大于1（避免只有一个句子的情况）
    const periodHasMultipleSentences = sentenceSplits.byPeriod.length > 1;
    
    if (bothHaveSentences && resultsDifferent && periodHasMultipleSentences) {
        shouldShowMenu = true;
    }
    
    // 初始使用按换行切分的结果
    sentences = sentenceSplits[currentSplitType];
    
    // 将当前文章索引添加到已选择数组（如果尚未存在）
    if (!selectedPassages.includes(index)) {
        selectedPassages.push(index);
    }
    
    // 保存状态
    appState.currentPassageIndex = currentPassageIndex;
    appState.sentenceSplits = sentenceSplits;
    appState.currentSplitType = currentSplitType;
    appState.shouldShowMenu = shouldShowMenu;
    appState.selectedPassages = selectedPassages;
    appState.sentences = sentences;
    saveAppState();
    
    // 如果当前页面是文档选择页面，则跳转到模式选择页面
    if (window.location.pathname.endsWith('2_document_selection.html')) {
        if (window.PageTransition) {
            PageTransition.transitionTo('3_mode_selection.html');
        } else {
            window.location.href = '3_mode_selection.html';
        }
    } else {
        // 显示模式选择
        showSection(modeSelection);
        hideSection(passageSelection);
    }
}

// 返回文章选择
function backToPassageSelection() {
    // 如果当前页面是模式选择页面，则跳转到文档选择页面
    if (window.location.pathname.endsWith('3_mode_selection.html')) {
        if (window.PageTransition) {
            PageTransition.transitionTo('2_document_selection.html');
        } else {
            window.location.href = '2_document_selection.html';
        }
    } else {
        showSection(passageSelection);
        hideSection(modeSelection);
    }
}

// 随机选择文章
function randomSelectPassage() {
    // 检查是否有文章可选择
    if (passages.length === 0) {
        alert('无可用文章');
        return;
    }
    
    // 获取未被选择过的文章索引
    const unselectedIndices = [];
    for (let i = 0; i < passages.length; i++) {
        if (!selectedPassages.includes(i)) {
            unselectedIndices.push(i);
        }
    }
    
    let randomIndex;
    if (unselectedIndices.length > 0) {
        // 从未被选择的文章中随机选择
        randomIndex = unselectedIndices[Math.floor(Math.random() * unselectedIndices.length)];
    } else {
        // 如果所有文章都已被选择，提示用户并允许从所有文章中随机选择
        alert('所有文章均已被选择，将从已选择的文章中重新随机选择');
        randomIndex = Math.floor(Math.random() * passages.length);
    }
    
    // 调用selectPassage函数选择文章
    selectPassage(randomIndex);
}

// 处理文件上传
function handleFileUpload() {
    const file = wordFile.files[0];
    if (!file) {
        alert('请先选择一个Word文件');
        return;
    }

    if (file.name.endsWith('.docx')) {
        parseDocxFile(file);
    } else if (file.name.endsWith('.doc')) {
        alert('暂不支持旧版.doc格式，请使用.docx格式');
    } else {
        alert('请上传Word文件（.docx格式）');
    }
}



// 解析.docx文件
function parseDocxFile(file) {
    console.log('开始解析文件:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('文件读取完成');
        const arrayBuffer = e.target.result;
        
        // 使用JSZip和docx.js解析文件
        JSZip.loadAsync(arrayBuffer).then(function(zip) {
            console.log('JSZip加载完成');
            return zip.file('word/document.xml').async('text');
        }).then(function(xmlContent) {
            console.log('获取document.xml成功');
            const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
            
            // 改进的解析逻辑，保留换行和段落
            let fullText = '';
            const paragraphs = doc.getElementsByTagName('w:p');
            console.log('找到段落数量:', paragraphs.length);
            
            for (let i = 0; i < paragraphs.length; i++) {
                const paragraph = paragraphs[i];
                const textNodes = paragraph.getElementsByTagName('w:t');
                
                let paragraphText = '';
                for (let j = 0; j < textNodes.length; j++) {
                    paragraphText += textNodes[j].textContent;
                }
                
                // 检查是否有换行符
                const brNodes = paragraph.getElementsByTagName('w:br');
                if (brNodes.length > 0) {
                    // 有换行符，保留原始格式
                    paragraphText += '\n';
                }
                
                if (paragraphText.trim()) {
                    fullText += paragraphText + '\n';
                }
            }
            
            console.log('提取到的文本:', fullText);
            
            // 按Passage分割文章
            passages = splitByPassage(fullText);
            console.log('分割后的文章数量:', passages.length);
            if (passages.length === 0) {
                alert('未检测到有效文章，请确保文档包含Passage标记');
                return;
            }
            
            // 保存状态
            appState.passages = passages;
            console.log('准备保存状态:', appState);
            saveAppState();
            console.log('状态保存成功');
            
            // 保存历史文件记录
            const historyFileData = {
                filename: file.name,
                description: `导入了${passages.length}篇文章`,
                content: passages,
                fileType: 'docx'
            };
            TranslationHistory.addHistoryFile(historyFileData);
            
            // 跳转到文档选择页面
            console.log('准备跳转到文档选择页面');
            if (window.PageTransition) {
                PageTransition.transitionTo('2_document_selection.html');
            } else {
                window.location.href = '2_document_selection.html';
            }
        }).catch(function(error) {
            console.error('解析文件出错:', error);
            alert('解析文件出错，请检查文件格式\n\n错误详情:\n' + error.message);
        });
    };
    reader.readAsArrayBuffer(file);
}

// 按Passage分割文章
function splitByPassage(text) {
    const passageRegex = /Passage\s*\d+/gi;
    const passageList = [];
    let lastIndex = 0;
    let match;
    
    const passageMatches = [];
    while ((match = passageRegex.exec(text)) !== null) {
        passageMatches.push({ index: match.index, text: match[0] });
    }
    
    if (passageMatches.length === 0) {
        return [text.trim()];
    }
    
    for (let i = 0; i < passageMatches.length; i++) {
        const currentMatch = passageMatches[i];
        const nextMatch = passageMatches[i + 1];
        
        const startIndex = currentMatch.index + currentMatch.text.length;
        
        let passageText;
        if (nextMatch) {
            passageText = text.slice(startIndex, nextMatch.index).trim();
        } else {
            passageText = text.slice(startIndex).trim();
        }
        
        if (passageText) {
            passageList.push(passageText);
        }
    }
    
    return passageList;
}

// 中文分句函数（支持按换行和按句号两种切分规则）
function splitChineseSentences(text) {
    // 按换行符分割句子（原有规则）
    const lines = text.split('\n');
    let byLineSentences = [];
    
    for (let line of lines) {
        line = line.trim();
        if (line) {
            byLineSentences.push(line);
        }
    }
    
    // 按句号分割句子（新增规则）
    const byPeriodSentences = [];
    let tempSentence = '';
    
    for (let char of text) {
        tempSentence += char;
        if (char === '。') {
            tempSentence = tempSentence.trim();
            if (tempSentence) {
                byPeriodSentences.push(tempSentence);
                tempSentence = '';
            }
        }
    }
    
    // 处理最后一个没有句号结尾的句子
    tempSentence = tempSentence.trim();
    if (tempSentence) {
        byPeriodSentences.push(tempSentence);
    }
    
    // 返回两种切分结果
    return {
        byLine: byLineSentences,
        byPeriod: byPeriodSentences
    };
}

// 测试函数（开发时使用）
function testSplitChineseSentences() {
    // 测试用例1: 同时包含换行和句号
    const text1 = "这是第一行。这是第二行\n这是第三行。这是第四行";
    console.log("测试用例1:", text1);
    console.log("结果:", splitChineseSentences(text1));
    
    // 测试用例2: 只包含句号，没有换行
    const text2 = "这是一个句子。这是第二个句子。这是第三个句子";
    console.log("\n测试用例2:", text2);
    console.log("结果:", splitChineseSentences(text2));
    
    // 测试用例3: 只包含换行，没有句号
    const text3 = "这是第一行\n这是第二行\n这是第三行";
    console.log("\n测试用例3:", text3);
    console.log("结果:", splitChineseSentences(text3));
    
    // 测试用例4: 既没有换行也没有句号
    const text4 = "这是一个没有分隔符的长句子";
    console.log("\n测试用例4:", text4);
    console.log("结果:", splitChineseSentences(text4));
    
    // 测试用例5: 包含多个连续句号
    const text5 = "这是第一个句子。。这是第二个句子。。。这是第三个句子";
    console.log("\n测试用例5:", text5);
    console.log("结果:", splitChineseSentences(text5));
    
    // 测试用例6: 包含空行和句号
    const text6 = "这是第一行。\n\n这是第二行。\n这是第三行";
    console.log("\n测试用例6:", text6);
    console.log("结果:", splitChineseSentences(text6));
}

// 开发时调用测试函数
// testSplitChineseSentences();

// 开始分句练习
function startSentenceMode() {
    currentMode = 'sentence';
    currentSentenceIndex = 0;
    userTranslations = [];
    
    // 根据shouldShowMenu决定是否显示下拉菜单
    if (practiceModeSelector) {
        if (shouldShowMenu) {
            practiceModeSelector.classList.remove('hidden');
        } else {
            practiceModeSelector.classList.add('hidden');
            // 如果不显示菜单，检查是否只满足句号切分规则
            if (sentenceSplits.byPeriod.length > 0 && sentenceSplits.byLine.length === 0) {
                currentSplitType = 'byPeriod';
            }
        }
    } else {
        // 如果practiceModeSelector不存在，直接检查是否只满足句号切分规则
        if (shouldShowMenu === false && sentenceSplits.byPeriod.length > 0 && sentenceSplits.byLine.length === 0) {
            currentSplitType = 'byPeriod';
        }
    }
    
    // 无论shouldShowMenu的值是什么，都根据当前的currentSplitType更新sentences数组
    sentences = sentenceSplits[currentSplitType];
    
    // 保存状态
    appState.currentMode = currentMode;
    appState.userTranslations = userTranslations;
    appState.currentSentenceIndex = currentSentenceIndex;
    appState.sentences = sentences;
    saveAppState();
    
    // 如果当前页面是模式选择页面，则跳转到分句练习页面
    if (window.location.pathname.endsWith('3_mode_selection.html')) {
        if (window.PageTransition) {
            PageTransition.transitionTo('4_sentence_practice.html');
        } else {
            window.location.href = '4_sentence_practice.html';
        }
    } else {
        // 设置当前句子
        updateCurrentSentence();
        
        // 显示练习区域
        showSection(sentencePractice);
        hideSection(modeSelection);
        
        // 开始计时
        startTimer();
        
        // 聚焦输入框
        englishInput.focus();
    }
}

// 更新当前句子
function updateCurrentSentence() {
    if (currentSentenceIndex < sentences.length) {
        currentChinese.textContent = sentences[currentSentenceIndex];
        currentSentenceEl.textContent = currentSentenceIndex + 1;
        totalSentencesEl.textContent = sentences.length;
        englishInput.value = userTranslations[currentSentenceIndex] || '';
    }
}

// 处理上一句按钮点击
function handlePrevSentence() {
    if (currentMode === 'sentence' && currentSentenceIndex > 0) {
        // 保存当前句子的翻译
        const currentTranslation = englishInput.value.trim();
        if (currentTranslation) {
            userTranslations[currentSentenceIndex] = currentTranslation;
        }
        
        // 切换到上一句
        currentSentenceIndex--;
        updateCurrentSentence();
        englishInput.focus();
    }
}

// 处理下一句按钮点击
function handleNextSentence() {
    if (currentMode === 'sentence' && currentSentenceIndex < sentences.length - 1) {
        // 保存当前句子的翻译
        const currentTranslation = englishInput.value.trim();
        if (currentTranslation) {
            userTranslations[currentSentenceIndex] = currentTranslation;
        }
        
        // 切换到下一句
        currentSentenceIndex++;
        updateCurrentSentence();
        englishInput.focus();
    }
}

// 处理完成翻译按钮点击
async function handleCompleteTranslation() {
    if (currentMode === 'sentence') {
        // 保存当前句子的翻译
        const currentTranslation = englishInput.value.trim();
        if (currentTranslation) {
            userTranslations[currentSentenceIndex] = currentTranslation;
        }
    } else if (currentMode === 'passage') {
        // 保存整篇翻译
        const translation = passageInput.value.trim();
        if (translation) {
            userTranslations = [translation];
        }
    }
    
    // 保存翻译历史版本
    const evaluationResult = JSON.parse(localStorage.getItem('evaluationResult'));
    const historyVersionData = {
        filename: `Passage ${currentPassageIndex + 1}`,
        description: `${currentMode === 'sentence' ? '分句' : '整篇'}翻译完成`,
        passageIndex: currentPassageIndex,
        passageContent: passages[currentPassageIndex],
        translations: userTranslations,
        mode: currentMode,
        timestamp: Date.now(),
        score: evaluationResult ? evaluationResult.score : null,
        timeString: evaluationResult ? evaluationResult.timeString : null,
        aiEvaluation: evaluationResult ? evaluationResult.aiEvaluationText : null,
        detailedErrors: evaluationResult ? evaluationResult.detailedErrors : null
    };
    TranslationHistory.addHistoryVersion(historyVersionData);
    
    // 完成练习并显示结果
    await endPractice();
}

// 获取翻译次数
function getTranslationCount() {
    const key = `translation_count_${currentPassageIndex}`;
    let count = localStorage.getItem(key);
    if (!count) {
        count = '1';
    } else {
        count = (parseInt(count) + 1).toString();
    }
    localStorage.setItem(key, count);
    return count;
}

// 处理PDF下载按钮点击
async function handleDownloadPdf() {
    // 获取当前日期，格式化为YYYY.MM.DD
    const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    
    // 设置文章名为"Passage X"格式，其中X是当前文章的序号
    const passageNumber = currentPassageIndex + 1;
    const articleName = `Passage ${passageNumber}`;
    
    // 生成基础文件名
    const baseFileName = `${currentDate}_${articleName}_翻译结果`;
    
    // 处理文件重名，自动添加v1、v2等序号
    const fileName = generateUniqueFileName(baseFileName);
    
    try {
        // 创建PDF内容，传递文件名作为参数
        const pdf = await generatePdfContent(fileName);
        
        // 下载PDF
        pdf.save(fileName);
        
        // 提供操作成功反馈
        alert('PDF下载已开始！');
    } catch (error) {
        console.error('生成PDF失败:', error);
        alert('PDF生成失败，请重试！');
    }
}

// 生成唯一文件名，处理重名情况
function generateUniqueFileName(baseName) {
    let version = 1;
    let fileName = `${baseName}_v${version}.pdf`;
    
    // 虽然无法直接检测客户端文件系统中的文件，但我们可以在sessionStorage中跟踪下载次数
    const downloadHistory = JSON.parse(sessionStorage.getItem('pdfDownloadHistory') || '{}');
    
    // 检查该文件名是否已下载过
    if (downloadHistory[baseName]) {
        version = downloadHistory[baseName] + 1;
    }
    
    // 更新下载历史
    downloadHistory[baseName] = version;
    sessionStorage.setItem('pdfDownloadHistory', JSON.stringify(downloadHistory));
    
    return `${baseName}_v${version}.pdf`;
}

// 生成PDF内容，模拟浏览器打印效果
async function generatePdfContent(fileName) {
    // 创建jsPDF实例，使用A4纸张尺寸和标准页边距
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16 // 提高精度
    });
    
    // 设置标准页边距（上、下、左、右各20mm）
    const margin = {
        top: 20,  // 上20mm
        bottom: 20, // 下20mm
        left: 20,  // 左20mm
        right: 20  // 右20mm
    };
    
    // A4纸张尺寸（mm）
    const a4Width = 210;
    const a4Height = 297;
    
    // 可用宽度和高度
    const availableWidth = a4Width - margin.left - margin.right;
    const availableHeight = a4Height - margin.top - margin.bottom;
    
    // 获取结果区域的DOM元素
    const resultSection = document.getElementById('result-section');
    
    // 克隆结果区域，以便我们可以修改它而不影响原始页面
    const printContainer = resultSection.cloneNode(true);
    
    // 移除AI评语之后的内容（翻译文本和操作按钮）
    const aiEvaluationItem = printContainer.querySelector('#ai-evaluation').closest('.result-item');
    if (aiEvaluationItem) {
        // 获取result-container
        const resultContainer = printContainer.querySelector('.result-container');
        if (resultContainer) {
            // 移除AI评语之后的所有result-item
            let nextSibling = aiEvaluationItem.nextElementSibling;
            while (nextSibling) {
                resultContainer.removeChild(nextSibling);
                nextSibling = aiEvaluationItem.nextElementSibling;
            }
        }
        
        // 移除操作按钮区域
        const actionButtons = printContainer.querySelector('.action-buttons');
        if (actionButtons && actionButtons.parentNode) {
            actionButtons.parentNode.removeChild(actionButtons);
        }
    }
    
    // 添加打印特定的样式
    const printStyle = document.createElement('style');
    printStyle.textContent = `
        body { font-family: 'Source Han Sans', 'Noto Sans SC', sans-serif; }
        .container { max-width: none; margin: 0; padding: 0; }
        section { box-shadow: none; border: none; }
        .result-container { display: block; }
        .result-item { margin-bottom: 20px; page-break-inside: avoid; }
        /* 确保页眉页脚在打印时正确显示 */
        @page { margin: ${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm; }
    `;
    printContainer.appendChild(printStyle);
    
    // 暂时将克隆的元素添加到页面中（用于html2canvas捕获）
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '-9999px';
    printContainer.style.width = `${availableWidth}mm`;
    document.body.appendChild(printContainer);
    
    try {
        // 使用html2canvas将DOM元素转换为图片，模拟浏览器打印效果
        const canvas = await html2canvas(printContainer, {
            scale: 2, // 提高分辨率
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 15000,
            removeContainer: true,
            // 模拟浏览器打印的媒体类型
            mediaType: 'print',
            // 允许打印背景图片和颜色
            allowTaint: true,
            useCORS: true
        });
        
        // 获取Canvas原始尺寸
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // 计算适合的缩放因子，模拟浏览器打印的缩放
        const scaleFactor = availableWidth / (imgWidth / 2); // 除以2是因为我们使用了scale: 2
        
        // 计算缩放后的图片尺寸
        const scaledWidth = availableWidth;
        const scaledHeight = imgHeight * scaleFactor / 2;
        
        // 计算需要多少页
        const totalPages = Math.ceil(scaledHeight / availableHeight);
        
        // 创建临时画布用于裁剪
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // 设置临时画布尺寸
        tempCanvas.width = imgWidth;
        tempCanvas.height = availableHeight * (imgWidth / availableWidth);
        
        // 绘制每一页
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
            // 如果不是第一页，添加新页
            if (pageNumber > 1) {
                pdf.addPage();
            }
            
            // 添加页眉：包含文件名和页码
            const headerText = `${fileName.replace('.pdf', '')} - 第 ${pageNumber} 页，共 ${totalPages} 页`;
            
            // 创建页眉文本的Canvas（矢量图格式）
            const headerCanvas = document.createElement('canvas');
            const headerCtx = headerCanvas.getContext('2d');
            
            // 设置Canvas尺寸
            headerCanvas.width = 600;
            headerCanvas.height = 30;
            
            // 清除画布
            headerCtx.clearRect(0, 0, headerCanvas.width, headerCanvas.height);
            
            // 设置字体样式
            headerCtx.font = '10pt Arial';
            headerCtx.fillStyle = '#666666';
            headerCtx.textAlign = 'center';
            headerCtx.textBaseline = 'middle';
            
            // 绘制页眉文本
            headerCtx.fillText(headerText, headerCanvas.width / 2, headerCanvas.height / 2);
            
            // 将页眉Canvas转换为图片数据
            const headerImgData = headerCanvas.toDataURL('image/png');
            
            // 计算页眉在PDF中的尺寸和位置
            const headerWidth = availableWidth;
            const headerHeight = headerCanvas.height * (headerWidth / headerCanvas.width);
            
            // 添加页眉图片到PDF
            pdf.addImage(
                headerImgData,
                'PNG',
                margin.left,
                margin.top - 10,
                headerWidth,
                headerHeight
            );
            
            // 计算当前页的内容区域
            const yOffset = (pageNumber - 1) * availableHeight;
            const pageContentHeight = Math.min(scaledHeight - yOffset, availableHeight);
            
            // 计算原始Canvas上的对应区域
            const sourceY = (yOffset / scaleFactor) * 2;
            const sourceHeight = (pageContentHeight / scaleFactor) * 2;
            
            // 在临时画布上绘制当前页的内容（裁剪）
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(
                canvas,
                0, sourceY, imgWidth, sourceHeight,  // 源区域
                0, 0, tempCanvas.width, tempCanvas.height  // 目标区域
            );
            
            // 将临时画布转换为图片数据
            const pageImgData = tempCanvas.toDataURL('image/png');
            
            // 添加裁剪后的内容图片到当前页
            pdf.addImage(
                pageImgData,
                'PNG',
                margin.left,
                margin.top,
                scaledWidth,
                pageContentHeight
            );
        }
        
        return pdf;
    } finally {
        // 确保克隆的元素被移除
        if (document.body.contains(printContainer)) {
            document.body.removeChild(printContainer);
        }
    }
}

// 开始整篇练习
function startPassageMode() {
    currentMode = 'passage';
    
    // 设置中文 passage，取消所有换行符
    const passageText = passages[currentPassageIndex].replace(/\n/g, ' ');
    
    // 保存状态
    appState.currentMode = currentMode;
    saveAppState();
    
    // 如果当前页面是模式选择页面，则跳转到整篇练习页面
    if (window.location.pathname.endsWith('3_mode_selection.html')) {
        if (window.PageTransition) {
            PageTransition.transitionTo('4_passage_practice.html');
        } else {
            window.location.href = '4_passage_practice.html';
        }
    } else {
        // 设置中文 passage，取消所有换行符
        chinesePassage.innerHTML = passageText;
        
        // 显示练习区域
        showSection(passagePractice);
        hideSection(modeSelection);
        
        // 开始计时
        startTimer();
        
        // 聚焦输入框
        passageInput.focus();
    }
}

// 处理分句输入
async function handleSentenceInput(e) {
    if (e.key === 'Enter') {
        const translation = englishInput.value.trim();
        if (translation) {
            userTranslations[currentSentenceIndex] = translation;
            currentSentenceIndex++;
            
            if (currentSentenceIndex < sentences.length) {
                updateCurrentSentence();
            } else {
                // 完成所有句子
                await endPractice();
            }
        }
    }
}

// 页面过渡效果系统
const PageTransition = {
    // 页面过渡配置
    config: {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        transitionType: 'slide-blur-left', // 统一使用向左模糊过渡效果
        mobileDuration: 300
    },

    // 页面访问历史记录
    history: {
        pages: [],
        maxSize: 20,
        
        // 添加页面到历史记录
        add(pageUrl) {
            // 避免重复添加相同的页面
            if (this.pages.length > 0 && this.pages[this.pages.length - 1] === pageUrl) {
                return;
            }
            
            // 添加新页面
            this.pages.push(pageUrl);
            
            // 限制历史记录大小
            if (this.pages.length > this.maxSize) {
                this.pages.shift();
            }
            
            // 保存到localStorage
            this.save();
        },
        
        // 获取上一个页面
        getPrevious() {
            if (this.pages.length >= 2) {
                // 返回倒数第二个页面（当前页面的前一个页面）
                return this.pages[this.pages.length - 2];
            }
            return null;
        },
        
        // 获取当前页面
        getCurrent() {
            if (this.pages.length > 0) {
                return this.pages[this.pages.length - 1];
            }
            return null;
        },
        
        // 保存到localStorage
        save() {
            try {
                localStorage.setItem('pageHistory', JSON.stringify(this.pages));
            } catch (e) {
                console.warn('无法保存页面历史记录:', e);
            }
        },
        
        // 从localStorage加载
        load() {
            try {
                const saved = localStorage.getItem('pageHistory');
                if (saved) {
                    this.pages = JSON.parse(saved);
                }
            } catch (e) {
                console.warn('无法加载页面历史记录:', e);
                this.pages = [];
            }
        },
        
        // 清除历史记录
        clear() {
            this.pages = [];
            this.save();
        }
    },

    // 初始化页面过渡
    init() {
        // 加载页面历史记录
        this.history.load();
        
        // 记录当前页面
        this.history.add(window.location.pathname);
        
        // 页面加载时添加过渡效果
        document.addEventListener('DOMContentLoaded', () => {
            this.onPageLoad();
        });

        // 监听所有链接点击，添加过渡效果
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && this.shouldTransition(link.href)) {
                e.preventDefault();
                this.transitionTo(link.href, this.getTransitionType(link));
            }
        });

        // 监听浏览器后退/前进
        window.addEventListener('popstate', (e) => {
            if (e.state) {
                this.onPageLoad('back');
            }
        });

        // 为所有页面内容添加过渡类
        this.wrapPageContent();
    },

    // 页面加载时的处理
    onPageLoad(direction = 'forward') {
        const body = document.body;
        
        // 添加加载类
        body.classList.add('loaded');

        // 根据方向选择进入动画
        const pageContent = document.querySelector('.page-content') || document.body;
        const animationClass = this.getEnterAnimation(direction);
        
        pageContent.classList.add(animationClass);
        
        // 动画结束后移除类
        setTimeout(() => {
            pageContent.classList.remove(animationClass);
        }, this.getDuration());

        // 滚动到顶部
        window.scrollTo(0, 0);
    },

    // 过渡到新页面
    transitionTo(url, transitionType = null) {
        const body = document.body;
        const pageContent = document.querySelector('.page-content') || document.body;
        
        // 使用指定的过渡类型或默认类型
        const type = transitionType || this.config.transitionType;
        const exitAnimation = this.getExitAnimation(type);
        
        // 添加退出动画
        pageContent.classList.add(exitAnimation);
        
        // 等待动画完成后导航
        setTimeout(() => {
            window.location.href = url;
        }, this.getDuration());
    },

    // 判断是否应该添加过渡效果
    shouldTransition(href) {
        // 排除外链、锚点链接、特殊链接和JavaScript链接
        if (href.startsWith('#') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:') || 
            href.startsWith('javascript:')) {
            return false;
        }
        
        // 只对同域名的HTML文件添加过渡
        const currentDomain = window.location.hostname;
        const linkDomain = new URL(href, window.location.origin).hostname;
        
        return currentDomain === linkDomain && href.endsWith('.html');
    },

    // 根据链接获取过渡类型
    getTransitionType(link) {
        // 统一使用向左模糊过渡效果
        return 'slide-blur-left';
    },

    // 获取进入动画类名
    getEnterAnimation(direction) {
        // 统一使用向左模糊进入动画
        return 'slide-blur-left';
    },

    // 获取退出动画类名
    getExitAnimation(type) {
        // 统一使用向左模糊退出动画
        return 'slide-blur-left-out';
    },

    // 获取动画时长
    getDuration() {
        if (window.innerWidth <= 768) {
            return this.config.mobileDuration;
        }
        return this.config.duration;
    },

    // 包装页面内容以便应用过渡效果
    wrapPageContent() {
        const body = document.body;
        const mainContent = body.querySelector('main') || body.querySelector('.container') || body.firstElementChild;
        
        if (mainContent && !mainContent.classList.contains('page-content')) {
            mainContent.classList.add('page-content');
            
            // 初始状态设置为不可见
            mainContent.style.opacity = '0';
            mainContent.style.transform = 'translateY(20px)';
            
            // 页面加载后显示
            setTimeout(() => {
                mainContent.classList.add('visible');
                mainContent.style.opacity = '';
                mainContent.style.transform = '';
            }, 50);
        }
    },

    // 平滑滚动到指定元素
    smoothScrollTo(element, offset = 0) {
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    },

    // 平滑滚动到顶部
    smoothScrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },

    // 导航到指定页面（带历史记录管理）
    navigateTo(url) {
        if (!url) {
            console.warn('无效的URL');
            return;
        }

        // 确保URL是相对路径
        if (url.startsWith('http')) {
            try {
                const urlObj = new URL(url);
                url = urlObj.pathname + urlObj.search;
            } catch (e) {
                console.warn('URL解析失败:', e);
                return;
            }
        }

        // 添加到历史记录
        this.history.add(url);

        // 使用过渡效果导航到新页面
        this.transitionTo(url);
    }
};

// 初始化页面过渡系统
PageTransition.init();

// 为所有导航链接添加过渡效果
document.addEventListener('DOMContentLoaded', () => {
    // 为所有导航链接添加过渡效果
    const navLinks = document.querySelectorAll('nav a, .nav-btn, .wordbook-icon');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.endsWith('.html')) {
                e.preventDefault();
                const transitionType = PageTransition.getTransitionType(link);
                PageTransition.transitionTo(href, transitionType);
            }
        });
    });

    // 为返回按钮添加过渡效果
    const backButtons = document.querySelectorAll('.back-btn, #back-to-select, #back-to-passage, #upload-new');
    backButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const href = btn.getAttribute('href');
            if (href && !href.startsWith('javascript:')) {
                e.preventDefault();
                PageTransition.transitionTo(href);
            }
        });
    });

    // 为模式选择按钮添加过渡效果
    const modeButtons = document.querySelectorAll('#sentence-mode-btn, #passage-mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const href = btn.getAttribute('href');
            if (href && !href.startsWith('javascript:')) {
                e.preventDefault();
                PageTransition.transitionTo(href);
            }
        });
    });
});

// 导出页面过渡对象供其他模块使用
window.PageTransition = PageTransition;

// 处理分句输入框的键盘事件（上箭头回到上一句）
function handleSentenceKeyDown(e) {
    if (currentMode === 'sentence') {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (currentSentenceIndex < sentences.length - 1) {
                const currentTranslation = englishInput.value.trim();
                if (currentTranslation) {
                    userTranslations[currentSentenceIndex] = currentTranslation;
                }
                currentSentenceIndex++;
                updateCurrentSentence();
            } else {
                handleCompleteTranslation();
            }
        } else if (e.key === 'ArrowUp') {
            if (currentSentenceIndex > 0) {
                const currentTranslation = englishInput.value.trim();
                if (currentTranslation) {
                    userTranslations[currentSentenceIndex] = currentTranslation;
                }
                currentSentenceIndex--;
                updateCurrentSentence();
            }
        }
    }
}

// 处理整篇输入
async function handlePassageInput(e) {
    if (e.key === 'Enter' && e.shiftKey) {
        // 允许Shift+Enter换行
        return;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const translation = passageInput.value.trim();
        if (translation) {
            userTranslations = [translation];
            await endPractice();
        }
    }
}

// 开始计时
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

// 更新计时器
function updateTimer() {
    if (!startTime) return;
    
    const elapsedTime = Date.now() - startTime;
    const hours = Math.floor(elapsedTime / 3600000);
    const minutes = Math.floor((elapsedTime % 3600000) / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    
    timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 显示加载指示器
function showLoadingIndicator(message = '正在评估，请稍候...') {
    // 检查是否已存在加载指示器
    let loadingContainer = document.getElementById('loading-indicator');
    
    if (!loadingContainer) {
        // 获取当前主题色
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const primaryColorRgb = getComputedStyle(document.documentElement).getPropertyValue('--primary-color-rgb').trim();
        const isDarkMode = document.documentElement.getAttribute('data-dark-mode') === 'true';
        
        // 创建背景遮罩
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        overlay.style.backdropFilter = 'blur(3px)';
        overlay.style.zIndex = '1000';
        
        // 创建加载指示器容器
        loadingContainer = document.createElement('div');
        loadingContainer.id = 'loading-indicator';
        loadingContainer.className = 'loading-indicator';
        loadingContainer.style.position = 'fixed';
        loadingContainer.style.top = '50%';
        loadingContainer.style.left = '50%';
        loadingContainer.style.transform = 'translate(-50%, -50%)';
        loadingContainer.style.backgroundColor = isDarkMode ? 'rgba(30, 30, 30, 1)' : 'rgba(255, 255, 255, 1)';
        loadingContainer.style.border = '2px solid ' + primaryColor;
        loadingContainer.style.borderRadius = '12px';
        loadingContainer.style.padding = '32px';
        loadingContainer.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
        loadingContainer.style.zIndex = '1001';
        loadingContainer.style.textAlign = 'center';
        loadingContainer.style.minWidth = '300px';
        loadingContainer.style.maxWidth = '90%';
        loadingContainer.style.boxSizing = 'border-box';
        loadingContainer.style.transition = 'border-color 0.3s ease, background-color 0.3s ease';
        
        // 创建加载动画
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.style.border = '6px solid #f0f0f0';
        spinner.style.borderTop = '6px solid ' + primaryColor;
        spinner.style.borderLeft = '6px solid ' + primaryColor;
        spinner.style.borderRadius = '50%';
        spinner.style.width = '60px';
        spinner.style.height = '60px';
        spinner.style.animation = 'spin 1.2s linear infinite';
        spinner.style.margin = '0 auto 24px';
        spinner.style.boxShadow = '0 4px 12px rgba(' + primaryColorRgb + ', 0.3)';
        spinner.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease';
        
        // 创建消息文本
        const loadingMessage = document.createElement('div');
        loadingMessage.id = 'loading-message';
        loadingMessage.textContent = message;
        loadingMessage.style.fontSize = '18px';
        loadingMessage.style.color = isDarkMode ? '#e0e0e0' : '#212529';
        loadingMessage.style.fontWeight = '500';
        loadingMessage.style.marginBottom = '12px';
        loadingMessage.style.lineHeight = '1.5';
        
        // 创建进度文本（用于分句模式）
        const progressText = document.createElement('div');
        progressText.id = 'loading-progress';
        progressText.style.fontSize = '16px';
        progressText.style.color = isDarkMode ? '#b0b0b0' : '#6c757d';
        progressText.style.marginTop = '16px';
        progressText.style.fontWeight = '400';
        
        // 添加动画样式
        const style = document.createElement('style');
        style.id = 'loading-animation-style';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.85; }
                100% { opacity: 1; }
            }
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            .loading-indicator {
                animation: pulse 1.5s ease-in-out infinite;
            }
            .spinner {
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
            }
        `;
        document.head.appendChild(style);
        
        // 组装加载指示器
        loadingContainer.appendChild(spinner);
        loadingContainer.appendChild(loadingMessage);
        loadingContainer.appendChild(progressText);
        
        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(loadingContainer);
    } else {
        // 更新消息
        document.getElementById('loading-message').textContent = message;
    }
}

// 更新加载进度
function updateLoadingProgress(current, total) {
    const progressText = document.getElementById('loading-progress');
    if (progressText) {
        progressText.textContent = `正在评估第 ${current} 句，共 ${total} 句`;
    }
}

// 更新加载指示器的主题颜色
function updateLoadingIndicatorTheme() {
    const loadingContainer = document.getElementById('loading-indicator');
    const spinner = document.querySelector('.spinner');
    const loadingMessage = document.getElementById('loading-message');
    const progressText = document.getElementById('loading-progress');
    
    if (loadingContainer || spinner || loadingMessage || progressText) {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const primaryColorRgb = getComputedStyle(document.documentElement).getPropertyValue('--primary-color-rgb').trim();
        const isDarkMode = document.documentElement.getAttribute('data-dark-mode') === 'true';
        
        if (loadingContainer) {
            loadingContainer.style.borderColor = primaryColor;
            loadingContainer.style.backgroundColor = isDarkMode ? 'rgba(30, 30, 30, 1)' : 'rgba(255, 255, 255, 1)';
        }
        
        if (spinner) {
            spinner.style.borderTopColor = primaryColor;
            spinner.style.borderLeftColor = primaryColor;
            spinner.style.boxShadow = '0 4px 12px rgba(' + primaryColorRgb + ', 0.3)';
        }
        
        if (loadingMessage) {
            loadingMessage.style.color = isDarkMode ? '#e0e0e0' : '#212529';
        }
        
        if (progressText) {
            progressText.style.color = isDarkMode ? '#b0b0b0' : '#6c757d';
        }
    }
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    const loadingContainer = document.getElementById('loading-indicator');
    const overlay = document.getElementById('loading-overlay');
    
    if (loadingContainer) {
        loadingContainer.parentNode.removeChild(loadingContainer);
    }
    
    if (overlay) {
        overlay.parentNode.removeChild(overlay);
    }
}

// Markdown渲染函数
function renderMarkdown(text) {
    if (!text) return '';
    
    // 基础Markdown解析
    let html = text
        // 标题
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // 列表 - 确保文本内容有span包裹以便单独设置颜色
        .replace(/^- (.*$)/gm, '<li><span>$1</span></li>')
        .replace(/^\* (.*$)/gm, '<li><span>$1</span></li>')
        // 粗体和斜体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 段落
        .replace(/^(?!<h|<li)(.*$)/gm, '<p>$1</p>')
        // 链接
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 修复粗体文本在列表中的位置
    html = html.replace(/<li><span><strong>(.*?)<\/strong>(.*?)<\/span><\/li>/g, '<li><strong>$1</strong><span>$2</span></li>');
    
    // 将连续的列表项包装在<ul>标签中
    html = html.replace(/(<li>.*?<\/li>)(?=\s*<li>)/gs, '$1');
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    
    return html;
}

// 结束练习
async function endPractice() {
    // 停止计时
    clearInterval(timerInterval);
    timerInterval = null;
    
    // 立即显示加载指示器，让用户看到系统正在处理
    showLoadingIndicator();
    
    // 计算用时
    const elapsedTime = Date.now() - startTime;
    const hours = Math.floor(elapsedTime / 3600000);
    const minutes = Math.floor((elapsedTime % 3600000) / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    let score = 70; // 设置默认分数，避免未定义
    let detailedErrors = [];
    let totalSentenceScores = []; // 用于存储每个句子的分数
    let aiEvaluationText = ''; // 用于存储AI评语
    
    try {
        // 选择评分系统
        const scoringSystem = await selectScoringSystem();
        logMessage(`开始使用${scoringSystem.system}系统评估翻译质量`, 'info');
        
        if (currentMode === 'sentence') {
            // 分句模式：为每个句子生成评分和错误分析
            for (let i = 0; i < sentences.length; i++) {
                // 更新进度显示
                updateLoadingProgress(i + 1, sentences.length);
                
                const translation = userTranslations[i] || '';
                if (translation.trim()) {
                    try {
                        const evaluation = await scoringSystem.evaluate(sentences[i], translation);
                        if (evaluation) {
                            // 存储每个句子的完整评估结果
                            const sentenceError = {
                                sentenceIndex: i + 1,
                                chinese: sentences[i],
                                translation: translation,
                                errors: evaluation.errors,
                                sentenceScore: evaluation.score || 80 // 保存句子的单独分数
                            };
                            detailedErrors.push(sentenceError);
                            
                            // 如果有分数，添加到总分计算中
                            if (evaluation.score !== undefined) {
                                totalSentenceScores.push(evaluation.score);
                            }
                        }
                    } catch (error) {
                        logMessage(`评估第${i+1}句时出错: ${error.message}`, 'error');
                        // 即使单个句子评估失败，继续评估其他句子
                    }
                }
            }
            
            // 计算平均分
            if (detailedErrors.length > 0) {
                // 检查翻译的完整性（用户实际翻译了多少个句子）
                const translatedSentencesCount = detailedErrors.length;
                const totalSentencesCount = sentences.length;
                const translationCompletion = translatedSentencesCount / totalSentencesCount;
                
                // 如果有直接的句子分数，使用这些分数计算平均分
                if (totalSentenceScores.length > 0) {
                    const totalScore = totalSentenceScores.reduce((sum, sentenceScore) => sum + sentenceScore, 0);
                    let avgScore = Math.round(totalScore / totalSentenceScores.length);
                    
                    // 根据翻译完整性调整分数
                    if (translationCompletion < 1) {
                        // 不完整翻译最多只能得到80分
                        avgScore = Math.min(80, Math.round(avgScore * translationCompletion + (1 - translationCompletion) * 40));
                    }
                    
                    score = Math.max(0, Math.min(100, avgScore));
                } else {
                    // 回退到基于错误数量的评分
                    const totalErrors = detailedErrors.reduce((count, item) => count + item.errors.length, 0);
                    const avgErrorsPerSentence = totalErrors / detailedErrors.length;
                    score = Math.max(0, Math.round(100 - avgErrorsPerSentence * 10));
                    
                    // 根据翻译完整性调整分数
                    if (translationCompletion < 1) {
                        score = Math.min(80, Math.round(score * translationCompletion + (1 - translationCompletion) * 40));
                    }
                }
            } else {
                // 如果没有任何翻译，给较低的分数
                score = 30;
            }
        } else {
            // 整篇模式：对整个翻译进行评估
            const translation = userTranslations[0] || '';
            if (translation.trim()) {
                const evaluation = await scoringSystem.evaluate(passages[currentPassageIndex], translation);
                if (evaluation) {
                    score = evaluation.score;
                    detailedErrors.push({
                        sentenceIndex: 0,
                        chinese: passages[currentPassageIndex],
                        translation: translation,
                        errors: evaluation.errors
                    });
                } 
                // 即使评估结果为空，也要确保score有值
                if (score === undefined || isNaN(score)) {
                    // 使用基于错误数量和翻译质量的综合评分
                    const errorCount = evaluation ? evaluation.errors.length : translation.length > 100 ? 5 : 3;
                    const baseScore = translation.length < 50 ? 60 : 80;
                    score = Math.max(0, Math.round(baseScore - errorCount * 3));
                }
                
                // 检查翻译长度与原文的比例，确保翻译完整性
                const originalLength = passages[currentPassageIndex].length;
                const translationLength = translation.length;
                const lengthRatio = translationLength / originalLength;
                
                if (lengthRatio < 0.3) {
                    // 翻译过短，最多只能得60分
                    score = Math.min(60, score);
                } else if (lengthRatio < 0.7) {
                    // 翻译较短，最多只能得80分
                    score = Math.min(80, score);
                }
            } else {
                // 如果没有翻译内容，给很低的分数
                score = 20;
            }
        }
        
        logMessage(`翻译评估完成，最终得分: ${score}`, 'info');
    } catch (error) {
        // 隐藏加载指示器
        hideLoadingIndicator();
        
        logMessage(`评估翻译质量时出错: ${error.message}`, 'error');
        alert('评估翻译质量时出错，已使用备用评分系统完成评估');
        
        // 即使出错，也尝试显示结果
        if (detailedErrors.length === 0) {
            // 如果没有详细错误信息，使用基于翻译长度和质量的评分
            const translation = currentMode === 'sentence' ? userTranslations.join(' ') : userTranslations[0] || '';
            const wordCount = translation.trim().split(' ').length;
            
            // 基于翻译长度和基本质量的评分，避免随机因素
            if (wordCount < 5) {
                score = 40; // 翻译过短，分数较低
            } else if (wordCount < 20) {
                score = 60; // 翻译较短，分数中等
            } else {
                score = 75; // 翻译合理长度，分数较好
            }
            
            // 根据翻译完整性调整
            const translatedCount = currentMode === 'sentence' ? userTranslations.filter(t => t.trim()).length : translation.trim() ? 1 : 0;
            const totalCount = currentMode === 'sentence' ? sentences.length : 1;
            const completion = translatedCount / totalCount;
            
            score = Math.max(0, Math.round(score * completion + 30 * (1 - completion)));
        } else {
            // 如果有详细错误信息，基于错误数量和严重程度计算分数
            const totalErrors = detailedErrors.reduce((count, item) => count + item.errors.length, 0);
            const avgErrorsPerSentence = totalErrors / detailedErrors.length;
            
            // 根据错误严重程度调整
            let severityFactor = 1;
            detailedErrors.forEach(item => {
                item.errors.forEach(err => {
                    if (err.type === '语法错误' || err.type === '时态错误' || err.type === '主谓一致') {
                        severityFactor += 0.5;
                    }
                });
            });
            
            score = Math.max(0, Math.round(100 - avgErrorsPerSentence * 10 * severityFactor));
        }
    }
    
    // 确保分数在合理范围内
    score = Math.max(0, Math.min(100, score));
    
    // 生成AI评语
    if (detailedErrors.length === 0) {
        aiEvaluationText = `**翻译质量评估：**

* 总体评分：${score}/100
* 整体评价：翻译质量优秀，未检测到明显错误。
* 建议：继续保持良好的翻译习惯，注意专业术语的准确性。`;
    } else {
        // 统计错误类型
        const errorTypeCount = {};
        detailedErrors.forEach(item => {
            item.errors.forEach(error => {
                errorTypeCount[error.type] = (errorTypeCount[error.type] || 0) + 1;
            });
        });
        
        // 生成错误统计文本
        let errorStats = '\n**错误类型统计：**\n';
        Object.entries(errorTypeCount).forEach(([type, count]) => {
            errorStats += `- ${type}：${count}处\n`;
        });
        
        // 根据分数生成评价
        let overallEvaluation = '';
        if (score >= 90) {
            overallEvaluation = '翻译质量优秀，几乎没有错误。';
        } else if (score >= 80) {
            overallEvaluation = '翻译质量良好，有少量可改进的地方。';
        } else if (score >= 70) {
            overallEvaluation = '翻译质量中等，存在一些明显的错误。';
        } else if (score >= 60) {
            overallEvaluation = '翻译质量基本合格，但需要改进的地方较多。';
        } else {
            overallEvaluation = '翻译质量较差，需要系统地学习和改进。';
        }
        
        // 生成AI评语
        aiEvaluationText = `**翻译质量评估：**

* 总体评分：${score}/100
* 整体评价：${overallEvaluation}
* 翻译完整度：${Math.round((detailedErrors.length / (currentMode === 'sentence' ? sentences.length : 1)) * 100)}%${errorStats}\n**建议：**\n- 重点关注${Object.keys(errorTypeCount).join('、')}等方面的问题\n- 多读多练，提高对语法和词汇的掌握\n- 注意翻译的流畅性和准确性`;
    }
    
    // 隐藏加载指示器
    hideLoadingIndicator();
    
    // 保存评估结果到localStorage
    const evaluationResult = {
        timeString,
        score,
        detailedErrors,
        currentMode,
        userTranslations,
        aiEvaluationText
    };
    localStorage.setItem('evaluationResult', JSON.stringify(evaluationResult));
    
    // 导航到评估页面
    if (window.PageTransition) {
        PageTransition.transitionTo('4_result.html');
    } else {
        window.location.href = '4_result.html';
    }
}

// 生成评分（模拟AI评分，基于错误分析）
function generateScore() {
    // 获取详细错误分析
    const errors = generateDetailedErrors();
    
    // 计算基础分
    let baseScore = 80;
    
    // 根据错误数量扣分
    const totalErrors = errors.reduce((count, error) => count + error.errors.length, 0);
    const errorPenalty = Math.min(totalErrors * 5, 40);
    
    // 根据错误严重程度调整
    let severityPenalty = 0;
    errors.forEach(error => {
        error.errors.forEach(err => {
            if (err.type === '语法错误') severityPenalty += 3;
            if (err.type === '拼写错误') severityPenalty += 2;
        });
    });
    severityPenalty = Math.min(severityPenalty, 30);
    
    // 计算最终分数
    let finalScore = baseScore - errorPenalty - severityPenalty;
    finalScore = Math.max(Math.round(finalScore), 0);
    finalScore = Math.min(finalScore, 100);
    
    return finalScore;
}

// 生成详细错误分析
function generateDetailedErrors() {
    const detailedErrors = [];
    
    // 根据模式处理
    if (currentMode === 'sentence') {
        // 分句模式：为每一句生成错误
        sentences.forEach((chinese, index) => {
            const translation = userTranslations[index] || '';
            if (translation.trim()) {
                const sentenceErrors = analyzeSentence(chinese, translation, index + 1);
                if (sentenceErrors.length > 0) {
                    detailedErrors.push({
                        sentenceIndex: index + 1,
                        chinese: chinese,
                        translation: translation,
                        errors: sentenceErrors
                    });
                }
            }
        });
    } else {
        // 整篇模式：整体分析
        const chineseText = passages[currentPassageIndex];
        const translation = userTranslations[0] || '';
        
        if (translation.trim()) {
            const passageErrors = analyzePassage(chineseText, translation);
            if (passageErrors.length > 0) {
                detailedErrors.push({
                    sentenceIndex: 0, // 整篇模式
                    chinese: chineseText,
                    translation: translation,
                    errors: passageErrors
                });
            }
        }
    }
    
    return detailedErrors;
}

// 分析整篇翻译
function analyzePassage(chinese, translation) {
    const errors = [];
    const words = translation.split(' ');
    
    // 随机生成2-5个错误（整篇模式）
    const errorCount = Math.floor(Math.random() * 4) + 2;
    
    // 可能的错误类型
    const grammarErrors = [
        { type: '语法错误', description: '主谓一致问题', example: 'is/are' },
        { type: '语法错误', description: '时态错误', example: 'go/went/gone' },
        { type: '语法错误', description: '冠词错误', example: 'a/an/the' },
        { type: '语法错误', description: '介词错误', example: 'in/on/at' },
        { type: '语法错误', description: '句子结构问题', example: '语序错误' },
        { type: '语法错误', description: '从句使用不当', example: '定语从句/状语从句' },
        { type: '语法错误', description: '并列结构错误', example: 'and/or连接' }
    ];
    
    // 添加语法错误
    for (let i = 0; i < Math.floor(errorCount * 0.6); i++) {
        const grammarError = grammarErrors[Math.floor(Math.random() * grammarErrors.length)];
        const wordIndex = Math.floor(Math.random() * words.length);
        const word = words[wordIndex];
        
        errors.push({
            type: grammarError.type,
            description: grammarError.description,
            position: `第${wordIndex + 1}个单词"${word}"附近`,
            example: grammarError.example
        });
    }
    
    // 添加拼写错误
    for (let i = 0; i < Math.ceil(errorCount * 0.4); i++) {
        const wordIndex = Math.floor(Math.random() * words.length);
        let word = words[wordIndex];
        
        if (word.length > 3) {
            // 随机替换一个字符
            const charIndex = Math.floor(Math.random() * (word.length - 1)) + 1;
            const misspelledWord = word.substring(0, charIndex) + 
                                  String.fromCharCode(word.charCodeAt(charIndex) + 1) + 
                                  word.substring(charIndex + 1);
            
            errors.push({
                type: '拼写错误',
                description: '单词拼写错误',
                position: `第${wordIndex + 1}个单词"${word}"`,
                example: `可能应该是"${misspelledWord}"`
            });
        }
    }
    
    return errors;
}

// 分析单句翻译
function analyzeSentence(chinese, translation, sentenceIndex) {
    const errors = [];
    const words = translation.split(' ');
    
    // 随机生成1-3个错误
    const errorCount = Math.floor(Math.random() * 3) + 1;
    
    // 可能的错误类型
    const grammarErrors = [
        { type: '语法错误', description: '主谓一致问题', example: 'is/are' },
        { type: '语法错误', description: '时态错误', example: 'go/went/gone' },
        { type: '语法错误', description: '冠词错误', example: 'a/an/the' },
        { type: '语法错误', description: '介词错误', example: 'in/on/at' },
        { type: '语法错误', description: '句子结构问题', example: '语序错误' }
    ];
    
    const spellingErrors = [
        { type: '拼写错误', commonWords: ['receive', 'believe', 'separate', 'definitely', 'embarrass'] }
    ];
    
    // 添加语法错误
    for (let i = 0; i < Math.floor(errorCount / 2); i++) {
        const grammarError = grammarErrors[Math.floor(Math.random() * grammarErrors.length)];
        const wordIndex = Math.floor(Math.random() * words.length);
        const word = words[wordIndex];
        
        errors.push({
            type: grammarError.type,
            description: grammarError.description,
            position: `第${sentenceIndex}句，第${wordIndex + 1}个单词"${word}"附近`,
            example: grammarError.example
        });
    }
    
    // 添加拼写错误
    for (let i = 0; i < Math.ceil(errorCount / 2); i++) {
        const wordIndex = Math.floor(Math.random() * words.length);
        let word = words[wordIndex];
        
        // 简单模拟拼写错误
        if (word.length > 3) {
            // 随机替换一个字符
            const charIndex = Math.floor(Math.random() * (word.length - 1)) + 1;
            const misspelledWord = word.substring(0, charIndex) + 
                                  String.fromCharCode(word.charCodeAt(charIndex) + 1) + 
                                  word.substring(charIndex + 1);
            
            errors.push({
                type: '拼写错误',
                description: '单词拼写错误',
                position: `第${sentenceIndex}句，第${wordIndex + 1}个单词"${word}"`,
                example: `可能应该是"${misspelledWord}"`
            });
        }
    }
    
    return errors;
}

// 为翻译文本添加荧光黄色标注
function addHighlight(translation, errors) {
    // 将翻译文本按空格分割成单词数组
    const words = translation.split(' ');
    
    // 创建一个标记数组，记录哪些单词需要高亮
    const highlightIndices = new Set();
    
    // 从错误信息中提取需要高亮的单词索引
    errors.forEach(error => {
        // 匹配位置信息中的数字（第X个单词）
        let match = error.position.match(/第(\d+)个单词/);
        if (match) {
            const index = parseInt(match[1]) - 1; // 转换为0-based索引
            if (index >= 0 && index < words.length) {
                highlightIndices.add(index);
            }
        } else {
            // 匹配其他位置格式：word X, position X, index X
            match = error.position.match(/(?:word|position|index)\s+(\d+)/i);
            if (match) {
                const index = parseInt(match[1]) - 1; // 转换为0-based索引
                if (index >= 0 && index < words.length) {
                    highlightIndices.add(index);
                }
            } else {
                // 匹配第X处错误或其他简单格式
                match = error.position.match(/(?:第)?(\d+)(?:处)?/);
                if (match) {
                    const index = Math.min(parseInt(match[1]) - 1, words.length - 1); // 避免越界
                    if (index >= 0) {
                        highlightIndices.add(index);
                    }
                }
            }
        }
    });
    
    // 构建带高亮的文本
    const highlightedText = words.map((word, index) => {
        if (highlightIndices.has(index)) {
            return `<span style="background-color: #ffeb3b; padding: 2px;">${word}</span>`;
        }
        return word;
    }).join(' ');
    
    return highlightedText;
}

// 显示结果
function showResult(timeString, score, detailedErrors, aiEvaluationTextOverride = null) {
    // 设置结果
    if (resultTime) resultTime.textContent = timeString;
    if (resultScore) resultScore.textContent = `${score}/100`;
    
    // 清空并添加详细语法错误
    if (grammarErrors) grammarErrors.innerHTML = '';
    
    // 构建带高亮的翻译文本数组
    const highlightedTranslations = [];
    
    // 生成AI评语
    let aiEvaluationText = '';
    
    if (detailedErrors.length === 0) {
        if (grammarErrors) {
            const li = document.createElement('li');
            li.textContent = '未检测到明显错误，翻译质量良好！';
            li.style.backgroundColor = '#d4edda';
            li.style.borderColor = '#c3e6cb';
            li.style.color = '#155724';
            grammarErrors.appendChild(li);
        }
        
        // 使用原始翻译文本
        highlightedTranslations.push(...userTranslations);
        
        // 生成AI评语
        aiEvaluationText = `**翻译质量评估：**

* 总体评分：${score}/100
* 整体评价：翻译质量优秀，未检测到明显错误。
* 建议：继续保持良好的翻译习惯，注意专业术语的准确性。`;
    } else {
        // 按句子组织错误显示 - 遍历所有句子，确保显示所有翻译内容
        const totalSentences = currentMode === 'sentence' ? sentences.length : 1;
        
        for (let i = 0; i < totalSentences; i++) {
            const translation = userTranslations[i] || '';
            if (!translation.trim()) continue;
            
            // 查找当前句子在 detailedErrors 中的评估结果
            const errorItem = detailedErrors.find(item => 
                currentMode === 'sentence' ? item.sentenceIndex === i + 1 : item.sentenceIndex === 0
            );
            
            if (grammarErrors) {
                // 添加句子/文章标题
                const sentenceHeader = document.createElement('div');
                sentenceHeader.className = 'sentence-error-header';
                if (currentMode === 'sentence') {
                    sentenceHeader.innerHTML = `<strong>第${i + 1}句：</strong>${sentences[i]}`;
                } else {
                    sentenceHeader.innerHTML = `<strong>整篇文章：</strong>${passages[currentPassageIndex]}`;
                }
                grammarErrors.appendChild(sentenceHeader);
                
                // 添加翻译内容
                const translationText = document.createElement('div');
                translationText.className = 'sentence-translation';
                
                if (errorItem && errorItem.errors.length > 0) {
                    // 有错误：添加高亮和错误列表
                    const highlightedTranslation = addHighlight(translation, errorItem.errors);
                    highlightedTranslations.push(highlightedTranslation);
                    translationText.innerHTML = `<em>你的翻译：${highlightedTranslation}</em>`;
                    
                    // 添加错误列表
                    const errorList = document.createElement('ul');
                    errorList.className = 'sentence-errors';
                    
                    errorItem.errors.forEach(error => {
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <strong>${error.type}：</strong>${error.description}<br>
                            <strong>位置：</strong>${error.position}<br>
                            <strong>说明：</strong>${error.example || '请检查该部分内容'}
                        `;
                        errorList.appendChild(li);
                    });
                    
                    grammarErrors.appendChild(translationText);
                    grammarErrors.appendChild(errorList);
                } else {
                    // 无错误：显示翻译并标记为无错误
                    highlightedTranslations.push(translation);
                    translationText.innerHTML = `<em>你的翻译：${translation}</em>
                        <div class="no-error-indicator" style="color: #28a745; margin-top: 5px; font-size: 0.9em;">
                            ✓ 无明显错误
                        </div>`;
                    grammarErrors.appendChild(translationText);
                }
            } else {
                // 如果grammarErrors不存在，仍然需要添加翻译
                if (errorItem && errorItem.errors.length > 0) {
                    const highlightedTranslation = addHighlight(translation, errorItem.errors);
                    highlightedTranslations.push(highlightedTranslation);
                } else {
                    highlightedTranslations.push(translation);
                }
            }
        }
        
        // 统计错误类型
        const errorTypeCount = {};
        detailedErrors.forEach(item => {
            item.errors.forEach(error => {
                errorTypeCount[error.type] = (errorTypeCount[error.type] || 0) + 1;
            });
        });
        
        // 生成错误统计文本
        let errorStats = '\n**错误类型统计：**\n';
        Object.entries(errorTypeCount).forEach(([type, count]) => {
            errorStats += `- ${type}：${count}处\n`;
        });
        
        // 根据分数生成评价
        let overallEvaluation = '';
        if (score >= 90) {
            overallEvaluation = '翻译质量优秀，几乎没有错误。';
        } else if (score >= 80) {
            overallEvaluation = '翻译质量良好，有少量可改进的地方。';
        } else if (score >= 70) {
            overallEvaluation = '翻译质量中等，存在一些明显的错误。';
        } else if (score >= 60) {
            overallEvaluation = '翻译质量基本合格，但需要改进的地方较多。';
        } else {
            overallEvaluation = '翻译质量较差，需要系统地学习和改进。';
        }
        
        // 生成AI评语
        aiEvaluationText = `**翻译质量评估：**

* 总体评分：${score}/100
* 整体评价：${overallEvaluation}
* 翻译完整度：${Math.round((detailedErrors.length / (currentMode === 'sentence' ? sentences.length : 1)) * 100)}%${errorStats}\n**建议：**\n- 重点关注${Object.keys(errorTypeCount).join('、')}等方面的问题\n- 多读多练，提高对语法和词汇的掌握\n- 注意翻译的流畅性和准确性`;
    }
    
    // 如果提供了覆盖的AI评语，使用它
    if (aiEvaluationTextOverride) {
        aiEvaluationText = aiEvaluationTextOverride;
    }
    
    // 设置带高亮的翻译文本
    if (translatedText) translatedText.innerHTML = highlightedTranslations.join('<br><br>');
    
    // 渲染并显示AI评语
    const aiEvaluationElement = document.getElementById('ai-evaluation');
    if (aiEvaluationElement) {
        aiEvaluationElement.innerHTML = renderMarkdown(aiEvaluationText);
    }
    
    // 显示结果区域
    if (resultSection) {
        showSection(resultSection);
        if (currentMode === 'sentence' && sentencePractice) {
            hideSection(sentencePractice);
        } else if (passagePractice) {
            hideSection(passagePractice);
        }
    }
}

// 返回模式选择
// 返回选择
function backToSelection() {
    if (window.location.pathname.endsWith('4_evaluation.html') || 
        window.location.pathname.endsWith('4_result.html')) {
        if (window.PageTransition) {
            PageTransition.transitionTo('3_mode_selection.html');
        } else {
            window.location.href = '3_mode_selection.html';
        }
    } else {
        showSection(modeSelection);
        hideSection(resultSection);
    }
}

// 上传新文件
function uploadNewFile() {
    // 重置所有变量
    sentences = [];
    currentSentenceIndex = 0;
    userTranslations = [];
    
    // 清空输入
    if (wordFile) wordFile.value = '';
    if (englishInput) englishInput.value = '';
    if (passageInput) passageInput.value = '';
    
    // 重置计时器
    if (timer) timer.textContent = '00:00:00';
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 重置状态
    appState = {
        passages: [],
        currentPassageIndex: 0,
        sentenceSplits: null,
        currentSplitType: 'byLine',
        shouldShowMenu: false,
        selectedPassages: [],
        userTranslations: [],
        currentSentenceIndex: 0
    };
    saveAppState();
    
    // 如果当前页面是结果页面、分句练习页面或整篇练习页面，则跳转到上传页面
    if (window.location.pathname.endsWith('4_evaluation.html') || 
        window.location.pathname.endsWith('4_result.html') ||
        window.location.pathname.endsWith('4_sentence_practice.html') || 
        window.location.pathname.endsWith('4_passage_practice.html')) {
        if (window.PageTransition) {
            PageTransition.transitionTo('1_upload.html');
        } else {
            window.location.href = '1_upload.html';
        }
    } else {
        // 显示上传区域
        showSection(uploadSection);
        hideSection(resultSection);
    }
}

// 显示指定区域
function showSection(section) {
    section.classList.remove('hidden');
    section.classList.add('active');
    
    // 保存当前视图
    currentView = section.id;
}

// 文本选择事件处理
function handleTextSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // 检查当前是否在结果展示区域
    const resultSection = document.getElementById('result-section');
    if (!resultSection || !resultSection.classList.contains('active')) {
        return;
    }
    
    // 获取选择区域的父元素
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;
    
    const parentElement = anchorNode.nodeType === 3 ? anchorNode.parentNode : anchorNode;
    
    // 检查选择是否在翻译文本或AI审文中
    const isInResultArea = parentElement.closest('#translated-text') || 
                          parentElement.closest('#ai-evaluation') || 
                          parentElement.closest('#grammar-errors');
    
    if (!isInResultArea) return;
    
    // 处理英文单词或短语选择
    if (text && text.length > 1) {
        selectedText = text;
        showSelectedTextInDialog();
        fetchWordDetails(text);
    }
}

// 在对话框中显示选中文本
function showSelectedTextInDialog() {
    const selectedTextEl = document.getElementById('selected-text');
    selectedTextEl.innerHTML = `
        <h4>已选中</h4>
        <p>"${selectedText}"</p>
    `;
}

// 获取单词详细信息
async function fetchWordDetails(text) {
    if (!/^[a-zA-Z\s]+$/.test(text)) {
        hideWordCard();
        return;
    }
    
    try {
        selectedWordData = await window.tencentTranslationDictionary.getChineseDefinition(text);
        displayWordDetails();
    } catch (error) {
        console.error('获取单词信息失败:', error);
        hideWordCard();
    }
}

// 显示单词详细信息
function displayWordDetails() {
    if (!selectedWordData) {
        hideWordCard();
        return;
    }
    
    const wordCard = document.getElementById('selected-word-card');
    const cardWord = document.getElementById('card-word');
    const cardPhonetic = document.getElementById('card-phonetic');
    const translationContent = document.getElementById('translation-content');
    const examplesContent = document.getElementById('examples-content');
    
    cardWord.textContent = selectedWordData.word;
    cardPhonetic.textContent = selectedWordData.phonetics?.[0]?.text || selectedWordData.phonetic || '';
    
    let translationHTML = '';
    const meanings = selectedWordData.meanings || [];
    
    meanings.slice(0, 3).forEach(meaning => {
        const definitions = meaning.definitions || [];
        definitions.slice(0, 2).forEach(def => {
            const chineseText = def.chinese || meaning.chinese;
            const context = def.context || meaning.context || meaning.partOfSpeech || '释义';
            
            if (!chineseText || chineseText === meaning.definition) {
                return;
            }
            
            translationHTML += `
                <div class="translation-item">
                    <div class="chinese">
                        <strong>${meaning.partOfSpeech || '释义'}:</strong> ${chineseText}
                        ${context ? `<br><small style="color: var(--text-secondary);">适用语境: ${context}</small>` : ''}
                    </div>
                </div>
            `;
        });
    });
    
    if (translationHTML === '') {
        translationHTML = `
            <div class="translation-item">
                <div class="chinese">
                    <strong>暂无中文释义</strong>
                    ${selectedWordData.phonetic ? `<br><small style="color: var(--text-secondary);">音标: ${selectedWordData.phonetic}</small>` : ''}
                </div>
            </div>
        `;
    }
    
    translationContent.innerHTML = translationHTML;
    
    let examplesHTML = '';
    let exampleCount = 0;
    const examples = selectedWordData.examples || [];
    
    examples.forEach(example => {
        if (exampleCount >= 3) return;
        
        const englishText = example.english || example.example || '';
        const chineseText = example.chinese || example.translation || '';
        const context = example.context || '实用例句';
        const usage = example.usage || '常用表达';
        
        if (englishText && chineseText) {
            examplesHTML += `
                <div class="example-item">
                    <div class="english">${englishText}</div>
                    <div class="chinese">${chineseText}</div>
                    <div style="margin-top: 5px; font-size: 12px; color: var(--text-secondary);">
                        <small>语境: ${context} | 用法: ${usage}</small>
                    </div>
                </div>
            `;
            exampleCount++;
        }
    });
    
    if (examplesHTML === '') {
        examplesHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无例句</p>';
    }
    
    examplesContent.innerHTML = examplesHTML;
    
    wordCard.style.display = 'block';
}

// 隐藏单词卡片
function hideWordCard() {
    const wordCard = document.getElementById('selected-word-card');
    wordCard.style.display = 'none';
}

// 使用Free Dictionary API获取单词信息
async function fetchWordInfo(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) {
            throw new Error('单词不存在');
        }
        
        const data = await response.json();
        const wordInfo = data[0];
        
        // 提取单词信息
        const phonetic = wordInfo.phonetics?.[0]?.text || '';
        const meanings = wordInfo.meanings.map(meaning => {
            return {
                partOfSpeech: meaning.partOfSpeech,
                definitions: meaning.definitions.map(def => ({
                    definition: def.definition,
                    example: def.example || ''
                }))
            };
        });
        
        return {
            word: wordInfo.word,
            phonetic,
            meanings,
            addedAt: new Date().toISOString(),
            frequency: 1
        };
    } catch (error) {
        console.error('获取单词信息失败:', error);
        // 如果API调用失败，返回基本的单词信息
        return {
            word,
            phonetic: '',
            meanings: [{ partOfSpeech: 'unknown', definitions: [{ definition: '', example: '' }] }],
            addedAt: new Date().toISOString(),
            frequency: 1
        };
    }
}

// 添加单词到单词本
async function addWordToWordbook() {
    if (!selectedWordData) return;
    
    const word = selectedWordData.word;
    
    // 检查单词是否已存在
    const existingWordIndex = wordbook.findIndex(w => w.word.toLowerCase() === word.toLowerCase());
    
    if (existingWordIndex >= 0) {
        // 已存在，更新完整信息并增加频率
        wordbook[existingWordIndex] = {
            ...selectedWordData,
            frequency: (wordbook[existingWordIndex].frequency || 0) + 1,
            lastReviewed: new Date().toISOString(),
            addedAt: wordbook[existingWordIndex].addedAt || new Date().toISOString()
        };
    } else {
        // 不存在，保存完整单词信息
        const wordInfo = {
            word: selectedWordData.word,
            phonetic: selectedWordData.phonetic || '',
            meanings: selectedWordData.meanings || [],
            examples: selectedWordData.examples || [],
            usage: selectedWordData.usage || {},
            source: selectedWordData.source || 'tencent',
            addedAt: new Date().toISOString(),
            frequency: 1
        };
        wordbook.push(wordInfo);
    }
    
    // 保存到localStorage
    saveWordbook();
    
    alert(`单词"${word}"已添加到单词本`);
}

// 保存单词本到localStorage
function saveWordbook() {
    localStorage.setItem('wordbook', JSON.stringify(wordbook));
    updateWordbookStats();
}

// 更新单词本统计信息
function updateWordbookStats() {
    if (totalWordsEl) {
        totalWordsEl.textContent = wordbook.length;
    }
}

// 隐藏指定区域
function hideSection(section) {
    section.classList.remove('active');
    section.classList.add('hidden');
}



// 初始化单词本功能
function initWordbook() {
    // 添加文本选择事件监听器
    document.addEventListener('mouseup', handleTextSelection);
    
    // 添加到单词本按钮事件
    const addToWordbookBtn = document.getElementById('add-to-wordbook-btn');
    if (addToWordbookBtn) {
        addToWordbookBtn.addEventListener('click', addWordToWordbook);
    }
    
    // 初始化时更新单词本统计
    updateWordbookStats();
}

// 日志记录功能
function logMessage(message, level = 'info') {
    // 屏蔽日志中的API密钥
    const sanitizedMessage = message.replace(/(api_key|apiKey|API_KEY)[:=]\s*['"]([^'"]+)['"]/gi, '$1: [REDACTED]');
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${sanitizedMessage}`;
    
    // 输出到控制台
    console.log(logEntry);
    
    // 存储到localStorage，最多保存100条日志
    let logs = JSON.parse(localStorage.getItem('translation_logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 100) {
        logs = logs.slice(-100); // 只保留最近100条日志
    }
    localStorage.setItem('translation_logs', JSON.stringify(logs));
    
    // 更新界面日志显示
    updateLogDisplay(logEntry, level);
}

// 更新日志显示
function updateLogDisplay(logEntry, level) {
    // 检查是否已存在日志显示元素
    let logContainer = document.getElementById('log-container');
    
    if (!logContainer) {
        // 创建日志显示容器
        logContainer = document.createElement('div');
        logContainer.id = 'log-container';
        logContainer.className = 'log-container';
        logContainer.innerHTML = '<h4>系统日志</h4><div id="log-content" class="log-content"></div>';
        
        // 将日志容器添加到页面底部
        document.body.appendChild(logContainer);
    }
    
    // 获取日志内容元素
    const logContent = document.getElementById('log-content');
    
    // 创建日志条目
    const logItem = document.createElement('div');
    logItem.className = `log-item log-${level}`;
    logItem.textContent = logEntry;
    
    // 添加到日志内容
    logContent.appendChild(logItem);
    
    // 自动滚动到底部
    logContent.scrollTop = logContent.scrollHeight;
    
    // 限制日志条目数量
    const logItems = logContent.querySelectorAll('.log-item');
    if (logItems.length > 50) {
        logItems[0].remove(); // 删除最旧的日志
    }
}

// 显示/隐藏日志面板
function toggleLogPanel() {
    let logContainer = document.getElementById('log-container');
    
    // 如果日志容器不存在，创建它
    if (!logContainer) {
        // 创建日志显示容器
        logContainer = document.createElement('div');
        logContainer.id = 'log-container';
        logContainer.className = 'log-container';
        logContainer.innerHTML = '<h4>系统日志</h4><div id="log-content" class="log-content"></div>';
        
        // 将日志容器添加到页面底部
        document.body.appendChild(logContainer);
        
        // 初始化显示状态
        logContainer.style.display = 'block';
        
        // 记录日志
        logMessage('日志面板已创建', 'info');
        return;
    }
    
    // 切换日志面板的显示状态
    logContainer.style.display = logContainer.style.display === 'none' ? 'block' : 'none';
    
    // 记录日志
    const status = logContainer.style.display === 'none' ? '隐藏' : '显示';
    logMessage(`日志面板已${status}`, 'info');
}

// 保存DeepSeek API密钥
function saveApiKey() {
    const apiKey = deepseekApiKey.value.trim();
    if (apiKey) {
        sessionStorage.setItem('deepseek_api_key', apiKey);
        alert('⚠️ 安全提示：\nAPI密钥已保存到当前浏览器会话！\n- 会话结束后密钥将自动删除\n- 请勿在公共设备上使用此功能\n- 请勿分享您的API密钥给他人\n\n为了安全起见，建议您在使用完毕后手动清除API密钥。');
        logMessage('DeepSeek API密钥已保存到会话存储', 'info');
    } else {
        alert('请输入有效的API密钥！');
        logMessage('用户尝试保存无效的API密钥', 'warning');
    }
}

// 加载DeepSeek API密钥
function loadApiKey() {
    const apiKey = sessionStorage.getItem('deepseek_api_key');
    if (apiKey) {
        deepseekApiKey.value = apiKey;
    }
}

// 调用DeepSeek API进行翻译质量评估
async function evaluateTranslationWithDeepSeek(chineseText, translation) {
    const apiKey = sessionStorage.getItem('deepseek_api_key');
    if (!apiKey) {
        logMessage('DeepSeek API密钥未配置', 'warning');
        throw new Error('DeepSeek API密钥未配置');
    }

    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    // 设计提示词让DeepSeek评估翻译质量
    const prompt = `请作为一名专业的英语翻译评估专家，评估以下中文到英文的翻译质量：

中文原文：${chineseText}

英文翻译：${translation}

请按照以下格式返回评估结果：
1. 评分（0-100分）：[具体分数]
2. 总体评价：[简要评价翻译质量]
3. 错误分析：[列出具体错误，包括错误类型（语法错误、拼写错误、用词不当等）、位置和详细说明]

请确保错误分析准确且具体，能够帮助用户改进翻译质量。`;

    try {
        logMessage('发送DeepSeek API请求评估翻译质量', 'info');
        
        // 创建AbortController用于设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3
            }),
            signal: controller.signal // 传递信号
        });
        
        // 清除超时定时器
        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorMessage = `DeepSeek API请求失败: ${response.status} ${response.statusText}`;
            
            // 尝试获取更详细的错误信息
            let detailedError = '';
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    detailedError = typeof errorData.error === 'string' ? errorData.error : 
                                    (errorData.error.message || JSON.stringify(errorData.error));
                    if (detailedError) {
                        errorMessage += ` - ${detailedError}`;
                    }
                } else if (errorData.message) {
                    errorMessage += ` - ${errorData.message}`;
                }
            } catch (e) {
                // 如果无法解析JSON错误响应，尝试获取文本响应
                try {
                    const textError = await response.text();
                    if (textError) {
                        errorMessage += ` - ${textError}`;
                    }
                } catch (textError) {
                    // 如果无法获取任何错误信息，继续使用基本错误信息
                }
            }
            
            logMessage(errorMessage, 'error');
            
            if (response.status === 401) {
                throw new Error('DeepSeek API密钥无效，请检查并重新配置');
            } else if (response.status === 403) {
                throw new Error('DeepSeek API权限不足，请检查密钥权限');
            } else if (response.status === 429) {
                throw new Error('DeepSeek API请求频率过高，请稍后再试或升级套餐');
            } else if (response.status === 404) {
                throw new Error('DeepSeek API端点不存在，请检查API URL配置');
            } else if (response.status >= 500) {
                throw new Error('DeepSeek API服务器错误，请稍后再试');
            } else {
                throw new Error(errorMessage);
            }
        }

        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            logMessage(`DeepSeek API返回非JSON响应: ${textResponse}`, 'error');
            throw new Error('DeepSeek API返回格式错误，预期JSON格式');
        }

        const data = await response.json();
        
        // 更严格的API响应格式检查
        if (!data || typeof data !== 'object') {
            logMessage(`DeepSeek API返回格式错误: ${JSON.stringify(data)}`, 'error');
            throw new Error('DeepSeek API返回格式错误，响应不是有效的JSON对象');
        }

        if (!Array.isArray(data.choices) || data.choices.length === 0) {
            logMessage(`DeepSeek API返回格式错误: ${JSON.stringify(data)}`, 'error');
            throw new Error('DeepSeek API返回格式错误，缺少必要的choices数组或数组为空');
        }

        const firstChoice = data.choices[0];
        if (!firstChoice || typeof firstChoice !== 'object') {
            logMessage(`DeepSeek API返回格式错误: ${JSON.stringify(data)}`, 'error');
            throw new Error('DeepSeek API返回格式错误，第一个choice不是有效的对象');
        }

        if (!firstChoice.message || typeof firstChoice.message !== 'object') {
            logMessage(`DeepSeek API返回格式错误: ${JSON.stringify(data)}`, 'error');
            throw new Error('DeepSeek API返回格式错误，缺少必要的message对象');
        }

        if (typeof firstChoice.message.content !== 'string' || !firstChoice.message.content.trim()) {
            logMessage(`DeepSeek API返回格式错误: ${JSON.stringify(data)}`, 'error');
            throw new Error('DeepSeek API返回格式错误，message.content不是有效的非空字符串');
        }

        const responseContent = firstChoice.message.content;
        logMessage('DeepSeek API请求成功，开始解析响应', 'info');
        
        // 解析API响应
        const evaluation = parseDeepSeekResponse(responseContent);
        
        // 确保解析结果包含必要的字段
        if (!evaluation) {
            throw new Error('解析DeepSeek API响应失败');
        }
        
        return evaluation;
    } catch (error) {
        // 分类处理不同类型的错误
        if (error.name === 'AbortError') {
            logMessage('DeepSeek API请求已中止', 'warning');
            throw new Error('DeepSeek API请求已中止，请重试');
        } else if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
            logMessage('DeepSeek API网络请求错误', 'error');
            throw new Error('DeepSeek API网络请求错误，请检查网络连接');
        } else {
            logMessage(`调用DeepSeek API时出错: ${error.message}`, 'error');
            throw error; // 重新抛出错误，让调用者处理
        }
    }
}

// 验证DeepSeek API密钥有效性
async function validateDeepSeekApiKey(apiKey) {
    if (!apiKey) {
        logMessage('DeepSeek API密钥未配置', 'warning');
        return false;
    }

    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: 'ping'
                    }
                ],
                max_tokens: 1,
                temperature: 0
            })
        });

        // 只有当响应状态为200时才返回true
        if (response.ok) {
            logMessage('DeepSeek API密钥有效', 'info');
            return true;
        } else {
            // 处理各种错误状态码
            let errorMessage = `DeepSeek API请求失败: ${response.status}`;
            
            if (response.status === 401) {
                errorMessage = 'DeepSeek API密钥无效';
            } else if (response.status === 429) {
                errorMessage = 'DeepSeek API请求频率过高';
            } else if (response.status >= 500) {
                errorMessage = 'DeepSeek API服务器错误';
            }
            
            logMessage(errorMessage, 'warning');
            // 任何API请求失败都应该使用备用评分系统，确保用户体验
            return false;
        }
    } catch (error) {
        // 捕获网络错误、超时等异常情况
        logMessage(`DeepSeek API密钥验证失败: ${error.message}`, 'error');
        return false;
    }
}

// 动态选择评分系统
async function selectScoringSystem() {
    const apiKey = sessionStorage.getItem('deepseek_api_key');
    let currentScoringSystem = 'fallback';
    let evaluationFunction = evaluateTranslationWithFallback;
    let statusMessage = '使用备用评分系统';
    let userMessage = '';

    if (apiKey) {
        logMessage('检测到DeepSeek API密钥，开始验证', 'info');
        const isValid = await validateDeepSeekApiKey(apiKey);
        
        if (isValid) {
            currentScoringSystem = 'deepseek';
            evaluationFunction = evaluateTranslationWithDeepSeek;
            statusMessage = '使用DeepSeek API评分系统';
            userMessage = '正在使用DeepSeek AI进行专业翻译质量评估...';
            logMessage(statusMessage, 'info');
        } else {
            logMessage('DeepSeek API密钥无效，使用备用评分系统', 'warning');
            userMessage = 'DeepSeek API不可用，正在使用内置AI评分系统...';
        }
    } else {
        logMessage('未检测到DeepSeek API密钥，使用备用评分系统', 'info');
        userMessage = '未配置DeepSeek API密钥，正在使用内置AI评分系统...';
    }

    // 更新UI状态显示
    updateScoringSystemStatus(statusMessage);
    
    // 显示用户友好的状态提示
    showUserMessage(userMessage);

    return {
        system: currentScoringSystem,
        evaluate: evaluationFunction,
        status: statusMessage
    };
}

// 显示用户友好的状态提示
function showUserMessage(message) {
    // 检查是否已存在消息容器
    let messageContainer = document.getElementById('user-message-container');
    
    if (!messageContainer) {
        // 创建消息容器
        messageContainer = document.createElement('div');
        messageContainer.id = 'user-message-container';
        messageContainer.className = 'user-message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.bottom = '20px';
        messageContainer.style.right = '20px';
        messageContainer.style.backgroundColor = '#f8f9fa';
        messageContainer.style.border = '1px solid #dee2e6';
        messageContainer.style.borderRadius = '4px';
        messageContainer.style.padding = '12px 16px';
        messageContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        messageContainer.style.zIndex = '1000';
        messageContainer.style.maxWidth = '300px';
        messageContainer.style.fontSize = '14px';
        messageContainer.style.color = '#495057';
        messageContainer.style.transition = 'opacity 0.3s ease';
        
        // 添加到页面
        document.body.appendChild(messageContainer);
    }
    
    // 设置消息内容
    messageContainer.textContent = message;
    
    // 显示消息
    messageContainer.style.opacity = '1';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        messageContainer.style.opacity = '0';
        // 动画结束后移除元素
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, 300);
    }, 3000);
}

// 备用AI评分系统
function evaluateTranslationWithFallback(chineseText, translation) {
    logMessage('使用备用评分系统评估翻译', 'info');
    
    // 使用现有的模拟评分逻辑作为备用系统
    // 根据翻译长度和质量生成评分
    const words = translation.split(' ');
    let errorCount = 0;
    
    // 生成错误分析
    const errors = [];
    
    // 简单的质量评估逻辑
    if (words.length < 5) {
        errorCount += 2; // 内容太短
        errors.push({
            type: '内容错误',
            description: '翻译内容过于简短，可能遗漏了重要信息',
            position: '整个句子',
            example: '建议补充更多细节'
        });
    } else if (words.length > 50) {
        errorCount += 1; // 内容太长
        errors.push({
            type: '内容错误',
            description: '翻译内容过长，可能包含冗余信息',
            position: '整个句子',
            example: '建议精简表达'
        });
    }
    
    // 检查冠词使用
    const commonGrammarIssues = ['a', 'an', 'the'];
    const missingArticles = commonGrammarIssues.filter(article => !translation.includes(article));
    errorCount += missingArticles.length;
    
    missingArticles.forEach(article => {
        errors.push({
            type: '语法错误',
            description: `可能缺少冠词 "${article}"`,
            position: '句子中适当位置',
            example: '例如：a book, an apple, the world'
        });
    });
    
    // 检查时态一致性（更精确的检测）
    const pastTenseWords = ['went', 'saw', 'ate', 'drank', 'wrote', 'had', 'was', 'were', 'did', 'made', 'took', 'gave', 'left', 'came', 'said'];
    const presentTenseWords = ['go', 'see', 'eat', 'drink', 'write', 'have', 'has', 'is', 'are', 'do', 'does', 'make', 'take', 'give', 'leave', 'come', 'say'];
    const progressiveTenseWords = ['is doing', 'are doing', 'was doing', 'were doing', 'has been doing', 'have been doing'];
    const perfectTenseWords = ['has done', 'have done', 'had done', 'will have done'];
    
    // 检测具体的时态混用情况
    const pastTenseMatches = [];
    const presentTenseMatches = [];
    const progressiveTenseMatches = [];
    const perfectTenseMatches = [];
    
    // 收集所有匹配的时态词
    for (const word of pastTenseWords) {
        if (translation.includes(word)) {
            pastTenseMatches.push(word);
        }
    }
    
    for (const word of presentTenseWords) {
        if (translation.includes(word)) {
            presentTenseMatches.push(word);
        }
    }
    
    for (const phrase of progressiveTenseWords) {
        if (translation.includes(phrase)) {
            progressiveTenseMatches.push(phrase);
        }
    }
    
    for (const phrase of perfectTenseWords) {
        if (translation.includes(phrase)) {
            perfectTenseMatches.push(phrase);
        }
    }
    
    // 检查过去时和现在时的混用
    if (pastTenseMatches.length > 0 && presentTenseMatches.length > 0) {
        errorCount += 2;
        errors.push({
            type: '语法错误',
            description: '存在过去时和现在时混用',
            position: '整个句子',
            example: `检测到过去时动词 ${pastTenseMatches.slice(0, 2).join(', ')} 和现在时动词 ${presentTenseMatches.slice(0, 2).join(', ')} 混用，建议统一时态`
        });
    }
    
    // 检查进行时的不当使用（例如：is go 而不是 is going）
    const progressiveBeVerbs = ['is', 'are', 'was', 'were', 'has been', 'have been'];
    for (const beVerb of progressiveBeVerbs) {
        const regex = new RegExp(`${beVerb}\s+(\w+)(?![ing])`, 'i');
        const match = translation.match(regex);
        if (match && match[1]) {
            // 检查是否是不规则动词的现在分词形式
            const verb = match[1];
            const irregularPresentParticiples = ['being', 'having', 'leaving', 'coming', 'going'];
            if (!irregularPresentParticiples.includes(verb.toLowerCase())) {
                errorCount += 1;
                errors.push({
                    type: '语法错误',
                    description: '进行时动词形式错误',
                    position: `包含 "${beVerb} ${verb}" 的位置`,
                    example: `进行时动词应该加ing形式，可能应该是 "${beVerb} ${verb}ing"`
                });
            }
        }
    }
    
    // 检查完成时的不当使用（例如：has go 而不是 has gone）
    const perfectHaveVerbs = ['has', 'have', 'had', 'will have'];
    for (const haveVerb of perfectHaveVerbs) {
        const regex = new RegExp(`${haveVerb}\s+(\w+)(?![ed]|gone|been|written|eaten|drunk|made|taken|given)`, 'i');
        const match = translation.match(regex);
        if (match && match[1]) {
            errorCount += 1;
            errors.push({
                type: '语法错误',
                description: '完成时动词形式错误',
                position: `包含 "${haveVerb} ${match[1]}" 的位置`,
                example: '完成时动词应该使用过去分词形式'
            });
        }
    }
    
    // 检查主谓一致（更精确的检测）
    
    // 1. 检测基本的主谓一致问题
    // 识别复数名词（以s/es结尾的常见名词，但排除某些特殊情况）
    const pluralNouns = words.filter(word => {
        const lowerWord = word.toLowerCase();
        return /(s|es)$/i.test(word) && 
               !['is', 'has', 'was', 'does', 'this', 'that'].includes(lowerWord) &&
               !/(ss|x|ch|sh)$/i.test(word); // 排除本身以ss/x/ch/sh结尾的单数名词
    });
    
    // 识别单数动词（第三人称单数形式）
    const singularVerbs = words.filter(word => 
        ['is', 'has', 'was', 'does'].includes(word.toLowerCase()) ||
        /(s|es)$/i.test(word) && !['you', 'we', 'they'].includes(word.toLowerCase())
    );
    
    // 识别复数动词
    const pluralVerbs = words.filter(word => 
        ['are', 'have', 'were', 'do'].includes(word.toLowerCase())
    );
    
    // 2. 检查明显的主谓不一致情况
    const hasPluralNoun = pluralNouns.length > 0;
    const hasSingularVerb = singularVerbs.length > 0;
    const hasPluralVerb = pluralVerbs.length > 0;
    
    // 复数名词 + 单数动词
    if (hasPluralNoun && hasSingularVerb && !hasPluralVerb) {
        errorCount += 2;
        errors.push({
            type: '语法错误',
            description: '存在主谓不一致',
            position: '整个句子',
            example: `复数名词 ${pluralNouns.slice(0, 2).join(', ')} 搭配了单数动词 ${singularVerbs.slice(0, 2).join(', ')}，复数名词应该搭配复数动词（如are/have）`
        });
    }
    
    // 单数名词 + 复数动词（排除you/we/they等特殊代词）
    if (!hasPluralNoun && hasPluralVerb && !hasSingularVerb && !translation.toLowerCase().includes('you ') && !translation.toLowerCase().includes('we ') && !translation.toLowerCase().includes('they ')) {
        errorCount += 2;
        errors.push({
            type: '语法错误',
            description: '存在主谓不一致',
            position: '整个句子',
            example: `单数名词搭配了复数动词 ${pluralVerbs.slice(0, 2).join(', ')}，单数名词应该搭配单数动词（如is/has）`
        });
    }
    
    // 3. 检测特定的主谓一致问题
    
    // "The" + 复数名词 + 单数动词
    const thePluralSingularRegex = /The\s+\w+(s|es)\s+(is|has|was|does)/i;
    const thePluralSingularMatch = translation.match(thePluralSingularRegex);
    if (thePluralSingularMatch) {
        errorCount += 2;
        errors.push({
            type: '语法错误',
            description: '存在主谓不一致',
            position: `包含 "${thePluralSingularMatch[0]}" 的位置`,
            example: `"the + 复数名词" 应该搭配复数动词，可能应该是 "The ${thePluralSingularMatch[1].slice(0, -1)} ${thePluralSingularMatch[2] === 'is' ? 'are' : thePluralSingularMatch[2] === 'has' ? 'have' : thePluralSingularMatch[2] === 'was' ? 'were' : 'do'}`
        });
    }
    
    // "A"/"An" + 复数名词
    const aPluralRegex = /(A|An)\s+\w+(s|es)\s+/i;
    const aPluralMatch = translation.match(aPluralRegex);
    if (aPluralMatch) {
        errorCount += 2;
        errors.push({
            type: '语法错误',
            description: '冠词和名词数不一致',
            position: `包含 "${aPluralMatch[0].trim()}" 的位置`,
            example: `"a/an" 应该搭配单数名词，复数名词应该搭配 "the" 或不使用冠词`
        });
    }
    
    // 检查拼写错误（更完善的检测）
    const commonMisspellings = {
        'teh': 'the',
        'wont': 'won\'t',
        'didnt': 'didn\'t',
        'cant': 'can\'t',
        'shouldnt': 'shouldn\'t',
        'couldnt': 'couldn\'t',
        'wouldnt': 'wouldn\'t',
        'dont': 'don\'t',
        'its': 'it\'s',
        'your': 'you\'re',
        'their': 'they\'re',
        'there': 'they\'re',
        'than': 'then',
        'then': 'than',
        'too': 'to',
        'to': 'too',
        'two': 'too',
        'lose': 'loose',
        'loose': 'lose',
        'affect': 'effect',
        'effect': 'affect',
        'accept': 'except',
        'except': 'accept',
        'weather': 'whether',
        'whether': 'weather'
    };
    
    for (const [misspelled, correct] of Object.entries(commonMisspellings)) {
        if (translation.includes(misspelled)) {
            errorCount += 1;
            errors.push({
                type: '拼写错误',
                description: `单词拼写错误`,
                position: `包含 "${misspelled}" 的位置`,
                example: `可能应该是 "${correct}"`
            });
        }
    }
    
    // 检查被动语态错误
    if (translation.includes('is ') && translation.includes('ed ') || 
        translation.includes('are ') && translation.includes('ed ') ||
        translation.includes('was ') && translation.includes('ed ') ||
        translation.includes('were ') && translation.includes('ed ')) {
        const passiveMatch = translation.match(/(is|are|was|were)\s+([a-zA-Z]+ed)\s+/);
        if (passiveMatch) {
            // 简单检测：如果被动语态使用不当
            errorCount += 1;
            errors.push({
                type: '语法错误',
                description: '可能存在被动语态使用不当',
                position: `包含 "${passiveMatch[0]}" 的位置`,
                example: '建议检查被动语态的使用是否恰当'
            });
        }
    }
    
    // 检查比较级最高级错误
    const comparativeWords = ['more', 'better', 'worse', 'faster', 'slower'];
    const superlativeWords = ['most', 'best', 'worst', 'fastest', 'slowest'];
    
    const hasComparative = comparativeWords.some(word => translation.includes(word));
    const hasSuperlative = superlativeWords.some(word => translation.includes(word));
    
    if (hasComparative && hasSuperlative) {
        errorCount += 1;
        errors.push({
            type: '语法错误',
            description: '可能存在比较级和最高级混用',
            position: '整个句子',
            example: '建议统一使用比较级或最高级'
        });
    }
    
    // 检查动词形式错误（简单检测不规则动词）
    const irregularVerbs = {
        'go': ['went', 'gone'],
        'see': ['saw', 'seen'],
        'eat': ['ate', 'eaten'],
        'drink': ['drank', 'drunk'],
        'write': ['wrote', 'written'],
        'speak': ['spoke', 'spoken'],
        'break': ['broke', 'broken'],
        'choose': ['chose', 'chosen'],
        'do': ['did', 'done'],
        'have': ['had', 'had']
    };
    
    for (const [baseForm, [pastTense, pastParticiple]] of Object.entries(irregularVerbs)) {
        // 检查错误的过去式形式
        if (translation.includes(`${baseForm}ed`) || translation.includes(`${baseForm}t`) && !['hadt', 'didth', 'hast'].includes(`${baseForm}t`)) {
            errorCount += 1;
            errors.push({
                type: '语法错误',
                description: `动词 "${baseForm}" 的过去式形式错误`,
                position: `包含 "${baseForm}ed" 或 "${baseForm}t" 的位置`,
                example: `正确过去式应为 "${pastTense}"`
            });
        }
    }
    
    // 计算评分，确保分数在合理范围内
    const score = Math.max(0, Math.min(100, Math.round(100 - errorCount * 5)));
    
    // 生成总体评价
    let evaluation = '翻译质量良好';
    if (score < 80) {
        evaluation = score < 60 ? '翻译质量需要改进' : '翻译质量一般';
    }
    
    return {
        score: score,
        evaluation: evaluation,
        errors: errors
    };
}

// 更新评分系统状态显示
function updateScoringSystemStatus(statusMessage) {
    // 检查是否已存在状态显示元素
    let statusElement = document.getElementById('scoring-system-status');
    
    if (!statusElement) {
        // 创建状态显示元素
        statusElement = document.createElement('div');
        statusElement.id = 'scoring-system-status';
        statusElement.className = 'scoring-system-status';
        
        // 将状态显示元素添加到合适的位置（API配置区域下方）
        const apiConfig = document.querySelector('.api-config');
        if (apiConfig) {
            apiConfig.appendChild(statusElement);
        }
    }
    
    // 更新状态信息
    statusElement.textContent = statusMessage;
    
    // 设置不同的样式以区分状态
    if (statusMessage.includes('DeepSeek')) {
        statusElement.style.color = '#155724';
        statusElement.style.backgroundColor = '#d4edda';
        statusElement.style.border = '1px solid #c3e6cb';
    } else {
        statusElement.style.color = '#856404';
        statusElement.style.backgroundColor = '#fff3cd';
        statusElement.style.border = '1px solid #ffeeba';
    }
    
    // 添加基本样式
    statusElement.style.padding = '8px 12px';
    statusElement.style.borderRadius = '4px';
    statusElement.style.marginTop = '10px';
    statusElement.style.fontSize = '14px';
}

// 解析DeepSeek API响应
function parseDeepSeekResponse(responseContent) {
    // 初始化结果对象
    const result = {
        score: 80, // 默认分数，避免解析失败时分数为0
        evaluation: '翻译质量良好', // 默认评价
        errors: []
    };

    // 提取评分 - 支持多种格式
    const scoreRegexes = [
        /1\.\s*评分[：:]\s*(\d+)/,
        /评分[：:]\s*(\d+)/,
        /Score[：:]\s*(\d+)/,
        /\b(\d+)\s*分\b/, // 匹配"80分"这样的格式
        /\b(\d+)\s*\/\s*100\b/, // 匹配"80/100"这样的格式
        /\b(\d+)\s*points?\b/i, // 匹配"80 points"这样的格式
        /rated\s*at\s*(\d+)\s*points?/i // 匹配"rated at 80 points"这样的格式
    ];
    
    for (const regex of scoreRegexes) {
        const scoreMatch = responseContent.match(regex);
        if (scoreMatch) {
            result.score = parseInt(scoreMatch[1]);
            break;
        }
    }

    // 提取总体评价 - 支持多种格式
    const evalRegexes = [
        /2\.\s*总体评价[：:]\s*([^\n]+)/,
        /总体评价[：:]\s*([^\n]+)/,
        /Overall\s*Evaluation[：:]\s*([^\n]+)/,
        /Overall\s*Assessment[：:]\s*([^\n]+)/,
        /翻译评价[：:]\s*([^\n]+)/,
        /Translation\s*Assessment[：:]\s*([^\n]+)/
    ];
    
    for (const regex of evalRegexes) {
        const evalMatch = responseContent.match(regex);
        if (evalMatch) {
            result.evaluation = evalMatch[1].trim();
            break;
        }
    }

    // 提取错误分析部分 - 支持多种格式
    const errorRegexes = [
        /3\.\s*错误分析[：:]\s*([\s\S]*)/,
        /错误分析[：:]\s*([\s\S]*)/,
        /Error\s*Analysis[：:]\s*([\s\S]*)/,
        /具体错误[：:]\s*([\s\S]*)/,
        /Detailed\s*Errors[：:]\s*([\s\S]*)/,
        /存在的问题[：:]\s*([\s\S]*)/,
        /Issues[：:]\s*([\s\S]*)/
    ];
    
    let errorAnalysis = '';
    for (const regex of errorRegexes) {
        const errorAnalysisMatch = responseContent.match(regex);
        if (errorAnalysisMatch) {
            errorAnalysis = errorAnalysisMatch[1];
            break;
        }
    }
    
    if (errorAnalysis) {
        // 匹配每个错误项（支持多种格式开头：数字、星号、破折号、•、▪、□、▫、○等）
        const errorItems = errorAnalysis.split(/\n\s*[\d\*\-•▪□▫○●◦]\s+/).filter(item => item.trim());
        
        errorItems.forEach((errorItem, index) => {
            const item = errorItem.trim();
            if (!item) return;

            // 尝试提取错误类型和描述
            let errorType = '其他错误';
            let description = item;
            let position = `第${index + 1}处错误`;
            let example = '';

            // 识别错误类型 - 扩展错误类型和关键词
            const errorTypeMap = {
                '语法错误': ['语法错误', 'grammar error', 'syntax error', 'sentence structure'],
                '拼写错误': ['拼写错误', 'spelling error', 'typo', 'misspelled'],
                '用词不当': ['用词不当', 'word choice', 'inappropriate word', 'wrong word', 'word usage'],
                '搭配错误': ['搭配错误', 'collocation error', 'collocation'],
                '时态错误': ['时态错误', 'tense error', 'verb tense', 'tense consistency'],
                '语序错误': ['语序错误', 'word order error', 'word order', 'sentence order'],
                '标点错误': ['标点错误', 'punctuation error', 'punctuation'],
                '主谓一致': ['主谓一致', 'subject-verb agreement', 'agreement'],
                '冠词错误': ['冠词错误', 'article error', 'article usage', 'a/an/the'],
                '介词错误': ['介词错误', 'preposition error', 'preposition usage'],
                '单复数错误': ['单复数错误', 'number error', 'singular/plural', 'countable/uncountable'],
                '表达不准确': ['表达不准确', 'inaccurate expression', 'ambiguous', 'unclear'],
                '漏译': ['漏译', 'omission', 'missing information'],
                '多译': ['多译', 'redundancy', 'unnecessary word'],
                '大小写错误': ['大小写错误', 'capitalization error', 'capitalization']
            };
            
            for (const [type, keywords] of Object.entries(errorTypeMap)) {
                if (keywords.some(keyword => item.toLowerCase().includes(keyword.toLowerCase()))) {
                    errorType = type;
                    break;
                }
            }

            // 尝试提取位置信息 - 支持更多格式
            const positionRegexes = [
                /位置[：:]\s*([^\n,]+)/,
                /Position[：:]\s*([^\n,]+)/,
                /第(\d+)个单词/,
                /单词\s*"([^"]+)"/,
                /word\s*"([^"]+)"/,
                /at\s*word\s*(\d+)/,
                /在\s*(第.*?处)/,
                /位于\s*(.*?)\s*附近/,
                /near\s*"([^"]+)"/i,
                /at\s*position\s*(\d+)/i,
                /第(\d+)句/,
                /sentence\s*(\d+)/i
            ];
            
            for (const regex of positionRegexes) {
                const positionMatch = item.match(regex);
                if (positionMatch) {
                    position = positionMatch[1].trim();
                    break;
                }
            }

            // 尝试提取示例信息 - 支持更多格式
            const exampleRegexes = [
                /示例[：:]\s*([^\n]+)/,
                /Example[：:]\s*([^\n]+)/,
                /可能应该是[：:]?\s*"([^"]+)"/,
                /should\s*be[：:]?\s*"([^"]+)"/i,
                /正确表达[：:]\s*"([^"]+)"/,
                /correct\s*form[：:]?\s*"([^"]+)"/i,
                /建议[：:]\s*"([^"]+)"/,
                /suggestion[：:]?\s*"([^"]+)"/i,
                /改为[：:]\s*"([^"]+)"/,
                /change\s*to[：:]?\s*"([^"]+)"/i
            ];
            
            for (const regex of exampleRegexes) {
                const exampleMatch = item.match(regex);
                if (exampleMatch) {
                    example = exampleMatch[1].trim();
                    break;
                }
            }

            result.errors.push({
                type: errorType,
                description: description,
                position: position,
                example: example
            });
        });
    }

    // 确保分数在0-100之间
    result.score = Math.max(0, Math.min(100, result.score));

    // 如果没有提取到错误信息，根据分数调整评价
    if (result.errors.length === 0) {
        if (result.score >= 90) {
            result.evaluation = '翻译质量优秀，未发现明显错误';
        } else if (result.score >= 80) {
            result.evaluation = '翻译质量良好，基本符合要求';
        } else if (result.score >= 70) {
            result.evaluation = '翻译质量一般，有一些小问题';
        }
    }

    return result;
}

// 初始化练习页面
function initPracticePage() {
    // 恢复状态
    loadAppState();
    
    // 检查当前页面类型
    const isSentencePractice = window.location.pathname.endsWith('4_sentence_practice.html');
    const isPassagePractice = window.location.pathname.endsWith('4_passage_practice.html');
    
    if (isSentencePractice) {
        // 初始化分句练习页面
        sentences = appState.sentences || [];
        currentSentenceIndex = appState.currentSentenceIndex || 0;
        userTranslations = appState.userTranslations || [];
        currentSplitType = appState.currentSplitType || 'byLine';
        shouldShowMenu = appState.shouldShowMenu || false;
        
        // 如果sentences为空，尝试从sentenceSplits恢复
        if (sentences.length === 0 && appState.sentenceSplits) {
            sentences = appState.sentenceSplits[currentSplitType];
        }
        
        // 更新当前句子
        if (sentences.length > 0) {
            updateCurrentSentence();
        }
        
        // 根据shouldShowMenu决定是否显示练习模式选择器
        if (practiceModeSelector) {
            if (shouldShowMenu) {
                practiceModeSelector.classList.remove('hidden');
            } else {
                practiceModeSelector.classList.add('hidden');
            }
        }
        
        // 开始计时
        startTimer();
        
        // 聚焦输入框
        if (englishInput) englishInput.focus();
        
        // 添加返回模式选择的事件监听器
        const backToModeBtn = document.getElementById('back-to-mode');
        if (backToModeBtn) {
            backToModeBtn.addEventListener('click', () => {
                window.location.href = '3_mode_selection.html';
            });
        }
    } else if (isPassagePractice) {
        // 初始化整篇练习页面
        if (passages && appState.currentPassageIndex >= 0) {
            const passageText = passages[appState.currentPassageIndex].replace(/\n/g, ' ');
            if (chinesePassage) chinesePassage.innerHTML = passageText;
        }
        
        // 开始计时
        startTimer();
        
        // 聚焦输入框
        if (passageInput) passageInput.focus();
        
        // 添加返回模式选择的事件监听器
        const backToModeBtn = document.getElementById('back-to-mode');
        if (backToModeBtn) {
            backToModeBtn.addEventListener('click', () => {
                window.location.href = '3_mode_selection.html';
            });
        }
    }
}

// 初始化文档选择页面
function initDocumentSelectionPage() {
    // 恢复状态
    loadAppState();
    
    // 重新渲染文章列表
    if (passageList) {
        showPassageSelection();
    }
    
    // 添加返回上传页面的事件监听器
    const backToUploadBtn = document.getElementById('back-to-upload');
    if (backToUploadBtn) {
        backToUploadBtn.addEventListener('click', () => {
            window.location.href = '1_upload.html';
        });
    }
}

// 初始化模式选择页面
function initModeSelectionPage() {
    // 恢复状态
    loadAppState();
}

// 初始化评估结果页面
function initResultPage() {
    // 检查是否是查看历史版本
    const urlParams = new URLSearchParams(window.location.search);
    const isHistoryVersion = urlParams.get('historyVersion') === 'true';
    
    if (isHistoryVersion) {
        // 从sessionStorage加载历史版本数据
        const historyVersion = JSON.parse(sessionStorage.getItem('historyVersionToView'));
        
        if (historyVersion) {
            // 恢复历史版本数据
            currentMode = historyVersion.mode;
            userTranslations = historyVersion.translations;
            passages = [historyVersion.passageContent];
            currentPassageIndex = 0;
            
            // 显示历史版本信息
            showHistoryVersionResult(historyVersion);
            
            // 显示返回历史按钮，隐藏其他按钮
            const backToHistoryBtn = document.getElementById('back-to-history');
            const backToSelectBtn = document.getElementById('back-to-select');
            const uploadNewBtn = document.getElementById('upload-new');
            
            if (backToHistoryBtn) {
                backToHistoryBtn.style.display = 'inline-block';
                backToHistoryBtn.addEventListener('click', function() {
                    window.location.href = 'translation-history.html';
                });
            }
            
            if (backToSelectBtn) {
                backToSelectBtn.style.display = 'none';
            }
            
            if (uploadNewBtn) {
                uploadNewBtn.style.display = 'none';
            }
        }
    } else {
        // 从localStorage加载评估结果
        const evaluationResult = JSON.parse(localStorage.getItem('evaluationResult'));
        
        if (evaluationResult) {
            // 先恢复当前模式和用户翻译
            currentMode = evaluationResult.currentMode;
            userTranslations = evaluationResult.userTranslations;
            
            // 然后显示结果（此时userTranslations已经被恢复）
            showResult(evaluationResult.timeString, evaluationResult.score, evaluationResult.detailedErrors, evaluationResult.aiEvaluationText);
        }
        
        // 隐藏返回历史按钮
        const backToHistoryBtn = document.getElementById('back-to-history');
        if (backToHistoryBtn) {
            backToHistoryBtn.style.display = 'none';
        }
    }
    
    // 初始化单词本功能（用于文本选择和添加到单词本）
    initWordbook();
}

// 显示历史版本结果
function showHistoryVersionResult(historyVersion) {
    // 设置结果
    if (resultTime) {
        const timeString = new Date(historyVersion.timestamp).toLocaleString();
        resultTime.textContent = timeString;
    }
    
    if (resultScore) {
        // 如果历史版本中有评分，使用它；否则显示"历史记录"
        resultScore.textContent = historyVersion.score ? `${historyVersion.score}/100` : '历史记录';
    }
    
    // 如果有详细的错误信息，使用showResult函数显示完整内容
    if (historyVersion.detailedErrors && historyVersion.detailedErrors.length >= 0) {
        showResult(historyVersion.timeString || new Date(historyVersion.timestamp).toLocaleString(), 
                   historyVersion.score || 0, 
                   historyVersion.detailedErrors,
                   historyVersion.aiEvaluation);
    } else {
        // 如果没有详细错误信息，显示基本的历史版本信息
        if (grammarErrors) {
            grammarErrors.innerHTML = '';
            const li = document.createElement('li');
            li.textContent = `这是历史翻译记录，保存于 ${new Date(historyVersion.timestamp).toLocaleString()}`;
            li.style.backgroundColor = '#e2e3e5';
            li.style.borderColor = '#d6d8db';
            li.style.color = '#383d41';
            grammarErrors.appendChild(li);
        }
        
        // 显示AI评语
        const aiEvaluation = document.getElementById('ai-evaluation');
        if (aiEvaluation) {
            aiEvaluation.innerHTML = `
                <p><strong>翻译模式：</strong>${historyVersion.mode === 'sentence' ? '分句翻译' : '整篇翻译'}</p>
                <p><strong>文件名：</strong>${historyVersion.filename}</p>
                <p><strong>描述：</strong>${historyVersion.description}</p>
                <p><strong>保存时间：</strong>${new Date(historyVersion.timestamp).toLocaleString()}</p>
            `;
        }
    }
    
    // 显示翻译文本
    if (translatedText) {
        translatedText.innerHTML = '';
        historyVersion.translations.forEach((translation, index) => {
            const p = document.createElement('p');
            p.style.marginBottom = '15px';
            p.style.lineHeight = '1.6';
            
            if (historyVersion.mode === 'sentence') {
                p.innerHTML = `<strong>句子 ${index + 1}：</strong><br>${translation}`;
            } else {
                p.innerHTML = `<strong>翻译内容：</strong><br>${translation}`;
            }
            
            translatedText.appendChild(p);
        });
    }
}

// 修改现有的DOMContentLoaded事件监听器
// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 检查URL参数或sessionStorage，是否需要重新加载历史文件
    checkForReloadHistoryFile();
    
    // 检查当前页面类型并调用相应的初始化函数
    const isSentencePractice = window.location.pathname.endsWith('4_sentence_practice.html');
    const isPassagePractice = window.location.pathname.endsWith('4_passage_practice.html');
    const isDocumentSelection = window.location.pathname.endsWith('2_document_selection.html');
    const isModeSelection = window.location.pathname.endsWith('3_mode_selection.html');
    const isResultPage = window.location.pathname.endsWith('4_result.html');
    const isEvaluationPage = window.location.pathname.endsWith('4_evaluation.html');
    
    if (isSentencePractice || isPassagePractice) {
        initPracticePage();
    } else if (isDocumentSelection) {
        initDocumentSelectionPage();
    } else if (isModeSelection) {
        initModeSelectionPage();
    } else if (isResultPage) {
        initResultPage();
    } else if (isEvaluationPage) {
        initResultPage(); // 评价页面使用相同的初始化逻辑
    }
    
    // 调用原有的初始化函数
    initEventListeners();
    loadApiKey(); // 加载已保存的API密钥
    initWordbook(); // 初始化单词本功能
});

// 检查是否需要重新加载历史文件
function checkForReloadHistoryFile() {
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const reloadFile = urlParams.get('reloadFile');
    
    if (reloadFile === 'true') {
        // 从sessionStorage获取历史文件数据
        const reloadedFileData = sessionStorage.getItem('reloadedHistoryFile');
        if (reloadedFileData) {
            try {
                const fileData = JSON.parse(reloadedFileData);
                
                // 保存历史文件数据到应用状态
                if (fileData.content && Array.isArray(fileData.content)) {
                    passages = fileData.content;
                    appState.passages = passages;
                    saveAppState();
                    
                    // 跳转到文档选择页面
                    if (window.PageTransition) {
                        PageTransition.transitionTo('2_document_selection.html');
                    } else {
                        window.location.href = '2_document_selection.html';
                    }
                }
            } catch (error) {
                console.error('Error reloading history file:', error);
            }
            
            // 清除sessionStorage中的数据
            sessionStorage.removeItem('reloadedHistoryFile');
        }
    }
}
// 主题切换功能
function initThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themePanel = document.getElementById('theme-panel');
    const closeThemePanel = document.getElementById('close-theme-panel');
    const colorOptions = document.querySelectorAll('.color-option');
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    
    // 加载用户保存的主题设置
    loadThemeSettings();
    
    // 切换主题面板显示/隐藏
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            if (themePanel) {
                themePanel.classList.toggle('hidden');
                themeToggleBtn.setAttribute('aria-expanded', !themePanel.classList.contains('hidden'));
            }
        });
        
        // 键盘导航支持
        themeToggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                themeToggleBtn.click();
            }
            if (e.key === 'Escape') {
                if (themePanel) {
                    themePanel.classList.add('hidden');
                    themeToggleBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }
    
    // 关闭主题面板
    if (closeThemePanel) {
        closeThemePanel.addEventListener('click', () => {
            if (themePanel) {
                themePanel.classList.add('hidden');
                if (themeToggleBtn) {
                    themeToggleBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }
    
    // 点击页面其他地方关闭主题面板
    if (themePanel && themeToggleBtn) {
        document.addEventListener('click', (e) => {
            if (!themePanel.classList.contains('hidden') && 
                !themeToggleBtn.contains(e.target) && 
                !themePanel.contains(e.target)) {
                themePanel.classList.add('hidden');
                themeToggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // 主题颜色切换
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const color = option.getAttribute('data-color');
            setThemeColor(color);
            
            // 更新选中状态
            colorOptions.forEach(opt => {
                opt.setAttribute('aria-pressed', 'false');
            });
            option.setAttribute('aria-pressed', 'true');
        });
    });
    
    // 独立模式切换按钮的事件监听
    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', () => {
            toggleDarkMode();
        });
        
        // 独立模式切换按钮的键盘支持
        modeToggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                modeToggleBtn.click();
            }
        });
    }
}

// 设置主题颜色
function setThemeColor(color) {
    document.documentElement.setAttribute('data-theme', color);
    localStorage.setItem('theme_color', color);
    
    // 更新加载指示器的颜色（如果存在）
    updateLoadingIndicatorTheme();
}

// 切换暗黑模式
function toggleDarkMode() {
    const currentMode = document.documentElement.getAttribute('data-dark-mode');
    const newMode = currentMode === 'true' ? 'false' : 'true';
    document.documentElement.setAttribute('data-dark-mode', newMode);
    localStorage.setItem('dark_mode', newMode);
    
    // 更新独立的模式切换按钮
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    if (modeToggleBtn) {
        modeToggleBtn.textContent = newMode === 'true' ? '☀️' : '🌙';
        modeToggleBtn.setAttribute('aria-pressed', newMode);
    }
    
    // 更新加载指示器的主题（如果存在）
    updateLoadingIndicatorTheme();
}

// 加载主题设置
function loadThemeSettings() {
    // 加载主题颜色
    const savedColor = localStorage.getItem('theme_color') || 'blue';
    setThemeColor(savedColor);
    
    // 更新颜色选项的选中状态
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        const color = option.getAttribute('data-color');
        option.setAttribute('aria-pressed', color === savedColor);
    });
    
    // 加载暗黑模式
    const savedDarkMode = localStorage.getItem('dark_mode') || 'false';
    document.documentElement.setAttribute('data-dark-mode', savedDarkMode);
    
    // 更新独立的模式切换按钮
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    if (modeToggleBtn) {
        modeToggleBtn.textContent = savedDarkMode === 'true' ? '☀️' : '🌙';
        modeToggleBtn.setAttribute('aria-pressed', savedDarkMode);
    }
}