// 直接定义类型，避免ES模块导入问题
interface ClosedTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  closedAt: number;
  windowId: number;
  pinned?: boolean;
}

// 移除常量定义，直接使用字符串

/**
 * DOM元素引用
 */
const elements = {
  loading: document.getElementById('loading')!,
  emptyState: document.getElementById('empty-state')!,
  tabsList: document.getElementById('tabs-list')!,
  pinnedTabs: document.getElementById('pinned-tabs')!,
  pinnedList: document.getElementById('pinned-list')!,
  errorState: document.getElementById('error-state')!,
  retryBtn: document.getElementById('retry-btn')! as HTMLButtonElement,
  clearAllBtn: document.getElementById('clear-all-btn')! as HTMLButtonElement,
  tabsCount: document.getElementById('tabs-count')!,
  searchInput: document.getElementById('search-input')! as HTMLInputElement,
  clearSearchBtn: document.getElementById('clear-search-btn')! as HTMLButtonElement,
  contextMenu: document.getElementById('context-menu')!,
  pinTabBtn: document.getElementById('pin-tab')!,
  unpinTabBtn: document.getElementById('unpin-tab')!,
  deleteTabBtn: document.getElementById('delete-tab')!
};

/**
 * 应用状态
 */
let closedTabs: ClosedTab[] = [];
let filteredTabs: ClosedTab[] = [];
let pinnedTabs: ClosedTab[] = [];
let searchQuery: string = '';
let currentContextTab: ClosedTab | null = null;

/**
 * 显示指定状态，隐藏其他状态
 */
function showState(stateName: 'loading' | 'empty' | 'list' | 'error'): void {
  // 隐藏所有状态
  elements.loading.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.tabsList.classList.add('hidden');
  elements.errorState.classList.add('hidden');

  // 显示指定状态
  switch (stateName) {
    case 'loading':
      elements.loading.classList.remove('hidden');
      break;
    case 'empty':
      elements.emptyState.classList.remove('hidden');
      break;
    case 'list':
      elements.tabsList.classList.remove('hidden');
      break;
    case 'error':
      elements.errorState.classList.remove('hidden');
      break;
  }
}

/**
 * 格式化时间显示
 */
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}分钟前`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}小时前`;
  } else {
    const days = Math.floor(diff / day);
    return `${days}天前`;
  }
}

/**
 * 创建标签页项目元素
 */
function createTabItem(tab: ClosedTab): HTMLElement {
  const item = document.createElement('div');
  item.className = 'tab-item';
  item.dataset.tabId = tab.id;
  
  // 网站图标
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  if (tab.favicon) {
    favicon.src = tab.favicon;
    favicon.onerror = () => {
      favicon.style.display = 'none';
      const defaultIcon = document.createElement('div');
      defaultIcon.className = 'tab-favicon default';
      defaultIcon.textContent = '🌐';
      favicon.parentNode?.replaceChild(defaultIcon, favicon);
    };
  } else {
    favicon.style.display = 'none';
    const defaultIcon = document.createElement('div');
    defaultIcon.className = 'tab-favicon default';
    defaultIcon.textContent = '🌐';
    item.appendChild(defaultIcon);
  }
  
  if (favicon.style.display !== 'none') {
    item.appendChild(favicon);
  }
  
  // 标签页信息
  const info = document.createElement('div');
  info.className = 'tab-info';
  
  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title;
  title.title = tab.title;
  
  const url = document.createElement('div');
  url.className = 'tab-url';
  url.textContent = tab.url;
  url.title = tab.url;
  
  info.appendChild(title);
  info.appendChild(url);
  item.appendChild(info);
  
  // 时间
  const time = document.createElement('div');
  time.className = 'tab-time';
  time.textContent = formatTime(tab.closedAt);
  item.appendChild(time);
  
  // 点击事件
  item.addEventListener('click', () => restoreTab(tab));

  // 右键菜单事件
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, tab);
  });

  return item;
}

/**
 * 过滤和分离标签页
 */
