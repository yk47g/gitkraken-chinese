/**
 * @file 比较器页面的交互、JSON 差异分析与翻译逻辑。
 */

/* global Vue, axios, $, CryptoJS */

/** OpenAI 默认模型标识。 */
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

/** DeepSeek 默认模型标识。 */
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-flash';

/** OpenAI 公开价格页面地址。 */
const OPENAI_PUBLIC_PRICING_URL =
    'https://r.jina.ai/https://developers.openai.com/api/docs/pricing.md';

/** DeepSeek 公开价格页面地址。 */
const DEEPSEEK_PUBLIC_PRICING_URL =
    'https://r.jina.ai/https://api-docs.deepseek.com/quick_start/pricing';

/** 按每 100 万 Token 输出价格划分的模型价格档位。 */
const PRICE_TIER_LIMITS = [
  {max: 1, label: '贼拉便宜'},
  {max: 5, label: '便宜'},
  {max: 15, label: '中等'},
  {max: 30, label: '较贵'},
  {max: Infinity, label: '贼拉贵'}
];

/** 单次批量翻译包含的条目数。 */
const TRANSLATION_BATCH_SIZE = 20;

/** 单批翻译的最大尝试次数。 */
const TRANSLATION_MAX_ATTEMPTS = 2;

/** 批量翻译使用的分隔符。 */
const TRANSLATION_SEPARATOR = '|||SEP|||';

/** 重试翻译前的等待时间（毫秒）。 */
const TRANSLATION_RETRY_DELAY = 1000;

/** 有道 JSONP 请求的超时时间（毫秒）。 */
const YOUDAO_REQUEST_TIMEOUT = 15000;

