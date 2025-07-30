// 直接定义类型，避免ES模块导入问题
interface ClosedTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  closedAt: number;
  windowId: number;
}

interface TabInfo {
  url: string;
  title: string;
  favicon?: string;
  windowId: number;
}

// 默认设置
const MAX_HISTORY = 50;

/**
 * 标签页信息缓存
 * 用于存储当前打开的标签页信息，以便在关闭时获取详细信息
 */
const tabsCache = new Map<number, TabInfo>();

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 检查URL是否应该被保存
 */
function shouldSaveTab(url: string): boolean {
  if (!url) return false;
  
  // 排除特殊页面
  const excludePatterns = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'moz-extension://',
    'data:',
    'javascript:'
  ];
  
  return !excludePatterns.some(pattern => url.startsWith(pattern));
}

/**
 * 从存储中获取已关闭的标签页
 */
async function getClosedTabs(): Promise<ClosedTab[]> {
  try {
    const result = await chrome.storage.local.get('closedTabs');
    return result['closedTabs'] || [];
  } catch (error) {
    console.error('获取已关闭标签页失败:', error);
    return [];
  }
}

/**
 * 保存已关闭的标签页到存储
 */
async function saveClosedTabs(closedTabs: ClosedTab[]): Promise<void> {
  try {
    await chrome.storage.local.set({
      'closedTabs': closedTabs
    });
  } catch (error) {
    console.error('保存已关闭标签页失败:', error);
  }
}

/**
 * 添加已关闭的标签页
 */
async function addClosedTab(tabInfo: TabInfo, removeInfo: chrome.tabs.TabRemoveInfo): Promise<void> {
  if (!shouldSaveTab(tabInfo.url)) {
    return;
  }

  const closedTab: ClosedTab = {
    id: generateId(),
    url: tabInfo.url,
    title: tabInfo.title || '无标题',
    favicon: tabInfo.favicon,
    closedAt: Date.now(),
    windowId: removeInfo.windowId
  };

  const closedTabs = await getClosedTabs();
  
  // 添加到列表开头
  closedTabs.unshift(closedTab);
  
  // 保持最大数量限制
  if (closedTabs.length > MAX_HISTORY) {
    closedTabs.splice(MAX_HISTORY);
  }
  
  await saveClosedTabs(closedTabs);
}

/**
 * 监听标签页更新事件，维护标签页信息缓存
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 更新缓存条件：有URL和标题
  if (tab.url && tab.title) {
    tabsCache.set(tabId, {
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl,
      windowId: tab.windowId
    });
  }
});

/**
 * 监听标签页创建事件，添加到缓存
 */
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && tab.url && tab.title) {
    tabsCache.set(tab.id, {
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl,
      windowId: tab.windowId
    });
  }
});

/**
 * 监听标签页关闭事件
 */
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const tabInfo = tabsCache.get(tabId);

  if (tabInfo) {
    await addClosedTab(tabInfo, removeInfo);
    tabsCache.delete(tabId);
  }
});

/**
 * 初始化当前所有标签页信息
 */
async function initCurrentTabs() {
  try {
    const tabs = await chrome.tabs.query({});

    tabs.forEach(tab => {
      if (tab.id && tab.url && tab.title) {
        tabsCache.set(tab.id, {
          url: tab.url,
          title: tab.title,
          favicon: tab.favIconUrl,
          windowId: tab.windowId
        });
      }
    });
  } catch (error) {
    console.error('初始化标签页失败:', error);
  }
}

/**
 * 扩展安装时的初始化
 */
chrome.runtime.onInstalled.addListener(async () => {
  // 初始化设置
  const result = await chrome.storage.local.get('settings');
  if (!result['settings']) {
    await chrome.storage.local.set({
      'settings': { maxHistory: MAX_HISTORY }
    });
  }

  // 初始化当前标签页
  await initCurrentTabs();
});

/**
 * 扩展启动时获取当前所有标签页信息
 */
chrome.runtime.onStartup.addListener(async () => {
  await initCurrentTabs();
});

// 立即执行初始化（用于开发时重新加载扩展）
initCurrentTabs();