function filterTabs(): void {
  let allTabs = [...closedTabs];

  // 应用搜索过滤
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    allTabs = allTabs.filter(tab =>
      tab.title.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query)
    );
  }

  // 分离置顶和普通标签页
  pinnedTabs = allTabs.filter(tab => tab.pinned).sort((a, b) => b.closedAt - a.closedAt);
  filteredTabs = allTabs.filter(tab => !tab.pinned).sort((a, b) => b.closedAt - a.closedAt);
}

/**
 * 渲染标签页列表
 */
function renderTabsList(): void {
  // 清空列表
  elements.pinnedList.innerHTML = '';
  elements.tabsList.innerHTML = '';

  // 应用搜索过滤和分离
  filterTabs();

  if (closedTabs.length === 0) {
    showState('empty');
    elements.clearAllBtn.disabled = true;
    elements.pinnedTabs.classList.add('hidden');
  } else if (pinnedTabs.length === 0 && filteredTabs.length === 0 && searchQuery.trim()) {
    // 有搜索但无结果
    showState('empty');
    elements.emptyState.innerHTML = `
      <div class="empty-icon">🔍</div>
      <p class="empty-text">未找到匹配的标签页</p>
      <p class="empty-hint">尝试使用不同的关键词搜索</p>
    `;
    elements.clearAllBtn.disabled = false;
    elements.pinnedTabs.classList.add('hidden');
  } else {
    showState('list');
    elements.clearAllBtn.disabled = false;

    // 渲染置顶标签页
    if (pinnedTabs.length > 0) {
      elements.pinnedTabs.classList.remove('hidden');
      pinnedTabs.forEach(tab => {
        const item = createTabItem(tab);
        elements.pinnedList.appendChild(item);
      });
    } else {
      elements.pinnedTabs.classList.add('hidden');
    }

    // 渲染普通标签页
    filteredTabs.forEach(tab => {
      const item = createTabItem(tab);
      elements.tabsList.appendChild(item);
    });
  }

  // 更新计数
  const totalDisplayed = pinnedTabs.length + filteredTabs.length;
  const countText = searchQuery.trim() ?
    `${totalDisplayed}/${closedTabs.length} 个标签页` :
    `${closedTabs.length} 个已关闭标签页`;
  elements.tabsCount.textContent = countText;
}

/**
 * 从存储加载已关闭的标签页
 */
async function loadClosedTabs(): Promise<void> {
  try {
    showState('loading');

    const result = await chrome.storage.local.get('closedTabs');
    closedTabs = result['closedTabs'] || [];

    renderTabsList();
  } catch (error) {
    console.error('加载已关闭标签页失败:', error);
    showState('error');
  }
}

/**
 * 恢复标签页
 */
async function restoreTab(tab: ClosedTab): Promise<void> {
  try {
    // 创建新标签页
    await chrome.tabs.create({ url: tab.url });
    
    // 从列表中移除
    closedTabs = closedTabs.filter(t => t.id !== tab.id);
    
    // 更新存储
    await chrome.storage.local.set({
      'closedTabs': closedTabs
    });
    
    // 重新渲染
    renderTabsList();
  } catch (error) {
    console.error('恢复标签页失败:', error);
    alert('恢复标签页失败，请重试');
  }
}

/**
 * 清空所有历史记录
 */
async function clearAllTabs(): Promise<void> {
  if (!confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
    return;
  }
  
  try {
    closedTabs = [];
    
    await chrome.storage.local.set({
      'closedTabs': closedTabs
    });
    
    renderTabsList();
  } catch (error) {
    console.error('清空历史记录失败:', error);
    alert('清空失败，请重试');
  }
}

/**
 * 处理搜索输入
 */
function handleSearchInput(): void {
  searchQuery = elements.searchInput.value;

  // 显示/隐藏清空搜索按钮
  if (searchQuery.trim()) {
    elements.clearSearchBtn.classList.remove('hidden');
  } else {
    elements.clearSearchBtn.classList.add('hidden');
  }

  // 重新渲染列表
  renderTabsList();
}