const app = Vue.createApp({
  data() {
    return {
      /**
       * 文件内容解析（key/value）
       */
      // 新版英文
      menuStringsNewEn: [],
      // 旧版中文
      menuStringsOldZh: [],
      // 旧版英文
      menuStringsOldEn: [],
      // 新版英文文件原始行内容(含空行/大括号/逗号)
      newFileRawLines: [],
      // 结果差异
      diffItems: [],
      // 当前控制台生成的内容
      generatedContent: '',

      // 提示
      showOldEnError: false,
      showNewEnError: false,
      showOldZhError: false,
      errorMsg: null,
      saveMessage: '',
      saveMessageType: 'success',
      // 翻译状态
      isTranslating: false,
      translationMessage: '',
      translationMessageType: 'success',
      /**
       * API 配置
       */
      // 默认 API
      selectedApi: 'openai',
      // OpenAI API 配置
      openai: {
        apiKey: '',
        // 默认模型
        model: DEFAULT_OPENAI_MODEL,
        // 默认使用服务端的推理强度
        reasoningEffort: '',
        temperature: 0.2,
      },
      // OpenAI 可选模型
      openaiModels: [
        {id: DEFAULT_OPENAI_MODEL, label: `${DEFAULT_OPENAI_MODEL}（推荐）`}
      ],
      // OpenAI 模型价格
      openaiPriceMap: {},
      // DeepSeek API 配置
      deepseek: {
        apiKey: '',
        // 默认模型
        model: DEFAULT_DEEPSEEK_MODEL,
        // 默认使用服务端的推理强度
        reasoningEffort: '',
        temperature: 0.2,
      },
      // DeepSeek 可选模型
      deepseekModels: [
        {id: DEFAULT_DEEPSEEK_MODEL, label: `${DEFAULT_DEEPSEEK_MODEL}（推荐）`}
      ],
      // DeepSeek 模型价格
      deepseekPriceMap: {},
      // 模型列表状态提示
      modelMessage: '',
      modelMessageType: 'success',
      // 各 API 的模型列表防抖计时器
      modelLoadTimers: {
        openai: null,
        deepseek: null
      },
      // 各 API 的模型列表请求序号
      modelRequestIds: {
        openai: 0,
        deepseek: 0
      },
      // 各 API 是否已完成模型加载
      modelsLoadCompleted: {
        openai: false,
        deepseek: false
      },
      // 用于计算 DeepSeek 当前峰谷时段
      currentUtcTime: new Date(),
      // DeepSeek 峰谷时段更新计时器
      deepseekTimeTimer: null,
      // 有道 API 配置
      youdao: {
        appKey: '',
        appSecret: '',
        from: 'en',
        to: 'zh-CHS',
      },

      // 固定翻译词汇
      fixedTranslations: [
        {term: 'Bisect', translation: '二分查找'},
        {term: 'Cherry Pick', translation: '拣选'},
        {term: 'Collaborator', translation: '协作者'},
        {term: 'Compose', translation: '编写'},
        {term: 'Conventional Commits', translation: '约定式提交'},
        {term: 'DETACHED HEAD', translation: '游离 HEAD'},
        {term: 'Email', translation: '邮箱'},
        {term: 'Email Address', translation: '邮箱'},
        {term: 'Filter', translation: '过滤器'},
        {term: 'Fork', translation: '派生/派生仓库'},
        {term: 'GitKraken Desktop', translation: 'GitKraken 桌面版'},
        {term: 'Graph', translation: '图'},
        {term: 'Git GUI', translation: 'Git 图形界面'},
        {term: 'Git Provider', translation: 'Git 托管'},
        {term: 'Hunk', translation: '区块'},
        {term: 'Others', translation: '其它'},
        {term: 'Pull Request', translation: '拉取请求'},
        {term: 'Rebase', translation: '变基'},
        {term: 'Repo', translation: '仓库'},
        {term: 'Solo', translation: '单独显示'},
        {term: 'Stage', translation: '暂存'},
        {term: 'Stash', translation: '贮藏'},
        {term: 'Working directory', translation: '工作目录'},
        {term: 'Workspace', translation: '工作区'}
      ],

      // 需要保留的专有名词数组
      keepTranslations: [
        'Launchpad',
        'WIP',
        'Gitflow',
        'AI Token',
      ]
    };
  },
  computed: {
    /**
     * 返回 DeepSeek 当前所处的峰谷时段。
     *
     * @return {{label: string, className: string}} 时段名称与样式。
     */
    deepseekTimeStatus() {
      const day = this.currentUtcTime.getUTCDay();
      const hour = this.currentUtcTime.getUTCHours();
      const isWeekday = day >= 1 && day <= 5;
      const isPeak = isWeekday && (
          (hour >= 1 && hour < 4) ||
          (hour >= 6 && hour < 10)
      );

      return isPeak
          ? {label: '梁文峰', className: 'peak'}
          : {label: '梁文谷', className: 'off-peak'};
    }
  },
  mounted() {
    this.updateDeepSeekTime();
    this.deepseekTimeTimer = setInterval(this.updateDeepSeekTime, 30000);
  },
  beforeUnmount() {
    if (this.deepseekTimeTimer) {
      clearInterval(this.deepseekTimeTimer);
    }
  },
  methods: {
    /**
     * 更新用于 DeepSeek 峰谷判断的 UTC 时间。
     */
    updateDeepSeekTime() {
      this.currentUtcTime = new Date();
    },

    /**
     * 导出JSON文件
     */
    exportJson() {
      const content = this.generatedContent;
      if (!content.trim()) {
        this.errorMsg = '没有可以导出的内容';
        return;
      }

      const blob = new Blob([content], {type: 'application/json'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'strings.json';
      link.click();

      URL.revokeObjectURL(link.href);
    },

    /**
     * 复制到剪切板
     *
     * @returns {Promise<void>}
     */
    async copyToClipboard() {
      const content = this.generatedContent;
      if (!content.trim()) {
        this.errorMsg = '没有可以复制的内容';
        return;
      }

      try {
        await navigator.clipboard.writeText(content);
      } catch (e) {
        this.errorMsg = '复制失败，请手动复制';
      }
    },

    /**
     * 读取文件
     * @param type 'newEn' (新版英文) | 'oldZh' (旧版中文) | 'oldEN' (旧版英文)
     */
    loadFile(type) {
      this.showOldEnError = false;

      let inputId;
      switch (type) {
        case 'newEn':
          inputId = 'newEnFile';
          break;
        case 'oldZh':
          inputId = 'oldZhFile';
          break;
        case 'oldEN':
          inputId = 'oldEnFile';
          break;
      }
      const fileInput = document.getElementById(inputId);
      if (!fileInput.files[0]) {
        this.errorMsg = '未选择文件';
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        const rawText = e.target.result;
        if (typeof rawText !== 'string') return;
        try {
          // 用 JSON.parse 获取 key-value
          const jsonObj = JSON.parse(rawText);
          if (type === 'newEn') {
            this.menuStringsNewEn = [];
            this.newFileRawLines = rawText.split(/\r?\n/);
            this.processJsonKeys(jsonObj, 'newEn');
          } else if (type === 'oldZh') {
            this.menuStringsOldZh = [];
            this.processJsonKeys(jsonObj, 'oldZh');
          } else {
            this.menuStringsOldEn = [];
            this.processJsonKeys(jsonObj, 'oldEN');
          }
        } catch (e) {
          this.errorMsg = '文件内容无效，无法解析为JSON';
        }
      };
      reader.readAsText(fileInput.files[0]);
    },

    /**
     * 将JSON里的 languageOption/menuStrings/strings 提取为数组
     * @param json
     * @param fileType
     */
    processJsonKeys(json, fileType) {
      ['languageOption', 'menuStrings', 'strings'].forEach(scope => {
        if (!json[scope]) return;
        Object.keys(json[scope]).forEach(key => {
          const item = {key, value: json[scope][key], scope};
          if (fileType === 'newEn') {
            this.menuStringsNewEn.push(item);
          } else if (fileType === 'oldZh') {
            this.menuStringsOldZh.push(item);
          } else {
            this.menuStringsOldEn.push(item);
          }
        });
      });
    },

    /**
     * 使用新英文对比旧英文
     * 检测新增、删减、改动（key 相同但值发生变化）
     * 旧版中文为可选项，但是不太希望用户知道，因为会错过一些差异情况
     * 单纯留着当兜底就挺好，所以没在页面标注出来
     */
    compare() {
      // 错误提示
      this.showNewEnError = false;
      this.showOldEnError = false;
      this.showOldZhError = false;


      if (!this.menuStringsNewEn.length) {
        this.showNewEnError = true;
        return;
      }

      if (!this.menuStringsOldEn.length) {
        this.showOldEnError = true;
        return;
      }

      this.diffItems = [];

      // 新增
      this.menuStringsNewEn.forEach(newItem => {
        const oldItem = this.menuStringsOldEn.find(o => o.key === newItem.key && o.scope === newItem.scope);
        if (!oldItem) {
          this.diffItems.push({
            key: newItem.key,
            scope: newItem.scope,
            color: 'green',
            type: 'added',
            newValue: newItem.value
          });
        }
      });

      // 删减
      this.menuStringsOldEn.forEach(oldItem => {
        const newItem = this.menuStringsNewEn.find(n => n.key === oldItem.key && n.scope === oldItem.scope);
        if (!newItem) {
          this.diffItems.push({
            key: oldItem.key,
            scope: oldItem.scope,
            color: 'red',
            type: 'removed',
            oldValue: oldItem.value
          });
        }
      });

      // 改动
      this.menuStringsNewEn.forEach(newItem => {
        const oldItem = this.menuStringsOldEn.find(o => o.key === newItem.key && o.scope === newItem.scope);
        if (oldItem) {
          if (!this.isSameString(oldItem.value, newItem.value)) {
            this.diffItems.push({
              key: newItem.key,
              scope: newItem.scope,
              color: 'blue',
              type: 'changed',
              oldValue: oldItem.value,
              newValue: newItem.value
            });
          }
        }
      });

      if (!this.diffItems.length) {
        this.errorMsg = '未发现差异。';
      }

      this.autoGen();
    },

    isSameString(a, b) {
      // 逻辑层面判断字符串是否相同
      return a === b;
    },

    /**
     * 转义 JSON 值
     * @param str JSON 值
     * @return {string} 转义后的值
     */
    escapeJsonValue(str) {
      if (typeof str !== 'string') {
        str = String(str);
      }
      return JSON.stringify(str).slice(1, -1);
    },

    /**
     * 自动生成JSON
     * 基于旧版中文文件做合并，但行顺序和空行以新版英文文件为模板重构
     * 差异项：
     *   -added：新增 => 输出中文翻译或保留新版英文字符（若未翻译）
     *   -removed：删减
     *   -changed： 替换为新版英文（深度对比时）
     *   -未出现在diffItems的=>保留旧版中文翻译
     */
    autoGen() {
      // 1. 把旧版中文转为字典
      const oldCnDict = {
        languageOption: {},
        menuStrings: {},
        strings: {}
      };
      this.menuStringsOldZh.forEach(item => {
        oldCnDict[item.scope][item.key] = item.value;
      });

      // 2. 把差异项变成 map
      const diffMap = {};
      this.diffItems.forEach(d => {
        diffMap[d.scope + '\u0000' + d.key] = d;
      });

      let currentScope = null;

      // 判断是不是在进入作用域
      const scopePattern = /^\s*"?(languageOption|menuStrings|strings)"?\s*:\s*\{\s*$/;

      // 判断是不是关闭了当前作用域
      const scopeClosePattern = /^\s*}\s*,?\s*$/;

      // 匹配键值行
      const keyValuePattern = /^(\s*)"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"\s*(,?)\s*$/;
      const resultLines = [];

      for (let i = 0; i < this.newFileRawLines.length; i++) {
        const line = this.newFileRawLines[i];

        // 判断有没有匹配到“进入作用域”
        const scopeOpenMatch = line.match(scopePattern);
        if (scopeOpenMatch) {
          currentScope = scopeOpenMatch[1];
          resultLines.push(line);
          continue;
        }

        // 判断有没有匹配到“退出作用域”
        const scopeCloseMatch = line.match(scopeClosePattern);
        if (scopeCloseMatch) {
          currentScope = null; // 退出当前作用域
          resultLines.push(line);
          continue;
        }

        const kvMatch = line.match(keyValuePattern);
        if (!kvMatch) {
          resultLines.push(line);
          continue;
        }

        const leadingSpaces = kvMatch[1];
        const rawKey = kvMatch[2];
        const rawVal = kvMatch[3];
        const trailingComma = kvMatch[4];

        let parsedKey, parsedVal;
        try {
          parsedKey = JSON.parse(`"${rawKey}"`);
          parsedVal = JSON.parse(`"${rawVal}"`);
        } catch (e) {
          resultLines.push(line);
          continue;
        }

        let scopeName = currentScope || 'strings';

        // 根据 diffMap 判断该 key 在当前作用域是否被增删改
        const diffKey = scopeName + '\u0000' + parsedKey;
        const diffInfo = diffMap[diffKey];

        if (diffInfo) {
          if (diffInfo.type === 'removed') {
            // 不输出此行
          } else if (diffInfo.type === 'added' || diffInfo.type === 'changed') {
            // 如果存在翻译结果，则使用翻译结果，否则使用原始 newValue
            const finalValue = diffInfo.translatedValue ? diffInfo.translatedValue : diffInfo.newValue;
            const escapedVal = this.escapeJsonValue(finalValue);
            const newLine = `${leadingSpaces}"${this.escapeJsonValue(parsedKey)}": "${escapedVal}"${trailingComma}`;
            resultLines.push(newLine);
          } else {
            // 大概应该可能差不多不会跳到这里吧ww
          }
        } else {
          // 无差异 => 优先保留旧版翻译，缺少旧版中文时回退到新版英文
          const oldVal = oldCnDict[scopeName][parsedKey];
          const finalVal = (typeof oldVal === 'string') ? oldVal : parsedVal;
          const escapedVal = this.escapeJsonValue(finalVal);
          const newLine = `${leadingSpaces}"${this.escapeJsonValue(parsedKey)}": "${escapedVal}"${trailingComma}`;
          resultLines.push(newLine);
        }
      }

      this.generatedContent = resultLines.join('\n');
    },

    /**
     * 自动翻译差异项，并在全部批次成功后重新生成 JSON。
     *
     * @return {Promise<void>}
     */
    async autoTranslate() {
      if (this.isTranslating) {
        return;
      }

      this.showNewEnError = false;
      this.showOldEnError = false;
      this.showOldZhError = false;
      this.errorMsg = null;
      this.translationMessage = '';

      // 验证API配置
      if (this.selectedApi === 'openai') {
        if (!this.openai.apiKey) {
          this.errorMsg = '请填写 OpenAI API 密钥。';
          return;
        }
      } else if (this.selectedApi === 'deepseek') {
        if (!this.deepseek.apiKey) {
          this.errorMsg = '请填写 DeepSeek API 密钥。';
          return;
        }
      } else if (this.selectedApi === 'youdao') {
        if (!this.youdao.appKey || !this.youdao.appSecret) {
          this.errorMsg = '请填写有道 AppKey 和 AppSecret。';
          return;
        }
      }

      if (!this.diffItems.length) {
        this.compare();
      }

      const toTranslate = this.diffItems.filter(d => (d.type === 'added' || d.type === 'changed'));
      if (!toTranslate.length) {
        this.errorMsg = '没有需要翻译的差异项。';
        return;
      }

      this.isTranslating = true;
      try {
        for (let i = 0; i < toTranslate.length; i += TRANSLATION_BATCH_SIZE) {
          const batch = toTranslate.slice(i, i + TRANSLATION_BATCH_SIZE);
          const translations = await this.requestTranslationsWithRetry(batch, this.selectedApi);

          if (!translations) {
            if (!this.errorMsg) {
              this.errorMsg = '翻译结果数量与待翻译条目不一致，已停止生成以避免输出不完整。';
            }
            return;
          }

          batch.forEach((item, index) => {
            item.translatedValue = translations[index];
          });

          if (i + TRANSLATION_BATCH_SIZE < toTranslate.length) {
            await this.sleep(1500);
          }
        }

        this.autoGen();
        this.translationMessage = '翻译并整理完成。';
        this.translationMessageType = 'success';
      } finally {
        this.isTranslating = false;
      }
    },

    /**
     * 分批请求翻译，并在结果不完整时自动重试。
     *
     * @param {Array<{newValue: string}>} batch 本批待翻译条目。
     * @param {'openai'|'deepseek'|'youdao'} provider 翻译服务提供方。
     * @return {Promise<string[]|null>} 完整翻译结果，重试后仍不完整时返回 null。
     */
    async requestTranslationsWithRetry(batch, provider) {
      const query = batch.map(item => item.newValue).join(TRANSLATION_SEPARATOR);

      for (let attempt = 1; attempt <= TRANSLATION_MAX_ATTEMPTS; attempt++) {
        try {
          let translations = [];
          if (provider === 'openai') {
            translations = await this.translateOpenAI(query);
          } else if (provider === 'deepseek') {
            translations = await this.translateDeepSeek(query);
          } else if (provider === 'youdao') {
            translations = await this.translateYoudao(query);
          }

          if (this.isValidTranslationBatch(translations, batch.length)) {
            this.errorMsg = null;
            return translations;
          }
        } catch (error) {
          this.handleTranslationError(error);
        }

        if (attempt < TRANSLATION_MAX_ATTEMPTS) {
          await this.sleep(TRANSLATION_RETRY_DELAY);
        }
      }

      return null;
    },

    /**
     * 判断翻译结果是否完整且有效。
     *
     * @param {Array} translations 翻译结果。
     * @param {number} expectedCount 预期条目数量。
     * @return {boolean} 结果数量一致且每项均为非空字符串时返回 true。
     */
    isValidTranslationBatch(translations, expectedCount) {
      return Array.isArray(translations) &&
          translations.length === expectedCount &&
          translations.every(item => typeof item === 'string' && item.trim());
    },

    /**
     * 将翻译异常转换为界面错误信息。
     *
     * @param {Error} error 翻译过程中产生的异常。
     */
    handleTranslationError(error) {
      if (error && error.response) {
        this.showErrorMsg(error);
        return;
      }

      const message = error && error.message ? error.message : '未知错误';
      this.errorMsg = `翻译失败：${message}`;
      console.error('[handleTranslationError]', error);
    },

    /**
     * 将固定翻译词汇数组格式化为字符串
     * @returns {string} 格式化后的字符串
     */
    formatFixedTranslations() {
      return this.fixedTranslations.map(item => `- ${item.term}: "${item.translation}"`).join('\n');
    },

    /**
     * 将需要保留的专有名词数组格式化为字符串
     * @returns {string} 格式化后的字符串
     */
    formatKeepTranslations() {
      return this.keepTranslations.map(term => `- ${term}`).join('\n');
    },

    /**
     * 调用 OpenAI 翻译。
     *
     * @param {string} query 使用约定分隔符连接的翻译内容。
     * @return {Promise<string[]>} 翻译结果数组。
     */
    async translateOpenAI(query) {
      this.errorMsg = null;

      if (!this.openai.apiKey) {
        throw new Error('OpenAI API 密钥未配置。');
      }

      const messages = [
        {
          role: 'system',
          content: `You are a translation expert specializing in Git operation terminology. Please translate the following Git-related content from English to Chinese.
            The following terms should preferably be translated using the following fixed translations, depending on the context:
            ${this.formatFixedTranslations()}

            The following terms should be kept in their original form without translation:
            ${this.formatKeepTranslations()}

            IMPORTANT: Each piece of text to translate is separated by the delimiter "${TRANSLATION_SEPARATOR}". You MUST use the exact same delimiter "${TRANSLATION_SEPARATOR}" to separate each translated result. Do NOT use newlines as separators between items. Preserve any newlines (\n) that exist within each individual text segment.
            Please note that you should only return the translated text, without engaging in conversation with the user or adding any additional content.`
        },
        {role: 'user', content: query}
      ];
      const isReasoningModel = this.isOpenAIReasoningModel(this.openai.model);
      const data = {
        model: this.openai.model,
        messages
      };
      if (isReasoningModel) {
        if (this.openai.reasoningEffort) {
          data.reasoning_effort = this.openai.reasoningEffort;
        }
      } else {
        data.temperature = this.openai.temperature;
      }
      const url = 'https://api.openai.com/v1/chat/completions';
      const resp = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const result = resp.data?.choices?.[0]?.message?.content;
      if (typeof result !== 'string' || !result.trim()) {
        throw new Error('OpenAI 返回了空内容。');
      }
      return result.split(TRANSLATION_SEPARATOR).map(line => line.trim());
    },

    /**
     * 调用 DeepSeek 翻译。
     *
     * @param {string} query 使用约定分隔符连接的翻译内容。
     * @return {Promise<string[]>} 翻译结果数组。
     */
    async translateDeepSeek(query) {
      this.errorMsg = null;

      if (!this.deepseek.apiKey) {
        throw new Error('DeepSeek API 密钥未配置。');
      }

      const messages = [
        {
          role: 'system',
          content: `您是一名 Git 操作术语的翻译专家。请将以下 Git 相关内容从英文翻译为中文。其中：
          以下术语应根据上下文优先选择如下翻译：
          ${this.formatFixedTranslations()}

          以下术语应保持原文，不要翻译：
          ${this.formatKeepTranslations()}

          重要：每段待翻译文本之间使用分隔符 "${TRANSLATION_SEPARATOR}" 分隔。你必须使用完全相同的分隔符 "${TRANSLATION_SEPARATOR}" 来分隔每段翻译结果。不要使用换行符作为不同条目之间的分隔。保留每段文本内部原有的换行符（\n）。
          请注意，您只需返回翻译后的文本，不要与用户进行对话，也不要添加任何其他内容。`
        },
        {role: 'user', content: query}
      ];
      const data = {
        model: this.deepseek.model,
        messages,
        temperature: this.deepseek.temperature
      };
      if (this.isDeepSeekReasoningModel(this.deepseek.model) && this.deepseek.reasoningEffort) {
        data.reasoning_effort = this.deepseek.reasoningEffort;
      }
      const url = 'https://api.deepseek.com/chat/completions';
      const resp = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.deepseek.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const result = resp.data?.choices?.[0]?.message?.content;
      if (typeof result !== 'string' || !result.trim()) {
        throw new Error('DeepSeek 返回了空内容。');
      }
      return result.split(TRANSLATION_SEPARATOR).map(line => line.trim());
    },

    /**
     * 调用有道翻译。
     *
     * @param {string} query 使用约定分隔符连接的翻译内容。
     * @return {Promise<string[]>} 翻译结果数组。
     */
    async translateYoudao(query) {
      if (!this.youdao.appKey || !this.youdao.appSecret) {
        throw new Error('有道 AppKey 或 AppSecret 未配置。');
      }

      // 有道 API 不支持自定义分隔符，逐条翻译以避免含 \n 的值导致错位
      const items = query.split(TRANSLATION_SEPARATOR);
      const results = [];
      for (const item of items) {
        const text = item.trim();
        if (!text) {
          results.push('');
          continue;
        }
        const salt = this.createSalt();
        const curtime = Math.round(Date.now() / 1000);
        const sign = this.buildSign(text, salt, curtime);
        const url = 'https://openapi.youdao.com/api';
        const data = {
          q: text,
          appKey: this.youdao.appKey,
          salt,
          from: this.youdao.from,
          to: this.youdao.to,
          sign,
          signType: 'v3',
          curtime,
        };
        const translated = await new Promise((resolve, reject) => {
          $.ajax({
            url,
            type: 'POST',
            dataType: 'jsonp',
            data,
            timeout: YOUDAO_REQUEST_TIMEOUT,
            success: function (data) {
              if (data.errorCode !== '0') {
                reject(new Error(`有道翻译失败，错误码：${data.errorCode}`));
                return;
              }
              const translation = data.translation && data.translation[0];
              if (typeof translation !== 'string' || !translation.trim()) {
                reject(new Error('有道翻译返回了空内容。'));
                return;
              }
              resolve(translation.trim());
            },
            error: function (xhr, status) {
              const message = status === 'timeout'
                  ? '有道翻译请求超时。'
                  : `有道翻译请求失败：${status || '网络错误'}`;
              reject(new Error(message));
            }
          });
        });
        results.push(translated);
      }
      return results;
    },

    /**
     * 生成有道请求使用的随机 salt。
     *
     * @return {string} 包含时间戳和随机值的 salt。
     */
    createSalt() {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    },

    /**
     * 构建有道翻译签名。
     *
     * @param {string} query 待翻译文本。
     * @param {string} salt 请求随机值。
     * @param {number} curtime 当前 Unix 时间戳（秒）。
     * @return {string} 有道 v3 签名。
     */
    buildSign(query, salt, curtime) {
      const str = this.youdao.appKey + this.truncate(query) + salt + curtime + this.youdao.appSecret;
      return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
    },

    truncate(q) {
      const len = q.length;
      if (len <= 20) return q;
      return q.substring(0, 10) + len + q.substring(len - 10, len);
    },

    sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },

    /**
     * 切换翻译 API 时按需获取对应的模型列表。
     */
    handleApiChange() {
      this.clearModelMessage();
      this.saveMessage = '';

      if ((this.selectedApi === 'openai' && this.openai.apiKey) ||
          (this.selectedApi === 'deepseek' && this.deepseek.apiKey)) {
        this.loadModelsImmediately(this.selectedApi);
      }
    },

    /**
     * 立即加载指定 API 的模型列表。
     *
     * @param {'openai'|'deepseek'} provider API 提供方。
     */
    loadModelsImmediately(provider) {
      void this.loadModels(provider);
    },

    /**
     * 清除模型列表状态提示。
     */
    clearModelMessage() {
      this.modelMessage = '';
    },

    /**
     * 判断指定 API 是否已填写密钥。
     *
     * @param {'openai'|'deepseek'} provider API 提供方。
     * @return {boolean} 是否已填写密钥。
     */
    hasProviderApiKey(provider) {
      const apiKey = provider === 'openai' ? this.openai.apiKey : this.deepseek.apiKey;
      return Boolean(apiKey && apiKey.trim());
    },

    /**
     * 判断是否具备执行对比所需的新旧英文文件。
     *
     * @return {boolean} 是否可以执行对比。
     */
    canCompare() {
      return Boolean(
          this.menuStringsNewEn.length &&
          this.menuStringsOldEn.length
      );
    },

    /**
     * 判断控制台是否已生成内容。
     *
     * @return {boolean} 控制台是否有内容。
     */
    hasGeneratedContent() {
      return Boolean(this.generatedContent && this.generatedContent.trim());
    },

    /**
     * 判断当前翻译 API 是否已完成必要配置。
     *
     * @return {boolean} 当前 API 是否已配置。
     */
    isApiConfigured() {
      if (this.selectedApi === 'openai' || this.selectedApi === 'deepseek') {
        return this.hasProviderApiKey(this.selectedApi);
      }
      if (this.selectedApi === 'youdao') {
        return Boolean(
            this.youdao.appKey &&
            this.youdao.appKey.trim() &&
            this.youdao.appSecret &&
            this.youdao.appSecret.trim()
        );
      }
      return false;
    },

    /**
     * 判断是否已到最后一步并显示保存按钮。
     *
     * @return {boolean} 是否显示保存按钮。
     */
    shouldShowSaveButton() {
      if (this.selectedApi === 'openai') {
        return this.hasProviderApiKey('openai') && this.modelsLoadCompleted.openai;
      }
      if (this.selectedApi === 'deepseek') {
        return this.hasProviderApiKey('deepseek') && this.modelsLoadCompleted.deepseek;
      }
      return Boolean(this.youdao.appKey && this.youdao.appSecret);
    },

    /**
     * 切换模型时同步模型状态与推理强度。
     *
     * @param {'openai'|'deepseek'} provider API 提供方。
     */
    handleModelChange(provider) {
      this.clearModelMessage();
      const modelId = provider === 'openai' ? this.openai.model : this.deepseek.model;
      if (!this.getReasoningEfforts(provider, modelId).length) {
        if (provider === 'openai') {
          this.openai.reasoningEffort = '';
        } else {
          this.deepseek.reasoningEffort = '';
        }
      }
    },

    /**
     * 在用户输入 API 密钥后延迟获取模型列表，避免每次按键都发起请求。
     *
     * @param {'openai'|'deepseek'} provider API 提供方。
     */
    scheduleModelLoad(provider) {
      clearTimeout(this.modelLoadTimers[provider]);
      this.modelsLoadCompleted[provider] = false;

      const apiKey = provider === 'openai' ? this.openai.apiKey : this.deepseek.apiKey;
      if (!apiKey || apiKey.trim().length < 20) {
        return;
      }

      this.modelLoadTimers[provider] = setTimeout(() => {
        if (this.selectedApi === provider) {
          this.loadModelsImmediately(provider);
        }
      }, 800);
    },

    /**
     * 从 OpenAI 公开价格页中解析标准价格。
     *
     * @param {string} markdown OpenAI 公开价格页的 Markdown 内容。
     * @return {Object<string, {input: number, output: number}>} 模型价格映射。
     */
    parseOpenAIPublicPrices(markdown) {
      if (typeof markdown !== 'string') {
        return {};
      }

      const standardSection = markdown.match(
          /### Standard pricing data[\s\S]*?(?=\n### |\n## |$)/
      );
      if (!standardSection) {
        return {};
      }

      const priceMap = {};
      standardSection[0].split('\n').forEach(line => {
        if (!line.startsWith('|') || line.includes('---') || line.includes('| Model |')) {
          return;
        }

        const cells = line.split('|').map(cell => cell.trim());
        const modelId = cells[1] && cells[1].split(/\s+/)[0];
        const input = this.parsePrice(cells[2]);
        const output = this.parsePrice(cells[5]);
        if (modelId && Number.isFinite(input) && Number.isFinite(output)) {
          priceMap[modelId] = {input, output};
        }
      });
      return priceMap;
    },

    /**
     * 从 DeepSeek 公开模型页面中解析当前模型。
     *
     * @param {string} markdown DeepSeek 公开模型页面的 Markdown 内容。
     * @return {string[]} 模型标识列表。
     */
    parseDeepSeekPublicModels(markdown) {
      if (typeof markdown !== 'string') {
        return [];
      }

      const modelRow = markdown.match(/\bMODEL\s+([^\n]+)/);
      if (!modelRow) {
        return [];
      }

      const modelIds = [];
      const modelPattern = /deepseek-[a-z0-9][a-z0-9.-]*/gi;
      let match;
      while ((match = modelPattern.exec(modelRow[1])) !== null) {
        const modelId = match[0];
        if (!modelIds.includes(modelId)) {
          modelIds.push(modelId);
        }
      }
      return modelIds;
    },

    /**
     * 从 DeepSeek 公开价格页中解析模型价格。
     *
     * @param {string} markdown DeepSeek 公开价格页的 Markdown 内容。
     * @return {Object<string, {input: number, output: number}>} 模型价格映射。
     */
    parseDeepSeekPublicPrices(markdown) {
      if (typeof markdown !== 'string') {
        return {};
      }

      const modelIds = this.parseDeepSeekPublicModels(markdown);
      const pricingStart = markdown.indexOf('PRICING');
      const pricingEnd = markdown.indexOf('Concurrency Limit', pricingStart);
      if (!modelIds.length || pricingStart < 0 || pricingEnd < 0) {
        return {};
      }

      const pricingSection = markdown.slice(pricingStart, pricingEnd);
      const prices = [...pricingSection.matchAll(/\$([\d.]+)/g)]
          .map(match => Number(match[1]));
      const rowSize = modelIds.length;
      if (prices.length < rowSize * 6) {
        return {};
      }

      return modelIds.reduce((priceMap, modelId, index) => {
        const inputOffPeak = prices[(rowSize * 2) + index];
        const inputPeak = prices[(rowSize * 3) + index];
        const outputOffPeak = prices[(rowSize * 4) + index];
        const outputPeak = prices[(rowSize * 5) + index];
        priceMap[modelId] = {
          // 使用峰谷平均缓存未命中输入价
          input: (inputOffPeak + inputPeak) / 2,
          // 使用峰谷平均输出价作为价格档位基准
          output: (outputOffPeak + outputPeak) / 2
        };
        return priceMap;
      }, {});
    },

    /**
     * 将价格字符串转换为数字。
     *
     * @param {string} value 价格字符串。
     * @return {number} 价格数值。
     */
    parsePrice(value) {
      if (typeof value !== 'string') {
        return NaN;
      }
      return Number.parseFloat(value.replace(/[^\d.]/g, ''));
    },

    /**
     * 根据模型输出价格返回价格档位。
     *
     * @param {{input: number, output: number}|undefined} price 模型价格。
     * @return {string} 价格档位标签。
     */
    getModelPriceTier(price) {
      if (!price) {
        return '';
      }

      const referencePrice = Number(price.output) || Number(price.input);
      if (!Number.isFinite(referencePrice)) {
        return '';
      }

      const tier = PRICE_TIER_LIMITS.find(item => referencePrice <= item.max);
      return tier ? tier.label : '';
    },

    /**
     * 获取指定 API 的可用模型列表。
     *
     * @param {'openai'|'deepseek'} provider API 提供方。
     * @param {boolean} showLoading 是否显示加载状态。
     * @return {Promise<boolean>} 是否成功获取模型列表。
     */
    async loadModels(provider, showLoading = true) {
      const apiKey = provider === 'openai' ? this.openai.apiKey : this.deepseek.apiKey;
      const url = provider === 'openai'
          ? 'https://api.openai.com/v1/models'
          : 'https://api.deepseek.com/models';
      const pricingUrl = provider === 'openai'
          ? OPENAI_PUBLIC_PRICING_URL
          : DEEPSEEK_PUBLIC_PRICING_URL;
      const requestId = ++this.modelRequestIds[provider];

      clearTimeout(this.modelLoadTimers[provider]);
      if (!apiKey) {
        this.modelsLoadCompleted[provider] = false;
        return false;
      }
      this.modelsLoadCompleted[provider] = false;

      if (showLoading) {
        this.modelMessage = '正在获取模型...';
        this.modelMessageType = 'success';
      }

      try {
        const [resp, pricingResp] = await Promise.all([
          axios.get(url, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }),
          axios.get(pricingUrl, {timeout: 15000}).catch(error => {
            console.error('[loadModels] pricing', error.response || error);
            return null;
          })
        ]);
        if (requestId !== this.modelRequestIds[provider]) {
          return false;
        }

        if (pricingResp) {
          if (provider === 'openai') {
            this.openaiPriceMap = this.parseOpenAIPublicPrices(pricingResp.data);
          } else {
            this.deepseekPriceMap = this.parseDeepSeekPublicPrices(pricingResp.data);
          }
        }

        const models = Array.isArray(resp.data.data) ? resp.data.data : [];
        const latestModels = models
            .filter(model => provider === 'openai'
                ? this.isOpenAIChatModel(model.id)
                : typeof model.id === 'string' && model.id.trim())
            .sort((a, b) => (Number(b.created) || 0) - (Number(a.created) || 0))
            .slice(0, 5);

        if (provider === 'openai') {
          this.openaiModels = this.buildModelOptions(
              DEFAULT_OPENAI_MODEL,
              latestModels,
              this.openaiPriceMap
          );
          if (!this.openaiModels.some(model => model.id === this.openai.model)) {
            this.openai.model = this.openaiModels[0].id;
            this.openai.reasoningEffort = '';
          }
        } else {
          this.deepseekModels = this.buildModelOptions(
              DEFAULT_DEEPSEEK_MODEL,
              latestModels,
              this.deepseekPriceMap
          );
          if (!this.deepseekModels.some(model => model.id === this.deepseek.model)) {
            this.deepseek.model = this.deepseekModels[0].id;
          }
        }

        if (provider === this.selectedApi) {
          this.modelMessage = '';
        }
        return true;
      } catch (error) {
        if (requestId !== this.modelRequestIds[provider]) {
          return false;
        }
        if (provider === this.selectedApi) {
          const status = error.response && error.response.status;
          const statusText = status ? `（HTTP ${status}）` : '（网络请求失败）';
          this.modelMessage = provider === 'openai'
              ? `获取 OpenAI 模型失败${statusText}，已保留推荐模型。`
              : `获取 DeepSeek 模型失败${statusText}，已保留推荐模型。`;
          this.modelMessageType = 'error';
        }
        console.error('[loadModels]', error.response || error);
        return false;
      } finally {
        if (requestId === this.modelRequestIds[provider]) {
          this.modelsLoadCompleted[provider] = true;
        }
      }
    },

    /**
     * 将默认模型与接口返回的模型合并为下拉选项。
     *
     * @param {string} defaultModelId 默认模型标识。
     * @param {Array<{id: string}>} models 接口返回的模型列表。
     * @param {Object<string, {input: number, output: number}>} priceMap 模型价格映射。
     * @return {Array<{id: string, label: string}>} 下拉选项。
     */
    buildModelOptions(defaultModelId, models, priceMap = {}) {
      const buildLabel = modelId => {
        const labels = [];
        if (modelId === defaultModelId) {
          labels.push('推荐');
        }

        const priceTier = this.getModelPriceTier(priceMap[modelId]);
        if (priceTier) {
          labels.push(priceTier);
        }

        return labels.length ? `${modelId}（${labels.join('，')}）` : modelId;
      };
      const availableModelIds = models
          .map(model => typeof model.id === 'string' ? model.id.trim() : '')
          .filter(Boolean);
      const options = [];
      const modelIds = new Set();

      if (!availableModelIds.length || availableModelIds.includes(defaultModelId)) {
        options.push({id: defaultModelId, label: buildLabel(defaultModelId)});
        modelIds.add(defaultModelId);
      }

      availableModelIds.forEach(modelId => {
        if (modelIds.has(modelId)) {
          return;
        }
        modelIds.add(modelId);
        options.push({id: modelId, label: buildLabel(modelId)});
      });

      return options;
    },

    /**
     * 判断 OpenAI 模型是否可用于对话。
     *
     * @param {string} modelId 模型标识。
     * @return {boolean} 是否可用于对话。
     */
    isOpenAIChatModel(modelId) {
      if (typeof modelId !== 'string') {
        return false;
      }

      const normalizedId = modelId.trim().toLowerCase();
      const excludedKeywords = [
        'audio', 'codex', 'computer-use', 'dall-e', 'deep-research',
        'embedding', 'image', 'live', 'moderation', 'realtime',
        'search', 'sora', 'transcribe', 'tts', 'voice', 'whisper'
      ];
      const isChatFamily = /^(gpt-|chatgpt-|o\d)/.test(normalizedId);
      return isChatFamily && !excludedKeywords.some(keyword => normalizedId.includes(keyword));
    },

    /**
     * 判断 OpenAI 模型是否支持推理强度设置。
     *
     * @param {string} modelId 模型标识。
     * @return {boolean} 是否支持推理强度设置。
     */
    isOpenAIReasoningModel(modelId) {
      if (typeof modelId !== 'string') {
        return false;
      }

      const normalizedId = modelId.trim().toLowerCase();
      if (normalizedId.includes('-chat')) {
        return false;
      }
      if (/^o\d/.test(normalizedId)) {
        return true;
      }

      const versionMatch = /^gpt-(\d+(?:\.\d+)?)/.exec(normalizedId);
      return Boolean(versionMatch) && Number(versionMatch[1]) >= 5;
    },

    /**
     * 判断 DeepSeek 模型是否支持推理强度设置。
     *
     * @param {string} modelId 模型标识。
     * @return {boolean} 是否支持推理强度设置。
     */
    isDeepSeekReasoningModel(modelId) {
      if (typeof modelId !== 'string') {
        return false;
      }

      const normalizedId = modelId.trim().toLowerCase();
      return normalizedId === 'deepseek-flash' ||
          normalizedId.includes('reasoner') ||
          normalizedId.includes('pro');
    },

    /**
     * 获取指定模型支持的推理强度选项。
     *
     * @param {'openai'|'deepseek'} provider API 提供方。
     * @param {string} modelId 模型标识。
     * @return {string[]} 推理强度选项。
     */
    getReasoningEfforts(provider, modelId) {
      if (provider === 'openai' && this.isOpenAIReasoningModel(modelId)) {
        return ['low', 'medium', 'high'];
      }
      if (provider === 'deepseek' && this.isDeepSeekReasoningModel(modelId)) {
        return ['low', 'high', 'max'];
      }
      return [];
    },

    /**
     * 将推理强度标识转换为界面文字。
     *
     * @param {string} effort 推理强度标识。
     * @return {string} 推理强度界面文字。
     */
    formatReasoningEffort(effort) {
      const labels = {
        minimal: '最小',
        low: '低',
        medium: '中',
        high: '高',
        xhigh: '极高',
        max: '最高'
      };
      return labels[effort] || effort;
    },

    /**
     * 保存 API 配置。
     */
    async saveKeys() {
      // 获取 AppKey和 AppSecret 或 OpenAI API 密钥的表单内容
      if (this.selectedApi === 'openai') {
        const apiKey = this.openai.apiKey.trim();

        if (!apiKey) {
          this.saveMessage = '请填写 OpenAI API 密钥。';
          this.saveMessageType = 'error';
          return;
        }

        const model = this.openai.model.trim();
        if (!model) {
          this.saveMessage = '请选择 OpenAI 模型。';
          this.saveMessageType = 'error';
          return;
        }

        this.openai.apiKey = apiKey;
        this.openai.model = model;
        this.saveMessage = 'OpenAI API 配置已保存。';
        this.saveMessageType = 'success';

      } else if (this.selectedApi === 'deepseek') {
        const apiKey = this.deepseek.apiKey.trim();

        if (!apiKey) {
          this.saveMessage = '请填写 DeepSeek API 密钥。';
          this.saveMessageType = 'error';
          return;
        }

        const model = this.deepseek.model.trim();
        this.deepseek.apiKey = apiKey;
        this.deepseek.model = model;
        this.saveMessage = 'DeepSeek API 配置已保存。';
        this.saveMessageType = 'success';

      } else if (this.selectedApi === 'youdao') {
        const appKey = this.youdao.appKey.trim();
        const appSecret = this.youdao.appSecret.trim();

        if (!appKey) {
          this.saveMessage = '请填写有道 AppKey。';
          this.saveMessageType = 'error';
          return;
        }
        if (!appSecret) {
          this.saveMessage = '请填写有道 AppSecret。';
          this.saveMessageType = 'error';
          return;
        }

        this.youdao.appKey = appKey;
        this.youdao.appSecret = appSecret;
        this.saveMessage = '有道 API 配置已保存。';
        this.saveMessageType = 'success';
      }
    },

    /**
     * 返回 API 错误信息
     */
    showErrorMsg(error) {
      let errorMessage = 'API 错误：';

      // 提取后端返回的具体错误信息（OpenAI / DeepSeek 等均遵循 { error: { message, code, type } } 结构）
      const apiErr = error.response && error.response.data && error.response.data.error;
      const apiCode = apiErr && (apiErr.code || apiErr.type);
      const apiMsg = apiErr && apiErr.message;

      if (error.response) {
        const status = error.response.status;
        switch (status) {
          case 400:
            errorMessage += '请求参数错误';
            break;
          case 401:
            errorMessage += 'API 密钥无效或未授权';
            break;
          case 402:
            errorMessage += '账户余额不足或需要付费';
            break;
          case 403:
            errorMessage += '访问被拒绝（地区/权限受限）';
            break;
          case 404:
            errorMessage += 'API 端点不存在';
            break;
          case 429:
            if (apiCode === 'insufficient_quota') {
              errorMessage += '账户额度不足（insufficient_quota），请检查计费与余额';
            } else if (apiCode === 'billing_hard_limit_reached') {
              errorMessage += '已达到账户消费硬性上限（billing_hard_limit_reached）';
            } else if (apiCode === 'rate_limit_exceeded') {
              errorMessage += '请求过于频繁（rate_limit_exceeded）';
            } else {
              errorMessage += '请求被限流或额度不足（429）';
            }
            break;
          case 500:
            errorMessage += '服务器内部错误';
            break;
          case 502:
            errorMessage += '网关错误';
            break;
          case 503:
            errorMessage += '服务暂时不可用';
            break;
          case 504:
            errorMessage += '网关超时';
            break;
          default:
            errorMessage += `未知错误 (HTTP ${status})`;
        }

        // 附带后端返回的具体 code 与 message，便于排查
        const detailParts = [];
        if (apiCode) detailParts.push(`code=${apiCode}`);
        if (apiMsg) detailParts.push(apiMsg);
        if (!detailParts.length && error.message) detailParts.push(error.message);
        if (detailParts.length) {
          errorMessage += `（${detailParts.join('；')}）`;
        }
      } else if (error.request) {
        errorMessage += '无法连接到服务器';
        if (error.message) errorMessage += `（${error.message}）`;
      } else {
        errorMessage += '请求配置错误';
        if (error.message) errorMessage += `（${error.message}）`;
      }

      this.errorMsg = errorMessage;
      console.error('[showErrorMsg]', error.response || error);
    }
  }
});

app.mount('#app');