/**
 * 清空搜索
 */
function clearSearch(): void {
  elements.searchInput.value = '';
  searchQuery = '';
  elements.clearSearchBtn.classList.add('hidden');
  renderTabsList();
  elements.searchInput.focus();
}

/**
 * 显示右键菜单
 */
function showContextMenu(event: MouseEvent, tab: ClosedTab): void {
  currentContextTab = tab;

  // 显示/隐藏置顶/取消置顶按钮
  if (tab.pinned) {
    elements.pinTabBtn.classList.add('hidden');
    elements.unpinTabBtn.classList.remove('hidden');
  } else {
    elements.pinTabBtn.classList.remove('hidden');
    elements.unpinTabBtn.classList.add('hidden');
  }

  // 定位菜单
  elements.contextMenu.style.left = `${event.clientX}px`;
  elements.contextMenu.style.top = `${event.clientY}px`;
  elements.contextMenu.classList.remove('hidden');

  // 确保菜单不超出窗口边界
  const rect = elements.contextMenu.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  if (rect.right > windowWidth) {
    elements.contextMenu.style.left = `${windowWidth - rect.width - 5}px`;
  }
  if (rect.bottom > windowHeight) {
    elements.contextMenu.style.top = `${windowHeight - rect.height - 5}px`;
  }
}

/**
 * 隐藏右键菜单
 */
function hideContextMenu(): void {
  elements.contextMenu.classList.add('hidden');
  currentContextTab = null;
}

/**
 * 置顶标签页
 */
async function pinTab(): Promise<void> {
  if (!currentContextTab) return;

  const tabIndex = closedTabs.findIndex(tab => tab.id === currentContextTab!.id);
  if (tabIndex !== -1) {
    closedTabs[tabIndex].pinned = true;
    await saveTabsToStorage();
    renderTabsList();
  }
  hideContextMenu();
}

/**
 * 取消置顶标签页
 */
async function unpinTab(): Promise<void> {
  if (!currentContextTab) return;

  const tabIndex = closedTabs.findIndex(tab => tab.id === currentContextTab!.id);
  if (tabIndex !== -1) {
    closedTabs[tabIndex].pinned = false;
    await saveTabsToStorage();
    renderTabsList();
  }
  hideContextMenu();
}

/**
 * 删除标签页
 */
async function deleteTab(): Promise<void> {
  if (!currentContextTab) return;

  closedTabs = closedTabs.filter(tab => tab.id !== currentContextTab!.id);
  await saveTabsToStorage();
  renderTabsList();
  hideContextMenu();
}

/**
 * 保存标签页到存储
 */
async function saveTabsToStorage(): Promise<void> {
  try {
    await chrome.storage.local.set({
      'closedTabs': closedTabs
    });
  } catch (error) {
    console.error('保存标签页失败:', error);
  }
}

/**
 * 初始化事件监听器
 */
function initEventListeners(): void {
  // 重试按钮
  elements.retryBtn.addEventListener('click', loadClosedTabs);

  // 清空按钮
  elements.clearAllBtn.addEventListener('click', clearAllTabs);

  // 搜索输入
  elements.searchInput.addEventListener('input', handleSearchInput);
  elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  });

  // 清空搜索按钮
  elements.clearSearchBtn.addEventListener('click', clearSearch);

  // 右键菜单事件
  elements.pinTabBtn.addEventListener('click', pinTab);
  elements.unpinTabBtn.addEventListener('click', unpinTab);
  elements.deleteTabBtn.addEventListener('click', deleteTab);

  // 点击其他地方隐藏右键菜单
  document.addEventListener('click', (e) => {
    if (!elements.contextMenu.contains(e.target as Node)) {
      hideContextMenu();
    }
  });

  // 阻止右键菜单的默认行为
  elements.contextMenu.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

/**
 * 初始化应用
 */
async function init(): Promise<void> {
  initEventListeners();
  await loadClosedTabs();
}

// 当DOM加载完成时初始化应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
